import { Bath, CalendarDays, ChevronRight, Compass, Droplets, HandHeart, Home, MapPin, PlugZap, Route, ShowerHead, Sparkles, Users, Waves, Wrench, Zap } from 'lucide-react';
import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import './JournalJourneyExperience.css';

type JourneyPerson = 'kevin' | 'micha' | 'together';
type Coordinate = [number, number];
type RouteState = { coordinates: Coordinate[]; distanceKm?: number; status: 'idle' | 'loading' | 'routed' | 'fallback' };

type JourneyPoint = {
  journey_entry_id: string;
  slug: string;
  title: string;
  excerpt?: string;
  cover_image_url?: string;
  occurred_at: string;
  country_name?: string;
  city_name?: string;
  location_name?: string;
  latitude?: number | string;
  longitude?: number | string;
  journey_person: JourneyPerson;
  is_milestone: boolean;
  milestone_type?: string;
  is_current_location: boolean;
  effective_journey_order: number;
  map_label?: string;
  marker_variant?: string;
  journey_category?: string;
  mood?: string;
  what_happened?: string;
  why_it_mattered?: string;
  travel_mode?: string;
};

type CalendarEntry = {
  id: string; title: string; slug: string; journey_person: JourneyPerson; status: string; starts_on: string; ends_on?: string;
  city_name?: string; country_name?: string; location_name?: string; public_summary?: string; accommodation_needed: boolean;
  accommodation_from?: string; accommodation_until?: string; guests_count: number; nights_needed?: number; host_request_message?: string;
  host_request_status: string; can_offer_hosting: boolean;
};

type ExchangeItem = {
  id: string; calendar_entry_id?: string; journey_person: JourneyPerson; item_type: 'need' | 'offer'; category: string;
  title: string; description?: string; priority: string; display_order: number;
};

type JourneyStatus = {
  current_location?: string; current_city?: string; current_country?: string; locations_count: number; stories_count: number;
  total_distance_km: number; milestones_count: number;
};

type OsrmRouteResponse = {
  code: string;
  routes?: Array<{ distance: number; duration: number; geometry: { type: 'LineString'; coordinates: Coordinate[] } }>;
};

async function readJson<T>(responseOrPromise: Response | Promise<Response>): Promise<T> {
  const response = await responseOrPromise;
  if (!response.ok) throw new Error(await response.text());
  return response.json() as Promise<T>;
}

function formatDate(value?: string) {
  if (!value) return '';
  return new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value));
}

function personLabel(person: JourneyPerson) {
  return person === 'together' ? 'Kevin & Micha' : person === 'kevin' ? 'Kevin' : 'Micha';
}

function itemIcon(category: string) {
  const key = category.toLowerCase();
  if (key.includes('camper') || key.includes('parking') || key.includes('bed') || key.includes('house')) return Home;
  if (key.includes('shower')) return ShowerHead;
  if (key.includes('electric')) return PlugZap;
  if (key.includes('water')) return Droplets;
  if (key.includes('paddle')) return Waves;
  if (key.includes('handy') || key.includes('repair')) return Wrench;
  if (key.includes('bbq') || key.includes('cook')) return Sparkles;
  if (key.includes('yacht') || key.includes('skipper')) return Compass;
  return HandHeart;
}

function toCoordinate(point: JourneyPoint): Coordinate {
  return [Number(point.longitude), Number(point.latitude)];
}

function deduplicateConsecutiveCoordinates(points: JourneyPoint[]) {
  return points.filter((point, index) => {
    if (index === 0) return true;
    const [lng, lat] = toCoordinate(point);
    const [previousLng, previousLat] = toCoordinate(points[index - 1]);
    return lng !== previousLng || lat !== previousLat;
  });
}

function routeKey(point: JourneyPoint) {
  return point.journey_person === 'together' ? 'together' : point.journey_person;
}

function JourneyMap({ points, activeId, onSelect }: { points: JourneyPoint[]; activeId?: string; onSelect: (id: string) => void }) {
  const positioned = useMemo(
    () => points
      .filter((point) => point.latitude != null && point.longitude != null && Number.isFinite(Number(point.latitude)) && Number.isFinite(Number(point.longitude)))
      .sort((a, b) => a.effective_journey_order - b.effective_journey_order || new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime()),
    [points],
  );
  const routeGroups = useMemo(() => {
    const groups = new Map<string, JourneyPoint[]>();
    positioned.forEach((point) => groups.set(routeKey(point), [...(groups.get(routeKey(point)) || []), point]));
    return Array.from(groups.entries()).map(([key, groupPoints]) => ({ key, points: deduplicateConsecutiveCoordinates(groupPoints) }));
  }, [positioned]);
  const [routes, setRoutes] = useState<Record<string, RouteState>>({});

  useEffect(() => {
    const controller = new AbortController();
    const initial = Object.fromEntries(routeGroups.map(({ key, points: stops }) => [key, { coordinates: stops.map(toCoordinate), status: stops.length > 1 ? 'loading' : 'idle' } satisfies RouteState]));
    setRoutes(initial);
    Promise.all(routeGroups.map(async ({ key, points: stops }) => {
      if (stops.length < 2) return [key, initial[key]] as const;
      const query = stops.map((point) => toCoordinate(point).join(',')).join(';');
      try {
        const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${query}?overview=full&geometries=geojson&steps=false`, { signal: controller.signal });
        if (!response.ok) throw new Error(`Routing failed with ${response.status}`);
        const result = await response.json() as OsrmRouteResponse;
        const route = result.code === 'Ok' ? result.routes?.[0] : undefined;
        if (!route?.geometry.coordinates.length) throw new Error('No road route returned');
        return [key, { coordinates: route.geometry.coordinates, distanceKm: route.distance / 1000, status: 'routed' } satisfies RouteState] as const;
      } catch (error: unknown) {
        if (error instanceof DOMException && error.name === 'AbortError') return [key, initial[key]] as const;
        return [key, { coordinates: stops.map(toCoordinate), status: 'fallback' } satisfies RouteState] as const;
      }
    })).then((entries) => { if (!controller.signal.aborted) setRoutes(Object.fromEntries(entries)); });
    return () => controller.abort();
  }, [routeGroups]);

  const allCoordinates = useMemo(() => {
    const routed = Object.values(routes).flatMap((route) => route.coordinates);
    return routed.length ? routed : positioned.map(toCoordinate);
  }, [positioned, routes]);
  const bounds = useMemo(() => {
    const lngs = allCoordinates.map(([lng]) => lng);
    const lats = allCoordinates.map(([, lat]) => lat);
    return { minLat: Math.min(...lats, 35), maxLat: Math.max(...lats, 45), minLng: Math.min(...lngs, -10), maxLng: Math.max(...lngs, 10) };
  }, [allCoordinates]);
  const project = ([lng, lat]: Coordinate) => {
    const latRange = Math.max(bounds.maxLat - bounds.minLat, 1);
    const lngRange = Math.max(bounds.maxLng - bounds.minLng, 1);
    return { x: 8 + ((lng - bounds.minLng) / lngRange) * 84, y: 8 + (1 - (lat - bounds.minLat) / latRange) * 74 };
  };
  const place = (point: JourneyPoint): CSSProperties => {
    const { x, y } = project(toCoordinate(point));
    return { left: `${x}%`, top: `${y}%` };
  };
  const activePoint = positioned.find((point) => point.journey_entry_id === activeId);
  const routedDistance = Object.values(routes).reduce((total, route) => total + (route.distanceKm || 0), 0);
  const routeLoading = Object.values(routes).some((route) => route.status === 'loading');
  const routeFallback = Object.values(routes).some((route) => route.status === 'fallback');

  return <div className="journey-map" aria-label="Interactive journey map">
    <div className="journey-map__glow" /><div className="journey-map__grid" /><div className="journey-map__coast journey-map__coast--one" /><div className="journey-map__coast journey-map__coast--two" />
    {Object.entries(routes).map(([key, route]) => route.coordinates.length > 1 ? <svg key={key} className={`journey-map__route journey-map__route--${key}`} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><polyline points={route.coordinates.map((coordinate) => { const projected = project(coordinate); return `${projected.x},${projected.y}`; }).join(' ')} /></svg> : null)}
    {positioned.map((point, index) => <button type="button" key={point.journey_entry_id} className={`journey-pin journey-pin--${point.journey_person} journey-pin--${point.marker_variant || 'default'} ${activeId === point.journey_entry_id ? 'journey-pin--active' : ''} ${point.is_current_location ? 'journey-pin--current' : ''} ${point.is_milestone ? 'journey-pin--milestone' : ''}`} style={place(point)} onClick={() => onSelect(point.journey_entry_id)} aria-pressed={activeId === point.journey_entry_id} aria-label={`${point.map_label || point.location_name || point.title}. ${formatDate(point.occurred_at)}`}><span className="journey-pin__halo" /><span className="journey-pin__core"><MapPin size={15} /><b>{index + 1}</b></span><small>{point.map_label || point.city_name || point.location_name || personLabel(point.journey_person)}</small></button>)}
    {activePoint ? <div className="journey-map-popup" style={place(activePoint)} role="status"><div className="journey-map-popup__top"><span className="journey-person">{personLabel(activePoint.journey_person)}</span>{activePoint.is_current_location ? <span className="journey-live-badge">Current</span> : null}</div><strong>{activePoint.map_label || activePoint.location_name || activePoint.city_name || activePoint.title}</strong><time>{formatDate(activePoint.occurred_at)}</time><p>{activePoint.what_happened || activePoint.excerpt || activePoint.title}</p><a href={`/journal/${activePoint.slug}`}>Open chapter <ChevronRight size={14} /></a></div> : null}
    {positioned.length > 1 ? <span className={`journey-map__routing-status ${routeFallback ? 'is-warning' : ''}`} aria-live="polite">{routeLoading ? 'Calculating road routes…' : routeFallback ? 'Some road routes are temporarily simplified' : `Road routes${routedDistance ? ` · ${Math.round(routedDistance)} km` : ''}`}</span> : null}
    {!positioned.length ? <div className="journey-map__empty"><Route size={34} /><strong>The route starts with the first published location.</strong><span>Journey records with valid database coordinates automatically become map pins.</span></div> : null}
  </div>;
}

function HostOfferForm({ entry, onClose }: { entry: CalendarEntry; onClose: () => void }) {
  const [form, setForm] = useState({ host_name: '', email: '', phone: '', city_name: entry.city_name || '', country_name: entry.country_name || '', accommodation_type: '', available_from: entry.accommodation_from || entry.starts_on, available_until: entry.accommodation_until || entry.ends_on || entry.starts_on, guests_capacity: entry.guests_count || 2, message: '', consent_to_contact: true });
  const [state, setState] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault(); setState('saving'); setMessage('');
    try {
      const response = await supabase.from('journey_host_offers').request({ method: 'POST', headers: { Prefer: 'return=minimal' }, body: { ...form, calendar_entry_id: entry.id, guests_capacity: Number(form.guests_capacity) } });
      if (!response.ok) throw new Error(await response.text());
      setState('success'); setMessage('Thank you. Your hosting offer was sent privately to Kevin and Micha.');
    } catch { setState('error'); setMessage('Your offer could not be sent. Please check the details and try again.'); }
  }
  return <div className="journey-modal" role="dialog" aria-modal="true" aria-labelledby="host-offer-title"><div className="journey-modal__panel"><button className="journey-modal__close" type="button" onClick={onClose}>Close</button><p className="eyebrow">Offer a place to stay</p><h3 id="host-offer-title">Help at {entry.location_name || entry.city_name || entry.title}</h3><p>Your contact details remain private and are only visible to authorized mission admins.</p>{state === 'success' ? <div className="journey-success"><HandHeart /><strong>{message}</strong><button className="button" onClick={onClose}>Done</button></div> : <form className="journey-host-form" onSubmit={submit}><div className="journey-form-grid"><label>Your name<input required value={form.host_name} onChange={(e) => setForm({ ...form, host_name: e.target.value })} /></label><label>Email<input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label><label>Phone <small>optional</small><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label><label>Accommodation type<input required placeholder="Bed, camper place, guest room…" value={form.accommodation_type} onChange={(e) => setForm({ ...form, accommodation_type: e.target.value })} /></label><label>Available from<input required type="date" value={form.available_from} onChange={(e) => setForm({ ...form, available_from: e.target.value })} /></label><label>Available until<input required type="date" value={form.available_until} onChange={(e) => setForm({ ...form, available_until: e.target.value })} /></label></div><label>Message<textarea required rows={4} placeholder="Tell Kevin and Micha what you can offer and anything useful to know." value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} /></label><label className="journey-consent"><input required type="checkbox" checked={form.consent_to_contact} onChange={(e) => setForm({ ...form, consent_to_contact: e.target.checked })} /> Kevin and Micha may contact me about this hosting offer.</label>{message ? <p className={state === 'error' ? 'journey-error' : 'form-status'}>{message}</p> : null}<button className="button" disabled={state === 'saving'}>{state === 'saving' ? 'Sending privately…' : 'Send hosting offer'}</button></form>}</div></div>;
}

export function JournalJourneyExperience() {
  const [points, setPoints] = useState<JourneyPoint[]>([]); const [calendar, setCalendar] = useState<CalendarEntry[]>([]); const [exchange, setExchange] = useState<ExchangeItem[]>([]);
  const [status, setStatus] = useState<JourneyStatus>({ locations_count: 0, stories_count: 0, total_distance_km: 0, milestones_count: 0 });
  const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [person, setPerson] = useState<'all' | JourneyPerson>('all'); const [activeId, setActiveId] = useState<string>(); const [hostEntry, setHostEntry] = useState<CalendarEntry>();
  useEffect(() => {
    Promise.all([
      readJson<JourneyPoint[]>(supabase.from('public_journal_journey').request({ query: 'select=*&order=effective_journey_order.asc,occurred_at.asc' })),
      readJson<CalendarEntry[]>(supabase.from('public_journey_calendar').request({ query: 'select=*&order=starts_on.asc' })),
      readJson<ExchangeItem[]>(supabase.from('public_journey_exchange').request({ query: 'select=*&order=item_type.asc,display_order.asc' })),
      readJson<JourneyStatus>(supabase.rpc('get_public_journey_status', {})),
    ]).then(([journeyRows, calendarRows, exchangeRows, journeyStatus]) => {
      const validJourneyRows = journeyRows.filter((point) => point.journey_entry_id && point.slug && point.occurred_at);
      setPoints(validJourneyRows); setCalendar(calendarRows); setExchange(exchangeRows); setStatus(journeyStatus || status);
      setActiveId(validJourneyRows.find((point) => point.is_current_location)?.journey_entry_id || validJourneyRows[0]?.journey_entry_id); setLoading(false);
    }).catch(() => { setError('The live journey experience is temporarily unavailable.'); setLoading(false); });
  }, []);
  const filteredPoints = points.filter((point) => person === 'all' || point.journey_person === person || point.journey_person === 'together');
  const filteredCalendar = calendar.filter((entry) => person === 'all' || entry.journey_person === person || entry.journey_person === 'together');
  const activePoint = filteredPoints.find((point) => point.journey_entry_id === activeId) || filteredPoints.find((point) => point.is_current_location) || filteredPoints[0];
  const needs = exchange.filter((item) => item.item_type === 'need'); const offers = exchange.filter((item) => item.item_type === 'offer');
  useEffect(() => { if (activePoint && activePoint.journey_entry_id !== activeId) setActiveId(activePoint.journey_entry_id); }, [person]);
  if (loading) return <div className="journey-loading">Loading the live route, plans and hosting opportunities…</div>;
  if (error) return <div className="impact-state impact-state--error">{error}</div>;
  return <div className="journey-experience">
    <div className="journey-overview"><div><p className="eyebrow">Follow Kevin & Micha</p><h3>The journey, where it happened and where it goes next.</h3><p>Every pin is generated from a published database journey record. Select a pin to open its real chapter, current status and location context.</p></div><div className="journey-stats"><span><strong>{status.locations_count}</strong> locations</span><span><strong>{status.stories_count}</strong> stories</span><span><strong>{Math.round(Number(status.total_distance_km || 0))}</strong> km</span><span><strong>{status.milestones_count}</strong> milestones</span></div></div>
    <div className="journey-filters" role="group" aria-label="Filter journey by founder">{(['all', 'kevin', 'micha', 'together'] as const).map((value) => <button type="button" key={value} className={person === value ? 'is-active' : ''} onClick={() => setPerson(value)}>{value === 'all' ? 'Everyone' : personLabel(value)}</button>)}</div>
    <div className="journey-map-layout"><JourneyMap points={filteredPoints} activeId={activePoint?.journey_entry_id} onSelect={setActiveId} /><aside className="journey-map-card">{activePoint ? <><div className="journey-map-card__header"><span className="journey-person">{personLabel(activePoint.journey_person)}</span>{activePoint.is_current_location ? <span className="journey-live-badge">Current location</span> : null}</div>{activePoint.cover_image_url ? <img className="journey-map-card__image" src={activePoint.cover_image_url} alt="" /> : null}<p className="journey-map-card__date">{formatDate(activePoint.occurred_at)}</p><h4>{activePoint.title}</h4><p className="journey-map-card__location"><MapPin size={16} />{activePoint.map_label || activePoint.location_name || activePoint.city_name}{activePoint.country_name ? `, ${activePoint.country_name}` : ''}</p><p>{activePoint.what_happened || activePoint.excerpt}</p>{activePoint.why_it_mattered ? <div className="journey-map-card__insight"><strong>Why this mattered</strong><span>{activePoint.why_it_mattered}</span></div> : null}<div className="journey-map-card__meta">{activePoint.travel_mode ? <span>{activePoint.travel_mode}</span> : null}{activePoint.mood ? <span>{activePoint.mood}</span> : null}{activePoint.is_milestone ? <span>Milestone</span> : null}</div><a href={`/journal/${activePoint.slug}`}>Read this chapter <ChevronRight size={16} /></a></> : <><MapPin /><h4>The first route pin is coming.</h4><p>Publish a journey record with valid coordinates to activate this map.</p></>}</aside></div>
    <section className="journey-timeline-premium" aria-labelledby="real-journey-timeline"><div className="journey-subheading"><div><p className="eyebrow">Interactive timeline</p><h3 id="real-journey-timeline">From rock bottom, one real chapter at a time.</h3></div><Route /></div>{filteredPoints.length ? <div className="journey-timeline-track">{filteredPoints.map((point) => <button type="button" key={point.journey_entry_id} className={activePoint?.journey_entry_id === point.journey_entry_id ? 'is-active' : ''} onClick={() => setActiveId(point.journey_entry_id)}><span className="journey-timeline-dot" /><time>{formatDate(point.occurred_at)}</time><strong>{point.map_label || point.location_name || point.city_name || point.country_name || 'Journey update'}</strong><small>{point.title}</small></button>)}</div> : <div className="journey-empty-state">Published journey stories will automatically build this timeline.</div>}</section>
    <section className="journey-calendar" aria-labelledby="journey-calendar-title"><div className="journey-subheading"><div><p className="eyebrow">Where we go next</p><h3 id="journey-calendar-title">The public journey calendar.</h3><p>See upcoming locations early enough to meet, collaborate or offer practical support.</p></div><CalendarDays /></div>{filteredCalendar.length ? <div className="journey-calendar-grid">{filteredCalendar.map((entry) => <article className={`journey-stop ${entry.can_offer_hosting ? 'journey-stop--hosting' : ''}`} key={entry.id}><div className="journey-stop__date"><strong>{new Date(entry.starts_on).getDate()}</strong><span>{new Intl.DateTimeFormat('en', { month: 'short' }).format(new Date(entry.starts_on))}</span></div><div className="journey-stop__content"><span className="journey-person">{personLabel(entry.journey_person)}</span><h4>{entry.title}</h4><p className="journey-stop__location"><MapPin size={15} />{entry.location_name || entry.city_name || 'Location to be confirmed'}{entry.country_name ? `, ${entry.country_name}` : ''}</p><p>{entry.public_summary}</p><div className="journey-stop__meta"><span>{formatDate(entry.starts_on)}{entry.ends_on && entry.ends_on !== entry.starts_on ? ` — ${formatDate(entry.ends_on)}` : ''}</span>{entry.accommodation_needed ? <span><Home size={14} /> {entry.nights_needed || 'Some'} night(s) needed</span> : null}</div>{entry.can_offer_hosting ? <button type="button" className="button" onClick={() => setHostEntry(entry)}><HandHeart size={17} /> Offer a place to stay</button> : <span className="journey-stop__confirmed">Plan visible · hosting not currently open</span>}</div></article>)}</div> : <div className="journey-empty-state">Future locations will appear here as soon as Kevin and Micha publish their next plans.</div>}</section>
    <section className="journey-exchange" aria-labelledby="journey-exchange-title"><div className="journey-subheading"><div><p className="eyebrow">Mutual exchange</p><h3 id="journey-exchange-title">What we need. What we offer.</h3><p>This is not a one-way request for help. Kevin and Micha bring experience, practical skills and energy wherever the route takes them.</p></div><Users /></div><div className="journey-exchange-grid"><div className="journey-exchange-column journey-exchange-column--need"><div className="journey-exchange-title"><Bath /><div><span>Practical support</span><h4>What we need</h4></div></div>{needs.length ? needs.map((item) => { const Icon = itemIcon(item.category); return <article key={item.id}><Icon /><div><strong>{item.title}</strong><p>{item.description}</p><small>{personLabel(item.journey_person)} · {item.priority}</small></div></article>; }) : <p className="journey-empty-copy">No active public needs right now.</p>}</div><div className="journey-exchange-column journey-exchange-column--offer"><div className="journey-exchange-title"><Zap /><div><span>Skills and contribution</span><h4>What we offer</h4></div></div>{offers.length ? offers.map((item) => { const Icon = itemIcon(item.category); return <article key={item.id}><Icon /><div><strong>{item.title}</strong><p>{item.description}</p><small>{personLabel(item.journey_person)}</small></div></article>; }) : <p className="journey-empty-copy">Skills and offers will appear here when published.</p>}</div></div></section>
    {hostEntry ? <HostOfferForm entry={hostEntry} onClose={() => setHostEntry(undefined)} /> : null}
  </div>;
}
