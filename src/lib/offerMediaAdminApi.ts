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

export type MediaUsageType = {
  key: string;
  display_name: string;
  controlled_tag: string;
  requires_relation: string | null;
};

export type MediaApplication = {
  relation_table: string;
  relation_id: string;
  entity_type: string;
  entity_id: string;
  entity_title: string | null;
  placement: string | null;
  display_order: number;
  is_featured: boolean;
  caption_override: string | null;
  alt_text_override: string | null;
  autoplay?: boolean;
  muted?: boolean;
  loop?: boolean;
  editable: boolean;
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
    title: string;
    description: string;
    alt_text: string;
    caption: string;
    language_code: string;
    tags: string[];
    captured_at: string;
    visibility: string;
    status: string;
    published_at: string;
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

function assertEditorPayload(payload: MediaAssetEditorRecord): MediaAssetEditorRecord {
  if (!payload?.asset?.id
    || !Array.isArray(payload.usage_types)
    || !Array.isArray(payload.available_usage_types)
    || !Array.isArray(payload.applications)
    || !Array.isArray(payload.concepts)
    || !Array.isArray(payload.mockup_screens)) {
    throw new Error('Incomplete media editor payload.');
  }
  return payload;
}

export async function getMediaAssetEditor(assetId: string): Promise<MediaAssetEditorRecord> {
  return assertEditorPayload(await request<MediaAssetEditorRecord>('/rest/v1/rpc/admin_get_media_asset_editor', {
    method: 'POST',
    body: JSON.stringify({ p_asset_id: assetId }),
  }));
}

export async function saveMediaAssetEditor(assetId: string, payload: MediaAssetEditorPayload): Promise<MediaAssetEditorRecord> {
  return assertEditorPayload(await request<MediaAssetEditorRecord>('/rest/v1/rpc/admin_save_media_asset_editor', {
    method: 'POST',
    body: JSON.stringify({ p_asset_id: assetId, p_payload: payload }),
  }));
}

export async function deleteMediaAsset(assetId: string): Promise<void> {
  await request('/rest/v1/rpc/admin_delete_media_asset', {
    method: 'POST',
    body: JSON.stringify({ p_asset_id: assetId }),
  });
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
