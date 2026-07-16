import type { I18nManifest } from '../lib/i18nManifest';
import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, HandHeart, MapPin, Navigation, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useWebsiteI18n } from '../lib/websiteI18n';
import { Badge, Card, Callout } from './ui/card';
import { Button } from './ui/button';
import './JourneyCalendarPlanner.css';

type JourneyPerson = 'kevin' | 'micha' | 'together';

type CalendarEntry = {
  id: string;
  title: string;
  journey_person: JourneyPerson;
  status: string;
  starts_on: string;
  ends_on?: string;
  city_name?: string;
  country_name?: string;
  location_name?: string;
  public_summary?: string;
  accommodation_needed: boolean;
  nights_needed?: number;
  can_offer_hosting: boolean;
};

type ExchangeItem = {
  id: string;
  calendar_entry_id?: string;
  journey_person: JourneyPerson;
  item_type: 'need' | 'offer';
  category: string;
  title: string;
  description?: string;
  priority: string;
  display_order: number;
};

async function readJson<T>(responseOrPromise: Response | Promise<Response>): Promise<T> {
  const response = await responseOrPromise;
  if (!response.ok) throw new Error(await response.text());
  return response.json() as Promise<T>;
}

function personLabel(person: JourneyPerson) {
  return person === 'together' ? 'Kevin & Micha' : person === 'kevin' ? 'Kevin' : 'Micha';
}

function dateParts(value: string) {
  const date = new Date(`${value}T12:00:00`);
  return {
    day: new Intl.DateTimeFormat('en', { day: '2-digit' }).format(date),
    month: new Intl.DateTimeFormat('en', { month: 'short' }).format(date),
    weekday: new Intl.DateTimeFormat('en', { weekday: 'short' }).format(date),
    full: new Intl.DateTimeFormat('en', { weekday: 'long', day: 'numeric', month: 'long' }).format(date),
  };
}

export const JOURNEY_CALENDAR_PLANNER_I18N_MANIFEST = {
  componentKey: 'components.journey.calendar.planner',
  namespace: 'ui',
  translationKeys: [] as const,
  keyPatterns: ['journey_calendar.*'] as const,
} as const satisfies I18nManifest;

export function JourneyCalendarPlanner() {
  const { t } = useWebsiteI18n();
  const [calendar, setCalendar] = useState<CalendarEntry[]>([]);
  const [exchange, setExchange] = useState<ExchangeItem[]>([]);
  const [selectedId, setSelectedId] = useState<string>();
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    Promise.all([
      readJson<CalendarEntry[]>(supabase.from('public_journey_calendar').request({ query: 'select=*&order=starts_on.asc' })),
      readJson<ExchangeItem[]>(supabase.from('public_journey_exchange').request({ query: 'select=*&order=display_order.asc' })),
    ]).then(([calendarRows, exchangeRows]) => {
      setCalendar(calendarRows);
      setExchange(exchangeRows);
      if (calendarRows[0]) setSelectedId(calendarRows[0].id);
      setState('ready');
    }).catch(() => {
      setState('error');
    });
  }, []);

  const selectedNeeds = useMemo(() => {
    const selected = calendar.find((entry) => entry.id === selectedId) || calendar[0];
    return selected ? exchange.filter((item) => item.item_type === 'need' && (item.calendar_entry_id === selected.id || !item.calendar_entry_id) && (item.journey_person === selected.journey_person || item.journey_person === 'together')).sort((a,b)=>a.display_order-b.display_order) : [];
  }, [calendar, exchange, selectedId]);
  const selectedOffers = useMemo(() => {
    const selected = calendar.find((entry) => entry.id === selectedId) || calendar[0];
    return selected ? exchange.filter((item) => item.item_type === 'offer' && (item.calendar_entry_id === selected.id || !item.calendar_entry_id) && (item.journey_person === selected.journey_person || item.journey_person === 'together')).sort((a,b)=>a.display_order-b.display_order) : [];
  }, [calendar, exchange, selectedId]);

  if (state === 'loading') return <div className="impact-state">{t('journey_calendar.loading', 'Loading the public journey calendar…')}</div>;
  if (state === 'error') return <div className="impact-state impact-state--error">{t('journey_calendar.error', 'The public journey calendar is temporarily unavailable.')}</div>;
  if (!calendar.length) return <div className="impact-state">{t('journey_calendar.empty', 'No public journey dates are published yet.')}</div>;

  const entries = calendar;
  const selected = entries.find((entry) => entry.id === selectedId) || entries[0];
  const selectedIndex = Math.max(0, entries.findIndex((entry) => entry.id === selected.id));
  const previous = entries[(selectedIndex - 1 + entries.length) % entries.length];
  const next = entries[(selectedIndex + 1) % entries.length];
  const selectedDate = dateParts(selected.starts_on);
  const currentEntry = entries.find((entry) => entry.status === 'current') || entries[0];

  return <section className="journey-calendar-planner" aria-labelledby="journey-calendar-planner-title">
    <div className="journey-calendar-planner__header">
      <div><p className="eyebrow">Journey calendar</p><h3 id="journey-calendar-planner-title">Where Kevin and Micha are — and what comes next.</h3><p>Choose a day to see the location, their request for help and what they can offer in return.</p></div>
      <Callout><Navigation/><span><small>{t('journey_calendar.current_location', 'Current location')}</small><strong>{currentEntry.location_name || currentEntry.city_name}</strong></span></Callout>
    </div>

    <div className="journey-calendar-strip" role="list">
      {entries.map((entry) => {
        const date = dateParts(entry.starts_on);
        const active = entry.id === selected.id;
        return <button type="button" key={entry.id} className={`journey-calendar-day${active ? ' is-active' : ''}${entry.status === 'current' ? ' is-current' : ''}`} onClick={() => setSelectedId(entry.id)}>
          <span>{date.weekday}</span><strong>{date.day}</strong><small>{date.month}</small>
          {entry.status === 'current' ? <i>{t('journey_calendar.now', 'Now')}</i> : null}
        </button>;
      })}
    </div>

    <div className="journey-calendar-detail-grid">
      <Card className="journey-calendar-location-card">
        <div className="journey-calendar-location-card__top"><Badge>{personLabel(selected.journey_person)}</Badge>{selected.status === 'current' ? <Badge className="journey-calendar-live"><span/> Current</Badge> : <Badge>{selected.status}</Badge>}</div>
        <div className="journey-calendar-location-card__date"><CalendarDays/><div><span>{selectedDate.full}</span><strong>{selected.title}</strong></div></div>
        <p className="journey-calendar-location"><MapPin size={17}/>{selected.location_name || selected.city_name}{selected.country_name ? `, ${selected.country_name}` : ''}</p>
        <p>{selected.public_summary}</p>
        <div className="journey-calendar-meta"><span>{selected.accommodation_needed ? `${selected.nights_needed || 'Some'} night(s) needed` : 'Accommodation arranged'}</span><span>{selected.can_offer_hosting ? 'Hosting request open' : 'No hosting request'}</span></div>
        <div className="journey-calendar-location-card__nav"><Button variant="ghost" size="sm" onClick={() => setSelectedId(previous.id)}><ChevronLeft size={16}/> Previous</Button><Button variant="ghost" size="sm" onClick={() => setSelectedId(next.id)}>Next <ChevronRight size={16}/></Button></div>
      </Card>

      <Card className="journey-calendar-exchange-card journey-calendar-exchange-card--need">
        <div className="journey-calendar-exchange-card__title"><HandHeart/><div><span>Help requested here</span><h4>What they need</h4></div></div>
        <div className="journey-calendar-exchange-list">{selectedNeeds.length ? selectedNeeds.map((item) => <article key={item.id}><div><strong>{item.title}</strong><Badge>{item.priority}</Badge></div><p>{item.description}</p><small>{personLabel(item.journey_person)} · {item.category}</small></article>) : <p className="journey-calendar-empty">No active help request for this day.</p>}</div>
      </Card>

      <Card className="journey-calendar-exchange-card journey-calendar-exchange-card--offer">
        <div className="journey-calendar-exchange-card__title"><Sparkles/><div><span>Mutual exchange</span><h4>What they offer</h4></div></div>
        <div className="journey-calendar-exchange-list">{selectedOffers.length ? selectedOffers.map((item) => <article key={item.id}><div><strong>{item.title}</strong></div><p>{item.description}</p><small>{personLabel(item.journey_person)} · {item.category}</small></article>) : <p className="journey-calendar-empty">No offer has been published for this day yet.</p>}</div>
      </Card>
    </div>
  </section>;
}
