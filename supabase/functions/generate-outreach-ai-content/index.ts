import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const U = Deno.env.get("SUPABASE_URL")!;
const S = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const A = Deno.env.get("SUPABASE_ANON_KEY")!;
const K = Deno.env.get("OPENROUTER_API_KEY") ?? Deno.env.get("OPENAI_API_KEY");
const SLUG = "generate-outreach-ai-content";

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

type PageCopy = {
  personal_intro?: string;
  why_them?: string;
  what_we_offer?: string;
  what_we_ask?: string;
  win_win?: string;
  personal_message?: string;
  mission_blurb?: string;
};

const COPY_FIELDS: Array<keyof PageCopy> = [
  "personal_intro",
  "why_them",
  "what_we_offer",
  "what_we_ask",
  "win_win",
  "personal_message",
  "mission_blurb",
];

async function authenticate(req: Request) {
  const auth = req.headers.get("Authorization");
  if (!auth) throw new Error("Unauthorized");
  const user = createClient(U, A, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false },
  });
  const access = await user.rpc("get_my_admin_access");
  if (access.error) throw new Error(`Admin verification failed: ${access.error.message}`);
  if (!access.data?.[0]?.is_active) throw new Error("Admin access required");
}

function validateCopy(copy: PageCopy, language: string, maxCharacters: number) {
  for (const field of COPY_FIELDS) {
    const value = String(copy[field] ?? "").trim();
    if (!value) throw new Error(`Missing ${field} in ${language} outreach copy`);
    if (value.length > maxCharacters) throw new Error(`${field} is too long`);
  }
}

function buildUserPrompt(
  userPromptTemplate: string,
  context: Record<string, unknown>,
  language: string,
) {
  return `${userPromptTemplate}

Write ALL copy in language code "${language}".

Verified context:
${JSON.stringify(context)}`;
}

async function loadContext(campaignId: string) {
  const result = await db.rpc("get_outreach_ai_generation_context", { p_campaign_id: campaignId });
  if (result.error || !result.data) {
    throw new Error(result.error?.message || "Outreach AI context unavailable");
  }
  return result.data as Record<string, unknown>;
}

async function generateCopy(
  context: Record<string, unknown>,
  language: string,
  cfg: Record<string, unknown>,
): Promise<{ copy: PageCopy; usage: Record<string, number>; finishReason: string | null }> {
  if (!K) throw new Error("Missing AI provider key");

  const settings = (cfg.generation_settings ?? {}) as Record<string, unknown>;
  const maxCharacters = Math.max(500, Number(settings.field_max_characters ?? 4000));
  const maxAttempts = Math.max(1, Number(settings.max_attempts ?? 3));
  let lastError: Error | null = null;
  let totalUsage: Record<string, number> = {};
  let finishReason: string | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const prompt = `${buildUserPrompt(String(cfg.user_prompt_template ?? ""), context, language)}${
      attempt > 1 ? `\n\nPrevious attempt failed validation (${lastError?.message}). Regenerate the full JSON response.` : ""
    }`;

    const ai = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${K}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://bankruptto1million.com",
        "X-Title": "Bankrupt to 1 Million Outreach AI",
      },
      body: JSON.stringify({
        model: cfg.model,
        temperature: Number(cfg.temperature),
        top_p: cfg.top_p == null ? undefined : Number(cfg.top_p),
        max_tokens: Number(cfg.max_output_tokens ?? 4096),
        response_format: cfg.response_format,
        messages: [
          { role: "system", content: String(cfg.system_prompt ?? "") },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!ai.ok) throw new Error(`AI provider ${ai.status}: ${(await ai.text()).slice(0, 900)}`);

    const payload = await ai.json();
    finishReason = payload?.choices?.[0]?.finish_reason ?? null;
    if (finishReason && finishReason !== "stop") {
      throw new Error(`AI response incomplete: finish_reason=${finishReason}`);
    }

    totalUsage = {
      prompt_tokens: Number(totalUsage.prompt_tokens ?? 0) + Number(payload?.usage?.prompt_tokens ?? 0),
      completion_tokens: Number(totalUsage.completion_tokens ?? 0) + Number(payload?.usage?.completion_tokens ?? 0),
    };

    try {
      const parsed = parse(payload?.choices?.[0]?.message?.content ?? "") as PageCopy;
      validateCopy(parsed, language, maxCharacters);
      return { copy: parsed, usage: totalUsage, finishReason };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt >= maxAttempts) throw lastError;
      await sleep(400 * attempt);
    }
  }

  throw lastError ?? new Error(`Could not generate outreach copy for ${language}`);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return out({ error: "Method not allowed" }, 405);

  let campaignId = "";
  let runId: string | null = null;

  try {
    if (!K) throw new Error("Missing AI provider key");
    await authenticate(req);

    campaignId = String((await req.json().catch(() => ({})))?.campaign_id ?? "");
    if (!campaignId) return out({ error: "campaign_id required" }, 400);

    const cfgResult = await db.rpc("get_ai_edge_function_runtime_config", {
      p_edge_function_slug: SLUG,
    });
    if (cfgResult.error) throw new Error(`AI runtime config unavailable: ${cfgResult.error.message}`);
    const cfg = cfgResult.data as Record<string, unknown>;
    if (!cfg) throw new Error("AI runtime config unavailable: empty response");

    if (cfg.enable_run_logging) {
      const run = await db.rpc("start_ai_edge_function_run", {
        p_edge_function_slug: SLUG,
        p_entity_type: "outreach_campaign",
        p_entity_id: campaignId,
        p_metadata: {
          config_version: cfg.config_version,
          prompt_version: cfg.prompt_version,
        },
      });
      if (run.error) throw new Error(`Could not start AI run: ${run.error.message}`);
      runId = run.data;
    }

    const context = await loadContext(campaignId);
    const language = String(context.language_code || "en");
    const brief = String(context.brief || "").trim();
    if (!brief) throw new Error("Private AI brief is required before generation");

    const now = new Date().toISOString();

    await db.from("outreach_campaigns").update({
      ai_generation_status: "generating",
      ai_generation_error: null,
      updated_at: now,
    }).eq("id", campaignId);

    await db.from("outreach_ai_sources").upsert({
      campaign_id: campaignId,
      brief,
      context_snapshot: context,
      generation_status: "generating",
      last_error: null,
      updated_at: now,
    }, { onConflict: "campaign_id" });

    const { copy, usage } = await generateCopy(context, language, cfg);

    const { data: pageRow } = await db
      .from("outreach_pages")
      .select("id")
      .eq("campaign_id", campaignId)
      .maybeSingle();

    if (!pageRow?.id) throw new Error("Outreach page not found for campaign");

    await db.from("outreach_pages").update({
      personal_intro: copy.personal_intro,
      why_them: copy.why_them,
      what_we_offer: copy.what_we_offer,
      what_we_ask: copy.what_we_ask,
      win_win: copy.win_win,
      personal_message: copy.personal_message,
      mission_blurb: copy.mission_blurb,
      original_language: language,
      updated_at: now,
    }).eq("id", pageRow.id);

    await db.from("outreach_campaigns").update({
      ai_generation_status: "completed",
      ai_generated_at: now,
      ai_generation_error: null,
      updated_at: now,
    }).eq("id", campaignId);

    await db.from("outreach_ai_sources").update({
      generated_payload: copy,
      generation_status: "completed",
      last_error: null,
      updated_at: now,
    }).eq("campaign_id", campaignId);

    if (runId) {
      await db.rpc("finish_ai_edge_function_run", {
        p_run_id: runId,
        p_status: "completed",
        p_input_tokens: Number(usage.prompt_tokens ?? 0) || null,
        p_output_tokens: Number(usage.completion_tokens ?? 0) || null,
        p_response_status: 200,
        p_metadata: {
          campaign_id: campaignId,
          language_code: language,
          model: cfg.model,
          config_version: cfg.config_version,
          prompt_version: cfg.prompt_version,
        },
      });
    }

    return out({
      ok: true,
      campaign_id: campaignId,
      language_code: language,
      page: copy,
      model: cfg.model,
      config_version: cfg.config_version,
      prompt_version: cfg.prompt_version,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === "Unauthorized" || message === "Admin access required") {
      return out({ error: message }, message === "Admin access required" ? 403 : 401);
    }

    if (campaignId) {
      const now = new Date().toISOString();
      await db.from("outreach_campaigns").update({
        ai_generation_status: "failed",
        ai_generation_error: message.slice(0, 4000),
        updated_at: now,
      }).eq("id", campaignId);
      await db.from("outreach_ai_sources").update({
        generation_status: "failed",
        last_error: message.slice(0, 4000),
        updated_at: now,
      }).eq("campaign_id", campaignId);
    }

    if (runId) {
      await db.rpc("finish_ai_edge_function_run", {
        p_run_id: runId,
        p_status: "failed",
        p_response_status: 500,
        p_error_message: message.slice(0, 4000),
        p_metadata: { campaign_id: campaignId || null },
      });
    }

    console.error(`${SLUG} failed`, { campaignId, message });
    return out({ ok: false, error: message }, 500);
  }
});
