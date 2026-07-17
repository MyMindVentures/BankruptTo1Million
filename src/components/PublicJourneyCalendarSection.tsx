import type { I18nManifest } from '../lib/i18nManifest';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, HandHeart, MapPin, Navigation, Sparkles } from 'lucide-react';
import {
  getLocalizedPublicJourneyCalendar,
  isActiveOnOrAfter,
  type JourneyPerson,
  type PublicJourneyCalendarEntry,
  type PublicJourneyCalendarFounder,
} from '../lib/journeyCalendar';
import { useWebsiteI18n } from '../lib/websiteI18n';
import { JourneyHostOfferForm } from './JourneyHostOfferForm';
import { Badge, Card } from './ui/card';
import { Button } from './ui/button';
import './PublicJourneyCalendarSection.css';
import './JournalJourneyExperience.css';

const MS_PER_DAY = 86_400_000;

function localTodayIso(now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function dayNumber(isoDate: string): number {
  const [year, month, day] = isoDate.split('-').map(Number);
  return Date.UTC(year, month - 1, day) / MS_PER_DAY;
}

function entryDistanceDays(entry: PublicJourneyCalendarEntry, today: string): number {
  const start = entry.starts_on;
  const todayN = dayNumber(today);
  const startN = dayNumber(start);
  // Open-ended stops (null ends_on) stay "current" from starts_on onward.
  if (entry.ends_on == null) {
    if (todayN >= startN) return 0;
    return startN - todayN;
  }
  const endN = dayNumber(entry.ends_on);
  if (todayN >= startN && todayN <= endN) return 0;
  if (todayN < startN) return startN - todayN;
  return todayN - endN;
}

export const PUBLIC_JOURNEY_CALENDAR_SECTION_I18N_MANIFEST = {
  componentKey: 'components.journey.calendar.page',
  namespace: 'journey_calendar',
  translationKeys: [
    'journey_calendar.loading',
    'journey_calendar.error',
    'journey_calendar.empty',
    'journey_calendar.now',
    'journey_calendar.current_location',
    'journey_calendar.section.eyebrow',
    'journey_calendar.section.title',
    'journey_calendar.section.description',
    'journey_calendar.status.idea',
    'journey_calendar.status.planned',
    'journey_calendar.status.confirmed',
    'journey_calendar.status.travelling',
    'journey_calendar.status.completed',
    'journey_calendar.needs.eyebrow',
    'journey_calendar.needs.title',
    'journey_calendar.needs.empty',
    'journey_calendar.offers.eyebrow',
    'journey_calendar.offers.title',
    'journey_calendar.offers.empty',
    'journey_calendar.meta.nights_needed',
    'journey_calendar.meta.nights_needed_some',
    'journey_calendar.meta.accommodation_arranged',
    'journey_calendar.meta.hosting_open',
    'journey_calendar.meta.hosting_closed',
    'journey_calendar.nav.previous',
    'journey_calendar.nav.next',
    'journey_calendar.person.kevin',
    'journey_calendar.person.micha',
    'journey_calendar.person.together',
    'journey_calendar.host.cta',
    'journey_calendar.host.close',
    'journey_calendar.host.eyebrow',
    'journey_calendar.host.title',
    'journey_calendar.host.private_contact',
    'journey_calendar.host.name',
    'journey_calendar.host.email',
    'journey_calendar.host.phone',
    'journey_calendar.host.optional',
    'journey_calendar.host.accommodation_type',
    'journey_calendar.host.accommodation_placeholder',
    'journey_calendar.host.available_from',
    'journey_calendar.host.available_until',
    'journey_calendar.host.message',
    'journey_calendar.host.message_placeholder',
    'journey_calendar.host.contact_consent',
    'journey_calendar.host.sending',
    'journey_calendar.host.send',
    'journey_calendar.host.done',
    'journey_calendar.host.success',
    'journey_calendar.host.error',
    'journey_calendar.founders_label',
    'journey_calendar.filter.all',
    'journey_calendar.filter.aria',
    'journey_calendar.filter.empty',
    'journey_calendar.priority.low',
    'journey_calendar.priority.normal',
    'journey_calendar.priority.high',
    'journey_calendar.priority.urgent',
    'journey_calendar.category.basic_facilities',
    'journey_calendar.category.sleeping_place',
    'journey_calendar.category.bbq',
    'journey_calendar.category.paddleboard',
    'journey_calendar.category.photography',
    'journey_calendar.category.skipper',
    'journey_calendar.exchange.meta',
  ] as const,
  keyPatterns: ['journey_calendar.*'] as const,
  entityContent: {
    rpc: 'get_localized_public_journey_calendar',
    tables: [
      'journey_calendar_entries',
      'journey_calendar_entry_translations',
      'journey_calendar_entry_founders',
      'journey_exchange_items',
      'journey_exchange_item_translations',
    ],
  },
} as const satisfies I18nManifest;

function personLabel(person: JourneyPerson, t: (key: string, fallback: string) => string) {
  if (person === 'together') return t('journey_calendar.person.together', 'Kevin & Micha');
  if (person === 'kevin') return t('journey_calendar.person.kevin', 'Kevin');
  return t('journey_calendar.person.micha', 'Micha');
}

function statusLabel(status: string, t: (key: string, fallback: string) => string) {
  const map: Record<string, [string, string]> = {
    idea: ['journey_calendar.status.idea', 'Idea'],
    planned: ['journey_calendar.status.planned', 'Planned'],
    confirmed: ['journey_calendar.status.confirmed', 'Confirmed'],
    travelling: ['journey_calendar.status.travelling', 'Travelling'],
    completed: ['journey_calendar.status.completed', 'Completed'],
  };
  const entry = map[status];
  return entry ? t(entry[0], entry[1]) : status;
}

function priorityLabel(priority: string, t: (key: string, fallback: string) => string) {
  const map: Record<string, [string, string]> = {
    low: ['journey_calendar.priority.low', 'Low'],
    normal: ['journey_calendar.priority.normal', 'Normal'],
    high: ['journey_calendar.priority.high', 'High'],
    urgent: ['journey_calendar.priority.urgent', 'Urgent'],
  };
  const entry = map[priority];
  return entry ? t(entry[0], entry[1]) : priority;
}

function humanizeCategoryCode(category: string) {
  return category
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function categoryLabel(category: string, t: (key: string, fallback: string) => string) {
  const map: Record<string, [string, string]> = {
    basic_facilities: ['journey_calendar.category.basic_facilities', 'Basic facilities'],
    sleeping_place: ['journey_calendar.category.sleeping_place', 'Sleeping place'],
    bbq: ['journey_calendar.category.bbq', 'BBQ'],
    paddleboard: ['journey_calendar.category.paddleboard', 'Paddleboard'],
    photography: ['journey_calendar.category.photography', 'Photography'],
    skipper: ['journey_calendar.category.skipper', 'Skipper'],
  };
  const entry = map[category];
  return entry ? t(entry[0], entry[1]) : t(`journey_calendar.category.${category}`, humanizeCategoryCode(category));
}

function founderChipLabel(founder: PublicJourneyCalendarFounder) {
  return founder.display_name || founder.slug;
}

function entryFounderNames(entry: PublicJourneyCalendarEntry): string {
  return entry.founders.map(founderChipLabel).filter(Boolean).join(' · ');
}

function entryPlaceLabel(entry: PublicJourneyCalendarEntry): string {
  return entry.location_name || entry.city_name || '';
}

function currentLocationEntries(entries: PublicJourneyCalendarEntry[]): PublicJourneyCalendarEntry[] {
  const travelling = entries
    .filter((entry) => entry.status === 'travelling')
    .sort((a, b) => a.starts_on.localeCompare(b.starts_on) || a.id.localeCompare(b.id));
  if (travelling.length) return travelling;
  const preferredId = preferredEntryId(entries);
  const fallback = preferredId ? entries.find((entry) => entry.id === preferredId) : undefined;
  return fallback ? [fallback] : [];
}

/** Prefer the stop closest to the visitor's local device date (in-range = 0). */
function preferredEntryId(entries: PublicJourneyCalendarEntry[], now = new Date()): string | undefined {
  if (!entries.length) return undefined;
  const today = localTodayIso(now);
  let best = entries[0];
  let bestDistance = entryDistanceDays(best, today);

  for (let index = 1; index < entries.length; index += 1) {
    const entry = entries[index];
    const distance = entryDistanceDays(entry, today);
    if (distance < bestDistance) {
      best = entry;
      bestDistance = distance;
      continue;
    }
    if (distance > bestDistance) continue;

    const bestTravelling = best.status === 'travelling';
    const entryTravelling = entry.status === 'travelling';
    if (entryTravelling && !bestTravelling) {
      best = entry;
      continue;
    }
    if (bestTravelling && !entryTravelling) continue;
    if (entry.starts_on < best.starts_on || (entry.starts_on === best.starts_on && entry.id < best.id)) {
      best = entry;
    }
  }

  return best.id;
}

function entriesForFounderFilter(
  entries: PublicJourneyCalendarEntry[],
  founderId: 'all' | string,
): PublicJourneyCalendarEntry[] {
  if (founderId === 'all') return entries;
  return entries.filter((entry) => entry.founders.some((founder) => founder.id === founderId));
}

/** When filtering to a founder, prefer their travelling stop so cards actually change. */
function preferredEntryIdForFounderFilter(
  entries: PublicJourneyCalendarEntry[],
  founderId: 'all' | string,
  now = new Date(),
): string | undefined {
  if (founderId === 'all') return preferredEntryId(entries, now);
  const forFounder = entriesForFounderFilter(entries, founderId);
  const travelling = forFounder.filter((entry) => entry.status === 'travelling');
  return preferredEntryId(travelling.length ? travelling : forFounder, now);
}

type PublicJourneyCalendarSectionProps = {
  /** When false, hide the section eyebrow/title (page already has a hero). Default true for embeds. */
  showIntro?: boolean;
};

export function PublicJourneyCalendarSection({ showIntro = true }: PublicJourneyCalendarSectionProps) {
  const { language, t, formatDate } = useWebsiteI18n();
  const [calendar, setCalendar] = useState<PublicJourneyCalendarEntry[]>([]);
  const [selectedId, setSelectedId] = useState<string>();
  const [selectedFounderId, setSelectedFounderId] = useState<'all' | string>('all');
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [hostEntry, setHostEntry] = useState<PublicJourneyCalendarEntry>();
  const activeDayRef = useRef<HTMLButtonElement | null>(null);
  const asOfDate = useMemo(() => localTodayIso(), []);

  useEffect(() => {
    let cancelled = false;
    setState((prev) => (prev === 'ready' ? 'ready' : 'loading'));
    getLocalizedPublicJourneyCalendar(language, asOfDate)
      .then((rows) => {
        if (cancelled) return;
        const activeRows = rows.filter((row) => isActiveOnOrAfter(row, asOfDate));
        setCalendar(activeRows);
        setSelectedId((current) => {
          if (current && activeRows.some((row) => row.id === current)) return current;
          return preferredEntryId(activeRows);
        });
        setState('ready');
      })
      .catch(() => {
        if (cancelled) return;
        setCalendar([]);
        setState('error');
      });
    return () => {
      cancelled = true;
    };
  }, [language, asOfDate]);

  const founderOptions = useMemo(() => {
    const byId = new Map<string, PublicJourneyCalendarFounder>();
    for (const entry of calendar) {
      for (const founder of entry.founders) {
        if (!byId.has(founder.id)) byId.set(founder.id, founder);
      }
    }
    return [...byId.values()].sort((a, b) =>
      founderChipLabel(a).localeCompare(founderChipLabel(b), undefined, { sensitivity: 'base' }),
    );
  }, [calendar]);

  const filteredCalendar = useMemo(
    () => entriesForFounderFilter(calendar, selectedFounderId).filter((entry) => isActiveOnOrAfter(entry, asOfDate)),
    [calendar, selectedFounderId, asOfDate],
  );

  useEffect(() => {
    if (!filteredCalendar.length) {
      setSelectedId(undefined);
      return;
    }
    setSelectedId((current) => {
      if (current && filteredCalendar.some((entry) => entry.id === current)) return current;
      return preferredEntryIdForFounderFilter(calendar, selectedFounderId);
    });
  }, [filteredCalendar, calendar, selectedFounderId]);

  useEffect(() => {
    if (state !== 'ready' || !selectedId) return;
    activeDayRef.current?.scrollIntoView({ inline: 'center', block: 'nearest' });
  }, [selectedId, state, filteredCalendar]);

  function selectFounderFilter(next: 'all' | string) {
    setSelectedFounderId(next);
    setSelectedId(preferredEntryIdForFounderFilter(calendar, next));
  }

  if (state === 'loading') {
    return <div className="impact-state">{t('journey_calendar.loading', 'Loading the public journey calendar…')}</div>;
  }
  if (state === 'error') {
    return (
      <div className="impact-state impact-state--error">
        {t('journey_calendar.error', 'The public journey calendar is temporarily unavailable.')}
      </div>
    );
  }
  if (!calendar.length) {
    return <div className="impact-state">{t('journey_calendar.empty', 'No public journey dates are published yet.')}</div>;
  }

  const selected = filteredCalendar.find((entry) => entry.id === selectedId) || filteredCalendar[0];
  const selectedIndex = selected
    ? Math.max(0, filteredCalendar.findIndex((entry) => entry.id === selected.id))
    : -1;
  const previous = selectedIndex >= 0
    ? filteredCalendar[(selectedIndex - 1 + filteredCalendar.length) % filteredCalendar.length]
    : undefined;
  const next = selectedIndex >= 0
    ? filteredCalendar[(selectedIndex + 1) % filteredCalendar.length]
    : undefined;
  const locationCallouts = currentLocationEntries(filteredCalendar);
  const nowEntryId = preferredEntryId(filteredCalendar);

  const filterChips = (
    <div
      className="journey-calendar-filters"
      role="group"
      aria-label={t('journey_calendar.filter.aria', 'Filter calendar by founder')}
    >
      <Button
        type="button"
        size="sm"
        variant={selectedFounderId === 'all' ? 'default' : 'ghost'}
        onClick={() => selectFounderFilter('all')}
      >
        {t('journey_calendar.filter.all', 'Everyone')}
      </Button>
      {founderOptions.map((founder) => (
        <Button
          key={founder.id}
          type="button"
          size="sm"
          variant={selectedFounderId === founder.id ? 'default' : 'ghost'}
          onClick={() => selectFounderFilter(founder.id)}
        >
          {founderChipLabel(founder)}
        </Button>
      ))}
    </div>
  );

  if (!filteredCalendar.length || !selected) {
    return (
      <section
        className="journey-calendar-planner"
        aria-labelledby={showIntro ? 'journey-calendar-planner-title' : undefined}
      >
        {showIntro ? (
          <div className="journey-calendar-planner__header">
            <div>
              <p className="eyebrow">{t('journey_calendar.section.eyebrow', 'Journey calendar')}</p>
              <h3 id="journey-calendar-planner-title">
                {t('journey_calendar.section.title', 'Where Kevin and Micha are — and what comes next.')}
              </h3>
              <p>
                {t(
                  'journey_calendar.section.description',
                  'Choose a day to see the location, their request for help and what they can offer in return.',
                )}
              </p>
            </div>
          </div>
        ) : null}
        {filterChips}
        <div className="impact-state">
          {t('journey_calendar.filter.empty', 'No stops match this founder filter.')}
        </div>
      </section>
    );
  }

  const isPresentNow = selected.id === nowEntryId;

  const dateRange = (() => {
    const start = formatDate(`${selected.starts_on}T12:00:00`, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    if (!selected.ends_on || selected.ends_on === selected.starts_on) return start;
    const end = formatDate(`${selected.ends_on}T12:00:00`, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    return `${start} — ${end}`;
  })();

  const accommodationMeta = selected.accommodation_needed
    ? selected.nights_needed
      ? t('journey_calendar.meta.nights_needed', '{count} night(s) needed', { count: selected.nights_needed })
      : t('journey_calendar.meta.nights_needed_some', 'Nights needed')
    : t('journey_calendar.meta.accommodation_arranged', 'Accommodation arranged');

  return (
    <section
      className="journey-calendar-planner"
      aria-labelledby={showIntro ? 'journey-calendar-planner-title' : undefined}
    >
      {(showIntro || locationCallouts.length > 0) ? (
        <div className={`journey-calendar-planner__header${showIntro ? '' : ' journey-calendar-planner__header--compact'}`}>
          {showIntro ? (
            <div>
              <p className="eyebrow">{t('journey_calendar.section.eyebrow', 'Journey calendar')}</p>
              <h3 id="journey-calendar-planner-title">
                {t('journey_calendar.section.title', 'Where Kevin and Micha are — and what comes next.')}
              </h3>
              <p>
                {t(
                  'journey_calendar.section.description',
                  'Choose a day to see the location, their request for help and what they can offer in return.',
                )}
              </p>
            </div>
          ) : <div />}
          {locationCallouts.length ? (
            <div className="journey-calendar-current-locations">
              {locationCallouts.map((entry) => {
                const names = entryFounderNames(entry);
                const place = entryPlaceLabel(entry);
                const isActive = entry.id === selected.id;
                return (
                  <button
                    key={entry.id}
                    type="button"
                    className={`journey-calendar-current-location${isActive ? ' is-active' : ''}`}
                    onClick={() => setSelectedId(entry.id)}
                  >
                    <Navigation />
                    <span>
                      <small>{t('journey_calendar.current_location', 'Current location')}</small>
                      {names ? <em>{names}</em> : null}
                      {place ? <strong>{place}</strong> : null}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : null}

      {filterChips}

      <div className="journey-calendar-strip" role="list">
        {filteredCalendar.map((entry) => {
          const active = entry.id === selected.id;
          const isNow = entry.id === nowEntryId;
          const place = entry.city_name || entry.location_name;
          return (
            <button
              type="button"
              key={entry.id}
              ref={active ? activeDayRef : undefined}
              className={`journey-calendar-day${active ? ' is-active' : ''}${isNow ? ' is-current' : ''}`}
              onClick={() => setSelectedId(entry.id)}
              title={entry.title}
            >
              <span>
                {formatDate(`${entry.starts_on}T12:00:00`, { weekday: 'short' })}
              </span>
              <strong>{formatDate(`${entry.starts_on}T12:00:00`, { day: '2-digit' })}</strong>
              <small>{formatDate(`${entry.starts_on}T12:00:00`, { month: 'short' })}</small>
              {place ? <em className="journey-calendar-day__place">{place}</em> : null}
              {isNow ? <i>{t('journey_calendar.now', 'Now')}</i> : null}
            </button>
          );
        })}
      </div>

      <div className="journey-calendar-detail-grid" key={selected.id}>
        <Card className="journey-calendar-location-card">
          <div className="journey-calendar-location-card__top">
            <Badge>{personLabel(selected.journey_person, t)}</Badge>
            {isPresentNow ? (
              <Badge className="journey-calendar-live">
                <span />
                {t('journey_calendar.now', 'Now')}
              </Badge>
            ) : (
              <Badge>{statusLabel(selected.status, t)}</Badge>
            )}
          </div>
          <div className="journey-calendar-location-card__date">
            <CalendarDays />
            <div>
              <span>{dateRange}</span>
              <strong>{selected.title}</strong>
            </div>
          </div>
          <p className="journey-calendar-location">
            <MapPin size={17} />
            {selected.location_name || selected.city_name}
            {selected.country_name ? `, ${selected.country_name}` : ''}
          </p>
          {selected.public_summary ? <p>{selected.public_summary}</p> : null}
          {selected.founders.length ? (
            <div className="journey-calendar-meta">
              <span>{t('journey_calendar.founders_label', 'People involved')}</span>
              {selected.founders.map((founder) => (
                <a key={founder.id} href={founder.profile_url}>
                  {founder.display_name || founder.slug}
                </a>
              ))}
            </div>
          ) : null}
          <div className="journey-calendar-meta">
            <span>{accommodationMeta}</span>
            <span>
              {selected.can_offer_hosting
                ? t('journey_calendar.meta.hosting_open', 'Hosting request open')
                : t('journey_calendar.meta.hosting_closed', 'No hosting request')}
            </span>
          </div>
          {selected.can_offer_hosting ? (
            <Button type="button" size="sm" onClick={() => setHostEntry(selected)}>
              <HandHeart size={16} />
              {t('journey_calendar.host.cta', 'Offer a place to stay')}
            </Button>
          ) : null}
          {previous && next ? (
            <div className="journey-calendar-location-card__nav">
              <Button variant="ghost" size="sm" type="button" onClick={() => setSelectedId(previous.id)}>
                <ChevronLeft size={16} />
                {t('journey_calendar.nav.previous', 'Previous')}
              </Button>
              <Button variant="ghost" size="sm" type="button" onClick={() => setSelectedId(next.id)}>
                {t('journey_calendar.nav.next', 'Next')}
                <ChevronRight size={16} />
              </Button>
            </div>
          ) : null}
        </Card>

        <Card className="journey-calendar-exchange-card journey-calendar-exchange-card--need">
          <div className="journey-calendar-exchange-card__title">
            <HandHeart />
            <div>
              <span>{t('journey_calendar.needs.eyebrow', 'Help requested here')}</span>
              <h4>{t('journey_calendar.needs.title', 'What they need')}</h4>
            </div>
          </div>
          <div className="journey-calendar-exchange-list">
            {selected.needs.length ? (
              selected.needs.map((item) => (
                <article key={item.id}>
                  <div>
                    <strong>{item.title}</strong>
                    <Badge>{priorityLabel(item.priority, t)}</Badge>
                  </div>
                  {item.description ? <p>{item.description}</p> : null}
                  <small>
                    {t('journey_calendar.exchange.meta', '{person} · {category}', {
                      person: personLabel(item.journey_person, t),
                      category: categoryLabel(item.category, t),
                    })}
                  </small>
                </article>
              ))
            ) : (
              <p className="journey-calendar-empty">{t('journey_calendar.needs.empty', 'No active help request for this day.')}</p>
            )}
          </div>
        </Card>

        <Card className="journey-calendar-exchange-card journey-calendar-exchange-card--offer">
          <div className="journey-calendar-exchange-card__title">
            <Sparkles />
            <div>
              <span>{t('journey_calendar.offers.eyebrow', 'Mutual exchange')}</span>
              <h4>{t('journey_calendar.offers.title', 'What they offer')}</h4>
            </div>
          </div>
          <div className="journey-calendar-exchange-list">
            {selected.offers.length ? (
              selected.offers.map((item) => (
                <article key={item.id}>
                  <div>
                    <strong>{item.title}</strong>
                  </div>
                  {item.description ? <p>{item.description}</p> : null}
                  <small>
                    {t('journey_calendar.exchange.meta', '{person} · {category}', {
                      person: personLabel(item.journey_person, t),
                      category: categoryLabel(item.category, t),
                    })}
                  </small>
                </article>
              ))
            ) : (
              <p className="journey-calendar-empty">
                {t('journey_calendar.offers.empty', 'No offer has been published for this day yet.')}
              </p>
            )}
          </div>
        </Card>
      </div>

      {hostEntry ? <JourneyHostOfferForm entry={hostEntry} onClose={() => setHostEntry(undefined)} /> : null}
    </section>
  );
}
