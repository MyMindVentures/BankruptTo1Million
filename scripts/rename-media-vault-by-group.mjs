/**
 * One-shot Media Vault rename: {group-title-slug}-{n}.{ext}
 *
 * Renames Storage objects (via /storage/v1/object/move) and updates media_assets
 * storage_path / original_filename / title. Uses two-phase temps to avoid collisions.
 *
 * Dry-run (default):
 *   node scripts/rename-media-vault-by-group.mjs
 *
 * Apply:
 *   SUPABASE_SERVICE_ROLE_KEY=... node scripts/rename-media-vault-by-group.mjs --apply
 *
 * Env:
 *   SUPABASE_URL or VITE_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY (required for --apply; also for loading if RLS blocks anon)
 *   SUPABASE_ANON_KEY or VITE_SUPABASE_ANON_KEY (optional dry-run fallback)
 *
 * Note: do not rename storage.objects.name via SQL alone — that desyncs catalog from blobs.
 */

const APPLY = process.argv.includes('--apply');

const SUPABASE_URL = (
  process.env.SUPABASE_URL
  || process.env.VITE_SUPABASE_URL
  || 'https://zlwwncmbxohnezotomcx.supabase.co'
).replace(/\/$/, '');

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const API_KEY = SERVICE_KEY || ANON_KEY;

if (!API_KEY) {
  console.error('Set SUPABASE_SERVICE_ROLE_KEY (preferred) or SUPABASE_ANON_KEY / VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

if (APPLY && !SERVICE_KEY) {
  console.error('--apply requires SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

function headers(extra = {}) {
  return {
    apikey: API_KEY,
    Authorization: `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
    ...extra,
  };
}

/** Mirrors public.slugify_journal_footage_name */
function slugifyJournalFootageName(input) {
  const raw = String(input ?? '').trim().toLowerCase();
  if (!raw) return null;
  const collapsed = raw
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
  const clipped = collapsed.slice(0, 80).replace(/^-+|-+$/g, '');
  return clipped || null;
}

function basename(path) {
  const parts = String(path || '').split('/');
  return parts[parts.length - 1] || '';
}

function dirname(path) {
  const parts = String(path || '').split('/');
  if (parts.length <= 1) return '';
  return parts.slice(0, -1).join('/');
}

function extensionOf(pathOrName, fallback = 'bin') {
  const base = basename(pathOrName);
  const idx = base.lastIndexOf('.');
  if (idx <= 0) return fallback.replace(/^\./, '');
  return base.slice(idx + 1).toLowerCase();
}

function journalNameBase(postTitle, postSlug) {
  const title = (postTitle || '').trim();
  if (!title || /^journal event /i.test(title)) {
    return postSlug || 'journal-unlinked';
  }
  return slugifyJournalFootageName(title) || postSlug || 'journal-unlinked';
}

function journalPostIdFromPath(storagePath) {
  const m = String(storagePath || '').match(
    /^journal\/\d{4}\/\d{2}\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\//i,
  );
  return m ? m[1] : null;
}

function categoryBase(storagePath) {
  if (storagePath.startsWith('founders/')) return 'founders';
  if (storagePath.startsWith('journey-events/')) return 'journey-events';
  const first = String(storagePath).split('/')[0] || 'other';
  return slugifyJournalFootageName(first) || 'other';
}

async function restGet(path) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: headers() });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`GET ${path} failed (${response.status}): ${JSON.stringify(body)}`);
  }
  return body;
}

async function restPatch(table, filter, patch) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filter}`, {
    method: 'PATCH',
    headers: headers({ Prefer: 'return=minimal' }),
    body: JSON.stringify(patch),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`PATCH ${table}?${filter} failed (${response.status}): ${body}`);
  }
}

async function storageMove(bucket, fromPath, toPath) {
  const response = await fetch(`${SUPABASE_URL}/storage/v1/object/move`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      bucketId: bucket,
      sourceKey: fromPath,
      destinationKey: toPath,
    }),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`storage.move ${bucket}:${fromPath} → ${toPath} failed (${response.status}): ${JSON.stringify(body)}`);
  }
  return body;
}

function sortKey(asset) {
  const order = asset.display_order ?? Number.MAX_SAFE_INTEGER;
  const created = asset.link_created_at || asset.created_at || '';
  return [order, created, asset.id];
}

function compareAssets(a, b) {
  const ka = sortKey(a);
  const kb = sortKey(b);
  for (let i = 0; i < ka.length; i += 1) {
    if (ka[i] < kb[i]) return -1;
    if (ka[i] > kb[i]) return 1;
  }
  return 0;
}

async function loadAssets() {
  const assets = await restGet(
    'media_assets?select=id,asset_type,original_filename,title,storage_bucket,storage_path,file_extension,metadata,created_at&asset_type=in.(image,video)&order=created_at.asc',
  );
  const links = await restGet(
    'journal_post_media?select=media_asset_id,journal_post_id,display_order,created_at',
  );
  const postIds = [...new Set(links.map((l) => l.journal_post_id).filter(Boolean))];
  const pathPostIds = assets
    .map((a) => journalPostIdFromPath(a.storage_path))
    .filter(Boolean);
  const allPostIds = [...new Set([...postIds, ...pathPostIds])];

  let posts = [];
  if (allPostIds.length) {
    const idList = allPostIds.map((id) => `"${id}"`).join(',');
    posts = await restGet(`journal_posts?select=id,title,slug&id=in.(${idList})`);
  }

  const postById = new Map(posts.map((p) => [p.id, p]));
  const linkByAsset = new Map();
  for (const link of links) {
    linkByAsset.set(link.media_asset_id, link);
  }

  return assets.map((asset) => {
    const link = linkByAsset.get(asset.id) || null;
    const pathPostId = journalPostIdFromPath(asset.storage_path);
    const postId = link?.journal_post_id || pathPostId;
    const post = postId ? postById.get(postId) || null : null;
    return {
      ...asset,
      journal_post_id: postId || null,
      display_order: link?.display_order ?? null,
      link_created_at: link?.created_at ?? null,
      post_title: post?.title ?? null,
      post_slug: post?.slug ?? null,
      has_journal_link: Boolean(link),
    };
  });
}

function buildRenamePlan(assets) {
  /** @type {Map<string, typeof assets>} */
  const groups = new Map();

  for (const asset of assets) {
    let groupKey;
    if (asset.journal_post_id && (asset.has_journal_link || asset.storage_path.startsWith('journal/'))) {
      groupKey = `post:${asset.journal_post_id}`;
    } else if (asset.storage_path.startsWith('founders/')) {
      groupKey = 'cat:founders';
    } else if (asset.storage_path.startsWith('journey-events/')) {
      groupKey = 'cat:journey-events';
    } else {
      groupKey = `cat:${categoryBase(asset.storage_path)}`;
    }
    if (!groups.has(groupKey)) groups.set(groupKey, []);
    groups.get(groupKey).push(asset);
  }

  const plan = [];

  for (const [groupKey, members] of groups) {
    members.sort(compareAssets);

    let nameBase;
    if (groupKey.startsWith('post:')) {
      const sample = members.find((m) => m.post_title || m.post_slug) || members[0];
      nameBase = journalNameBase(sample.post_title, sample.post_slug);
    } else {
      nameBase = groupKey.slice('cat:'.length);
    }

    members.forEach((asset, index) => {
      const n = index + 1;
      const ext = (asset.file_extension || extensionOf(asset.storage_path, extensionOf(asset.original_filename))).replace(/^\./, '');
      const targetFilename = `${nameBase}-${n}.${ext}`;
      const dir = dirname(asset.storage_path);
      const targetPath = dir ? `${dir}/${targetFilename}` : targetFilename;
      const currentFilename = basename(asset.storage_path);
      const skip = currentFilename === targetFilename;

      plan.push({
        id: asset.id,
        groupKey,
        nameBase,
        n,
        bucket: asset.storage_bucket,
        fromPath: asset.storage_path,
        toPath: targetPath,
        fromFilename: currentFilename,
        toFilename: targetFilename,
        original_filename: asset.original_filename,
        title: asset.title,
        metadata: asset.metadata && typeof asset.metadata === 'object' ? asset.metadata : {},
        skip,
      });
    });
  }

  return plan.sort((a, b) => a.groupKey.localeCompare(b.groupKey) || a.n - b.n);
}

function withUpdatedPublicUrl(metadata, bucket, newPath) {
  const next = { ...metadata };
  if (typeof next.public_url === 'string' && next.public_url.includes('/storage/v1/object/public/')) {
    next.public_url = `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${newPath}`;
  }
  if (!next.original_client_filename && typeof next.original_client_filename !== 'string') {
    // keep existing; do not invent
  }
  return next;
}

function printPlan(plan) {
  const pending = plan.filter((p) => !p.skip);
  const skipped = plan.filter((p) => p.skip);

  console.log(`Assets: ${plan.length}  rename: ${pending.length}  skip: ${skipped.length}`);
  console.log('');

  let currentGroup = null;
  for (const row of plan) {
    if (row.groupKey !== currentGroup) {
      currentGroup = row.groupKey;
      console.log(`--- ${currentGroup} (base=${row.nameBase}) ---`);
    }
    const mark = row.skip ? 'SKIP' : 'MOVE';
    console.log(`[${mark}] ${row.fromPath}`);
    console.log(`      → ${row.toPath}`);
  }
}

async function applyPlan(plan) {
  const pending = plan.filter((p) => !p.skip);
  const failures = [];

  // Phase 1: move storage + DB path to unique temps (avoids media_assets unique collisions)
  const temps = [];
  for (const row of pending) {
    const tempPath = `${dirname(row.fromPath)}/.__rename_${row.id}.${extensionOf(row.toFilename)}`;
    try {
      await storageMove(row.bucket, row.fromPath, tempPath);
      await restPatch('media_assets', `id=eq.${row.id}`, {
        storage_path: tempPath,
        updated_at: new Date().toISOString(),
      });
      temps.push({ ...row, tempPath });
      console.log(`temp  ${row.fromPath} → ${tempPath}`);
    } catch (error) {
      failures.push({ id: row.id, stage: 'phase1', error: String(error.message || error) });
      console.error(`FAIL phase1 ${row.id}:`, error.message || error);
      break;
    }
  }

  if (failures.length) {
    console.error('Stopped after phase1 failure. Some rows may be on temp paths; re-run after repair.');
    return failures;
  }

  // Phase 2: temp → final + finalize DB metadata
  for (const row of temps) {
    try {
      await storageMove(row.bucket, row.tempPath, row.toPath);
      console.log(`final ${row.tempPath} → ${row.toPath}`);

      const metadata = withUpdatedPublicUrl(row.metadata, row.bucket, row.toPath);
      if (!metadata.original_client_filename && row.fromFilename && row.fromFilename !== row.toFilename) {
        metadata.original_client_filename = row.original_filename || row.fromFilename;
      }

      await restPatch(
        'media_assets',
        `id=eq.${row.id}`,
        {
          storage_path: row.toPath,
          original_filename: row.toFilename,
          title: row.toFilename,
          metadata,
          updated_at: new Date().toISOString(),
        },
      );
      console.log(`db    ${row.id} → ${row.toFilename}`);
    } catch (error) {
      failures.push({ id: row.id, stage: 'phase2', error: String(error.message || error) });
      console.error(`FAIL phase2 ${row.id}:`, error.message || error);
    }
  }

  return failures;
}

async function main() {
  console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}  url=${SUPABASE_URL}`);
  const assets = await loadAssets();
  const plan = buildRenamePlan(assets);
  printPlan(plan);

  if (!APPLY) {
    console.log('\nDry-run only. Re-run with --apply and SUPABASE_SERVICE_ROLE_KEY to execute.');
    return;
  }

  const failures = await applyPlan(plan);
  if (failures.length) {
    console.error(`\nCompleted with ${failures.length} failure(s).`);
    process.exit(1);
  }
  console.log(`\nDone. Renamed ${plan.filter((p) => !p.skip).length} asset(s).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
