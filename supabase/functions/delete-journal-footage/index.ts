import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

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

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (request.method !== "POST") return out({ ok: false, error: "Method not allowed." }, 405);

  try {
    const { user } = await authenticate(request);
    const body = await request.json().catch(() => null) as {
      post_id?: unknown;
      asset_id?: unknown;
    } | null;

    const postId = body?.post_id;
    const assetId = body?.asset_id;

    if (!isUuid(postId)) return out({ ok: false, error: "A valid post_id is required." }, 400);
    if (!isUuid(assetId)) return out({ ok: false, error: "A valid asset_id is required." }, 400);

    const deleted = await user.rpc("admin_delete_journal_footage", {
      p_post_id: postId,
      p_asset_id: assetId,
    });
    if (deleted.error) throw new Error(deleted.error.message);

    const payload = deleted.data as {
      ok?: boolean;
      unlinked?: boolean;
      cover_cleared?: boolean;
      hard_delete?: boolean;
      storage_bucket?: string | null;
      storage_path?: string | null;
      provider?: string | null;
    } | null;

    if (!payload?.ok) {
      throw new Error("Footage delete prepare failed.");
    }

    if (!payload.hard_delete) {
      return out({
        ok: true,
        deleted: false,
        unlinked: true,
        cover_cleared: Boolean(payload.cover_cleared),
      });
    }

    const bucket = String(payload.storage_bucket || "");
    const path = String(payload.storage_path || "");
    const provider = String(payload.provider || "");

    if (provider === "supabase" && bucket && path) {
      const storage = createClient(U, S, { auth: { persistSession: false } }).storage;
      const removed = await storage.from(bucket).remove([path]);
      if (removed.error) throw new Error(removed.error.message);
    }

    const finalized = await user.rpc("admin_finalize_journal_footage_delete", {
      p_asset_id: assetId,
    });
    if (finalized.error) throw new Error(finalized.error.message);

    return out({
      ok: true,
      deleted: true,
      unlinked: true,
      cover_cleared: Boolean(payload.cover_cleared),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Footage delete failed.";
    return out(
      { ok: false, error: message },
      message === "Unauthorized" || message === "Admin access required" ? 401 : 400,
    );
  }
});
