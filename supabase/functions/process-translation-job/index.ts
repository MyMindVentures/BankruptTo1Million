import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY") ?? Deno.env.get("OPENAI_API_KEY");
const MODEL = Deno.env.get("TRANSLATION_MODEL") ?? "google/gemini-2.5-flash-lite";
const LANGUAGES_PER_RUN = 2;
const MAX_CHUNK_CHARS = 5500;
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

type Job = {
  id: string;
  entity_type: string;
  entity_id: string;
  status: string;
  target_languages: string[];
  attempts: number;
  max_attempts: number;
};

type EntityConfig = {
  sourceTable: string;
  sourceFields: string[];
  targetTable: string;
  foreignKey: string;
  sourceLabel: "ai" | "machine";
};

const CONFIG: Record<string, EntityConfig> = {
  journal_post: { sourceTable: "journal_posts", sourceFields: ["title","subtitle","excerpt","body","seo_title","seo_description"], targetTable: "journal_translations", foreignKey: "journal_post_id", sourceLabel: "ai" },
  website_key: { sourceTable: "website_translation_keys", sourceFields: ["default_text","value_type","description","interpolation_variables","supports_plural"], targetTable: "website_translations", foreignKey: "translation_key_id", sourceLabel: "ai" },
  proof_of_mind_concept: { sourceTable: "proof_of_mind_concepts", sourceFields: ["title","tagline","short_description","full_description","innovation_summary","problem_statement","problems_solved","solution_overview","vision_statement","target_audience","target_users","key_features","key_use_cases","differentiation_points","market_opportunity","business_model","business_model_summary","validation_summary","validation_evidence","roadmap_summary","collaboration_opportunities","detail_cta_label","seo_title","seo_description"], targetTable: "proof_of_mind_concept_translations", foreignKey: "concept_id", sourceLabel: "machine" },
  founder_profile: { sourceTable: "founder_profiles", sourceFields: ["headline","role_title","short_bio","full_bio","personal_mission","founder_story","contact_cta_label","partnership_cta_label"], targetTable: "founder_profile_translations", foreignKey: "founder_profile_id", sourceLabel: "machine" },
  founder_timeline_event: { sourceTable: "founder_timeline_events", sourceFields: ["title","subtitle","description","location_name","host_thank_you"], targetTable: "founder_timeline_event_translations", foreignKey: "timeline_event_id", sourceLabel: "machine" },
  platform_update: { sourceTable: "platform_updates", sourceFields: ["title","short_description","motivation","positive_impact","release_notes"], targetTable: "platform_update_translations", foreignKey: "platform_update_id", sourceLabel: "machine" },
  founder_post: { sourceTable: "founder_posts", sourceFields: ["personal_intro","why_i_created_it","lived_experience","vision_for_impact","founder_video_title","founder_video_description","video_transcript","cta_label","personal_problem","solution_i_envisioned","who_it_is_for","why_it_matters","concept_thinker_insight","vision_partner_angle","adhd_strength_connection"], targetTable: "founder_post_translations", foreignKey: "founder_post_id", sourceLabel: "machine" },
  founder_message: { sourceTable: "founder_messages", sourceFields: ["title","eyebrow","body","founder_role","founder_statement","cta_label"], targetTable: "founder_message_translations", foreignKey: "founder_message_id", sourceLabel: "machine" },
  journey_calendar_entry: { sourceTable: "journey_calendar_entries", sourceFields: ["title","country_name","region_name","city_name","location_name","public_summary","purpose","host_request_message"], targetTable: "journey_calendar_entry_translations", foreignKey: "calendar_entry_id", sourceLabel: "machine" },
  journey_exchange_item: { sourceTable: "journey_exchange_items", sourceFields: ["title","description","tagline","full_description","highlights","what_is_included","suitable_for","requirements","availability_text","location_text","cta_label","secondary_cta_label","seo_title","seo_description"], targetTable: "journey_exchange_item_translations", foreignKey: "exchange_item_id", sourceLabel: "machine" },
  offer: { sourceTable: "offers", sourceFields: ["title","tagline","short_description","full_description","personal_story","highlights","what_is_included","suitable_for","requirements","availability_text","location_text","cta_label","secondary_cta_label","seo_title","seo_description"], targetTable: "offer_translations", foreignKey: "offer_id", sourceLabel: "machine" },
  founder_support_message: { sourceTable: "founder_support_messages", sourceFields: ["title","body"], targetTable: "founder_support_message_translations", foreignKey: "support_message_id", sourceLabel: "machine" },
  founder_win: { sourceTable: "founder_wins", sourceFields: ["title","description"], targetTable: "founder_win_translations", foreignKey: "founder_win_id", sourceLabel: "machine" },
  founder_mission_reminder: { sourceTable: "founder_mission_reminders", sourceFields: ["title","body","source_label"], targetTable: "founder_mission_reminder_translations", foreignKey: "reminder_id", sourceLabel: "machine" },
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

async function authenticate(req: Request) {
  const supplied = req.headers.get("x-translation-secret");
  const { data, error } = await supabase.rpc("get_translation_worker_secret");
  if (error || !supplied || supplied !== data) throw new Error("Unauthorized translation worker request");
}

function extractFirstJsonObject(input: string): Record<string, unknown> {
  const cleaned = input.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
  let start = -1;
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = 0; i < cleaned.length; i += 1) {
    const ch = cleaned[i];
    if (start < 0) {
      if (ch === "{") { start = i; depth = 1; }
      continue;
    }
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        const parsed = JSON.parse(cleaned.slice(start, i + 1));
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("AI response was not a JSON object");
        return parsed as Record<string, unknown>;
      }
    }
  }
  throw new Error("AI response did not contain one complete JSON object");
}

function chunkSource(source: Record<string, unknown>) {
  const chunks: Record<string, unknown>[] = [];
  let current: Record<string, unknown> = {};
  let currentSize = 2;
  for (const [key, value] of Object.entries(source)) {
    const entrySize = JSON.stringify({ [key]: value }).length;
    if (Object.keys(current).length && currentSize + entrySize > MAX_CHUNK_CHARS) {
      chunks.push(current);
      current = {};
      currentSize = 2;
    }
    current[key] = value;
    currentSize += entrySize;
  }
  if (Object.keys(current).length) chunks.push(current);
  return chunks;
}

async function translateChunk(source: Record<string, unknown>, language: { code: string; english_name: string }) {
  if (!OPENROUTER_API_KEY) throw new Error("Missing OPENROUTER_API_KEY Edge Function secret");
  const prompt = `Translate SOURCE JSON from English into ${language.english_name} (${language.code}). Return exactly one valid JSON object with the exact same keys and structure. No markdown, commentary or second object. Preserve nulls, numbers, booleans, URLs, names, markdown, HTML tags, placeholders, ICU variables and nested arrays/objects. Translate natural-language strings only.\nSOURCE JSON:\n${JSON.stringify(source)}`;

  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://bankruptto1million.com",
          "X-Title": "Bankrupt to 1 Million Translation Worker",
        },
        body: JSON.stringify({
          model: MODEL,
          temperature: 0,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: "Return exactly one valid JSON object and nothing else." },
            { role: "user", content: prompt },
          ],
        }),
      });
      if (!res.ok) {
        const body = (await res.text()).slice(0, 700);
        throw new Error(`AI provider ${res.status}: ${body}`);
      }
      const payload = await res.json();
      const text = payload?.choices?.[0]?.message?.content;
      if (!text) throw new Error("AI provider returned no translation content");
      return extractFirstJsonObject(text);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  throw lastError ?? new Error("Translation failed");
}

async function translateOne(source: Record<string, unknown>, language: { code: string; english_name: string }) {
  const translated: Record<string, unknown> = {};
  for (const chunk of chunkSource(source)) {
    Object.assign(translated, await translateChunk(chunk, language));
  }
  return translated;
}

async function loadSource(job: Job) {
  const config = CONFIG[job.entity_type];
  if (!config) throw new Error(`Unsupported entity type: ${job.entity_type}`);
  const { data, error } = await supabase.from(config.sourceTable).select(config.sourceFields.join(",")).eq("id", job.entity_id).single();
  if (error) throw error;
  return data as Record<string, unknown>;
}

/** Languages still needing translation. For website_key, English bootstrap placeholders are not "done". */
async function getMissingLanguages(job: Job, config: EntityConfig) {
  if (job.entity_type === "website_key") {
    const { data: keyRow, error: keyError } = await supabase
      .from("website_translation_keys")
      .select("default_text")
      .eq("id", job.entity_id)
      .single();
    if (keyError) throw keyError;
    const defaultText = typeof keyRow?.default_text === "string" ? keyRow.default_text : "";

    const { data, error } = await supabase
      .from(config.targetTable)
      .select("language_code, translated_text, translation_source")
      .eq(config.foreignKey, job.entity_id)
      .in("language_code", job.target_languages);
    if (error) throw error;

    const done = new Set(
      (data ?? [])
        .filter((row: { language_code: string; translated_text: string | null; translation_source: string | null }) => {
          const source = row.translation_source ?? "";
          if (source === "ai" || source === "machine") return true;
          return row.translated_text !== defaultText;
        })
        .map((row: { language_code: string }) => row.language_code),
    );
    return job.target_languages.filter((code) => !done.has(code));
  }

  const { data, error } = await supabase.from(config.targetTable).select("language_code").eq(config.foreignKey, job.entity_id).in("language_code", job.target_languages);
  if (error) throw error;
  const existing = new Set((data ?? []).map((row: { language_code: string }) => row.language_code));
  return job.target_languages.filter((code) => !existing.has(code));
}

async function saveTranslation(job: Job, config: EntityConfig, languageCode: string, translated: Record<string, unknown>) {
  const now = new Date().toISOString();
  if (job.entity_type === "website_key") {
    const text = typeof translated.default_text === "string" ? translated.default_text : Object.values(translated).find((value) => typeof value === "string");
    if (typeof text !== "string") throw new Error("Website translation did not contain text");
    const row = {
      translation_key_id: job.entity_id,
      language_code: languageCode,
      translated_text: text,
      translation_status: "published",
      translation_source: "ai",
      translated_at: now,
      published_at: now,
      reviewed_at: null,
      updated_at: now,
    };
    const { error } = await supabase.from(config.targetTable).upsert(row, { onConflict: `${config.foreignKey},language_code` });
    if (error) throw error;
    return;
  }

  const row: Record<string, unknown> = {
    [config.foreignKey]: job.entity_id,
    language_code: languageCode,
    ...translated,
    translation_status: "published",
    translation_source: config.sourceLabel,
    translated_at: now,
    reviewed_at: null,
    updated_at: now,
  };
  delete row.original_language;
  if (job.entity_type === "journal_post") row.published_at = now;
  const { error } = await supabase.from(config.targetTable).upsert(row, { onConflict: `${config.foreignKey},language_code` });
  if (error) throw error;
}

function isQuotaOrRateLimit(message: string) {
  return /AI provider (402|429)|insufficient|credit|quota|rate limit/i.test(message);
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  let jobId: string | null = null;
  try {
    await authenticate(req);
    const body = await req.json();
    jobId = body.job_id;
    if (!jobId) return json({ error: "job_id required" }, 400);

    const { data: job, error } = await supabase.from("translation_jobs").select("*").eq("id", jobId).single<Job>();
    if (error || !job) throw error ?? new Error("Translation job not found");
    if (job.status === "completed") return json({ ok: true, status: "already_completed", job_id: jobId });

    const config = CONFIG[job.entity_type];
    if (!config) throw new Error(`Unsupported entity type: ${job.entity_type}`);

    await supabase.from("translation_jobs").update({
      status: "processing",
      attempts: job.attempts + 1,
      started_at: new Date().toISOString(),
      last_error: null,
      updated_at: new Date().toISOString(),
    }).eq("id", job.id);

    const source = await loadSource(job);
    const missingCodes = await getMissingLanguages(job, config);
    if (!missingCodes.length) {
      await supabase.from("translation_jobs").update({
        status: "completed",
        result_summary: { succeeded: [], skipped_existing: job.target_languages, model: MODEL },
        last_error: null,
        completed_at: new Date().toISOString(),
        next_attempt_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", job.id);
      return json({ ok: true, job_id: job.id, status: "completed" });
    }

    const selectedCodes = missingCodes.slice(0, LANGUAGES_PER_RUN);
    const { data: languages, error: languageError } = await supabase.from("site_languages").select("code,english_name").in("code", selectedCodes).eq("is_active", true).order("display_order");
    if (languageError) throw languageError;

    const succeeded: string[] = [];
    const failed: Record<string, string> = {};
    for (const language of languages ?? []) {
      try {
        const translated = await translateOne(source, language);
        await saveTranslation(job, config, language.code, translated);
        succeeded.push(language.code);
      } catch (error) {
        failed[language.code] = error instanceof Error ? error.message : String(error);
      }
    }

    const remaining = await getMissingLanguages(job, config);
    const complete = remaining.length === 0;
    const messages = Object.values(failed).join(" ");
    const quotaLimited = isQuotaOrRateLimit(messages);
    const finalStatus = complete ? "completed" : succeeded.length ? "partially_completed" : "failed";
    const nextAttempt = new Date(Date.now() + (quotaLimited ? 30 : 3) * 60_000).toISOString();

    await supabase.from("translation_jobs").update({
      status: finalStatus,
      result_summary: { succeeded, failed, remaining, model: MODEL, languages_per_run: LANGUAGES_PER_RUN, chunked: true },
      last_error: complete ? null : JSON.stringify(failed).slice(0, 4000),
      completed_at: complete ? new Date().toISOString() : null,
      next_attempt_at: complete ? new Date().toISOString() : nextAttempt,
      updated_at: new Date().toISOString(),
    }).eq("id", job.id);

    return json({ ok: complete, job_id: job.id, status: finalStatus, succeeded, failed, remaining, next_attempt_at: nextAttempt }, complete ? 200 : 207);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (jobId) {
      const delayMinutes = isQuotaOrRateLimit(message) ? 30 : 3;
      await supabase.from("translation_jobs").update({
        status: "failed",
        last_error: message.slice(0, 4000),
        completed_at: null,
        next_attempt_at: new Date(Date.now() + delayMinutes * 60_000).toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", jobId);
    }
    console.error(message);
    return json({ error: message, job_id: jobId }, message.startsWith("Unauthorized") ? 401 : 500);
  }
});
