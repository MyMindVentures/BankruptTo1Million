import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";
import QRCode from "qrcode";

const allowedEntityTypes = new Set(["journal_post", "founder_post", "proof_of_mind", "offer", "website_page"]);
const allowedHosts = new Set(["bankruptto1million.com", "www.bankruptto1million.com", "bankruptto1million.up.railway.app", "localhost", "127.0.0.1"]);
const allowedOrigins = new Set(["https://bankruptto1million.com", "https://www.bankruptto1million.com", "https://bankruptto1million.up.railway.app", "http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:4173", "http://127.0.0.1:4173"]);

function isAllowedOrigin(origin: string): boolean {
  if (allowedOrigins.has(origin)) return true;
  try {
    const url = new URL(origin);
    return (url.hostname === "localhost" || url.hostname === "127.0.0.1") && url.protocol === "http:";
  } catch {
    return false;
  }
}

function corsHeaders(request: Request) {
  const origin = request.headers.get("origin") || "";
  return {
    "Access-Control-Allow-Origin": isAllowedOrigin(origin) ? origin : "https://www.bankruptto1million.com",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function json(request: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders(request), "Content-Type": "application/json" } });
}

function normalizeUrl(value: unknown): URL {
  if (typeof value !== "string" || !value.trim()) throw new Error("canonicalUrl is required.");
  const url = new URL(value.trim());
  if (!allowedHosts.has(url.hostname)) throw new Error("This URL does not belong to Bankrupt to 1 Million.");
  if (!["https:", "http:"].includes(url.protocol)) throw new Error("Unsupported URL protocol.");
  if (url.protocol === "http:" && !["localhost", "127.0.0.1"].includes(url.hostname)) throw new Error("Only HTTPS public URLs are supported.");
  url.hash = "";
  return url;
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function decodeDataUrl(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(",")[1];
  if (!base64) throw new Error("QR generator returned invalid image data.");
  const binary = atob(base64);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(request) });
  if (request.method !== "POST") return json(request, { error: "Method not allowed." }, 405);

  try {
    const payload = await request.json();
    const entityType = typeof payload.entityType === "string" ? payload.entityType : "";
    const entityId = payload.entityId;
    const canonicalUrl = normalizeUrl(payload.canonicalUrl);

    if (!allowedEntityTypes.has(entityType)) return json(request, { error: "Unsupported entity type." }, 400);
    if (!isUuid(entityId)) return json(request, { error: "A valid entityId is required." }, 400);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) throw new Error("Supabase environment is not configured.");

    const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
    const now = Date.now();
    const linkColumns: Record<string, string> = {
      journal_post: "journal_post_id",
      founder_post: "founder_post_id",
      proof_of_mind: "proof_of_mind_concept_id",
      offer: "offer_id",
      website_page: "website_page_id",
    };

    if (entityType === "journal_post") {
      const { data, error } = await supabase.from("journal_posts").select("id,slug,status,published_at").eq("id", entityId).maybeSingle();
      if (error) throw error;
      if (!data || data.status !== "published" || !data.published_at || new Date(data.published_at).getTime() > now) return json(request, { error: "Journal post is not publicly available." }, 404);
      if (canonicalUrl.pathname !== `/journal/${encodeURIComponent(data.slug)}`) return json(request, { error: "URL does not match this journal post." }, 400);
    } else if (entityType === "founder_post") {
      const { data, error } = await supabase.from("founder_posts").select("id,journal_post_id,journal_posts!inner(status,published_at)").eq("id", entityId).maybeSingle();
      if (error) throw error;
      const journal = Array.isArray(data?.journal_posts) ? data?.journal_posts[0] : data?.journal_posts;
      if (!data || journal?.status !== "published" || !journal?.published_at || new Date(journal.published_at).getTime() > now) return json(request, { error: "Founder post is not publicly available." }, 404);
    } else if (entityType === "proof_of_mind") {
      const { data, error } = await supabase.from("proof_of_mind_concepts").select("id,visibility,published_at").eq("id", entityId).maybeSingle();
      if (error) throw error;
      if (!data || data.visibility === "hidden" || (data.published_at && new Date(data.published_at).getTime() > now)) return json(request, { error: "Proof of Mind concept is not publicly available." }, 404);
    } else if (entityType === "offer") {
      const { data, error } = await supabase.from("offers").select("id,status,is_public").eq("id", entityId).maybeSingle();
      if (error) throw error;
      if (!data || !data.is_public || data.status !== "active") return json(request, { error: "Offer is not publicly available." }, 404);
    } else if (entityType === "website_page") {
      const { data, error } = await supabase.from("website_pages").select("id,route_path,status,is_public").eq("id", entityId).maybeSingle();
      if (error) throw error;
      if (!data || !data.is_public || data.status !== "published") return json(request, { error: "Website page is not publicly available." }, 404);
      if (canonicalUrl.pathname.replace(/\/$/, "") !== data.route_path.replace(/\/$/, "")) return json(request, { error: "URL does not match this website page." }, 400);
    }

    const normalizedUrl = canonicalUrl.toString();
    const { data: existing, error: existingError } = await supabase
      .from("content_qr_codes")
      .select("canonical_url,qr_code_url,storage_path,generated_at")
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .eq("canonical_url", normalizedUrl)
      .maybeSingle();
    if (existingError) throw existingError;

    if (existing?.qr_code_url) {
      return json(request, { qrCodeUrl: existing.qr_code_url, canonicalUrl: existing.canonical_url, generatedAt: existing.generated_at, reused: true });
    }

    const dataUrl = await QRCode.toDataURL(normalizedUrl, {
      type: "image/png",
      width: 1024,
      margin: 4,
      errorCorrectionLevel: "H",
      color: { dark: "#111111", light: "#ffffff" },
    });

    const urlHash = (await sha256(normalizedUrl)).slice(0, 24);
    const storagePath = `${entityType}/${entityId}/${urlHash}.png`;
    const { error: uploadError } = await supabase.storage.from("content-qr-codes").upload(storagePath, decodeDataUrl(dataUrl), {
      upsert: false,
      contentType: "image/png",
      cacheControl: "31536000",
    });
    if (uploadError && !uploadError.message.toLowerCase().includes("already exists")) throw uploadError;

    const { data: publicUrlData } = supabase.storage.from("content-qr-codes").getPublicUrl(storagePath);
    const timestamp = new Date().toISOString();
    const record: Record<string, unknown> = {
      entity_type: entityType,
      entity_id: entityId,
      canonical_url: normalizedUrl,
      storage_bucket: "content-qr-codes",
      storage_path: storagePath,
      qr_code_url: publicUrlData.publicUrl,
      format: "png",
      size_pixels: 1024,
      generated_at: timestamp,
      updated_at: timestamp,
      journal_post_id: null,
      founder_post_id: null,
      proof_of_mind_concept_id: null,
      offer_id: null,
      website_page_id: null,
    };
    record[linkColumns[entityType]] = entityId;

    const { data: saved, error: saveError } = await supabase
      .from("content_qr_codes")
      .upsert(record, { onConflict: "entity_type,entity_id,canonical_url" })
      .select("canonical_url,qr_code_url,generated_at")
      .single();
    if (saveError) throw saveError;

    return json(request, { qrCodeUrl: saved.qr_code_url, canonicalUrl: saved.canonical_url, generatedAt: saved.generated_at, reused: false });
  } catch (error) {
    console.error("generate-content-qr failed", error);
    return json(request, { error: error instanceof Error ? error.message : "Unable to generate QR code." }, 500);
  }
});
