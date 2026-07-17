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
  '/admin': () => <AdminAuthGate />,
};

export function resolvePublicPage(path: string): ReactElement {
  const normalizedPath = path.replace(/\/$/, '') || '/';
  
  if (ROUTE_MAP[normalizedPath]) {
    return ROUTE_MAP[normalizedPath]();
  }

  if (normalizedPath.startsWith('/admin/')) {
    return <AdminAuthGate />;
  }

  if (normalizedPath.startsWith('/break-the-circle/')) {
    const slug = decodeURIComponent(normalizedPath.replace('/break-the-circle/', ''));
    return <BreakTheCircleArticlePage slug={slug} />;
  }

  if (normalizedPath.startsWith('/proof-of-mind/')) {
    const slug = decodeURIComponent(normalizedPath.replace('/proof-of-mind/', ''));
    return <ProofOfMindDetailPage slug={slug} />;
  }

  if (normalizedPath.startsWith('/journal/')) {
    const slug = decodeURIComponent(normalizedPath.replace('/journal/', ''));
    return <JournalArticlePage slug={slug} />;
  }

  if (normalizedPath.startsWith('/founders/')) {
    const slug = decodeURIComponent(normalizedPath.replace('/founders/', ''));
    return <FounderProfilePage slug={slug} />;
  }

  if (normalizedPath.startsWith('/offers/')) {
    const slug = decodeURIComponent(normalizedPath.replace('/offers/', ''));
    return <OfferDetailPage slug={slug} />;
  }

  if (normalizedPath.startsWith('/o/')) {
    const parts = normalizedPath.split('/').filter(Boolean);
    if (parts.length >= 3) {
      return <OutreachPrivatePage slug={parts[1]} token={parts[2]} />;
    }
  }

  return <HomePage />;
}
