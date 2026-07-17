import type { I18nManifest } from '../lib/i18nManifest';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Compass, Crosshair, Flag, Fullscreen, LocateFixed, MapPin, Navigation, Route, Sparkles } from 'lucide-react';
import type { JournalDisplayPerson } from '../lib/journalPeople';
import { getMapNavigation, newestMapPoint } from '../lib/journalMapNavigation';
import { supabase } from '../lib/supabase';
import { useWebsiteI18n } from '../lib/websiteI18n';
import { Badge, Card, Callout } from './ui/card';
import { Button, ButtonLink } from './ui/button';
import { loadMapLibre, POI_MAP_STYLE } from '../lib/mapLibreLoader';
import { mountJourneyMapPin } from './JourneyMapPin';
import { JourneyFootageCarousel, type JourneyFootageItem } from './journal/JourneyFootageCarousel';
import './PremiumJourneyMap.css';

export const PREMIUM_JOURNEY_MAP_I18N_MANIFEST = {
  componentKey: 'components.premium.journey.map',
  namespace: 'journal.map.action',
  translationKeys: [
    'journal.map.action.current',
    'journal.map.action.fullscreen',
    'journal.map.badge.live_map',
    'journal.map.detail.journey_progress',
    'journal.map.detail.live_location',
    'journal.map.detail.read_chapter',
    'journal.map.empty.body',
    'journal.map.empty.title',
    'journal.map.error.load_failed',
    'journal.map.error.routing_fallback',
    'journal.map.floating.journey_view',
    'journal.map.kpi.current_stop',
    'journal.map.kpi.mapped_chapters',
    'journal.map.kpi.open_road',
    'journal.map.kpi.road_distance',
    'journal.map.kpi.route_position',
    'journal.map.legend.kevin_route',
    'journal.map.legend.micha_route',
    'journal.map.legend.shared_stop',
    'journal.map.nav.next',
    'journal.map.nav.previous',
    'journal.map.topbar.subtitle',
  ] as const,
  keyPatterns: [
    'journal.map.action.*',
    'journal.map.badge.*',
    'journal.map.detail.*',
    'journal.map.empty.*',
    'journal.map.error.*',
    'journal.map.floating.*',
    'journal.map.kpi.*',
    'journal.map.legend.*',
    'journal.map.nav.*',
    'journal.map.topbar.*',
  ] as const,
} as const satisfies I18nManifest;

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

type MountedMapPin = ReturnType<typeof mountJourneyMapPin>;
type MarkerRecord = {
  marker: any;
  pin: MountedMapPin;
  pointId: string;
  disposeHover?: () => void;
};

function wireMarkerHover(markers: MarkerRecord[], record: MarkerRecord) {
  let closeTimer: number | undefined;
  const { marker, pin } = record;
  const popupEl = pin.popupElement;

  const openPopup = () => {
    window.clearTimeout(closeTimer);
    markers.forEach(({ marker: other }) => {
      if (other === marker) return;
      const otherPopup = other.getPopup?.();
      if (otherPopup?.isOpen?.()) other.togglePopup();
    });
    if (!marker.getPopup()?.isOpen?.()) marker.togglePopup();
  };

  const scheduleClose = () => {
    window.clearTimeout(closeTimer);
    closeTimer = window.setTimeout(() => {
      if (marker.getPopup()?.isOpen?.()) marker.togglePopup();
    }, 140);
  };

  const cancelClose = () => window.clearTimeout(closeTimer);

  pin.element.addEventListener('mouseenter', openPopup);
  pin.element.addEventListener('mouseleave', scheduleClose);
  pin.element.addEventListener('focusin', openPopup);
  pin.element.addEventListener('focusout', scheduleClose);
  popupEl.addEventListener('mouseenter', cancelClose);
  popupEl.addEventListener('mouseleave', scheduleClose);

  return () => {
    cancelClose();
    pin.element.removeEventListener('mouseenter', openPopup);
    pin.element.removeEventListener('mouseleave', scheduleClose);
    pin.element.removeEventListener('focusin', openPopup);
    pin.element.removeEventListener('focusout', scheduleClose);
    popupEl.removeEventListener('mouseenter', cancelClose);
    popupEl.removeEventListener('mouseleave', scheduleClose);
  };
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

function mapBounds(points: PremiumJourneyPoint[]): [[number, number], [number, number]] {
  const coords = points.map(coordinates);
  const lngs = coords.map(([lng]) => lng);
  const lats = coords.map(([, lat]) => lat);
  return [
    [Math.min(...lngs), Math.min(...lats)],
    [Math.max(...lngs), Math.max(...lats)],
  ];
}

export function PremiumJourneyMap({ points, activeId, onSelect }: { points: PremiumJourneyPoint[]; activeId?: string; onSelect: (id: string) => void }) {
  const { t, formatDate, language } = useWebsiteI18n();
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
  const activeRef = useRef(active);
  activeRef.current = active;
  const routeStops = useMemo(() => ({
    kevin: dedupeCoordinates(mapped.filter((point) => pointBelongsTo(point, 'kevin')).map(coordinates)),
    micha: dedupeCoordinates(mapped.filter((point) => pointBelongsTo(point, 'micha')).map(coordinates)),
  }), [mapped]);
  const current = newestPoint(mapped.filter((point) => point.is_current_location)) || newestPoint(mapped) || mapped[0];
  const routeProgress = mapped.length > 1 ? ((activeIndex + 1) / mapped.length) * 100 : 100;
  const routedDistance = routes.kevin.distanceKm + routes.micha.distanceKm;
  const routingFallback = routes.kevin.status === 'fallback' || routes.micha.status === 'fallback';
  const mapPinI18n = useMemo(() => ({ t, formatDate }), [t, formatDate]);
  const mapMarkerKey = useMemo(
    () => `${language}:${mapped.map((point) => point.journey_entry_id).join(',')}`,
    [language, mapped],
  );

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
    if (!containerRef.current || !mapped.length) return;
    const initialActive = activeRef.current || mapped[mapped.length - 1];
    if (!initialActive) return;
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
      map = new maplibregl.Map({ container: containerRef.current, style: POI_MAP_STYLE, center: coordinates(initialActive), zoom: 10.5, pitch: 32, bearing: -4, attributionControl: false, cooperativeGestures: true });
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

        const activeIdAtMount = activeRef.current?.journey_entry_id || initialActive.journey_entry_id;
        const markerRecords: MarkerRecord[] = [];
        mapped.forEach((point) => {
          const pin = mountJourneyMapPin(point, point.journey_entry_id === activeIdAtMount, onSelect, mapPinI18n);
          const popup = new maplibregl.Popup({ offset: 34, closeButton: false, closeOnClick: false }).setDOMContent(pin.popupElement);
          const marker = new maplibregl.Marker({ element: pin.element, anchor: 'center' })
            .setLngLat(coordinates(point))
            .setPopup(popup)
            .addTo(map);
          markerRecords.push({ marker, pin, pointId: point.journey_entry_id });
        });
        markerRecords.forEach((record) => {
          record.disposeHover = wireMarkerHover(markerRecords, record);
        });
        markersRef.current = markerRecords;
        resizeMap();
        window.setTimeout(resizeMap, 120);
        window.setTimeout(resizeMap, 450);
        if (mapped.length > 1) {
          map.fitBounds(mapBounds(mapped), { padding: 60, maxZoom: 11, duration: 700, pitch: 32, bearing: -4 });
        } else {
          map.flyTo({ center: coordinates(initialActive), zoom: 10.5, pitch: 32, duration: 700, essential: true });
        }
      });
    }).catch(() => { if (!cancelled) setMapError(t('journal.map.error.load_failed', 'The interactive map could not load. Check the connection and refresh.')); });

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      window.removeEventListener('resize', resizeMap);
      window.removeEventListener('orientationchange', resizeMap);
      document.removeEventListener('fullscreenchange', resizeMap);
      window.cancelAnimationFrame(resizeTimer || 0);
      markersRef.current.forEach(({ marker, pin, disposeHover }) => {
        disposeHover?.();
        marker.remove();
        pin.unmount();
      });
      markersRef.current = [];
      if (map) map.remove();
      mapRef.current = null;
    };
  // Remount only when the mapped point set or language changes — not on Previous/Next active changes.
  }, [mapMarkerKey, mapPinI18n, onSelect, t]);

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
      if (point) pin.update(point, pointId === active.journey_entry_id, mapPinI18n);
    });
    mapRef.current.resize?.();
    mapRef.current.flyTo({ center: coordinates(active), zoom: Math.max(mapRef.current.getZoom(), 9.5), pitch: 32, duration: 950, essential: true });
  }, [active, mapPinI18n, mapped]);

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
