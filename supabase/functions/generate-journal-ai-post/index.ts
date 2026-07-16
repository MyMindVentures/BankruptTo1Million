import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const U = Deno.env.get("SUPABASE_URL")!;
const S = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const A = Deno.env.get("SUPABASE_ANON_KEY")!;
const K = Deno.env.get("OPENROUTER_API_KEY") ?? Deno.env.get("OPENAI_API_KEY");
const SLUG = "generate-journal-ai-post";
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

function chunkLanguages(languages: string[], batchSize: number) {
  const batches: string[][] = [];
  for (let index = 0; index < languages.length; index += batchSize) {
    batches.push(languages.slice(index, index + batchSize));
  }
  return batches;
}

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

function validateBatchTranslations(
  batchLangs: string[],
  translations: Record<string, { title?: string; body?: string }>,
  ranges: Record<string, { min: number; max: number }>,
  settings: Record<string, unknown>,
) {
  const minHeadings = Number((settings.markdown_headings as { min?: number } | undefined)?.min ?? 3);
  const maxHeadings = Number((settings.markdown_headings as { max?: number } | undefined)?.max ?? 5);

  for (const lang of batchLangs) {
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
    if (headingCount < minHeadings || headingCount > maxHeadings) {
      throw new Error(`Invalid ${lang} heading count: ${headingCount}; expected ${minHeadings}-${maxHeadings}`);
    }
    translations[lang].body = body;
  }
}

function buildBatchPrompt(
  batchLangs: string[],
  ranges: Record<string, { min: number; preferred_min: number; preferred_max: number; max: number }>,
  settings: Record<string, unknown>,
  userPromptTemplate: string,
  context: unknown,
) {
  const rangeInstructions = batchLangs.map((lang) => {
    const r = ranges[lang];
    return `${lang}: target ${r.preferred_min}-${r.preferred_max} characters; accepted ${r.min}-${r.max}`;
  }).join("\n");

  return `${userPromptTemplate}\n\nReturn exactly one valid JSON object with a translations object for ${batchLangs.join(", ")} only. Every language requires title, subtitle, excerpt, body, seo_title and seo_description. Preserve equivalent factual completeness in every language, but follow its own character range because languages have different character density.\n\nLanguage-specific body ranges:\n${rangeInstructions}\n\nExcerpt maximum ${settings.excerpt_max_characters ?? 220} characters. SEO title maximum ${settings.seo_title_max_characters ?? 60}. SEO description maximum ${settings.seo_description_max_characters ?? 155}.\n\nVerified context: ${JSON.stringify(context)}`;
}

async function generateBatchTranslations(
  batchLangs: string[],
  cfg: Record<string, unknown>,
  settings: Record<string, unknown>,
  ranges: Record<string, { min: number; preferred_min: number; preferred_max: number; max: number }>,
  context: unknown,
) {
  const prompt = buildBatchPrompt(
    batchLangs,
    ranges,
    settings,
    String(cfg.user_prompt_template ?? ""),
    context,
  );

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
      max_tokens: Number(cfg.max_output_tokens ?? 8192),
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
  if (finishReason && finishReason !== "stop") {
    throw new Error(`AI response incomplete for batch [${batchLangs.join(", ")}]: finish_reason=${finishReason}`);
  }

  const parsed = parse(payload?.choices?.[0]?.message?.content ?? "");
  const translations = parsed.translations as Record<string, { title?: string; body?: string }>;
  validateBatchTranslations(batchLangs, translations, ranges, settings);

  return {
    translations,
    usage: payload?.usage ?? {},
    finishReason: finishReason ?? null,
  };
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
      p_edge_function_slug: SLUG,
    });
    if (cfgResult.error) throw new Error(`AI runtime config unavailable: ${cfgResult.error.message}`);
    const cfg = cfgResult.data as Record<string, unknown>;
    if (!cfg) throw new Error("AI runtime config unavailable: empty response");

    if (cfg.enable_run_logging) {
      const r = await db.rpc("start_ai_edge_function_run", {
        p_edge_function_slug: SLUG,
        p_entity_type: "journal_post",
        p_entity_id: postId,
        p_metadata: {
          source: "edge_function",
          config_version: cfg.config_version,
          prompt_version: cfg.prompt_version,
        },
      });
      if (r.error) throw new Error(`Could not start AI run: ${r.error.message}`);
      runId = r.data;
    }

    const context = await loadContext(postId);
    const now = new Date().toISOString();
    await db.from("journal_posts").update({ ai_generation_status: "processing", updated_at: now }).eq("id", postId);
    await db.from("journal_ai_sources").update({ generation_status: "processing", last_error: null, updated_at: now }).eq("journal_post_id", postId);

    const settings = (cfg.generation_settings ?? {}) as Record<string, unknown>;
    const langs = await fetchActiveLanguages();
    const batchSize = Math.max(1, Number(settings.batch_size ?? 2));
    const batches = chunkLanguages(langs, batchSize);
    const defaults = (settings.default_body_characters ?? { min: 1800, preferred_min: 2400, preferred_max: 3400, max: 4500 }) as Record<string, number>;
    const byLanguage = (settings.body_characters_by_language ?? {}) as Record<string, Record<string, number>>;
    const ranges = Object.fromEntries(langs.map((lang) => [lang, { ...defaults, ...(byLanguage[lang] ?? {}) }]));

    const mergedTranslations: Record<string, unknown> = {};
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    const batchSummaries: Array<{ batch_index: number; languages: string[]; finish_reason: string | null }> = [];

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex += 1) {
      const batchLangs = batches[batchIndex];
      const { translations, usage, finishReason } = await generateBatchTranslations(
        batchLangs,
        cfg,
        settings,
        ranges,
        context,
      );

      Object.assign(mergedTranslations, translations);

      const batchSaved = await db.rpc("upsert_journal_ai_translation_batch", {
        p_post_id: postId,
        p_translations: translations,
        p_batch_index: batchIndex + 1,
        p_total_batches: batches.length,
      });
      if (batchSaved.error) {
        throw new Error(`Could not save batch ${batchIndex + 1}/${batches.length} [${batchLangs.join(", ")}]: ${batchSaved.error.message}`);
      }

      totalInputTokens += Number(usage.prompt_tokens ?? 0);
      totalOutputTokens += Number(usage.completion_tokens ?? 0);
      batchSummaries.push({
        batch_index: batchIndex + 1,
        languages: batchLangs,
        finish_reason: finishReason,
      });
    }

    const saved = await db.rpc("save_journal_ai_generation_result", {
      p_post_id: postId,
      p_translations: mergedTranslations,
      p_model: cfg.model,
      p_config_version: cfg.config_version,
      p_prompt_version: cfg.prompt_version,
    });
    if (saved.error) throw new Error(`Could not save AI result: ${saved.error.message}`);

    if (runId) {
      await db.rpc("finish_ai_edge_function_run", {
        p_run_id: runId,
        p_status: "completed",
        p_input_tokens: totalInputTokens || null,
        p_output_tokens: totalOutputTokens || null,
        p_response_status: 200,
        p_metadata: {
          translation_count: langs.length,
          batch_size: batchSize,
          batch_count: batches.length,
          batches: batchSummaries,
        },
      });
    }

    return out({
      ...(saved.data as Record<string, unknown>),
      languages: langs,
      model: cfg.model,
      config_version: cfg.config_version,
      prompt_version: cfg.prompt_version,
      batch_size: batchSize,
      batch_count: batches.length,
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
