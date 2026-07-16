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

async function loadDraftPayload(postId: string) {
  const { data, error } = await db
    .from("journal_post_place_context")
    .select("draft_payload")
    .eq("journal_post_id", postId)
    .maybeSingle();

  if (error) throw new Error(`Draft place context could not be loaded: ${error.message}`);
  return (data?.draft_payload as Record<string, unknown> | null) ?? null;
}

function batchLangHasCoreContent(lang: string, draft: Record<string, unknown>) {
  const translations = draft.translations as Record<string, Record<string, string>> | undefined;
  const pois = draft.pois as Array<Record<string, unknown>> | undefined;
  const row = translations?.[lang];
  if (!row?.place_title?.trim() || !row?.place_history?.trim() || !row?.area_title?.trim() || !row?.area_history?.trim()) {
    return false;
  }
  if (!Array.isArray(pois) || pois.length !== 5) return false;
  return pois.every((poi) => {
    const poiTranslations = poi.translations as Record<string, Record<string, string>> | undefined;
    const item = poiTranslations?.[lang];
    return Boolean(item?.title?.trim() && item?.description?.trim());
  });
}

function batchLangsComplete(batchLangs: string[], draft: Record<string, unknown> | null) {
  if (!draft) return false;
  const translations = draft.translations as Record<string, Record<string, string>> | undefined;
  if (!translations) return false;

  return batchLangs.every((lang) => {
    if (!batchLangHasCoreContent(lang, draft)) return false;
    return Boolean(translations[lang]?.venue_thank_you_message?.trim());
  });
}

function batchLangsNeedThankYouOnly(batchLangs: string[], draft: Record<string, unknown> | null) {
  if (!draft) return false;
  const translations = draft.translations as Record<string, Record<string, string>> | undefined;
  return batchLangs.every((lang) => {
    if (!batchLangHasCoreContent(lang, draft)) return false;
    return !translations?.[lang]?.venue_thank_you_message?.trim();
  });
}

function validateBatchPlaceContext(
  placeContext: Record<string, unknown>,
  batchLangs: string[],
  settings: Record<string, unknown>,
  thankYouOnly = false,
) {
  const thankYou = settings.thank_you_characters ?? { min: 180, max: 700 };
  const thankYouMin = Number(thankYou.min ?? 180);
  const thankYouMax = Number(thankYou.max ?? 700);

  if (thankYouOnly) {
    const translations = placeContext.translations as Record<string, Record<string, string>> | undefined;
    if (!translations) throw new Error("Missing place_context.translations");
    for (const lang of batchLangs) {
      const message = translations[lang]?.venue_thank_you_message?.trim();
      if (!message) throw new Error(`Missing venue_thank_you_message for ${lang}`);
      if (message.length > 1200) throw new Error(`venue_thank_you_message too long for ${lang}`);
      if (message.length < thankYouMin || message.length > thankYouMax) {
        throw new Error(`Invalid venue_thank_you_message length for ${lang}: ${message.length}; expected ${thankYouMin}-${thankYouMax}`);
      }
    }
    return;
  }

  const placeHistory = settings.place_history_characters ?? { min: 150, max: 800 };
  const areaHistory = settings.area_history_characters ?? { min: 200, max: 1200 };
  const poiDescription = settings.poi_description_characters ?? { min: 80, max: 400 };

  const translations = placeContext.translations as Record<string, Record<string, string>> | undefined;
  if (!translations) throw new Error("Missing place_context.translations");

  for (const lang of batchLangs) {
    const item = translations[lang];
    if (!item?.place_title?.trim()) throw new Error(`Missing place_context place_title for ${lang}`);
    if (!item?.place_history?.trim()) throw new Error(`Missing place_context place_history for ${lang}`);
    if (!item?.area_title?.trim()) throw new Error(`Missing place_context area_title for ${lang}`);
    if (!item?.area_history?.trim()) throw new Error(`Missing place_context area_history for ${lang}`);
    if (!item?.venue_thank_you_message?.trim()) throw new Error(`Missing venue_thank_you_message for ${lang}`);
    if (item.venue_thank_you_message.length > 1200) throw new Error(`venue_thank_you_message too long for ${lang}`);
    if (item.venue_thank_you_message.length < thankYouMin || item.venue_thank_you_message.length > thankYouMax) {
      throw new Error(`Invalid venue_thank_you_message length for ${lang}: ${item.venue_thank_you_message.length}; expected ${thankYouMin}-${thankYouMax}`);
    }
    if (item.place_history.length > 4000) throw new Error(`place_history too long for ${lang}`);
    if (item.area_history.length > 6000) throw new Error(`area_history too long for ${lang}`);
    const placeMin = Number((settings.place_history_characters as { min?: number } | undefined)?.min ?? 150);
    const placeMax = Number((settings.place_history_characters as { max?: number } | undefined)?.max ?? 800);
    const areaMin = Number((settings.area_history_characters as { min?: number } | undefined)?.min ?? 200);
    const areaMax = Number((settings.area_history_characters as { max?: number } | undefined)?.max ?? 1200);
    const byLangPlace = (settings.place_history_by_language as Record<string, { min?: number; max?: number }> | undefined)?.[lang];
    const byLangArea = (settings.area_history_by_language as Record<string, { min?: number; max?: number }> | undefined)?.[lang];
    const effectivePlaceMin = Number(byLangPlace?.min ?? placeMin);
    const effectivePlaceMax = Number(byLangPlace?.max ?? placeMax);
    const effectiveAreaMin = Number(byLangArea?.min ?? areaMin);
    const effectiveAreaMax = Number(byLangArea?.max ?? areaMax);
    if (item.place_history.length < effectivePlaceMin || item.place_history.length > effectivePlaceMax) {
      throw new Error(`Invalid place_history length for ${lang}: ${item.place_history.length}; expected ${effectivePlaceMin}-${effectivePlaceMax}`);
    }
    if (item.area_history.length < effectiveAreaMin || item.area_history.length > effectiveAreaMax) {
      throw new Error(`Invalid area_history length for ${lang}: ${item.area_history.length}; expected ${effectiveAreaMin}-${effectiveAreaMax}`);
    }
  }

  const pois = placeContext.pois as Array<Record<string, unknown>> | undefined;
  if (!Array.isArray(pois) || pois.length !== 5) {
    throw new Error("place_context must include exactly 5 POIs");
  }

  for (let i = 0; i < pois.length; i++) {
    const poi = pois[i];
    const poiTranslations = poi.translations as Record<string, Record<string, string>> | undefined;
    if (!poiTranslations) throw new Error(`Missing POI translations for item ${i + 1}`);
    for (const lang of batchLangs) {
      const row = poiTranslations[lang];
      if (!row?.title?.trim()) throw new Error(`Missing POI title for ${lang} item ${i + 1}`);
      if (!row?.description?.trim()) throw new Error(`Missing POI description for ${lang} item ${i + 1}`);
      if (row.description.length > 1200) throw new Error(`POI description too long for ${lang} item ${i + 1}`);
      if (row.description.length < Number(poiDescription.min) || row.description.length > Number(poiDescription.max)) {
        throw new Error(`Invalid POI description length for ${lang} item ${i + 1}`);
      }
    }
  }
}

function mergePlaceContextBatch(
  existing: Record<string, unknown> | null,
  batch: Record<string, unknown>,
  batchLangs: string[],
  thankYouOnly = false,
) {
  const merged = existing ? structuredClone(existing) : {} as Record<string, unknown>;
  const batchTranslations = (batch.translations ?? {}) as Record<string, Record<string, string>>;
  const translations = {
    ...((merged.translations as Record<string, Record<string, string>> | undefined) ?? {}),
  };

  if (thankYouOnly) {
    for (const lang of batchLangs) {
      const incoming = batchTranslations[lang];
      if (!incoming?.venue_thank_you_message?.trim()) continue;
      translations[lang] = {
        ...(translations[lang] ?? {}),
        venue_thank_you_message: incoming.venue_thank_you_message,
      };
    }
    merged.translations = translations;
    return merged;
  }

  merged.translations = {
    ...translations,
    ...batchTranslations,
  };

  if (!merged.place_type && batch.place_type) merged.place_type = batch.place_type;
  if (!merged.area_type && batch.area_type) merged.area_type = batch.area_type;
  if (!merged.area_name && batch.area_name) merged.area_name = batch.area_name;
  if (!merged.links && batch.links) merged.links = batch.links;

  const batchPois = batch.pois as Array<Record<string, unknown>> | undefined;
  const mergedPois = (merged.pois as Array<Record<string, unknown>> | undefined) ?? [];

  if (batchPois?.length === 5) {
    for (let i = 0; i < 5; i++) {
      const source = batchPois[i];
      const target = mergedPois[i] ?? {};
      target.display_order = source.display_order ?? i + 1;
      target.poi_type = source.poi_type ?? target.poi_type ?? "other";
      target.latitude = source.latitude ?? target.latitude;
      target.longitude = source.longitude ?? target.longitude;
      target.coordinate_source = source.coordinate_source ?? target.coordinate_source;
      target.translations = {
        ...((target.translations as Record<string, Record<string, string>> | undefined) ?? {}),
      };
      for (const lang of batchLangs) {
        const row = (source.translations as Record<string, Record<string, string>> | undefined)?.[lang];
        if (row) {
          (target.translations as Record<string, Record<string, string>>)[lang] = row;
        }
      }
      mergedPois[i] = target;
    }
    merged.pois = mergedPois;
  }

  return merged;
}

function validatePlaceContext(placeContext: Record<string, unknown>, langs: string[], settings: Record<string, unknown>) {
  validateBatchPlaceContext(placeContext, langs, {
    ...settings,
    place_history_characters: { min: 0, max: 4000 },
    area_history_characters: { min: 0, max: 6000 },
    poi_description_characters: { min: 0, max: 1200 },
  });
}

function parseCoord(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isValidCoord(lat: number, lng: number) {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function coordsWithinRadius(
  poiLat: number,
  poiLng: number,
  venueLat: number | null,
  venueLng: number | null,
  maxKm: number,
) {
  if (venueLat == null || venueLng == null) return true;
  return haversineKm(poiLat, poiLng, venueLat, venueLng) <= maxKm;
}

function poiEnglishTitle(poi: Record<string, unknown>) {
  const translations = poi.translations as Record<string, Record<string, string>> | undefined;
  return translations?.en?.title?.trim()
    || Object.values(translations ?? {}).map((row) => row?.title?.trim()).find(Boolean)
    || "";
}

async function geocodePoi(title: string, areaName: string, countryCode?: string | null) {
  const query = [title, areaName].filter(Boolean).join(", ");
  if (!query.trim()) return null;

  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", query);
  url.searchParams.set("count", "1");
  url.searchParams.set("language", "en");
  if (countryCode) url.searchParams.set("country_code", countryCode);

  const response = await fetch(url.toString(), { headers: { Accept: "application/json" } });
  if (!response.ok) return null;

  const payload = await response.json();
  const result = payload?.results?.[0];
  if (!result) return null;

  const lat = parseCoord(result.latitude);
  const lng = parseCoord(result.longitude);
  if (lat == null || lng == null || !isValidCoord(lat, lng)) return null;

  return { latitude: lat, longitude: lng };
}

async function resolvePoiCoordinates(
  poi: Record<string, unknown>,
  areaName: string,
  venueLat: number | null,
  venueLng: number | null,
  maxRadiusKm: number,
  countryCode?: string | null,
) {
  const aiLat = parseCoord(poi.latitude);
  const aiLng = parseCoord(poi.longitude);

  if (
    aiLat != null && aiLng != null && isValidCoord(aiLat, aiLng)
    && coordsWithinRadius(aiLat, aiLng, venueLat, venueLng, maxRadiusKm)
  ) {
    poi.latitude = aiLat;
    poi.longitude = aiLng;
    poi.coordinate_source = "ai";
    return poi;
  }

  const title = poiEnglishTitle(poi);
  const geocoded = await geocodePoi(title, areaName, countryCode);
  if (
    !geocoded
    || !coordsWithinRadius(geocoded.latitude, geocoded.longitude, venueLat, venueLng, maxRadiusKm)
  ) {
    throw new Error(`Could not resolve coordinates for POI "${title || "unknown"}"`);
  }

  poi.latitude = geocoded.latitude;
  poi.longitude = geocoded.longitude;
  poi.coordinate_source = "geocoded";
  return poi;
}

async function resolveAllPoiCoordinates(
  placeContext: Record<string, unknown>,
  context: Record<string, unknown>,
  settings: Record<string, unknown>,
) {
  const event = (context.event ?? {}) as Record<string, unknown>;
  const venueLat = parseCoord(event.latitude);
  const venueLng = parseCoord(event.longitude);
  const areaName = String(
    placeContext.area_name
      ?? event.city_name
      ?? event.location_name
      ?? event.region_name
      ?? "",
  ).trim();
  const countryCode = String(event.country_code ?? "").trim() || null;
  const maxRadiusKm = Number(settings.poi_max_radius_km ?? 50);
  const pois = placeContext.pois as Array<Record<string, unknown>>;

  for (let i = 0; i < pois.length; i++) {
    pois[i] = await resolvePoiCoordinates(
      pois[i],
      areaName,
      venueLat,
      venueLng,
      maxRadiusKm,
      countryCode,
    );
  }
}

function normalizeEnum(value: unknown, allowed: string[], fallback: string) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (allowed.includes(normalized)) return normalized;
  const aliasMap: Record<string, string> = {
    beach: "nature",
    coast: "nature",
    park: "nature",
    mountain: "nature",
    church: "culture",
    cathedral: "culture",
    castle: "landmark",
    monument: "landmark",
    museum: "museum",
    restaurant: "food",
    cafe: "food",
    bar: "food",
    village: "village",
    city: "city",
    town: "town",
    region: "region",
    neighborhood: "town",
    municipality: "town",
  };
  return aliasMap[normalized] ?? fallback;
}

function normalizePlaceContextEnums(placeContext: Record<string, unknown>) {
  placeContext.place_type = normalizeEnum(
    placeContext.place_type,
    ["restaurant", "bar", "cafe", "hotel", "shop", "venue", "other"],
    "other",
  );
  placeContext.area_type = normalizeEnum(
    placeContext.area_type,
    ["city", "village", "town", "region"],
    "town",
  );
  const pois = placeContext.pois as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(pois)) {
    for (const poi of pois) {
      poi.poi_type = normalizeEnum(
        poi.poi_type,
        ["landmark", "museum", "nature", "food", "culture", "other"],
        "other",
      );
    }
  }
  return placeContext;
}

function validatePoiCoordinates(placeContext: Record<string, unknown>) {
  const pois = placeContext.pois as Array<Record<string, unknown>>;
  for (let i = 0; i < pois.length; i++) {
    const lat = parseCoord(pois[i].latitude);
    const lng = parseCoord(pois[i].longitude);
    if (lat == null || lng == null || !isValidCoord(lat, lng)) {
      throw new Error(`Missing resolved coordinates for POI item ${i + 1}`);
    }
    const source = String(pois[i].coordinate_source ?? "");
    if (!["ai", "geocoded", "manual"].includes(source)) {
      throw new Error(`Invalid coordinate_source for POI item ${i + 1}`);
    }
  }
}

function buildBatchPrompt(
  batchLangs: string[],
  settings: Record<string, unknown>,
  userPromptTemplate: string,
  context: unknown,
  isFirstBatch: boolean,
  thankYouOnly = false,
) {
  const thankYou = settings.thank_you_characters ?? { min: 180, max: 700 };
  const placeHistory = settings.place_history_characters ?? { min: 150, max: 800 };
  const areaHistory = settings.area_history_characters ?? { min: 200, max: 1200 };
  const poiDescription = settings.poi_description_characters ?? { min: 80, max: 400 };
  const placeByLanguage = settings.place_history_by_language as Record<string, { min?: number; max?: number }> | undefined;
  const areaByLanguage = settings.area_history_by_language as Record<string, { min?: number; max?: number }> | undefined;
  const languageRangeInstructions = batchLangs.map((lang) => {
    const place = { ...placeHistory, ...(placeByLanguage?.[lang] ?? {}) };
    const area = { ...areaHistory, ...(areaByLanguage?.[lang] ?? {}) };
    return `${lang}: place_history ${place.min}-${place.max}, area_history ${area.min}-${area.max}`;
  }).join("\n");

  const structureNote = thankYouOnly
    ? `Return place_context with translations for ${batchLangs.join(", ")} only. Each translation object must contain venue_thank_you_message (${thankYou.min}-${thankYou.max} chars) and nothing else. Do not change place history, area history, or POI content.`
    : isFirstBatch
      ? `Include the full place_context structure: place_type, area_type, optional area_name, links, exactly 5 pois with display_order 1-5, poi_type, latitude, longitude near the venue, and translations for ${batchLangs.join(", ")} only.`
      : `Return place_context with translations and poi translations for ${batchLangs.join(", ")} only. Reuse the same 5 POI structure (display_order, poi_type, coordinates) from the verified context.`;

  const contentNote = thankYouOnly
    ? `Every requested language needs venue_thank_you_message (${thankYou.min}-${thankYou.max} chars): a warm thank-you to the venue team, staff, and owner for hosting workspace for the website, mission, and projects, and for the happiness of featuring their place in the journal post and on the website. Never invent personal names.`
    : `Every requested language needs place_title, place_history, area_title, area_history, venue_thank_you_message (${thankYou.min}-${thankYou.max} chars), and each POI needs title and description (${poiDescription.min}-${poiDescription.max} chars). The thank-you must address the venue team, staff, and owner and mention hosting workspace and featuring their place on the journal and website.`;

  return `${userPromptTemplate}

Return exactly one valid JSON object with a top-level place_context object.

${structureNote}

${contentNote}
${thankYouOnly ? "" : `\nLanguage-specific history ranges:\n${languageRangeInstructions}`}

Base content on verified coordinates, featured business name, and location fields. Never invent URLs.

Verified context: ${JSON.stringify(context)}`;
}

async function generatePlaceContextBatch(
  batchLangs: string[],
  cfg: Record<string, unknown>,
  settings: Record<string, unknown>,
  context: unknown,
  isFirstBatch: boolean,
  thankYouOnly = false,
) {
  const maxAttempts = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const prompt = `${buildBatchPrompt(
      batchLangs,
      settings,
      String(cfg.user_prompt_template ?? ""),
      context,
      isFirstBatch,
      thankYouOnly,
    )}${attempt > 1 ? `\n\nPrevious attempt failed validation (${lastError?.message}). Regenerate the full JSON response.` : ""}`;

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
      throw new Error(`AI response incomplete for batch [${batchLangs.join(", ")}]: finish_reason=${finishReason}`);
    }

    try {
      const parsed = parse(payload?.choices?.[0]?.message?.content ?? "");
      const placeContext = (parsed.place_context ?? parsed) as Record<string, unknown>;
      validateBatchPlaceContext(placeContext, batchLangs, settings, thankYouOnly);
      return {
        placeContext,
        usage: {
          prompt_tokens: Number(payload?.usage?.prompt_tokens ?? 0),
          completion_tokens: Number(payload?.usage?.completion_tokens ?? 0),
        },
        finishReason,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt >= maxAttempts) throw lastError;
      await sleep(400 * attempt);
    }
  }

  throw lastError ?? new Error(`Could not generate place context batch [${batchLangs.join(", ")}]`);
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

    const cfgResult = await db.rpc("get_ai_edge_function_runtime_config", {
      p_edge_function_slug: SLUG,
    });
    if (cfgResult.error) throw new Error(`AI runtime config unavailable: ${cfgResult.error.message}`);
    const cfg = cfgResult.data as Record<string, unknown>;
    if (!cfg) throw new Error("AI runtime config unavailable: empty response");

    const context = await loadContext(postId);
    if (!journeyHasPlaceContext(context as Record<string, unknown>)) {
      return out({ ok: true, skipped: true, post_id: postId, reason: "no_location_context" });
    }

    const langs = await fetchActiveLanguages();
    const { data: existingContext, error: existingContextError } = await db
      .from("journal_post_place_context")
      .select("id, generation_status")
      .eq("journal_post_id", postId)
      .maybeSingle();
    if (existingContextError) {
      throw new Error(`Place context status unavailable: ${existingContextError.message}`);
    }

    if (existingContext?.generation_status === "completed") {
      return out({ ok: true, skipped: true, post_id: postId, reason: "already_completed" });
    }

    if (existingContext?.id) {
      const { count: publishedCount, error: publishedCountError } = await db
        .from("journal_post_place_context_translations")
        .select("id", { count: "exact", head: true })
        .eq("place_context_id", existingContext.id)
        .eq("translation_status", "published");
      if (publishedCountError) {
        throw new Error(`Published place context count unavailable: ${publishedCountError.message}`);
      }
      if ((publishedCount ?? 0) >= langs.length) {
        const restoredAt = new Date().toISOString();
        await db.from("journal_post_place_context").upsert({
          journal_post_id: postId,
          generation_status: "completed",
          draft_payload: null,
          last_error: null,
          updated_at: restoredAt,
        }, { onConflict: "journal_post_id" });
        return out({ ok: true, skipped: true, post_id: postId, reason: "already_published" });
      }
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
    await db.from("journal_post_place_context").upsert(
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

      const isFirstBatch = !draftPayload;
      const thankYouOnly = Boolean(draftPayload) && batchLangsNeedThankYouOnly(batchLangs, draftPayload);
      const enrichedContext = isFirstBatch
        ? context
        : { ...(context as Record<string, unknown>), existing_place_context: draftPayload };

      const { placeContext, usage, finishReason } = await generatePlaceContextBatch(
        batchLangs,
        cfg,
        settings,
        enrichedContext,
        isFirstBatch,
        thankYouOnly,
      );

      draftPayload = mergePlaceContextBatch(draftPayload, placeContext, batchLangs, thankYouOnly);
      totalInputTokens += Number(usage.prompt_tokens ?? 0);
      totalOutputTokens += Number(usage.completion_tokens ?? 0);
      processedThisInvocation += 1;

      await db.from("journal_post_place_context").upsert({
        journal_post_id: postId,
        generation_status: "processing",
        draft_payload: draftPayload,
        last_error: null,
        updated_at: new Date().toISOString(),
      }, { onConflict: "journal_post_id" });

      if (finishReason) {
        // keep lint happy
      }
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

      const completedLangs = Object.keys((draftPayload?.translations as Record<string, unknown>) ?? {}).length;
      return out({
        ok: true,
        complete: false,
        has_more: true,
        post_id: postId,
        batch_index: lastBatchIndex,
        total_batches: batches.length,
        translation_count: completedLangs,
        expected_translation_count: langs.length,
      });
    }

    if (!draftPayload) throw new Error("Place context draft payload missing after batching");
    normalizePlaceContextEnums(draftPayload);
    validatePlaceContext(draftPayload, langs, settings);
    await resolveAllPoiCoordinates(draftPayload, context as Record<string, unknown>, settings);
    validatePoiCoordinates(draftPayload);

    const saved = await db.rpc("save_journal_place_context_result", {
      p_post_id: postId,
      p_place_context: draftPayload,
      p_model: cfg.model,
    });
    if (saved.error) throw new Error(`Could not save place context: ${saved.error.message}`);

    await db.from("journal_post_place_context").update({
      draft_payload: null,
      last_error: null,
      updated_at: new Date().toISOString(),
    }).eq("journal_post_id", postId);

    if (runId) {
      await db.rpc("finish_ai_edge_function_run", {
        p_run_id: runId,
        p_status: "completed",
        p_input_tokens: totalInputTokens || null,
        p_output_tokens: totalOutputTokens || null,
        p_response_status: 200,
        p_metadata: { poi_count: 5, language_count: langs.length, batched: true },
      });
    }

    return out({
      ok: true,
      complete: true,
      has_more: false,
      ...(saved.data as Record<string, unknown>),
      languages: langs,
      model: cfg.model,
      config_version: cfg.config_version,
      prompt_version: cfg.prompt_version,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === "Unauthorized" || message === "Unauthorized worker" || message === "Admin access required") {
      return out({ error: message }, message === "Admin access required" ? 403 : 401);
    }

    if (postId) {
      const failedAt = new Date().toISOString();
      const { data: existing } = await db
        .from("journal_post_place_context")
        .select("draft_payload")
        .eq("journal_post_id", postId)
        .maybeSingle();
      const hasDraft = Boolean(existing?.draft_payload);
      await db.from("journal_post_place_context").upsert(
        {
          journal_post_id: postId,
          generation_status: hasDraft ? "processing" : "failed",
          last_error: message.slice(0, 4000),
          updated_at: failedAt,
        },
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
