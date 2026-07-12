import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { initializeConceptOwnershipUi } from './lib/conceptOwnershipUi';
import './styles/global.css';
import './styles/discovery-responsive.css';
import './styles/conceptOwnership.css';

initializeConceptOwnershipUi();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
