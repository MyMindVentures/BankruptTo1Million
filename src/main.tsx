import { StrictMode } from 'react';
import type { ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { initializeConceptMessageUi } from './lib/conceptMessageUi';
import { initializeConceptOwnershipUi } from './lib/conceptOwnershipUi';
import { initializeFounderPostUi } from './lib/founderPostUi';
import { initializeFounderPostOpportunitiesUi } from './lib/founderPostOpportunitiesUi';
import { initializeJournalArticleEnhancements } from './lib/journalArticleEnhancements';
import { initializeJournalMetadataUi } from './lib/journalMetadataUi';
import { initializeLatestThreeUi } from './lib/latestThreeUi';
import { initializePlatformUpdatesUi } from './lib/platformUpdatesUi';
import { initializeSiteMediaUi } from './lib/siteMediaUi';
import { WebsiteI18nProvider } from './lib/websiteI18n';
import { AdminAuthGate } from './pages/AdminAuthGate';
import { FounderProfilePage } from './pages/FounderProfilePage';
import { FoundersOverviewPage } from './pages/FoundersOverviewPage';
import { HomePage } from './pages/HomePage';
import { ImpactResultsPage } from './pages/ImpactResultsPage';
import { JournalLandingPage } from './pages/JournalLandingPage';
import { LegalTransparencyPage } from './pages/LegalTransparencyPage';
import { MediaVaultPage } from './pages/MediaVaultPage';
import { OfferDetailPage } from './pages/OfferDetailPage';
import { OffersPage } from './pages/OffersPage';
import { PublicBuildRequestsPage } from './pages/PublicBuildRequestsPage';
import './styles/global.css';
import './styles/i18n.css';
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
import './styles/buildRequests.css';
import './styles/responsive-hardening.css';
import './styles/footer-layout-fix.css';
import './styles/journalArticle.css';
import './styles/journalArticleFullContentFix.css';
import './styles/adminDashboard.css';
import './styles/adminAuth.css';
import './styles/adminSections.css';
import './styles/journalAdmin.css';
import './styles/journalAi.css';

initializeConceptOwnershipUi();
initializeConceptMessageUi();
initializeFounderPostUi();
initializeFounderPostOpportunitiesUi();
initializeJournalArticleEnhancements();
initializeJournalMetadataUi();
initializeLatestThreeUi();
initializePlatformUpdatesUi();
initializeSiteMediaUi();

const path = window.location.pathname.replace(/\/$/, '') || '/';
const founderSlug = path.startsWith('/founders/') ? decodeURIComponent(path.split('/')[2] || '') : '';
const offerSlug = path.startsWith('/offers/') ? decodeURIComponent(path.split('/')[2] || '') : '';
const mediaPage = path === '/media' || path === '/media-vault';
const adminPage = path === '/admin' || path.startsWith('/admin/');
const withSiteShell = (page: ReactNode) => <><Header /><div className="page-shell">{page}</div><Footer /></>;
const rootPage = adminPage
  ? <AdminAuthGate />
  : path === '/'
    ? withSiteShell(<HomePage />)
    : path === '/legal'
      ? <LegalTransparencyPage />
      : path === '/impact'
        ? <ImpactResultsPage />
        : path === '/issues'
          ? withSiteShell(<PublicBuildRequestsPage />)
          : mediaPage
            ? withSiteShell(<MediaVaultPage />)
            : path === '/offers'
              ? withSiteShell(<OffersPage />)
              : offerSlug
                ? withSiteShell(<OfferDetailPage slug={offerSlug} />)
                : path === '/journal'
                  ? <JournalLandingPage />
                  : path === '/founders'
                    ? <FoundersOverviewPage />
                    : founderSlug
                      ? <FounderProfilePage slug={founderSlug} />
                      : <App />;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WebsiteI18nProvider>
      {rootPage}
    </WebsiteI18nProvider>
  </StrictMode>,
);
