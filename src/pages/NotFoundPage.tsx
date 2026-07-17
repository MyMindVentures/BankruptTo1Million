import type { I18nManifest } from '../lib/i18nManifest';
import { useWebsiteI18n } from '../lib/websiteI18n';

export const NOT_FOUND_PAGE_I18N_MANIFEST = {
  componentKey: 'pages.not_found',
  namespace: 'not_found',
  translationKeys: [
    'not_found.eyebrow',
    'not_found.title',
    'not_found.description',
    'not_found.home_cta',
  ] as const,
} as const satisfies I18nManifest;

export function NotFoundPage() {
  const { t } = useWebsiteI18n();

  return (
    <main id="top" className="section">
      <div className="impact-state impact-state--error" role="alert">
        <p className="eyebrow">{t('not_found.eyebrow', 'Page not found')}</p>
        <h1>{t('not_found.title', 'This page does not exist.')}</h1>
        <p>{t('not_found.description', 'The link may be outdated, or the page may have moved. Use the navigation or return home.')}</p>
        <p>
          <a className="button" href="/#top">{t('not_found.home_cta', 'Back to home')}</a>
        </p>
      </div>
    </main>
  );
}
