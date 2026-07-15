import { supabase } from './supabase';

type MapPerson = {
  id?: string;
  display_name?: string;
  avatar_url?: string | null;
  display_order?: number | null;
};

type MapFootage = {
  id?: string;
  url?: string | null;
  asset_type?: string | null;
  mime_type?: string | null;
  thumbnail_url?: string | null;
  display_order?: number | null;
};

type MapPointMedia = {
  journey_entry_id: string;
  title: string;
  involved_people?: MapPerson[] | null;
  footage?: MapFootage[] | null;
};

let pointsPromise: Promise<MapPointMedia[]> | null = null;
let observer: MutationObserver | null = null;

function readJson<T>(responseOrPromise: Response | Promise<Response>): Promise<T> {
  return Promise.resolve(responseOrPromise).then(async (response) => {
    if (!response.ok) throw new Error(await response.text());
    return response.json() as Promise<T>;
  });
}

function loadPoints() {
  if (!pointsPromise) {
    pointsPromise = readJson<MapPointMedia[]>(
      supabase.from('public_journal_map_points').request({
        query: 'select=journey_entry_id,title,involved_people,footage&order=occurred_at.asc,journey_entry_id.asc',
      }),
    ).catch((error) => {
      pointsPromise = null;
      if (import.meta.env.DEV) console.error('[Journal map pins] Could not load marker media.', error);
      return [];
    });
  }
  return pointsPromise;
}

function sortedPeople(point: MapPointMedia) {
  return [...(point.involved_people || [])].sort(
    (a, b) => Number(a.display_order || 0) - Number(b.display_order || 0),
  );
}

function sortedFootage(point: MapPointMedia) {
  return [...(point.footage || [])]
    .filter((item) => Boolean(item?.url || item?.thumbnail_url))
    .sort((a, b) => Number(a.display_order || 0) - Number(b.display_order || 0));
}

function footageImage(item?: MapFootage) {
  if (!item) return '';
  const isVideo = item.asset_type === 'video' || item.mime_type?.startsWith('video/');
  return isVideo ? item.thumbnail_url || '' : item.thumbnail_url || item.url || '';
}

function pointForMarker(marker: HTMLElement, points: MapPointMedia[]) {
  const label = marker.getAttribute('aria-label') || '';
  return points
    .filter((point) => label === `Open ${point.title}` || label.startsWith(`Open ${point.title} —`))
    .sort((a, b) => b.title.length - a.title.length)[0];
}

function createImage(src: string, alt: string, className: string) {
  const image = document.createElement('img');
  image.src = src;
  image.alt = alt;
  image.className = className;
  image.loading = 'eager';
  image.decoding = 'async';
  return image;
}

function enhanceMarker(marker: HTMLElement, point: MapPointMedia) {
  if (marker.dataset.mediaEnhanced === point.journey_entry_id) return;

  const people = sortedPeople(point);
  const footage = sortedFootage(point);
  const primaryPerson = people[0];
  const primaryFootage = footageImage(footage[0]);

  if (!primaryFootage) {
    marker.dataset.mediaEnhanced = point.journey_entry_id;
    return;
  }

  const original = marker.innerHTML;
  marker.innerHTML = '';
  marker.classList.add('premium-map-dom-marker--footage');

  const footageHolder = document.createElement('span');
  footageHolder.className = 'premium-map-dom-marker__footage';
  const footageImageElement = createImage(primaryFootage, `${point.title} footage`, 'premium-map-dom-marker__footage-image');
  footageHolder.appendChild(footageImageElement);
  marker.appendChild(footageHolder);

  if (primaryPerson?.avatar_url) {
    const subjectBadge = document.createElement('span');
    subjectBadge.className = 'premium-map-dom-marker__subject-badge';
    subjectBadge.title = primaryPerson.display_name || 'Person featured in this story';
    subjectBadge.appendChild(createImage(primaryPerson.avatar_url, primaryPerson.display_name || '', 'premium-map-dom-marker__subject-image'));
    marker.appendChild(subjectBadge);
  }

  if (footage.length > 1) {
    const mediaCount = document.createElement('span');
    mediaCount.className = 'premium-map-dom-marker__media-count';
    mediaCount.textContent = String(footage.length);
    mediaCount.setAttribute('aria-label', `${footage.length} footage items`);
    marker.appendChild(mediaCount);
  }

  footageImageElement.addEventListener('error', () => {
    marker.classList.remove('premium-map-dom-marker--footage');
    marker.innerHTML = original;
  }, { once: true });

  marker.dataset.mediaEnhanced = point.journey_entry_id;
}

async function enhanceVisibleMarkers() {
  const markers = Array.from(document.querySelectorAll<HTMLElement>('.premium-map-dom-marker'));
  if (!markers.length) return;
  const points = await loadPoints();
  markers.forEach((marker) => {
    const point = pointForMarker(marker, points);
    if (point) enhanceMarker(marker, point);
  });
}

export function initializeJournalMapMarkerMediaUi() {
  if (observer) return;
  void enhanceVisibleMarkers();
  observer = new MutationObserver(() => { void enhanceVisibleMarkers(); });
  observer.observe(document.documentElement, { childList: true, subtree: true });
}
