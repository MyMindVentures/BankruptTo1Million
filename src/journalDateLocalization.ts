const STORAGE_KEY = 'b1m.website.language';
const JOURNAL_ROOT_SELECTOR = '.journal-priority-page,.journal-page,.journal-article,.journal-comments,.journal-share';

function activeLocale() {
  const language = window.localStorage.getItem(STORAGE_KEY) || document.documentElement.lang || 'en';
  return language === 'en' ? 'en-GB' : language;
}

function localizeJournalDates() {
  const locale = activeLocale();
  document.querySelectorAll(`${JOURNAL_ROOT_SELECTOR} time[datetime]`).forEach((node) => {
    const time = node as HTMLTimeElement;
    const raw = time.dateTime || time.getAttribute('datetime') || '';
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return;
    time.textContent = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(date);
  });
}

const observer = new MutationObserver(localizeJournalDates);
observer.observe(document.documentElement, { childList: true, subtree: true });
window.addEventListener('b1m:languagechange', localizeJournalDates);
window.addEventListener('load', localizeJournalDates, { once: true });
localizeJournalDates();
