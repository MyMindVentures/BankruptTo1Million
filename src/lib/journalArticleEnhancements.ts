import { supabase } from './supabase';

const WEBSITE_LANGUAGE_STORAGE_KEY = 'b1m.website.language';
const LANGUAGE_CHANGE_EVENT = 'b1m:languagechange';

type TimelineContext = {
  journal_post_id?: string;
  slug: string;
  title?: string;
  location_name?: string;
  city_name?: string;
  occurred_at?: string;
};

type MediaRow = {
  id: string;
  asset_type: 'image' | 'video' | 'document';
  title: string;
  description: string | null;
  alt_text: string | null;
  caption: string | null;
  storage_bucket: string | null;
  storage_path: string | null;
  thumbnail_url: string | null;
  mime_type: string | null;
  tags: string[] | null;
  metadata: Record<string, unknown> | null;
  published_at: string | null;
  created_at: string;
};

function normalize(value: unknown) {
  return String(value || '').trim().toLowerCase();
}

function isJournalArticlePath() {
  const path = window.location.pathname.replace(/\/$/, '');
  return path.startsWith('/journal/') && path.split('/').length >= 3;
}

function syncJournalLanguage(languageCode?: string) {
  if (!isJournalArticlePath()) return;

  const language = normalize(
    languageCode || window.localStorage.getItem(WEBSITE_LANGUAGE_STORAGE_KEY) || 'en',
  );
  if (!language) return;

  const url = new URL(window.location.href);
  const currentLanguage = normalize(url.searchParams.get('lang'));
  if (currentLanguage === language) return;

  url.searchParams.set('lang', language);
  window.location.replace(url.toString());
}

function publicStorageUrl(bucket: string | null, path: string | null) {
  if (!bucket || !path) return '';
  const safePath = path.split('/').map(encodeURIComponent).join('/');
  return `${supabase.url}/storage/v1/object/public/${encodeURIComponent(bucket)}/${safePath}`;
}

async function readJson<T>(responseOrPromise: Response | Promise<Response>): Promise<T> {
  const response = await responseOrPromise;
  if (!response.ok) throw new Error(await response.text());
  return response.json() as Promise<T>;
}

function isLinked(row: MediaRow, context: TimelineContext) {
  const metadata = row.metadata && typeof row.metadata === 'object' ? row.metadata : {};
  const tags = Array.isArray(row.tags) ? row.tags.map(normalize) : [];
  const slug = normalize(context.slug);
  const postId = normalize(context.journal_post_id);

  const exactValues = [
    metadata.journal_post_id,
    metadata.related_journal_post_id,
    metadata.journalPostId,
    metadata.journal_post_slug,
    metadata.journalPostSlug,
    metadata.post_slug,
  ].map(normalize);

  if (exactValues.includes(postId) || exactValues.includes(slug)) return true;
  if (tags.some((tag) => tag === slug || tag === `journal:${slug}` || tag === `journal-post:${slug}`)) return true;

  const haystack = normalize([
    row.title,
    row.description,
    row.caption,
    row.tags?.join(' '),
    metadata.location,
    metadata.venue,
    metadata.event,
  ].join(' '));
  const location = normalize(context.location_name);
  const city = normalize(context.city_name);
  const titleWords = normalize(context.title).split(/\s+/).filter((word) => word.length > 5);
  const locationMatch = Boolean(location && haystack.includes(location)) || Boolean(city && haystack.includes(city));
  const titleMatch = titleWords.filter((word) => haystack.includes(word)).length >= 2;

  const assetDate = new Date(String(metadata.captured_at || row.published_at || row.created_at)).getTime();
  const eventDate = new Date(context.occurred_at || '').getTime();
  const dateMatch = Number.isFinite(assetDate) && Number.isFinite(eventDate) && Math.abs(assetDate - eventDate) <= 36 * 60 * 60 * 1000;

  return (locationMatch && dateMatch) || (locationMatch && titleMatch) || (titleMatch && dateMatch);
}

function mediaElement(row: MediaRow) {
  const source = publicStorageUrl(row.storage_bucket, row.storage_path);
  if (!source) return null;

  const figure = document.createElement('figure');
  figure.className = `journal-footage__item journal-footage__item--${row.asset_type}`;

  if (row.asset_type === 'video') {
    const video = document.createElement('video');
    video.src = source;
    video.controls = true;
    video.preload = 'metadata';
    video.playsInline = true;
    if (row.thumbnail_url) video.poster = row.thumbnail_url;
    video.setAttribute('aria-label', row.alt_text || row.title);
    figure.appendChild(video);
  } else if (row.asset_type === 'image') {
    const image = document.createElement('img');
    image.src = source;
    image.alt = row.alt_text || row.title;
    image.loading = 'lazy';
    image.decoding = 'async';
    figure.appendChild(image);
  } else {
    return null;
  }

  const captionText = row.caption || row.description || row.title;
  if (captionText) {
    const caption = document.createElement('figcaption');
    caption.textContent = captionText;
    figure.appendChild(caption);
  }

  return figure;
}

async function enhanceJournalArticle() {
  const path = window.location.pathname.replace(/\/$/, '');
  if (!path.startsWith('/journal/') || path.split('/').length < 3) return;

  const article = document.querySelector<HTMLElement>('.journal-article');
  const body = article?.querySelector<HTMLElement>('.journal-body');
  if (!article || !body || article.dataset.enhanced === 'true') return;
  article.dataset.enhanced = 'true';

  const slug = decodeURIComponent(path.split('/')[2] || '');
  if (!slug) return;

  try {
    const contexts = await readJson<TimelineContext[]>(supabase.from('journal_timeline_cards').request({
      query: `select=journal_post_id,slug,title,location_name,city_name,occurred_at&slug=eq.${encodeURIComponent(slug)}&limit=1`,
    }));
    const context = contexts[0] || { slug };

    const mediaRows = await readJson<MediaRow[]>(supabase.from('media_assets').request({
      query: 'select=id,asset_type,title,description,alt_text,caption,storage_bucket,storage_path,thumbnail_url,mime_type,tags,metadata,published_at,created_at&visibility=eq.public&status=eq.published&order=published_at.asc.nullslast,created_at.asc',
    }));

    const linked = mediaRows.filter((row) => isLinked(row, context));
    if (!linked.length) return;

    const section = document.createElement('section');
    section.className = 'journal-footage';
    section.setAttribute('aria-labelledby', 'journal-footage-title');

    const heading = document.createElement('div');
    heading.className = 'journal-footage__heading';
    heading.innerHTML = '<p class="eyebrow">Footage from the journey</p><h2 id="journal-footage-title">See the moment as it happened.</h2>';
    section.appendChild(heading);

    const grid = document.createElement('div');
    grid.className = 'journal-footage__grid';
    linked.map(mediaElement).filter((item): item is HTMLElement => Boolean(item)).forEach((item) => grid.appendChild(item));
    if (!grid.children.length) return;

    section.appendChild(grid);
    body.parentElement?.insertBefore(section, body);
  } catch (error) {
    if (import.meta.env.DEV) console.error('[Journal] linked footage enhancement failed', error);
  }
}

export function initializeJournalArticleEnhancements() {
  const onLanguageChange = (event: Event) => {
    const language = (event as CustomEvent<{ language?: string }>).detail?.language;
    syncJournalLanguage(language);
  };

  window.addEventListener(LANGUAGE_CHANGE_EVENT, onLanguageChange);

  const observer = new MutationObserver(() => void enhanceJournalArticle());
  observer.observe(document.documentElement, { childList: true, subtree: true });

  syncJournalLanguage();
  void enhanceJournalArticle();
}