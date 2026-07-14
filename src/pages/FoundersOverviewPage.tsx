import { ArrowRight, MapPin, PlayCircle, Sparkles, UserRound, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Footer } from '../components/Footer';
import { Header } from '../components/Header';
import { supabase } from '../lib/supabase';
import { useWebsiteI18n } from '../lib/websiteI18n';
import '../styles/foundersOverview.css';

type FounderOverview = {
  id: string;
  slug: string;
  full_name: string;
  display_name: string;
  headline: string | null;
  role_title: string;
  short_bio: string | null;
  personal_mission: string | null;
  core_strengths: string[];
  expertise: string[];
  location: string | null;
  avatar_url: string | null;
  cover_image_url: string | null;
  intro_video_url: string | null;
  published_post_count: number;
  founder_post_count: number;
  concept_count: number;
  founder_message_count: number;
};

async function readJson<T>(response: Response | Promise<Response>): Promise<T> {
  const result = await response;
  if (!result.ok) throw new Error(await result.text());
  return result.json() as Promise<T>;
}

function getVideoEmbed(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes('youtube.com')) {
      const id = parsed.searchParams.get('v') || parsed.pathname.split('/').filter(Boolean).pop();
      return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
    }
    if (parsed.hostname === 'youtu.be') {
      const id = parsed.pathname.split('/').filter(Boolean)[0];
      return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
    }
    if (parsed.hostname.includes('vimeo.com')) {
      const id = parsed.pathname.split('/').filter(Boolean).pop();
      return id ? `https://player.vimeo.com/video/${id}` : null;
    }
  } catch {
    return null;
  }
  return null;
}

function FounderVideo({ founder }: { founder: FounderOverview }) {
  const { t, translateText } = useWebsiteI18n();
  if (!founder.intro_video_url) return null;
  const embedUrl = getVideoEmbed(founder.intro_video_url);
  const poster = founder.cover_image_url || founder.avatar_url || undefined;

  return (
    <article className="founder-video-card">
      <div className="founder-video-card__media">
        {embedUrl ? (
          <iframe
            src={embedUrl}
            title={t('founders.video.iframe_title', '{name} founder video message', { name: founder.full_name })}
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        ) : (
          <video controls preload="metadata" poster={poster}>
            <source src={founder.intro_video_url} />
            {t('founders.video.unsupported', 'Your browser does not support embedded video.')}
          </video>
        )}
      </div>
      <div className="founder-video-card__content">
        <div className="founder-video-card__identity">
          <div className="founder-video-card__avatar">
            {founder.avatar_url ? <img src={founder.avatar_url} alt="" /> : <UserRound size={26} aria-hidden="true" />}
          </div>
          <div><strong>{founder.full_name}</strong><span>{translateText(founder.role_title)}</span></div>
        </div>
        <p className="eyebrow">{t('founders.video.eyebrow', 'Founder video message')}</p>
        <h3>{founder.headline ? translateText(founder.headline) : t('founders.video.personal_message', 'A personal message from {name}', { name: founder.display_name })}</h3>
        <p>{translateText(founder.personal_mission || founder.short_bio || '')}</p>
        <a href={`/founders/${encodeURIComponent(founder.slug)}`}>{t('founders.video.open_profile', 'Explore the full founder story')} <ArrowRight size={17} aria-hidden="true" /></a>
      </div>
    </article>
  );
}

function FounderCard({ founder, index }: { founder: FounderOverview; index: number }) {
  const { t, translateText, formatNumber } = useWebsiteI18n();
  const profileHref = `/founders/${encodeURIComponent(founder.slug)}`;
  const highlights = founder.expertise?.slice(0, 3) || [];

  return (
    <a className="founder-overview-card" href={profileHref} aria-label={t('founders.card.open_aria', 'View the detailed profile of {name}', { name: founder.full_name })}>
      <div className="founder-overview-card__visual">
        {founder.cover_image_url ? <img className="founder-overview-card__cover" src={founder.cover_image_url} alt="" /> : null}
        <div className="founder-overview-card__shade" />
        <span className="founder-overview-card__number">{String(index + 1).padStart(2, '0')}</span>
        <div className="founder-overview-card__portrait">
          {founder.avatar_url ? <img src={founder.avatar_url} alt={t('founders.card.portrait_alt', '{name} portrait', { name: founder.full_name })} /> : <UserRound size={54} aria-hidden="true" />}
        </div>
        <div className="founder-overview-card__badges">
          <span>{t('founders.card.badge_cofounder', 'Co-founder')}</span>
          <span>{t('founders.card.badge_public', 'Building in public')}</span>
          {founder.intro_video_url ? <span><PlayCircle size={14} aria-hidden="true" /> {t('founders.card.badge_video', 'Video message')}</span> : null}
        </div>
      </div>

      <div className="founder-overview-card__content">
        <div className="founder-overview-card__topline">
          <p className="eyebrow">{t('founders.card.eyebrow', 'Founder profile')}</p>
          {founder.location ? <span><MapPin size={15} aria-hidden="true" />{translateText(founder.location)}</span> : null}
        </div>

        <h2>{founder.full_name}</h2>
        <p className="founder-overview-card__role">{translateText(founder.role_title)}</p>
        {founder.headline ? <p className="founder-overview-card__headline">{translateText(founder.headline)}</p> : null}
        {founder.short_bio ? <p className="founder-overview-card__bio">{translateText(founder.short_bio)}</p> : null}

        {highlights.length ? <div className="founder-overview-card__tags">{highlights.map((item) => <span key={item}>{translateText(item)}</span>)}</div> : null}

        <div className="founder-overview-card__metrics">
          <div><strong>{formatNumber(founder.concept_count || 0)}</strong><span>{t('founders.metrics.concepts', 'Concepts')}</span></div>
          <div><strong>{formatNumber(founder.published_post_count || 0)}</strong><span>{t('founders.metrics.posts', 'Posts')}</span></div>
          <div><strong>{formatNumber(founder.founder_post_count || 0)}</strong><span>{t('founders.metrics.founder_posts', 'Founder posts')}</span></div>
        </div>

        <div className="founder-overview-card__cta"><span>{t('founders.card.open_profile', 'Open detailed profile')}</span><ArrowRight size={19} aria-hidden="true" /></div>
      </div>
    </a>
  );
}

export function FoundersOverviewPage() {
  const { t } = useWebsiteI18n();
  const [founders, setFounders] = useState<FounderOverview[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    document.title = t('founders.seo.title', 'Founders | Bankrupt to 1 Million');
    readJson<FounderOverview[]>(supabase.from('founder_profiles_public').request({
      query: 'select=id,slug,full_name,display_name,headline,role_title,short_bio,personal_mission,core_strengths,expertise,location,avatar_url,cover_image_url,intro_video_url,published_post_count,founder_post_count,concept_count,founder_message_count&order=display_order.asc,full_name.asc',
    }))
      .then((rows) => { setFounders(rows); setStatus('ready'); })
      .catch(() => setStatus('error'));
  }, [t]);

  const foundersWithVideo = founders.filter((founder) => Boolean(founder.intro_video_url));

  return (
    <>
      <Header />
      <div className="page-shell">
        <main className="founders-overview-page">
          <section className="founders-overview-hero section">
            <div><p className="eyebrow">{t('founders.hero.eyebrow', 'The people behind the mission')}</p><h1>{t('founders.hero.title', 'Two founders. One honest rebuild.')}</h1><p className="founders-overview-hero__lede">{t('founders.hero.description', 'Kevin and Micha bring different strengths, lived experience and perspectives into one public mission: rebuild from rock bottom, create meaningful ventures and prove that momentum can start again.')}</p></div>
            <aside className="founders-overview-hero__note"><Users aria-hidden="true" size={28} /><blockquote>{t('founders.hero.quote', 'The mission is shared. The journeys remain personal.')}</blockquote><p>{t('founders.hero.note', 'Explore each founder through a dedicated profile with their story, strengths, struggles, work, timeline and mission.')}</p></aside>
          </section>

          <section className="section founders-overview-directory" aria-labelledby="founders-directory-title">
            <div className="founders-overview-directory__intro"><p className="eyebrow">{t('founders.directory.eyebrow', 'Founder directory')}</p><h2 id="founders-directory-title">{t('founders.directory.title', 'Meet Kevin and Micha')}</h2><p>{t('founders.directory.description', 'Choose a founder to open the full profile. The overview stays concise; the deeper story only appears after you select a card.')}</p></div>
            {status === 'loading' ? <div className="impact-state">{t('founders.states.loading', 'Loading founder profiles…')}</div> : null}
            {status === 'error' ? <div className="impact-state impact-state--error">{t('founders.states.error', 'Founder profiles could not be loaded.')}</div> : null}
            {status === 'ready' && !founders.length ? <div className="impact-state">{t('founders.states.empty', 'No public founder profiles are available yet.')}</div> : null}
            <div className="founders-overview-grid">{founders.map((founder, index) => <FounderCard founder={founder} index={index} key={founder.id} />)}</div>
          </section>

          {foundersWithVideo.length ? (
            <section className="section founders-video-section" aria-labelledby="founder-video-title">
              <div className="founders-overview-directory__intro"><p className="eyebrow">{t('founders.video_section.eyebrow', 'In their own words')}</p><h2 id="founder-video-title">{t('founders.video_section.title', 'Founder video messages')}</h2><p>{t('founders.video_section.description', 'Short personal messages from Kevin and Micha can be played directly here before opening their full founder profiles.')}</p></div>
              <div className="founders-video-grid">{foundersWithVideo.map((founder) => <FounderVideo founder={founder} key={founder.id} />)}</div>
            </section>
          ) : null}

          <section className="section founders-overview-closing"><Sparkles aria-hidden="true" size={26} /><div><p className="eyebrow">{t('founders.closing.eyebrow', 'Shared direction')}</p><h2>{t('founders.closing.title', 'Different minds. One mission.')}</h2><p>{t('founders.closing.description', 'The founder pages document the people behind the work, not just the output they create.')}</p></div></section>
        </main>
      </div>
      <Footer />
    </>
  );
}
