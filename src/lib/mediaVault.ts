import { supabase } from './supabase';

export type MediaVaultKind = 'photo' | 'video' | 'document';

export type PublicMediaAsset = {
  id: string;
  title: string;
  description: string;
  altText: string;
  caption: string;
  kind: MediaVaultKind;
  category: string;
  location: string;
  capturedAt: string;
  imageUrl: string;
  mediaUrl: string;
  thumbnailUrl: string;
  durationSeconds: number | null;
  tags: string[];
  featured: boolean;
  width: number | null;
  height: number | null;
  mimeType: string;
};

type MediaAssetRow = {
  id: string;
  asset_type: 'image' | 'video' | 'document';
  title: string;
  description: string | null;
  alt_text: string | null;
  caption: string | null;
  storage_bucket: string | null;
  storage_path: string | null;
  thumbnail_url: string | null;
  mime_type: string | null;
  width: number | null;
  height: number | null;
  duration_seconds: number | string | null;
  tags: string[] | null;
  metadata: unknown;
  captured_at: string | null;
  published_at: string | null;
  created_at: string;
};

type MediaMetadata = {
  category?: unknown;
  location?: unknown;
  location_name?: unknown;
  captured_at?: unknown;
  occurred_at?: unknown;
  featured?: unknown;
  event_name?: unknown;
  event_title?: unknown;
  journal_post_id?: unknown;
  journal_post_slug?: unknown;
  event_type?: unknown;
  featured_business_name?: unknown;
};

type JournalTitleRow = { id: string; title: string };

function storagePublicUrl(bucket: string | null, path: string | null): string {
  if (!bucket || !path) return '';
  const encodedPath = path.split('/').map(encodeURIComponent).join('/');
  return `${supabase.url}/storage/v1/object/public/${encodeURIComponent(bucket)}/${encodedPath}`;
}

function asMetadata(value: unknown): MediaMetadata {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as MediaMetadata : {};
}

function toKind(assetType: MediaAssetRow['asset_type']): MediaVaultKind {
  if (assetType === 'image') return 'photo';
  return assetType;
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function humanize(value: string): string {
  return value.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function resolveEventTitle(row: MediaAssetRow, journalTitles: Map<string, string>): string {
  const metadata = asMetadata(row.metadata);
  const journalPostId = text(metadata.journal_post_id);
  return text(metadata.event_name)
    || text(metadata.event_title)
    || (journalPostId ? journalTitles.get(journalPostId) || '' : '')
    || (text(metadata.journal_post_slug) ? humanize(text(metadata.journal_post_slug)) : '')
    || text(metadata.featured_business_name)
    || text(metadata.location_name)
    || humanize(text(metadata.event_type))
    || 'Journey moment';
}

function toPublicMediaAsset(row: MediaAssetRow, journalTitles: Map<string, string>): PublicMediaAsset {
  const metadata = asMetadata(row.metadata);
  const mediaUrl = storagePublicUrl(row.storage_bucket, row.storage_path);
  const thumbnailUrl = row.thumbnail_url || (row.asset_type === 'image' ? mediaUrl : '');
  const tags = Array.isArray(row.tags) ? row.tags.filter((tag): tag is string => typeof tag === 'string' && tag.trim().length > 0) : [];
  const eventTitle = resolveEventTitle(row, journalTitles);
  const location = text(metadata.location_name) || text(metadata.location);
  const eventType = text(metadata.event_type);
  const category = typeof metadata.category === 'string' && metadata.category.trim()
    ? metadata.category.trim()
    : eventType ? humanize(eventType) : tags[0] || (row.asset_type === 'video' ? 'Video' : row.asset_type === 'document' ? 'Documents' : 'Photography');

  return {
    id: row.id,
    title: eventTitle,
    description: row.description || '',
    altText: row.alt_text || eventTitle,
    caption: row.caption || '',
    kind: toKind(row.asset_type),
    category,
    location,
    capturedAt: row.captured_at
      || text(metadata.captured_at)
      || text(metadata.occurred_at)
      || row.published_at
      || row.created_at,
    imageUrl: thumbnailUrl || mediaUrl,
    mediaUrl,
    thumbnailUrl,
    durationSeconds: row.duration_seconds === null ? null : Number(row.duration_seconds),
    tags: Array.from(new Set([eventTitle, category, location, ...tags].filter(Boolean))),
    featured: metadata.featured === true,
    width: row.width,
    height: row.height,
    mimeType: row.mime_type || '',
  };
}

async function getJournalTitles(rows: MediaAssetRow[]): Promise<Map<string, string>> {
  const ids = Array.from(new Set(rows.map((row) => text(asMetadata(row.metadata).journal_post_id)).filter(Boolean)));
  if (!ids.length) return new Map();
  const encodedIds = ids.map((id) => `"${id}"`).join(',');
  const query = new URLSearchParams({ select: 'id,title', id: `in.(${encodedIds})` });
  const response = await supabase.from('journal_posts').request({ query: query.toString() });
  if (!response.ok) return new Map();
  const records = await response.json() as JournalTitleRow[];
  return new Map(records.map((record) => [record.id, record.title]));
}

export async function getPublicMediaAssets(): Promise<PublicMediaAsset[]> {
  const query = new URLSearchParams({
    select: 'id,asset_type,title,description,alt_text,caption,storage_bucket,storage_path,thumbnail_url,mime_type,width,height,duration_seconds,tags,metadata,captured_at,published_at,created_at',
    visibility: 'eq.public',
    status: 'eq.published',
    show_in_media_vault: 'eq.true',
    order: 'captured_at.desc.nullslast,published_at.desc.nullslast,created_at.desc',
  });

  const response = await supabase.from('media_assets').request({ query: query.toString() });
  if (!response.ok) throw new Error(`Media Vault could not be loaded (${response.status}).`);

  const rows = await response.json() as MediaAssetRow[];
  const journalTitles = await getJournalTitles(rows);
  return rows.map((row) => toPublicMediaAsset(row, journalTitles)).filter((item) => item.mediaUrl);
}
