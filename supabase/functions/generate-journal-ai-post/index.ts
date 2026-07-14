import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const OPENROUTER_KEY = Deno.env.get("OPENROUTER_API_KEY") ?? Deno.env.get("OPENAI_API_KEY");
const MODEL = Deno.env.get("JOURNAL_AI_MODEL") ?? "google/gemini-2.5-flash";
const LANGUAGES = ["en", "nl", "fr", "de", "es", "pt", "it", "pl", "cs", "tr", "ar", "hi", "zh", "ja", "ko"];
const MIN_BODY_CHARACTERS = 1800;
const MAX_BODY_CHARACTERS = 4500;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

function parseJsonObject(text: string) {
  const cleaned = text.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("AI returned invalid JSON.");
  return JSON.parse(cleaned.slice(start, end + 1));
}

function normalizeBody(input: string, language: string) {
  const body = String(input ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (body.length < MIN_BODY_CHARACTERS) {
    throw new Error(`Body for ${language} is too short: ${body.length} characters.`);
  }

  if (body.length > MAX_BODY_CHARACTERS) {
    throw new Error(`Body for ${language} is too long: ${body.length} characters.`);
  }

  if (!/^### /m.test(body)) {
    throw new Error(`Body for ${language} is missing Markdown section headings.`);
  }

  return body;
}

async function markFailed(postId: string, message: string) {
  await Promise.all([
    db
      .from("journal_ai_sources")
      .update({
        generation_status: "failed",
        last_error: message,
        updated_at: new Date().toISOString(),
      })
      .eq("journal_post_id", postId),
    db
      .from("journal_posts")
      .update({
        ai_generation_status: "failed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", postId),
  ]);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: CORS });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  let postId = "";

  try {
    if (!OPENROUTER_KEY) throw new Error("Missing OpenRouter API key.");

    const authorization = req.headers.get("Authorization");
    if (!authorization) return json({ error: "Unauthorized" }, 401);

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false },
    });

    const { data: access, error: accessError } = await userClient.rpc("get_my_admin_access");
    if (accessError) throw new Error(`Admin verification failed: ${accessError.message}`);
    if (!access?.[0]?.is_active) return json({ error: "Admin access required" }, 403);

    const payload = await req.json().catch(() => ({}));
    postId = String(payload?.post_id ?? "");
    if (!postId) return json({ error: "post_id required" }, 400);

    const { data: source, error: sourceError } = await db
      .from("journal_ai_sources")
      .select("raw_description,metadata")
      .eq("journal_post_id", postId)
      .single();

    if (sourceError || !source) {
      throw new Error(sourceError?.message || "AI source not found.");
    }

    const { data: event, error: eventError } = await db
      .from("journal_journey_entries")
      .select("id,entry_type,occurred_at,timezone,journey_person,location_name,address_text,latitude,longitude,plus_code,featured_business_name")
      .eq("journal_post_id", postId)
      .maybeSingle();

    if (eventError) {
      throw new Error(`Event context could not be loaded: ${eventError.message}`);
    }

    const { data: subjects, error: subjectsError } = await db
      .from("content_person_relations")
      .select("relationship_role,display_order,founder_profiles(display_name)")
      .eq("journal_post_id", postId)
      .in("relationship_role", ["primary_subject", "co_subject"])
      .order("display_order");

    if (subjectsError) {
      throw new Error(`Founders could not be loaded: ${subjectsError.message}`);
    }

    let people: unknown[] = [];
    if (event?.id) {
      const { data, error } = await db
        .from("journal_journey_people")
        .select("display_order,journey_people(display_name,person_type)")
        .eq("journey_entry_id", event.id)
        .order("display_order");

      if (error) throw new Error(`People could not be loaded: ${error.message}`);
      people = data ?? [];
    }

    const { data: media, error: mediaError } = await db
      .from("journal_post_media")
      .select("placement,display_order,is_featured,media_assets(asset_type,title,mime_type,metadata)")
      .eq("journal_post_id", postId)
      .order("display_order");

    if (mediaError) {
      throw new Error(`Media metadata could not be loaded: ${mediaError.message}`);
    }

    const now = new Date().toISOString();

    const { error: processingError } = await db
      .from("journal_posts")
      .update({ ai_generation_status: "processing", updated_at: now })
      .eq("id", postId);

    if (processingError) {
      throw new Error(`Could not mark generation as processing: ${processingError.message}`);
    }

    await db
      .from("journal_ai_sources")
      .update({ generation_status: "processing", last_error: null, updated_at: now })
      .eq("journal_post_id", postId);

    const metadata = { ...source.metadata, event, subjects, people, media };
    const businessInstruction = event?.featured_business_name
      ? `Mention ${event.featured_business_name} naturally and positively, without inventing claims.`
      : "Do not invent a business name.";

    const prompt = `Write a factual, warm Bankrupt to 1 Million journal post from the private notes and metadata. Never invent facts, names, quotes or outcomes. ${businessInstruction}

Return JSON only with a translations object for these language codes: ${LANGUAGES.join(", ")}.

Every language must contain:
- title
- subtitle
- excerpt
- body
- seo_title
- seo_description

Body requirements for every language:
- approximately 2500 to 3500 characters
- never fewer than ${MIN_BODY_CHARACTERS} characters
- never more than ${MAX_BODY_CHARACTERS} characters
- a complete article with a natural opening, development and conclusion
- 3 to 5 Markdown headings beginning with ###
- short readable paragraphs
- selected **bold text**
- no bullet lists
- never cut off a heading, word, sentence or conclusion

Other limits:
- excerpt: maximum 220 characters
- SEO title: maximum 60 characters
- SEO description: maximum 155 characters

Private notes: ${source.raw_description}
Metadata: ${JSON.stringify(metadata)}`;

    const aiResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://www.bankruptto1million.com",
        "X-Title": "Bankrupt to 1 Million Journal AI",
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.35,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "Return exactly one valid JSON object and no commentary." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      throw new Error(`OpenRouter ${aiResponse.status}: ${(await aiResponse.text()).slice(0, 800)}`);
    }

    const aiPayload = await aiResponse.json();
    const translations = parseJsonObject(
      aiPayload?.choices?.[0]?.message?.content ?? "",
    ).translations;

    for (const language of LANGUAGES) {
      if (!translations?.[language]?.title || !translations?.[language]?.body) {
        throw new Error(`AI response is missing ${language}.`);
      }

      translations[language].body = normalizeBody(
        translations[language].body,
        language,
      );
    }

    const publishedAt = new Date().toISOString();
    const rows = LANGUAGES.map((language) => ({
      journal_post_id: postId,
      language_code: language,
      title: String(translations[language].title).trim(),
      subtitle: translations[language].subtitle || null,
      excerpt: translations[language].excerpt || null,
      body: translations[language].body,
      seo_title: translations[language].seo_title || null,
      seo_description: translations[language].seo_description || null,
      translation_status: "published",
      translation_source: "ai",
      translated_at: publishedAt,
      published_at: publishedAt,
      updated_at: publishedAt,
    }));

    const { error: translationError } = await db
      .from("journal_translations")
      .upsert(rows, { onConflict: "journal_post_id,language_code" });

    if (translationError) {
      throw new Error(`Translations could not be stored: ${translationError.message}`);
    }

    const { count, error: countError } = await db
      .from("journal_translations")
      .select("id", { count: "exact", head: true })
      .eq("journal_post_id", postId)
      .eq("translation_status", "published")
      .gte("body", "");

    if (countError) {
      throw new Error(`Translation verification failed: ${countError.message}`);
    }

    if (count !== 15) {
      throw new Error(`Translation verification failed: expected 15, found ${count ?? 0}.`);
    }

    const english = translations.en;

    const { error: postError } = await db
      .from("journal_posts")
      .update({
        title: english.title,
        subtitle: english.subtitle || null,
        excerpt: english.excerpt || null,
        body: english.body,
        seo_title: english.seo_title || null,
        seo_description: english.seo_description || null,
        status: "published",
        published_at: publishedAt,
        original_language: "en",
        content_format: "markdown",
        ai_generation_status: "completed",
        ai_generated_at: publishedAt,
        ai_model: MODEL,
        updated_at: publishedAt,
      })
      .eq("id", postId);

    if (postError) {
      throw new Error(`Journal post could not be published: ${postError.message}`);
    }

    if (event?.id) {
      const { error } = await db
        .from("journal_journey_entries")
        .update({
          what_happened: english.excerpt || english.body.slice(0, 220),
          updated_at: publishedAt,
        })
        .eq("id", event.id);

      if (error) {
        throw new Error(`Journey entry could not be finalized: ${error.message}`);
      }
    }

    const { error: sourceCompleteError } = await db
      .from("journal_ai_sources")
      .update({
        generation_status: "completed",
        generated_at: publishedAt,
        last_error: null,
        updated_at: publishedAt,
      })
      .eq("journal_post_id", postId);

    if (sourceCompleteError) {
      throw new Error(`AI source could not be finalized: ${sourceCompleteError.message}`);
    }

    return json({
      ok: true,
      post_id: postId,
      languages: LANGUAGES,
      translation_count: 15,
      target_body_characters: "2500-3500",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (postId) await markFailed(postId, message);
    console.error("generate-journal-ai-post failed", { postId, message });
    return json({ error: message }, 500);
  }
});
