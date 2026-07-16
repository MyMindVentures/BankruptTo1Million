import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const U = Deno.env.get("SUPABASE_URL")!;
const S = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const A = Deno.env.get("SUPABASE_ANON_KEY")!;
const K = Deno.env.get("OPENROUTER_API_KEY") ?? Deno.env.get("OPENAI_API_KEY");
const SLUG = "generate-journal-place-context";

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

  if (error) throw new Error(`Active languages could not be loaded: ${error.message}`);

  const languages = (data ?? [])
    .map((row) => String(row.code || "").trim())
    .filter(Boolean);

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

function validatePlaceContext(placeContext: Record<string, unknown>, langs: string[]) {
  if (!placeContext || typeof placeContext !== "object") {
    throw new Error("Missing place_context object");
  }

  const translations = placeContext.translations as Record<string, Record<string, string>> | undefined;
  if (!translations || typeof translations !== "object") {
    throw new Error("Missing place_context.translations");
  }

  for (const lang of langs) {
    const item = translations[lang];
    if (!item?.place_title?.trim()) throw new Error(`Missing place_context place_title for ${lang}`);
    if (!item?.place_history?.trim()) throw new Error(`Missing place_context place_history for ${lang}`);
    if (!item?.area_title?.trim()) throw new Error(`Missing place_context area_title for ${lang}`);
    if (!item?.area_history?.trim()) throw new Error(`Missing place_context area_history for ${lang}`);
    if (item.place_history.length > 4000) throw new Error(`place_history too long for ${lang}`);
    if (item.area_history.length > 6000) throw new Error(`area_history too long for ${lang}`);
  }

  const pois = placeContext.pois as Array<Record<string, unknown>> | undefined;
  if (!Array.isArray(pois) || pois.length !== 5) {
    throw new Error("place_context must include exactly 5 POIs");
  }

  for (let i = 0; i < pois.length; i++) {
    const poi = pois[i];
    const poiTranslations = poi.translations as Record<string, Record<string, string>> | undefined;
    if (!poiTranslations) throw new Error(`Missing POI translations for item ${i + 1}`);
    for (const lang of langs) {
      const row = poiTranslations[lang];
      if (!row?.title?.trim()) throw new Error(`Missing POI title for ${lang} item ${i + 1}`);
      if (!row?.description?.trim()) throw new Error(`Missing POI description for ${lang} item ${i + 1}`);
      if (row.description.length > 1200) throw new Error(`POI description too long for ${lang} item ${i + 1}`);
    }
  }
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
    const cfg = cfgResult.data;
    if (!cfg) throw new Error("AI runtime config unavailable: empty response");

    const context = await loadContext(postId);
    if (!journeyHasPlaceContext(context as Record<string, unknown>)) {
      return out({ ok: true, skipped: true, post_id: postId, reason: "no_location_context" });
    }

    if (cfg.enable_run_logging) {
      const r = await db.rpc("start_ai_edge_function_run", {
        p_edge_function_slug: SLUG,
        p_entity_type: "journal_post",
        p_entity_id: postId,
        p_metadata: { source: "edge_function", config_version: cfg.config_version, prompt_version: cfg.prompt_version },
      });
      if (r.error) throw new Error(`Could not start AI run: ${r.error.message}`);
      runId = r.data;
    }

    const now = new Date().toISOString();
    await db.from("journal_post_place_context").upsert(
      { journal_post_id: postId, generation_status: "processing", updated_at: now },
      { onConflict: "journal_post_id" },
    );

    const langs = await fetchActiveLanguages();
    const settings = cfg.generation_settings ?? {};
    const placeHistory = settings.place_history_characters ?? { min: 150, max: 800 };
    const areaHistory = settings.area_history_characters ?? { min: 200, max: 1200 };
    const poiDescription = settings.poi_description_characters ?? { min: 80, max: 400 };

    const prompt = `${cfg.user_prompt_template}

Return exactly one valid JSON object with a top-level place_context object for ${langs.join(", ")}.

place_context requires:
- place_type: restaurant|bar|cafe|hotel|shop|venue|other
- area_type: city|village|town|region
- optional area_name
- links: { google_maps_url, website_url, instagram_url } (null when unknown)
- translations: every language needs place_title, place_history (${placeHistory.min}-${placeHistory.max} chars), area_title, area_history (${areaHistory.min}-${areaHistory.max} chars)
- exactly 5 pois with display_order 1-5, poi_type landmark|museum|nature|food|culture|other, and translations per language with title and description (${poiDescription.min}-${poiDescription.max} chars)

Base content on verified coordinates, featured business name, and location fields. Never invent URLs.

Verified context: ${JSON.stringify(context)}`;

    const ai = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${K}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://bankruptto1million.com",
        "X-Title": "Bankrupt to 1 Million Journal Place Context AI",
      },
      body: JSON.stringify({
        model: cfg.model,
        temperature: Number(cfg.temperature),
        top_p: cfg.top_p == null ? undefined : Number(cfg.top_p),
        max_tokens: Number(cfg.max_output_tokens ?? 16000),
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
      throw new Error(`AI response incomplete: finish_reason=${finishReason}`);
    }

    const parsed = parse(payload?.choices?.[0]?.message?.content ?? "");
    const placeContext = (parsed.place_context ?? parsed) as Record<string, unknown>;
    validatePlaceContext(placeContext, langs);

    const saved = await db.rpc("save_journal_place_context_result", {
      p_post_id: postId,
      p_place_context: placeContext,
      p_model: cfg.model,
    });
    if (saved.error) throw new Error(`Could not save place context: ${saved.error.message}`);

    if (runId) {
      await db.rpc("finish_ai_edge_function_run", {
        p_run_id: runId,
        p_status: "completed",
        p_input_tokens: payload?.usage?.prompt_tokens ?? null,
        p_output_tokens: payload?.usage?.completion_tokens ?? null,
        p_response_status: 200,
        p_metadata: { poi_count: 5, language_count: langs.length, finish_reason: finishReason ?? null },
      });
    }

    return out({
      ok: true,
      ...saved.data,
      languages: langs,
      model: cfg.model,
      config_version: cfg.config_version,
      prompt_version: cfg.prompt_version,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (postId) {
      const failedAt = new Date().toISOString();
      await db.from("journal_post_place_context").upsert(
        { journal_post_id: postId, generation_status: "failed", updated_at: failedAt },
        { onConflict: "journal_post_id" },
      );
    }
    if (runId) {
      await db.rpc("finish_ai_edge_function_run", {
        p_run_id: runId,
        p_status: "failed",
        p_response_status: 500,
        p_error_message: message,
      });
    }
    console.error(`${SLUG} failed`, { postId, message });
    return out({ error: message }, 500);
  }
});
