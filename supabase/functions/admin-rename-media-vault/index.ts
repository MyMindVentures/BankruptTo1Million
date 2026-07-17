import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.1";

/**
 * One-shot Media Vault rename helper (Storage API move + media_assets update).
 * Prefer scripts/rename-media-vault-by-group.mjs when SUPABASE_SERVICE_ROLE_KEY is available.
 * Requires body.confirm = rename-media-vault-one-shot-20260717
 */

const CONFIRM = "rename-media-vault-one-shot-20260717";
const U = Deno.env.get("SUPABASE_URL")!;
const S = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const out = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

function slugify(input: string | null | undefined): string | null {
  const raw = String(input ?? "").trim().toLowerCase();
  if (!raw) return null;
  const clipped = raw
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/^-+|-+$/g, "");
  return clipped || null;
}

function basename(path: string) {
  return path.split("/").pop() || "";
}

function dirname(path: string) {
  const parts = path.split("/");
  return parts.length <= 1 ? "" : parts.slice(0, -1).join("/");
}

function extOf(path: string, fallback = "bin") {
  const base = basename(path);
  const i = base.lastIndexOf(".");
  return i > 0 ? base.slice(i + 1).toLowerCase() : fallback;
}

function journalPostIdFromPath(storagePath: string) {
  const m = storagePath.match(
    /^journal\/\d{4}\/\d{2}\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\//i,
  );
  return m?.[1] ?? null;
}

function journalNameBase(title: string | null, slug: string | null) {
  const t = (title || "").trim();
  if (!t || /^journal event /i.test(t)) return slug || "journal-unlinked";
  return slugify(t) || slug || "journal-unlinked";
}

function categoryBase(storagePath: string) {
  if (storagePath.startsWith("founders/")) return "founders";
  if (storagePath.startsWith("journey-events/")) return "journey-events";
  return slugify(storagePath.split("/")[0] || "other") || "other";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return out({ error: "Method not allowed" }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    if (body.confirm !== CONFIRM) {
      return out({ error: "Missing or invalid confirm token" }, 403);
    }

    const mode = body.mode === "apply" ? "apply" : "dry-run";
    const admin = createClient(U, S, { auth: { persistSession: false } });

    const { data: assets, error: assetsErr } = await admin
      .from("media_assets")
      .select("id,asset_type,original_filename,title,storage_bucket,storage_path,file_extension,metadata,created_at")
      .in("asset_type", ["image", "video"])
      .order("created_at", { ascending: true });
    if (assetsErr) throw assetsErr;

    const { data: links } = await admin
      .from("journal_post_media")
      .select("media_asset_id,journal_post_id,display_order,created_at");

    const postIds = [...new Set([
      ...(links || []).map((l) => l.journal_post_id),
      ...(assets || []).map((a) => journalPostIdFromPath(a.storage_path || "")).filter(Boolean),
    ])] as string[];

    const { data: posts } = postIds.length
      ? await admin.from("journal_posts").select("id,title,slug").in("id", postIds)
      : { data: [] as Array<{ id: string; title: string; slug: string }> };

    const postById = new Map((posts || []).map((p) => [p.id, p]));
    const linkByAsset = new Map((links || []).map((l) => [l.media_asset_id, l]));

    type Row = {
      id: string;
      storage_bucket: string;
      storage_path: string;
      original_filename: string | null;
      file_extension: string | null;
      metadata: Record<string, unknown>;
      groupKey: string;
      nameBase: string;
      sortOrder: number;
      sortCreated: string;
    };

    const enriched: Row[] = (assets || []).map((a) => {
      const link = linkByAsset.get(a.id);
      const pathPostId = journalPostIdFromPath(a.storage_path || "");
      const postId = (link?.journal_post_id || pathPostId) as string | null;
      const post = postId ? postById.get(postId) : null;
      let groupKey: string;
      let nameBase: string;
      if ((a.storage_path || "").startsWith("journal/") && postId) {
        groupKey = `post:${postId}`;
        nameBase = journalNameBase(post?.title || null, post?.slug || null);
      } else if ((a.storage_path || "").startsWith("founders/")) {
        groupKey = "cat:founders";
        nameBase = "founders";
      } else if ((a.storage_path || "").startsWith("journey-events/")) {
        groupKey = "cat:journey-events";
        nameBase = "journey-events";
      } else {
        nameBase = categoryBase(a.storage_path || "other");
        groupKey = `cat:${nameBase}`;
      }
      return {
        id: a.id,
        storage_bucket: a.storage_bucket,
        storage_path: a.storage_path,
        original_filename: a.original_filename,
        file_extension: a.file_extension,
        metadata: (a.metadata || {}) as Record<string, unknown>,
        groupKey,
        nameBase,
        sortOrder: link?.display_order ?? Number.MAX_SAFE_INTEGER,
        sortCreated: String(link?.created_at || a.created_at),
      };
    });

    const groups = new Map<string, Row[]>();
    for (const row of enriched) {
      if (!groups.has(row.groupKey)) groups.set(row.groupKey, []);
      groups.get(row.groupKey)!.push(row);
    }

    const plan: Array<{
      id: string;
      bucket: string;
      fromPath: string;
      toPath: string;
      toFilename: string;
      skip: boolean;
      metadata: Record<string, unknown>;
      fromFilename: string;
      original_filename: string | null;
    }> = [];

    for (const [, members] of groups) {
      members.sort((a, b) =>
        a.sortOrder - b.sortOrder ||
        a.sortCreated.localeCompare(b.sortCreated) ||
        a.id.localeCompare(b.id)
      );
      members.forEach((row, index) => {
        const n = index + 1;
        const ext = (row.file_extension || extOf(row.storage_path)).replace(/^\./, "");
        const toFilename = `${row.nameBase}-${n}.${ext}`;
        const dir = dirname(row.storage_path);
        const toPath = dir ? `${dir}/${toFilename}` : toFilename;
        const fromFilename = basename(row.storage_path);
        plan.push({
          id: row.id,
          bucket: row.storage_bucket,
          fromPath: row.storage_path,
          toPath,
          toFilename,
          skip: fromFilename === toFilename,
          metadata: row.metadata || {},
          fromFilename,
          original_filename: row.original_filename,
        });
      });
    }

    const pending = plan.filter((p) => !p.skip);
    if (mode !== "apply") {
      return out({
        mode,
        total: plan.length,
        rename: pending.length,
        skip: plan.length - pending.length,
        plan: plan.map((p) => ({ id: p.id, from: p.fromPath, to: p.toPath, skip: p.skip })),
      });
    }

    const log: string[] = [];
    const failures: Array<{ id: string; stage: string; error: string }> = [];
    const temps: Array<(typeof pending)[number] & { tempPath: string }> = [];

    for (const row of pending) {
      const tempPath = `${dirname(row.fromPath)}/.__rename_${row.id.replace(/-/g, "")}.${extOf(row.toFilename)}`;
      const { error } = await admin.storage.from(row.bucket).move(row.fromPath, tempPath);
      if (error) {
        failures.push({ id: row.id, stage: "phase1", error: error.message });
        break;
      }
      const { error: dbErr } = await admin.from("media_assets").update({ storage_path: tempPath }).eq("id", row.id);
      if (dbErr) {
        failures.push({ id: row.id, stage: "phase1-db", error: dbErr.message });
        break;
      }
      temps.push({ ...row, tempPath });
      log.push(`temp ${row.fromPath} -> ${tempPath}`);
    }

    if (failures.length) {
      return out({ ok: false, stage: "phase1", failures, log, renamed: 0 }, 500);
    }

    for (const row of temps) {
      const { error } = await admin.storage.from(row.bucket).move(row.tempPath, row.toPath);
      if (error) {
        failures.push({ id: row.id, stage: "phase2", error: error.message });
        continue;
      }
      const metadata = { ...row.metadata };
      if (!metadata.original_client_filename && row.fromFilename !== row.toFilename) {
        metadata.original_client_filename = row.original_filename || row.fromFilename;
      }
      if (typeof metadata.public_url === "string" && metadata.public_url.includes("/storage/v1/object/public/")) {
        metadata.public_url = `${U}/storage/v1/object/public/${row.bucket}/${row.toPath}`;
      }
      const { error: dbErr } = await admin.from("media_assets").update({
        storage_path: row.toPath,
        original_filename: row.toFilename,
        title: row.toFilename,
        metadata,
      }).eq("id", row.id);
      if (dbErr) {
        failures.push({ id: row.id, stage: "phase2-db", error: dbErr.message });
        continue;
      }
      log.push(`final ${row.tempPath} -> ${row.toPath}`);
    }

    return out({
      ok: failures.length === 0,
      mode,
      renamed: temps.length - failures.length,
      skip: plan.length - pending.length,
      failures,
      log,
    }, failures.length ? 500 : 200);
  } catch (error) {
    return out({ error: String(error) }, 500);
  }
});
