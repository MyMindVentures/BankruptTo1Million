import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { initializeConceptMessageUi } from './lib/conceptMessageUi';
import { initializeConceptOwnershipUi } from './lib/conceptOwnershipUi';
import { initializeJournalMetadataUi } from './lib/journalMetadataUi';
import { initializeLatestThreeUi } from './lib/latestThreeUi';
import { FounderProfilePage } from './pages/FounderProfilePage';
import { LegalTransparencyPage } from './pages/LegalTransparencyPage';
import './styles/global.css';
import './styles/discovery-responsive.css';
import './styles/conceptOwnership.css';
import './styles/conceptMessages.css';
import './styles/founderProfiles.css';
import './styles/latestThree.css';
import './styles/footer.css';
import './styles/legal.css';
import './styles/footerLegalPatch.css';

initializeConceptOwnershipUi();
initializeConceptMessageUi();
initializeJournalMetadataUi();
initializeLatestThreeUi();

const path = window.location.pathname;
const founderSlug = path.startsWith('/founders/') ? decodeURIComponent(path.split('/')[2] || '') : '';
const rootPage = path === '/legal'
  ? <LegalTransparencyPage />
  : founderSlug
    ? <FounderProfilePage slug={founderSlug} />
    : <App />;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {rootPage}
  </StrictMode>,
);
