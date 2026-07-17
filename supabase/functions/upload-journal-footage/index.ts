import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { extractCapturedAtIso } from "../_shared/mediaCapturedAt.ts";

const U = Deno.env.get("SUPABASE_URL")!;
const S = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const A = Deno.env.get("SUPABASE_ANON_KEY")!;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const out = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...cors, "Content-Type": "application/json" },
});

function isUuid(value: unknown): value is string {
  return typeof value === "string"
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function fileExtension(fileName: string, mimeType: string) {
  const fromName = fileName.includes(".") ? fileName.split(".").pop() : "";
  if (fromName) return fromName.toLowerCase();
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  if (mimeType === "video/mp4") return "mp4";
  if (mimeType === "video/quicktime") return "mov";
  if (mimeType === "video/webm") return "webm";
  return "bin";
}

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
  return { user };
}

function parseMetadata(form: FormData) {
  const raw = form.get("asset_metadata");
  if (typeof raw !== "string" || !raw.trim()) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    throw new Error("Invalid asset_metadata JSON.");
  }
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (request.method !== "POST") return out({ ok: false, error: "Method not allowed." }, 405);

  try {
    const { user } = await authenticate(request);
    const form = await request.formData();
    const postId = form.get("post_id");
    const file = form.get("file");

    if (!isUuid(postId)) return out({ ok: false, error: "A valid post_id is required." }, 400);
    if (!(file instanceof File)) return out({ ok: false, error: "A file upload is required." }, 400);

    const mimeType = file.type || "application/octet-stream";
    const extension = fileExtension(file.name, mimeType);
    const bytes = new Uint8Array(await file.arrayBuffer());
    const capturedAt = await extractCapturedAtIso(bytes, mimeType);

    const assetMetadata = {
      ...parseMetadata(form),
      original_client_filename: file.name,
      source: "journal_event_capture",
      ...(capturedAt ? { captured_at: capturedAt } : {}),
    };

    const resolved = await user.rpc("admin_resolve_journal_footage_upload", {
      post_id: postId,
      mime_type: mimeType,
      file_extension: extension,
      p_captured_at: capturedAt,
    });
    if (resolved.error) throw new Error(resolved.error.message);

    const payload = resolved.data as {
      bucket_name?: string;
      object_path?: string;
      storage_file_name?: string;
      display_index?: number;
      name_base?: string;
    };

    const bucketName = String(payload.bucket_name || "");
    const objectPath = String(payload.object_path || "");
    const storageFileName = String(payload.storage_file_name || "");
    const displayIndex = Number(payload.display_index ?? 0);

    if (!bucketName || !objectPath || !storageFileName) {
      throw new Error("Upload path could not be resolved.");
    }

    const storage = createClient(U, S, { auth: { persistSession: false } }).storage;
    const upload = await storage.from(bucketName).upload(objectPath, bytes, {
      contentType: mimeType,
      upsert: false,
    });
    if (upload.error) throw new Error(upload.error.message);

    const register = await user.rpc("admin_register_journal_footage", {
      post_id: postId,
      bucket_name: bucketName,
      object_path: objectPath,
      file_name: storageFileName,
      mime_type: mimeType,
      file_size: file.size,
      placement_name: displayIndex === 0 ? "hero" : "gallery",
      display_index: displayIndex,
      asset_metadata: assetMetadata,
      captured_at: capturedAt,
    });
    if (register.error) {
      await storage.from(bucketName).remove([objectPath]);
      throw new Error(register.error.message);
    }

    const asset = register.data as { id?: string };
    return out({
      ok: true,
      asset_id: asset?.id ?? null,
      object_path: objectPath,
      storage_file_name: storageFileName,
      display_index: displayIndex,
      name_base: payload.name_base ?? null,
      captured_at: capturedAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Footage upload failed.";
    return out({ ok: false, error: message }, message === "Unauthorized" || message === "Admin access required" ? 401 : 400);
  }
});
