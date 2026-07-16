import test from 'node:test';
import assert from 'node:assert/strict';

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

function normalizePlaceContextPayload(payload) {
  if (!payload || typeof payload !== 'object') return null;
  const links = payload.links ?? {};
  return {
    place_type: payload.place_type,
    area_type: payload.area_type,
    place_title: payload.place?.title ?? null,
    area_title: payload.area?.title ?? null,
    poi_count: Array.isArray(payload.pois) ? payload.pois.length : 0,
    google_maps_url: links.google_maps_url ?? null,
  };
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

test('normalizePlaceContextPayload extracts the public RPC shape', () => {
  const normalized = normalizePlaceContextPayload({
    place_type: 'cafe',
    area_type: 'town',
    links: { google_maps_url: 'https://maps.example' },
    place: { title: 'Cafeteria Cajiz', history: 'Local café.' },
    area: { title: 'Vélez-Málaga', history: 'Historic town.' },
    pois: [{ display_order: 1 }, { display_order: 2 }],
  });

  assert.deepEqual(normalized, {
    place_type: 'cafe',
    area_type: 'town',
    place_title: 'Cafeteria Cajiz',
    area_title: 'Vélez-Málaga',
    poi_count: 2,
    google_maps_url: 'https://maps.example',
  });
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
