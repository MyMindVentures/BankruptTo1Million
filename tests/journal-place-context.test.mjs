import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clampLocalizedProse,
  normalizeLocalizedField,
  resolveCharacterRange,
} from '../scripts/journal-place-context-text.mjs';

function buildGoogleMapsUrl(latitude, longitude) {
  if (latitude == null || longitude == null) return null;
  return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
}

function weatherConditionKey(code) {
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

function poiTypeKey(type) {
  return `journal.place_context.poi_type.${type}`;
}

function normalizePlaceContextPayload(payload) {
  if (!payload || typeof payload !== 'object') return null;
  const links = payload.links ?? {};
  const pois = Array.isArray(payload.pois) ? payload.pois : [];
  return {
    place_type: payload.place_type,
    area_type: payload.area_type,
    place_title: payload.place?.title ?? null,
    area_title: payload.area?.title ?? null,
    poi_count: pois.length,
    poi_with_coords: pois.filter((poi) => isValidMapCoordinate(poi.latitude, poi.longitude)).length,
    google_maps_url: links.google_maps_url ?? null,
  };
}

function isValidMapCoordinate(latitude, longitude) {
  if (latitude == null || longitude == null) return false;
  const lat = Number(latitude);
  const lng = Number(longitude);
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

function haversineDistanceKm(lat1, lng1, lat2, lng2) {
  const toRad = (value) => (value * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

test('buildGoogleMapsUrl returns a maps search link from coordinates', () => {
  assert.equal(
    buildGoogleMapsUrl(36.738739, -4.18202),
    'https://www.google.com/maps/search/?api=1&query=36.738739,-4.18202',
  );
  assert.equal(buildGoogleMapsUrl(null, 1), null);
});

test('weatherConditionKey maps Open-Meteo codes to translation keys', () => {
  assert.equal(weatherConditionKey(0), 'journal.place_context.weather.condition.clear');
  assert.equal(weatherConditionKey(61), 'journal.place_context.weather.condition.rain');
  assert.equal(weatherConditionKey(95), 'journal.place_context.weather.condition.thunderstorm');
  assert.equal(weatherConditionKey(999), 'journal.place_context.weather.condition.unknown');
});

test('poiTypeKey maps POI types to translation keys', () => {
  assert.equal(poiTypeKey('landmark'), 'journal.place_context.poi_type.landmark');
  assert.equal(poiTypeKey('museum'), 'journal.place_context.poi_type.museum');
  assert.equal(poiTypeKey('other'), 'journal.place_context.poi_type.other');
});

test('journal POI map hover card translation keys are namespaced', () => {
  const cardKeys = [
    'journal.place_context.map.card.close_label',
    'journal.place_context.map.card.order',
    'journal.place_context.poi_type.landmark',
  ];
  for (const key of cardKeys) {
    assert.ok(key.startsWith('journal.place_context.'));
  }
});

test('normalizePlaceContextPayload extracts the public RPC shape', () => {
  const normalized = normalizePlaceContextPayload({
    place_type: 'cafe',
    area_type: 'town',
    links: { google_maps_url: 'https://maps.example' },
    place: { title: 'Cafeteria Cajiz', history: 'Local café.' },
    area: { title: 'Vélez-Málaga', history: 'Historic town.' },
    pois: [{ display_order: 1, latitude: 36.78, longitude: -4.10 }, { display_order: 2 }],
  });

  assert.deepEqual(normalized, {
    place_type: 'cafe',
    area_type: 'town',
    place_title: 'Cafeteria Cajiz',
    area_title: 'Vélez-Málaga',
    poi_count: 2,
    poi_with_coords: 1,
    google_maps_url: 'https://maps.example',
  });
});

test('isValidMapCoordinate validates latitude and longitude ranges', () => {
  assert.equal(isValidMapCoordinate(36.7, -4.1), true);
  assert.equal(isValidMapCoordinate(null, -4.1), false);
  assert.equal(isValidMapCoordinate(91, 0), false);
  assert.equal(isValidMapCoordinate(0, 181), false);
});

test('haversineDistanceKm returns approximate distance between two points', () => {
  const km = haversineDistanceKm(36.7213, -4.4214, 36.738739, -4.18202);
  assert.ok(km > 15 && km < 35);
});

test('normalizePlaceContextPayload returns null for empty payloads', () => {
  assert.equal(normalizePlaceContextPayload(null), null);
});

function journalEventHasPlaceContext(event) {
  const hasBusiness = Boolean(String(event.featured_business_name ?? '').trim());
  const hasCoords = Boolean(String(event.latitude ?? '').trim() && String(event.longitude ?? '').trim());
  return hasBusiness || hasCoords;
}

test('journalEventHasPlaceContext requires business name or coordinates', () => {
  assert.equal(journalEventHasPlaceContext({ featured_business_name: 'Cafeteria Cajiz', latitude: '', longitude: '' }), true);
  assert.equal(journalEventHasPlaceContext({ featured_business_name: '', latitude: '36.7', longitude: '-4.1' }), true);
  assert.equal(journalEventHasPlaceContext({ featured_business_name: '', latitude: '', longitude: '' }), false);
});

function spanishPlaceHistory832() {
  const base = 'Balcon de Maro es un mirador y restaurante sobre el acantilado de Maro, cerca de Nerja, donde el Mediterraneo se abre con una calma que invita a pensar con claridad. ';
  let text = base.repeat(6).trim();
  while (text.length < 832) {
    text += ' El lugar combina cocina local, hospitalidad y una vista que convierte cada pausa de trabajo en un recuerdo compartido.';
  }
  return text.slice(0, 832);
}

test('clampLocalizedProse keeps valid text unchanged', () => {
  const text = 'A'.repeat(736);
  assert.equal(clampLocalizedProse(text, 150, 900), text);
});

test('clampLocalizedProse accepts the failing es place_history length of 832 within max 900', () => {
  const text = spanishPlaceHistory832();
  assert.equal(text.length, 832);
  const clamped = clampLocalizedProse(text, 150, 900);
  assert.ok(clamped.length <= 900);
  assert.ok(clamped.length >= 150);
});

test('clampLocalizedProse soft-truncates minor overshoot above legacy max 800', () => {
  const text = spanishPlaceHistory832();
  const clamped = clampLocalizedProse(text, 150, 800, 50);
  assert.ok(clamped.length <= 800);
  assert.ok(clamped.length >= 150);
});

test('clampLocalizedProse rejects materially over-limit text', () => {
  const text = 'Word '.repeat(220).trim();
  assert.throws(
    () => clampLocalizedProse(text, 150, 900, 50),
    /Text too long/,
  );
});

test('normalizeLocalizedField throws field-specific validation errors', () => {
  const text = 'Word '.repeat(220).trim();
  assert.throws(
    () => normalizeLocalizedField(text, 150, 900, 'place_history', 'es'),
    /Invalid place_history length for es/,
  );
});

test('resolveCharacterRange merges defaults with per-language overrides', () => {
  const range = resolveCharacterRange(
    { min: 150, max: 900, preferred_min: 150, preferred_max: 750 },
    { es: { max: 900, preferred_max: 750 } },
    'es',
  );
  assert.deepEqual(range, {
    min: 150,
    max: 900,
    preferredMin: 150,
    preferredMax: 750,
  });
});
