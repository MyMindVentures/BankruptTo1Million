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
  captured_at?: unknown;
  featured?: unknown;
};

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

function toPublicMediaAsset(row: MediaAssetRow): PublicMediaAsset {
  const metadata = asMetadata(row.metadata);
  const mediaUrl = storagePublicUrl(row.storage_bucket, row.storage_path);
  const thumbnailUrl = row.thumbnail_url || (row.asset_type === 'image' ? mediaUrl : '');
  const tags = Array.isArray(row.tags) ? row.tags.filter((tag): tag is string => typeof tag === 'string' && tag.trim().length > 0) : [];
  const category = typeof metadata.category === 'string' && metadata.category.trim()
    ? metadata.category.trim()
    : tags[0] || (row.asset_type === 'video' ? 'Video' : row.asset_type === 'document' ? 'Documents' : 'Photography');

  return {
    id: row.id,
    title: row.title,
    description: row.description || '',
    altText: row.alt_text || row.title,
    caption: row.caption || '',
    kind: toKind(row.asset_type),
    category,
    location: typeof metadata.location === 'string' ? metadata.location : '',
    capturedAt: row.captured_at
      || (typeof metadata.captured_at === 'string' ? metadata.captured_at : '')
      || row.published_at
      || row.created_at,
    imageUrl: thumbnailUrl || mediaUrl,
    mediaUrl,
    thumbnailUrl,
    durationSeconds: row.duration_seconds === null ? null : Number(row.duration_seconds),
    tags,
    featured: metadata.featured === true,
    width: row.width,
    height: row.height,
    mimeType: row.mime_type || '',
  };
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
  if (!response.ok) {
    throw new Error(`Media Vault could not be loaded (${response.status}).`);
  }

  const rows = await response.json() as MediaAssetRow[];
  return rows.map(toPublicMediaAsset).filter((item) => item.mediaUrl);
}
