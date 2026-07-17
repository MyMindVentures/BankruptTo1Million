import type { ReactElement } from 'react';
import React from 'react';
import { HomePage } from '../pages/HomePage';
import { BreakTheCircleArticlePage, BreakTheCirclePage } from '../pages/BreakTheCirclePages';
import { ProofOfMindDetailPage, ProofOfMindPage } from '../pages/ProofOfMindPages';
import { JournalArticlePage, JournalPage } from '../pages/JournalPages';
import { LocalizedFounderSupportPage } from '../pages/LocalizedFounderSupportPage';
import { FoundersOverviewPage } from '../pages/FoundersOverviewPage';
import { FounderProfilePage } from '../pages/FounderProfilePage';
import { MediaVaultPage } from '../pages/MediaVaultPage';
import { CalendarPage } from '../pages/CalendarPage';
import { OffersPage } from '../pages/OffersPage';
import { OfferDetailPage } from '../pages/OfferDetailPage';
import { ImpactResultsPage } from '../pages/ImpactResultsPage';
import { PublicBuildRequestsPage } from '../pages/PublicBuildRequestsPage';
import { AdminAuthGate } from '../pages/AdminAuthGate';
import { OutreachPrivatePage } from '../pages/OutreachPrivatePage';
import { LegalPage } from '../pages/LegalPage';

const ROUTE_MAP: Record<string, () => ReactElement> = {
  '/': () => <HomePage />,
  '/break-the-circle': () => <BreakTheCirclePage />,
  '/proof-of-mind': () => <ProofOfMindPage />,
  '/journal': () => <JournalPage />,
  '/founder-support': () => <LocalizedFounderSupportPage />,
  '/founders': () => <FoundersOverviewPage />,
  '/media': () => <MediaVaultPage />,
  '/calendar': () => <CalendarPage />,
  '/offers': () => <OffersPage />,
  '/impact': () => <ImpactResultsPage />,
  '/issues': () => <PublicBuildRequestsPage />,
  '/legal': () => <LegalPage />,
  '/admin': () => <AdminAuthGate />,
};

const LEGACY_ROUTE_ALIASES: Record<string, string> = {
  '/support': '/founder-support',
  '/founding-heroes': '/impact',
  '/become-a-founding-hero': '/issues',
  '/profile/issues': '/issues',
};

function normalizePath(path: string) {
  const withoutQueryOrHash = path.split(/[?#]/, 1)[0] || '/';
  const collapsed = withoutQueryOrHash.replace(/\/{2,}/g, '/');
  return collapsed !== '/' ? collapsed.replace(/\/+$/, '') : '/';
}

function decodeRouteValue(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function NotFoundPage() {
  return (
    <main className="section" id="top">
      <div className="section-heading">
        <p className="eyebrow">404</p>
        <h1>Page not found</h1>
        <p>The requested page does not exist or has moved.</p>
        <a className="button" href="/">Return home</a>
      </div>
    </main>
  );
}

export function resolvePublicPage(path: string): ReactElement {
  let normalizedPath = normalizePath(path);
  const aliasTarget = LEGACY_ROUTE_ALIASES[normalizedPath];
  if (aliasTarget) normalizedPath = aliasTarget;

  if (ROUTE_MAP[normalizedPath]) return ROUTE_MAP[normalizedPath]();

  if (normalizedPath.startsWith('/admin/')) return <AdminAuthGate />;

  if (normalizedPath.startsWith('/break-the-circle/')) {
    return <BreakTheCircleArticlePage slug={decodeRouteValue(normalizedPath.slice('/break-the-circle/'.length))} />;
  }

  if (normalizedPath.startsWith('/proof-of-mind/')) {
    return <ProofOfMindDetailPage slug={decodeRouteValue(normalizedPath.slice('/proof-of-mind/'.length))} />;
  }

  if (normalizedPath.startsWith('/journal/')) {
    return <JournalArticlePage slug={decodeRouteValue(normalizedPath.slice('/journal/'.length))} />;
  }

  if (normalizedPath.startsWith('/founders/')) {
    return <FounderProfilePage slug={decodeRouteValue(normalizedPath.slice('/founders/'.length))} />;
  }

  if (normalizedPath.startsWith('/offers/')) {
    return <OfferDetailPage slug={decodeRouteValue(normalizedPath.slice('/offers/'.length))} />;
  }

  if (normalizedPath.startsWith('/o/')) {
    const parts = normalizedPath.split('/').filter(Boolean);
    if (parts.length === 3) {
      return <OutreachPrivatePage slug={decodeRouteValue(parts[1])} token={decodeRouteValue(parts[2])} />;
    }
  }

  return <NotFoundPage />;
}
