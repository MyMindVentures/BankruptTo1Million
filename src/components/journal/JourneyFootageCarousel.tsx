import { useEffect, useMemo, useState } from 'react';
import './JourneyFootageCarousel.css';

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
  const footage = useMemo(
    () => (items || []).filter((item) => Boolean(item?.url)).sort((a, b) => Number(a.display_order || 0) - Number(b.display_order || 0)),
    [items],
  );
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(0);
  }, [footage]);

  useEffect(() => {
    if (footage.length < 2) return;
    const timer = window.setInterval(() => {
      setActiveIndex((index) => (index + 1) % footage.length);
    }, 3000);
    return () => window.clearInterval(timer);
  }, [footage.length]);

  if (!footage.length) return null;

  const active = footage[activeIndex];
  const label = active.alt_text || active.caption || `${title} footage ${activeIndex + 1}`;

  return <div className="journey-footage" aria-label={`Footage for ${title}`}>
    <div className="journey-footage__viewport">
      {isVideo(active)
        ? <video key={active.id} src={active.url} poster={active.thumbnail_url || undefined} muted playsInline autoPlay loop preload="metadata" aria-label={label} />
        : <img key={active.id} src={active.url} alt={label} loading="lazy" />}
      <span className="journey-footage__badge">Footage</span>
      {active.caption ? <span className="journey-footage__caption">{active.caption}</span> : null}
    </div>
    {footage.length > 1 ? <div className="journey-footage__controls" aria-label="Footage slides">
      {footage.map((item, index) => <button key={item.id} type="button" className={index === activeIndex ? 'is-active' : ''} onClick={() => setActiveIndex(index)} aria-label={`Show footage ${index + 1}`} aria-pressed={index === activeIndex} />)}
    </div> : null}
  </div>;
}
