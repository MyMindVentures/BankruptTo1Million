import React from 'react';
import ReactDOM from 'react-dom/client';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { FounderSupportPage } from './pages/FounderSupportPage';
import './styles/global.css';
import './styles/founder-support.css';
import './styles/footer.css';
import './styles/responsive-hardening.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Header />
    <div className="page-shell">
      <FounderSupportPage />
    </div>
    <Footer />
  </React.StrictMode>,
);
