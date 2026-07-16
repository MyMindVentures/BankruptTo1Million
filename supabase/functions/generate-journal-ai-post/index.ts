import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const U = Deno.env.get("SUPABASE_URL")!;
const S = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const A = Deno.env.get("SUPABASE_ANON_KEY")!;
const K = Deno.env.get("OPENROUTER_API_KEY") ?? Deno.env.get("OPENAI_API_KEY");
const db = createClient(U, S, { auth: { persistSession: false } });
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const out = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...cors, "Content-Type": "application/json" },
});
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const parse = (text: string) => {
  const t = text.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
  const a = t.indexOf("{");
  const b = t.lastIndexOf("}");
  if (a < 0 || b < a) throw new Error("Invalid AI JSON");
  return JSON.parse(t.slice(a, b + 1));
};

async function fetchActiveLanguages() {
  const { data, error } = await db
    .from("site_languages")
    .select("code")
    .eq("is_active", true)
    .order("display_order", { ascending: true })
    .order("code", { ascending: true });

  if (error) {
    throw new Error(`Active languages could not be loaded: ${error.message}`);
  }

  const languages = (data ?? [])
    .map((row) => String(row.code || "").trim())
    .filter(Boolean);

  if (languages.length === 0) {
    throw new Error("No active languages are configured.");
  }

  return languages;
}

async function loadContext(postId: string) {
  let lastError = "unknown error";
  for (let attempt = 1; attempt <= 3; attempt++) {
    const result = await db.rpc("get_journal_ai_generation_context", { p_post_id: postId });
    if (!result.error && result.data) return result.data;
    lastError = result.error?.message || `empty response on attempt ${attempt}`;
    if (attempt < 3) await sleep(350 * attempt);
  }
  throw new Error(`Journal AI context unavailable: ${lastError}`);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return out({ error: "Method not allowed" }, 405);

  let postId = "";
  let runId: string | null = null;
  try {
    if (!K) throw new Error("Missing AI provider key");
    const auth = req.headers.get("Authorization");
    if (!auth) return out({ error: "Unauthorized" }, 401);

    const user = createClient(U, A, {
      global: { headers: { Authorization: auth } },
      auth: { persistSession: false },
    });
    const access = await user.rpc("get_my_admin_access");
    if (access.error) throw new Error(`Admin verification failed: ${access.error.message}`);
    if (!access.data?.[0]?.is_active) return out({ error: "Admin access required" }, 403);

    postId = String((await req.json().catch(() => ({})))?.post_id ?? "");
    if (!postId) return out({ error: "post_id required" }, 400);

    const cfgResult = await db.rpc("get_ai_edge_function_runtime_config", {
      p_edge_function_slug: "generate-journal-ai-post",
    });
    if (cfgResult.error) throw new Error(`AI runtime config unavailable: ${cfgResult.error.message}`);
    const cfg = cfgResult.data;
    if (!cfg) throw new Error("AI runtime config unavailable: empty response");

    if (cfg.enable_run_logging) {
      const r = await db.rpc("start_ai_edge_function_run", {
        p_edge_function_slug: "generate-journal-ai-post",
        p_entity_type: "journal_post",
        p_entity_id: postId,
        p_metadata: { source: "edge_function", config_version: cfg.config_version, prompt_version: cfg.prompt_version },
      });
      if (r.error) throw new Error(`Could not start AI run: ${r.error.message}`);
      runId = r.data;
    }

    const context = await loadContext(postId);
    const now = new Date().toISOString();
    await db.from("journal_posts").update({ ai_generation_status: "processing", updated_at: now }).eq("id", postId);
    await db.from("journal_ai_sources").update({ generation_status: "processing", last_error: null, updated_at: now }).eq("journal_post_id", postId);

    const settings = cfg.generation_settings ?? {};
    const langs = await fetchActiveLanguages();
    const defaults = settings.default_body_characters ?? { min: 1800, preferred_min: 2400, preferred_max: 3400, max: 4500 };
    const byLanguage = settings.body_characters_by_language ?? {};
    const ranges = Object.fromEntries(langs.map((lang) => [lang, { ...defaults, ...(byLanguage[lang] ?? {}) }]));
    const rangeInstructions = langs.map((lang) => {
      const r = ranges[lang];
      return `${lang}: target ${r.preferred_min}-${r.preferred_max} characters; accepted ${r.min}-${r.max}`;
    }).join("\n");

    const prompt = `${cfg.user_prompt_template}\n\nReturn exactly one valid JSON object with a translations object for ${langs.join(", ")}. Every language requires title, subtitle, excerpt, body, seo_title and seo_description. Preserve equivalent factual completeness in every language, but follow its own character range because languages have different character density.\n\nLanguage-specific body ranges:\n${rangeInstructions}\n\nExcerpt maximum ${settings.excerpt_max_characters ?? 220} characters. SEO title maximum ${settings.seo_title_max_characters ?? 60}. SEO description maximum ${settings.seo_description_max_characters ?? 155}.\n\nVerified context: ${JSON.stringify(context)}`;

    const ai = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${K}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://bankruptto1million.com",
        "X-Title": "Bankrupt to 1 Million Journal AI",
      },
      body: JSON.stringify({
        model: cfg.model,
        temperature: Number(cfg.temperature),
        top_p: cfg.top_p == null ? undefined : Number(cfg.top_p),
        max_tokens: Number(cfg.max_output_tokens ?? 30000),
        response_format: cfg.response_format,
        messages: [
          { role: "system", content: cfg.system_prompt },
          { role: "user", content: prompt },
        ],
      }),
    });
    if (!ai.ok) throw new Error(`AI provider ${ai.status}: ${(await ai.text()).slice(0, 900)}`);

    const payload = await ai.json();
    const finishReason = payload?.choices?.[0]?.finish_reason;
    if (finishReason && finishReason !== "stop") throw new Error(`AI response incomplete: finish_reason=${finishReason}`);
    const translations = parse(payload?.choices?.[0]?.message?.content ?? "").translations;

    for (const lang of langs) {
      const item = translations?.[lang];
      const body = String(item?.body ?? "")
        .replace(/\r\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
      const range = ranges[lang];
      if (!item?.title) throw new Error(`Missing title for ${lang}`);
      if (body.length < Number(range.min) || body.length > Number(range.max)) {
        throw new Error(`Invalid ${lang} body length: ${body.length}; expected ${range.min}-${range.max}`);
      }
      const headingCount = (body.match(/^### /gm) ?? []).length;
      const minHeadings = Number(settings.markdown_headings?.min ?? 3);
      const maxHeadings = Number(settings.markdown_headings?.max ?? 5);
      if (headingCount < minHeadings || headingCount > maxHeadings) {
        throw new Error(`Invalid ${lang} heading count: ${headingCount}; expected ${minHeadings}-${maxHeadings}`);
      }
      translations[lang].body = body;
    }

    const saved = await db.rpc("save_journal_ai_generation_result", {
      p_post_id: postId,
      p_translations: translations,
      p_model: cfg.model,
      p_config_version: cfg.config_version,
      p_prompt_version: cfg.prompt_version,
    });
    if (saved.error) throw new Error(`Could not save AI result: ${saved.error.message}`);

    if (runId) {
      await db.rpc("finish_ai_edge_function_run", {
        p_run_id: runId,
        p_status: "completed",
        p_input_tokens: payload?.usage?.prompt_tokens ?? null,
        p_output_tokens: payload?.usage?.completion_tokens ?? null,
        p_response_status: 200,
        p_metadata: { translation_count: langs.length, finish_reason: finishReason ?? null },
      });
    }
    return out({
      ...saved.data,
      languages: langs,
      model: cfg.model,
      config_version: cfg.config_version,
      prompt_version: cfg.prompt_version,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (postId) {
      const now = new Date().toISOString();
      await db.from("journal_posts").update({ ai_generation_status: "failed", updated_at: now }).eq("id", postId);
      await db.from("journal_ai_sources").update({ generation_status: "failed", last_error: message.slice(0, 4000), updated_at: now }).eq("journal_post_id", postId);
    }
    if (runId) {
      await db.rpc("finish_ai_edge_function_run", {
        p_run_id: runId,
        p_status: "failed",
        p_response_status: 500,
        p_error_message: message,
      });
    }
    console.error("generate-journal-ai-post failed", { postId, message });
    return out({ error: message }, 500);
  }
});
