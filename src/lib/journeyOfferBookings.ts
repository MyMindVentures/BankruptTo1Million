import { supabase } from './supabase';

export type JourneyOfferBookingInput = {
  exchange_item_id: string;
  offer_id?: string | null;
  calendar_entry_id: string;
  full_name: string;
  email: string;
  phone?: string;
  preferred_from: string;
  preferred_until: string;
  group_size: number | null;
  message: string;
  consent_to_contact: boolean;
};

export type JourneyOfferBookingContext = {
  exchangeItemId: string;
  offerId: string | null;
  calendarEntryId: string;
  offerTitle: string;
  stopLabel: string;
  preferredFrom: string;
  preferredUntil: string;
  catalogueSlug: string | null;
};

type JsonRecord = Record<string, unknown>;

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asNullableString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

async function readJson<T>(response: Response, fallback: string): Promise<T[]> {
  if (!response.ok) throw new Error((await response.text()) || fallback);
  return (await response.json()) as T[];
}

/** Map exchange_item_id → catalogue offer { id, slug } for active public offers. */
export async function getCatalogueOffersByExchangeItemIds(
  exchangeItemIds: string[],
): Promise<Map<string, { id: string; slug: string }>> {
  const result = new Map<string, { id: string; slug: string }>();
  const ids = [...new Set(exchangeItemIds.filter(Boolean))];
  if (!ids.length) return result;

  const rows = await readJson<JsonRecord>(
    await supabase.from('offers').request({
      query: `select=id,slug,legacy_exchange_item_id&status=eq.active&is_public=eq.true&legacy_exchange_item_id=in.(${ids.join(',')})`,
    }),
    'Catalogue offers could not be loaded.',
  );

  for (const row of rows) {
    const exchangeId = asString(row.legacy_exchange_item_id);
    const id = asString(row.id);
    const slug = asString(row.slug);
    if (exchangeId && id && slug) {
      result.set(exchangeId, { id, slug });
    }
  }
  return result;
}

/** Resolve booking context from a catalogue offer id (uses legacy_exchange_item_id). */
export async function resolveOfferBookingContextFromOfferId(
  offerId: string,
): Promise<JourneyOfferBookingContext | null> {
  const offerRows = await readJson<JsonRecord>(
    await supabase.from('offers').request({
      query: `select=id,slug,title,legacy_exchange_item_id&id=eq.${encodeURIComponent(offerId)}&status=eq.active&is_public=eq.true&limit=1`,
    }),
    'Offer could not be loaded for booking.',
  );
  const offer = offerRows[0];
  if (!offer) return null;

  const exchangeItemId = asString(offer.legacy_exchange_item_id);
  if (!exchangeItemId) return null;

  const itemRows = await readJson<JsonRecord>(
    await supabase.from('journey_exchange_items').request({
      query: `select=id,title,calendar_entry_id,item_type,status,is_public&id=eq.${encodeURIComponent(exchangeItemId)}&limit=1`,
    }),
    'Exchange offer could not be loaded for booking.',
  );
  const item = itemRows[0];
  if (!item) return null;
  if (asString(item.item_type) !== 'offer' || asString(item.status) !== 'active' || item.is_public !== true) {
    return null;
  }

  const calendarEntryId = asString(item.calendar_entry_id);
  if (!calendarEntryId) return null;

  const entryRows = await readJson<JsonRecord>(
    await supabase.from('journey_calendar_entries').request({
      query: `select=id,title,city_name,location_name,starts_on,ends_on,status,is_public&id=eq.${encodeURIComponent(calendarEntryId)}&limit=1`,
    }),
    'Calendar stop could not be loaded for booking.',
  );
  const entry = entryRows[0];
  if (!entry || entry.is_public !== true) return null;
  const status = asString(entry.status);
  if (!['planned', 'confirmed', 'travelling'].includes(status)) return null;

  const stopLabel =
    asNullableString(entry.location_name)
    || asNullableString(entry.city_name)
    || asString(entry.title);

  return {
    exchangeItemId,
    offerId: asString(offer.id),
    calendarEntryId,
    offerTitle: asString(offer.title) || asString(item.title),
    stopLabel,
    preferredFrom: asString(entry.starts_on),
    preferredUntil: asString(entry.ends_on) || asString(entry.starts_on),
    catalogueSlug: asNullableString(offer.slug),
  };
}

export async function submitJourneyOfferBooking(input: JourneyOfferBookingInput): Promise<void> {
  if (!input.consent_to_contact) {
    throw new Error('Contact consent is required.');
  }
  const response = await supabase.from('journey_offer_bookings').request({
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: {
      exchange_item_id: input.exchange_item_id,
      offer_id: input.offer_id || null,
      calendar_entry_id: input.calendar_entry_id,
      full_name: input.full_name.trim(),
      email: input.email.trim().toLowerCase(),
      phone: input.phone?.trim() || null,
      preferred_from: input.preferred_from || null,
      preferred_until: input.preferred_until || null,
      group_size: input.group_size,
      message: input.message.trim(),
      consent_to_contact: true,
    },
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Could not submit booking request.');
  }
}
