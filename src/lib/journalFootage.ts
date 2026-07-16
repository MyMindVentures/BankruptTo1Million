import { supabase } from './supabase';

export type JournalFootageItem = {
  id: string;
  asset_type: 'image' | 'video';
  url: string;
  thumbnail_url: string | null;
  mime_type: string | null;
  alt_text: string;
  caption: string | null;
  display_order: number;
};

type MediaAssetRow = {
  id: string;
  asset_type: 'image' | 'video' | 'document';
  storage_bucket: string | null;
  storage_path: string | null;
  thumbnail_url: string | null;
  mime_type: string | null;
  alt_text: string | null;
  caption: string | null;
  visibility: string;
  status: string;
};

type JournalPostMediaRow = {
  display_order: number;
  caption_override: string | null;
  alt_text_override: string | null;
  created_at: string;
  media_assets: MediaAssetRow | null;
};

type JournalPostFootageRow = {
  id: string;
  journal_post_media: JournalPostMediaRow[] | null;
};

const FILENAME_LIKE = /^[\w.-]+\.(jpe?g|png|gif|webp|avif|heic|mp4|mov|webm|mkv)$/i;
const NUMERIC_ONLY = /^\d+$/;

async function readJson<T>(responseOrPromise: Response | Promise<Response>): Promise<T> {
  const response = await responseOrPromise;
  if (!response.ok) throw new Error(await response.text());
  return response.json() as Promise<T>;
}

export function publicStorageUrl(bucket: string | null, path: string | null) {
  if (!bucket || !path) return '';
  const safePath = path.split('/').map(encodeURIComponent).join('/');
  return `${supabase.url}/storage/v1/object/public/${encodeURIComponent(bucket)}/${safePath}`;
}

export function resolvePublicMediaUrl(url?: string | null, bucket?: string | null, path?: string | null) {
  if (bucket && path) return publicStorageUrl(bucket, path);
  const trimmed = String(url || '').trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('/storage/v1/object/public/')) return `${supabase.url}${trimmed}`;
  return trimmed;
}

export function footageStoragePathMatchesPost(storagePath: string | null | undefined, postId: string) {
  if (!storagePath) return false;
  if (storagePath.startsWith('journey-events/')) return false;
  if (!storagePath.startsWith('journal/')) return true;
  const segments = storagePath.split('/');
  return segments[3] === postId;
}

export function isFilenameLikeText(value: string | null | undefined) {
  const normalized = String(value || '').trim();
  if (!normalized) return false;
  return FILENAME_LIKE.test(normalized) || NUMERIC_ONLY.test(normalized);
}

export function resolveFootageCaption(captionOverride?: string | null, caption?: string | null) {
  const resolved = String(captionOverride || caption || '').trim();
  return resolved || null;
}

export function resolveFootageAlt(
  altOverride: string | null | undefined,
  altText: string | null | undefined,
  assetType: 'image' | 'video',
  number: number,
  labels: { image: string; video: string },
) {
  const candidate = String(altOverride || altText || '').trim();
  if (candidate && !isFilenameLikeText(candidate)) return candidate;
  const template = assetType === 'video' ? labels.video : labels.image;
  return template.replace('{number}', String(number));
}

export function isVideoFootage(item: Pick<JournalFootageItem, 'asset_type' | 'mime_type'>) {
  return item.asset_type === 'video' || Boolean(item.mime_type?.startsWith('video/'));
}

export function wrapFootageIndex(index: number, length: number, direction: -1 | 1) {
  if (length < 1) return 0;
  return (index + direction + length) % length;
}

function normalizeFootageRow(
  row: JournalPostMediaRow,
  labels: { image: string; video: string },
  index: number,
  postId: string,
): JournalFootageItem | null {
  const asset = row.media_assets;
  if (!asset || asset.visibility !== 'public' || asset.status !== 'published') return null;
  if (asset.asset_type !== 'image' && asset.asset_type !== 'video') return null;
  if (!footageStoragePathMatchesPost(asset.storage_path, postId)) return null;

  const url = resolvePublicMediaUrl(null, asset.storage_bucket, asset.storage_path);
  if (!url) return null;

  const assetType = asset.asset_type === 'video' ? 'video' : 'image';
  return {
    id: asset.id,
    asset_type: assetType,
    url,
    thumbnail_url: resolvePublicMediaUrl(asset.thumbnail_url) || null,
    mime_type: asset.mime_type,
    alt_text: resolveFootageAlt(row.alt_text_override, asset.alt_text, assetType, index + 1, labels),
    caption: resolveFootageCaption(row.caption_override, asset.caption),
    display_order: row.display_order ?? 0,
  };
}

export async function getJournalPostFootage(
  postId: string,
  labels: { image: string; video: string },
): Promise<JournalFootageItem[]> {
  const rows = await readJson<JournalPostFootageRow[]>(supabase.from('journal_posts').request({
    query: [
      'select=id,journal_post_media(display_order,caption_override,alt_text_override,created_at,media_assets(id,asset_type,storage_bucket,storage_path,thumbnail_url,mime_type,alt_text,caption,visibility,status))',
      `id=eq.${encodeURIComponent(postId)}`,
      'status=eq.published',
      'published_at=not.is.null',
      `published_at=lte.${encodeURIComponent(new Date().toISOString())}`,
      'limit=1',
    ].join('&'),
  }));

  const post = rows[0];
  if (!post) return [];

  const links = post.journal_post_media || [];
  const normalized = links
    .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0) || Date.parse(a.created_at) - Date.parse(b.created_at))
    .map((row, index) => normalizeFootageRow(row, labels, index, post.id))
    .filter((item): item is JournalFootageItem => Boolean(item));

  if (links.length > 0 && normalized.length === 0) {
    throw new Error('Footage links exist but none matched this journal post.');
  }

  return normalized;
}

export function normalizeJourneyFootageItems<T extends {
  url?: string | null;
  thumbnail_url?: string | null;
  storage_bucket?: string | null;
  storage_path?: string | null;
}>(items?: T[] | null): T[] {
  return (items || []).map((item) => ({
    ...item,
    url: resolvePublicMediaUrl(item.url, item.storage_bucket, item.storage_path) || item.url || '',
    thumbnail_url: resolvePublicMediaUrl(item.thumbnail_url) || item.thumbnail_url || null,
  }));
}
