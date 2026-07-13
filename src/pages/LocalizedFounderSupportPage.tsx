import { FounderSupportPage } from './FounderSupportPage';
import { useWebsiteI18n } from '../lib/websiteI18n';

export function LocalizedFounderSupportPage() {
  const { language, isLoading } = useWebsiteI18n();

  if (isLoading) {
    return <main className="founder-support-page"><div className="impact-state">Loading…</div></main>;
  }

  return <FounderSupportPage key={language} />;
}
