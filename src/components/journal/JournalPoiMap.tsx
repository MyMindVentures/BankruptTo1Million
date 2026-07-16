import { useEffect, useRef, useState } from 'react';
import {
  loadMapLibre,
  POI_MAP_STYLE,
  type MapLibreGlobal,
  type MapLibreMap,
  type MapLibreMarker,
} from '../../lib/mapLibreLoader';
import type { JournalPlaceContextPoi } from '../../lib/journalPlaceContext';
import { useWebsiteI18n } from '../../lib/websiteI18n';

type VenuePoint = {
  latitude: number;
  longitude: number;
  title: string;
};

function isValidCoord(latitude: unknown, longitude: unknown) {
  const lat = Number(latitude);
  const lng = Number(longitude);
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function JournalPoiMap({
  venue,
  pois,
}: {
  venue: VenuePoint;
  pois: JournalPlaceContextPoi[];
}) {
  const { t } = useWebsiteI18n();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<MapLibreMarker[]>([]);
  const [mapError, setMapError] = useState('');

  const mappedPois = pois.filter((poi) => isValidCoord(poi.latitude, poi.longitude));

  useEffect(() => {
    if (!containerRef.current || mappedPois.length === 0) return;
    if (!isValidCoord(venue.latitude, venue.longitude)) return;

    let cancelled = false;

    loadMapLibre()
      .then((maplibregl: MapLibreGlobal) => {
        if (cancelled || !containerRef.current) return;

        markersRef.current.forEach((marker) => marker.remove());
        markersRef.current = [];
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

        const venueLabel = escapeHtml(venue.title);
        const venueAria = escapeHtml(t('journal.place_context.map.venue_pin', 'Featured place: {title}', { title: venue.title }));
        const venueEl = document.createElement('button');
        venueEl.type = 'button';
        venueEl.className = 'journal-poi-map__marker journal-poi-map__marker--venue';
        venueEl.setAttribute('aria-label', venueAria);
        venueEl.innerHTML = '<span aria-hidden="true">★</span>';

        const venueMarker = new maplibregl.Marker({ element: venueEl, anchor: 'center' })
          .setLngLat([venue.longitude, venue.latitude])
          .setPopup(new maplibregl.Popup({ offset: 16 }).setHTML(`<strong>${venueLabel}</strong>`))
          .addTo(map);
        markersRef.current.push(venueMarker);

        mappedPois.forEach((poi) => {
          const lat = Number(poi.latitude);
          const lng = Number(poi.longitude);
          bounds[0][0] = Math.min(bounds[0][0], lng);
          bounds[0][1] = Math.min(bounds[0][1], lat);
          bounds[1][0] = Math.max(bounds[1][0], lng);
          bounds[1][1] = Math.max(bounds[1][1], lat);

          const title = escapeHtml(poi.title);
          const order = poi.display_order;
          const aria = escapeHtml(
            t('journal.place_context.map.poi_pin', 'Point of interest {order}: {title}', { order, title: poi.title }),
          );
          const el = document.createElement('button');
          el.type = 'button';
          el.className = 'journal-poi-map__marker journal-poi-map__marker--poi';
          el.setAttribute('aria-label', aria);
          el.innerHTML = `<span aria-hidden="true">${order}</span>`;

          const mapsLink = poi.google_maps_url
            ? `<p class="journal-poi-map__popup-link"><a href="${escapeHtml(poi.google_maps_url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(t('journal.place_context.map.open_in_maps', 'Open in Google Maps'))}</a></p>`
            : '';

          const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
            .setLngLat([lng, lat])
            .setPopup(new maplibregl.Popup({ offset: 16 }).setHTML(`<strong>${title}</strong>${mapsLink}`))
            .addTo(map);
          markersRef.current.push(marker);
        });

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
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [mappedPois, t, venue.latitude, venue.longitude, venue.title]);

  if (mappedPois.length === 0) return null;

  return (
    <div className="journal-poi-map">
      <h4>{t('journal.place_context.map.heading', 'Map of nearby points')}</h4>
      {mapError ? (
        <p className="journal-poi-map__error" role="alert">
          {t('journal.place_context.map.error', 'Map is temporarily unavailable.')}
        </p>
      ) : null}
      <div
        ref={containerRef}
        className="journal-poi-map__canvas"
        role="region"
        aria-label={t('journal.place_context.map.heading', 'Map of nearby points')}
      />
    </div>
  );
}
