import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const url = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
const providerKey = Deno.env.get("OPENROUTER_API_KEY") ?? Deno.env.get("OPENAI_API_KEY");
const db = createClient(url, serviceKey, { auth: { persistSession: false } });
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const respond = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...cors, "Content-Type": "application/json" },
});

const WRITABLE_FIELDS = [
  "tagline", "short_description", "full_description", "innovation_summary", "problem_statement",
  "problems_solved", "solution_overview", "vision_statement", "target_audience", "target_users",
  "key_features", "key_use_cases", "differentiation_points", "market_opportunity", "business_model",
  "business_model_summary", "validation_summary", "validation_evidence", "roadmap_summary",
  "collaboration_opportunities", "category", "tags", "seo_title", "seo_description",
] as const;
type OverwriteMode = "empty_only" | "ai_only" | "all";

function parseObject(raw: string): Record<string, unknown> {
  const cleaned = raw.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("AI response did not contain a JSON object");
  const value = JSON.parse(cleaned.slice(start, end + 1));
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("AI response must be a JSON object");
  return value;
}

async function authenticate(req: Request) {
  const authorization = req.headers.get("Authorization");
  if (!authorization) throw new Error("Unauthorized");
  const user = createClient(url, anonKey, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false } });
  const access = await user.rpc("get_my_admin_access");
  if (access.error || !access.data?.[0]?.is_active) throw new Error("Active administrator access is required");
}

async function setState(conceptId: string, versionId: string, status: "running" | "completed" | "failed", error: string | null = null) {
  const timestamp = status === "completed" ? new Date().toISOString() : null;
  const concept = await db.from("proof_of_mind_concepts").update({
    ai_orchestration_status: status,
    ai_orchestration_error: error,
    ai_orchestrated_at: timestamp,
    updated_at: new Date().toISOString(),
  }).eq("id", conceptId).eq("active_source_version_id", versionId);
  if (concept.error) throw new Error(`Could not update concept AI state: ${concept.error.message}`);
  const version = await db.from("proof_of_mind_concept_versions").update({
    ai_orchestration_status: status,
    ai_orchestration_error: error,
    ai_orchestrated_at: timestamp,
  }).eq("id", versionId).eq("concept_id", conceptId);
  if (version.error) throw new Error(`Could not update version AI state: ${version.error.message}`);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return respond({ error: "Method not allowed" }, 405);
  let conceptId = "";
  let versionId = "";
  try {
    await authenticate(req);
    if (!providerKey) throw new Error("AI provider key is not configured");
    const body = await req.json().catch(() => ({}));
    conceptId = String(body.concept_id ?? "");
    const overwriteMode = String(body.overwrite_mode ?? "ai_only") as OverwriteMode;
    if (!conceptId) return respond({ error: "concept_id required" }, 400);
    if (!["empty_only", "ai_only", "all"].includes(overwriteMode)) return respond({ error: "Invalid overwrite_mode" }, 400);

    const loaded = await db.from("proof_of_mind_concepts").select("*").eq("id", conceptId).maybeSingle();
    if (loaded.error || !loaded.data) throw new Error(loaded.error?.message ?? "Concept not found");
    versionId = String(loaded.data.active_source_version_id ?? "");
    const sourceText = String(loaded.data.source_text ?? "").trim();
    if (!versionId || !sourceText) throw new Error("Concept has no active source version");
    await setState(conceptId, versionId, "running");

    const ai = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${providerKey}`, "Content-Type": "application/json", "HTTP-Referer": "https://bankruptto1million.com", "X-Title": "Proof of Mind enrichment" },
      body: JSON.stringify({
        model: Deno.env.get("PROOF_OF_MIND_MODEL") ?? "google/gemini-2.5-flash",
        temperature: 0.25,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: `Extract a faithful structured concept record. Return JSON only. Allowed keys: ${WRITABLE_FIELDS.join(", ")}. Never invent evidence, validation, numbers, partners, or claims; use null or [] when the source does not support a field.` },
          { role: "user", content: `Source language: ${loaded.data.original_language ?? "en"}\nTitle: ${loaded.data.title}\n\nCanonical source text:\n${sourceText}` },
        ],
      }),
    });
    if (!ai.ok) throw new Error(`AI provider ${ai.status}: ${(await ai.text()).slice(0, 600)}`);
    const payload = await ai.json();
    if (payload?.choices?.[0]?.finish_reason !== "stop") throw new Error(`Incomplete AI response: ${payload?.choices?.[0]?.finish_reason ?? "unknown"}`);
    const generated = parseObject(String(payload?.choices?.[0]?.message?.content ?? ""));
    const updates: Record<string, unknown> = {};
    for (const field of WRITABLE_FIELDS) {
      if (!(field in generated)) continue;
      const existing = loaded.data[field];
      const empty = existing == null || existing === "" || (Array.isArray(existing) && existing.length === 0);
      // ai_only currently behaves conservatively: source/admin values survive; prior empty AI fields are regenerated.
      if (overwriteMode === "all" || empty) updates[field] = generated[field];
    }
    const saved = await db.from("proof_of_mind_concepts").update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", conceptId).eq("active_source_version_id", versionId).select("id").maybeSingle();
    if (saved.error || !saved.data) throw new Error(saved.error?.message ?? "A newer source version replaced this AI run");
    await setState(conceptId, versionId, "completed");
    return respond({ ok: true, concept_id: conceptId, version_id: versionId, updated_fields: Object.keys(updates) });
  } catch (reason) {
    const message = reason instanceof Error ? reason.message : String(reason);
    if (conceptId && versionId) await setState(conceptId, versionId, "failed", message).catch(() => undefined);
    const status = /Unauthorized|administrator access/.test(message) ? 401 : 500;
    return respond({ error: message }, status);
  }
});
