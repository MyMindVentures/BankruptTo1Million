const WEBSITE_LANGUAGE_STORAGE_KEY = 'b1m.website.language';
const LANGUAGE_CHANGE_EVENT = 'b1m:languagechange';

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

export function initializeJournalArticleEnhancements() {
  const onLanguageChange = (event: Event) => {
    const language = (event as CustomEvent<{ language?: string }>).detail?.language;
    syncJournalLanguage(language);
  };

  window.addEventListener(LANGUAGE_CHANGE_EVENT, onLanguageChange);
  syncJournalLanguage();
}
