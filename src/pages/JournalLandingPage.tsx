import { Archive, ArrowRight, ChevronDown, Filter, Search, SlidersHorizontal } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { PremiumJourneyMap, type FounderAvatarMap, type PremiumJourneyPoint } from '../components/PremiumJourneyMap';
import { AceternityContentCard } from '../components/AceternityContentCard';
import { SectionHeading } from '../components/SectionHeading';
import { filterPosts, getJournalIndex, getPostAuthors, type JournalIndexData, type PublicJournalPost } from '../lib/journal';
import { supabase } from '../lib/supabase';
import './JournalLandingPage.css';
import './JournalLandingResponsive.css';

type FounderFilter = 'all' | 'kevin' | 'micha' | 'together';

type JourneyPoint = PremiumJourneyPoint & {
  map_label?: string;
  what_happened?: string;
  why_it_mattered?: string;
  mood?: string;
  marker_variant?: string;
  effective_journey_order?: number;
};

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

function formatDate(value?: string) {
  if (!value) return '';
  return new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value));
}

function founderLabel(value: FounderFilter) {
  if (value === 'all') return 'Everyone';
  if (value === 'together') return 'Kevin & Micha';
  return value === 'kevin' ? 'Kevin' : 'Micha';
}

function ArticleCard({ post }: { post: PublicJournalPost }) {
  const author = getPostAuthors(post)[0];
  return <AceternityContentCard
    href={`/journal/${post.slug}`}
    title={post.displayTitle}
    description={post.displayExcerpt || post.displaySubtitle}
    authorName={author?.display_name || 'Bankrupt to 1 Million'}
    avatarSrc={author?.avatar_url || '/og-image.png'}
    imageSrc={post.cover_image_url || undefined}
    imageAlt={post.cover_image_alt || post.displayTitle}
    readTime={`${post.reading_time_minutes || 4} min read`}
    category={post.journal_categories?.name || 'Journal'}
    publishedDate={post.published_at}
  >{formatDate(post.published_at)}</AceternityContentCard>;
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
      setJournal(journalData);
      setJourney(journeyRows);
      setFounderAvatars(Object.fromEntries(founderRows.map((row) => [row.slug === 'kevin-de-vlieger' ? 'kevin' : 'micha', { name: row.display_name, avatarUrl: row.avatar_url }]))) as FounderAvatarMap;
      setActiveId(journeyRows.find((point) => point.is_current_location)?.journey_entry_id || journeyRows[0]?.journey_entry_id);
      setStatus('ready');
    }).catch(() => setStatus('error'));
  }, []);

  const filteredJourney = useMemo(() => journey.filter((point) => founder === 'all' || point.journey_person === founder || point.journey_person === 'together'), [journey, founder]);
  const activePoint = filteredJourney.find((point) => point.journey_entry_id === activeId) || filteredJourney.find((point) => point.is_current_location) || filteredJourney[0];
  const latestPosts = useMemo(() => (journal?.posts || []).slice(0, 3), [journal]);
  const archivePosts = useMemo(() => filterPosts(journal?.posts || [], { category, search, sort }).filter((post) => !latestPosts.some((latest) => latest.id === post.id)), [journal, category, search, sort, latestPosts]);
  const chips = [{ slug: 'all', name: 'All' }, ...(journal?.categories || [])];

  useEffect(() => {
    if (activePoint && activePoint.journey_entry_id !== activeId) setActiveId(activePoint.journey_entry_id);
  }, [founder]);

  return <>
    <Header />
    <main className="journal-priority-page">
      <section className="journal-priority-intro">
        <div>
          <p className="eyebrow">The live rebuild</p>
          <h1>See where we are, what happened and what is needed now.</h1>
          <p>Start with the real journey. The map and timeline are the fastest way to understand Kevin and Micha’s current situation, route and next steps.</p>
        </div>
        <a className="button" href="/support">See what is needed now <ArrowRight size={18} /></a>
      </section>

      {status === 'loading' ? <section className="section"><div className="impact-state">Loading the live journey…</div></section> : null}
      {status === 'error' ? <section className="section"><div className="impact-state impact-state--error">The journal could not be loaded right now.</div></section> : null}

      {status === 'ready' ? <>
        <section className="journal-map-first" aria-labelledby="journal-map-title">
          <div className="journal-section-heading-row">
            <div><p className="eyebrow">Live map & current chapter</p><h2 id="journal-map-title">Follow the route as it unfolds.</h2></div>
            <div className="journal-founder-switch" role="group" aria-label="Filter the journey by founder">
              {(['all', 'kevin', 'micha', 'together'] as FounderFilter[]).map((value) => <button key={value} type="button" className={founder === value ? 'is-active' : ''} onClick={() => setFounder(value)}>{founderLabel(value)}</button>)}
            </div>
          </div>
          <PremiumJourneyMap points={filteredJourney} activeId={activePoint?.journey_entry_id} onSelect={setActiveId} founderAvatars={founderAvatars} />
        </section>

        <section className="journal-timeline-section" aria-labelledby="journal-timeline-title">
          <SectionHeading eyebrow="Interactive timeline" title="One real chapter at a time." titleId="journal-timeline-title">Select a moment to move the map and open its current context.</SectionHeading>
          <div className="journal-founder-switch journal-founder-switch--timeline" role="group" aria-label="Filter timeline by founder">
            {(['all', 'kevin', 'micha', 'together'] as FounderFilter[]).map((value) => <button key={value} type="button" className={founder === value ? 'is-active' : ''} onClick={() => setFounder(value)}>{founderLabel(value)}</button>)}
          </div>
          <div className="journal-priority-timeline">
            {filteredJourney.map((point) => <button key={point.journey_entry_id} type="button" className={activePoint?.journey_entry_id === point.journey_entry_id ? 'is-active' : ''} onClick={() => setActiveId(point.journey_entry_id)}>
              <span className="journal-priority-timeline__dot" /><time>{formatDate(point.occurred_at)}</time><strong>{point.map_label || point.location_name || point.city_name || point.title}</strong><small>{point.title}</small>{point.is_current_location ? <em>Current location</em> : null}
            </button>)}
          </div>
        </section>

        <section className="journal-latest-section" id="latest" aria-labelledby="journal-latest-title">
          <SectionHeading eyebrow="Latest stories" title="The three newest chapters." titleId="journal-latest-title">Only the latest three stories stay visible here, so the page remains focused and easy to scan.</SectionHeading>
          {latestPosts.length ? <div className="journal-grid journal-grid--latest-three">{latestPosts.map((post) => <ArticleCard key={post.id} post={post} />)}</div> : <div className="impact-state">No published stories yet.</div>}
        </section>

        <section className={`journal-archive-section ${archiveOpen ? 'is-open' : ''}`} aria-labelledby="journal-archive-title">
          <button type="button" className="journal-archive-toggle" onClick={() => setArchiveOpen((value) => !value)} aria-expanded={archiveOpen}><span><Archive size={22} /><span><strong id="journal-archive-title">Explore the full archive</strong><small>{Math.max((journal?.posts.length || 0) - latestPosts.length, 0)} older published stories</small></span></span><ChevronDown size={22} /></button>
          {archiveOpen ? <div className="journal-archive-content">
            <div className="journal-archive-toolbar"><label><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search title, tag or venture" /></label><label><SlidersHorizontal size={16} /><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="newest">Newest first</option><option value="updated">Recently updated</option><option value="short">Shortest reading time</option><option value="long">Longest reading time</option></select></label><button type="button" className="button button--ghost button--small" onClick={() => { setCategory('all'); setSearch(''); setSort('newest'); }}><Filter size={16} /> Reset</button></div>
            <div className="chip-group" role="group" aria-label="Archive categories">{chips.map((chip) => <button key={chip.slug} type="button" className={`chip ${category === chip.slug ? 'chip--active' : ''}`} onClick={() => setCategory(chip.slug)}>{chip.name}<span>({chip.slug === 'all' ? journal?.posts.length || 0 : journal?.posts.filter((post) => post.journal_categories?.slug === chip.slug).length || 0})</span></button>)}</div>
            {archivePosts.length ? <div className="journal-grid">{archivePosts.map((post) => <ArticleCard key={post.id} post={post} />)}</div> : <div className="impact-state">No archive stories match these filters.</div>}
          </div> : null}
        </section>
      </> : null}
    </main>
    <Footer />
  </>;
}
