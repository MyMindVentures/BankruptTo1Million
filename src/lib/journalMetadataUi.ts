import type { I18nManifest } from '../lib/i18nManifest';
import type { WebsiteTranslate } from './websiteI18n';
function formatJournalTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Madrid',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZoneName: 'short',
  }).formatToParts(date);

  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value || '';
  const zone = part('timeZoneName').replace('GMT+2', 'CEST').replace('GMT+1', 'CET');
  return `${part('day')}/${part('month')}/${part('year')} · ${part('hour')}:${part('minute')} ${zone}`;
}

function enhanceJournalMetadata() {
  if (!window.location.pathname.startsWith('/journal')) return;

  document.querySelectorAll<HTMLTimeElement>('time[datetime]').forEach((element) => {
    const value = element.getAttribute('datetime');
    if (!value || element.dataset.fullTimestamp === 'true') return;
    const formatted = formatJournalTimestamp(value);
    if (!formatted) return;
    element.textContent = formatted;
    element.title = `Published ${formatted} (Europe/Madrid)`;
    element.dataset.fullTimestamp = 'true';
  });

  document.querySelectorAll<HTMLAnchorElement>('a[href^="/journal/author/"]').forEach((link) => {
    const slug = link.getAttribute('href')?.split('/').filter(Boolean).pop();
    if (!slug) return;
    link.href = `/founders/${encodeURIComponent(slug)}`;
    link.setAttribute('aria-label', `View founder profile for ${link.textContent?.trim() || slug}`);
  });

  document.querySelectorAll<HTMLElement>('.journal-authors').forEach((list) => {
    if (list.dataset.creatorLabel === 'true') return;
    const label = document.createElement('p');
    label.className = 'journal-creator-label';
    label.textContent = 'Created by';
    list.before(label);
    list.dataset.creatorLabel = 'true';
  });
}

export const JOURNAL_METADATA_UI_I18N_MANIFEST = {
  componentKey: 'lib.journal.metadata.ui',
  namespace: 'ui',
  translationKeys: [
  ] as const,
  entityContent: { tables: [] },
} as const satisfies I18nManifest;

export function initializeJournalMetadataUi(t: WebsiteTranslate) {
  void t;
  const observer = new MutationObserver(() => enhanceJournalMetadata());
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('popstate', enhanceJournalMetadata);
  window.addEventListener('hashchange', enhanceJournalMetadata);
  enhanceJournalMetadata();
}
