import type { I18nManifest } from '../../lib/i18nManifest';
import { useEffect, useMemo, useState } from 'react';
import { useWebsiteI18n } from '../../lib/websiteI18n';
import './JourneyFootageCarousel.css';

export const JOURNEY_FOOTAGE_CAROUSEL_I18N_MANIFEST = {
  componentKey: 'components.journal.journey.footage.carousel',
  namespace: 'journal.footage',
  translationKeys: [
    'journal.footage.badge',
    'journal.footage.for_title',
    'journal.footage.slides_aria',
    'journal.footage.show_slide',
    'journal.footage.default_alt',
  ] as const,
} as const satisfies I18nManifest;

export type JourneyFootageItem = {
  id: string;
  url: string;
  asset_type?: string | null;
  mime_type?: string | null;
  thumbnail_url?: string | null;
  caption?: string | null;
  alt_text?: string | null;
  display_order?: number | null;
};

function isVideo(item: JourneyFootageItem) {
  return item.asset_type === 'video' || item.mime_type?.startsWith('video/');
}

export function JourneyFootageCarousel({ items, title }: { items?: JourneyFootageItem[]; title: string }) {
  const { t } = useWebsiteI18n();
  const footage = useMemo(
    () => (items || []).filter((item) => Boolean(item?.url)).sort((a, b) => Number(a.display_order || 0) - Number(b.display_order || 0)),
    [items],
  );
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => { setActiveIndex(0); }, [footage]);
  useEffect(() => {
    if (footage.length < 2) return;
    const timer = window.setInterval(() => setActiveIndex((index) => (index + 1) % footage.length), 3000);
    return () => window.clearInterval(timer);
  }, [footage.length]);

  if (!footage.length) return null;
  const active = footage[activeIndex];
  const label = active.alt_text || active.caption || t('journal.footage.default_alt', '{title} footage {number}', { title, number: activeIndex + 1 });

  return <div className="journey-footage" aria-label={t('journal.footage.for_title', 'Footage for {title}', { title })}>
    <div className="journey-footage__viewport">
      {isVideo(active)
        ? <video key={active.id} src={active.url} poster={active.thumbnail_url || undefined} muted playsInline autoPlay loop preload="metadata" aria-label={label} />
        : <img key={active.id} src={active.url} alt={label} loading="lazy" />}
      <span className="journey-footage__badge">{t('journal.footage.badge', 'Footage')}</span>
      {active.caption ? <span className="journey-footage__caption">{active.caption}</span> : null}
    </div>
    {footage.length > 1 ? <div className="journey-footage__controls" aria-label={t('journal.footage.slides_aria', 'Footage slides')}>
      {footage.map((item, index) => <button key={item.id} type="button" className={index === activeIndex ? 'is-active' : ''} onClick={() => setActiveIndex(index)} aria-label={t('journal.footage.show_slide', 'Show footage {number}', { number: index + 1 })} aria-pressed={index === activeIndex} />)}
    </div> : null}
  </div>;
}
