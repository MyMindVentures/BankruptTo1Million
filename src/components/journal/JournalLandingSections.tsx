import type { I18nManifest } from '../../lib/i18nManifest';
import { Archive, ArrowRight, ChevronDown, Filter, Gift, HandHeart, MapPin, Search, SlidersHorizontal } from 'lucide-react';
import { AceternityContentCard } from '../AceternityContentCard';
import { PremiumJourneyMap, type PremiumJourneyPoint } from '../PremiumJourneyMap';
import { SectionHeading } from '../SectionHeading';
import { JourneyFootageCarousel, type JourneyFootageItem } from './JourneyFootageCarousel';
import { type JournalIndexData, type PublicJournalPost } from '../../lib/journal';
import { formatJournalPeople, getJournalDisplayPeople, type JournalDisplayPerson } from '../../lib/journalPeople';
import { useWebsiteI18n } from '../../lib/websiteI18n';

export const JOURNAL_LANDING_SECTIONS_I18N_MANIFEST = {
  componentKey: 'components.journal.journal.landing.sections',
  namespace: 'journal.timeline',
  translationKeys: [
    'journal.timeline.open_chapter',
  ] as const,
  keyPatterns: [
    'journal.timeline.*',
  ] as const,
} as const satisfies I18nManifest;

export type FounderFilter = 'all' | 'kevin' | 'micha' | 'together';
export type JourneyInvolvedPerson = JournalDisplayPerson & {
  relation_role?: string;
  display_order?: number;
};

export type JourneyPoint = PremiumJourneyPoint & {
  journal_post_id?: string;
  cover_image_url?: string;
  cover_image_alt?: string;
  original_language?: string;
  map_label?: string;
  region_name?: string;
  what_happened?: string;
  why_it_mattered?: string;
  mood?: string;
  marker_variant?: string;
  effective_journey_order?: number;
  involved_people: JourneyInvolvedPerson[];
  footage?: JourneyFootageItem[];
};

export type TimelineExchangeItem = {
  id: string;
  slug: string | null;
  journey_person: string;
  item_type: 'need' | 'offer' | string;
  title: string;
  calendar_entry?: {
    city_name?: string | null;
    location_name?: string | null;
    region_name?: string | null;
    starts_on?: string | null;
    ends_on?: string | null;
  } | null;
};

type ExchangePeriod = 'past' | 'current' | 'upcoming';

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
  const { t } = useWebsiteI18n();
  return <div className={`journal-founder-switch ${className}`.trim()} role="group" aria-label={t('journal.timeline.filter_founder', 'Filter the journey by involved person')}>
    {(['all', 'kevin', 'micha', 'together'] as FounderFilter[]).map((option) => <button key={option} type="button" className={value === option ? 'is-active' : ''} onClick={() => onChange(option)}>{founderFilterLabel(option)}</button>)}
  </div>;
}

function normalizeLocation(value?: string | null) {
  return (value || '').trim().toLocaleLowerCase().replace(/[^a-z0-9à-ÿ]+/g, ' ');
}

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
}

function exchangePeriod(item: TimelineExchangeItem): ExchangePeriod {
  const today = startOfToday();
  const starts = item.calendar_entry?.starts_on ? new Date(`${item.calendar_entry.starts_on}T00:00:00`).getTime() : NaN;
  const ends = item.calendar_entry?.ends_on ? new Date(`${item.calendar_entry.ends_on}T23:59:59`).getTime() : NaN;

  if (!Number.isNaN(ends) && ends < today) return 'past';
  if (!Number.isNaN(starts) && starts > today) return 'upcoming';
  return 'current';
}

function exchangePeriodLabel(period: ExchangePeriod) {
  if (period === 'past') return 'Passed';
  if (period === 'upcoming') return 'Upcoming';
  return 'Now';
}

function exchangeDateLabel(item: TimelineExchangeItem) {
  const starts = item.calendar_entry?.starts_on;
  const ends = item.calendar_entry?.ends_on;
  if (!starts && !ends) return '';
  if (starts && ends && starts !== ends) return `${formatJournalDate(starts)} – ${formatJournalDate(ends)}`;
  return formatJournalDate(starts || ends || '');
}

function exchangeItemsForPoint(point: JourneyPoint, items: TimelineExchangeItem[]) {
  const pointLocations = [point.city_name, point.location_name, point.map_label, point.region_name]
    .map(normalizeLocation)
    .filter(Boolean);

  return items.filter((item) => {
    const calendar = item.calendar_entry;
    const calendarLocations = [calendar?.city_name, calendar?.location_name, calendar?.region_name]
      .map(normalizeLocation)
      .filter(Boolean);
    return calendarLocations.some((calendarLocation) => pointLocations.some(
      (pointLocation) => calendarLocation.includes(pointLocation) || pointLocation.includes(calendarLocation),
    ));
  }).sort((a, b) => {
    const order: Record<ExchangePeriod, number> = { current: 0, upcoming: 1, past: 2 };
    return order[exchangePeriod(a)] - order[exchangePeriod(b)];
  });
}

function exchangeHref(item: TimelineExchangeItem) {
  if (item.item_type === 'offer') return item.slug ? `/offers/${item.slug}` : '/offers';
  return `/support?need=${encodeURIComponent(item.id)}`;
}

function ExchangeBullet({ item }: { item: TimelineExchangeItem }) {
  const period = exchangePeriod(item);
  const dateLabel = exchangeDateLabel(item);
  return <li className={`journal-timeline-card__exchange-item is-${period}`}>
    <a href={exchangeHref(item)}>
      <span className="journal-timeline-card__exchange-copy">
        <span className="journal-timeline-card__exchange-row"><span>• {item.title}</span><span className={`journal-timeline-card__period is-${period}`}>{exchangePeriodLabel(period)}</span></span>
        {dateLabel ? <small>{dateLabel}</small> : null}
      </span>
      <ArrowRight size={13} />
    </a>
  </li>;
}

function TimelineCardHeader({ point, pointPeriod }: { point: JourneyPoint; pointPeriod: ExchangePeriod }) {
  return <div className="journal-timeline-card__topline">
    <time>{formatJournalDate(point.occurred_at)}</time>
    <em className={`journal-timeline-card__status is-${pointPeriod}`}>{exchangePeriodLabel(pointPeriod)}</em>
  </div>;
}

function TimelineCardContent({ point, people, location }: {
  point: JourneyPoint;
  people: JourneyInvolvedPerson[];
  location?: string;
}) {
  return <>
    {people.length ? <div className="journal-timeline-card__people">
      <span className="journal-timeline-card__avatars">{people.slice(0, 3).map((person) => person.avatar_url
        ? <img key={person.id} src={person.avatar_url} alt={person.display_name} />
        : <span key={person.id} aria-label={person.display_name}>{person.display_name.slice(0, 1)}</span>)}</span>
      <span>{formatJournalPeople(people)}</span>
    </div> : null}
    <strong>{point.title}</strong>
    {location ? <span className="journal-timeline-card__location"><MapPin size={14} />{location}{point.country_name ? `, ${point.country_name}` : ''}</span> : null}
    {point.excerpt ? <small>{point.excerpt}</small> : null}
  </>;
}

function ExchangeGroup({ type, items }: { type: 'need' | 'offer'; items: TimelineExchangeItem[] }) {
  const isNeed = type === 'need';
  const label = isNeed ? 'What We Need' : 'What We Offer';
  const Icon = isNeed ? HandHeart : Gift;

  return <details className="journal-timeline-card__exchange-group">
    <summary className="journal-timeline-card__exchange-title">
      <span><Icon size={14} /> {label}</span>
      <span className="journal-timeline-card__exchange-count">{items.length}</span>
      <ChevronDown className="journal-timeline-card__accordion-chevron" size={16} aria-hidden="true" />
    </summary>
    <ul>{items.map((item) => <ExchangeBullet key={item.id} item={item} />)}</ul>
  </details>;
}

export function JournalArticleCard({ post }: { post: PublicJournalPost }) {
  const people = getJournalDisplayPeople(post);
  return <AceternityContentCard
    href={`/journal/${post.slug}`}
    title={post.displayTitle}
    description={post.displayExcerpt || post.displaySubtitle}
    authorName={formatJournalPeople(people)}
    people={people.map((person) => ({ id: person.id, name: person.display_name, avatarSrc: person.avatar_url }))}
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

export function JournalMapSection({ points, activeId, founder, onFounderChange, onSelect }: {
  points: JourneyPoint[];
  activeId?: string;
  founder: FounderFilter;
  onFounderChange: (value: FounderFilter) => void;
  onSelect: (id: string) => void;
}) {
  return <section className="journal-map-first" aria-labelledby="journal-map-title">
    <div className="journal-section-heading-row">
      <div><p className="eyebrow">Live map & current chapter</p><h2 id="journal-map-title">Follow the route as it unfolds.</h2></div>
      <FounderSwitch value={founder} onChange={onFounderChange} />
    </div>
    <PremiumJourneyMap points={points} activeId={activeId} onSelect={onSelect} />
  </section>;
}

export function JournalTimelineSection({ points, exchangeItems, activePoint, founder, onFounderChange, onSelect }: {
  points: JourneyPoint[];
  exchangeItems: TimelineExchangeItem[];
  activePoint?: JourneyPoint;
  founder: FounderFilter;
  onFounderChange: (value: FounderFilter) => void;
  onSelect: (id: string) => void;
}) {
  const { t } = useWebsiteI18n();

  return <section className="journal-timeline-section" aria-labelledby="journal-timeline-title">
    <SectionHeading eyebrow={t('journal.timeline.eyebrow', 'Interactive timeline')} title={t('journal.timeline.title', 'One real chapter at a time.')} titleId="journal-timeline-title">{t('journal.timeline.description', 'Past chapters, current needs and upcoming opportunities are separated clearly.')}</SectionHeading>
    <div className="journal-timeline-legend" aria-label={t('journal.timeline.legend', 'Timeline status legend')}><span className="is-past">{t('journal.timeline.past', 'Passed')}</span><span className="is-current">{t('journal.timeline.current', 'Now')}</span><span className="is-upcoming">{t('journal.timeline.upcoming', 'Upcoming')}</span></div>
    <FounderSwitch value={founder} onChange={onFounderChange} className="journal-founder-switch--timeline" />
    <div className="journal-priority-timeline">
      {points.map((point) => {
        const location = point.map_label || point.location_name || point.city_name;
        const people = point.involved_people || [];
        const linkedItems = exchangeItemsForPoint(point, exchangeItems);
        const needs = linkedItems.filter((item) => item.item_type === 'need');
        const offers = linkedItems.filter((item) => item.item_type === 'offer');
        const isActive = activePoint?.journey_entry_id === point.journey_entry_id;
        const pointPeriod: ExchangePeriod = point.is_current_location ? 'current' : new Date(point.occurred_at).getTime() > Date.now() ? 'upcoming' : 'past';

        return <article key={point.journey_entry_id} className={`journal-priority-timeline__card is-${pointPeriod} ${isActive ? 'is-active' : ''} ${point.slug ? 'is-linkable' : ''}`}>
          <span className="journal-priority-timeline__dot" />
          {point.slug ? <a
            href={`/journal/${point.slug}`}
            className="journal-priority-timeline__card-link"
            aria-label={t('journal.timeline.open_chapter', 'Open chapter: {title}', { title: point.title })}
          /> : null}
          <div className="journal-timeline-card__header">
            <TimelineCardHeader point={point} pointPeriod={pointPeriod} />
          </div>
          <JourneyFootageCarousel items={point.footage} title={point.title} />
          {point.slug
            ? <div className="journal-timeline-card__select journal-timeline-card__select--linked"><TimelineCardContent point={point} people={people} location={location} /></div>
            : <button className="journal-timeline-card__select" type="button" onClick={() => onSelect(point.journey_entry_id)} aria-pressed={isActive}><TimelineCardContent point={point} people={people} location={location} /></button>}

          {linkedItems.length ? <details className="journal-timeline-card__exchange">
            <summary className="journal-timeline-card__exchange-summary">
              <span><HandHeart size={15} /> Needs & offers</span>
              <span className="journal-timeline-card__exchange-total">{linkedItems.length}</span>
              <ChevronDown className="journal-timeline-card__accordion-chevron" size={17} aria-hidden="true" />
            </summary>
            <div className="journal-timeline-card__exchange-content">
              {needs.length ? <ExchangeGroup type="need" items={needs} /> : null}
              {offers.length ? <ExchangeGroup type="offer" items={offers} /> : null}
            </div>
          </details> : null}
        </article>;
      })}
    </div>
  </section>;
}

export function JournalLatestSection({ posts }: { posts: PublicJournalPost[] }) {
  const { t } = useWebsiteI18n();
  return <section className="journal-latest-section" id="latest" aria-labelledby="journal-latest-title">
    <SectionHeading eyebrow={t('journal.timeline.latest_eyebrow', 'Latest stories')} title={t('journal.timeline.latest_title', 'The three newest chapters.')} titleId="journal-latest-title">{t('journal.timeline.latest_description', 'Only the latest three stories stay visible here, so the page remains focused and easy to scan.')}</SectionHeading>
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
  const { t } = useWebsiteI18n();
  const chips = [{ slug: 'all', name: 'All' }, ...journal.categories];
  return <section className={`journal-archive-section ${open ? 'is-open' : ''}`} aria-labelledby="journal-archive-title">
    <button type="button" className="journal-archive-toggle" onClick={onToggle} aria-expanded={open}>
      <span><Archive size={22} /><span><strong id="journal-archive-title">Explore the full archive</strong><small>{Math.max(journal.posts.length - 3, 0)} older published stories</small></span></span><ChevronDown size={22} />
    </button>
    {open ? <div className="journal-archive-content">
      <div className="journal-archive-toolbar">
        <label><Search size={16} /><input value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder={t('journal.timeline.archive_search', 'Search title, tag or venture')} /></label>
        <label><SlidersHorizontal size={16} /><select value={sort} onChange={(event) => onSortChange(event.target.value)}><option value="newest">Newest first</option><option value="updated">Recently updated</option><option value="short">Shortest reading time</option><option value="long">Longest reading time</option></select></label>
        <button type="button" className="button button--ghost button--small" onClick={onReset}><Filter size={16} /> Reset</button>
      </div>
      <div className="chip-group" role="group" aria-label={t('journal.timeline.archive_categories', 'Archive categories')}>
        {chips.map((chip) => <button key={chip.slug} type="button" className={`chip ${category === chip.slug ? 'chip--active' : ''}`} onClick={() => onCategoryChange(chip.slug)}>{chip.name}<span>({chip.slug === 'all' ? journal.posts.length : journal.posts.filter((post) => post.journal_categories?.slug === chip.slug).length})</span></button>)}
      </div>
      {posts.length ? <div className="journal-grid">{posts.map((post) => <JournalArticleCard key={post.id} post={post} />)}</div> : <div className="impact-state">No archive stories match these filters.</div>}
    </div> : null}
  </section>;
}
