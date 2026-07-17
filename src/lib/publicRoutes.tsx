import type { ReactNode } from 'react';
import { Footer } from '../components/Footer';
import { FounderSupportQrShare } from '../components/FounderSupportQrShare';
import { Header } from '../components/Header';
import {
  BecomeFoundingHeroPage,
  FoundingHeroesPage,
  IssueDetailPage,
  ProfileIssuesPage,
  ProfilePage,
  SupportMissionPage,
} from '../App';
import { AdminAuthGate } from '../pages/AdminAuthGate';
import { BreakTheCircleArticlePage, BreakTheCirclePage } from '../pages/BreakTheCirclePages';
import { CalendarPage } from '../pages/CalendarPage';
import { FounderProfilePage } from '../pages/FounderProfilePage';
import { FoundersOverviewPage } from '../pages/FoundersOverviewPage';
import { HomePage } from '../pages/HomePage';
import { ImpactResultsPage } from '../pages/ImpactResultsPage';
import { JournalLandingPage } from '../pages/JournalLandingPage';
import { JournalArticlePage, JournalPage } from '../pages/JournalPages';
import { LegalTransparencyPage } from '../pages/LegalTransparencyPage';
import { LocalizedFounderSupportPage } from '../pages/LocalizedFounderSupportPage';
import { MediaVaultPage } from '../pages/MediaVaultPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { OfferDetailPage } from '../pages/OfferDetailPage';
import { OffersPage } from '../pages/OffersPage';
import { OutreachPrivatePage } from '../pages/OutreachPrivatePage';
import { ProofOfMindDetailPage, ProofOfMindPage } from '../pages/ProofOfMindPages';
import { PublicBuildRequestsPage } from '../pages/PublicBuildRequestsPage';

/** Strip trailing slashes and map legacy `.html` MPA paths to SPA paths. */
export function normalizePathname(pathname: string): string {
  let path = pathname.split('?')[0]?.split('#')[0] || '/';
  if (path.endsWith('.html')) {
    path = path.slice(0, -5) || '/';
  }
  return path.replace(/\/+$/, '') || '/';
}

export type PublicRouteMatch =
  | { kind: 'admin' }
  | { kind: 'outreach'; slug: string; token: string }
  | { kind: 'home' }
  | { kind: 'legal' }
  | { kind: 'impact' }
  | { kind: 'issues' }
  | { kind: 'issue_detail'; number: number }
  | { kind: 'media' }
  | { kind: 'offers' }
  | { kind: 'offer_detail'; slug: string }
  | { kind: 'calendar' }
  | { kind: 'journal' }
  | { kind: 'journal_filter' }
  | { kind: 'journal_article'; slug: string }
  | { kind: 'founders' }
  | { kind: 'founder_profile'; slug: string }
  | { kind: 'break_the_circle' }
  | { kind: 'break_the_circle_article'; slug: string }
  | { kind: 'proof_of_mind' }
  | { kind: 'proof_of_mind_detail'; slug: string }
  | { kind: 'founding_heroes' }
  | { kind: 'support'; categoryId?: string }
  | { kind: 'profile' }
  | { kind: 'profile_issues' }
  | { kind: 'become_founding_hero' }
  | { kind: 'founder_support' }
  | { kind: 'not_found' };

function decodeSegment(segment: string | undefined): string {
  if (!segment) return '';
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

/** Single source of truth for public pathname → route kind (trailing-slash safe). */
export function matchPublicRoute(pathname: string): PublicRouteMatch {
  const path = normalizePathname(pathname);

  if (path === '/admin' || path.startsWith('/admin/')) {
    return { kind: 'admin' };
  }

  const outreachMatch = path.match(/^\/o\/([^/]+)\/([^/]+)$/);
  if (outreachMatch) {
    return {
      kind: 'outreach',
      slug: decodeSegment(outreachMatch[1]),
      token: decodeSegment(outreachMatch[2]),
    };
  }

  if (path === '/') return { kind: 'home' };
  if (path === '/legal') return { kind: 'legal' };
  if (path === '/impact') return { kind: 'impact' };
  if (path === '/issues') return { kind: 'issues' };

  if (path.startsWith('/issues/')) {
    const number = Number(path.split('/')[2]);
    if (Number.isFinite(number) && number > 0) {
      return { kind: 'issue_detail', number };
    }
    return { kind: 'not_found' };
  }

  if (path === '/media' || path === '/media-vault') return { kind: 'media' };
  if (path === '/offers') return { kind: 'offers' };
  if (path.startsWith('/offers/')) {
    const slug = decodeSegment(path.split('/')[2]);
    return slug ? { kind: 'offer_detail', slug } : { kind: 'not_found' };
  }

  if (path === '/calendar') return { kind: 'calendar' };
  if (path === '/journal') return { kind: 'journal' };

  if (
    path.startsWith('/journal/category/')
    || path.startsWith('/journal/tag/')
    || path.startsWith('/journal/venture/')
    || path.startsWith('/journal/author/')
  ) {
    return { kind: 'journal_filter' };
  }

  if (path.startsWith('/journal/')) {
    const slug = decodeSegment(path.split('/')[2]);
    return slug ? { kind: 'journal_article', slug } : { kind: 'not_found' };
  }

  if (path === '/founders') return { kind: 'founders' };
  if (path.startsWith('/founders/')) {
    const slug = decodeSegment(path.split('/')[2]);
    return slug ? { kind: 'founder_profile', slug } : { kind: 'not_found' };
  }

  if (path === '/break-the-circle' || path === '/help-us-break-the-circle') {
    return { kind: 'break_the_circle' };
  }
  if (path.startsWith('/break-the-circle/') || path.startsWith('/help-us-break-the-circle/')) {
    const slug = decodeSegment(path.split('/')[2]);
    return slug ? { kind: 'break_the_circle_article', slug } : { kind: 'not_found' };
  }

  if (path === '/proof-of-mind') return { kind: 'proof_of_mind' };
  if (path.startsWith('/proof-of-mind/')) {
    const slug = decodeSegment(path.split('/')[2]);
    return slug ? { kind: 'proof_of_mind_detail', slug } : { kind: 'not_found' };
  }

  if (path === '/founding-heroes') return { kind: 'founding_heroes' };
  if (path === '/support') return { kind: 'support' };
  if (path.startsWith('/support/')) {
    const categoryId = decodeSegment(path.split('/')[2]);
    return categoryId ? { kind: 'support', categoryId } : { kind: 'not_found' };
  }

  if (path === '/profile' || path === '/profile/complete') return { kind: 'profile' };
  if (path === '/profile/issues') return { kind: 'profile_issues' };
  if (path === '/become-a-founding-hero') return { kind: 'become_founding_hero' };
  if (path === '/founder-support') return { kind: 'founder_support' };

  return { kind: 'not_found' };
}

export function isKnownPublicPath(pathname: string): boolean {
  return matchPublicRoute(pathname).kind !== 'not_found';
}

const withSiteShell = (page: ReactNode) => (
  <>
    <Header />
    <div className="page-shell">{page}</div>
    <Footer />
  </>
);

/** Resolve a browser pathname to the full page tree (including shell when needed). */
export function resolvePublicPage(pathname: string): ReactNode {
  const match = matchPublicRoute(pathname);

  switch (match.kind) {
    case 'admin':
      return <AdminAuthGate />;
    case 'outreach':
      return <OutreachPrivatePage slug={match.slug} token={match.token} />;
    case 'home':
      return withSiteShell(<HomePage />);
    case 'legal':
      return <LegalTransparencyPage />;
    case 'impact':
      return <ImpactResultsPage />;
    case 'issues':
      return withSiteShell(<PublicBuildRequestsPage />);
    case 'issue_detail':
      return withSiteShell(<IssueDetailPage number={match.number} />);
    case 'media':
      return withSiteShell(<MediaVaultPage />);
    case 'offers':
      return withSiteShell(<OffersPage />);
    case 'offer_detail':
      return withSiteShell(<OfferDetailPage slug={match.slug} />);
    case 'calendar':
      return withSiteShell(<CalendarPage />);
    case 'journal':
      return <JournalLandingPage />;
    case 'journal_filter':
      return withSiteShell(<JournalPage />);
    case 'journal_article':
      return withSiteShell(<JournalArticlePage slug={match.slug} />);
    case 'founders':
      return <FoundersOverviewPage />;
    case 'founder_profile':
      return <FounderProfilePage slug={match.slug} />;
    case 'break_the_circle':
      return withSiteShell(<BreakTheCirclePage />);
    case 'break_the_circle_article':
      return withSiteShell(<BreakTheCircleArticlePage slug={match.slug} />);
    case 'proof_of_mind':
      return withSiteShell(<ProofOfMindPage />);
    case 'proof_of_mind_detail':
      return withSiteShell(<ProofOfMindDetailPage slug={match.slug} />);
    case 'founding_heroes':
      return withSiteShell(<FoundingHeroesPage />);
    case 'support':
      return withSiteShell(<SupportMissionPage categoryId={match.categoryId} />);
    case 'profile':
      return withSiteShell(<ProfilePage />);
    case 'profile_issues':
      return withSiteShell(<ProfileIssuesPage />);
    case 'become_founding_hero':
      return withSiteShell(<BecomeFoundingHeroPage />);
    case 'founder_support':
      return withSiteShell(
        <>
          <FounderSupportQrShare />
          <LocalizedFounderSupportPage />
        </>,
      );
    case 'not_found':
      return withSiteShell(<NotFoundPage />);
    default: {
      const _exhaustive: never = match;
      return _exhaustive;
    }
  }
}
