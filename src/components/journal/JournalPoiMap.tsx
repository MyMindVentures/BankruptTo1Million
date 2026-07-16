import type { I18nManifest } from '../../lib/i18nManifest';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  loadMapLibre,
  POI_MAP_STYLE,
  type MapLibreGlobal,
  type MapLibreMap,
  type MapLibreMarker,
} from '../../lib/mapLibreLoader';
import type { JournalPlaceContextPoi } from '../../lib/journalPlaceContext';
import { useWebsiteI18n } from '../../lib/websiteI18n';
import { JournalPoiMapDetailCard } from './JournalPoiMapDetailCard';
import './JournalPoiMap.css';

type VenuePoint = {
  latitude: number;
  longitude: number;
  title: string;
};

type CardPosition = { x: number; y: number };

function isValidCoord(latitude: unknown, longitude: unknown) {
  if (latitude == null || longitude == null) return false;
  const lat = Number(latitude);
  const lng = Number(longitude);
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

function projectPoi(map: MapLibreMap, poi: JournalPlaceContextPoi): CardPosition {
  const point = map.project([Number(poi.longitude), Number(poi.latitude)]);
  return { x: point.x, y: point.y };
}

export const JOURNAL_POI_MAP_I18N_MANIFEST = {
  componentKey: 'journal.poi.map',
  namespace: 'journal.place_context.map',
  translationKeys: [
    'journal.place_context.map.card.close_label',
    'journal.place_context.map.card.order',
    'journal.place_context.map.error',
    'journal.place_context.map.heading',
    'journal.place_context.map.open_in_maps',
    'journal.place_context.map.poi_pin',
    'journal.place_context.map.venue_pin',
    'journal.place_context.poi_type.culture',
    'journal.place_context.poi_type.food',
    'journal.place_context.poi_type.landmark',
    'journal.place_context.poi_type.museum',
    'journal.place_context.poi_type.nature',
    'journal.place_context.poi_type.other',
  ] as const,
  keyPatterns: [
    'journal.place_context.map.*',
    'journal.place_context.poi_type.*',
  ] as const,
} as const satisfies I18nManifest;

export function JournalPoiMap({
  venue,
  pois,
}: {
  venue: VenuePoint;
  pois: JournalPlaceContextPoi[];
}) {
  const { t } = useWebsiteI18n();
  const stageRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<MapLibreMarker[]>([]);
  const markerElsRef = useRef<Map<number, HTMLButtonElement>>(new Map());
  const activePoiRef = useRef<JournalPlaceContextPoi | null>(null);
  const isPinnedRef = useRef(false);
  const cardHoverRef = useRef(false);
  const repositionRef = useRef<(() => void) | null>(null);

  const [mapError, setMapError] = useState('');
  const [activePoi, setActivePoi] = useState<JournalPlaceContextPoi | null>(null);
  const [cardPosition, setCardPosition] = useState<CardPosition | null>(null);
  const [isPinned, setIsPinned] = useState(false);

  const mappedPois = pois.filter((poi) => isValidCoord(poi.latitude, poi.longitude));
  const poiMapKey = mappedPois.map((poi) => `${poi.display_order}:${poi.latitude}:${poi.longitude}:${poi.title}:${poi.description}`).join('|');

  const setActiveMarker = useCallback((order: number | null) => {
    markerElsRef.current.forEach((el, markerOrder) => {
      el.classList.toggle('is-active', markerOrder === order);
    });
  }, []);

  const dismissCard = useCallback(() => {
    activePoiRef.current = null;
    isPinnedRef.current = false;
    cardHoverRef.current = false;
    setActivePoi(null);
    setCardPosition(null);
    setIsPinned(false);
    setActiveMarker(null);
  }, [setActiveMarker]);

  const activatePoi = useCallback((poi: JournalPlaceContextPoi, pin = false) => {
    const map = mapRef.current;
    if (!map) return;
    activePoiRef.current = poi;
    isPinnedRef.current = pin;
    setActivePoi(poi);
    setCardPosition(projectPoi(map, poi));
    setIsPinned(pin);
    setActiveMarker(poi.display_order);
  }, [setActiveMarker]);

  const deactivatePoi = useCallback(() => {
    if (isPinnedRef.current || cardHoverRef.current) return;
    activePoiRef.current = null;
    setActivePoi(null);
    setCardPosition(null);
    setActiveMarker(null);
  }, [setActiveMarker]);

  const handleCardEnter = useCallback(() => {
    cardHoverRef.current = true;
  }, []);

  const handleCardLeave = useCallback(() => {
    cardHoverRef.current = false;
    if (!isPinnedRef.current) {
      deactivatePoi();
    }
  }, [deactivatePoi]);

  useEffect(() => {
    if (!isPinned) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') dismissCard();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [dismissCard, isPinned]);

  useEffect(() => {
    if (!isPinned) return undefined;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (stageRef.current && target && !stageRef.current.contains(target)) {
        dismissCard();
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [dismissCard, isPinned]);

  useEffect(() => {
    if (!containerRef.current || mappedPois.length === 0) return undefined;
    if (!isValidCoord(venue.latitude, venue.longitude)) return undefined;

    let cancelled = false;

    loadMapLibre()
      .then((maplibregl: MapLibreGlobal) => {
        if (cancelled || !containerRef.current) return;

        dismissCard();
        markersRef.current.forEach((marker) => marker.remove());
        markersRef.current = [];
        markerElsRef.current.clear();
        mapRef.current?.remove();

        const map = new maplibregl.Map({
          container: containerRef.current,
          style: POI_MAP_STYLE,
          center: [venue.longitude, venue.latitude],
          zoom: 12,
          attributionControl: false,
        });
        mapRef.current = map;

        map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
        map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');

        const bounds: [[number, number], [number, number]] = [
          [venue.longitude, venue.latitude],
          [venue.longitude, venue.latitude],
        ];

        const venueAria = t('journal.place_context.map.venue_pin', 'Featured place: {title}', { title: venue.title });
        const venueEl = document.createElement('button');
        venueEl.type = 'button';
        venueEl.className = 'journal-poi-map__marker journal-poi-map__marker--venue';
        venueEl.setAttribute('aria-label', venueAria);
        venueEl.innerHTML = '<span aria-hidden="true">★</span>';

        const venueMarker = new maplibregl.Marker({ element: venueEl, anchor: 'center' })
          .setLngLat([venue.longitude, venue.latitude])
          .addTo(map);
        markersRef.current.push(venueMarker);

        mappedPois.forEach((poi) => {
          const lat = Number(poi.latitude);
          const lng = Number(poi.longitude);
          bounds[0][0] = Math.min(bounds[0][0], lng);
          bounds[0][1] = Math.min(bounds[0][1], lat);
          bounds[1][0] = Math.max(bounds[1][0], lng);
          bounds[1][1] = Math.max(bounds[1][1], lat);

          const order = poi.display_order;
          const aria = t('journal.place_context.map.poi_pin', 'Point of interest {order}: {title}', {
            order,
            title: poi.title,
          });
          const el = document.createElement('button');
          el.type = 'button';
          el.className = 'journal-poi-map__marker journal-poi-map__marker--poi';
          el.setAttribute('aria-label', aria);
          el.innerHTML = `<span aria-hidden="true">${order}</span>`;

          el.addEventListener('mouseenter', () => activatePoi(poi, false));
          el.addEventListener('mouseleave', () => deactivatePoi());
          el.addEventListener('focus', () => activatePoi(poi, false));
          el.addEventListener('blur', () => {
            window.setTimeout(() => {
              if (!isPinnedRef.current && !cardHoverRef.current) deactivatePoi();
            }, 0);
          });
          el.addEventListener('click', (event) => {
            event.stopPropagation();
            activatePoi(poi, true);
          });

          markerElsRef.current.set(order, el);

          const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
            .setLngLat([lng, lat])
            .addTo(map);
          markersRef.current.push(marker);
        });

        const reposition = () => {
          const current = activePoiRef.current;
          if (!current) return;
          setCardPosition(projectPoi(map, current));
        };
        repositionRef.current = reposition;
        map.on('move', reposition);
        map.on('zoom', reposition);

        map.on('load', () => {
          map.fitBounds(bounds, { padding: 48, maxZoom: 14, duration: 0 });
        });

        setMapError('');
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setMapError(error instanceof Error ? error.message : String(error));
        }
      });

    return () => {
      cancelled = true;
      const map = mapRef.current;
      const reposition = repositionRef.current;
      if (map && reposition) {
        map.off('move', reposition);
        map.off('zoom', reposition);
      }
      repositionRef.current = null;
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      markerElsRef.current.clear();
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [activatePoi, deactivatePoi, dismissCard, mappedPois.length, poiMapKey, t, venue.latitude, venue.longitude, venue.title]);

  if (mappedPois.length === 0) return null;

  return (
    <div className="journal-poi-map">
      <h4>{t('journal.place_context.map.heading', 'Map of nearby points')}</h4>
      {mapError ? (
        <p className="journal-poi-map__error" role="alert">
          {t('journal.place_context.map.error', 'Map is temporarily unavailable.')}
        </p>
      ) : null}
      <div ref={stageRef} className="journal-poi-map__stage">
        <div
          ref={containerRef}
          className="journal-poi-map__canvas"
          role="region"
          aria-label={t('journal.place_context.map.heading', 'Map of nearby points')}
        />
        {activePoi && cardPosition ? (
          <JournalPoiMapDetailCard
            poi={activePoi}
            position={cardPosition}
            pinned={isPinned}
            onClose={dismissCard}
            onCardEnter={handleCardEnter}
            onCardLeave={handleCardLeave}
          />
        ) : null}
      </div>
    </div>
  );
}
