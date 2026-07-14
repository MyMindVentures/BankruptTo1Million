import { ArrowRight, Gift, HandHeart } from 'lucide-react';
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
import { applyTranslation, filterPosts, getJournalIndex, type JournalCategory, type JournalIndexData, type PublicJournalPost } from '../lib/journal';
import { getJournalDisplayPeople } from '../lib/journalPeople';
import { supabase } from '../lib/supabase';
import { useWebsiteI18n } from '../lib/websiteI18n';
import './JournalLandingPage.css';
import './JournalLandingResponsive.css';
import './JournalTimelineExchange.css';
import './JournalViewportFix.css';

type LocalizedText = { language_code: string; title?: string | null; tagline?: string | null; description?: string | null; translation_status?: string | null };
type CategoryTranslation = { category_id: string; language_code: string; name?: string | null; description?: string | null; translation_status?: string | null };

type JourneyExchangeItem = {
  id: string;
  slug: string | null;
  journey_person: 'kevin' | 'micha' | 'together' | string;
  item_type: 'need' | 'offer' | string;
  category: string;
  title: string;
  tagline: string | null;
  description: string;
  priority: string | null;
  status: string;
  is_featured: boolean;
  journey_exchange_item_translations?: LocalizedText[];
  calendar_entry?: {
    city_name?: string | null;
    location_name?: string | null;
    region_name?: string | null;
    starts_on?: string | null;
    ends_on?: string | null;
  } | null;
};

async function readJson<T>(responseOrPromise: Response | Promise<Response>): Promise<T> {
  const response = await responseOrPromise;
  if (!response.ok) throw new Error(await response.text());
  return response.json() as Promise<T>;
}

function matchesFounder(point: JourneyPoint, founder: FounderFilter) {
  if (founder === 'all') return true;
  const slugs = (point.involved_people || []).map((person) => person.slug);
  if (founder === 'together') return point.journey_person === 'together' || (slugs.includes('kevin-de-vlieger') && slugs.includes('micha'));
  const expectedSlug = founder === 'kevin' ? 'kevin-de-vlieger' : 'micha';
  return point.journey_person === founder || slugs.includes(expectedSlug);
}

function compareByOccurredAt(a: JourneyPoint, b: JourneyPoint) {
  return new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime() || a.journey_entry_id.localeCompare(b.journey_entry_id);
}

function newestPoint(points: JourneyPoint[]) {
  return [...points].sort((a, b) => compareByOccurredAt(b, a))[0];
}

function hydrateJourneyPoint(point: JourneyPoint, post?: PublicJournalPost): JourneyPoint {
  if (!post) return point;
  const people = getJournalDisplayPeople(post).map((person, index) => ({ ...person, relation_role: 'subject', display_order: index }));
  return {
    ...point,
    journal_post_id: post.id,
    slug: post.slug,
    title: post.displayTitle,
    excerpt: post.displayExcerpt || post.displaySubtitle || point.excerpt,
    cover_image_url: post.cover_image_url || point.cover_image_url,
    cover_image_alt: post.cover_image_alt || point.cover_image_alt,
    original_language: post.original_language || point.original_language,
    involved_people: people.length ? people : point.involved_people,
  };
}

function localizeExchangeItem(item: JourneyExchangeItem, language: string): JourneyExchangeItem {
  const translation = item.journey_exchange_item_translations?.find((row) => row.language_code === language && (!row.translation_status || row.translation_status === 'published'));
  return { ...item, title: translation?.title || item.title, tagline: translation?.tagline || item.tagline, description: translation?.description || item.description };
}

function personLabel(person: JourneyExchangeItem['journey_person']) {
  if (person === 'kevin') return 'Kevin';
  if (person === 'micha') return 'Micha';
  return 'Kevin & Micha';
}

function JournalExchangeSection({ items }: { items: JourneyExchangeItem[] }) {
  const { translateText } = useWebsiteI18n();
  const needs = items.filter((item) => item.item_type === 'need');
  const offers = items.filter((item) => item.item_type === 'offer');
  return <section className="journal-exchange" aria-labelledby="journal-exchange-title">
    <div className="journal-exchange__heading">
      <p className="eyebrow">{translateText('Exchange, not charity')}</p>
      <h2 id="journal-exchange-title">{translateText('What we need — and what we give back.')}</h2>
      <p>{translateText('Follow the journey, see the practical needs around each chapter, and discover the real skills and experiences Kevin and Micha can offer in return.')}</p>
    </div>
    <div className="journal-exchange__columns">
      <article className="journal-exchange__panel" id="what-we-need">
        <div className="journal-exchange__panel-heading"><HandHeart size={22} /><div><p className="eyebrow">{translateText('What we need')}</p><h3>{translateText('Help create the next step')}</h3></div></div>
        <div className="journal-exchange__items">
          {needs.map((item) => <div className="journal-exchange__item" key={item.id}><div><span>{personLabel(item.journey_person)} · {translateText(item.category.replaceAll('_', ' '))}</span><h4>{item.title}</h4><p>{item.tagline || item.description}</p></div>{item.priority ? <strong>{translateText(item.priority)}</strong> : null}</div>)}
          {!needs.length ? <p className="journal-exchange__empty">{translateText('No public needs are active right now.')}</p> : null}
        </div>
      </article>
      <article className="journal-exchange__panel journal-exchange__panel--offer" id="what-we-offer">
        <div className="journal-exchange__panel-heading"><Gift size={22} /><div><p className="eyebrow">{translateText('What we offer')}</p><h3>{translateText('Skills, experiences and honest value')}</h3></div></div>
        <div className="journal-exchange__items">
          {offers.slice(0, 3).map((item) => <a className="journal-exchange__item journal-exchange__item--link" href={item.slug ? `/offers/${item.slug}` : '/offers'} key={item.id}><div><span>{personLabel(item.journey_person)} · {translateText(item.category.replaceAll('_', ' '))}</span><h4>{item.title}</h4><p>{item.tagline || item.description}</p></div><ArrowRight size={18} /></a>)}
          {!offers.length ? <p className="journal-exchange__empty">{translateText('Explore the complete offer catalogue.')}</p> : null}
        </div>
        <a className="journal-exchange__all" href="/offers">{translateText('View all offers')} <ArrowRight size={17} /></a>
      </article>
    </div>
  </section>;
}

export function JournalLandingPage() {
  const { language } = useWebsiteI18n();
  const [journal, setJournal] = useState<JournalIndexData | null>(null);
  const [journey, setJourney] = useState<JourneyPoint[]>([]);
  const [exchangeItems, setExchangeItems] = useState<JourneyExchangeItem[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [founder, setFounder] = useState<FounderFilter>('all');
  const [activeId, setActiveId] = useState<string>();
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('newest');

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    Promise.all([
      getJournalIndex(),
      readJson<JourneyPoint[]>(supabase.from('public_journal_map_points').request({ query: 'select=*&order=occurred_at.asc,journey_entry_id.asc' })),
      readJson<JourneyExchangeItem[]>(supabase.from('journey_exchange_items').request({
        query: `select=id,slug,journey_person,item_type,category,title,tagline,description,priority,status,is_featured,journey_exchange_item_translations(language_code,title,tagline,description,translation_status),calendar_entry:journey_calendar_entries(city_name,location_name,region_name,starts_on,ends_on)&is_public=eq.true&status=eq.active&order=is_featured.desc,display_order.asc,created_at.desc`,
      })),
      readJson<CategoryTranslation[]>(supabase.from('journal_category_translations').request({ query: `select=category_id,language_code,name,description,translation_status&language_code=eq.${encodeURIComponent(language)}` })),
    ]).then(([rawJournal, journeyRows, exchangeRows, categoryTranslations]) => {
      if (cancelled) return;
      const categoryById = new Map(categoryTranslations.filter((row) => !row.translation_status || row.translation_status === 'published').map((row) => [row.category_id, row]));
      const categories: JournalCategory[] = rawJournal.categories.map((category) => ({ ...category, name: categoryById.get(category.id)?.name || category.name, description: categoryById.get(category.id)?.description || category.description }));
      const categoryMap = new Map(categories.map((category) => [category.id, category]));
      const posts = rawJournal.posts.map((post) => {
        const localized = applyTranslation(post, language);
        return { ...localized, journal_categories: localized.category_id ? categoryMap.get(localized.category_id) || localized.journal_categories : localized.journal_categories };
      });
      const journalData: JournalIndexData = {
        ...rawJournal,
        posts,
        categories,
        featured: posts.find((post) => post.is_featured),
        visions: posts.filter((post) => post.is_vision_feature),
        ventureGroups: rawJournal.ventureGroups.map((group) => ({ ...group, posts: group.posts.map((post) => posts.find((localized) => localized.id === post.id) || applyTranslation(post, language)) })),
      };
      const postsBySlug = new Map(posts.map((post) => [post.slug, post]));
      const hydratedJourney = journeyRows.map((point) => hydrateJourneyPoint(point, postsBySlug.get(point.slug))).sort(compareByOccurredAt);
      setJournal(journalData);
      setJourney(hydratedJourney);
      setExchangeItems(exchangeRows.map((item) => localizeExchangeItem(item, language)));
      setActiveId(newestPoint(hydratedJourney)?.journey_entry_id);
      setStatus('ready');
    }).catch(() => { if (!cancelled) setStatus('error'); });
    return () => { cancelled = true; };
  }, [language]);

  const filteredJourney = useMemo(() => journey.filter((point) => matchesFounder(point, founder)), [journey, founder]);
  const activePoint = filteredJourney.find((point) => point.journey_entry_id === activeId) || newestPoint(filteredJourney);
  const latestPosts = useMemo(() => (journal?.posts || []).slice(0, 3), [journal]);
  const archivePosts = useMemo(() => filterPosts(journal?.posts || [], { category, search, sort }).filter((post) => !latestPosts.some((latest) => latest.id === post.id)), [journal, category, search, sort, latestPosts]);

  useEffect(() => { if (activePoint && activePoint.journey_entry_id !== activeId) setActiveId(activePoint.journey_entry_id); }, [activeId, activePoint]);
  const resetArchiveFilters = () => { setCategory('all'); setSearch(''); setSort('newest'); };

  return <><Header /><main className="journal-priority-page"><JournalIntroSection /><JournalStatusState status={status} />{status === 'ready' && journal ? <><JournalExchangeSection items={exchangeItems} /><JournalMapSection points={filteredJourney} activePoint={activePoint} founder={founder} onFounderChange={setFounder} onSelect={setActiveId} /><JournalTimelineSection points={filteredJourney} exchangeItems={exchangeItems} activePoint={activePoint} founder={founder} onFounderChange={setFounder} onSelect={setActiveId} /><JournalLatestSection posts={latestPosts} /><JournalArchiveSection journal={journal} posts={archivePosts} open={archiveOpen} category={category} search={search} sort={sort} onToggle={() => setArchiveOpen((value) => !value)} onCategoryChange={setCategory} onSearchChange={setSearch} onSortChange={setSort} onReset={resetArchiveFilters} /></> : null}</main><Footer /></>;
}
