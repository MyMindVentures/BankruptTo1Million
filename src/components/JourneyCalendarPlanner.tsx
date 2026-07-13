import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, HandHeart, MapPin, Navigation, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
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

const STARTER_CALENDAR: CalendarEntry[] = [
  {
    id: 'starter-calendar-1', title: 'Santa Pola base', journey_person: 'together', status: 'current',
    starts_on: '2026-07-13', ends_on: '2026-07-14', city_name: 'Santa Pola', country_name: 'Spain', location_name: 'Santa Pola',
    public_summary: 'Current base while the public mission, journal and founder platform are being built.',
    accommodation_needed: true, nights_needed: 1, can_offer_hosting: true,
  },
  {
    id: 'starter-calendar-2', title: 'Alicante work stop', journey_person: 'kevin', status: 'planned',
    starts_on: '2026-07-15', city_name: 'Alicante', country_name: 'Spain', location_name: 'Alicante',
    public_summary: 'A focused build and outreach day for the platform and launch partners.',
    accommodation_needed: false, can_offer_hosting: false,
  },
  {
    id: 'starter-calendar-3', title: 'Open Costa Blanca route', journey_person: 'together', status: 'planned',
    starts_on: '2026-07-16', ends_on: '2026-07-18', city_name: 'Costa Blanca', country_name: 'Spain', location_name: 'Route to be shaped by hosts',
    public_summary: 'The next stop remains open and can be shaped by a host, partner or local supporter.',
    accommodation_needed: true, nights_needed: 2, can_offer_hosting: true,
  },
];

const STARTER_EXCHANGE: ExchangeItem[] = [
  { id: 'need-1', calendar_entry_id: 'starter-calendar-1', journey_person: 'together', item_type: 'need', category: 'camper', title: 'Safe camper place', description: 'A quiet overnight place close to Santa Pola.', priority: 'high', display_order: 1 },
  { id: 'offer-1', calendar_entry_id: 'starter-calendar-1', journey_person: 'together', item_type: 'offer', category: 'cooking', title: 'Belgian dinner', description: 'Kevin and Micha can cook for their host and share the story publicly.', priority: 'normal', display_order: 1 },
  { id: 'need-2', calendar_entry_id: 'starter-calendar-2', journey_person: 'kevin', item_type: 'need', category: 'workspace', title: 'Workspace and Wi-Fi', description: 'A few productive hours with electricity and reliable internet.', priority: 'normal', display_order: 1 },
  { id: 'offer-2', calendar_entry_id: 'starter-calendar-2', journey_person: 'kevin', item_type: 'offer', category: 'content', title: 'Raw photo and video content', description: 'Kevin can shoot useful footage for a local business or host.', priority: 'normal', display_order: 1 },
  { id: 'need-3', calendar_entry_id: 'starter-calendar-3', journey_person: 'together', item_type: 'need', category: 'host', title: 'Host or legal camper place', description: 'A bed, guest room or safe overnight location for the next route leg.', priority: 'urgent', display_order: 1 },
  { id: 'need-4', calendar_entry_id: 'starter-calendar-3', journey_person: 'together', item_type: 'need', category: 'shower', title: 'Shower and fresh water', description: 'Simple practical support for continuing the route.', priority: 'high', display_order: 2 },
  { id: 'offer-3', calendar_entry_id: 'starter-calendar-3', journey_person: 'together', item_type: 'offer', category: 'practical', title: 'Practical help and storytelling', description: 'Handyman support, cooking, house sitting and adding the host to the public journey.', priority: 'normal', display_order: 1 },
];

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

export function JourneyCalendarPlanner() {
  const [calendar, setCalendar] = useState<CalendarEntry[]>([]);
  const [exchange, setExchange] = useState<ExchangeItem[]>([]);
  const [selectedId, setSelectedId] = useState(STARTER_CALENDAR[0].id);

  useEffect(() => {
    Promise.all([
      readJson<CalendarEntry[]>(supabase.from('public_journey_calendar').request({ query: 'select=*&order=starts_on.asc' })),
      readJson<ExchangeItem[]>(supabase.from('public_journey_exchange').request({ query: 'select=*&order=display_order.asc' })),
    ]).then(([calendarRows, exchangeRows]) => {
      setCalendar(calendarRows);
      setExchange(exchangeRows);
      if (calendarRows[0]) setSelectedId(calendarRows[0].id);
    }).catch(() => {
      setCalendar([]);
      setExchange([]);
    });
  }, []);

  const entries = calendar.length ? calendar : STARTER_CALENDAR;
  const items = exchange.length ? exchange : STARTER_EXCHANGE;
  const selected = entries.find((entry) => entry.id === selectedId) || entries[0];
  const selectedIndex = Math.max(0, entries.findIndex((entry) => entry.id === selected.id));
  const previous = entries[(selectedIndex - 1 + entries.length) % entries.length];
  const next = entries[(selectedIndex + 1) % entries.length];
  const selectedNeeds = useMemo(() => items.filter((item) => item.item_type === 'need' && (item.calendar_entry_id === selected.id || !item.calendar_entry_id) && (item.journey_person === selected.journey_person || item.journey_person === 'together')).sort((a,b)=>a.display_order-b.display_order), [items, selected]);
  const selectedOffers = useMemo(() => items.filter((item) => item.item_type === 'offer' && (item.calendar_entry_id === selected.id || !item.calendar_entry_id) && (item.journey_person === selected.journey_person || item.journey_person === 'together')).sort((a,b)=>a.display_order-b.display_order), [items, selected]);
  const selectedDate = dateParts(selected.starts_on);
  const currentEntry = entries.find((entry) => entry.status === 'current') || entries[0];

  return <section className="journey-calendar-planner" aria-labelledby="journey-calendar-planner-title">
    <div className="journey-calendar-planner__header">
      <div><p className="eyebrow">Journey calendar</p><h3 id="journey-calendar-planner-title">Where Kevin and Micha are — and what comes next.</h3><p>Choose a day to see the location, their request for help and what they can offer in return.</p></div>
      <Callout><Navigation/><span><small>Current location</small><strong>{currentEntry.location_name || currentEntry.city_name}</strong></span></Callout>
    </div>

    <div className="journey-calendar-strip" role="list">
      {entries.map((entry) => {
        const date = dateParts(entry.starts_on);
        const active = entry.id === selected.id;
        return <button type="button" key={entry.id} className={`journey-calendar-day${active ? ' is-active' : ''}${entry.status === 'current' ? ' is-current' : ''}`} onClick={() => setSelectedId(entry.id)}>
          <span>{date.weekday}</span><strong>{date.day}</strong><small>{date.month}</small>
          {entry.status === 'current' ? <i>Now</i> : null}
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
