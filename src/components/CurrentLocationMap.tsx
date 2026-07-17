import type { I18nManifest } from '../lib/i18nManifest';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { PublicJourneyCalendarEntry } from '../lib/journeyCalendar';
import { loadMapLibre, POI_MAP_STYLE, type MapLibreMap } from '../lib/mapLibreLoader';
import { useWebsiteI18n } from '../lib/websiteI18n';
import { mountJourneyMapPin } from './JourneyMapPin';
import type { PremiumJourneyPoint } from './PremiumJourneyMap';
import './CurrentLocationMap.css';

export const CURRENT_LOCATION_MAP_I18N_MANIFEST = {
  componentKey: 'components.journey.calendar.current_map',
  namespace: 'journey_calendar',
  translationKeys: [
    'journey_calendar.current_map.loading',
    'journey_calendar.current_map.error',
    'journey_calendar.current_map.empty',
    'journey_calendar.current_map.region_label',
  ] as const,
  keyPatterns: ['journey_calendar.current_map.*'] as const,
  entityContent: {
    tables: ['journey_calendar_entries'],
  },
} as const satisfies I18nManifest;

type Coordinate = [number, number];
type MountedMapPin = ReturnType<typeof mountJourneyMapPin>;
type MarkerLike = {
  remove: () => void;
  getPopup?: () => { isOpen?: () => boolean; togglePopup?: () => void } | undefined;
  togglePopup?: () => void;
};
type MarkerRecord = {
  marker: MarkerLike;
  pin: MountedMapPin;
  pointId: string;
  disposeHover?: () => void;
};

function isValidCoord(latitude: unknown, longitude: unknown) {
  if (latitude == null || longitude == null) return false;
  const lat = Number(latitude);
  const lng = Number(longitude);
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

function coordinates(point: PremiumJourneyPoint): Coordinate {
  return [Number(point.longitude), Number(point.latitude)];
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

function founderMatchesJourneyPerson(
  slug: string,
  journeyPerson: PublicJourneyCalendarEntry['journey_person'],
) {
  const normalized = slug.toLowerCase();
  if (journeyPerson === 'kevin') return normalized.includes('kevin');
  if (journeyPerson === 'micha') return normalized === 'micha' || normalized.includes('micha');
  return true;
}

function pinPeopleForEntry(entry: PublicJourneyCalendarEntry) {
  const founders = entry.founders || [];
  let selected = entry.journey_person === 'together'
    ? founders
    : founders.filter((founder) => founderMatchesJourneyPerson(founder.slug, entry.journey_person));

  if (!selected.length) {
    const withAvatar = founders.find((founder) => founder.avatar_url);
    selected = withAvatar ? [withAvatar] : founders.slice(0, 1);
  }

  return selected.map((founder, index) => ({
    id: founder.id,
    slug: founder.slug,
    display_name: founder.display_name || founder.slug,
    avatar_url: founder.avatar_url || undefined,
    display_order: index,
  }));
}

/** Adapt a calendar stop into the journal pin shape so we can reuse JourneyMapPin. */
function calendarEntryToMapPoint(entry: PublicJourneyCalendarEntry): PremiumJourneyPoint {
  return {
    journey_entry_id: entry.id,
    slug: entry.related_journal_post_slug || '',
    title: entry.title,
    excerpt: entry.public_summary || undefined,
    occurred_at: `${entry.starts_on}T12:00:00`,
    country_name: entry.country_name || undefined,
    city_name: entry.city_name || undefined,
    location_name: entry.location_name || undefined,
    latitude: entry.latitude ?? undefined,
    longitude: entry.longitude ?? undefined,
    journey_person: entry.journey_person,
    is_milestone: false,
    is_current_location: true,
    involved_people: pinPeopleForEntry(entry),
  };
}

function wireMarkerHover(markers: MarkerRecord[], record: MarkerRecord) {
  let closeTimer: number | undefined;
  const { marker, pin } = record;
  const popupEl = pin.popupElement;

  const openPopup = () => {
    window.clearTimeout(closeTimer);
    markers.forEach(({ marker: other }) => {
      if (other === marker) return;
      const otherPopup = other.getPopup?.();
      if (otherPopup?.isOpen?.()) other.togglePopup?.();
    });
    if (!marker.getPopup?.()?.isOpen?.()) marker.togglePopup?.();
  };

  const scheduleClose = () => {
    window.clearTimeout(closeTimer);
    closeTimer = window.setTimeout(() => {
      if (marker.getPopup?.()?.isOpen?.()) marker.togglePopup?.();
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

export function CurrentLocationMap({ entries }: { entries: PublicJourneyCalendarEntry[] }) {
  const { t, formatDate, language } = useWebsiteI18n();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<MarkerRecord[]>([]);
  const activeIdRef = useRef<string | undefined>(undefined);

  const [mapError, setMapError] = useState('');
  const [activeId, setActiveId] = useState<string>();

  activeIdRef.current = activeId;

  const mapPinI18n = useMemo(() => ({ t, formatDate }), [t, formatDate]);
  const mapped = useMemo(
    () => entries
      .filter((entry) => isValidCoord(entry.latitude, entry.longitude))
      .map(calendarEntryToMapPoint),
    [entries],
  );
  const mapMarkerKey = useMemo(
    () => `${language}:${mapped.map((point) => `${point.journey_entry_id}:${point.latitude}:${point.longitude}`).join(',')}`,
    [language, mapped],
  );

  useEffect(() => {
    if (!mapped.length) {
      setActiveId(undefined);
      return;
    }
    if (!mapped.some((point) => point.journey_entry_id === activeId)) {
      setActiveId(mapped[0]?.journey_entry_id);
    }
  }, [activeId, mapped]);

  useEffect(() => {
    if (!containerRef.current || !mapped.length) return undefined;

    let cancelled = false;
    let map: MapLibreMap | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let resizeTimer: number | undefined;

    const resizeMap = () => {
      window.cancelAnimationFrame(resizeTimer || 0);
      resizeTimer = window.requestAnimationFrame(() => map?.resize?.());
    };

    const selectPoint = (journeyEntryId: string) => {
      setActiveId(journeyEntryId);
    };

    loadMapLibre()
      .then((maplibregl) => {
        if (cancelled || !containerRef.current) return;
        setMapError('');

        const initial = mapped.find((point) => point.journey_entry_id === activeIdRef.current) || mapped[0];
        if (!initial) return;

        map = new maplibregl.Map({
          container: containerRef.current,
          style: POI_MAP_STYLE,
          center: coordinates(initial),
          zoom: 9.5,
          attributionControl: false,
          cooperativeGestures: true,
        });
        mapRef.current = map;
        map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
        map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');

        resizeObserver = new ResizeObserver(resizeMap);
        resizeObserver.observe(containerRef.current);
        window.addEventListener('resize', resizeMap);

        map.on('load', () => {
          const markerRecords: MarkerRecord[] = [];
          mapped.forEach((point) => {
            const pin = mountJourneyMapPin(
              point,
              point.journey_entry_id === (activeIdRef.current || initial.journey_entry_id),
              selectPoint,
              mapPinI18n,
            );
            const popup = new maplibregl.Popup({ offset: 34, closeButton: false, closeOnClick: false })
              .setDOMContent(pin.popupElement);
            const marker = new maplibregl.Marker({ element: pin.element, anchor: 'center' })
              .setLngLat(coordinates(point))
              .setPopup(popup)
              .addTo(map as MapLibreMap) as MarkerLike;
            markerRecords.push({ marker, pin, pointId: point.journey_entry_id });
          });
          markerRecords.forEach((record) => {
            record.disposeHover = wireMarkerHover(markerRecords, record);
          });
          markersRef.current = markerRecords;
          resizeMap();
          window.setTimeout(resizeMap, 120);

          if (mapped.length > 1) {
            map?.fitBounds(mapBounds(mapped), { padding: 56, maxZoom: 10.5, duration: 0 });
          } else {
            map?.flyTo({ center: coordinates(initial), zoom: 10, duration: 0, essential: true });
          }
        });
      })
      .catch(() => {
        if (!cancelled) {
          setMapError(t('journey_calendar.current_map.error', 'Current locations could not be loaded.'));
        }
      });

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      window.removeEventListener('resize', resizeMap);
      window.cancelAnimationFrame(resizeTimer || 0);
      markersRef.current.forEach(({ marker, pin, disposeHover }) => {
        disposeHover?.();
        marker.remove();
        pin.unmount();
      });
      markersRef.current = [];
      map?.remove();
      mapRef.current = null;
    };
  // Remount when stop ids/coords or language change — not on pin selection.
  // eslint-disable-next-line react-hooks/exhaustive-deps -- mapMarkerKey encodes mapped ids + coords
  }, [mapMarkerKey, mapPinI18n, t]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !activeId) return;
    const active = mapped.find((point) => point.journey_entry_id === activeId);
    if (!active) return;

    markersRef.current.forEach(({ pin, pointId }) => {
      const point = mapped.find((entry) => entry.journey_entry_id === pointId);
      if (point) pin.update(point, pointId === activeId, mapPinI18n);
    });
    map.resize?.();
    map.flyTo({
      center: coordinates(active),
      zoom: Math.max(map.getZoom(), 9.5),
      duration: 700,
      essential: true,
    });
  }, [activeId, mapPinI18n, mapped]);

  if (!entries.length || !mapped.length) {
    return (
      <div className="current-location-map current-location-map--state" role="status">
        {t('journey_calendar.current_map.empty', 'No live current locations are available yet.')}
      </div>
    );
  }

  return (
    <div
      className="current-location-map"
      role="region"
      aria-label={t('journey_calendar.current_map.region_label', 'Current locations map')}
    >
      <div ref={containerRef} className="current-location-map__canvas" />
      {mapError ? (
        <div className="current-location-map__overlay current-location-map--error" role="alert">
          {mapError}
        </div>
      ) : null}
    </div>
  );
}
