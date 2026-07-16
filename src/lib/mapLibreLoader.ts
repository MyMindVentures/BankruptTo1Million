export type MapLibreGlobal = {
  Map: new (options: Record<string, unknown>) => MapLibreMap;
  Marker: new (options?: Record<string, unknown>) => MapLibreMarker;
  Popup: new (options?: Record<string, unknown>) => MapLibrePopup;
  NavigationControl: new (options?: Record<string, unknown>) => unknown;
  AttributionControl: new (options?: Record<string, unknown>) => unknown;
};

export type MapLibreMap = {
  addControl: (control: unknown, position?: string) => void;
  fitBounds: (bounds: [[number, number], [number, number]], options?: Record<string, unknown>) => void;
  project: (lngLat: [number, number]) => { x: number; y: number };
  remove: () => void;
  on: (event: string, handler: () => void) => void;
  off: (event: string, handler: () => void) => void;
};

export type MapLibreMarker = {
  setLngLat: (coords: [number, number]) => MapLibreMarker;
  addTo: (map: MapLibreMap) => MapLibreMarker;
  setPopup: (popup: MapLibrePopup) => MapLibreMarker;
  remove: () => void;
};

export type MapLibrePopup = {
  setHTML: (html: string) => MapLibrePopup;
};

type MapLibreWindow = Window & { maplibregl?: MapLibreGlobal };

const mapWindow = () => window as MapLibreWindow;

export const MAPLIBRE_JS = 'https://unpkg.com/maplibre-gl@5.6.1/dist/maplibre-gl.js';
export const MAPLIBRE_CSS = 'https://unpkg.com/maplibre-gl@5.6.1/dist/maplibre-gl.css';

export const POI_MAP_STYLE = {
  version: 8,
  sources: {
    carto: {
      type: 'raster',
      tiles: [
        'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
        'https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
        'https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
        'https://d.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
      ],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors © CARTO',
    },
  },
  layers: [{ id: 'carto-voyager', type: 'raster', source: 'carto', minzoom: 0, maxzoom: 20 }],
};

let mapLibrePromise: Promise<MapLibreGlobal> | null = null;

export function loadMapLibre(): Promise<MapLibreGlobal> {
  const existing = mapWindow().maplibregl;
  if (existing) return Promise.resolve(existing);
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
      existing.addEventListener('load', () => {
        const maplibregl = mapWindow().maplibregl;
        maplibregl ? resolve(maplibregl) : reject(new Error('MapLibre failed to initialize.'));
      }, { once: true });
      existing.addEventListener('error', () => reject(new Error('MapLibre failed to load.')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = MAPLIBRE_JS;
    script.async = true;
    script.onload = () => {
      const maplibregl = mapWindow().maplibregl;
      maplibregl ? resolve(maplibregl) : reject(new Error('MapLibre failed to initialize.'));
    };
    script.onerror = () => reject(new Error('MapLibre failed to load.'));
    document.head.appendChild(script);
  });

  return mapLibrePromise;
}
