import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const libSource = readFileSync(new URL('../src/lib/journeyCalendar.ts', import.meta.url), 'utf8');
const sectionSource = readFileSync(
  new URL('../src/components/PublicJourneyCalendarSection.tsx', import.meta.url),
  'utf8',
);

const KEVIN_ID = 'a81c719c-445d-4c71-a440-f10a3ea7fee1';
const MICHA_ID = '59c5fe0d-f9b0-4156-b56b-5a475714e3c5';
const GUEST_ID = '11111111-1111-1111-1111-111111111111';

const kevin = {
  id: KEVIN_ID,
  slug: 'kevin-de-vlieger',
  display_name: 'Kevin',
  avatar_url: null,
  profile_url: '/founders/kevin-de-vlieger',
};
const micha = {
  id: MICHA_ID,
  slug: 'micha',
  display_name: 'Micha',
  avatar_url: null,
  profile_url: '/founders/micha',
};
const guest = {
  id: GUEST_ID,
  slug: 'guest-traveler',
  display_name: 'Guest',
  avatar_url: null,
  profile_url: '/founders/guest-traveler',
};

function journeyPersonForFounderSlug(slug) {
  const normalized = String(slug || '').toLowerCase();
  if (normalized.includes('kevin')) return 'kevin';
  if (normalized.includes('micha')) return 'micha';
  return null;
}

function entriesForFounderFilter(entries, founderId) {
  if (founderId === 'all') return entries;

  let selected;
  for (const entry of entries) {
    selected = entry.founders.find((founder) => founder.id === founderId);
    if (selected) break;
  }
  if (!selected) return [];

  const person = journeyPersonForFounderSlug(selected.slug);
  if (person) {
    return entries.filter(
      (entry) => entry.journey_person === person || entry.journey_person === 'together',
    );
  }

  return entries.filter((entry) => entry.founders.some((founder) => founder.id === founderId));
}

const dualLinkedStops = [
  {
    id: 'micha-stop',
    slug: 'micha-in-maro',
    journey_person: 'micha',
    founders: [micha, kevin],
  },
  {
    id: 'kevin-stop',
    slug: 'kevin-in-maro',
    journey_person: 'kevin',
    founders: [kevin, micha],
  },
];

const withTogether = [
  ...dualLinkedStops,
  {
    id: 'together-stop',
    slug: 'shared-host-request',
    journey_person: 'together',
    founders: [kevin, micha],
  },
];

test('Kevin and Micha chips diverge when both founders are linked on every stop', () => {
  const kevinOnly = entriesForFounderFilter(dualLinkedStops, KEVIN_ID);
  const michaOnly = entriesForFounderFilter(dualLinkedStops, MICHA_ID);

  assert.deepEqual(
    kevinOnly.map((entry) => entry.id),
    ['kevin-stop'],
  );
  assert.deepEqual(
    michaOnly.map((entry) => entry.id),
    ['micha-stop'],
  );
});

test('together stops remain visible under either founder chip', () => {
  assert.deepEqual(
    entriesForFounderFilter(withTogether, KEVIN_ID).map((entry) => entry.id),
    ['kevin-stop', 'together-stop'],
  );
  assert.deepEqual(
    entriesForFounderFilter(withTogether, MICHA_ID).map((entry) => entry.id),
    ['micha-stop', 'together-stop'],
  );
});

test('unknown founder falls back to founders membership', () => {
  const rows = [
    {
      id: 'guest-only',
      slug: 'guest-stop',
      journey_person: 'together',
      founders: [guest],
    },
    {
      id: 'kevin-stop',
      slug: 'kevin-in-maro',
      journey_person: 'kevin',
      founders: [kevin, micha],
    },
  ];

  assert.deepEqual(
    entriesForFounderFilter(rows, GUEST_ID).map((entry) => entry.id),
    ['guest-only'],
  );
});

test('all returns the full list', () => {
  assert.equal(entriesForFounderFilter(dualLinkedStops, 'all').length, 2);
});

test('library exports journey_person-based filter helpers', () => {
  assert.match(libSource, /export function journeyPersonForFounderSlug/);
  assert.match(libSource, /export function entriesForFounderFilter/);
  assert.match(libSource, /journey_person === person \|\| entry\.journey_person === 'together'/);
  assert.match(libSource, /normalized\.includes\('kevin'\)/);
  assert.match(libSource, /normalized\.includes\('micha'\)/);
});

test('public calendar section imports shared filter helper instead of local founders.id filter', () => {
  assert.match(sectionSource, /entriesForFounderFilter/);
  assert.match(sectionSource, /from '\.\.\/lib\/journeyCalendar'/);
  assert.doesNotMatch(
    sectionSource,
    /function entriesForFounderFilter\(/,
  );
  assert.doesNotMatch(
    sectionSource,
    /entry\.founders\.some\(\(founder\) => founder\.id === founderId\)/,
  );
});
