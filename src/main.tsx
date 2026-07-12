import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { initializeConceptOwnershipUi } from './lib/conceptOwnershipUi';
import { LegalTransparencyPage } from './pages/LegalTransparencyPage';
import './styles/global.css';
import './styles/discovery-responsive.css';
import './styles/conceptOwnership.css';
import './styles/footer.css';
import './styles/legal.css';
import './styles/footerLegalPatch.css';

initializeConceptOwnershipUi();

const rootPage = window.location.pathname === '/legal' ? <LegalTransparencyPage /> : <App />;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {rootPage}
  </StrictMode>,
);
