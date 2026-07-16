import type { I18nManifest } from '../lib/i18nManifest';
import { useEffect, useMemo, useState } from 'react';
import { PremiumJourneyMap, type PremiumJourneyPoint } from './PremiumJourneyMap';
import { JourneyCalendarPlanner } from './JourneyCalendarPlanner';
import { Button } from './ui/button';
import { Callout } from './ui/card';
import { supabase } from '../lib/supabase';
import { useWebsiteI18n } from '../lib/websiteI18n';

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

export const JOURNAL_JOURNEY_MAP_SECTION_I18N_MANIFEST = {
  componentKey: 'components.journal.journey.map.section',
  namespace: 'ui',
  translationKeys: [] as const,
  keyPatterns: ['journal_journey_map.*'] as const,
} as const satisfies I18nManifest;

export function JournalJourneyMapSection() {
  const { t } = useWebsiteI18n();
  const [livePoints, setLivePoints] = useState<PremiumJourneyPoint[]>([]);
  const [mapFeedError, setMapFeedError] = useState('');
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | PremiumJourneyPoint['journey_person']>('all');
  const [activeId, setActiveId] = useState<string>();

  useEffect(() => {
    readJson<PremiumJourneyPoint[]>(supabase.from('public_journal_map_points').request({ query: 'select=*&order=occurred_at.asc,journey_entry_id.asc' }))
      .then((rows) => {
        setMapFeedError('');
        setLivePoints(rows);
        setActiveId(newestPoint(rows, 'all')?.journey_entry_id);
        setLoading(false);
      })
      .catch(() => {
        setMapFeedError(t('journal_journey_map.error', 'The live map feed could not be loaded.'));
        setLoading(false);
      });
  }, [t]);

  const points = useMemo(
    () => livePoints
      .filter((point) => matchesFilter(point, filter))
      .sort((a, b) => eventTimestamp(a) - eventTimestamp(b) || a.journey_entry_id.localeCompare(b.journey_entry_id)),
    [livePoints, filter],
  );
  const activePoint = useMemo(
    () => points.find((point) => point.journey_entry_id === activeId) || newestPoint(points, filter) || points[0],
    [activeId, filter, points],
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
    const next = newestPoint(livePoints, value);
    if (next) setActiveId(next.journey_entry_id);
  };

  if (loading) return <div className="impact-state">{t('journal_journey_map.loading', 'Loading the live journey map…')}</div>;
  if (mapFeedError) return <div className="impact-state impact-state--error">{mapFeedError}</div>;
  if (!points.length) return <div className="impact-state">{t('journal_journey_map.empty', 'No published journey locations are available yet.')}</div>;

  return <div className="journey-map-only">
    <Callout className="journey-map-only__toolbar">
      <div><strong>{t('journal_journey_map.explore', 'Explore the route')}</strong><span>{t('journal_journey_map.live_entries', 'Live journey entries and timeline locations')}</span></div>
      <div>{(['all', 'kevin', 'micha', 'together'] as const).map((value) => <Button key={value} type="button" size="sm" variant={filter === value ? 'default' : 'ghost'} onClick={() => selectFilter(value)}>{label(value)}</Button>)}</div>
    </Callout>
    {activePoint ? (
      <PremiumJourneyMap
        key={activePoint.journey_entry_id}
        points={points}
        activeId={activePoint.journey_entry_id}
        onSelect={selectPoint}
      />
    ) : null}
    <JourneyCalendarPlanner />
  </div>;
}
