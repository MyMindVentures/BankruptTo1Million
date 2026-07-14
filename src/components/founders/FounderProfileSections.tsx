import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  ChevronDown,
  Compass,
  MapPin,
  MessageCircle,
  Rocket,
  ShieldCheck,
  Sparkles,
  Target,
  UserRound,
  Users,
  Zap,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useWebsiteI18n } from '../../lib/websiteI18n';
import type { ConceptLink, FounderPost, FounderProfile, Publication, SwatPoint, TimelineEvent } from './founderProfileTypes';

const timelineFilters = ['all', 'post', 'founder_post', 'host', 'place', 'experience', 'concept', 'partnership', 'career', 'journey'] as const;

function safeExternal(value?: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value, window.location.origin);
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

function TimelineIcon({ type }: { type: string }) {
  if (type === 'host') return <Users size={18} aria-hidden="true" />;
  if (type === 'place') return <MapPin size={18} aria-hidden="true" />;
  if (type === 'concept') return <Rocket size={18} aria-hidden="true" />;
  if (type === 'career') return <BriefcaseBusiness size={18} aria-hidden="true" />;
  if (type === 'partnership') return <MessageCircle size={18} aria-hidden="true" />;
  if (type === 'post' || type === 'founder_post') return <CalendarDays size={18} aria-hidden="true" />;
  return <Compass size={18} aria-hidden="true" />;
}

function translatedEnum(t: ReturnType<typeof useWebsiteI18n>['t'], value: string) {
  return t(`founder_profile.enums.${value}`, value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()));
}

export function FounderProfileHero({ founder, milestoneCount }: { founder: FounderProfile; milestoneCount: number }) {
  const { t, translateText, formatNumber } = useWebsiteI18n();
  return <section className="founder-premium-hero section">
    <div className="founder-premium-hero__copy">
      <div className="founder-badges">
        <span>{t('founder_profile.badges.cofounder', 'Co-founder')}</span>
        <span>{t('founder_profile.badges.public', 'Building in public')}</span>
        <span>{t('founder_profile.badges.partnerships', 'Open to partnerships')}</span>
      </div>
      <p className="eyebrow">{t('founder_profile.hero.eyebrow', 'Bankrupt to 1 Million · Founder Profile')}</p>
      <h1>{founder.full_name}</h1>
      <p className="founder-premium-role">{translateText(founder.role_title)}</p>
      {founder.headline ? <p className="founder-premium-headline">{translateText(founder.headline)}</p> : null}
      {founder.short_bio ? <p className="founder-premium-summary">{translateText(founder.short_bio)}</p> : null}
      <div className="founder-premium-location"><MapPin size={17} aria-hidden="true" />{founder.location ? translateText(founder.location) : t('founder_profile.location_missing', 'Location to be added')}</div>
      <div className="hero__actions">
        <a className="button" href="#journey">{t('founder_profile.actions.explore_journey', 'Explore the journey')} <ArrowRight size={17} aria-hidden="true" /></a>
        <a className="button button--ghost" href="#work">{t('founder_profile.actions.view_work', 'View the work')}</a>
        <a className="button button--ghost" href={founder.partnership_cta_url || '/support/partnerships'}>{founder.partnership_cta_label ? translateText(founder.partnership_cta_label) : t('founder_profile.actions.partnership', 'Discuss a partnership')}</a>
      </div>
    </div>
    <aside className="founder-premium-portrait">
      {founder.avatar_url ? <img src={founder.avatar_url} alt={t('founder_profile.hero.portrait_alt', '{name} founder portrait', { name: founder.full_name })} /> : <div className="founder-profile-avatar"><UserRound size={72} aria-hidden="true" /></div>}
      <div className="founder-metric-grid">
        <div><strong>{formatNumber(founder.published_post_count)}</strong><span>{t('founder_profile.metrics.posts', 'Posts')}</span></div>
        <div><strong>{formatNumber(founder.founder_post_count)}</strong><span>{t('founder_profile.metrics.founder_posts', 'Founder Posts')}</span></div>
        <div><strong>{formatNumber(founder.concept_count)}</strong><span>{t('founder_profile.metrics.concepts', 'Concepts')}</span></div>
        <div><strong>{formatNumber(milestoneCount)}</strong><span>{t('founder_profile.metrics.milestones', 'Milestones')}</span></div>
      </div>
    </aside>
  </section>;
}

export function FounderLocalNav() {
  const { t } = useWebsiteI18n();
  const items = [
    ['story', 'founder_profile.nav.story', 'Story'],
    ['reality-check', 'founder_profile.nav.strengths', 'Strengths & Struggles'],
    ['capabilities', 'founder_profile.nav.capabilities', 'Capabilities'],
    ['journey', 'founder_profile.nav.timeline', 'Timeline'],
    ['work', 'founder_profile.nav.work', 'Work'],
    ['mission', 'founder_profile.nav.mission', 'Mission'],
  ];
  return <nav className="founder-local-nav section" aria-label={t('founder_profile.nav.aria', 'Founder profile sections')}>
    {items.map(([id, key, fallback]) => <a href={`#${id}`} key={id}>{t(key, fallback)}</a>)}
  </nav>;
}

export function FounderSnapshot({ founder }: { founder: FounderProfile }) {
  const { t, translateText } = useWebsiteI18n();
  return <section className="founder-snapshot section">
    <div><span>{t('founder_profile.snapshot.role', 'Current role')}</span><strong>{translateText(founder.role_title)}</strong></div>
    <div><span>{t('founder_profile.snapshot.based_in', 'Based in')}</span><strong>{founder.location ? translateText(founder.location) : t('founder_profile.to_be_added', 'To be added')}</strong></div>
    <div><span>{t('founder_profile.snapshot.focus', 'Main focus')}</span><strong>{founder.expertise?.length ? founder.expertise.slice(0, 2).map((item) => translateText(item)).join(' · ') : t('founder_profile.snapshot.default_focus', 'Mission and ventures')}</strong></div>
    <div><span>{t('founder_profile.snapshot.public_since', 'Public since')}</span><strong>{t('founder_profile.snapshot.public_since_value', 'July 2026')}</strong></div>
  </section>;
}

export function FounderStorySection({ founder }: { founder: FounderProfile }) {
  const { t, translateText } = useWebsiteI18n();
  return <section className="founder-story-layout section" id="story">
    <article className="founder-story-copy"><p className="eyebrow">{t('founder_profile.story.eyebrow', 'Founder story')}</p><h2>{t('founder_profile.story.title', 'The story behind the founder')}</h2>{founder.full_bio ? <p>{translateText(founder.full_bio)}</p> : null}{founder.founder_story ? <p>{translateText(founder.founder_story)}</p> : null}</article>
    <aside className="founder-mission-quote"><Sparkles size={24} aria-hidden="true" /><blockquote>{translateText(founder.personal_mission || founder.headline || '')}</blockquote><strong>{founder.full_name}</strong><span>{translateText(founder.role_title)}</span></aside>
  </section>;
}

function SwatPointCard({ point }: { point: SwatPoint }) {
  const { t, translateText } = useWebsiteI18n();
  const struggle = point.point_type === 'struggle';
  return <details className="founder-swat-card">
    <summary><span>{String(point.display_order).padStart(2, '0')}</span><div><strong>{translateText(point.title)}</strong><p>{translateText(point.summary)}</p></div><ChevronDown size={17} aria-hidden="true" /></summary>
    <div className="founder-swat-card__details">
      {point.evidence ? <p><b>{struggle ? t('founder_profile.swat.context', 'Context:') : t('founder_profile.swat.evidence', 'Evidence:')}</b> {translateText(point.evidence)}</p> : null}
      {point.practical_impact ? <p><b>{struggle ? t('founder_profile.swat.risk', 'Risk:') : t('founder_profile.swat.impact', 'Practical impact:')}</b> {translateText(point.practical_impact)}</p> : null}
      {point.management_strategy ? <p><b>{struggle ? t('founder_profile.swat.management', 'Management strategy:') : t('founder_profile.swat.usage', 'How it is used:')}</b> {translateText(point.management_strategy)}</p> : null}
    </div>
  </details>;
}

export function FounderSwatSection({ strengths, struggles }: { strengths: SwatPoint[]; struggles: SwatPoint[] }) {
  const { t } = useWebsiteI18n();
  return <section className="section" id="reality-check">
    <div className="founder-section-heading"><div><p className="eyebrow">{t('founder_profile.swat.eyebrow', 'Professional reality check')}</p><h2>{t('founder_profile.swat.title', 'Strengths & Struggles')}</h2><p>{t('founder_profile.swat.description', 'A rational view of what this founder brings, where friction appears and how both are managed professionally.')}</p></div><ShieldCheck size={34} aria-hidden="true" /></div>
    <div className="founder-swat-grid">
      <div className="founder-swat-column founder-swat-column--strength"><div className="founder-swat-title"><Zap size={20} aria-hidden="true" /><h3>{t('founder_profile.swat.strengths', 'Five strengths')}</h3></div>{strengths.map((point) => <SwatPointCard key={point.id} point={point} />)}</div>
      <div className="founder-swat-column founder-swat-column--struggle"><div className="founder-swat-title"><Target size={20} aria-hidden="true" /><h3>{t('founder_profile.swat.struggles', 'Five struggles')}</h3></div>{struggles.map((point) => <SwatPointCard key={point.id} point={point} />)}</div>
    </div>
  </section>;
}

export function FounderCapabilitiesSection({ founder }: { founder: FounderProfile }) {
  const { t, translateText } = useWebsiteI18n();
  const tags = (items: string[]) => <div className="founder-tag-cloud">{items?.map((item) => <span key={item}>{translateText(item)}</span>)}</div>;
  const list = (items: string[]) => <ul>{items?.map((item) => <li key={item}>{translateText(item)}</li>)}</ul>;
  return <section className="section" id="capabilities">
    <div className="founder-section-heading"><div><p className="eyebrow">{t('founder_profile.capabilities.eyebrow', 'Capabilities')}</p><h2>{t('founder_profile.capabilities.title', 'Skills, expertise and responsibilities')}</h2></div><BriefcaseBusiness size={34} aria-hidden="true" /></div>
    <div className="founder-capability-grid">
      <article><h3>{t('founder_profile.capabilities.strengths', 'Core strengths')}</h3>{tags(founder.core_strengths)}</article>
      <article><h3>{t('founder_profile.capabilities.expertise', 'Expertise')}</h3>{tags(founder.expertise)}</article>
      <article><h3>{t('founder_profile.capabilities.responsibilities', 'Responsibilities')}</h3>{list(founder.responsibilities)}</article>
      <article><h3>{t('founder_profile.capabilities.experience', 'Lived experience')}</h3>{list(founder.lived_experience_topics)}</article>
    </div>
  </section>;
}

export function FounderTimelineSection({ timeline }: { timeline: TimelineEvent[] }) {
  const { t, translateText, formatDate, formatNumber } = useWebsiteI18n();
  const [filter, setFilter] = useState<string>('all');
  const filtered = useMemo(() => filter === 'all' ? timeline : timeline.filter((event) => event.event_type === filter), [filter, timeline]);
  return <section className="section" id="journey">
    <div className="founder-section-heading"><div><p className="eyebrow">{t('founder_profile.timeline.eyebrow', 'Interactive founder timeline')}</p><h2>{t('founder_profile.timeline.title', 'The journey so far')}</h2><p>{t('founder_profile.timeline.description', 'Posts, hosts, places, concepts, partnerships and life experiences appear in one evolving timeline.')}</p></div><Compass size={34} aria-hidden="true" /></div>
    <div className="founder-timeline-filters">{timelineFilters.map((item) => <button key={item} type="button" data-active={filter === item} onClick={() => setFilter(item)}>{translatedEnum(t, item)}<span>{formatNumber(item === 'all' ? timeline.length : timeline.filter((event) => event.event_type === item).length)}</span></button>)}</div>
    {!filtered.length ? <div className="impact-state">{t('founder_profile.timeline.empty', 'No public events in this category yet.')}</div> : <div className="founder-timeline">{filtered.map((event) => {
      const link = event.journal_post_slug ? `/journal/${event.journal_post_slug}` : event.concept_slug ? `/proof-of-mind/${event.concept_slug}` : safeExternal(event.external_url);
      const location = [event.location_name, event.city, event.country].filter(Boolean).map((part) => translateText(String(part))).join(' · ');
      return <article key={event.id} className="founder-timeline-event" data-featured={event.is_featured}>
        <div className="founder-timeline-event__rail"><span><TimelineIcon type={event.event_type} /></span></div>
        <div className="founder-timeline-event__card">
          {event.cover_image_url ? <img src={event.cover_image_url} alt={event.media?.[0]?.alt_text ? translateText(event.media[0].alt_text) : ''} loading="lazy" /> : null}
          <div className="founder-timeline-event__content"><div className="founder-timeline-event__meta"><span>{translatedEnum(t, event.event_type)}</span><time dateTime={event.occurred_at}>{formatDate(event.occurred_at, { timeZone: 'Europe/Madrid', day: '2-digit', month: 'short', year: 'numeric' })}</time></div><h3>{translateText(event.title)}</h3>{event.subtitle ? <p className="founder-timeline-event__subtitle">{translateText(event.subtitle)}</p> : null}{event.description ? <p>{translateText(event.description)}</p> : null}{location ? <div className="founder-timeline-event__location"><MapPin size={15} aria-hidden="true" />{location}</div> : null}{event.host_name ? <div className="founder-host-note"><Users size={16} aria-hidden="true" /><div><strong>{t('founder_profile.timeline.hosted_by', 'Hosted by {name}', { name: event.host_name })}</strong>{event.host_thank_you ? <p>{translateText(event.host_thank_you)}</p> : null}</div></div> : null}{link ? <a href={link}>{t('founder_profile.timeline.open_story', 'Open connected story')} <ArrowRight size={15} aria-hidden="true" /></a> : null}</div>
        </div>
      </article>;
    })}</div>}
  </section>;
}

export function FounderWorkSection({ founder, founderPosts, concepts, posts }: { founder: FounderProfile; founderPosts: FounderPost[]; concepts: ConceptLink[]; posts: Publication[] }) {
  const { t, translateText, formatDate, formatNumber } = useWebsiteI18n();
  const date = (value: string, includeTime = false) => formatDate(value, { timeZone: 'Europe/Madrid', day: '2-digit', month: 'short', year: 'numeric', ...(includeTime ? { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' as const } : {}) });
  return <>
    <section className="section" id="work">
      <div className="founder-section-heading"><div><p className="eyebrow">{t('founder_profile.work.eyebrow', 'Proof of work')}</p><h2>{t('founder_profile.work.title', 'What {name} is building and documenting', { name: founder.display_name })}</h2></div><Rocket size={34} aria-hidden="true" /></div>
      <div className="founder-work-columns">
        <section><div className="founder-work-title"><h3>{t('founder_profile.work.founder_posts', 'Founder Posts')}</h3><span>{formatNumber(founder.founder_post_count)}</span></div>{founderPosts.length ? <div className="founder-profile-list">{founderPosts.map((post) => <article key={post.founder_post_id}><span>{translateText(post.concept_title)}</span><h4>{translateText(post.post_title)}</h4>{post.excerpt ? <p>{translateText(post.excerpt)}</p> : null}<div><time>{date(post.published_at)}</time><a href={`/journal/${post.post_slug}`}>{t('founder_profile.work.read', 'Read')} <ArrowRight size={14} aria-hidden="true" /></a></div></article>)}</div> : <div className="impact-state">{t('founder_profile.work.no_founder_posts', 'No public Founder Posts yet.')}</div>}</section>
        <section><div className="founder-work-title"><h3>{t('founder_profile.work.concepts', 'Proof of Mind concepts')}</h3><span>{formatNumber(founder.concept_count)}</span></div>{concepts.length ? <div className="founder-profile-list">{concepts.map((link) => { const concept = link.proof_of_mind_concepts!; return <article key={concept.id}><span>{link.is_original_creator ? t('founder_profile.work.original_creator', 'Original creator') : translatedEnum(t, link.founder_role)}</span><h4>{translateText(concept.title)}</h4><p>{translateText(concept.tagline || concept.short_description)}</p><div><small>{translatedEnum(t, concept.concept_status)}</small><a href={`/proof-of-mind/${concept.slug}`}>{t('founder_profile.work.explore', 'Explore')} <ArrowRight size={14} aria-hidden="true" /></a></div></article>; })}</div> : <div className="impact-state">{t('founder_profile.work.no_concepts', 'No individually linked concepts yet.')}</div>}</section>
      </div>
    </section>
    <section className="section">
      <div className="founder-section-heading"><div><p className="eyebrow">{t('founder_profile.publications.eyebrow', 'Latest publications')}</p><h2>{t('founder_profile.publications.title', 'Recent posts by {name}', { name: founder.display_name })}</h2></div><CalendarDays size={34} aria-hidden="true" /></div>
      <div className="founder-publication-grid">{posts.slice(0, 3).map((post) => <article key={post.id}><time dateTime={post.published_at}>{date(post.published_at, true)}</time><h3>{translateText(post.title)}</h3>{post.excerpt ? <p>{translateText(post.excerpt)}</p> : null}<div><span>{t('founder_profile.publications.reading_time', '{minutes} min read', { minutes: formatNumber(post.reading_time_minutes || 4) })}</span><a href={`/journal/${post.slug}`}>{t('founder_profile.publications.read_post', 'Read post')} <ArrowRight size={15} aria-hidden="true" /></a></div></article>)}</div>
    </section>
  </>;
}

export function FounderMissionSection({ founder }: { founder: FounderProfile }) {
  const { t, translateText } = useWebsiteI18n();
  return <section className="founder-mission-values section" id="mission">
    <article><p className="eyebrow">{t('founder_profile.mission.eyebrow', 'Personal mission')}</p><h2>{t('founder_profile.mission.title', 'What this founder is working toward')}</h2><p>{translateText(founder.personal_mission || '')}</p></article>
    <article><p className="eyebrow">{t('founder_profile.values.eyebrow', 'Values')}</p><h2>{t('founder_profile.values.title', 'Principles behind the work')}</h2><div className="founder-tag-cloud">{founder.values?.map((value) => <span key={value}>{translateText(value)}</span>)}</div></article>
  </section>;
}

export function FounderFinalCta({ founder }: { founder: FounderProfile }) {
  const { t, translateText } = useWebsiteI18n();
  const title = founder.slug === 'kevin-de-vlieger'
    ? t('founder_profile.final_cta.kevin_title', 'Have a concept, opportunity or partnership worth exploring?')
    : t('founder_profile.final_cta.micha_title', 'Want to support the human side of the rebuilding mission?');
  return <section className="founder-final-cta section">
    <div><p className="eyebrow">{t('founder_profile.final_cta.eyebrow', 'Build something meaningful together')}</p><h2>{title}</h2><p>{t('founder_profile.final_cta.description', 'Connect around partnerships, launch opportunities, community, hosts, storytelling or practical support.')}</p></div>
    <div><a className="button" href={founder.partnership_cta_url || '/support/partnerships'}>{founder.partnership_cta_label ? translateText(founder.partnership_cta_label) : t('founder_profile.actions.partnership', 'Discuss a partnership')} <ArrowRight size={17} aria-hidden="true" /></a><a className="button button--ghost" href={founder.contact_cta_url || '/support'}>{founder.contact_cta_label ? translateText(founder.contact_cta_label) : t('founder_profile.final_cta.connect', 'Connect with {name}', { name: founder.display_name })}</a></div>
  </section>;
}

export function FounderSwitch({ currentSlug }: { currentSlug: string }) {
  const { t } = useWebsiteI18n();
  const other = currentSlug === 'kevin-de-vlieger' ? { slug: 'micha', name: 'Micha' } : { slug: 'kevin-de-vlieger', name: 'Kevin De Vlieger' };
  return <section className="founder-switch section"><span>{t('founder_profile.switch.label', 'Meet the other co-founder')}</span><a href={`/founders/${other.slug}`}>{other.name} <ArrowRight size={16} aria-hidden="true" /></a></section>;
}
