import { createRoot, type Root } from 'react-dom/client';
import { ChevronRight, MapPin } from 'lucide-react';
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
  return new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value));
}

function Avatar({ name, url }: { name: string; url?: string }) {
  if (url) return <img src={url} alt="" loading="eager" decoding="async" />;
  return <span aria-hidden="true">{name.slice(0, 1).toUpperCase()}</span>;
}

export function JourneyMapPin({ point, active, onSelect }: {
  point: PremiumJourneyPoint;
  active: boolean;
  onSelect: (id: string) => void;
}) {
  const people = sortedPeople(point);
  const className = [
    'journey-medallion',
    `journey-medallion--${markerVariant(point)}`,
    point.is_current_location ? 'is-current' : '',
    active ? 'is-active' : '',
  ].filter(Boolean).join(' ');

  return (
    <button
      type="button"
      className={className}
      aria-label={people.length ? `Open ${point.title} — ${peopleLabel(point)}` : `Open ${point.title}`}
      onClick={() => onSelect(point.journey_entry_id)}
    >
      {point.is_current_location ? <span className="journey-medallion__live">Live</span> : null}
      <span className="journey-medallion__portrait">
        {people.length > 1 ? (
          <span className="journey-medallion__split">
            {people.slice(0, 2).map((person) => (
              <span key={person.id}><Avatar name={person.display_name} url={person.avatar_url} /></span>
            ))}
          </span>
        ) : people[0] ? (
          <Avatar name={people[0].display_name} url={people[0].avatar_url} />
        ) : (
          <MapPin size={17} aria-hidden="true" />
        )}
      </span>
      <span className="journey-medallion__pointer" aria-hidden="true" />
      {point.is_milestone ? <i className="journey-medallion__badge" aria-label="Milestone">★</i> : null}
    </button>
  );
}

export function JourneyMapPinPopup({ point }: { point: PremiumJourneyPoint }) {
  const people = sortedPeople(point);
  const location = [point.location_name || point.city_name, point.country_name].filter(Boolean).join(', ');

  return (
    <article className="journey-medallion-popup">
      <header className="journey-medallion-popup__header">
        {people.length ? (
          <div className="journey-medallion-popup__avatars">
            {people.slice(0, 3).map((person) => (
              <span key={person.id}><Avatar name={person.display_name} url={person.avatar_url} /></span>
            ))}
          </div>
        ) : null}
        <div className="journey-medallion-popup__meta">
          <span>{point.is_current_location ? 'Current location' : peopleLabel(point) || 'Journey chapter'}</span>
          <small>{formatDate(point.occurred_at)}</small>
        </div>
      </header>
      <h3>{point.title}</h3>
      {location ? <p className="journey-medallion-popup__location"><MapPin size={14} />{location}</p> : null}
      {point.excerpt ? <p className="journey-medallion-popup__excerpt">{point.excerpt}</p> : null}
      {point.slug ? <a href={`/journal/${point.slug}`}>Read this chapter <ChevronRight size={15} /></a> : null}
    </article>
  );
}

export function mountJourneyMapPin(point: PremiumJourneyPoint, active: boolean, onSelect: (id: string) => void) {
  const markerContainer = document.createElement('div');
  const popupContainer = document.createElement('div');
  markerContainer.className = 'journey-medallion-root';
  const markerRoot: Root = createRoot(markerContainer);
  const popupRoot: Root = createRoot(popupContainer);
  let currentPoint = point;
  let currentActive = active;

  const render = () => {
    markerRoot.render(<JourneyMapPin point={currentPoint} active={currentActive} onSelect={onSelect} />);
    popupRoot.render(<JourneyMapPinPopup point={currentPoint} />);
  };

  render();

  return {
    element: markerContainer,
    popupElement: popupContainer,
    update(nextPoint: PremiumJourneyPoint, nextActive: boolean) {
      currentPoint = nextPoint;
      currentActive = nextActive;
      render();
    },
    unmount() {
      markerRoot.unmount();
      popupRoot.unmount();
    },
  };
}
