import { getAdminSession } from './adminApi';

export type CalendarEntryStatus = 'idea' | 'planned' | 'confirmed' | 'travelling' | 'completed' | 'cancelled';
export type JourneyPerson = 'kevin' | 'micha' | 'together';
export type HostRequestStatus = 'not_needed' | 'open' | 'offers_received' | 'matched' | 'closed';
export type HostOfferStatus = 'new' | 'reviewing' | 'contacted' | 'accepted' | 'declined' | 'withdrawn';
export type OfferBookingStatus = 'new' | 'reviewed' | 'accepted' | 'declined' | 'cancelled';
export type ExchangeItemType = 'need' | 'offer';
export type ExchangeItemStatus = 'draft' | 'active' | 'fulfilled' | 'paused' | 'archived';
export type ExchangePriority = 'low' | 'normal' | 'high' | 'urgent';
export type ExchangeType = 'free' | 'barter' | 'donation' | 'paid' | 'mixed';

export type CalendarFounderOption = {
  id: string;
  slug: string;
  display_name: string;
  is_public: boolean;
};

export type CalendarOverviewRow = {
  id: string;
  title: string;
  slug: string;
  journey_person: JourneyPerson;
  status: CalendarEntryStatus;
  starts_on: string;
  ends_on: string | null;
  country_code: string | null;
  country_name: string | null;
  city_name: string | null;
  location_name: string | null;
  accommodation_needed: boolean;
  host_request_status: HostRequestStatus;
  is_public: boolean;
  is_featured: boolean;
  display_order: number;
  updated_at: string;
  created_at: string;
  open_host_offers: number;
  exchange_item_count: number;
};

export type CalendarStatusCounts = Record<CalendarEntryStatus | 'all', number>;
export type HostOfferCounts = Record<HostOfferStatus | 'all', number>;
export type OfferBookingCounts = Record<OfferBookingStatus | 'all', number>;
export type ExchangeStatusCounts = Record<ExchangeItemStatus | 'all', number>;

export type CalendarOverview = {
  rows: CalendarOverviewRow[];
  counts: CalendarStatusCounts;
  host_offer_counts: HostOfferCounts;
  founders: CalendarFounderOption[];
};

export type CalendarEntry = {
  id: string;
  title: string;
  slug: string;
  journey_person: JourneyPerson;
  status: CalendarEntryStatus;
  starts_on: string;
  ends_on: string | null;
  date_flexibility_days: number;
  timezone: string | null;
  country_code: string | null;
  country_name: string | null;
  region_name: string | null;
  city_name: string | null;
  location_name: string | null;
  latitude: number | null;
  longitude: number | null;
  public_summary: string | null;
  purpose: string | null;
  transport_mode: string | null;
  accommodation_needed: boolean;
  accommodation_from: string | null;
  accommodation_until: string | null;
  guests_count: number;
  nights_needed: number | null;
  host_request_message: string | null;
  host_request_status: HostRequestStatus;
  is_public: boolean;
  is_featured: boolean;
  display_order: number;
  related_journal_post_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type CalendarEntryFounder = {
  founder_profile_id: string;
  display_order: number;
  display_name: string;
  slug: string;
};

export type ExchangeItem = {
  id: string;
  calendar_entry_id: string | null;
  journey_person: JourneyPerson;
  item_type: ExchangeItemType;
  category: string;
  title: string;
  description: string | null;
  quantity: number | null;
  unit: string | null;
  priority: ExchangePriority;
  status: ExchangeItemStatus;
  is_public: boolean;
  display_order: number;
  slug: string | null;
  tagline: string | null;
  full_description: string | null;
  exchange_type: ExchangeType;
  currency: string;
  is_featured: boolean;
  updated_at?: string;
  created_at?: string;
  calendar_entry_title?: string | null;
  calendar_entry_slug?: string | null;
};

export type TranslationSummary = {
  entity_type?: string;
  entity_id?: string;
  expected_languages?: number;
  total: number;
  draft: number;
  machine: number;
  reviewed: number;
  published: number;
  languages: Array<{ language_code: string; translation_status: string; updated_at: string }>;
};

export type CalendarEntryDetail = {
  entry: CalendarEntry;
  founders: CalendarEntryFounder[];
  exchange_items: ExchangeItem[];
  translations: TranslationSummary;
};

export type HostOffer = {
  id: string;
  calendar_entry_id: string;
  host_name: string;
  email: string;
  phone: string | null;
  city_name: string | null;
  country_name: string | null;
  accommodation_type: string | null;
  available_from: string | null;
  available_until: string | null;
  guests_capacity: number | null;
  message: string;
  house_rules: string | null;
  accessibility_notes: string | null;
  consent_to_contact: boolean;
  consent_to_public_thanks: boolean;
  status: HostOfferStatus;
  internal_notes: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  calendar_entry_title?: string;
  calendar_entry_slug?: string;
  calendar_entry_city?: string | null;
};

export type OfferBooking = {
  id: string;
  exchange_item_id: string;
  offer_id: string | null;
  calendar_entry_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  preferred_from: string | null;
  preferred_until: string | null;
  group_size: number | null;
  message: string;
  consent_to_contact: boolean;
  status: OfferBookingStatus;
  internal_notes: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  exchange_item_title?: string;
  exchange_item_slug?: string | null;
  offer_title?: string | null;
  offer_slug?: string | null;
  calendar_entry_title?: string;
  calendar_entry_slug?: string;
  calendar_entry_city?: string | null;
};

export type CalendarEntryPayload = {
  id?: string;
  title: string;
  slug: string;
  journey_person: JourneyPerson;
  status: CalendarEntryStatus;
  starts_on: string;
  ends_on?: string | null;
  date_flexibility_days?: number;
  timezone?: string | null;
  country_code?: string | null;
  country_name?: string | null;
  region_name?: string | null;
  city_name?: string | null;
  location_name?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  public_summary?: string | null;
  purpose?: string | null;
  transport_mode?: string | null;
  accommodation_needed?: boolean;
  accommodation_from?: string | null;
  accommodation_until?: string | null;
  guests_count?: number;
  nights_needed?: number | null;
  host_request_message?: string | null;
  host_request_status?: HostRequestStatus;
  is_public?: boolean;
  is_featured?: boolean;
  display_order?: number;
  related_journal_post_id?: string | null;
};

export type ExchangeItemPayload = {
  id?: string;
  calendar_entry_id?: string | null;
  title: string;
  item_type: ExchangeItemType;
  category?: string;
  description?: string | null;
  quantity?: number | null;
  unit?: string | null;
  priority?: ExchangePriority;
  status?: ExchangeItemStatus;
  journey_person?: JourneyPerson;
  exchange_type?: ExchangeType;
  is_public?: boolean;
  display_order?: number;
  slug?: string | null;
  tagline?: string | null;
  full_description?: string | null;
  currency?: string;
  is_featured?: boolean;
};

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '');
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

function headers() {
  const token = getAdminSession()?.access_token;
  if (!supabaseUrl || !anonKey || !token) throw new Error('No valid admin session.');
  return {
    apikey: anonKey,
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
  };
}

async function parse<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null) as { message?: string; details?: string; hint?: string } | T | null;
  if (!response.ok) {
    const errorPayload = payload as { message?: string; details?: string; hint?: string } | null;
    throw new Error(errorPayload?.message || errorPayload?.details || errorPayload?.hint || `Supabase request failed (${response.status})`);
  }
  return payload as T;
}

async function rpc<T>(name: string, body: Record<string, unknown> = {}): Promise<T> {
  return parse(await fetch(`${supabaseUrl}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
    cache: 'no-store',
  }));
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

function asCounts<T extends string>(value: unknown, keys: readonly T[]): Record<T | 'all', number> {
  const source = asRecord(value);
  const result = { all: Number(source.all ?? 0) } as Record<T | 'all', number>;
  for (const key of keys) result[key] = Number(source[key] ?? 0);
  return result;
}

const entryStatuses = ['idea', 'planned', 'confirmed', 'travelling', 'completed', 'cancelled'] as const;
const hostStatuses = ['new', 'reviewing', 'contacted', 'accepted', 'declined', 'withdrawn'] as const;
const offerBookingStatuses = ['new', 'reviewed', 'accepted', 'declined', 'cancelled'] as const;
const exchangeStatuses = ['draft', 'active', 'fulfilled', 'paused', 'archived'] as const;

export async function getJourneyCalendarOverview(input?: {
  status?: string | null;
  query?: string | null;
}): Promise<CalendarOverview> {
  const payload = asRecord(await rpc('admin_get_journey_calendar_overview', {
    p_status: input?.status || null,
    p_query: input?.query || null,
  }));
  return {
    rows: asArray<CalendarOverviewRow>(payload.rows),
    counts: asCounts(payload.counts, entryStatuses),
    host_offer_counts: asCounts(payload.host_offer_counts, hostStatuses),
    founders: asArray<CalendarFounderOption>(payload.founders),
  };
}

export async function getJourneyCalendarEntry(entryId: string): Promise<CalendarEntryDetail> {
  const payload = asRecord(await rpc('admin_get_journey_calendar_entry', { p_entry_id: entryId }));
  const translations = asRecord(payload.translations);
  return {
    entry: payload.entry as CalendarEntry,
    founders: asArray<CalendarEntryFounder>(payload.founders),
    exchange_items: asArray<ExchangeItem>(payload.exchange_items),
    translations: {
      total: Number(translations.total ?? 0),
      draft: Number(translations.draft ?? 0),
      machine: Number(translations.machine ?? 0),
      reviewed: Number(translations.reviewed ?? 0),
      published: Number(translations.published ?? 0),
      languages: asArray(translations.languages),
      expected_languages: Number(translations.expected_languages ?? 0),
    },
  };
}

export async function upsertJourneyCalendarEntry(payload: CalendarEntryPayload): Promise<CalendarEntry> {
  return rpc('admin_upsert_journey_calendar_entry', { p_payload: payload });
}

export async function deleteJourneyCalendarEntry(entryId: string): Promise<CalendarEntry> {
  return rpc('admin_delete_journey_calendar_entry', { p_entry_id: entryId });
}

export async function setJourneyCalendarFounders(entryId: string, founderIds: string[]): Promise<CalendarEntryFounder[]> {
  return asArray(await rpc('admin_set_journey_calendar_founders', {
    p_entry_id: entryId,
    p_founder_ids: founderIds,
  }));
}

export async function upsertJourneyExchangeItem(payload: ExchangeItemPayload): Promise<ExchangeItem> {
  return rpc('admin_upsert_journey_exchange_item', { p_payload: payload });
}

export async function listJourneyExchangeItems(input?: {
  calendarEntryId?: string | null;
  status?: string | null;
  query?: string | null;
}): Promise<{ rows: ExchangeItem[]; counts: ExchangeStatusCounts }> {
  const payload = asRecord(await rpc('admin_list_journey_exchange_items', {
    p_calendar_entry_id: input?.calendarEntryId || null,
    p_status: input?.status || null,
    p_query: input?.query || null,
  }));
  return {
    rows: asArray<ExchangeItem>(payload.rows),
    counts: asCounts(payload.counts, exchangeStatuses),
  };
}

export async function listJourneyHostOffers(input?: {
  status?: string | null;
  calendarEntryId?: string | null;
  query?: string | null;
}): Promise<{ rows: HostOffer[]; counts: HostOfferCounts }> {
  const payload = asRecord(await rpc('admin_list_journey_host_offers', {
    p_status: input?.status || null,
    p_calendar_entry_id: input?.calendarEntryId || null,
    p_query: input?.query || null,
  }));
  return {
    rows: asArray<HostOffer>(payload.rows),
    counts: asCounts(payload.counts, hostStatuses),
  };
}

export async function updateJourneyHostOffer(input: {
  offerId: string;
  status: HostOfferStatus;
  internalNotes?: string | null;
}): Promise<HostOffer> {
  return rpc('admin_update_journey_host_offer', {
    p_offer_id: input.offerId,
    p_status: input.status,
    p_internal_notes: input.internalNotes ?? null,
  });
}

export async function listJourneyOfferBookings(input?: {
  status?: string | null;
  calendarEntryId?: string | null;
  query?: string | null;
}): Promise<{ rows: OfferBooking[]; counts: OfferBookingCounts }> {
  const payload = asRecord(await rpc('admin_list_journey_offer_bookings', {
    p_status: input?.status || null,
    p_calendar_entry_id: input?.calendarEntryId || null,
    p_query: input?.query || null,
  }));
  return {
    rows: asArray<OfferBooking>(payload.rows),
    counts: asCounts(payload.counts, offerBookingStatuses),
  };
}

export async function updateJourneyOfferBooking(input: {
  bookingId: string;
  status: OfferBookingStatus;
  internalNotes?: string | null;
}): Promise<OfferBooking> {
  return rpc('admin_update_journey_offer_booking', {
    p_booking_id: input.bookingId,
    p_status: input.status,
    p_internal_notes: input.internalNotes ?? null,
  });
}

export async function getJourneyCalendarTranslationStatus(input: {
  entryId?: string | null;
  exchangeItemId?: string | null;
}): Promise<{ entry: TranslationSummary | null; exchange_item: TranslationSummary | null }> {
  const payload = asRecord(await rpc('admin_get_journey_calendar_translation_status', {
    p_entry_id: input.entryId || null,
    p_exchange_item_id: input.exchangeItemId || null,
  }));
  return {
    entry: (payload.entry as TranslationSummary | null) || null,
    exchange_item: (payload.exchange_item as TranslationSummary | null) || null,
  };
}

export async function requeueJourneyCalendarTranslations(input: {
  entityType: 'journey_calendar_entry' | 'journey_exchange_item';
  entityId: string;
}): Promise<{ entity_type: string; entity_id: string; job_id: string | null; queued: boolean }> {
  return rpc('admin_requeue_journey_calendar_translations', {
    p_entity_type: input.entityType,
    p_entity_id: input.entityId,
  });
}

export type LookupKind = 'transport_mode' | 'exchange_category' | 'timezone_preset';

export type LookupOption = {
  id: string;
  kind: LookupKind;
  option_key: string;
  label: string;
  sort_order: number;
  is_active: boolean;
  metadata?: Record<string, unknown>;
  updated_at?: string;
};

export type JournalPostSearchResult = {
  id: string;
  title: string;
  slug: string;
  status: string;
  published_at: string | null;
  created_at: string;
};

export async function listJourneyLookupOptions(input?: {
  kind?: LookupKind | null;
  includeInactive?: boolean;
}): Promise<LookupOption[]> {
  const payload = asRecord(await rpc('admin_list_journey_lookup_options', {
    p_kind: input?.kind || null,
    p_include_inactive: Boolean(input?.includeInactive),
  }));
  return asArray<LookupOption>(payload.rows);
}

export async function upsertJourneyLookupOption(payload: {
  id?: string;
  kind: LookupKind;
  option_key: string;
  label: string;
  sort_order?: number;
  is_active?: boolean;
}): Promise<LookupOption> {
  return rpc('admin_upsert_journey_lookup_option', { p_payload: payload });
}

export async function setJourneyCalendarExchangeItems(
  entryId: string,
  itemIds: string[],
): Promise<ExchangeItem[]> {
  return asArray(await rpc('admin_set_journey_calendar_exchange_items', {
    p_entry_id: entryId,
    p_item_ids: itemIds,
  }));
}

export async function searchJournalPosts(input?: {
  query?: string | null;
  limit?: number;
}): Promise<JournalPostSearchResult[]> {
  const payload = asRecord(await rpc('admin_search_journal_posts', {
    p_query: input?.query || null,
    p_limit: input?.limit ?? 25,
  }));
  return asArray<JournalPostSearchResult>(payload.rows);
}

export function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}
