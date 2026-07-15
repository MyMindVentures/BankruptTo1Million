import { useEffect, useState, type MouseEvent } from 'react';
import { createPortal } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import { ArrowRight, CalendarDays, MapPin, X } from 'lucide-react';
import type { PremiumJourneyPoint } from './PremiumJourneyMap';
import './JourneyMapPin.css';

function sortedPeople(point: PremiumJourneyPoint) {
  return [...(point.involved_people || [])].sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
}

function peopleLabel(point: PremiumJourneyPoint) {
  return sortedPeople(point).map((person) => person.display_name).join(' & ');
}

function markerVariant(point: PremiumJourneyPoint) {
  const slugs = sortedPeople(point).map((person) => person.slug);
  if (slugs.includes('kevin-de-vlieger') && slugs.includes('micha')) return 'together';
  if (slugs.includes('kevin-de-vlieger')) return 'kevin';
  if (slugs.includes('micha')) return 'micha';
  return point.journey_person || 'person';
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(value));
}

function Avatar({ name, url }: { name: string; url?: string }) {
  if (url) return <img src={url} alt="" loading="eager" decoding="async" />;
  return <span>{name.slice(0, 1).toUpperCase()}</span>;
}

function JourneyMapPinModal({ point, onClose }: { point: PremiumJourneyPoint; onClose: () => void }) {
  const people = sortedPeople(point);
  const location = [point.location_name || point.city_name, point.country_name].filter(Boolean).join(', ');

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return createPortal(
    <div className="journey-map-pin-modal" role="dialog" aria-modal="true" aria-labelledby={`journey-pin-title-${point.journey_entry_id}`}>
      <button className="journey-map-pin-modal__backdrop" type="button" aria-label="Close journey chapter" onClick={onClose} />
      <article className="journey-map-pin-modal__card">
        <button className="journey-map-pin-modal__close" type="button" aria-label="Close" onClick={onClose}><X size={20} /></button>
        <div className="journey-map-pin-modal__people">
          {people.slice(0, 3).map((person) => (
            <span key={person.id}><Avatar name={person.display_name} url={person.avatar_url} /></span>
          ))}
        </div>
        <div className="journey-map-pin-modal__eyebrow">
          {point.is_current_location ? 'Current location' : peopleLabel(point) || 'Journey chapter'}
        </div>
        <h2 id={`journey-pin-title-${point.journey_entry_id}`}>{point.title}</h2>
        <div className="journey-map-pin-modal__meta">
          <span><CalendarDays size={16} />{formatDate(point.occurred_at)}</span>
          {location ? <span><MapPin size={16} />{location}</span> : null}
        </div>
        {point.excerpt ? <p>{point.excerpt}</p> : null}
        {point.slug ? (
          <a className="journey-map-pin-modal__link" href={`/journal/${point.slug}`}>
            Read this chapter <ArrowRight size={17} />
          </a>
        ) : null}
      </article>
    </div>,
    document.body,
  );
}

export function JourneyMapPin({ point, active, onSelect }: {
  point: PremiumJourneyPoint;
  active: boolean;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const people = sortedPeople(point);
  const className = [
    'journey-map-pin',
    `journey-map-pin--${markerVariant(point)}`,
    point.is_current_location ? 'is-current' : '',
    active ? 'is-active' : '',
  ].filter(Boolean).join(' ');

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    onSelect(point.journey_entry_id);
    setOpen(true);
  };

  return (
    <>
      <button
        type="button"
        className={className}
        aria-label={people.length ? `Open ${point.title} — ${peopleLabel(point)}` : `Open ${point.title}`}
        onClick={handleClick}
      >
        <span className="journey-map-pin__portrait">
          {people.length > 1 ? (
            <span className="journey-map-pin__split">
              {people.slice(0, 2).map((person) => (
                <span key={person.id}><Avatar name={person.display_name} url={person.avatar_url} /></span>
              ))}
            </span>
          ) : people[0] ? (
            <Avatar name={people[0].display_name} url={people[0].avatar_url} />
          ) : <MapPin size={18} />}
        </span>
        <span className="journey-map-pin__tail" />
        {point.is_milestone ? <i className="journey-map-pin__badge">★</i> : null}
      </button>
      {open ? <JourneyMapPinModal point={point} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

export function mountJourneyMapPin(point: PremiumJourneyPoint, active: boolean, onSelect: (id: string) => void) {
  const markerContainer = document.createElement('div');
  const legacyPopupPlaceholder = document.createElement('div');
  markerContainer.className = 'journey-map-pin-root';
  legacyPopupPlaceholder.className = 'journey-map-pin-legacy-popup-placeholder';
  const markerRoot: Root = createRoot(markerContainer);

  const render = (isActive: boolean) => {
    markerRoot.render(<JourneyMapPin point={point} active={isActive} onSelect={onSelect} />);
  };

  render(active);

  return {
    element: markerContainer,
    popupElement: legacyPopupPlaceholder,
    update(nextActive: boolean) { render(nextActive); },
    unmount() { markerRoot.unmount(); },
  };
}
