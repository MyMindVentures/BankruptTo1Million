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
  type JourneyPoint,
} from '../components/journal/JournalLandingSections';
import { filterPosts, getJournalIndex, type JournalIndexData } from '../lib/journal';
import { supabase } from '../lib/supabase';
import './JournalLandingPage.css';
import './JournalLandingResponsive.css';
import './JournalViewportFix.css';

async function readJson<T>(responseOrPromise: Response | Promise<Response>): Promise<T> {
  const response = await responseOrPromise;
  if (!response.ok) throw new Error(await response.text());
  return response.json() as Promise<T>;
}

function matchesFounder(point: JourneyPoint, founder: FounderFilter) {
  if (founder === 'all') return true;
  const slugs = (point.involved_people || []).map((person) => person.slug);
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
        query: 'select=*&order=effective_journey_order.asc,occurred_at.asc',
      })),
    ]).then(([journalData, journeyRows]) => {
      setJournal(journalData);
      setJourney(journeyRows);
      setActiveId(journeyRows.find((point) => point.is_current_location)?.journey_entry_id || journeyRows[0]?.journey_entry_id);
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
