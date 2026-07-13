import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Compass, Crosshair, Flag, Fullscreen, LocateFixed, MapPin, Navigation, Route, Sparkles } from 'lucide-react';
import { Badge, Card, Callout } from './ui/card';
import { Button, ButtonLink } from './ui/button';
import './PremiumJourneyMap.css';

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
  journey_person: 'kevin' | 'micha' | 'together';
  is_milestone: boolean;
  is_current_location: boolean;
};

type MapLibreGlobal = {
  Map: new (options: Record<string, unknown>) => any;
  Marker: new (options?: Record<string, unknown>) => any;
  Popup: new (options?: Record<string, unknown>) => any;
  LngLatBounds: new () => any;
  NavigationControl: new (options?: Record<string, unknown>) => any;
  FullscreenControl: new () => any;
  AttributionControl: new (options?: Record<string, unknown>) => any;
  ScaleControl: new (options?: Record<string, unknown>) => any;
};

declare global {
  interface Window {
    maplibregl?: MapLibreGlobal;
  }
}

const MAPLIBRE_JS = 'https://unpkg.com/maplibre-gl@5.6.1/dist/maplibre-gl.js';
const MAPLIBRE_CSS = 'https://unpkg.com/maplibre-gl@5.6.1/dist/maplibre-gl.css';
const MAP_STYLE = {
  version: 8,
  sources: {
    carto: {
      type: 'raster',
      tiles: [
        'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
        'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
        'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
      ],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors © CARTO',
    },
  },
  layers: [{ id: 'carto-dark', type: 'raster', source: 'carto', minzoom: 0, maxzoom: 20 }],
};

let mapLibrePromise: Promise<MapLibreGlobal> | null = null;

function loadMapLibre(): Promise<MapLibreGlobal> {
  if (window.maplibregl) return Promise.resolve(window.maplibregl);
  if (mapLibrePromise) return mapLibrePromise;
  mapLibrePromise = new Promise((resolve, reject) => {
    if (!document.querySelector(`link[href="${MAPLIBRE_CSS}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = MAPLIBRE_CSS;
      document.head.appendChild(link);
    }
    const existing = document.querySelector(`script[src="${MAPLIBRE_JS}"]`) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => window.maplibregl ? resolve(window.maplibregl) : reject(new Error('MapLibre failed to initialize.')), { once: true });
      existing.addEventListener('error', () => reject(new Error('MapLibre failed to load.')), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = MAPLIBRE_JS;
    script.async = true;
    script.onload = () => window.maplibregl ? resolve(window.maplibregl) : reject(new Error('MapLibre failed to initialize.'));
    script.onerror = () => reject(new Error('MapLibre failed to load.'));
    document.head.appendChild(script);
  });
  return mapLibrePromise;
}

function personLabel(person: PremiumJourneyPoint['journey_person']) {
  return person === 'together' ? 'Kevin & Micha' : person === 'kevin' ? 'Kevin' : 'Micha';
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value));
}

function coordinates(point: PremiumJourneyPoint): [number, number] {
  return [Number(point.longitude), Number(point.latitude)];
}

function popupContent(point: PremiumJourneyPoint) {
  const root = document.createElement('div');
  root.className = 'premium-map-popup';
  const eyebrow = document.createElement('span');
  eyebrow.textContent = point.is_current_location ? 'Current location' : personLabel(point.journey_person);
  const title = document.createElement('strong');
  title.textContent = point.title;
  const location = document.createElement('small');
  location.textContent = [point.location_name || point.city_name, point.country_name].filter(Boolean).join(', ');
  root.append(eyebrow, title, location);
  return root;
}

export function PremiumJourneyMap({ points, activeId, onSelect }: { points: PremiumJourneyPoint[]; activeId?: string; onSelect: (id: string) => void }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [mapError, setMapError] = useState('');
  const mapped = useMemo(() => points.filter((point) => Number.isFinite(Number(point.latitude)) && Number.isFinite(Number(point.longitude))), [points]);
  const active = mapped.find((point) => point.journey_entry_id === activeId) || mapped[0];
  const activeIndex = Math.max(0, mapped.findIndex((point) => point.journey_entry_id === active?.journey_entry_id));
  const previous = mapped[(activeIndex - 1 + mapped.length) % mapped.length];
  const next = mapped[(activeIndex + 1) % mapped.length];
  const routeProgress = mapped.length > 1 ? ((activeIndex + 1) / mapped.length) * 100 : 100;

  useEffect(() => {
    if (!containerRef.current || !mapped.length) return;
    let cancelled = false;
    let map: any = null;

    loadMapLibre().then((maplibregl) => {
      if (cancelled || !containerRef.current) return;
      setMapError('');
      map = new maplibregl.Map({
        container: containerRef.current,
        style: MAP_STYLE,
        center: coordinates(mapped.find((point) => point.is_current_location) || mapped[0]),
        zoom: 8.5,
        pitch: 36,
        bearing: -8,
        attributionControl: false,
        cooperativeGestures: true,
      });
      mapRef.current = map;
      map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
      map.addControl(new maplibregl.FullscreenControl(), 'top-right');
      map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
      map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left');
      map.on('load', () => {
        map.addSource('journey-route', { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: mapped.map(coordinates) } } });
        map.addLayer({ id: 'journey-route-glow', type: 'line', source: 'journey-route', paint: { 'line-color': '#d8aa5f', 'line-width': 8, 'line-opacity': 0.16, 'line-blur': 6 } });
        map.addLayer({ id: 'journey-route-line', type: 'line', source: 'journey-route', paint: { 'line-color': '#f0c979', 'line-width': 3, 'line-opacity': 0.96, 'line-dasharray': [1.2, 1.2] } });
        const bounds = new maplibregl.LngLatBounds();
        mapped.forEach((point, index) => {
          bounds.extend(coordinates(point));
          const element = document.createElement('button');
          element.type = 'button';
          element.className = `premium-map-dom-marker${point.is_current_location ? ' is-current' : ''}${point.journey_entry_id === activeId ? ' is-active' : ''}`;
          element.setAttribute('aria-label', `Open ${point.title}`);
          element.innerHTML = `<span>${index + 1}</span>`;
          element.addEventListener('click', () => onSelect(point.journey_entry_id));
          const marker = new maplibregl.Marker({ element, anchor: 'center' })
            .setLngLat(coordinates(point))
            .setPopup(new maplibregl.Popup({ offset: 22, closeButton: false }).setDOMContent(popupContent(point)))
            .addTo(map);
          markersRef.current.push(marker);
        });
        if (mapped.length > 1) map.fitBounds(bounds, { padding: { top: 90, right: 90, bottom: 90, left: 90 }, duration: 1100, maxZoom: 11 });
        else map.flyTo({ center: coordinates(mapped[0]), zoom: 10, duration: 900 });
      });
    }).catch(() => {
      if (!cancelled) setMapError('The interactive map could not load. Check the connection and refresh.');
    });

    return () => {
      cancelled = true;
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      if (map) map.remove();
      mapRef.current = null;
    };
  }, [mapped, onSelect, activeId]);

  useEffect(() => {
    if (!active || !mapRef.current) return;
    markersRef.current.forEach((marker) => {
      const element = marker.getElement();
      const markerPoint = mapped.find((point) => coordinates(point).join(',') === marker.getLngLat().toArray().join(','));
      element.classList.toggle('is-active', markerPoint?.journey_entry_id === active.journey_entry_id);
    });
    mapRef.current.flyTo({ center: coordinates(active), zoom: Math.max(mapRef.current.getZoom(), 9.5), pitch: 42, duration: 950, essential: true });
  }, [active, mapped]);

  if (!mapped.length) return <Card className="premium-map-empty"><Route/><h3>The first mapped chapter is coming.</h3><p>Publish a journey location with coordinates to activate the route.</p></Card>;

  const current = mapped.find((point) => point.is_current_location) || mapped[mapped.length - 1];

  return <div className="premium-map-shell">
    <div className="premium-map-kpis">
      <Callout><Route/><span><strong>{mapped.length}</strong> mapped chapters</span></Callout>
      <Callout><Compass/><span><strong>{activeIndex + 1}/{mapped.length}</strong> route position</span></Callout>
      <Callout><Flag/><span><strong>{current.location_name || current.city_name || 'Open road'}</strong> current stop</span></Callout>
    </div>
    <div className="premium-map-layout">
      <Card className="premium-map-card">
        <div className="premium-map-card__topbar">
          <div><Badge>Live journey map</Badge><span>Real map underlay · interactive route</span></div>
          <div className="premium-map-top-actions">
            <Button variant="ghost" size="sm" onClick={() => mapRef.current?.flyTo({ center: coordinates(current), zoom: 10.5, duration: 900 })}><LocateFixed size={16}/> Current</Button>
            <Button variant="ghost" size="sm" onClick={() => containerRef.current?.requestFullscreen()}><Fullscreen size={16}/> Fullscreen</Button>
          </div>
        </div>
        <div className="premium-map-stage">
          <div ref={containerRef} className="premium-map-canvas" />
          {mapError ? <div className="premium-map-load-error">{mapError}</div> : null}
          <div className="premium-map-floating-card premium-map-floating-card--top"><Crosshair size={15}/><span>Costa Blanca expedition view</span></div>
          <div className="premium-map-legend"><span><i className="is-past"/> Past chapter</span><span><i className="is-current"/> Current location</span><span><i className="is-route"/> Journey route</span></div>
        </div>
      </Card>
      <Card className="premium-map-detail-card">
        <div className="premium-map-detail-card__meta"><Badge>{personLabel(active.journey_person)}</Badge>{active.is_current_location ? <Badge className="premium-map-live"><span/> Live location</Badge> : null}</div>
        <div className="premium-map-detail-card__icon">{active.is_current_location ? <Navigation/> : active.is_milestone ? <Sparkles/> : <MapPin/>}</div>
        <time>{formatDate(active.occurred_at)}</time>
        <h3>{active.title}</h3>
        <p className="premium-map-detail-card__location"><MapPin size={16}/>{active.location_name || active.city_name}{active.country_name ? `, ${active.country_name}` : ''}</p>
        <p>{active.excerpt}</p>
        <div className="premium-map-progress"><div><span>Journey progress</span><strong>{Math.round(routeProgress)}%</strong></div><div className="premium-map-progress__track"><span style={{ width: `${routeProgress}%` }}/></div></div>
        <div className="premium-map-coordinates"><Crosshair size={15}/><span>{Number(active.latitude).toFixed(4)}, {Number(active.longitude).toFixed(4)}</span></div>
        {active.slug ? <ButtonLink href={`/journal/${active.slug}`}>Read this chapter <ChevronRight size={16}/></ButtonLink> : null}
        <div className="premium-map-detail-card__nav"><Button variant="ghost" size="sm" onClick={() => onSelect(previous.journey_entry_id)}><ChevronLeft size={16}/> Previous</Button><Button variant="ghost" size="sm" onClick={() => onSelect(next.journey_entry_id)}>Next <ChevronRight size={16}/></Button></div>
      </Card>
    </div>
  </div>;
}
