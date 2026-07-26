import { getAdminSession } from './adminApi';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '');
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export type AdminMediaVaultAsset = {
  asset_id: string;
  item_id?: string;
  asset_type: string;
  title?: string | null;
  storage_bucket: string | null;
  storage_path: string | null;
  thumbnail_url: string | null;
  mime_type: string | null;
  alt_text: string | null;
  caption: string | null;
  placement?: string | null;
  display_order: number;
  is_featured?: boolean;
  created_at: string;
  captured_at?: string | null;
  original_filename?: string | null;
};

export type AdminMediaVaultPostGroup = {
  post_id: string;
  title: string;
  slug: string;
  status: string;
  asset_count: number;
  cover_storage_bucket: string | null;
  cover_storage_path: string | null;
  cover_thumbnail_url: string | null;
  cover_asset_type: string | null;
  occurred_at: string | null;
  event_timezone: string | null;
  updated_at: string | null;
};

export type AdminMediaVaultCategoryGroup = {
  key: string;
  asset_count: number;
  cover_storage_bucket: string | null;
  cover_storage_path: string | null;
  cover_thumbnail_url: string | null;
  cover_asset_type: string | null;
  assets: AdminMediaVaultAsset[];
};

export type AdminMediaVaultOfferGroup = {
  key: string;
  group_type: 'offer';
  collection_id: string;
  offer_id: string;
  offer_slug: string;
  offer_title: string;
  offer_status: string;
  offer_is_public: boolean;
  collection_slug: string;
  title: string;
  description: string | null;
  collection_type: string;
  storage_bucket: string;
  storage_folder: string;
  accepted_asset_types: string[];
  max_items: number | null;
  is_public: boolean;
  display_order: number;
  asset_count: number;
  cover_storage_bucket: string | null;
  cover_storage_path: string | null;
  cover_thumbnail_url: string | null;
  cover_asset_type: string | null;
  assets: AdminMediaVaultAsset[];
  updated_at: string | null;
};

export type AdminMediaVaultConceptGroup = {
  key: string;
  group_type: 'concept';
  concept_id: string;
  concept_slug: string;
  concept_title: string;
  title: string;
  concept_type: string;
  concept_status: string;
  visibility: string;
  folder_id: string;
  storage_bucket: string;
  storage_folder: string;
  accepted_asset_types: string[];
  is_public: boolean;
  display_order: number;
  asset_count: number;
  cover_storage_bucket: string | null;
  cover_storage_path: string | null;
  cover_thumbnail_url: string | null;
  cover_asset_type: string | null;
  assets: AdminMediaVaultAsset[];
  updated_at: string | null;
};

export type AdminMediaVaultGroups = {
  posts: AdminMediaVaultPostGroup[];
  categories: AdminMediaVaultCategoryGroup[];
  offers: AdminMediaVaultOfferGroup[];
  concepts: AdminMediaVaultConceptGroup[];
};

export type MediaUsageType = { key: string; display_name: string; controlled_tag: string; requires_relation: string | null };
export type MediaApplication = {
  relation_table: string; relation_id: string; entity_type: string; entity_id: string; entity_title: string | null;
  placement: string | null; display_order: number; is_featured: boolean; caption_override: string | null;
  alt_text_override: string | null; autoplay?: boolean; muted?: boolean; loop?: boolean; editable: boolean;
  details?: Record<string, unknown>;
};
export type MediaAssetEditorRecord = {
  asset: Record<string, unknown> & { id: string; asset_type: string; tags?: string[] | null };
  usage_types: MediaUsageType[];
  available_usage_types: MediaUsageType[];
  applications: MediaApplication[];
  concepts: { id: string; title: string; slug: string }[];
  mockup_screens: Record<string, unknown>[];
};

export type MediaAssetEditorPayload = {
  asset: {
    title: string; description: string; alt_text: string; caption: string; language_code: string;
    tags: string[]; captured_at: string; visibility: string; status: string; published_at: string;
    show_in_media_vault: boolean;
  };
  usage_type_keys: string[];
  concept_media: MediaApplication[];
  mockup_screen?: Record<string, unknown> | null;
};

type UploadTarget = {
  collection_id?: string;
  concept_id?: string;
  folder_id?: string;
  bucket_name: string;
  object_path: string;
  storage_file_name: string;
  display_order: number;
  asset_type: string;
};

function config() {
  const session = getAdminSession();
  if (!supabaseUrl || !anonKey) throw new Error('Supabase configuration is missing.');
  if (!session?.access_token) throw new Error('No valid admin session.');
  return { token: session.access_token };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const { token } = config();
  const response = await fetch(`${supabaseUrl}${path}`, {
    ...init,
    cache: 'no-store',
    headers: {
      apikey: anonKey!,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { message?: string; details?: string; error?: string } | null;
    throw new Error(payload?.message || payload?.details || payload?.error || `Supabase request failed (${response.status}).`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

const fallbackUsageTypes: MediaUsageType[] = [
  { key: 'logo', display_name: 'Logo', controlled_tag: 'logo', requires_relation: null },
  { key: 'mockup_screen', display_name: 'Mockup screen', controlled_tag: 'mockup-screen', requires_relation: 'proof_of_mind_mockup_screens' },
  { key: 'hero_image', display_name: 'Hero image', controlled_tag: 'hero', requires_relation: null },
  { key: 'gallery', display_name: 'Gallery', controlled_tag: 'gallery', requires_relation: null },
  { key: 'social_asset', display_name: 'Social asset', controlled_tag: 'social', requires_relation: null },
  { key: 'founder_portrait', display_name: 'Founder portrait', controlled_tag: 'founder', requires_relation: null },
  { key: 'website_asset', display_name: 'Website asset', controlled_tag: 'website', requires_relation: null },
  { key: 'event_footage', display_name: 'Event footage', controlled_tag: 'event-footage', requires_relation: null },
  { key: 'journal_media', display_name: 'Journal media', controlled_tag: 'journal', requires_relation: null },
  { key: 'qr_code', display_name: 'QR code', controlled_tag: 'qr-code', requires_relation: null },
  { key: 'other', display_name: 'Other', controlled_tag: 'other', requires_relation: null },
];

function relationApplication(
  item: Record<string, unknown>,
  relationTable: string,
  defaults: Partial<MediaApplication> = {},
): MediaApplication {
  const concept = item.concept && typeof item.concept === 'object' ? item.concept as Record<string, unknown> : null;
  const collection = item.collection && typeof item.collection === 'object' ? item.collection as Record<string, unknown> : null;
  return {
    relation_table: relationTable,
    relation_id: String(item.id || ''),
    entity_type: String(defaults.entity_type || (concept ? 'proof_of_mind_concept' : collection ? 'media_collection' : item.entity_type || relationTable)),
    entity_id: String(defaults.entity_id || item.concept_id || item.collection_id || item.entity_id || ''),
    entity_title: String(defaults.entity_title || concept?.title || collection?.name || '') || null,
    placement: String(defaults.placement || item.placement || item.relation_type || '') || null,
    display_order: Number(defaults.display_order ?? item.display_order ?? 0),
    is_featured: Boolean(defaults.is_featured ?? item.is_featured ?? item.is_cover ?? false),
    caption_override: String(defaults.caption_override || item.caption_override || '') || null,
    alt_text_override: String(defaults.alt_text_override || item.alt_text_override || '') || null,
    autoplay: Boolean(defaults.autoplay ?? item.autoplay ?? false),
    muted: Boolean(defaults.muted ?? item.muted ?? false),
    loop: Boolean(defaults.loop ?? item.loop ?? false),
    editable: relationTable === 'proof_of_mind_concept_media',
    details: item,
  };
}

function normalizeEditorPayload(payload: unknown): MediaAssetEditorRecord {
  const value = payload && typeof payload === 'object' ? payload as Record<string, unknown> : {};
  const asset = value.asset && typeof value.asset === 'object' ? value.asset as MediaAssetEditorRecord['asset'] : null;
  if (!asset?.id) throw new Error('Incomplete media editor payload.');

  const usageTypes = Array.isArray(value.usage_types) ? value.usage_types as MediaUsageType[] : [];
  const availableUsageTypes = Array.isArray(value.available_usage_types) ? value.available_usage_types as MediaUsageType[] : fallbackUsageTypes;
  const applications = Array.isArray(value.applications)
    ? value.applications as MediaApplication[]
    : [
        ...(Array.isArray(value.media_links) ? value.media_links.map((item) => relationApplication(item as Record<string, unknown>, 'media_links')) : []),
        ...(Array.isArray(value.collection_items) ? value.collection_items.map((item) => relationApplication(item as Record<string, unknown>, 'media_collection_items')) : []),
        ...(Array.isArray(value.concept_media) ? value.concept_media.map((item) => relationApplication(item as Record<string, unknown>, 'proof_of_mind_concept_media')) : []),
        ...(Array.isArray(value.website_slots) ? value.website_slots.map((item) => relationApplication(item as Record<string, unknown>, 'website_media_slots')) : []),
      ];

  const derivedUsageTypes = usageTypes.length
    ? usageTypes
    : fallbackUsageTypes.filter((usage) => Array.isArray(asset.tags) && asset.tags.includes(usage.controlled_tag));

  return {
    asset,
    usage_types: derivedUsageTypes,
    available_usage_types: availableUsageTypes,
    applications,
    concepts: Array.isArray(value.concepts) ? value.concepts as { id: string; title: string; slug: string }[] : [],
    mockup_screens: Array.isArray(value.mockup_screens) ? value.mockup_screens as Record<string, unknown>[] : [],
  };
}

export async function getMediaAssetEditor(assetId: string): Promise<MediaAssetEditorRecord> {
  return normalizeEditorPayload(await request<unknown>('/rest/v1/rpc/admin_get_media_asset_editor', {
    method: 'POST', body: JSON.stringify({ p_asset_id: assetId }),
  }));
}

export async function saveMediaAssetEditor(assetId: string, payload: MediaAssetEditorPayload): Promise<MediaAssetEditorRecord> {
  return normalizeEditorPayload(await request<unknown>('/rest/v1/rpc/admin_save_media_asset_editor', {
    method: 'POST', body: JSON.stringify({ p_asset_id: assetId, p_payload: payload }),
  }));
}

export async function deleteMediaAsset(assetId: string): Promise<void> {
  await request('/rest/v1/rpc/admin_delete_media_asset', { method: 'POST', body: JSON.stringify({ p_asset_id: assetId }) });
}

export async function listAdminMediaVaultGroups(signal?: AbortSignal): Promise<AdminMediaVaultGroups> {
  const payload = await request<Partial<AdminMediaVaultGroups>>('/rest/v1/rpc/admin_list_media_vault_groups', {
    method: 'POST',
    body: '{}',
    signal,
  });
  return {
    posts: Array.isArray(payload.posts) ? payload.posts : [],
    categories: Array.isArray(payload.categories) ? payload.categories.map((group) => ({
      ...group,
      asset_count: Number(group.asset_count) || group.assets?.length || 0,
      assets: Array.isArray(group.assets) ? group.assets : [],
    })) : [],
    offers: Array.isArray(payload.offers) ? payload.offers.map((group) => ({
      ...group,
      asset_count: Number(group.asset_count) || group.assets?.length || 0,
      accepted_asset_types: Array.isArray(group.accepted_asset_types) ? group.accepted_asset_types : ['image', 'video'],
      assets: Array.isArray(group.assets) ? group.assets : [],
    })) : [],
    concepts: Array.isArray(payload.concepts) ? payload.concepts.map((group) => ({
      ...group,
      asset_count: Number(group.asset_count) || group.assets?.length || 0,
      accepted_asset_types: Array.isArray(group.accepted_asset_types) ? group.accepted_asset_types : ['image', 'video'],
      assets: Array.isArray(group.assets) ? group.assets : [],
    })) : [],
  };
}

function fileExtension(file: File): string {
  const fromName = file.name.split('.').pop()?.trim().toLowerCase();
  if (fromName) return fromName;
  const fromMime = file.type.split('/').pop()?.split('+')[0]?.trim().toLowerCase();
  return fromMime || 'bin';
}

async function uploadObject(target: UploadTarget, file: File) {
  const { token } = config();
  const encodedPath = target.object_path.split('/').map(encodeURIComponent).join('/');
  const response = await fetch(`${supabaseUrl}/storage/v1/object/${encodeURIComponent(target.bucket_name)}/${encodedPath}`, {
    method: 'POST',
    headers: {
      apikey: anonKey!,
      Authorization: `Bearer ${token}`,
      'Content-Type': file.type || 'application/octet-stream',
      'x-upsert': 'false',
    },
    body: file,
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { message?: string; error?: string } | null;
    throw new Error(payload?.message || payload?.error || `Storage upload failed (${response.status}).`);
  }
}

async function removeObject(target: UploadTarget) {
  const { token } = config();
  await fetch(`${supabaseUrl}/storage/v1/object/${encodeURIComponent(target.bucket_name)}`, {
    method: 'DELETE',
    headers: {
      apikey: anonKey!,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prefixes: [target.object_path] }),
  }).catch(() => undefined);
}

export async function uploadOfferMedia(collectionId: string, files: File[]): Promise<string[]> {
  const assetIds: string[] = [];
  for (const file of files) {
    const target = await request<UploadTarget>('/rest/v1/rpc/admin_resolve_offer_media_upload', {
      method: 'POST',
      body: JSON.stringify({
        p_collection_id: collectionId,
        p_mime_type: file.type || 'application/octet-stream',
        p_file_extension: fileExtension(file),
      }),
    });

    await uploadObject(target, file);
    try {
      const asset = await request<{ id: string }>('/rest/v1/rpc/admin_register_offer_media', {
        method: 'POST',
        body: JSON.stringify({
          p_collection_id: collectionId,
          p_bucket_name: target.bucket_name,
          p_object_path: target.object_path,
          p_file_name: file.name,
          p_mime_type: file.type || 'application/octet-stream',
          p_file_size: file.size,
          p_display_order: target.display_order,
          p_placement: 'gallery',
          p_metadata: { original_client_filename: file.name },
        }),
      });
      assetIds.push(asset.id);
    } catch (error) {
      await removeObject(target);
      throw error;
    }
  }
  return assetIds;
}

export async function uploadConceptMedia(conceptId: string, files: File[]): Promise<string[]> {
  const assetIds: string[] = [];
  for (const file of files) {
    const target = await request<UploadTarget>('/rest/v1/rpc/admin_resolve_concept_media_upload', {
      method: 'POST',
      body: JSON.stringify({
        p_concept_id: conceptId,
        p_mime_type: file.type || 'application/octet-stream',
        p_file_extension: fileExtension(file),
      }),
    });

    await uploadObject(target, file);
    try {
      const asset = await request<{ id: string }>('/rest/v1/rpc/admin_register_concept_media', {
        method: 'POST',
        body: JSON.stringify({
          p_concept_id: conceptId,
          p_bucket_name: target.bucket_name,
          p_object_path: target.object_path,
          p_file_name: file.name,
          p_mime_type: file.type || 'application/octet-stream',
          p_file_size: file.size,
          p_display_order: target.display_order,
          p_placement: 'gallery',
          p_metadata: { original_client_filename: file.name },
        }),
      });
      assetIds.push(asset.id);
    } catch (error) {
      await removeObject(target);
      throw error;
    }
  }
  return assetIds;
}
