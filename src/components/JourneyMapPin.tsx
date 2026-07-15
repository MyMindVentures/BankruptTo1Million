import { createRoot, type Root } from 'react-dom/client';
import type { PremiumJourneyPoint } from './PremiumJourneyMap';

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
  return <span>{name.slice(0, 1).toUpperCase()}</span>;
}

export function JourneyMapPin({ point, active, onSelect }: {
  point: PremiumJourneyPoint;
  active: boolean;
  onSelect: (id: string) => void;
}) {
  const people = sortedPeople(point);
  const className = [
    'premium-map-dom-marker',
    `premium-map-dom-marker--${markerVariant(point)}`,
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
      {people.length > 1 ? (
        <span className="premium-map-dom-marker__split">
          {people.slice(0, 2).map((person) => (
            <span key={person.id}><Avatar name={person.display_name} url={person.avatar_url} /></span>
          ))}
        </span>
      ) : people[0] ? (
        <Avatar name={people[0].display_name} url={people[0].avatar_url} />
      ) : <span>•</span>}
      {point.is_milestone ? <i className="premium-map-dom-marker__badge">★</i> : null}
    </button>
  );
}

export function JourneyMapPinPopup({ point }: { point: PremiumJourneyPoint }) {
  const people = sortedPeople(point);
  const location = [point.location_name || point.city_name, point.country_name].filter(Boolean).join(', ');

  return (
    <div className="premium-map-popup">
      <div className="premium-map-popup__head">
        {people.length ? (
          <div className="premium-map-popup__avatars">
            {people.slice(0, 3).map((person) => (
              <span key={person.id}><Avatar name={person.display_name} url={person.avatar_url} /></span>
            ))}
          </div>
        ) : null}
        <div>
          <span>{point.is_current_location ? 'Current location' : peopleLabel(point)}</span>
          <small>{formatDate(point.occurred_at)}</small>
        </div>
      </div>
      <strong>{point.title}</strong>
      <small>{location}</small>
    </div>
  );
}

export function mountJourneyMapPin(point: PremiumJourneyPoint, active: boolean, onSelect: (id: string) => void) {
  const markerContainer = document.createElement('div');
  const popupContainer = document.createElement('div');
  const markerRoot: Root = createRoot(markerContainer);
  const popupRoot: Root = createRoot(popupContainer);

  const render = (isActive: boolean) => {
    markerRoot.render(<JourneyMapPin point={point} active={isActive} onSelect={onSelect} />);
    popupRoot.render(<JourneyMapPinPopup point={point} />);
  };

  render(active);

  return {
    element: markerContainer,
    popupElement: popupContainer,
    update(nextActive: boolean) { render(nextActive); },
    unmount() {
      markerRoot.unmount();
      popupRoot.unmount();
    },
  };
}
