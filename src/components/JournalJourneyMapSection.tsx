import { useEffect, useMemo, useState } from 'react';
import { PremiumJourneyMap, type PremiumJourneyPoint } from './PremiumJourneyMap';
import { JourneyCalendarPlanner } from './JourneyCalendarPlanner';
import { Button } from './ui/button';
import { Callout } from './ui/card';
import { supabase } from '../lib/supabase';

const STARTER_POINTS: PremiumJourneyPoint[] = [
  {
    journey_entry_id: 'starter-santa-pola', slug: '', title: 'Where the rebuild becomes public',
    excerpt: 'Kevin and Micha choose to stop hiding the struggle and begin rebuilding openly from the Costa Blanca.',
    occurred_at: '2026-07-09', country_name: 'Spain', city_name: 'Santa Pola', location_name: 'Santa Pola',
    latitude: 38.1917, longitude: -0.5658, journey_person: 'together', is_milestone: true, is_current_location: false,
    involved_people: [],
  },
  {
    journey_entry_id: 'starter-alicante', slug: '', title: 'Building the platform and the story',
    excerpt: 'The Journal, venture concepts and public mission begin to take shape as one visible ecosystem.',
    occurred_at: '2026-07-10', country_name: 'Spain', city_name: 'Alicante', location_name: 'Alicante',
    latitude: 38.3452, longitude: -0.481, journey_person: 'kevin', is_milestone: true, is_current_location: false,
    involved_people: [],
  },
  {
    journey_entry_id: 'starter-open-road', slug: '', title: 'The next chapter is still open',
    excerpt: 'The road ahead will be shaped by hosts, builders, partners and people willing to believe before the proof exists.',
    occurred_at: '2026-07-13', country_name: 'Spain', city_name: 'Costa Blanca', location_name: 'Open road',
    latitude: 38.57, longitude: -0.12, journey_person: 'together', is_milestone: false, is_current_location: true,
    involved_people: [],
  },
];

async function readJson<T>(responseOrPromise: Response | Promise<Response>): Promise<T> {
  const response = await responseOrPromise;
  if (!response.ok) throw new Error(await response.text());
  return response.json() as Promise<T>;
}

function label(value: 'all' | PremiumJourneyPoint['journey_person']) {
  return value === 'all' ? 'Everyone' : value === 'together' ? 'Kevin & Micha' : value === 'kevin' ? 'Kevin' : 'Micha';
}

function matchesFilter(point: PremiumJourneyPoint, value: 'all' | PremiumJourneyPoint['journey_person']) {
  return value === 'all' || point.journey_person === value || point.journey_person === 'together';
}

function eventTimestamp(point: PremiumJourneyPoint) {
  const timestamp = new Date(point.occurred_at).getTime();
  return Number.isFinite(timestamp) ? timestamp : Number.NEGATIVE_INFINITY;
}

function newestPoint(points: PremiumJourneyPoint[], value: 'all' | PremiumJourneyPoint['journey_person']) {
  return points
    .filter((point) => matchesFilter(point, value))
    .sort((a, b) => eventTimestamp(b) - eventTimestamp(a) || b.journey_entry_id.localeCompare(a.journey_entry_id))[0];
}

export function JournalJourneyMapSection() {
  const [livePoints, setLivePoints] = useState<PremiumJourneyPoint[]>([]);
  const [mapFeedError, setMapFeedError] = useState('');
  const [filter, setFilter] = useState<'all' | PremiumJourneyPoint['journey_person']>('all');
  const [activeId, setActiveId] = useState(() => newestPoint(STARTER_POINTS, 'all')?.journey_entry_id);

  useEffect(() => {
    readJson<PremiumJourneyPoint[]>(supabase.from('public_journal_map_points').request({ query: 'select=*&order=occurred_at.asc,journey_entry_id.asc' }))
      .then((rows) => {
        setMapFeedError('');
        setLivePoints(rows);
        setActiveId(newestPoint(rows, 'all')?.journey_entry_id);
      })
      .catch((error: unknown) => {
        setLivePoints([]);
        setMapFeedError(error instanceof Error ? error.message : 'The live map feed could not be loaded.');
        setActiveId(newestPoint(STARTER_POINTS, 'all')?.journey_entry_id);
      });
  }, []);

  const source = livePoints.length ? livePoints : STARTER_POINTS;
  const points = useMemo(
    () => source
      .filter((point) => matchesFilter(point, filter))
      .sort((a, b) => eventTimestamp(a) - eventTimestamp(b) || a.journey_entry_id.localeCompare(b.journey_entry_id)),
    [source, filter],
  );

  useEffect(() => {
    if (!points.length) return;
    if (!points.some((point) => point.journey_entry_id === activeId)) {
      const fallback = newestPoint(points, filter) || points[0];
      setActiveId(fallback.journey_entry_id);
    }
  }, [activeId, filter, points]);

  const selectPoint = (journeyEntryId: string) => {
    if (!points.some((point) => point.journey_entry_id === journeyEntryId)) return;
    setActiveId(journeyEntryId);
  };

  const selectFilter = (value: 'all' | PremiumJourneyPoint['journey_person']) => {
    setFilter(value);
    const next = newestPoint(source, value);
    if (next) setActiveId(next.journey_entry_id);
  };

  return <div className="journey-map-only">
    <Callout className="journey-map-only__toolbar">
      <div><strong>Explore the route</strong><span>{livePoints.length ? 'Live journey entries and timeline locations' : 'Mission preview until the live map feed is available'}</span></div>
      <div>{(['all', 'kevin', 'micha', 'together'] as const).map((value) => <Button key={value} type="button" size="sm" variant={filter === value ? 'default' : 'ghost'} onClick={() => selectFilter(value)}>{label(value)}</Button>)}</div>
    </Callout>
    {mapFeedError ? <Callout><strong>Live map feed unavailable</strong><span>{mapFeedError}</span></Callout> : null}
    <PremiumJourneyMap points={points} activeId={activeId} onSelect={selectPoint}/>
    <JourneyCalendarPlanner />
  </div>;
}
