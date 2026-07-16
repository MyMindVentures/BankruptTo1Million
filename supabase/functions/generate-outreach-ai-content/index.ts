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

function validateCopy(copy: PageCopy, language: string) {
  const fields: Array<keyof PageCopy> = [
    "personal_intro", "why_them", "what_we_offer", "what_we_ask", "win_win", "personal_message", "mission_blurb",
  ];
  for (const field of fields) {
    const value = String(copy[field] ?? "").trim();
    if (!value) throw new Error(`Missing ${field} in ${language} outreach copy`);
    if (value.length > 4000) throw new Error(`${field} is too long`);
  }
}

function buildPrompt(context: Record<string, unknown>, language: string) {
  return `You are writing a private, personalized outreach page for Bankrupt to 1 Million — a living documentary and community platform about rebuilding honestly.

Write ALL copy in language code "${language}".

Return exactly one JSON object with these string fields:
- personal_intro (warm greeting, 2-4 sentences)
- why_them (why this company/person is a fit, 3-5 sentences)
- what_we_offer (what Bankrupt to 1 Million can offer them, 3-5 sentences)
- what_we_ask (a clear, respectful ask, 2-4 sentences)
- win_win (mutual benefit framing, 2-4 sentences)
- personal_message (short closing note for the page, 2-3 sentences)
- mission_blurb (1-2 sentences about the mission, honest and non-salesy)

Tone: personal, credible, founder-to-founder. No hype. No markdown. Plain text only.

Verified context:
${JSON.stringify(context)}`;
}

async function generateCopy(context: Record<string, unknown>, language: string): Promise<PageCopy> {
  if (!K) throw new Error("Missing AI provider key");

  const ai = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${K}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://bankruptto1million.com",
      "X-Title": "Bankrupt to 1 Million Outreach AI",
    },
    body: JSON.stringify({
      model: "openai/gpt-4o-mini",
      temperature: 0.7,
      max_tokens: 4096,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "You generate concise, personalized outreach page copy as valid JSON only.",
        },
        { role: "user", content: buildPrompt(context, language) },
      ],
    }),
  });

  if (!ai.ok) throw new Error(`AI provider ${ai.status}: ${(await ai.text()).slice(0, 900)}`);

  const payload = await ai.json();
  const finishReason = payload?.choices?.[0]?.finish_reason ?? null;
  if (finishReason && finishReason !== "stop") {
    throw new Error(`AI response incomplete: finish_reason=${finishReason}`);
  }

  const parsed = parse(payload?.choices?.[0]?.message?.content ?? "") as PageCopy;
  validateCopy(parsed, language);
  return parsed;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return out({ error: "Method not allowed" }, 405);

  let campaignId = "";

  try {
    await authenticate(req);
    campaignId = String((await req.json().catch(() => ({})))?.campaign_id ?? "");
    if (!campaignId) return out({ error: "campaign_id required" }, 400);

    const contextResult = await db.rpc("get_outreach_ai_generation_context", { p_campaign_id: campaignId });
    if (contextResult.error || !contextResult.data) {
      throw new Error(contextResult.error?.message || "Outreach AI context unavailable");
    }

    const context = contextResult.data as Record<string, unknown>;
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

    const copy = await generateCopy(context, language);

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

    return out({ ok: true, campaign_id: campaignId, language_code: language, page: copy });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (campaignId) {
      const now = new Date().toISOString();
      await db.from("outreach_campaigns").update({
        ai_generation_status: "failed",
        ai_generation_error: message,
        updated_at: now,
      }).eq("id", campaignId);
      await db.from("outreach_ai_sources").update({
        generation_status: "failed",
        last_error: message,
        updated_at: now,
      }).eq("campaign_id", campaignId);
    }
    return out({ ok: false, error: message }, 500);
  }
});
