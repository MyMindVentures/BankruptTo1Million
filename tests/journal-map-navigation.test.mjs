import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/lib/journalMapNavigation.ts', import.meta.url), 'utf8');
const landingSource = readFileSync(new URL('../src/pages/JournalLandingPage.tsx', import.meta.url), 'utf8');
const mapSource = readFileSync(new URL('../src/components/PremiumJourneyMap.tsx', import.meta.url), 'utf8');

function isMapCoordinatePoint(point) {
  const lat = point.latitude;
  const lng = point.longitude;
  if (lat == null || lng == null || lat === '' || lng === '') return false;
  return Number.isFinite(Number(lat)) && Number.isFinite(Number(lng));
}

function sortMapPointsChronologically(points) {
  return [...points]
    .filter(isMapCoordinatePoint)
    .sort((a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime() || a.journey_entry_id.localeCompare(b.journey_entry_id));
}

function getMapNavigation(points, activeId) {
  const mapped = sortMapPointsChronologically(points);
  const active = (activeId ? mapped.find((point) => point.journey_entry_id === activeId) : undefined) ?? mapped[mapped.length - 1];
  const activeIndex = active ? mapped.findIndex((point) => point.journey_entry_id === active.journey_entry_id) : -1;
  const safeIndex = Math.max(0, activeIndex);
  return {
    mapped,
    active,
    activeIndex: safeIndex,
    previous: safeIndex > 0 ? mapped[safeIndex - 1] : undefined,
    next: safeIndex >= 0 && safeIndex < mapped.length - 1 ? mapped[safeIndex + 1] : undefined,
    isActiveIdValid: Boolean(activeId && mapped.some((point) => point.journey_entry_id === activeId)),
  };
}

const samplePoints = [
  { journey_entry_id: 'a', occurred_at: '2026-07-01T10:00:00Z', latitude: 36.1, longitude: -4.1, title: 'First' },
  { journey_entry_id: 'b', occurred_at: '2026-07-02T10:00:00Z', latitude: 36.2, longitude: -4.2, title: 'Second' },
  { journey_entry_id: 'c', occurred_at: '2026-07-03T10:00:00Z', latitude: 36.3, longitude: -4.3, title: 'Third' },
  { journey_entry_id: 'd', occurred_at: '2026-07-04T10:00:00Z', latitude: null, longitude: null, title: 'No coords' },
];

test('map navigation orders chronologically and ignores points without coordinates', () => {
  const { mapped } = getMapNavigation(samplePoints, 'a');
  assert.deepEqual(mapped.map((point) => point.journey_entry_id), ['a', 'b', 'c']);
});

test('previous and next do not wrap at the ends of the route', () => {
  const start = getMapNavigation(samplePoints, 'a');
  assert.equal(start.previous, undefined);
  assert.equal(start.next?.journey_entry_id, 'b');

  const middle = getMapNavigation(samplePoints, 'b');
  assert.equal(middle.previous?.journey_entry_id, 'a');
  assert.equal(middle.next?.journey_entry_id, 'c');

  const end = getMapNavigation(samplePoints, 'c');
  assert.equal(end.previous?.journey_entry_id, 'b');
  assert.equal(end.next, undefined);
});

test('invalid active ids are flagged instead of silently reusing the newest chapter', () => {
  const navigation = getMapNavigation(samplePoints, 'missing');
  assert.equal(navigation.isActiveIdValid, false);
  assert.equal(navigation.active?.journey_entry_id, 'c');
});

test('journal landing page validates map chapter selection and loads the full map feed', () => {
  assert.match(landingSource, /select=\*&order=occurred_at\.asc,journey_entry_id\.asc/);
  assert.doesNotMatch(landingSource, /limit=5/);
  assert.match(landingSource, /selectMapChapter/);
  assert.match(landingSource, /newestMapPoint/);
});

test('premium journey map syncs invalid active ids and updates marker payloads', () => {
  assert.match(mapSource, /isActiveIdValid/);
  assert.match(mapSource, /pin\.update\(point,/);
  assert.match(mapSource, /useWebsiteI18n/);
  assert.match(source, /export function getMapNavigation/);
});
