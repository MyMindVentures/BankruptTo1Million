import type { I18nManifest } from '../lib/i18nManifest';
import { FounderSupportPage } from './FounderSupportPage';
import { useWebsiteI18n } from '../lib/websiteI18n';

export const LOCALIZED_FOUNDER_SUPPORT_PAGE_I18N_MANIFEST = {
  componentKey: 'pages.localized.founder.support.page',
  namespace: 'ui',
  translationKeys: [
  ] as const,
} as const satisfies I18nManifest;

export function LocalizedFounderSupportPage() {
  const { language, isLoading } = useWebsiteI18n();

  if (isLoading) {
    return <main className="founder-support-page"><div className="impact-state">Loading…</div></main>;
  }

  return <FounderSupportPage key={language} />;
}
