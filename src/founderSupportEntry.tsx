import React from 'react';
import ReactDOM from 'react-dom/client';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { FounderSupportQrShare } from './components/FounderSupportQrShare';
import { WebsiteI18nProvider } from './lib/websiteI18n';
import { FounderSupportPage } from './pages/FounderSupportPage';
import './styles/global.css';
import './styles/i18n.css';
import './styles/founder-support.css';
import './styles/footer.css';
import './styles/responsive-hardening.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <WebsiteI18nProvider>
      <Header />
      <div className="page-shell">
        <FounderSupportQrShare />
        <FounderSupportPage />
      </div>
      <Footer />
    </WebsiteI18nProvider>
  </React.StrictMode>,
);
