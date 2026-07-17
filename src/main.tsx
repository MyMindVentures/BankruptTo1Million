import { StrictMode, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { initializeConceptMessageUi } from './lib/conceptMessageUi';
import { initializeConceptOwnershipUi } from './lib/conceptOwnershipUi';
import { initializeFounderPostUi } from './lib/founderPostUi';
import { initializeFounderPostOpportunitiesUi } from './lib/founderPostOpportunitiesUi';
import { initializeJournalArticleEnhancements } from './lib/journalArticleEnhancements';
import { initializeJournalMetadataUi } from './lib/journalMetadataUi';
import { initializeLatestThreeUi } from './lib/latestThreeUi';
import { initializePlatformUpdatesUi } from './lib/platformUpdatesUi';
import { initializeSiteMediaUi } from './lib/siteMediaUi';
import { resolvePublicPage } from './lib/publicRoutes';
import { WebsiteI18nProvider, useWebsiteI18n } from './lib/websiteI18n';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import './styles/breakpoints.css';
import './styles/global.css';
import './styles/i18n.css';
import './styles/header-nav.css';
import './styles/responsive-utils.css';
import './styles/discovery-responsive.css';
import './styles/conceptOwnership.css';
import './styles/conceptMessages.css';
import './styles/founderProfiles.css';
import './styles/foundersOverview.css';
import './styles/founderVideos.css';
import './styles/founderPosts.css';
import './styles/founderPostOpportunities.css';
import './styles/founderPostFixes.css';
import './styles/latestThree.css';
import './styles/platformUpdates.css';
import './styles/footer.css';
import './styles/legal.css';
import './styles/footerLegalPatch.css';
import './styles/siteMedia.css';
import './components/PremiumJourneyMapPins.css';
import './styles/mediaVault.css';
import './styles/mediaVaultFrontendFixes.css';
import './styles/offers.css';
import './styles/calendar.css';
import './styles/buildRequests.css';
import './styles/responsive-hardening.css';
import './styles/footer-layout-fix.css';
import './styles/founder-support.css';
import './styles/journalArticle.css';
import './styles/journalArticleFullContentFix.css';
import './styles/adminDashboard.css';
import './styles/adminAuth.css';
import './styles/adminSections.css';
import './styles/journalAdmin.css';
import './styles/journalAi.css';
import './styles/adminAiControlCenter.css';
import './styles/outreachPrivate.css';

initializeJournalArticleEnhancements();
initializePlatformUpdatesUi();

function PublicUiInitializers() {
  const { t } = useWebsiteI18n();
  const initialized = useRef(false);
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    initializeConceptOwnershipUi(t);
    initializeConceptMessageUi(t);
    initializeFounderPostUi(t);
    initializeFounderPostOpportunitiesUi(t);
    initializeJournalMetadataUi(t);
    initializeLatestThreeUi(t);
    initializeSiteMediaUi(t);
  }, [t]);
  return null;
}

const rootPage = resolvePublicPage(window.location.pathname);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WebsiteI18nProvider>
      <PublicUiInitializers />
      <Header />
      <div className="page-shell">
        {rootPage}
      </div>
      <Footer />
    </WebsiteI18nProvider>
  </StrictMode>,
);
