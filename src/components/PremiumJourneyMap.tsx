import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Compass, Crosshair, Flag, Fullscreen, LocateFixed, MapPin, Navigation, Route, Sparkles } from 'lucide-react';
import type { JournalDisplayPerson } from '../lib/journalPeople';
import { getMapNavigation, newestMapPoint } from '../lib/journalMapNavigation';
import { supabase } from '../lib/supabase';
import { useWebsiteI18n } from '../lib/websiteI18n';
import { Badge, Card, Callout } from './ui/card';
import { Button, ButtonLink } from './ui/button';
import { mountJourneyMapPin } from './JourneyMapPin';
import { JourneyFootageCarousel, type JourneyFootageItem } from './journal/JourneyFootageCarousel';
import './PremiumJourneyMap.css';

export type JourneyInvolvedPerson = JournalDisplayPerson & {
  relation_role?: string;
  display_order?: number;
};

export type PremiumJourneyPoint = {
  journey_entry_id: string;
  slug: string;
  title: string;
  excerpt?: string;
  occurred_at: string;
  country_name?: string;
  city_name?: string;
  location_name?: string;
  latitude?: number | string;
  longitude?: number | string;
  journey_person?: 'kevin' | 'micha' | 'together';
  is_milestone: boolean;
  is_current_location: boolean;
  involved_people: JourneyInvolvedPerson[];
  cover_image_url?: string;
  cover_image_alt?: string;
  footage?: JourneyFootageItem[];
};

type Coordinate = [number, number];
type FounderRouteKey = 'kevin' | 'micha';
type FounderRoute = {
  key: FounderRouteKey;
  coordinates: Coordinate[];
  distanceKm: number;
  durationMinutes: number;
  status: 'idle' | 'loading' | 'routed' | 'fallback';
};

type MapLibreGlobal = {
  Map: new (options: Record<string, unknown>) => any;
  Marker: new (options?: Record<string, unknown>) => any;
  Popup: new (options?: Record<string, unknown>) => any;
  NavigationControl: new (options?: Record<string, unknown>) => any;
  FullscreenControl: new () => any;
  AttributionControl: new (options?: Record<string, unknown>) => any;
  ScaleControl: new (options?: Record<string, unknown>) => any;
};

type MountedMapPin = ReturnType<typeof mountJourneyMapPin>;
type MarkerRecord = {
  marker: any;
  pin: MountedMapPin;
  pointId: string;
};

declare global { interface Window { maplibregl?: MapLibreGlobal; } }

const MAPLIBRE_JS = 'https://unpkg.com/maplibre-gl@5.6.1/dist/maplibre-gl.js';
const MAPLIBRE_CSS = 'https://unpkg.com/maplibre-gl@5.6.1/dist/maplibre-gl.css';
const MAP_STYLE = {
  version: 8,
  sources: { carto: { type: 'raster', tiles: ['https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png','https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png','https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png','https://d.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png'], tileSize: 256, attribution: '© OpenStreetMap contributors © CARTO' } },
  layers: [{ id: 'carto-voyager', type: 'raster', source: 'carto', minzoom: 0, maxzoom: 20 }],
};

let mapLibrePromise: Promise<MapLibreGlobal> | null = null;

function loadMapLibre(): Promise<MapLibreGlobal> {
  if (window.maplibregl) return Promise.resolve(window.maplibregl);
  if (mapLibrePromise) return mapLibrePromise;
  mapLibrePromise = new Promise((resolve, reject) => {
    if (!document.querySelector(`link[href="${MAPLIBRE_CSS}"]`)) {
      const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = MAPLIBRE_CSS; document.head.appendChild(link);
    }
    const existing = document.querySelector(`script[src="${MAPLIBRE_JS}"]`) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => window.maplibregl ? resolve(window.maplibregl) : reject(new Error('MapLibre failed to initialize.')), { once: true });
      existing.addEventListener('error', () => reject(new Error('MapLibre failed to load.')), { once: true });
      return;
    }
    const script = document.createElement('script'); script.src = MAPLIBRE_JS; script.async = true;
    script.onload = () => window.maplibregl ? resolve(window.maplibregl) : reject(new Error('MapLibre failed to initialize.'));
    script.onerror = () => reject(new Error('MapLibre failed to load.'));
    document.head.appendChild(script);
  });
  return mapLibrePromise;
}

function coordinates(point: PremiumJourneyPoint): Coordinate {
  return [Number(point.longitude), Number(point.latitude)];
}

function sortedPeople(point: PremiumJourneyPoint) {
  return [...(point.involved_people || [])].sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
}

function peopleLabel(point: PremiumJourneyPoint) {
  return sortedPeople(point).map((person) => person.display_name).join(' & ');
}

function pointBelongsTo(point: PremiumJourneyPoint, founder: FounderRouteKey) {
  const slugs = sortedPeople(point).map((person) => person.slug);
  if (founder === 'kevin' && slugs.includes('kevin-de-vlieger')) return true;
  if (founder === 'micha' && slugs.includes('micha')) return true;
  return point.journey_person === founder || point.journey_person === 'together';
}

function dedupeCoordinates(values: Coordinate[]) {
  return values.filter((value, index) => index === 0 || value[0] !== values[index - 1][0] || value[1] !== values[index - 1][1]);
}

function routeFeature(coordinatesValue: Coordinate[]) {
  const safe = coordinatesValue.length > 1 ? coordinatesValue : coordinatesValue.length === 1 ? [coordinatesValue[0], coordinatesValue[0]] : [];
  return { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: safe } };
}

function newestPoint(points: PremiumJourneyPoint[]) {
  return newestMapPoint(points);
}

export function PremiumJourneyMap({ points, activeId, onSelect }: { points: PremiumJourneyPoint[]; activeId?: string; onSelect: (id: string) => void }) {
  const { t, formatDate } = useWebsiteI18n();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<MarkerRecord[]>([]);
  const [mapError, setMapError] = useState('');
  const [routes, setRoutes] = useState<Record<FounderRouteKey, FounderRoute>>({
    kevin: { key: 'kevin', coordinates: [], distanceKm: 0, durationMinutes: 0, status: 'idle' },
    micha: { key: 'micha', coordinates: [], distanceKm: 0, durationMinutes: 0, status: 'idle' },
  });
  const navigation = useMemo(() => getMapNavigation(points, activeId), [points, activeId]);
  const { mapped, active, activeIndex, previous, next, isActiveIdValid } = navigation;
  const routeStops = useMemo(() => ({
    kevin: dedupeCoordinates(mapped.filter((point) => pointBelongsTo(point, 'kevin')).map(coordinates)),
    micha: dedupeCoordinates(mapped.filter((point) => pointBelongsTo(point, 'micha')).map(coordinates)),
  }), [mapped]);
  const current = newestPoint(mapped.filter((point) => point.is_current_location)) || newestPoint(mapped) || mapped[0];
  const routeProgress = mapped.length > 1 ? ((activeIndex + 1) / mapped.length) * 100 : 100;
  const routedDistance = routes.kevin.distanceKm + routes.micha.distanceKm;
  const routingFallback = routes.kevin.status === 'fallback' || routes.micha.status === 'fallback';

  useEffect(() => {
    if (!mapped.length || isActiveIdValid) return;
    const fallback = newestPoint(mapped);
    if (fallback) onSelect(fallback.journey_entry_id);
  }, [mapped, isActiveIdValid, onSelect]);

  useEffect(() => {
    if (!mapped.length) return;
    const controller = new AbortController();
    setRoutes({
      kevin: { key: 'kevin', coordinates: routeStops.kevin, distanceKm: 0, durationMinutes: 0, status: routeStops.kevin.length > 1 ? 'loading' : 'idle' },
      micha: { key: 'micha', coordinates: routeStops.micha, distanceKm: 0, durationMinutes: 0, status: routeStops.micha.length > 1 ? 'loading' : 'idle' },
    });

    fetch(`${supabase.url}/functions/v1/journey-routes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ routes: [
        { key: 'kevin', coordinates: routeStops.kevin },
        { key: 'micha', coordinates: routeStops.micha },
      ] }),
      signal: controller.signal,
    }).then(async (response) => {
      if (!response.ok) throw new Error(await response.text());
      return response.json() as Promise<{ routes: FounderRoute[] }>;
    }).then((payload) => {
      if (controller.signal.aborted) return;
      const nextRoutes = Object.fromEntries(payload.routes.map((route) => [route.key, route])) as Record<FounderRouteKey, FounderRoute>;
      setRoutes({
        kevin: nextRoutes.kevin || { key: 'kevin', coordinates: routeStops.kevin, distanceKm: 0, durationMinutes: 0, status: 'fallback' },
        micha: nextRoutes.micha || { key: 'micha', coordinates: routeStops.micha, distanceKm: 0, durationMinutes: 0, status: 'fallback' },
      });
    }).catch((error: unknown) => {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setRoutes({
        kevin: { key: 'kevin', coordinates: routeStops.kevin, distanceKm: 0, durationMinutes: 0, status: 'fallback' },
        micha: { key: 'micha', coordinates: routeStops.micha, distanceKm: 0, durationMinutes: 0, status: 'fallback' },
      });
    });
    return () => controller.abort();
  }, [mapped.length, routeStops]);

  useEffect(() => {
    if (!containerRef.current || !mapped.length || !active) return;
    let cancelled = false;
    let map: any = null;
    let resizeObserver: ResizeObserver | null = null;
    let resizeTimer: number | undefined;

    const resizeMap = () => {
      window.cancelAnimationFrame(resizeTimer || 0);
      resizeTimer = window.requestAnimationFrame(() => map?.resize?.());
    };

    loadMapLibre().then((maplibregl) => {
      if (cancelled || !containerRef.current) return;
      setMapError('');
      map = new maplibregl.Map({ container: containerRef.current, style: MAP_STYLE, center: coordinates(active), zoom: 10.5, pitch: 32, bearing: -4, attributionControl: false, cooperativeGestures: true });
      mapRef.current = map;
      map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
      map.addControl(new maplibregl.FullscreenControl(), 'top-right');
      map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
      map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left');

      resizeObserver = new ResizeObserver(resizeMap);
      resizeObserver.observe(containerRef.current);
      window.addEventListener('resize', resizeMap);
      window.addEventListener('orientationchange', resizeMap);
      document.addEventListener('fullscreenchange', resizeMap);

      map.on('load', () => {
        (['kevin', 'micha'] as FounderRouteKey[]).forEach((key) => {
          map.addSource(`journey-route-${key}`, { type: 'geojson', data: routeFeature(routes[key].coordinates) });
          map.addLayer({ id: `journey-route-${key}-glow`, type: 'line', source: `journey-route-${key}`, paint: { 'line-color': key === 'kevin' ? '#e2b45f' : '#6687d8', 'line-width': 10, 'line-opacity': 0.2, 'line-blur': 7 } });
          map.addLayer({ id: `journey-route-${key}-line`, type: 'line', source: `journey-route-${key}`, paint: { 'line-color': key === 'kevin' ? '#e2b45f' : '#6687d8', 'line-width': 5, 'line-opacity': 0.95 } });
        });

        mapped.forEach((point) => {
          const pin = mountJourneyMapPin(point, point.journey_entry_id === active.journey_entry_id, onSelect);
          const popup = new maplibregl.Popup({ offset: 34, closeButton: false }).setDOMContent(pin.popupElement);
          const marker = new maplibregl.Marker({ element: pin.element, anchor: 'center' })
            .setLngLat(coordinates(point))
            .setPopup(popup)
            .addTo(map);
          markersRef.current.push({ marker, pin, pointId: point.journey_entry_id });
        });
        resizeMap();
        window.setTimeout(resizeMap, 120);
        window.setTimeout(resizeMap, 450);
        map.flyTo({ center: coordinates(active), zoom: 10.5, pitch: 32, duration: 700, essential: true });
      });
    }).catch(() => { if (!cancelled) setMapError(t('journal.map.error.load_failed', 'The interactive map could not load. Check the connection and refresh.')); });

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      window.removeEventListener('resize', resizeMap);
      window.removeEventListener('orientationchange', resizeMap);
      document.removeEventListener('fullscreenchange', resizeMap);
      window.cancelAnimationFrame(resizeTimer || 0);
      markersRef.current.forEach(({ marker, pin }) => {
        marker.remove();
        pin.unmount();
      });
      markersRef.current = [];
      if (map) map.remove();
      mapRef.current = null;
    };
  }, [mapped, onSelect, t]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    (['kevin', 'micha'] as FounderRouteKey[]).forEach((key) => {
      const source = map.getSource?.(`journey-route-${key}`);
      if (source?.setData) source.setData(routeFeature(routes[key].coordinates));
    });
  }, [routes]);

  useEffect(() => {
    if (!active || !mapRef.current) return;
    markersRef.current.forEach(({ pin, pointId }) => {
      const point = mapped.find((entry) => entry.journey_entry_id === pointId);
      if (point) pin.update(point, pointId === active.journey_entry_id);
    });
    mapRef.current.resize?.();
    mapRef.current.flyTo({ center: coordinates(active), zoom: Math.max(mapRef.current.getZoom(), 9.5), pitch: 32, duration: 950, essential: true });
  }, [active, mapped]);

  if (!mapped.length || !active) {
    return <Card className="premium-map-empty">
      <Route/>
      <h3>{t('journal.map.empty.title', 'The first mapped chapter is coming.')}</h3>
      <p>{t('journal.map.empty.body', 'Publish a journey location with coordinates to activate the route.')}</p>
    </Card>;
  }

  const activePeople = sortedPeople(active);
  const currentStopLabel = current.location_name || current.city_name || t('journal.map.kpi.open_road', 'Open road');

  return <div className="premium-map-shell">
    <div className="premium-map-kpis">
      <Callout><Route/><span><strong>{mapped.length}</strong> {t('journal.map.kpi.mapped_chapters', 'mapped chapters')}</span></Callout>
      <Callout><Compass/><span><strong>{routedDistance ? `${Math.round(routedDistance)} km` : `${activeIndex + 1}/${mapped.length}`}</strong> {routedDistance ? t('journal.map.kpi.road_distance', 'road distance') : t('journal.map.kpi.route_position', 'route position')}</span></Callout>
      <Callout><Flag/><span><strong>{currentStopLabel}</strong> {t('journal.map.kpi.current_stop', 'current stop')}</span></Callout>
    </div>
    <div className="premium-map-layout">
      <Card className="premium-map-card">
        <div className="premium-map-card__topbar"><div><Badge>{t('journal.map.badge.live_map', 'Live journey map')}</Badge><span>{t('journal.map.topbar.subtitle', 'Separate road routes for Kevin and Micha · database-linked profile pins')}</span></div><div className="premium-map-top-actions"><Button variant="ghost" size="sm" onClick={() => { mapRef.current?.resize?.(); mapRef.current?.flyTo({ center: coordinates(current), zoom: 10.5, duration: 900 }); }}><LocateFixed size={16}/> {t('journal.map.action.current', 'Current')}</Button><Button variant="ghost" size="sm" onClick={() => containerRef.current?.requestFullscreen()}><Fullscreen size={16}/> {t('journal.map.action.fullscreen', 'Fullscreen')}</Button></div></div>
        <div className="premium-map-stage premium-map-stage--light"><div ref={containerRef} className="premium-map-canvas" />{mapError ? <div className="premium-map-load-error">{mapError}</div> : null}{routingFallback ? <div className="premium-map-load-error">{t('journal.map.error.routing_fallback', 'Road routing is temporarily unavailable; simplified lines are shown.')}</div> : null}<div className="premium-map-floating-card premium-map-floating-card--top"><Crosshair size={15}/><span>{t('journal.map.floating.journey_view', 'Journey view')}</span></div><div className="premium-map-legend"><span><i className="is-kevin"/> {t('journal.map.legend.kevin_route', 'Kevin route')}</span><span><i className="is-micha"/> {t('journal.map.legend.micha_route', 'Micha route')}</span><span><i className="is-together"/> {t('journal.map.legend.shared_stop', 'Shared stop')}</span></div></div>
      </Card>
      <Card className="premium-map-detail-card" key={active.journey_entry_id}>
        <div className="premium-map-detail-card__meta">{activePeople.length ? <Badge>{peopleLabel(active)}</Badge> : null}{active.is_current_location ? <Badge className="premium-map-live"><span/> {t('journal.map.detail.live_location', 'Live location')}</Badge> : null}</div>
        {activePeople.length ? <div className="premium-map-detail-founder">{activePeople.slice(0, 3).map((person) => person.avatar_url ? <img key={person.id} src={person.avatar_url} alt={person.display_name}/> : <span key={person.id} className="premium-map-detail-founder__fallback">{person.display_name.slice(0, 1)}</span>)}</div> : null}
        <JourneyFootageCarousel items={active.footage} title={active.title} />
        {!active.footage?.length && active.cover_image_url ? <img className="premium-map-detail-card__cover" src={active.cover_image_url} alt={active.cover_image_alt || active.title} loading="lazy" /> : null}
        <div className="premium-map-detail-card__icon">{active.is_current_location ? <Navigation/> : active.is_milestone ? <Sparkles/> : <MapPin/>}</div>
        <time dateTime={active.occurred_at}>{formatDate(active.occurred_at)}</time>
        <h3>{active.title}</h3>
        <p className="premium-map-detail-card__location"><MapPin size={16}/>{active.location_name || active.city_name}{active.country_name ? `, ${active.country_name}` : ''}</p>
        {active.excerpt ? <p>{active.excerpt}</p> : null}
        <div className="premium-map-progress"><div><span>{t('journal.map.detail.journey_progress', 'Journey progress')}</span><strong>{Math.round(routeProgress)}%</strong></div><div className="premium-map-progress__track"><span style={{ width: `${routeProgress}%` }}/></div></div>
        <div className="premium-map-coordinates"><Crosshair size={15}/><span>{Number(active.latitude).toFixed(4)}, {Number(active.longitude).toFixed(4)}</span></div>
        {active.slug ? <ButtonLink href={`/journal/${active.slug}`}>{t('journal.map.detail.read_chapter', 'Read this chapter')} <ChevronRight size={16}/></ButtonLink> : null}
        <div className="premium-map-detail-card__nav"><Button variant="ghost" size="sm" disabled={!previous} onClick={() => previous && onSelect(previous.journey_entry_id)}><ChevronLeft size={16}/> {t('journal.map.nav.previous', 'Previous')}</Button><Button variant="ghost" size="sm" disabled={!next} onClick={() => next && onSelect(next.journey_entry_id)}>{t('journal.map.nav.next', 'Next')} <ChevronRight size={16}/></Button></div>
      </Card>
    </div>
  </div>;
}
