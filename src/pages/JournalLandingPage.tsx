import { useEffect, useMemo, useState } from 'react';
import { Footer } from '../components/Footer';
import { Header } from '../components/Header';
import type { FounderAvatarMap } from '../components/PremiumJourneyMap';
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

type FounderProfileRow = {
  slug: string;
  display_name: string;
  avatar_url: string | null;
};

async function readJson<T>(responseOrPromise: Response | Promise<Response>): Promise<T> {
  const response = await responseOrPromise;
  if (!response.ok) throw new Error(await response.text());
  return response.json() as Promise<T>;
}

export function JournalLandingPage() {
  const [journal, setJournal] = useState<JournalIndexData | null>(null);
  const [journey, setJourney] = useState<JourneyPoint[]>([]);
  const [founderAvatars, setFounderAvatars] = useState<FounderAvatarMap>({});
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
      readJson<JourneyPoint[]>(supabase.from('public_journal_journey').request({ query: 'select=*&order=effective_journey_order.asc,occurred_at.asc' })),
      readJson<FounderProfileRow[]>(supabase.from('founder_profiles_public').request({ query: 'select=slug,display_name,avatar_url&slug=in.(kevin-de-vlieger,micha)' })),
    ]).then(([journalData, journeyRows, founderRows]) => {
      const avatarMap: FounderAvatarMap = {};
      founderRows.forEach((row) => {
        const key: keyof FounderAvatarMap = row.slug === 'kevin-de-vlieger' ? 'kevin' : 'micha';
        avatarMap[key] = { name: row.display_name, avatarUrl: row.avatar_url };
      });

      setJournal(journalData);
      setJourney(journeyRows);
      setFounderAvatars(avatarMap);
      setActiveId(journeyRows.find((point) => point.is_current_location)?.journey_entry_id || journeyRows[0]?.journey_entry_id);
      setStatus('ready');
    }).catch(() => setStatus('error'));
  }, []);

  const filteredJourney = useMemo(
    () => journey.filter((point) => founder === 'all' || point.journey_person === founder || point.journey_person === 'together'),
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
  }, [founder, activeId, activePoint]);

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
        <JournalMapSection
          points={filteredJourney}
          activePoint={activePoint}
          founder={founder}
          founderAvatars={founderAvatars}
          onFounderChange={setFounder}
          onSelect={setActiveId}
        />
        <JournalTimelineSection
          points={filteredJourney}
          activePoint={activePoint}
          founder={founder}
          onFounderChange={setFounder}
          onSelect={setActiveId}
        />
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
