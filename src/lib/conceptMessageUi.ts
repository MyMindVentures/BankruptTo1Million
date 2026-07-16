import type { I18nManifest } from '../lib/i18nManifest';
import { getPublishedConceptMessages, type ProofOfMindConceptMessage } from './conceptMessages';
import type { WebsiteTranslate } from './websiteI18n';

const htmlEntities: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' };

function escapeHtml(value: string | null | undefined) {
  return (value || '').replace(/[&<>'"]/g, (character) => htmlEntities[character] || character);
}

function safeUrl(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value, window.location.origin);
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

function normalizedKey(value: string | null | undefined) {
  return (value || '').trim().toLowerCase();
}

function messageBody(message: ProofOfMindConceptMessage, t: WebsiteTranslate) {
  return message.personal_intro || message.excerpt || message.why_i_created_it || message.lived_experience || message.vision_for_impact || message.founder_video_description || t('concept_message.empty', 'A personal message from the founder will appear here.');
}

function renderPanel(message: ProofOfMindConceptMessage, t: WebsiteTranslate) {
  const videoUrl = safeUrl(message.video_url);
  const ctaUrl = safeUrl(message.cta_url);
  const video = videoUrl
    ? `<video class="concept-message-panel__video" controls playsinline preload="metadata"${message.video_thumbnail_url ? ` poster="${escapeHtml(message.video_thumbnail_url)}"` : ''}><source src="${escapeHtml(videoUrl)}" /></video>`
    : `<div class="concept-message-panel__visual" aria-hidden="true"><span>${escapeHtml(t('concept_message.visual_label', 'Personal message'))}</span><strong>${escapeHtml(message.founder_video_title || message.title)}</strong><small>${escapeHtml(message.video_status === 'published' ? t('concept_message.video', 'Video message') : t('concept_message.story', 'Founder story'))}</small></div>`;

  return `<section class="concept-message-panel" aria-label="${escapeHtml(t('concept_message.panel_label', 'Personal message from the founder'))}">
    <div class="concept-message-panel__topline"><span>${escapeHtml(t('concept_message.panel_title', 'Personal concept message'))}</span><button type="button" class="concept-message-panel__close" aria-label="${escapeHtml(t('concept_message.close', 'Close personal message'))}">×</button></div>
    ${video}
    <div class="concept-message-panel__copy">
      <h4>${escapeHtml(message.title)}</h4>
      <p>${escapeHtml(messageBody(message, t))}</p>
      ${message.why_i_created_it ? `<div><strong>${escapeHtml(t('concept_message.why_created', 'Why I created it'))}</strong><p>${escapeHtml(message.why_i_created_it)}</p></div>` : ''}
      ${message.vision_for_impact ? `<div><strong>${escapeHtml(t('concept_message.impact', 'What I hope it changes'))}</strong><p>${escapeHtml(message.vision_for_impact)}</p></div>` : ''}
      ${ctaUrl ? `<a class="button button--small" href="${escapeHtml(ctaUrl)}">${escapeHtml(message.cta_label || t('concept_message.cta', 'Explore the concept'))}</a>` : ''}
    </div>
  </section>`;
}

function attachMessage(card: HTMLElement, message: ProofOfMindConceptMessage, t: WebsiteTranslate) {
  if (card.dataset.conceptMessageReady === 'true') return;
  const titleRow = card.querySelector('.concept-card__title-row');
  const actions = card.querySelector('.proof-card-actions');
  if (!titleRow || !actions) return;

  card.dataset.conceptMessageReady = 'true';
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'concept-message-icon-button';
  button.setAttribute('aria-label', t('concept_message.open', 'Open the personal message for {title}', { title: message.concept_title || message.title }));
  button.setAttribute('aria-expanded', 'false');
  button.innerHTML = `<span aria-hidden="true">▶</span><span class="concept-message-icon-button__label">${escapeHtml(t('concept_message.button', 'Founder message'))}</span>`;
  titleRow.appendChild(button);

  const panelHost = document.createElement('div');
  panelHost.className = 'concept-message-host';
  panelHost.hidden = true;
  panelHost.innerHTML = renderPanel(message, t);
  actions.before(panelHost);

  const setOpen = (open: boolean) => {
    card.classList.toggle('concept-card--message-open', open);
    panelHost.hidden = !open;
    button.setAttribute('aria-expanded', String(open));
    button.classList.toggle('is-active', open);
    if (open) panelHost.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  button.addEventListener('click', () => setOpen(panelHost.hidden));
  panelHost.querySelector('.concept-message-panel__close')?.addEventListener('click', () => setOpen(false));
}

function conceptSlug(card: HTMLElement) {
  const href = card.querySelector<HTMLAnchorElement>('a[href^="/proof-of-mind/"]')?.getAttribute('href');
  return href?.split('/').filter(Boolean).pop() || null;
}

function conceptTitle(card: HTMLElement) {
  return card.querySelector('.concept-card__title-row h3')?.textContent?.trim() || null;
}

const STORAGE_KEY = 'b1m.website.language';

function currentLanguage() {
  const queryLanguage = new URLSearchParams(window.location.search).get('lang');
  const storedLanguage = window.localStorage.getItem(STORAGE_KEY);
  return (queryLanguage || storedLanguage || document.documentElement.lang || 'en').toLowerCase().split('-')[0];
}

export const CONCEPT_MESSAGE_UI_I18N_MANIFEST = {
  componentKey: 'lib.concept.message.ui',
  namespace: 'ui',
  translationKeys: [] as const,
  keyPatterns: ['concept_message.*'] as const,
  entityContent: { tables: [] },
} as const satisfies I18nManifest;

export function initializeConceptMessageUi(t: WebsiteTranslate) {
  let messagesBySlug = new Map<string, ProofOfMindConceptMessage>();
  let messagesByTitle = new Map<string, ProofOfMindConceptMessage>();
  let loading: Promise<void> | null = null;
  let loadedLanguage = currentLanguage();

  const load = (language = currentLanguage()) => {
    if (!loading || loadedLanguage !== language) {
      loadedLanguage = language;
      loading = getPublishedConceptMessages(language)
        .then((messages) => {
          messagesBySlug = new Map(messages.filter((message) => message.concept_slug).map((message) => [message.concept_slug, message]));
          messagesByTitle = new Map(messages.filter((message) => message.concept_title).map((message) => [normalizedKey(message.concept_title), message]));
        })
        .catch(() => { messagesBySlug = new Map(); messagesByTitle = new Map(); });
    }
    return loading;
  };

  const enhance = async () => {
    if (!window.location.pathname.startsWith('/proof-of-mind')) return;
    await load();
    document.querySelectorAll<HTMLElement>('.concept-card').forEach((card) => {
      const slug = conceptSlug(card);
      const title = conceptTitle(card);
      const message = (slug ? messagesBySlug.get(slug) : null) || (title ? messagesByTitle.get(normalizedKey(title)) : null);
      if (message) attachMessage(card, message, t);
    });
  };

  const observer = new MutationObserver(() => { void enhance(); });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('popstate', () => void enhance());
  window.addEventListener('hashchange', () => void enhance());
  window.addEventListener('b1m:languagechange', () => {
    loading = null;
    void enhance();
  });
  void enhance();
}
