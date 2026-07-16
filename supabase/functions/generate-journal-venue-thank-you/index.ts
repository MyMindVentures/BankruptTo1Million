import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const U = Deno.env.get("SUPABASE_URL")!;
const S = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const A = Deno.env.get("SUPABASE_ANON_KEY")!;
const K = Deno.env.get("OPENROUTER_API_KEY") ?? Deno.env.get("OPENAI_API_KEY");
const SLUG = "generate-journal-venue-thank-you";

const db = createClient(U, S, { auth: { persistSession: false } });
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-journal-ai-worker-secret",
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

async function authenticate(req: Request) {
  const workerSecret = req.headers.get("x-journal-ai-worker-secret");
  if (workerSecret) {
    const { data, error } = await db.rpc("get_journal_ai_worker_secret");
    if (error || workerSecret !== data) throw new Error("Unauthorized worker");
    return { source: "worker" as const };
  }

  const auth = req.headers.get("Authorization");
  if (!auth) throw new Error("Unauthorized");

  const user = createClient(U, A, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false },
  });
  const access = await user.rpc("get_my_admin_access");
  if (access.error) throw new Error(`Admin verification failed: ${access.error.message}`);
  if (!access.data?.[0]?.is_active) throw new Error("Admin access required");
  return { source: "admin" as const };
}

async function fetchActiveLanguages() {
  const { data, error } = await db
    .from("site_languages")
    .select("code")
    .eq("is_active", true)
    .order("display_order", { ascending: true })
    .order("code", { ascending: true });

  if (error) throw new Error(`Active languages could not be loaded: ${error.message}`);
  const languages = (data ?? []).map((row) => String(row.code || "").trim()).filter(Boolean);
  if (languages.length === 0) throw new Error("No active languages are configured.");
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

function journeyHasPlaceContext(context: Record<string, unknown>) {
  const event = (context.event ?? {}) as Record<string, unknown>;
  const hasBusiness = Boolean(String(event.featured_business_name ?? "").trim());
  const hasCoords = event.latitude != null && event.longitude != null;
  return hasBusiness || hasCoords;
}

async function loadVenueThankYouRow(postId: string) {
  const { data, error } = await db
    .from("journal_post_venue_thank_you")
    .select("id, generation_status, draft_payload")
    .eq("journal_post_id", postId)
    .maybeSingle();

  if (error) throw new Error(`Venue thank-you row could not be loaded: ${error.message}`);
  return data;
}

async function loadDraftPayload(postId: string) {
  const row = await loadVenueThankYouRow(postId);
  return (row?.draft_payload as Record<string, unknown> | null) ?? null;
}

async function finalizeIfPublishedTranslationsComplete(postId: string, expectedCount: number) {
  const row = await loadVenueThankYouRow(postId);
  if (!row?.id) return false;

  const { count, error: countError } = await db
    .from("journal_post_venue_thank_you_translations")
    .select("id", { count: "exact", head: true })
    .eq("venue_thank_you_id", row.id)
    .eq("translation_status", "published");
  if (countError) {
    throw new Error(`Published thank-you count unavailable: ${countError.message}`);
  }
  if ((count ?? 0) < expectedCount) return false;

  const { data: englishRow, error: englishError } = await db
    .from("journal_post_venue_thank_you_translations")
    .select("message")
    .eq("venue_thank_you_id", row.id)
    .eq("language_code", "en")
    .eq("translation_status", "published")
    .maybeSingle();
  if (englishError) {
    throw new Error(`English thank-you message unavailable: ${englishError.message}`);
  }
  if (!englishRow?.message?.trim()) return false;

  const finalized = await db.rpc("finalize_journal_venue_thank_you_if_complete", { p_post_id: postId });
  if (finalized.error) {
    throw new Error(`Could not finalize venue thank-you: ${finalized.error.message}`);
  }
  return (finalized.data ?? 0) > 0 || row.generation_status === "completed";
}

function batchLangsComplete(batchLangs: string[], draft: Record<string, unknown> | null) {
  if (!draft) return false;
  const translations = draft.translations as Record<string, Record<string, string>> | undefined;
  if (!translations) return false;
  return batchLangs.every((lang) => Boolean(translations[lang]?.message?.trim()));
}

function extractMessage(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (!value || typeof value !== "object") return "";
  const item = value as Record<string, unknown>;
  return String(item.message ?? item.venue_thank_you_message ?? item.text ?? "").trim();
}

function normalizeThankYouPayload(raw: Record<string, unknown>, batchLangs: string[]): Record<string, unknown> {
  const nested = raw.translations ?? raw.messages ?? raw.languages;
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    const translations: Record<string, Record<string, string>> = {};
    for (const [lang, value] of Object.entries(nested as Record<string, unknown>)) {
      const message = extractMessage(value);
      if (message) translations[lang] = { message };
    }
    if (Object.keys(translations).length > 0) return { translations };
  }

  const translations: Record<string, Record<string, string>> = {};
  for (const lang of batchLangs) {
    const message = extractMessage(raw[lang]);
    if (message) translations[lang] = { message };
  }
  if (Object.keys(translations).length > 0) return { translations };

  for (const [key, value] of Object.entries(raw)) {
    if (["translations", "messages", "languages"].includes(key)) continue;
    const message = extractMessage(value);
    if (message && /^[a-z]{2}(?:-[a-z]{2})?$/i.test(key)) {
      translations[key] = { message };
    }
  }
  if (Object.keys(translations).length > 0) return { translations };

  throw new Error("Missing venue_thank_you.translations");
}

function validateBatch(payload: Record<string, unknown>, batchLangs: string[], settings: Record<string, unknown>) {
  const thankYou = settings.thank_you_characters ?? { min: 180, max: 700 };
  const min = Number(thankYou.min ?? 180);
  const max = Number(thankYou.max ?? 700);
  const translations = payload.translations as Record<string, Record<string, string>> | undefined;
  if (!translations) throw new Error("Missing venue_thank_you.translations");

  for (const lang of batchLangs) {
    const message = translations[lang]?.message?.trim();
    if (!message) throw new Error(`Missing thank-you message for ${lang}`);
    if (message.length > 1200) throw new Error(`Thank-you message too long for ${lang}`);
    if (message.length < min || message.length > max) {
      throw new Error(`Invalid thank-you length for ${lang}: ${message.length}; expected ${min}-${max}`);
    }
  }
}

function mergeBatch(existing: Record<string, unknown> | null, batch: Record<string, unknown>) {
  const merged = existing ? structuredClone(existing) : {} as Record<string, unknown>;
  const batchTranslations = (batch.translations ?? {}) as Record<string, Record<string, string>>;
  merged.translations = {
    ...((merged.translations as Record<string, Record<string, string>> | undefined) ?? {}),
    ...batchTranslations,
  };
  return merged;
}

function buildPrompt(batchLangs: string[], settings: Record<string, unknown>, template: string, context: unknown) {
  const thankYou = settings.thank_you_characters ?? { min: 180, max: 700 };
  const exampleEntries = batchLangs.map((lang) => `      "${lang}": { "message": "..." }`).join(",\n");
  return `${template}

Return exactly one valid JSON object with a top-level venue_thank_you object containing translations for ${batchLangs.join(", ")} only.

Required JSON shape (use this structure exactly):
{
  "venue_thank_you": {
    "translations": {
${exampleEntries}
    }
  }
}

Each language needs message (${thankYou.min}-${thankYou.max} chars): a warm thank-you to the venue team, staff, and owner for hosting workspace for the website, mission, and projects, and for the happiness of featuring their place in the journal post and on the website. Never invent personal names.

Verified context: ${JSON.stringify(context)}`;
}

async function generateBatch(
  batchLangs: string[],
  cfg: Record<string, unknown>,
  settings: Record<string, unknown>,
  context: unknown,
) {
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const prompt = `${buildPrompt(batchLangs, settings, String(cfg.user_prompt_template ?? ""), context)}${
      attempt > 1 ? `\n\nPrevious attempt failed (${lastError?.message}). Regenerate.` : ""
    }`;

    const ai = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${K}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://bankruptto1million.com",
        "X-Title": "Bankrupt to 1 Million Journal Venue Thank-You AI",
      },
      body: JSON.stringify({
        model: cfg.model,
        temperature: Number(cfg.temperature),
        max_tokens: Number(cfg.max_output_tokens ?? 8000),
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

    try {
      const parsed = parse(payload?.choices?.[0]?.message?.content ?? "");
      const rawThankYou = (parsed.venue_thank_you ?? parsed) as Record<string, unknown>;
      const thankYou = normalizeThankYouPayload(rawThankYou, batchLangs);
      validateBatch(thankYou, batchLangs, settings);
      return {
        thankYou,
        usage: {
          prompt_tokens: Number(payload?.usage?.prompt_tokens ?? 0),
          completion_tokens: Number(payload?.usage?.completion_tokens ?? 0),
        },
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt >= 3) throw lastError;
      await sleep(400 * attempt);
    }
  }

  throw lastError ?? new Error(`Could not generate thank-you batch [${batchLangs.join(", ")}]`);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return out({ error: "Method not allowed" }, 405);

  let postId = "";
  let runId: string | null = null;

  try {
    if (!K) throw new Error("Missing AI provider key");
    const auth = await authenticate(req);

    postId = String((await req.json().catch(() => ({})))?.post_id ?? "");
    if (!postId) return out({ error: "post_id required" }, 400);

    const cfgResult = await db.rpc("get_ai_edge_function_runtime_config", { p_edge_function_slug: SLUG });
    if (cfgResult.error) throw new Error(`AI runtime config unavailable: ${cfgResult.error.message}`);
    const cfg = cfgResult.data as Record<string, unknown>;
    if (!cfg) throw new Error("AI runtime config unavailable: empty response");

    const context = await loadContext(postId);
    if (!journeyHasPlaceContext(context as Record<string, unknown>)) {
      return out({ ok: true, skipped: true, post_id: postId, reason: "no_location_context" });
    }

    const { data: placeContext, error: placeError } = await db
      .from("journal_post_place_context")
      .select("id, generation_status")
      .eq("journal_post_id", postId)
      .maybeSingle();
    if (placeError) throw new Error(`Place context status unavailable: ${placeError.message}`);

    const langs = await fetchActiveLanguages();
    let placeContextReady = placeContext?.generation_status === "completed";

    if (!placeContextReady && placeContext?.id) {
      const { count: publishedCount, error: publishedCountError } = await db
        .from("journal_post_place_context_translations")
        .select("id", { count: "exact", head: true })
        .eq("place_context_id", placeContext.id)
        .eq("translation_status", "published");
      if (publishedCountError) {
        throw new Error(`Published place context count unavailable: ${publishedCountError.message}`);
      }
      if ((publishedCount ?? 0) >= langs.length) {
        placeContextReady = true;
        await db.from("journal_post_place_context").upsert({
          journal_post_id: postId,
          generation_status: "completed",
          draft_payload: null,
          last_error: null,
          updated_at: new Date().toISOString(),
        }, { onConflict: "journal_post_id" });
      }
    }

    if (!placeContextReady) {
      return out({ ok: true, skipped: true, post_id: postId, reason: "place_context_not_completed" });
    }

    const existingThankYou = await loadVenueThankYouRow(postId);
    if (existingThankYou?.generation_status === "completed") {
      return out({
        ok: true,
        complete: true,
        has_more: false,
        post_id: postId,
        reason: "already_completed",
      });
    }

    if (await finalizeIfPublishedTranslationsComplete(postId, langs.length)) {
      return out({
        ok: true,
        complete: true,
        has_more: false,
        post_id: postId,
        reason: "finalized_existing_translations",
      });
    }

    if (cfg.enable_run_logging) {
      const r = await db.rpc("start_ai_edge_function_run", {
        p_edge_function_slug: SLUG,
        p_entity_type: "journal_post",
        p_entity_id: postId,
        p_metadata: { source: auth.source, config_version: cfg.config_version, prompt_version: cfg.prompt_version },
      });
      if (r.error) throw new Error(`Could not start AI run: ${r.error.message}`);
      runId = r.data;
    }

    const now = new Date().toISOString();
    await db.from("journal_post_venue_thank_you").upsert(
      { journal_post_id: postId, generation_status: "processing", last_error: null, updated_at: now },
      { onConflict: "journal_post_id" },
    );

    const settings = (cfg.generation_settings ?? {}) as Record<string, unknown>;
    const batchSize = Math.max(1, Number(settings.batch_size ?? 3));
    const batchesPerInvocation = Math.max(1, Number(settings.batches_per_invocation ?? 1));
    const batches = chunkLanguages(langs, batchSize);

    let draftPayload = await loadDraftPayload(postId);
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let processedThisInvocation = 0;
    let lastBatchIndex: number | null = null;

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex += 1) {
      const batchLangs = batches[batchIndex];
      lastBatchIndex = batchIndex + 1;
      if (batchLangsComplete(batchLangs, draftPayload)) continue;
      if (processedThisInvocation >= batchesPerInvocation) break;

      const enrichedContext = draftPayload
        ? { ...(context as Record<string, unknown>), existing_thank_you: draftPayload }
        : context;

      const { thankYou, usage } = await generateBatch(batchLangs, cfg, settings, enrichedContext);
      draftPayload = mergeBatch(draftPayload, thankYou);
      totalInputTokens += Number(usage.prompt_tokens ?? 0);
      totalOutputTokens += Number(usage.completion_tokens ?? 0);
      processedThisInvocation += 1;

      await db.from("journal_post_venue_thank_you").upsert({
        journal_post_id: postId,
        generation_status: "processing",
        draft_payload: draftPayload,
        last_error: null,
        updated_at: new Date().toISOString(),
      }, { onConflict: "journal_post_id" });
    }

    const allComplete = batches.every((batchLangs) => batchLangsComplete(batchLangs, draftPayload));
    if (!allComplete) {
      if (runId) {
        await db.rpc("finish_ai_edge_function_run", {
          p_run_id: runId,
          p_status: "completed",
          p_input_tokens: totalInputTokens || null,
          p_output_tokens: totalOutputTokens || null,
          p_response_status: 200,
          p_metadata: { partial: true, batch_index: lastBatchIndex, total_batches: batches.length },
        });
      }

      return out({
        ok: true,
        complete: false,
        has_more: true,
        post_id: postId,
        batch_index: lastBatchIndex,
        total_batches: batches.length,
        translation_count: Object.keys((draftPayload?.translations as Record<string, unknown>) ?? {}).length,
        expected_translation_count: langs.length,
      });
    }

    if (!draftPayload) throw new Error("Venue thank-you draft missing after batching");

    const saved = await db.rpc("save_journal_venue_thank_you_result", {
      p_post_id: postId,
      p_payload: draftPayload,
      p_model: cfg.model,
    });
    if (saved.error) throw new Error(`Could not save venue thank-you: ${saved.error.message}`);

    if (runId) {
      await db.rpc("finish_ai_edge_function_run", {
        p_run_id: runId,
        p_status: "completed",
        p_input_tokens: totalInputTokens || null,
        p_output_tokens: totalOutputTokens || null,
        p_response_status: 200,
        p_metadata: { language_count: langs.length, batched: true },
      });
    }

    return out({
      ok: true,
      complete: true,
      has_more: false,
      ...(saved.data as Record<string, unknown>),
      languages: langs,
      model: cfg.model,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === "Unauthorized" || message === "Admin access required") {
      return out({ error: message }, message === "Admin access required" ? 403 : 401);
    }

    if (postId) {
      const failedAt = new Date().toISOString();
      const { data: existing } = await db
        .from("journal_post_venue_thank_you")
        .select("draft_payload")
        .eq("journal_post_id", postId)
        .maybeSingle();
      await db.from("journal_post_venue_thank_you").upsert({
        journal_post_id: postId,
        generation_status: existing?.draft_payload ? "processing" : "failed",
        last_error: message.slice(0, 4000),
        updated_at: failedAt,
      }, { onConflict: "journal_post_id" });
    }

    if (runId) {
      await db.rpc("finish_ai_edge_function_run", {
        p_run_id: runId,
        p_status: "failed",
        p_response_status: 500,
        p_error_message: message,
      });
    }

    return out({ error: message }, 500);
  }
});
