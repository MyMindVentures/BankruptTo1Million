import { supabase } from './supabase';

type WebsiteMediaSlot = {
  slot_key: string;
  storage_bucket: string;
  storage_path: string;
  alt_text: string | null;
  caption: string | null;
};

let slotsPromise: Promise<Map<string, WebsiteMediaSlot>> | null = null;

function storageUrl(slot: WebsiteMediaSlot) {
  const encodedPath = slot.storage_path
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/');
  return `${supabase.url}/storage/v1/object/public/${encodeURIComponent(slot.storage_bucket)}/${encodedPath}`;
}

async function loadSlots() {
  if (!slotsPromise) {
    slotsPromise = supabase
      .from('website_media_slots_public')
      .request({
        query: 'select=slot_key,storage_bucket,storage_path,alt_text,caption',
      })
      .then(async (response) => {
        if (!response.ok) throw new Error(await response.text());
        const rows = (await response.json()) as WebsiteMediaSlot[];
        return new Map(rows.map((row) => [row.slot_key, row]));
      });
  }
  return slotsPromise;
}

function renderLogo(slots: Map<string, WebsiteMediaSlot>) {
  const slot = slots.get('site_logo');
  if (!slot) return;

  document.querySelectorAll<HTMLElement>('.brand__mark').forEach((mark) => {
    if (mark.dataset.mediaRendered === 'true') return;

    const image = document.createElement('img');
    image.src = storageUrl(slot);
    image.alt = slot.alt_text || 'Bankrupt to 1 Million logo';
    image.className = 'brand__logo-image';
    image.decoding = 'async';
    image.fetchPriority = mark.closest('.site-header') ? 'high' : 'auto';

    mark.replaceChildren(image);
    mark.dataset.mediaRendered = 'true';
  });
}

function renderHomeHero(slots: Map<string, WebsiteMediaSlot>) {
  const slot = slots.get('home_hero');
  const heroCard = document.querySelector<HTMLElement>('main#top > .hero .hero-card');
  if (!slot || !heroCard || heroCard.dataset.heroMediaRendered === 'true') return;

  const figure = document.createElement('figure');
  figure.className = 'home-hero-media';

  const image = document.createElement('img');
  image.src = storageUrl(slot);
  image.alt = slot.alt_text || 'Kevin and Micha, founders of Bankrupt to 1 Million';
  image.className = 'home-hero-media__image';
  image.decoding = 'async';
  image.fetchPriority = 'high';

  figure.append(image);
  if (slot.caption) {
    const caption = document.createElement('figcaption');
    caption.textContent = slot.caption;
    figure.append(caption);
  }

  heroCard.prepend(figure);
  heroCard.classList.add('hero-card--with-media');
  heroCard.dataset.heroMediaRendered = 'true';
}

function renderSupportQr(slots: Map<string, WebsiteMediaSlot>) {
  const slot = slots.get('site_qr_code');
  const supportCard = document.querySelector<HTMLElement>('.support-page .support-hero .hero-card');
  if (!slot || !supportCard || supportCard.dataset.qrMediaRendered === 'true') return;

  const block = document.createElement('div');
  block.className = 'support-qr';

  const image = document.createElement('img');
  image.src = storageUrl(slot);
  image.alt = slot.alt_text || 'Bankrupt to 1 Million QR code';
  image.className = 'support-qr__image';
  image.loading = 'lazy';
  image.decoding = 'async';

  const copy = document.createElement('div');
  const title = document.createElement('strong');
  title.textContent = 'Scan and share the mission';
  const caption = document.createElement('span');
  caption.textContent = slot.caption || 'Open Bankrupt to 1 Million on your phone.';
  copy.append(title, caption);

  block.append(image, copy);
  supportCard.append(block);
  supportCard.dataset.qrMediaRendered = 'true';
}

function applySlots(slots: Map<string, WebsiteMediaSlot>) {
  renderLogo(slots);
  renderHomeHero(slots);
  renderSupportQr(slots);
}

export function initializeSiteMediaUi() {
  let slots: Map<string, WebsiteMediaSlot> | null = null;
  let scheduled = false;

  const apply = () => {
    if (!slots || scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(() => {
      scheduled = false;
      applySlots(slots!);
    });
  };

  loadSlots()
    .then((loadedSlots) => {
      slots = loadedSlots;
      apply();
    })
    .catch((error) => {
      console.error('Website media slots could not be loaded.', error);
    });

  const observer = new MutationObserver(apply);
  observer.observe(document.documentElement, { childList: true, subtree: true });
}
