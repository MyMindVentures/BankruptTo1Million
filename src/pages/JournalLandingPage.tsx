import { useEffect, useMemo, useState } from 'react';
import { Footer } from '../components/Footer';
import { Header } from '../components/Header';
import {
  JournalArchiveSection,
  JournalIntroSection,
  JournalLatestSection,
  JournalMapSection,
  JournalStatusState,
  JournalTimelineSection,
  type FounderFilter,
  type JourneyInvolvedPerson,
  type JourneyPoint,
} from '../components/journal/JournalLandingSections';
import { filterPosts, getJournalIndex, type JournalIndexData } from '../lib/journal';
import { supabase } from '../lib/supabase';
import './JournalLandingPage.css';
import './JournalLandingResponsive.css';
import './JournalViewportFix.css';

const JOURNEY_SELECT = [
  'journey_entry_id',
  'journal_post_id',
  'slug',
  'title',
  'subtitle',
  'excerpt',
  'published_at',
  'occurred_at',
  'country_name',
  'city_name',
  'location_name',
  'latitude',
  'longitude',
  'journey_category',
  'is_milestone',
  'is_current_location',
  'map_label',
  'marker_variant',
  'effective_journey_order',
  'involved_people',
].join(',');

async function readJson<T>(responseOrPromise: Response | Promise<Response>): Promise<T> {
  const response = await responseOrPromise;
  if (!response.ok) throw new Error(await response.text());
  return response.json() as Promise<T>;
}

function normalizePeople(people: JourneyInvolvedPerson[] | null | undefined): JourneyInvolvedPerson[] {
  const unique = new Map<string, JourneyInvolvedPerson>();

  for (const person of people || []) {
    if (!person?.id || !person?.display_name) continue;
    if (person.relation_role && !['subject', 'both'].includes(person.relation_role)) continue;

    const key = person.id || person.slug;
    const existing = unique.get(key);
    if (!existing || (person.display_order ?? 0) < (existing.display_order ?? 0)) {
      unique.set(key, person);
    }
  }

  return [...unique.values()].sort(
    (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0),
  );
}

function normalizeJourneyRow(row: JourneyPoint): JourneyPoint {
  return {
    journey_entry_id: row.journey_entry_id,
    journal_post_id: row.journal_post_id,
    slug: row.slug,
    title: row.title,
    subtitle: row.subtitle,
    excerpt: row.excerpt,
    published_at: row.published_at,
    occurred_at: row.occurred_at,
    country_name: row.country_name,
    city_name: row.city_name,
    location_name: row.location_name,
    latitude: row.latitude,
    longitude: row.longitude,
    journey_category: row.journey_category,
    is_milestone: row.is_milestone,
    is_current_location: row.is_current_location,
    map_label: row.map_label,
    marker_variant: row.marker_variant,
    effective_journey_order: row.effective_journey_order,
    involved_people: normalizePeople(row.involved_people),
  };
}

function matchesFounder(point: JourneyPoint, founder: FounderFilter) {
  if (founder === 'all') return true;
  const slugs = point.involved_people.map((person) => person.slug);
  if (founder === 'together') return slugs.includes('kevin-de-vlieger') && slugs.includes('micha');
  return slugs.includes(founder === 'kevin' ? 'kevin-de-vlieger' : 'micha');
}

export function JournalLandingPage() {
  const [journal, setJournal] = useState<JournalIndexData | null>(null);
  const [journey, setJourney] = useState<JourneyPoint[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [founder, setFounder] = useState<FounderFilter>('all');
  const [activeId, setActiveId] = useState<string>();
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('newest');

  useEffect(() => {
    Promise.all([
      getJournalIndex(),
      readJson<JourneyPoint[]>(supabase.from('public_journal_journey').request({
        query: `select=${JOURNEY_SELECT}&order=effective_journey_order.asc,occurred_at.asc`,
      })),
    ]).then(([journalData, journeyRows]) => {
      const normalizedJourney = journeyRows.map(normalizeJourneyRow);
      setJournal(journalData);
      setJourney(normalizedJourney);
      setActiveId(normalizedJourney.find((point) => point.is_current_location)?.journey_entry_id || normalizedJourney[0]?.journey_entry_id);
      setStatus('ready');
    }).catch(() => setStatus('error'));
  }, []);

  const filteredJourney = useMemo(
    () => journey.filter((point) => matchesFounder(point, founder)),
    [journey, founder],
  );
  const activePoint = filteredJourney.find((point) => point.journey_entry_id === activeId)
    || filteredJourney.find((point) => point.is_current_location)
    || filteredJourney[0];
  const latestPosts = useMemo(() => (journal?.posts || []).slice(0, 3), [journal]);
  const archivePosts = useMemo(
    () => filterPosts(journal?.posts || [], { category, search, sort }).filter((post) => !latestPosts.some((latest) => latest.id === post.id)),
    [journal, category, search, sort, latestPosts],
  );

  useEffect(() => {
    if (activePoint && activePoint.journey_entry_id !== activeId) setActiveId(activePoint.journey_entry_id);
  }, [activeId, activePoint]);

  const resetArchiveFilters = () => {
    setCategory('all');
    setSearch('');
    setSort('newest');
  };

  return <>
    <Header />
    <main className="journal-priority-page">
      <JournalIntroSection />
      <JournalStatusState status={status} />
      {status === 'ready' && journal ? <>
        <JournalMapSection points={filteredJourney} activePoint={activePoint} founder={founder} onFounderChange={setFounder} onSelect={setActiveId} />
        <JournalTimelineSection points={filteredJourney} activePoint={activePoint} founder={founder} onFounderChange={setFounder} onSelect={setActiveId} />
        <JournalLatestSection posts={latestPosts} />
        <JournalArchiveSection
          journal={journal}
          posts={archivePosts}
          open={archiveOpen}
          category={category}
          search={search}
          sort={sort}
          onToggle={() => setArchiveOpen((value) => !value)}
          onCategoryChange={setCategory}
          onSearchChange={setSearch}
          onSortChange={setSort}
          onReset={resetArchiveFilters}
        />
      </> : null}
    </main>
    <Footer />
  </>;
}
