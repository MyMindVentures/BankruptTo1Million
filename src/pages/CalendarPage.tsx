import type { I18nManifest } from '../lib/i18nManifest';
import { useEffect } from 'react';
import { PublicJourneyCalendarSection } from '../components/PublicJourneyCalendarSection';
import { useWebsiteI18n } from '../lib/websiteI18n';

export const CALENDAR_PAGE_I18N_MANIFEST = {
  componentKey: 'pages.calendar.page',
  namespace: 'journey_calendar',
  translationKeys: [
    'journey_calendar.page.eyebrow',
    'journey_calendar.page.title',
    'journey_calendar.page.description',
    'journey_calendar.page.seo_title',
    'journey_calendar.page.seo_description',
    'navigation.calendar',
  ] as const,
  entityContent: {
    rpc: 'get_localized_public_journey_calendar',
    tables: ['journey_calendar_entries', 'journey_calendar_entry_translations'],
  },
} as const satisfies I18nManifest;

export function CalendarPage() {
  const { t } = useWebsiteI18n();

  useEffect(() => {
    document.title = t('journey_calendar.page.seo_title', 'Journey calendar | Bankrupt to 1 Million');
    const description = t(
      'journey_calendar.page.seo_description',
      'Follow Kevin and Micha’s public travel calendar, open hosting requests, and mutual exchange offers.',
    );
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', description);
  }, [t]);

  return (
    <main className="calendar-page">
      <section className="calendar-page__hero">
        <p className="eyebrow">{t('journey_calendar.page.eyebrow', 'Journey calendar')}</p>
        <h1>{t('journey_calendar.page.title', 'Where Kevin and Micha are — and what comes next.')}</h1>
        <p>
          {t(
            'journey_calendar.page.description',
            'See open hosting needs, upcoming stops, and what they can offer in return.',
          )}
        </p>
      </section>
      <PublicJourneyCalendarSection showIntro={false} />
    </main>
  );
}
