import { supabase } from './supabase';

export type JournalPlaceContextLinks = {
  google_maps_url: string | null;
  website_url: string | null;
  instagram_url: string | null;
};

export type JournalPlaceContextPoi = {
  display_order: number;
  poi_type: string;
  title: string;
  description: string;
  latitude: number | null;
  longitude: number | null;
  google_maps_url: string | null;
};

export type JournalPlaceContext = {
  place_type: string;
  area_type: string;
  area_name: string | null;
  latitude: number | null;
  longitude: number | null;
  active_language: string;
  links: JournalPlaceContextLinks;
  place: { title: string; history: string };
  area: { title: string; history: string };
  pois: JournalPlaceContextPoi[];
};

export type JournalCurrentWeather = {
  latitude: number;
  longitude: number;
  observed_at: string | null;
  temperature_c: number | null;
  apparent_temperature_c: number | null;
  humidity_percent: number | null;
  wind_speed_kmh: number | null;
  weather_code: number | null;
  timezone: string | null;
  cached?: boolean;
};

export function buildGoogleMapsUrl(latitude: number | null | undefined, longitude: number | null | undefined) {
  if (latitude == null || longitude == null) return null;
  return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
}

export function isValidMapCoordinate(latitude: unknown, longitude: unknown) {
  if (latitude == null || longitude == null) return false;
  const lat = Number(latitude);
  const lng = Number(longitude);
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

export function poiHasMapCoordinate(poi: Pick<JournalPlaceContextPoi, 'latitude' | 'longitude'>) {
  return isValidMapCoordinate(poi.latitude, poi.longitude);
}

export function poiTypeKey(type: string) {
  return `journal.place_context.poi_type.${type}` as const;
}

export function haversineDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function weatherConditionKey(code: number | null | undefined) {
  if (code == null) return 'journal.place_context.weather.condition.unknown';
  if (code === 0) return 'journal.place_context.weather.condition.clear';
  if (code === 1) return 'journal.place_context.weather.condition.mainly_clear';
  if (code === 2) return 'journal.place_context.weather.condition.partly_cloudy';
  if (code === 3) return 'journal.place_context.weather.condition.overcast';
  if ([45, 48].includes(code)) return 'journal.place_context.weather.condition.fog';
  if ([51, 53, 55, 56, 57].includes(code)) return 'journal.place_context.weather.condition.drizzle';
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'journal.place_context.weather.condition.rain';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'journal.place_context.weather.condition.snow';
  if ([95, 96, 99].includes(code)) return 'journal.place_context.weather.condition.thunderstorm';
  return 'journal.place_context.weather.condition.unknown';
}

export async function getJournalPlaceContext(slug: string, language: string): Promise<JournalPlaceContext | null> {
  const response = await supabase.rpc('get_localized_journal_place_context', {
    p_slug: slug,
    p_language_code: language,
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Could not load journal place context.');
  }
  const payload = await response.json();
  if (!payload || typeof payload !== 'object') return null;
  return payload as JournalPlaceContext;
}

export async function getJournalCurrentWeather(latitude: number, longitude: number): Promise<JournalCurrentWeather> {
  const response = await fetch(`${supabase.url}/functions/v1/get-journal-current-weather`, {
    method: 'POST',
    headers: {
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ latitude, longitude }),
  });
  const payload = await response.json().catch(() => null) as JournalCurrentWeather & { error?: string } | null;
  if (!response.ok || !payload || payload.error) {
    throw new Error(payload?.error || 'Weather request failed.');
  }
  return payload;
}
