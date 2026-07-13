import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { initializeConceptMessageUi } from './lib/conceptMessageUi';
import { initializeConceptOwnershipUi } from './lib/conceptOwnershipUi';
import { initializeFounderPostUi } from './lib/founderPostUi';
import { initializeFounderPostOpportunitiesUi } from './lib/founderPostOpportunitiesUi';
import { initializeJournalMetadataUi } from './lib/journalMetadataUi';
import { initializeLatestThreeUi } from './lib/latestThreeUi';
import { initializePlatformUpdatesUi } from './lib/platformUpdatesUi';
import { initializeSiteMediaUi } from './lib/siteMediaUi';
import { WebsiteI18nProvider } from './lib/websiteI18n';
import { FounderProfilePage } from './pages/FounderProfilePage';
import { FoundersOverviewPage } from './pages/FoundersOverviewPage';
import { ImpactResultsPage } from './pages/ImpactResultsPage';
import { JournalLandingPage } from './pages/JournalLandingPage';
import { LegalTransparencyPage } from './pages/LegalTransparencyPage';
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
import './styles/responsive-hardening.css';

initializeConceptOwnershipUi();
initializeConceptMessageUi();
initializeFounderPostUi();
initializeFounderPostOpportunitiesUi();
initializeJournalMetadataUi();
initializeLatestThreeUi();
initializePlatformUpdatesUi();
initializeSiteMediaUi();

const path = window.location.pathname;
const founderSlug = path.startsWith('/founders/') ? decodeURIComponent(path.split('/')[2] || '') : '';
const rootPage = path === '/legal'
  ? <LegalTransparencyPage />
  : path === '/impact'
    ? <ImpactResultsPage />
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
