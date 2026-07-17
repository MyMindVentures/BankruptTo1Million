import { canShowFootageOnlyUpload, canUploadFootageOnly, parseJournalOverviewPayload, type JournalPost, type JournalPostStatus, type JournalStatusCounts } from './journalAdminPayload';
import {
  JOURNAL_PUBLICATION_PIPELINE_STEP_ORDER,
  parseJournalPublicationStatus,
  type JournalPublicationStatus,
  type PublicationStep,
  type PublicationStepStatus,
} from './journalPublicationStatus';

export type { JournalPost, JournalPostStatus, JournalStatusCounts };
export { canShowFootageOnlyUpload, canUploadFootageOnly };
export type {
  JournalPublicationStatus,
  PublicationStep,
  PublicationStepStatus,
};
export { JOURNAL_PUBLICATION_PIPELINE_STEP_ORDER, parseJournalPublicationStatus };
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
export type AdminJournalFootageItem = {
  asset_id: string;
  asset_type: 'image' | 'video';
  storage_bucket: string;
  storage_path: string;
  thumbnail_url: string | null;
  mime_type: string | null;
  alt_text: string | null;
  caption: string | null;
  display_order: number;
  created_at: string;
  captured_at: string | null;
  original_filename: string | null;
};

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
    cache: 'no-store',
    headers: { apikey: anonKey, Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json', ...(init?.headers || {}) },
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { message?: string; details?: string; error?: string; hint?: string } | null;
    throw new Error(payload?.message || payload?.details || payload?.error || payload?.hint || `Supabase request failed (${response.status})`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export async function getJournalOverview(input?: {
  status?: JournalPostStatus | 'all' | null;
  query?: string;
  limit?: number;
  offset?: number;
}) {
  const payload = await request<unknown>('/rest/v1/rpc/admin_get_journal_overview', {
    method: 'POST',
    body: JSON.stringify({
      p_status: input?.status && input.status !== 'all' ? input.status : null,
      p_query: input?.query ?? null,
      p_limit: input?.limit ?? 200,
      p_offset: input?.offset ?? 0,
    }),
  });
  const overview = parseJournalOverviewPayload(payload);
  return {
    rows: overview.rows,
    counts: overview.counts as JournalStatusCounts,
  };
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

type JournalAiBatchResult = {
  ok?: boolean;
  complete?: boolean;
  has_more?: boolean;
  error?: string;
  message?: string;
};

async function invokeJournalAiBatch(postId: string): Promise<JournalAiBatchResult | null> {
  const response = await fetch(`${supabaseUrl}/functions/v1/generate-journal-ai-post`, {
    method: 'POST',
    headers: {
      apikey: anonKey!,
      Authorization: `Bearer ${token()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ post_id: postId }),
  });

  const result = await response.json().catch(() => null) as JournalAiBatchResult | null;

  if (response.status === 504) {
    return { ok: true, has_more: true };
  }

  if (!response.ok || result?.ok === false) {
    throw new Error(result?.error || result?.message || `AI generation failed (${response.status}).`);
  }

  return result;
}

export async function generateJournalAiPost(
  postId: string,
  onProgress?: (stage: JournalAiProgressStage, status: JournalAiStatus) => void,
) {
  if (!supabaseUrl || !anonKey) throw new Error('Supabase configuration is missing.');

  let hasMore = true;
  let invokeCount = 0;
  const maxInvocations = 40;

  while (hasMore && invokeCount < maxInvocations) {
    invokeCount += 1;
    const result = await invokeJournalAiBatch(postId);
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

    hasMore = Boolean(result?.has_more) && status.generation_status !== 'completed';
    if (result?.complete === true) {
      hasMore = false;
    }
  }

  for (let attempt = 0; attempt < 600; attempt += 1) {
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

  type PlaceContextBatchResult = {
    ok?: boolean;
    complete?: boolean;
    has_more?: boolean;
    skipped?: boolean;
    error?: string;
    message?: string;
    translation_count?: number;
  };

  let hasMore = true;
  let invokeCount = 0;
  const maxInvocations = 40;
  let lastResult: PlaceContextBatchResult | null = null;

  while (hasMore && invokeCount < maxInvocations) {
    invokeCount += 1;
    const response = await fetch(`${supabaseUrl}/functions/v1/generate-journal-place-context`, {
      method: 'POST',
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${token()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ post_id: postId }),
    });

    const result = await response.json().catch(() => null) as PlaceContextBatchResult | null;

    if (response.status === 504) {
      lastResult = { ok: true, has_more: true };
      await wait(1500);
      continue;
    }

    if (!response.ok || result?.ok === false) {
      throw new Error(result?.error || result?.message || `Place context generation failed (${response.status}).`);
    }

    lastResult = result;
    if (result?.skipped) return result;
    hasMore = Boolean(result?.has_more) && result?.complete !== true;
    if (result?.complete === true) return result;
  }

  if (lastResult?.complete === true || lastResult?.skipped) return lastResult;
  throw new Error('Place context generation timed out before completion.');
}

export async function generateJournalVenueThankYou(postId: string) {
  if (!supabaseUrl || !anonKey) throw new Error('Supabase configuration is missing.');

  type VenueThankYouBatchResult = {
    ok?: boolean;
    complete?: boolean;
    has_more?: boolean;
    skipped?: boolean;
    error?: string;
    message?: string;
    translation_count?: number;
  };

  let hasMore = true;
  let invokeCount = 0;
  const maxInvocations = 40;
  let lastResult: VenueThankYouBatchResult | null = null;

  while (hasMore && invokeCount < maxInvocations) {
    invokeCount += 1;
    const response = await fetch(`${supabaseUrl}/functions/v1/generate-journal-venue-thank-you`, {
      method: 'POST',
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${token()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ post_id: postId }),
    });

    const result = await response.json().catch(() => null) as VenueThankYouBatchResult | null;

    if (response.status === 504) {
      lastResult = { ok: true, has_more: true };
      await wait(1500);
      continue;
    }

    if (!response.ok || result?.ok === false) {
      throw new Error(result?.error || result?.message || `Venue thank-you generation failed (${response.status}).`);
    }

    lastResult = result;
    if (result?.skipped) return result;
    hasMore = Boolean(result?.has_more) && result?.complete !== true;
    if (result?.complete === true) return result;
  }

  if (lastResult?.complete === true || lastResult?.skipped) return lastResult;
  throw new Error('Venue thank-you generation timed out before completion.');
}

export async function createJourneyPerson(payload: Record<string, unknown>) {
  return request<JourneyPerson>('/rest/v1/rpc/admin_create_journey_person', { method: 'POST', body: JSON.stringify({ payload }) });
}

export async function uploadJournalFootage(postId: string, file: File, event: JournalEventPayload) {
  if (!supabaseUrl || !anonKey) throw new Error('Supabase configuration is missing.');

  const form = new FormData();
  form.append('post_id', postId);
  form.append('file', file, file.name);
  form.append('asset_metadata', JSON.stringify({
    occurred_at: event.occurred_at,
    event_type: event.event_type,
    location_name: event.location_name,
    featured_business_name: event.featured_business_name || '',
    plus_code: event.plus_code,
    latitude: event.latitude,
    longitude: event.longitude,
    subject_founder_ids: event.subject_founder_ids,
    person_ids: event.person_ids,
  }));

  const response = await fetch(`${supabaseUrl}/functions/v1/upload-journal-footage`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${token()}`,
    },
    body: form,
  });

  const payload = await response.json().catch(() => null) as {
    ok?: boolean;
    asset_id?: string;
    error?: string;
  } | null;

  if (!response.ok || payload?.ok === false) {
    throw new Error(payload?.error || `Footage upload failed (${response.status}).`);
  }

  if (!payload?.asset_id) throw new Error('Footage upload did not return an asset id.');
  return payload.asset_id;
}

export async function getAdminJournalFootage(postId: string) {
  const rows = await request<AdminJournalFootageItem[]>('/rest/v1/rpc/admin_get_journal_footage', {
    method: 'POST',
    body: JSON.stringify({ p_post_id: postId }),
  });
  return rows;
}

export async function appendJournalFootage(postId: string, files: File[], event: JournalEventPayload) {
  const assetIds: string[] = [];
  for (const file of files) {
    assetIds.push(await uploadJournalFootage(postId, file, event));
  }
  return assetIds;
}

function journalEventLocalNow() {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
}

export function journalEventDefaults(partial?: Partial<JournalEventPayload>): JournalEventPayload {
  return {
    subject_founder_ids: partial?.subject_founder_ids ?? [],
    person_ids: partial?.person_ids ?? [],
    event_type: partial?.event_type || 'daily_update',
    occurred_at: partial?.occurred_at || journalEventLocalNow(),
    timezone: partial?.timezone || 'Europe/Madrid',
    journey_person: partial?.journey_person || 'together',
    location_name: partial?.location_name || '',
    address_text: partial?.address_text || '',
    latitude: partial?.latitude || '',
    longitude: partial?.longitude || '',
    plus_code: partial?.plus_code || '',
    featured_business_name: partial?.featured_business_name || '',
    description: partial?.description || '',
    show_on_map: partial?.show_on_map ?? false,
    show_on_timeline: partial?.show_on_timeline ?? true,
    is_public_location: partial?.is_public_location ?? true,
  };
}

export async function deleteJournalFootage(postId: string, assetId: string): Promise<{
  deleted: boolean;
  unlinked: boolean;
  cover_cleared?: boolean;
}> {
  if (!supabaseUrl || !anonKey) throw new Error('Supabase configuration is missing.');

  const response = await fetch(`${supabaseUrl}/functions/v1/delete-journal-footage`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${token()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ post_id: postId, asset_id: assetId }),
  });

  const payload = await response.json().catch(() => null) as {
    ok?: boolean;
    deleted?: boolean;
    unlinked?: boolean;
    cover_cleared?: boolean;
    error?: string;
  } | null;

  if (!response.ok || payload?.ok === false) {
    throw new Error(payload?.error || `Footage delete failed (${response.status}).`);
  }

  return {
    deleted: Boolean(payload?.deleted),
    unlinked: payload?.unlinked !== false,
    cover_cleared: Boolean(payload?.cover_cleared),
  };
}

export async function getJournalPublicationStatus(postId: string) {
  const payload = await request<unknown>('/rest/v1/rpc/admin_get_journal_publication_status', {
    method: 'POST',
    body: JSON.stringify({ p_post_id: postId }),
  });
  return parseJournalPublicationStatus(payload);
}

export async function startJournalPublication(postId: string, hasLocation: boolean) {
  return request<Record<string, unknown>>('/rest/v1/rpc/admin_start_journal_publication', {
    method: 'POST',
    body: JSON.stringify({ p_post_id: postId, p_has_location: hasLocation }),
  });
}

export async function finalizeJournalPublication(postId: string) {
  return request<Record<string, unknown>>('/rest/v1/rpc/finalize_journal_publication', {
    method: 'POST',
    body: JSON.stringify({ p_post_id: postId }),
  });
}

type EdgePhaseResult = {
  ok?: boolean;
  error?: string;
  message?: string;
  complete?: boolean;
  skipped?: boolean;
};

async function invokeStoryEdge(postId: string, phase: 'english' | 'translate' | 'auto') {
  const response = await fetch(`${supabaseUrl}/functions/v1/generate-journal-ai-post`, {
    method: 'POST',
    headers: {
      apikey: anonKey!,
      Authorization: `Bearer ${token()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ post_id: postId, phase }),
  });

  const result = await response.json().catch(() => null) as EdgePhaseResult | null;
  if (response.status === 504) return result;
  if (!response.ok || result?.ok === false) {
    throw new Error(result?.error || result?.message || `Story AI ${phase} failed (${response.status}).`);
  }
  return result;
}

async function invokePlaceEdge(
  postId: string,
  phase: 'place_english' | 'area_english' | 'thank_you_english' | 'translate' | 'auto',
) {
  const response = await fetch(`${supabaseUrl}/functions/v1/generate-journal-place-context`, {
    method: 'POST',
    headers: {
      apikey: anonKey!,
      Authorization: `Bearer ${token()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ post_id: postId, phase }),
  });

  const result = await response.json().catch(() => null) as EdgePhaseResult | null;
  if (response.status === 504) return result;
  if (!response.ok || result?.ok === false) {
    throw new Error(result?.error || result?.message || `Place context ${phase} failed (${response.status}).`);
  }
  return result;
}

function publicationHasPendingTranslateSteps(status: JournalPublicationStatus) {
  return status.steps.some((step) => (
    step.step_key.startsWith('translate_batch_')
    && step.status !== 'completed'
    && step.status !== 'skipped'
  ));
}

function failedPublicationStep(status: JournalPublicationStatus) {
  return status.steps.find((step) => step.status === 'failed') ?? null;
}

export async function publishJournalPost(
  postId: string,
  eventHasPlaceContext: boolean,
  onProgress?: (status: JournalPublicationStatus) => void,
) {
  if (!supabaseUrl || !anonKey) throw new Error('Supabase configuration is missing.');

  await startJournalPublication(postId, eventHasPlaceContext);
  let status = await getJournalPublicationStatus(postId);
  onProgress?.(status);

  const stepStatus = (stepKey: string) => (
    status.steps.find((step) => step.step_key === stepKey)?.status ?? null
  );

  if (stepStatus('story_english') !== 'completed') {
    await invokeStoryEdge(postId, 'english');
    status = await getJournalPublicationStatus(postId);
    onProgress?.(status);
    const storyEnglishFailure = failedPublicationStep(status);
    if (storyEnglishFailure) {
      throw new Error(storyEnglishFailure.last_error || 'English story generation failed.');
    }
  }

  if (eventHasPlaceContext) {
    if (stepStatus('place_english') !== 'completed') {
      await invokePlaceEdge(postId, 'place_english');
      status = await getJournalPublicationStatus(postId);
      onProgress?.(status);
      const placeFailure = failedPublicationStep(status);
      if (placeFailure) throw new Error(placeFailure.last_error || 'Place English generation failed.');
    }

    if (stepStatus('area_english') !== 'completed') {
      await invokePlaceEdge(postId, 'area_english');
      status = await getJournalPublicationStatus(postId);
      onProgress?.(status);
      const areaFailure = failedPublicationStep(status);
      if (areaFailure) throw new Error(areaFailure.last_error || 'Area English generation failed.');
    }

    if (stepStatus('thank_you_english') !== 'completed') {
      await invokePlaceEdge(postId, 'thank_you_english');
      status = await getJournalPublicationStatus(postId);
      onProgress?.(status);
      const thankYouFailure = failedPublicationStep(status);
      if (thankYouFailure) throw new Error(thankYouFailure.last_error || 'Thank-you English generation failed.');
    }
  }

  // Refresh after optional english skips so pending translate detection is current.
  status = await getJournalPublicationStatus(postId);
  onProgress?.(status);

  let safety = 0;
  while (publicationHasPendingTranslateSteps(status) && safety < 40) {
    safety += 1;
    await invokeStoryEdge(postId, 'translate');
    if (eventHasPlaceContext) {
      await invokePlaceEdge(postId, 'translate');
    }
    status = await getJournalPublicationStatus(postId);
    onProgress?.(status);
    const batchFailure = failedPublicationStep(status);
    if (batchFailure) {
      throw new Error(batchFailure.last_error || 'Translation batch failed.');
    }
    await wait(500);
  }

  if (publicationHasPendingTranslateSteps(status)) {
    throw new Error('Translation batches did not complete before the safety limit.');
  }

  await finalizeJournalPublication(postId);
  status = await getJournalPublicationStatus(postId);
  onProgress?.(status);

  if (status.run?.status !== 'completed') {
    throw new Error(status.run?.last_error || 'Publication finalize did not complete.');
  }

  return status;
}

export type JournalSocialCreative = {
  id: string;
  journal_post_id: string;
  source_media_asset_id: string;
  status: 'pending' | 'generating' | 'ready' | 'failed';
  hook_text: string | null;
  caption_instagram_feed: string | null;
  caption_instagram_story: string | null;
  caption_x: string | null;
  model_image: string | null;
  model_caption: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  image_ig_feed_url: string | null;
  image_ig_story_url: string | null;
  image_x_url: string | null;
  source_image_url: string | null;
};

export async function getJournalSocialCreatives(postId: string) {
  return request<JournalSocialCreative[]>('/rest/v1/rpc/admin_get_journal_social_creatives', {
    method: 'POST',
    body: JSON.stringify({ p_post_id: postId }),
  });
}

export async function generateJournalSocialCreative(postId: string, sourceMediaAssetId: string) {
  if (!supabaseUrl || !anonKey) throw new Error('Supabase configuration is missing.');

  const response = await fetch(`${supabaseUrl}/functions/v1/generate-journal-social-creative`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${token()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      post_id: postId,
      source_media_asset_id: sourceMediaAssetId,
    }),
  });

  const payload = await response.json().catch(() => null) as {
    ok?: boolean;
    creative_id?: string;
    status?: string;
    error?: string;
  } | null;

  if (!response.ok || payload?.ok === false) {
    throw new Error(payload?.error || `Social creative generation failed (${response.status}).`);
  }

  return payload;
}

