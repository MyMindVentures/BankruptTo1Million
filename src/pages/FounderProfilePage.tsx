import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  ChevronDown,
  Compass,
  ExternalLink,
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
import { useEffect, useMemo, useState } from 'react';
import { Footer } from '../components/Footer';
import { Header } from '../components/Header';
import { supabase } from '../lib/supabase';
import '../styles/founderProfiles.css';

type FounderProfile = {
  id: string;
  slug: string;
  full_name: string;
  display_name: string;
  headline: string | null;
  role_title: string;
  short_bio: string | null;
  full_bio: string | null;
  personal_mission: string | null;
  founder_story: string | null;
  core_strengths: string[];
  expertise: string[];
  lived_experience_topics: string[];
  responsibilities: string[];
  values: string[];
  location: string | null;
  avatar_url: string | null;
  cover_image_url: string | null;
  intro_video_url: string | null;
  website_url: string | null;
  github_url: string | null;
  linkedin_url: string | null;
  instagram_url: string | null;
  x_url: string | null;
  contact_cta_label: string | null;
  contact_cta_url: string | null;
  partnership_cta_label: string | null;
  partnership_cta_url: string | null;
  original_language: string;
  published_post_count: number;
  founder_post_count: number;
  concept_count: number;
  founder_message_count: number;
  journal_author_id: string;
  concept_founder_id: string | null;
};

type SwatPoint = {
  id: string;
  point_type: 'strength' | 'struggle';
  title: string;
  summary: string;
  evidence: string | null;
  practical_impact: string | null;
  management_strategy: string | null;
  display_order: number;
};

type TimelineEvent = {
  id: string;
  event_type: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  occurred_at: string;
  ended_at: string | null;
  location_name: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  host_name: string | null;
  host_profile_url: string | null;
  host_thank_you: string | null;
  journal_post_slug: string | null;
  concept_slug: string | null;
  external_url: string | null;
  cover_image_url: string | null;
  icon_key: string | null;
  is_featured: boolean;
  media: Array<{ id: string; media_url: string | null; media_type: string; caption: string | null; alt_text: string | null; is_primary: boolean }>;
};

type FounderPost = {
  founder_post_id: string;
  post_slug: string;
  post_title: string;
  excerpt: string | null;
  published_at: string;
  concept_slug: string;
  concept_title: string;
};

type Publication = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  published_at: string;
  reading_time_minutes: number | null;
};

type ConceptLink = {
  founder_role: string;
  is_original_creator: boolean;
  proof_of_mind_concepts: {
    id: string;
    slug: string;
    title: string;
    tagline: string | null;
    short_description: string;
    category: string | null;
    concept_status: string;
    cover_image_url: string | null;
    updated_at: string;
  } | null;
};

const timelineFilters = ['all', 'post', 'founder_post', 'host', 'place', 'experience', 'concept', 'partnership', 'career', 'journey'];

async function readJson<T>(response: Response | Promise<Response>): Promise<T> {
  const result = await response;
  if (!result.ok) throw new Error(await result.text());
  return result.json() as Promise<T>;
}

function formatTimestamp(value: string, includeTime = false) {
  const date = new Date(value);
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'Europe/Madrid',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(includeTime ? { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' as const } : {}),
  };
  return new Intl.DateTimeFormat('en-GB', options).format(date);
}

function humanize(value: string) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

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
  if (type === 'host') return <Users size={18} />;
  if (type === 'place') return <MapPin size={18} />;
  if (type === 'concept') return <Rocket size={18} />;
  if (type === 'career') return <BriefcaseBusiness size={18} />;
  if (type === 'partnership') return <MessageCircle size={18} />;
  if (type === 'post' || type === 'founder_post') return <CalendarDays size={18} />;
  return <Compass size={18} />;
}

export function FounderProfilePage({ slug }: { slug: string }) {
  const [founder, setFounder] = useState<FounderProfile | null>(null);
  const [swat, setSwat] = useState<SwatPoint[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [founderPosts, setFounderPosts] = useState<FounderPost[]>([]);
  const [posts, setPosts] = useState<Publication[]>([]);
  const [concepts, setConcepts] = useState<ConceptLink[]>([]);
  const [timelineFilter, setTimelineFilter] = useState('all');
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    setStatus('loading');
    setTimelineFilter('all');
    readJson<FounderProfile[]>(supabase.from('founder_profiles_public').request({ query: `select=*&slug=eq.${encodeURIComponent(slug)}&limit=1` }))
      .then(async (profiles) => {
        const profile = profiles[0] || null;
        if (!profile) {
          setFounder(null);
          setStatus('ready');
          return;
        }
        setFounder(profile);
        const requests: Promise<unknown>[] = [
          readJson<SwatPoint[]>(supabase.from('founder_swat_public').request({ query: `select=*&founder_slug=eq.${encodeURIComponent(slug)}&order=point_type.asc,display_order.asc` })),
          readJson<TimelineEvent[]>(supabase.from('founder_timeline_public').request({ query: `select=*&founder_slug=eq.${encodeURIComponent(slug)}&order=occurred_at.desc` })),
          readJson<FounderPost[]>(supabase.from('founder_posts_public').request({ query: `select=founder_post_id,post_slug,post_title,excerpt,published_at,concept_slug,concept_title&founder_slug=eq.${encodeURIComponent(slug)}&order=published_at.desc&limit=3` })),
          readJson<Array<{ journal_posts: Publication | null }>>(supabase.from('journal_post_author_links').request({ query: `select=journal_posts!inner(id,slug,title,excerpt,published_at,reading_time_minutes,status)&journal_author_id=eq.${profile.journal_author_id}&journal_posts.status=eq.published&journal_posts.published_at=not.is.null&order=journal_posts(published_at).desc&limit=6` })),
        ];
        if (profile.concept_founder_id) {
          requests.push(readJson<ConceptLink[]>(supabase.from('proof_of_mind_concept_founders').request({ query: `select=founder_role,is_original_creator,proof_of_mind_concepts(id,slug,title,tagline,short_description,category,concept_status,cover_image_url,updated_at)&founder_id=eq.${profile.concept_founder_id}&order=updated_at.desc&limit=6` })));
        } else {
          requests.push(Promise.resolve([] as ConceptLink[]));
        }
        const [swatRows, timelineRows, founderPostRows, postLinks, conceptRows] = await Promise.all(requests) as [
          SwatPoint[], TimelineEvent[], FounderPost[], Array<{ journal_posts: Publication | null }>, ConceptLink[]
        ];
        setSwat(swatRows);
        setTimeline(timelineRows);
        setFounderPosts(founderPostRows);
        setPosts(postLinks.map((link) => link.journal_posts).filter((post): post is Publication => Boolean(post)));
        setConcepts(conceptRows.filter((row) => Boolean(row.proof_of_mind_concepts)));
        setStatus('ready');
        document.title = `${profile.full_name} | Founder Profile`;
      })
      .catch(() => setStatus('error'));
  }, [slug]);

  const strengths = swat.filter((point) => point.point_type === 'strength');
  const struggles = swat.filter((point) => point.point_type === 'struggle');
  const filteredTimeline = useMemo(() => timelineFilter === 'all' ? timeline : timeline.filter((event) => event.event_type === timelineFilter), [timeline, timelineFilter]);
  const otherFounder = slug === 'kevin-de-vlieger' ? { slug: 'micha', name: 'Micha' } : { slug: 'kevin-de-vlieger', name: 'Kevin De Vlieger' };

  return <><Header /><div className="page-shell"><main className="founder-profile-page">
    {status === 'loading' ? <section className="section"><div className="impact-state">Loading founder profile…</div></section> : null}
    {status === 'error' || (status === 'ready' && !founder) ? <section className="section"><div className="impact-state impact-state--error">Founder profile not found or not public.</div><a className="button" href="/journal"><ArrowLeft size={17}/> Back to The Journal</a></section> : null}
    {founder ? <>
      <section className="founder-premium-hero section">
        <div className="founder-premium-hero__copy">
          <div className="founder-badges"><span>Co-founder</span><span>Building in public</span><span>Open to partnerships</span></div>
          <p className="eyebrow">Bankrupt to 1 Million · Founder Profile</p>
          <h1>{founder.full_name}</h1>
          <p className="founder-premium-role">{founder.role_title}</p>
          {founder.headline ? <p className="founder-premium-headline">{founder.headline}</p> : null}
          {founder.short_bio ? <p className="founder-premium-summary">{founder.short_bio}</p> : null}
          <div className="founder-premium-location"><MapPin size={17}/>{founder.location || 'Location to be added'}</div>
          <div className="hero__actions">
            <a className="button" href="#journey">Explore the journey <ArrowRight size={17}/></a>
            <a className="button button--ghost" href="#work">View the work</a>
            <a className="button button--ghost" href={founder.partnership_cta_url || '/support/partnerships'}>{founder.partnership_cta_label || 'Discuss a partnership'}</a>
          </div>
        </div>
        <aside className="founder-premium-portrait">
          {founder.avatar_url ? <img src={founder.avatar_url} alt={`${founder.full_name} founder portrait`} /> : <div className="founder-profile-avatar"><UserRound size={72}/></div>}
          <div className="founder-metric-grid">
            <div><strong>{founder.published_post_count}</strong><span>Posts</span></div>
            <div><strong>{founder.founder_post_count}</strong><span>Founder Posts</span></div>
            <div><strong>{founder.concept_count}</strong><span>Concepts</span></div>
            <div><strong>{timeline.length}</strong><span>Milestones</span></div>
          </div>
        </aside>
      </section>

      <nav className="founder-local-nav section" aria-label="Founder profile sections">
        <a href="#story">Story</a><a href="#reality-check">Strengths & Struggles</a><a href="#capabilities">Capabilities</a><a href="#journey">Timeline</a><a href="#work">Work</a><a href="#mission">Mission</a>
      </nav>

      <section className="founder-snapshot section">
        <div><span>Current role</span><strong>{founder.role_title}</strong></div>
        <div><span>Based in</span><strong>{founder.location || 'To be added'}</strong></div>
        <div><span>Main focus</span><strong>{founder.expertise?.slice(0, 2).join(' · ') || 'Mission and ventures'}</strong></div>
        <div><span>Public since</span><strong>July 2026</strong></div>
      </section>

      <section className="founder-story-layout section" id="story">
        <article className="founder-story-copy"><p className="eyebrow">Founder story</p><h2>The story behind the founder</h2>{founder.full_bio ? <p>{founder.full_bio}</p> : null}{founder.founder_story ? <p>{founder.founder_story}</p> : null}</article>
        <aside className="founder-mission-quote"><Sparkles size={24}/><blockquote>{founder.personal_mission || founder.headline}</blockquote><strong>{founder.full_name}</strong><span>{founder.role_title}</span></aside>
      </section>

      <section className="section" id="reality-check">
        <div className="founder-section-heading"><div><p className="eyebrow">Professional reality check</p><h2>Strengths & Struggles</h2><p>A rational view of what this founder brings, where friction appears and how both are managed professionally.</p></div><ShieldCheck size={34}/></div>
        <div className="founder-swat-grid">
          <div className="founder-swat-column founder-swat-column--strength"><div className="founder-swat-title"><Zap size={20}/><h3>Five strengths</h3></div>{strengths.map((point) => <details key={point.id} className="founder-swat-card"><summary><span>{String(point.display_order).padStart(2, '0')}</span><div><strong>{point.title}</strong><p>{point.summary}</p></div><ChevronDown size={17}/></summary><div className="founder-swat-card__details">{point.evidence ? <p><b>Evidence:</b> {point.evidence}</p> : null}{point.practical_impact ? <p><b>Practical impact:</b> {point.practical_impact}</p> : null}{point.management_strategy ? <p><b>How it is used:</b> {point.management_strategy}</p> : null}</div></details>)}</div>
          <div className="founder-swat-column founder-swat-column--struggle"><div className="founder-swat-title"><Target size={20}/><h3>Five struggles</h3></div>{struggles.map((point) => <details key={point.id} className="founder-swat-card"><summary><span>{String(point.display_order).padStart(2, '0')}</span><div><strong>{point.title}</strong><p>{point.summary}</p></div><ChevronDown size={17}/></summary><div className="founder-swat-card__details">{point.evidence ? <p><b>Context:</b> {point.evidence}</p> : null}{point.practical_impact ? <p><b>Risk:</b> {point.practical_impact}</p> : null}{point.management_strategy ? <p><b>Management strategy:</b> {point.management_strategy}</p> : null}</div></details>)}</div>
        </div>
      </section>

      <section className="section" id="capabilities">
        <div className="founder-section-heading"><div><p className="eyebrow">Capabilities</p><h2>Skills, expertise and responsibilities</h2></div><BriefcaseBusiness size={34}/></div>
        <div className="founder-capability-grid">
          <article><h3>Core strengths</h3><div className="founder-tag-cloud">{founder.core_strengths?.map((item) => <span key={item}>{item}</span>)}</div></article>
          <article><h3>Expertise</h3><div className="founder-tag-cloud">{founder.expertise?.map((item) => <span key={item}>{item}</span>)}</div></article>
          <article><h3>Responsibilities</h3><ul>{founder.responsibilities?.map((item) => <li key={item}>{item}</li>)}</ul></article>
          <article><h3>Lived experience</h3><ul>{founder.lived_experience_topics?.map((item) => <li key={item}>{item}</li>)}</ul></article>
        </div>
      </section>

      <section className="section" id="journey">
        <div className="founder-section-heading"><div><p className="eyebrow">Interactive founder timeline</p><h2>The journey so far</h2><p>Posts, hosts, places, concepts, partnerships and life experiences appear in one evolving timeline.</p></div><Compass size={34}/></div>
        <div className="founder-timeline-filters">{timelineFilters.map((filter) => <button key={filter} type="button" data-active={timelineFilter === filter} onClick={() => setTimelineFilter(filter)}>{humanize(filter)}<span>{filter === 'all' ? timeline.length : timeline.filter((event) => event.event_type === filter).length}</span></button>)}</div>
        {!filteredTimeline.length ? <div className="impact-state">No public events in this category yet.</div> : <div className="founder-timeline">{filteredTimeline.map((event) => {
          const link = event.journal_post_slug ? `/journal/${event.journal_post_slug}` : event.concept_slug ? `/proof-of-mind/${event.concept_slug}` : safeExternal(event.external_url);
          const location = [event.location_name, event.city, event.country].filter(Boolean).join(' · ');
          return <article key={event.id} className="founder-timeline-event" data-featured={event.is_featured}>
            <div className="founder-timeline-event__rail"><span><TimelineIcon type={event.event_type}/></span></div>
            <div className="founder-timeline-event__card">
              {event.cover_image_url ? <img src={event.cover_image_url} alt="" loading="lazy" /> : null}
              <div className="founder-timeline-event__content"><div className="founder-timeline-event__meta"><span>{humanize(event.event_type)}</span><time dateTime={event.occurred_at}>{formatTimestamp(event.occurred_at)}</time></div><h3>{event.title}</h3>{event.subtitle ? <p className="founder-timeline-event__subtitle">{event.subtitle}</p> : null}{event.description ? <p>{event.description}</p> : null}{location ? <div className="founder-timeline-event__location"><MapPin size={15}/>{location}</div> : null}{event.host_name ? <div className="founder-host-note"><Users size={16}/><div><strong>Hosted by {event.host_name}</strong>{event.host_thank_you ? <p>{event.host_thank_you}</p> : null}</div></div> : null}{link ? <a href={link}>Open connected story <ArrowRight size={15}/></a> : null}</div>
            </div>
          </article>;
        })}</div>}
      </section>

      <section className="section" id="work">
        <div className="founder-section-heading"><div><p className="eyebrow">Proof of work</p><h2>What {founder.display_name} is building and documenting</h2></div><Rocket size={34}/></div>
        <div className="founder-work-columns">
          <section><div className="founder-work-title"><h3>Founder Posts</h3><span>{founder.founder_post_count}</span></div>{founderPosts.length ? <div className="founder-profile-list">{founderPosts.map((post) => <article key={post.founder_post_id}><span>{post.concept_title}</span><h4>{post.post_title}</h4>{post.excerpt ? <p>{post.excerpt}</p> : null}<div><time>{formatTimestamp(post.published_at)}</time><a href={`/journal/${post.post_slug}`}>Read <ArrowRight size={14}/></a></div></article>)}</div> : <div className="impact-state">No public Founder Posts yet.</div>}</section>
          <section><div className="founder-work-title"><h3>Proof of Mind concepts</h3><span>{founder.concept_count}</span></div>{concepts.length ? <div className="founder-profile-list">{concepts.map((link) => { const concept = link.proof_of_mind_concepts!; return <article key={concept.id}><span>{link.is_original_creator ? 'Original creator' : humanize(link.founder_role)}</span><h4>{concept.title}</h4><p>{concept.tagline || concept.short_description}</p><div><small>{humanize(concept.concept_status)}</small><a href={`/proof-of-mind/${concept.slug}`}>Explore <ArrowRight size={14}/></a></div></article>; })}</div> : <div className="impact-state">No individually linked concepts yet.</div>}</section>
        </div>
      </section>

      <section className="section">
        <div className="founder-section-heading"><div><p className="eyebrow">Latest publications</p><h2>Recent posts by {founder.display_name}</h2></div><CalendarDays size={34}/></div>
        <div className="founder-publication-grid">{posts.slice(0, 3).map((post) => <article key={post.id}><time dateTime={post.published_at}>{formatTimestamp(post.published_at, true)}</time><h3>{post.title}</h3>{post.excerpt ? <p>{post.excerpt}</p> : null}<div><span>{post.reading_time_minutes || 4} min read</span><a href={`/journal/${post.slug}`}>Read post <ArrowRight size={15}/></a></div></article>)}</div>
      </section>

      <section className="founder-mission-values section" id="mission">
        <article><p className="eyebrow">Personal mission</p><h2>What this founder is working toward</h2><p>{founder.personal_mission}</p></article>
        <article><p className="eyebrow">Values</p><h2>Principles behind the work</h2><div className="founder-tag-cloud">{founder.values?.map((value) => <span key={value}>{value}</span>)}</div></article>
      </section>

      <section className="founder-final-cta section">
        <div><p className="eyebrow">Build something meaningful together</p><h2>{slug === 'kevin-de-vlieger' ? 'Have a concept, opportunity or partnership worth exploring?' : 'Want to support the human side of the rebuilding mission?'}</h2><p>Connect around partnerships, launch opportunities, community, hosts, storytelling or practical support.</p></div>
        <div><a className="button" href={founder.partnership_cta_url || '/support/partnerships'}>{founder.partnership_cta_label || 'Discuss a partnership'} <ArrowRight size={17}/></a><a className="button button--ghost" href={founder.contact_cta_url || '/support'}>{founder.contact_cta_label || `Connect with ${founder.display_name}`}</a></div>
      </section>

      <section className="founder-switch section"><span>Meet the other co-founder</span><a href={`/founders/${otherFounder.slug}`}>{otherFounder.name} <ArrowRight size={16}/></a></section>
    </> : null}
  </main></div><Footer /></>;
}
