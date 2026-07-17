import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const mapSource = readFileSync(new URL('../src/components/CurrentLocationMap.tsx', import.meta.url), 'utf8');
const sectionSource = readFileSync(
  new URL('../src/components/PublicJourneyCalendarSection.tsx', import.meta.url),
  'utf8',
);

test('CurrentLocationMap accepts focusPerson and notifies on pin focus changes', () => {
  assert.match(mapSource, /export type CurrentLocationFocusPerson = 'kevin' \| 'micha'/);
  assert.match(mapSource, /focusPerson\?: CurrentLocationFocusPerson \| null/);
  assert.match(mapSource, /onFocusPersonChange\?: \(person: CurrentLocationFocusPerson\) => void/);
  assert.match(mapSource, /point\.journey_person === focusPerson/);
  assert.match(mapSource, /onFocusPersonChangeRef\.current\?\.\(person\)/);
});

test('PublicJourneyCalendarSection syncs callouts to map via focusPerson', () => {
  assert.match(sectionSource, /mapFocusPerson/);
  assert.match(sectionSource, /focusPerson=\{mapFocusPerson\}/);
  assert.match(sectionSource, /onFocusPersonChange=\{handleMapFocusPerson\}/);
  assert.match(sectionSource, /function handleMapFocusPerson\(person: CurrentLocationFocusPerson\)/);
  assert.match(sectionSource, /setSelectedId\(match\.id\)/);
});
