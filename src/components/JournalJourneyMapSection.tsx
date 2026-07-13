import { useEffect, useMemo, useState } from 'react';
import { PremiumJourneyMap, type PremiumJourneyPoint } from './PremiumJourneyMap';
import { Button } from './ui/button';
import { Callout } from './ui/card';
import { supabase } from '../lib/supabase';

const STARTER_POINTS: PremiumJourneyPoint[] = [
  {
    journey_entry_id: 'starter-santa-pola', slug: '', title: 'Where the rebuild becomes public',
    excerpt: 'Kevin and Micha choose to stop hiding the struggle and begin rebuilding openly from the Costa Blanca.',
    occurred_at: '2026-07-09', country_name: 'Spain', city_name: 'Santa Pola', location_name: 'Santa Pola',
    latitude: 38.1917, longitude: -0.5658, journey_person: 'together', is_milestone: true, is_current_location: false,
  },
  {
    journey_entry_id: 'starter-alicante', slug: '', title: 'Building the platform and the story',
    excerpt: 'The Journal, venture concepts and public mission begin to take shape as one visible ecosystem.',
    occurred_at: '2026-07-10', country_name: 'Spain', city_name: 'Alicante', location_name: 'Alicante',
    latitude: 38.3452, longitude: -0.481, journey_person: 'kevin', is_milestone: true, is_current_location: false,
  },
  {
    journey_entry_id: 'starter-open-road', slug: '', title: 'The next chapter is still open',
    excerpt: 'The road ahead will be shaped by hosts, builders, partners and people willing to believe before the proof exists.',
    occurred_at: '2026-07-13', country_name: 'Spain', city_name: 'Costa Blanca', location_name: 'Open road',
    latitude: 38.57, longitude: -0.12, journey_person: 'together', is_milestone: false, is_current_location: true,
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

export function JournalJourneyMapSection() {
  const [livePoints, setLivePoints] = useState<PremiumJourneyPoint[]>([]);
  const [filter, setFilter] = useState<'all' | PremiumJourneyPoint['journey_person']>('all');
  const [activeId, setActiveId] = useState(STARTER_POINTS[0].journey_entry_id);

  useEffect(() => {
    readJson<PremiumJourneyPoint[]>(supabase.from('public_journal_journey').request({ query: 'select=*&order=effective_journey_order.asc' }))
      .then((rows) => {
        setLivePoints(rows);
        if (rows[0]) setActiveId(rows[0].journey_entry_id);
      })
      .catch(() => setLivePoints([]));
  }, []);

  const source = livePoints.length ? livePoints : STARTER_POINTS;
  const points = useMemo(() => source.filter((point) => filter === 'all' || point.journey_person === filter || point.journey_person === 'together'), [source, filter]);

  return <div className="journey-map-only">
    <Callout className="journey-map-only__toolbar">
      <div><strong>Explore the route</strong><span>{livePoints.length ? 'Live journey entries' : 'Mission preview until the first journey entries are published'}</span></div>
      <div>{(['all', 'kevin', 'micha', 'together'] as const).map((value) => <Button key={value} type="button" size="sm" variant={filter === value ? 'primary' : 'ghost'} onClick={() => { setFilter(value); const next = source.find((point) => value === 'all' || point.journey_person === value || point.journey_person === 'together'); if (next) setActiveId(next.journey_entry_id); }}>{label(value)}</Button>)}</div>
    </Callout>
    <PremiumJourneyMap points={points} activeId={activeId} onSelect={setActiveId}/>
  </div>;
}
