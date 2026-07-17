import { supabase } from './supabase';

export type JourneyPerson = 'kevin' | 'micha' | 'together';

export type PublicJourneyCalendarFounder = {
  id: string;
  slug: string;
  display_name: string | null;
  avatar_url: string | null;
  profile_url: string;
};

export type PublicJourneyExchangeItem = {
  id: string;
  slug: string | null;
  category: string;
  title: string;
  description: string | null;
  priority: string;
  display_order: number;
  journey_person: JourneyPerson;
};

export type PublicJourneyCalendarEntry = {
  id: string;
  slug: string;
  journey_person: JourneyPerson;
  status: string;
  starts_on: string;
  ends_on: string | null;
  date_flexibility_days: number;
  country_code: string | null;
  country_name: string | null;
  region_name: string | null;
  city_name: string | null;
  location_name: string | null;
  latitude: number | null;
  longitude: number | null;
  title: string;
  public_summary: string | null;
  purpose: string | null;
  transport_mode: string | null;
  accommodation_needed: boolean;
  accommodation_from: string | null;
  accommodation_until: string | null;
  guests_count: number;
  nights_needed: number | null;
  host_request_message: string | null;
  host_request_status: string;
  can_offer_hosting: boolean;
  is_featured: boolean;
  display_order: number;
  related_journal_post_id: string | null;
  related_journal_post_slug: string | null;
  active_language: string;
  founders: PublicJourneyCalendarFounder[];
  needs: PublicJourneyExchangeItem[];
  offers: PublicJourneyExchangeItem[];
};

export type JourneyHostOfferInput = {
  calendar_entry_id: string;
  host_name: string;
  email: string;
  phone: string;
  city_name: string;
  country_name: string;
  accommodation_type: string;
  available_from: string;
  available_until: string;
  guests_capacity: number;
  message: string;
  consent_to_contact: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asNullableString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function asNullableNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function asBoolean(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function parseFounder(value: unknown): PublicJourneyCalendarFounder | null {
  if (!isRecord(value) || typeof value.id !== 'string') return null;
  return {
    id: value.id,
    slug: asString(value.slug),
    display_name: asNullableString(value.display_name),
    avatar_url: asNullableString(value.avatar_url),
    profile_url: asString(value.profile_url, value.slug ? `/founders/${value.slug}` : ''),
  };
}

function parseExchangeItem(value: unknown): PublicJourneyExchangeItem | null {
  if (!isRecord(value) || typeof value.id !== 'string') return null;
  const person = asString(value.journey_person, 'together');
  return {
    id: value.id,
    slug: asNullableString(value.slug),
    category: asString(value.category),
    title: asString(value.title),
    description: asNullableString(value.description),
    priority: asString(value.priority, 'normal'),
    display_order: asNumber(value.display_order),
    journey_person: person === 'kevin' || person === 'micha' || person === 'together' ? person : 'together',
  };
}

function parseEntry(value: unknown): PublicJourneyCalendarEntry | null {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.starts_on !== 'string') return null;
  const person = asString(value.journey_person, 'together');
  const founders = Array.isArray(value.founders)
    ? value.founders.map(parseFounder).filter((item): item is PublicJourneyCalendarFounder => Boolean(item))
    : [];
  const needs = Array.isArray(value.needs)
    ? value.needs.map(parseExchangeItem).filter((item): item is PublicJourneyExchangeItem => Boolean(item))
    : [];
  const offers = Array.isArray(value.offers)
    ? value.offers.map(parseExchangeItem).filter((item): item is PublicJourneyExchangeItem => Boolean(item))
    : [];

  return {
    id: value.id,
    slug: asString(value.slug),
    journey_person: person === 'kevin' || person === 'micha' || person === 'together' ? person : 'together',
    status: asString(value.status),
    starts_on: value.starts_on,
    ends_on: asNullableString(value.ends_on),
    date_flexibility_days: asNumber(value.date_flexibility_days),
    country_code: asNullableString(value.country_code),
    country_name: asNullableString(value.country_name),
    region_name: asNullableString(value.region_name),
    city_name: asNullableString(value.city_name),
    location_name: asNullableString(value.location_name),
    latitude: asNullableNumber(value.latitude),
    longitude: asNullableNumber(value.longitude),
    title: asString(value.title),
    public_summary: asNullableString(value.public_summary),
    purpose: asNullableString(value.purpose),
    transport_mode: asNullableString(value.transport_mode),
    accommodation_needed: asBoolean(value.accommodation_needed),
    accommodation_from: asNullableString(value.accommodation_from),
    accommodation_until: asNullableString(value.accommodation_until),
    guests_count: asNumber(value.guests_count, 1),
    nights_needed: asNullableNumber(value.nights_needed),
    host_request_message: asNullableString(value.host_request_message),
    host_request_status: asString(value.host_request_status, 'not_needed'),
    can_offer_hosting: asBoolean(value.can_offer_hosting),
    is_featured: asBoolean(value.is_featured),
    display_order: asNumber(value.display_order),
    related_journal_post_id: asNullableString(value.related_journal_post_id),
    related_journal_post_slug: asNullableString(value.related_journal_post_slug),
    active_language: asString(value.active_language, 'en'),
    founders,
    needs,
    offers,
  };
}

/** Keep stops that have not ended before asOfDate (YYYY-MM-DD). Open-ended ends_on stays visible. */
export function isActiveOnOrAfter(
  entry: Pick<PublicJourneyCalendarEntry, 'ends_on'>,
  asOfDate: string,
): boolean {
  return entry.ends_on == null || entry.ends_on >= asOfDate;
}

export async function getLocalizedPublicJourneyCalendar(
  language: string,
  asOfDate?: string,
): Promise<PublicJourneyCalendarEntry[]> {
  const params: Record<string, string> = {
    p_language_code: language || 'en',
  };
  if (asOfDate) {
    params.p_as_of_date = asOfDate;
  }
  const response = await supabase.rpc('get_localized_public_journey_calendar', params);
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Could not load the public journey calendar.');
  }
  const payload = await response.json();
  if (!Array.isArray(payload)) {
    throw new Error('Public journey calendar payload was malformed.');
  }
  const rows = payload
    .map(parseEntry)
    .filter((entry): entry is PublicJourneyCalendarEntry => Boolean(entry));
  if (!asOfDate) return rows;
  return rows.filter((entry) => isActiveOnOrAfter(entry, asOfDate));
}

export async function submitJourneyHostOffer(input: JourneyHostOfferInput): Promise<void> {
  const response = await supabase.from('journey_host_offers').request({
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: {
      calendar_entry_id: input.calendar_entry_id,
      host_name: input.host_name.trim(),
      email: input.email.trim().toLowerCase(),
      phone: input.phone.trim() || null,
      city_name: input.city_name.trim() || null,
      country_name: input.country_name.trim() || null,
      accommodation_type: input.accommodation_type.trim() || null,
      available_from: input.available_from || null,
      available_until: input.available_until || null,
      guests_capacity: input.guests_capacity,
      message: input.message.trim(),
      consent_to_contact: input.consent_to_contact,
    },
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Could not submit hosting offer.');
  }
}
