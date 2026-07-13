import React from 'react';
import ReactDOM from 'react-dom/client';
import { Footer } from './components/Footer';
import { FounderSupportQrShare } from './components/FounderSupportQrShare';
import { Header } from './components/Header';
import { WebsiteI18nProvider } from './lib/websiteI18n';
import { LocalizedFounderSupportPage } from './pages/LocalizedFounderSupportPage';
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
        <LocalizedFounderSupportPage />
      </div>
      <Footer />
    </WebsiteI18nProvider>
  </React.StrictMode>,
);
