import { Archive, ArrowRight, ChevronDown, Filter, Search, SlidersHorizontal } from 'lucide-react';
import { AceternityContentCard } from '../AceternityContentCard';
import { PremiumJourneyMap, type FounderAvatarMap, type PremiumJourneyPoint } from '../PremiumJourneyMap';
import { SectionHeading } from '../SectionHeading';
import { getPostAuthors, type JournalIndexData, type PublicJournalPost } from '../../lib/journal';

export type FounderFilter = 'all' | 'kevin' | 'micha' | 'together';

export type JourneyPoint = PremiumJourneyPoint & {
  map_label?: string;
  what_happened?: string;
  why_it_mattered?: string;
  mood?: string;
  marker_variant?: string;
  effective_journey_order?: number;
};

export function formatJournalDate(value?: string) {
  if (!value) return '';
  return new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value));
}

export function founderFilterLabel(value: FounderFilter) {
  if (value === 'all') return 'Everyone';
  if (value === 'together') return 'Kevin & Micha';
  return value === 'kevin' ? 'Kevin' : 'Micha';
}

function FounderSwitch({ value, onChange, className = '' }: { value: FounderFilter; onChange: (value: FounderFilter) => void; className?: string }) {
  return <div className={`journal-founder-switch ${className}`.trim()} role="group" aria-label="Filter the journey by founder">
    {(['all', 'kevin', 'micha', 'together'] as FounderFilter[]).map((option) => <button key={option} type="button" className={value === option ? 'is-active' : ''} onClick={() => onChange(option)}>{founderFilterLabel(option)}</button>)}
  </div>;
}

export function JournalArticleCard({ post }: { post: PublicJournalPost }) {
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
  >{formatJournalDate(post.published_at)}</AceternityContentCard>;
}

export function JournalIntroSection() {
  return <section className="journal-priority-intro">
    <div>
      <p className="eyebrow">The live rebuild</p>
      <h1>See where we are, what happened and what is needed now.</h1>
      <p>Start with the real journey. The map and timeline are the fastest way to understand Kevin and Micha’s current situation, route and next steps.</p>
    </div>
    <a className="button" href="/support">See what is needed now <ArrowRight size={18} /></a>
  </section>;
}

export function JournalStatusState({ status }: { status: 'loading' | 'ready' | 'error' }) {
  if (status === 'loading') return <section className="section"><div className="impact-state">Loading the live journey…</div></section>;
  if (status === 'error') return <section className="section"><div className="impact-state impact-state--error">The journal could not be loaded right now.</div></section>;
  return null;
}

export function JournalMapSection({ points, activePoint, founder, founderAvatars, onFounderChange, onSelect }: {
  points: JourneyPoint[];
  activePoint?: JourneyPoint;
  founder: FounderFilter;
  founderAvatars: FounderAvatarMap;
  onFounderChange: (value: FounderFilter) => void;
  onSelect: (id: string) => void;
}) {
  return <section className="journal-map-first" aria-labelledby="journal-map-title">
    <div className="journal-section-heading-row">
      <div><p className="eyebrow">Live map & current chapter</p><h2 id="journal-map-title">Follow the route as it unfolds.</h2></div>
      <FounderSwitch value={founder} onChange={onFounderChange} />
    </div>
    <PremiumJourneyMap points={points} activeId={activePoint?.journey_entry_id} onSelect={onSelect} founderAvatars={founderAvatars} />
  </section>;
}

export function JournalTimelineSection({ points, activePoint, founder, onFounderChange, onSelect }: {
  points: JourneyPoint[];
  activePoint?: JourneyPoint;
  founder: FounderFilter;
  onFounderChange: (value: FounderFilter) => void;
  onSelect: (id: string) => void;
}) {
  return <section className="journal-timeline-section" aria-labelledby="journal-timeline-title">
    <SectionHeading eyebrow="Interactive timeline" title="One real chapter at a time." titleId="journal-timeline-title">Select a moment to move the map and open its current context.</SectionHeading>
    <FounderSwitch value={founder} onChange={onFounderChange} className="journal-founder-switch--timeline" />
    <div className="journal-priority-timeline">
      {points.map((point) => <button key={point.journey_entry_id} type="button" className={activePoint?.journey_entry_id === point.journey_entry_id ? 'is-active' : ''} onClick={() => onSelect(point.journey_entry_id)}>
        <span className="journal-priority-timeline__dot" />
        <time>{formatJournalDate(point.occurred_at)}</time>
        <strong>{point.map_label || point.location_name || point.city_name || point.title}</strong>
        <small>{point.title}</small>
        {point.is_current_location ? <em>Current location</em> : null}
      </button>)}
    </div>
  </section>;
}

export function JournalLatestSection({ posts }: { posts: PublicJournalPost[] }) {
  return <section className="journal-latest-section" id="latest" aria-labelledby="journal-latest-title">
    <SectionHeading eyebrow="Latest stories" title="The three newest chapters." titleId="journal-latest-title">Only the latest three stories stay visible here, so the page remains focused and easy to scan.</SectionHeading>
    {posts.length ? <div className="journal-grid journal-grid--latest-three">{posts.map((post) => <JournalArticleCard key={post.id} post={post} />)}</div> : <div className="impact-state">No published stories yet.</div>}
  </section>;
}

export function JournalArchiveSection({ journal, posts, open, category, search, sort, onToggle, onCategoryChange, onSearchChange, onSortChange, onReset }: {
  journal: JournalIndexData;
  posts: PublicJournalPost[];
  open: boolean;
  category: string;
  search: string;
  sort: string;
  onToggle: () => void;
  onCategoryChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  onSortChange: (value: string) => void;
  onReset: () => void;
}) {
  const chips = [{ slug: 'all', name: 'All' }, ...journal.categories];

  return <section className={`journal-archive-section ${open ? 'is-open' : ''}`} aria-labelledby="journal-archive-title">
    <button type="button" className="journal-archive-toggle" onClick={onToggle} aria-expanded={open}>
      <span><Archive size={22} /><span><strong id="journal-archive-title">Explore the full archive</strong><small>{Math.max(journal.posts.length - 3, 0)} older published stories</small></span></span><ChevronDown size={22} />
    </button>
    {open ? <div className="journal-archive-content">
      <div className="journal-archive-toolbar">
        <label><Search size={16} /><input value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="Search title, tag or venture" /></label>
        <label><SlidersHorizontal size={16} /><select value={sort} onChange={(event) => onSortChange(event.target.value)}><option value="newest">Newest first</option><option value="updated">Recently updated</option><option value="short">Shortest reading time</option><option value="long">Longest reading time</option></select></label>
        <button type="button" className="button button--ghost button--small" onClick={onReset}><Filter size={16} /> Reset</button>
      </div>
      <div className="chip-group" role="group" aria-label="Archive categories">
        {chips.map((chip) => <button key={chip.slug} type="button" className={`chip ${category === chip.slug ? 'chip--active' : ''}`} onClick={() => onCategoryChange(chip.slug)}>{chip.name}<span>({chip.slug === 'all' ? journal.posts.length : journal.posts.filter((post) => post.journal_categories?.slug === chip.slug).length})</span></button>)}
      </div>
      {posts.length ? <div className="journal-grid">{posts.map((post) => <JournalArticleCard key={post.id} post={post} />)}</div> : <div className="impact-state">No archive stories match these filters.</div>}
    </div> : null}
  </section>;
}
