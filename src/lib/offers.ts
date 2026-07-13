import { supabase } from './supabase';

export type OfferFounder = {
  id: string;
  slug: string;
  displayName: string;
  roleTitle: string;
  avatarUrl: string;
  founderRole: string;
  isPrimary: boolean;
};

export type OfferMediaItem = {
  id: string;
  kind: 'image' | 'video' | 'document';
  title: string;
  description: string;
  caption: string;
  altText: string;
  url: string;
  thumbnailUrl: string;
  durationSeconds: number | null;
  placement: string;
  isFeatured: boolean;
};

export type OfferMediaCollection = {
  id: string;
  slug: string;
  title: string;
  description: string;
  occurredOn: string | null;
  location: string;
  coverUrl: string;
  items: OfferMediaItem[];
};

export type PublicOffer = {
  id: string;
  slug: string;
  title: string;
  tagline: string;
  shortDescription: string;
  fullDescription: string;
  personalStory: string;
  category: string;
  offerType: string;
  cardImageUrl: string;
  highlights: string[];
  whatIsIncluded: string[];
  suitableFor: string[];
  requirements: string[];
  durationMinutes: number | null;
  availabilityText: string;
  locationText: string;
  exchangeType: string;
  priceAmount: number | null;
  currency: string;
  ctaLabel: string;
  secondaryCtaLabel: string;
  isFeatured: boolean;
  founders: OfferFounder[];
  collections: OfferMediaCollection[];
};

type JsonRecord = Record<string, unknown>;

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function publicStorageUrl(asset: JsonRecord | null | undefined): string {
  if (!asset) return '';
  const externalUrl = asString(asset.external_url);
  if (externalUrl) return externalUrl;
  const bucket = asString(asset.storage_bucket);
  const path = asString(asset.storage_path);
  return bucket && path ? `${supabase.url}/storage/v1/object/public/${encodeURIComponent(bucket)}/${path.split('/').map(encodeURIComponent).join('/')}` : '';
}

async function readJson(response: Response, fallback: string): Promise<JsonRecord[]> {
  if (!response.ok) throw new Error((await response.text()) || fallback);
  return await response.json() as JsonRecord[];
}

async function getFounders(offerIds: string[]): Promise<Map<string, OfferFounder[]>> {
  const result = new Map<string, OfferFounder[]>();
  if (!offerIds.length) return result;
  const query = `select=offer_id,founder_role,is_primary,display_order,founder_profiles(id,slug,display_name,role_title,avatar_url)&offer_id=in.(${offerIds.join(',')})&order=display_order.asc`;
  const rows = await readJson(await supabase.from('offer_founders').request({ query }), 'Offer founders could not be loaded.');
  rows.forEach((row) => {
    const profile = row.founder_profiles as JsonRecord | null;
    if (!profile) return;
    const founder: OfferFounder = {
      id: asString(profile.id),
      slug: asString(profile.slug),
      displayName: asString(profile.display_name),
      roleTitle: asString(profile.role_title),
      avatarUrl: asString(profile.avatar_url),
      founderRole: asString(row.founder_role),
      isPrimary: Boolean(row.is_primary),
    };
    const offerId = asString(row.offer_id);
    result.set(offerId, [...(result.get(offerId) || []), founder]);
  });
  return result;
}

async function getCollections(offerId: string): Promise<OfferMediaCollection[]> {
  const collectionQuery = `select=id,slug,title,description,occurred_on,location_text,cover_asset_id,display_order&offer_id=eq.${encodeURIComponent(offerId)}&is_public=eq.true&order=display_order.asc,occurred_on.desc`;
  const collections = await readJson(await supabase.from('offer_media_collections').request({ query: collectionQuery }), 'Offer footage could not be loaded.');
  if (!collections.length) return [];
  const collectionIds = collections.map((row) => asString(row.id));
  const itemQuery = `select=id,collection_id,placement,caption_override,alt_text_override,display_order,is_featured,media_assets(id,asset_type,title,description,caption,alt_text,storage_bucket,storage_path,external_url,thumbnail_url,duration_seconds,status,visibility)&collection_id=in.(${collectionIds.join(',')})&order=display_order.asc`;
  const items = await readJson(await supabase.from('offer_media_items').request({ query: itemQuery }), 'Offer media could not be loaded.');
  const itemsByCollection = new Map<string, OfferMediaItem[]>();
  items.forEach((row) => {
    const asset = row.media_assets as JsonRecord | null;
    if (!asset) return;
    const item: OfferMediaItem = {
      id: asString(row.id),
      kind: (asString(asset.asset_type) || 'image') as OfferMediaItem['kind'],
      title: asString(asset.title),
      description: asString(asset.description),
      caption: asString(row.caption_override) || asString(asset.caption),
      altText: asString(row.alt_text_override) || asString(asset.alt_text) || asString(asset.title),
      url: publicStorageUrl(asset),
      thumbnailUrl: asString(asset.thumbnail_url),
      durationSeconds: asNumber(asset.duration_seconds),
      placement: asString(row.placement),
      isFeatured: Boolean(row.is_featured),
    };
    const collectionId = asString(row.collection_id);
    itemsByCollection.set(collectionId, [...(itemsByCollection.get(collectionId) || []), item]);
  });
  return collections.map((row) => ({
    id: asString(row.id),
    slug: asString(row.slug),
    title: asString(row.title),
    description: asString(row.description),
    occurredOn: asString(row.occurred_on) || null,
    location: asString(row.location_text),
    coverUrl: '',
    items: itemsByCollection.get(asString(row.id)) || [],
  }));
}

function mapOffer(row: JsonRecord, founders: OfferFounder[], collections: OfferMediaCollection[]): PublicOffer {
  return {
    id: asString(row.id),
    slug: asString(row.slug),
    title: asString(row.title),
    tagline: asString(row.tagline),
    shortDescription: asString(row.short_description),
    fullDescription: asString(row.full_description),
    personalStory: asString(row.personal_story),
    category: asString(row.category),
    offerType: asString(row.offer_type),
    cardImageUrl: asString(row.card_image_url),
    highlights: asStringArray(row.highlights),
    whatIsIncluded: asStringArray(row.what_is_included),
    suitableFor: asStringArray(row.suitable_for),
    requirements: asStringArray(row.requirements),
    durationMinutes: asNumber(row.duration_minutes),
    availabilityText: asString(row.availability_text),
    locationText: asString(row.location_text),
    exchangeType: asString(row.exchange_type),
    priceAmount: asNumber(row.price_amount),
    currency: asString(row.currency) || 'EUR',
    ctaLabel: asString(row.cta_label) || 'Ask about this offer',
    secondaryCtaLabel: asString(row.secondary_cta_label) || 'Explore all offers',
    isFeatured: Boolean(row.is_featured),
    founders,
    collections,
  };
}

const OFFER_SELECT = 'id,slug,title,tagline,short_description,full_description,personal_story,category,offer_type,card_image_url,highlights,what_is_included,suitable_for,requirements,duration_minutes,availability_text,location_text,exchange_type,price_amount,currency,cta_label,secondary_cta_label,is_featured,display_order';

export async function getPublicOffers(): Promise<PublicOffer[]> {
  const rows = await readJson(await supabase.from('offers').request({ query: `select=${OFFER_SELECT}&status=eq.active&is_public=eq.true&order=is_featured.desc,display_order.asc,title.asc` }), 'Offers could not be loaded.');
  const founders = await getFounders(rows.map((row) => asString(row.id)));
  return rows.map((row) => mapOffer(row, founders.get(asString(row.id)) || [], []));
}

export async function getPublicOfferBySlug(slug: string): Promise<PublicOffer | null> {
  const rows = await readJson(await supabase.from('offers').request({ query: `select=${OFFER_SELECT}&slug=eq.${encodeURIComponent(slug)}&status=eq.active&is_public=eq.true&limit=1` }), 'Offer could not be loaded.');
  const row = rows[0];
  if (!row) return null;
  const id = asString(row.id);
  const [founders, collections] = await Promise.all([getFounders([id]), getCollections(id)]);
  return mapOffer(row, founders.get(id) || [], collections);
}
