import { useEffect, useRef, useState } from 'react';
import { Crosshair, MapPin } from 'lucide-react';

type LeafletMapInstance = {
  remove: () => void;
  panTo: (latlng: [number, number]) => void;
  on: (event: string, handler: (event: { latlng: { lat: number; lng: number } }) => void) => void;
  setView: (latlng: [number, number], zoom: number) => LeafletMapInstance;
};

type LeafletMarkerInstance = {
  setLatLng: (latlng: [number, number] | { lat: number; lng: number }) => void;
  getLatLng: () => { lat: number; lng: number };
  on: (event: string, handler: () => void) => void;
  addTo: (map: LeafletMapInstance) => LeafletMarkerInstance;
};

type LeafletNamespace = {
  map: (el: HTMLElement, options?: { zoomControl?: boolean }) => LeafletMapInstance;
  tileLayer: (url: string, options?: { attribution?: string }) => { addTo: (map: LeafletMapInstance) => void };
  marker: (latlng: [number, number], options?: { draggable?: boolean }) => LeafletMarkerInstance;
};

function leaflet(): LeafletNamespace | undefined {
  return (window as Window & { L?: LeafletNamespace }).L;
}

export type PlacePickResult = {
  latitude: number | null;
  longitude: number | null;
  country_code?: string | null;
  country_name?: string | null;
  region_name?: string | null;
  city_name?: string | null;
  location_name?: string | null;
};

function LeafletMap({
  latitude,
  longitude,
  onPick,
}: {
  latitude: number | null;
  longitude: number | null;
  onPick: (lat: number, lng: number) => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMapInstance | null>(null);
  const markerRef = useRef<LeafletMarkerInstance | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!document.querySelector('link[data-leaflet]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        link.dataset.leaflet = 'true';
        document.head.appendChild(link);
      }
      if (!leaflet()) {
        await new Promise<void>((resolve, reject) => {
          const existing = document.querySelector('script[data-leaflet]') as HTMLScriptElement | null;
          if (existing) {
            existing.addEventListener('load', () => resolve(), { once: true });
            return;
          }
          const script = document.createElement('script');
          script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
          script.dataset.leaflet = 'true';
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Map failed to load'));
          document.body.appendChild(script);
        });
      }
      const L = leaflet();
      if (!active || !ref.current || !L || mapRef.current) return;
      const lat = latitude ?? 36.7213;
      const lng = longitude ?? -4.4214;
      const map = L.map(ref.current, { zoomControl: true });
      map.setView([lat, lng], latitude != null ? 12 : 5);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);
      const marker = L.marker([lat, lng], { draggable: true }).addTo(map);
      marker.on('dragend', () => {
        const point = marker.getLatLng();
        onPick(point.lat, point.lng);
      });
      map.on('click', (event) => {
        marker.setLatLng(event.latlng);
        onPick(event.latlng.lat, event.latlng.lng);
      });
      mapRef.current = map;
      markerRef.current = marker;
    }
    void load();
    return () => {
      active = false;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (markerRef.current && latitude != null && longitude != null && Number.isFinite(latitude) && Number.isFinite(longitude)) {
      markerRef.current.setLatLng([latitude, longitude]);
      mapRef.current?.panTo([latitude, longitude]);
    }
  }, [latitude, longitude]);

  return <div ref={ref} className="admin-picker-map__canvas" />;
}

export function AdminMapPlacePicker({
  latitude,
  longitude,
  onChange,
}: {
  latitude: number | null;
  longitude: number | null;
  onChange: (result: PlacePickResult) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [coordsOpen, setCoordsOpen] = useState(false);

  async function reverseLookup(lat: number, lng: number) {
    setBusy(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1`,
        { headers: { Accept: 'application/json' } },
      );
      const result = await response.json() as {
        name?: string;
        display_name?: string;
        address?: {
          country_code?: string;
          country?: string;
          state?: string;
          region?: string;
          city?: string;
          town?: string;
          village?: string;
          municipality?: string;
        };
      };
      const address = result.address || {};
      onChange({
        latitude: Number(lat.toFixed(6)),
        longitude: Number(lng.toFixed(6)),
        country_code: address.country_code ? address.country_code.toUpperCase() : null,
        country_name: address.country || null,
        region_name: address.state || address.region || null,
        city_name: address.city || address.town || address.village || address.municipality || null,
        location_name: result.name || address.city || address.town || address.village || null,
      });
    } catch {
      onChange({
        latitude: Number(lat.toFixed(6)),
        longitude: Number(lng.toFixed(6)),
      });
    } finally {
      setBusy(false);
    }
  }

  function useDeviceLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) => void reverseLookup(position.coords.latitude, position.coords.longitude),
      () => undefined,
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  return (
    <div className="admin-picker-map">
      <div className="admin-picker-map__actions">
        <button type="button" onClick={useDeviceLocation}>
          <Crosshair size={15} /> Use current location
        </button>
        <span>
          <MapPin size={14} />
          {latitude != null && longitude != null
            ? `${latitude.toFixed(5)}, ${longitude.toFixed(5)}${busy ? ' · looking up…' : ''}`
            : 'Click the map to set a place'}
        </span>
      </div>
      <LeafletMap
        latitude={latitude}
        longitude={longitude}
        onPick={(lat, lng) => void reverseLookup(lat, lng)}
      />
      <button type="button" className="admin-picker-map__coords-toggle" onClick={() => setCoordsOpen((value) => !value)}>
        {coordsOpen ? 'Hide coordinates' : 'Edit coordinates'}
      </button>
      {coordsOpen ? (
        <div className="admin-picker-map__coords">
          <label>
            <span>Latitude</span>
            <input
              type="number"
              step="any"
              value={latitude ?? ''}
              onChange={(event) => {
                const next = event.target.value === '' ? null : Number(event.target.value);
                if (next !== null && !Number.isFinite(next)) return;
                onChange({
                  latitude: next,
                  longitude: next === null ? null : longitude,
                });
              }}
            />
          </label>
          <label>
            <span>Longitude</span>
            <input
              type="number"
              step="any"
              value={longitude ?? ''}
              onChange={(event) => {
                const next = event.target.value === '' ? null : Number(event.target.value);
                if (next !== null && !Number.isFinite(next)) return;
                onChange({
                  latitude: next === null ? null : latitude,
                  longitude: next,
                });
              }}
            />
          </label>
        </div>
      ) : null}
    </div>
  );
}
