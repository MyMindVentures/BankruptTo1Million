import { StrictMode, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { initializeConceptMessageUi } from './lib/conceptMessageUi';
import { initializeConceptOwnershipUi } from './lib/conceptOwnershipUi';
import { initializeFounderPostUi } from './lib/founderPostUi';
import { initializeFounderPostOpportunitiesUi } from './lib/founderPostOpportunitiesUi';
import { initializeJournalArticleEnhancements } from './lib/journalArticleEnhancements';
import { initializeJournalMetadataUi } from './lib/journalMetadataUi';
import { initializeLatestThreeUi } from './lib/latestThreeUi';
import { initializeMediaVaultGroupsUi } from './lib/mediaVaultGroupsUi';
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
import './styles/missionStatement.css';
import './styles/footerLegalPatch.css';
import './styles/siteMedia.css';
import './components/PremiumJourneyMapPins.css';
import './styles/mediaVault.css';
import './styles/mediaVaultFrontendFixes.css';
import './styles/mediaVaultUpgrade.css';
import './styles/mediaVaultGroups.css';
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
    void initializeMediaVaultGroupsUi();
  }, [t]);
  return null;
}

function AppShell() {
  const [locationKey, setLocationKey] = useState(() => `${window.location.pathname}${window.location.search}${window.location.hash}`);

  useEffect(() => {
    const syncLocation = () => {
      setLocationKey(`${window.location.pathname}${window.location.search}${window.location.hash}`);
    };

    const onDocumentClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target as Element | null;
      const anchor = target?.closest<HTMLAnchorElement>('a[href]');
      if (!anchor || anchor.target || anchor.hasAttribute('download')) return;

      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;

      const samePath = url.pathname === window.location.pathname && url.search === window.location.search;
      if (samePath && url.hash) return;

      event.preventDefault();
      window.history.pushState({}, '', `${url.pathname}${url.search}${url.hash}`);
      syncLocation();
    };

    window.addEventListener('popstate', syncLocation);
    document.addEventListener('click', onDocumentClick);
    return () => {
      window.removeEventListener('popstate', syncLocation);
      document.removeEventListener('click', onDocumentClick);
    };
  }, []);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      window.requestAnimationFrame(() => document.getElementById(hash.slice(1))?.scrollIntoView());
    } else {
      window.scrollTo({ top: 0, left: 0 });
    }

    const frame = window.requestAnimationFrame(() => { void initializeMediaVaultGroupsUi(); });
    return () => window.cancelAnimationFrame(frame);
  }, [locationKey]);

  return (
    <>
      <PublicUiInitializers />
      <Header />
      <div className="page-shell">
        {resolvePublicPage(window.location.pathname)}
      </div>
      <Footer />
    </>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WebsiteI18nProvider>
      <AppShell />
    </WebsiteI18nProvider>
  </StrictMode>,
);
