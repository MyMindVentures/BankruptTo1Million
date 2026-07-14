import { ArrowRight, MapPin, PlayCircle, UserRound } from 'lucide-react';
import { useWebsiteI18n } from '../../lib/websiteI18n';
import type { FounderOverview } from './founderOverviewTypes';

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

export function FounderVideoCard({ founder }: { founder: FounderOverview }) {
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

export function FounderOverviewCard({ founder, index }: { founder: FounderOverview; index: number }) {
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
