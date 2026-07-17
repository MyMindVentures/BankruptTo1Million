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

const BATCH_LIMIT = 40;

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
    await authenticate(request);
    const service = createClient(U, S, { auth: { persistSession: false } });

    const body = await request.json().catch(() => ({})) as { limit?: unknown };
    const limit = Math.min(
      Math.max(Number(body.limit) || BATCH_LIMIT, 1),
      100,
    );

    const { data: rows, error: listError } = await service
      .from("media_assets")
      .select("id, mime_type, storage_bucket, storage_path, metadata")
      .is("captured_at", null)
      .not("storage_bucket", "is", null)
      .not("storage_path", "is", null)
      .in("asset_type", ["image", "video"])
      .order("created_at", { ascending: true })
      .limit(limit);

    if (listError) throw new Error(listError.message);

    let updated = 0;
    let skipped = 0;
    let failed = 0;
    const failures: Array<{ asset_id: string; error: string }> = [];

    for (const row of rows ?? []) {
      const assetId = String(row.id);
      const bucket = String(row.storage_bucket || "");
      const path = String(row.storage_path || "");
      const mimeType = String(row.mime_type || "application/octet-stream");

      if (!bucket || !path) {
        skipped += 1;
        continue;
      }

      try {
        const download = await service.storage.from(bucket).download(path);
        if (download.error || !download.data) {
          failed += 1;
          failures.push({ asset_id: assetId, error: download.error?.message || "Download failed" });
          continue;
        }

        const bytes = new Uint8Array(await download.data.arrayBuffer());
        const capturedAt = await extractCapturedAtIso(bytes, mimeType);
        if (!capturedAt) {
          skipped += 1;
          continue;
        }

        const existingMeta = row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
          ? row.metadata as Record<string, unknown>
          : {};

        const { error: updateError } = await service
          .from("media_assets")
          .update({
            captured_at: capturedAt,
            metadata: { ...existingMeta, captured_at: capturedAt },
            updated_at: new Date().toISOString(),
          })
          .eq("id", assetId)
          .is("captured_at", null);

        if (updateError) {
          failed += 1;
          failures.push({ asset_id: assetId, error: updateError.message });
          continue;
        }

        updated += 1;
      } catch (error) {
        failed += 1;
        failures.push({
          asset_id: assetId,
          error: error instanceof Error ? error.message : "Backfill failed",
        });
      }
    }

    return out({
      ok: true,
      scanned: rows?.length ?? 0,
      updated,
      skipped,
      failed,
      failures: failures.slice(0, 20),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Backfill failed.";
    return out(
      { ok: false, error: message },
      message === "Unauthorized" || message === "Admin access required" ? 401 : 400,
    );
  }
});
