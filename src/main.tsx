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
import { FounderProfilePage } from './pages/FounderProfilePage';
import { ImpactResultsPage } from './pages/ImpactResultsPage';
import { LegalTransparencyPage } from './pages/LegalTransparencyPage';
import './styles/global.css';
import './styles/discovery-responsive.css';
import './styles/conceptOwnership.css';
import './styles/conceptMessages.css';
import './styles/founderProfiles.css';
import './styles/founderPosts.css';
import './styles/founderPostOpportunities.css';
import './styles/founderPostFixes.css';
import './styles/latestThree.css';
import './styles/platformUpdates.css';
import './styles/footer.css';
import './styles/legal.css';
import './styles/footerLegalPatch.css';
import './styles/responsive-hardening.css';

initializeConceptOwnershipUi();
initializeConceptMessageUi();
initializeFounderPostUi();
initializeFounderPostOpportunitiesUi();
initializeJournalMetadataUi();
initializeLatestThreeUi();
initializePlatformUpdatesUi();

const path = window.location.pathname;
const founderSlug = path.startsWith('/founders/') ? decodeURIComponent(path.split('/')[2] || '') : '';
const rootPage = path === '/legal'
  ? <LegalTransparencyPage />
  : path === '/impact'
    ? <ImpactResultsPage />
    : founderSlug
      ? <FounderProfilePage slug={founderSlug} />
      : <App />;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {rootPage}
  </StrictMode>,
);
