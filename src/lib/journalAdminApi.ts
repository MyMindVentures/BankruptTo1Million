export type JournalPost = {
  id: string; title: string; slug: string; status: 'draft' | 'scheduled' | 'published' | 'archived';
  subtitle: string | null; excerpt: string | null; body: string; content_format: 'markdown' | 'rich_text' | 'video' | 'mixed';
  cover_image_url: string | null; cover_image_alt: string | null; original_language: string; category_id: string | null;
  primary_creator_id: string | null; is_featured: boolean; is_vision_feature: boolean; published_at: string | null;
  scheduled_for: string | null; reading_time_minutes: number | null; seo_title: string | null; seo_description: string | null;
  publication_timezone: string; ai_generation_status?: string; ai_generated_at?: string | null; ai_model?: string | null;
  created_at: string; updated_at: string;
};
export type JournalOption = { id: string; label: string };
export type JourneyPerson = { id: string; display_name: string; full_name: string | null; person_type: string; email: string | null };
export type EventTypeOption = { key: string; label: string; description: string | null };
export type FounderOption = { id: string; label: string; slug: string };
export type JournalPayload = Omit<JournalPost, 'id' | 'created_at' | 'updated_at'>;
export type JournalEventPayload = {
  subject_founder_ids: string[]; person_ids: string[]; event_type: string; occurred_at: string;
  timezone: string; journey_person: string; location_name: string; address_text: string;
  latitude: string; longitude: string; plus_code: string; featured_business_name?: string; description: string;
  show_on_map: boolean; show_on_timeline: boolean; is_public_location: boolean;
};
export type JournalAiStatus = {
  status: string;
  generation_status: string;
  last_error: string | null;
  published_at: string | null;
  ai_generated_at: string | null;
  translation_count: number;
  expected_translation_count: number;
};
export type JournalAiProgressStage = 'generating' | 'translating' | 'publishing';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '');
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const sessionKey = 'bankrupt1m.admin.session';

function token() {
  const raw = localStorage.getItem(sessionKey);
  if (!raw) throw new Error('No valid admin session.');
  const parsed = JSON.parse(raw) as { access_token?: string };
  if (!parsed.access_token) throw new Error('No valid admin session.');
  return parsed.access_token;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!supabaseUrl || !anonKey) throw new Error('Supabase configuration is missing.');
  const response = await fetch(`${supabaseUrl}${path}`, {
    ...init,
    headers: { apikey: anonKey, Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json', ...(init?.headers || {}) },
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { message?: string; details?: string; error?: string; hint?: string } | null;
    throw new Error(payload?.message || payload?.details || payload?.error || payload?.hint || `Supabase request failed (${response.status})`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export async function listJournalPosts() {
  return request<JournalPost[]>('/rest/v1/journal_posts?select=*&order=updated_at.desc&limit=200');
}

export async function getJournalOptions() {
  const [categories, authors, founders, people, eventTypes] = await Promise.all([
    request<Array<{ id: string; name: string }>>('/rest/v1/journal_categories?select=id,name&order=name.asc'),
    request<Array<{ id: string; display_name: string }>>('/rest/v1/journal_authors?select=id,display_name&order=display_name.asc'),
    request<Array<{ id: string; display_name: string; slug: string }>>('/rest/v1/founder_profiles?select=id,display_name,slug&order=display_order.asc'),
    request<JourneyPerson[]>('/rest/v1/journey_people?select=id,display_name,full_name,person_type,email&order=display_name.asc&limit=500'),
    request<EventTypeOption[]>('/rest/v1/journey_entry_types?select=key,label,description&is_active=eq.true&order=display_order.asc'),
  ]);
  return {
    categories: categories.map((item) => ({ id: item.id, label: item.name })),
    authors: authors.map((item) => ({ id: item.id, label: item.display_name })),
    founders: founders.map((item) => ({ id: item.id, label: item.display_name, slug: item.slug })),
    people,
    eventTypes,
  };
}

export async function getJournalEventContext(postId: string): Promise<Partial<JournalEventPayload>> {
  const entries = await request<Array<Record<string, unknown>>>(`/rest/v1/journal_journey_entries?select=id,entry_type,occurred_at,timezone,journey_person,location_name,address_text,latitude,longitude,plus_code,featured_business_name,show_on_map,show_on_timeline,is_public_location&journal_post_id=eq.${postId}&order=created_at.asc&limit=1`);
  const entry = entries[0];
  if (!entry) return {};
  const [subjects, people] = await Promise.all([
    request<Array<{ founder_profile_id: string }>>(`/rest/v1/content_person_relations?select=founder_profile_id&journal_post_id=eq.${postId}&relationship_role=in.(primary_subject,co_subject)&order=display_order.asc`),
    request<Array<{ person_id: string }>>(`/rest/v1/journal_journey_people?select=person_id&journey_entry_id=eq.${String(entry.id)}&order=display_order.asc`),
  ]);
  return {
    subject_founder_ids: subjects.map((item) => item.founder_profile_id),
    person_ids: people.map((item) => item.person_id),
    event_type: String(entry.entry_type || 'daily_update'),
    occurred_at: String(entry.occurred_at || ''),
    timezone: String(entry.timezone || 'Europe/Madrid'),
    journey_person: String(entry.journey_person || 'together'),
    location_name: String(entry.location_name || ''),
    address_text: String(entry.address_text || ''),
    latitude: entry.latitude == null ? '' : String(entry.latitude),
    longitude: entry.longitude == null ? '' : String(entry.longitude),
    plus_code: String(entry.plus_code || ''),
    featured_business_name: String(entry.featured_business_name || ''),
    description: '',
    show_on_map: Boolean(entry.show_on_map),
    show_on_timeline: Boolean(entry.show_on_timeline),
    is_public_location: Boolean(entry.is_public_location),
  };
}

export async function getJournalAiSource(postId: string): Promise<string> {
  const rows = await request<Array<{ raw_description: string }>>(`/rest/v1/journal_ai_sources?select=raw_description&journal_post_id=eq.${postId}&limit=1`);
  return rows[0]?.raw_description || '';
}

export async function createJournalPost(payload: Partial<JournalPayload>) {
  return request<JournalPost>('/rest/v1/rpc/admin_create_journal_post', { method: 'POST', body: JSON.stringify({ payload }) });
}

export async function updateJournalPost(id: string, payload: Partial<JournalPayload>) {
  return request<JournalPost>('/rest/v1/rpc/admin_update_journal_post', { method: 'POST', body: JSON.stringify({ post_id: id, payload }) });
}

export async function deleteJournalPost(id: string) {
  return request<boolean>('/rest/v1/rpc/admin_delete_journal_post', { method: 'POST', body: JSON.stringify({ post_id: id }) });
}

export async function prepareJournalAi(
  postId: string,
  eventPayload: JournalEventPayload,
  rawDescription: string,
  sourceMetadata: Record<string, unknown>,
) {
  return request('/rest/v1/rpc/admin_prepare_journal_ai', {
    method: 'POST',
    body: JSON.stringify({
      post_id: postId,
      event_payload: eventPayload,
      raw_description: rawDescription,
      source_metadata: sourceMetadata,
    }),
  });
}

export async function getJournalAiStatus(postId: string) {
  const rows = await request<JournalAiStatus[]>('/rest/v1/rpc/admin_get_journal_ai_status', {
    method: 'POST',
    body: JSON.stringify({ post_id: postId }),
  });
  return rows[0];
}

function wait(milliseconds: number) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

function progressStage(status: JournalAiStatus): JournalAiProgressStage {
  const expected = Number(status.expected_translation_count) || 30;
  if (Number(status.translation_count) > 0 && Number(status.translation_count) < expected) return 'translating';
  if (Number(status.translation_count) >= expected || status.status === 'published') return 'publishing';
  return 'generating';
}

export async function generateJournalAiPost(
  postId: string,
  onProgress?: (stage: JournalAiProgressStage, status: JournalAiStatus) => void,
) {
  if (!supabaseUrl || !anonKey) throw new Error('Supabase configuration is missing.');

  const response = await fetch(`${supabaseUrl}/functions/v1/generate-journal-ai-post`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${token()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ post_id: postId }),
  });

  const result = await response.json().catch(() => null) as { ok?: boolean; error?: string; message?: string } | null;
  if (!response.ok || result?.ok === false) {
    throw new Error(result?.error || result?.message || `AI generation could not start (${response.status}).`);
  }

  for (let attempt = 0; attempt < 420; attempt += 1) {
    const status = await getJournalAiStatus(postId);
    if (!status) throw new Error('The saved journal post could not be found.');
    onProgress?.(progressStage(status), status);

    if (status.generation_status === 'failed') {
      throw new Error(status.last_error || 'AI generation failed.');
    }

    if (
      status.generation_status === 'completed'
      && status.status === 'published'
      && Number(status.translation_count) === Number(status.expected_translation_count)
    ) {
      return status;
    }

    await wait(1000);
  }

  throw new Error('AI generation timed out before publication was confirmed. The editor remains open so you can retry safely.');
}

export function journalEventHasPlaceContext(event: Pick<JournalEventPayload, 'featured_business_name' | 'latitude' | 'longitude'>) {
  const hasBusiness = Boolean(String(event.featured_business_name ?? '').trim());
  const hasCoords = Boolean(String(event.latitude ?? '').trim() && String(event.longitude ?? '').trim());
  return hasBusiness || hasCoords;
}

export async function generateJournalPlaceContext(postId: string) {
  if (!supabaseUrl || !anonKey) throw new Error('Supabase configuration is missing.');

  const response = await fetch(`${supabaseUrl}/functions/v1/generate-journal-place-context`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${token()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ post_id: postId }),
  });

  const result = await response.json().catch(() => null) as {
    ok?: boolean;
    skipped?: boolean;
    error?: string;
    message?: string;
    translation_count?: number;
  } | null;

  if (!response.ok || result?.ok === false) {
    throw new Error(result?.error || result?.message || `Place context generation failed (${response.status}).`);
  }

  return result;
}

export async function createJourneyPerson(payload: Record<string, unknown>) {
  return request<JourneyPerson>('/rest/v1/rpc/admin_create_journey_person', { method: 'POST', body: JSON.stringify({ payload }) });
}

export async function uploadJournalFootage(postId: string, file: File, index: number, event: JournalEventPayload) {
  if (!supabaseUrl || !anonKey) throw new Error('Supabase configuration is missing.');
  const isVideo = file.type.startsWith('video/');
  const bucket = isVideo ? 'media-videos' : 'media-images';
  const typeFolder = isVideo ? 'videos' : 'images';
  const date = new Date(event.occurred_at || Date.now());
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
  const objectPath = `journal/${year}/${month}/${postId}/${typeFolder}/${Date.now()}-${index}-${safeName}`;

  const upload = await fetch(`${supabaseUrl}/storage/v1/object/${bucket}/${objectPath}`, {
    method: 'POST',
    headers: { apikey: anonKey, Authorization: `Bearer ${token()}`, 'Content-Type': file.type, 'x-upsert': 'false' },
    body: file,
  });
  if (!upload.ok) {
    const payload = await upload.json().catch(() => null) as { message?: string } | null;
    throw new Error(payload?.message || 'Footage upload failed.');
  }

  const asset = await request<{ id: string }>('/rest/v1/rpc/admin_register_journal_footage', {
    method: 'POST',
    body: JSON.stringify({
      post_id: postId,
      bucket_name: bucket,
      object_path: objectPath,
      file_name: file.name,
      mime_type: file.type,
      file_size: file.size,
      placement_name: index === 0 ? 'hero' : 'gallery',
      display_index: index,
      asset_metadata: {
        occurred_at: event.occurred_at,
        event_type: event.event_type,
        location_name: event.location_name,
        featured_business_name: event.featured_business_name || '',
        plus_code: event.plus_code,
        latitude: event.latitude,
        longitude: event.longitude,
        subject_founder_ids: event.subject_founder_ids,
        person_ids: event.person_ids,
      },
    }),
  });
  return asset.id;
}
