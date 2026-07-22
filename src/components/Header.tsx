import { Menu, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { navGroups, primaryNavItems } from '../data/siteContent';
import type { NavItem } from '../data/siteContent';
import type { I18nManifest } from '../lib/i18nManifest';
import { useWebsiteI18n } from '../lib/websiteI18n';
import { LanguageSelector } from './LanguageSelector';
import { MissionLogo } from './MissionLogo';

export const HEADER_I18N_MANIFEST = {
  componentKey: 'shell.header',
  namespace: 'header',
  translationKeys: [
    'header.brand_home_aria',
    'header.primary_navigation_aria',
    'header.nav_group_toggle_aria',
    'header.close_menu_aria',
    'header.open_menu_aria',
    'header.mobile_navigation_aria',
  ] as const,
  keyPatterns: ['navigation.*', 'navigation.group.*'] as const,
} as const satisfies I18nManifest;

const groupLabelFallbacks: Record<string, string> = {
  'navigation.group.explore': 'Explore',
  'navigation.group.community': 'People & work',
  'navigation.group.participate': 'Join & support',
};

const allNavigationItems = [...primaryNavItems, ...navGroups.flatMap((group) => group.items)];
const navigationItemByHref = new Map(allNavigationItems.map((item) => [item.href, item]));

function navigationItems(hrefs: string[]): NavItem[] {
  return hrefs.map((href) => navigationItemByHref.get(href)).filter((item): item is NavItem => Boolean(item));
}

function buildNavigationHref(href: string, currentSearch: string): string {
  const target = new URL(href, window.location.origin);
  const language = new URLSearchParams(currentSearch).get('lang');
  if (language && !target.searchParams.has('lang')) target.searchParams.set('lang', language);
  return `${target.pathname}${target.search}${target.hash}`;
}

function isActive(item: NavItem, pathname: string, hash: string): boolean {
  const target = new URL(item.href, window.location.origin);
  const targetPath = target.pathname.replace(/\/$/, '') || '/';
  const currentPath = pathname.replace(/\/$/, '') || '/';

  if (target.hash) {
    if (targetPath !== currentPath) return false;
    return target.hash === '#top' ? hash === '' || hash === '#top' : hash === target.hash;
  }

  if (targetPath === '/') return currentPath === '/';
  return currentPath === targetPath || currentPath.startsWith(`${targetPath}/`);
}

const visiblePrimaryNavItems = navigationItems(['/#top']);
const visibleNavGroups = [
  {
    id: 'explore',
    labelKey: 'navigation.group.explore',
    items: navigationItems(['/journal', '/#story', '/media', '/calendar', '/#platform', '/#roadmap']),
  },
  {
    id: 'community',
    labelKey: 'navigation.group.community',
    items: navigationItems(['/founders', '/offers', '/proof-of-mind', '/impact']),
  },
  {
    id: 'participate',
    labelKey: 'navigation.group.participate',
    items: navigationItems(['/breakfast-for-a-story', '/break-the-circle', '/founder-support', '/issues']),
  },
].filter((group) => group.items.length > 0);

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [openDesktopGroup, setOpenDesktopGroup] = useState<string | null>(null);
  const [openMobileGroup, setOpenMobileGroup] = useState<string | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const mobileToggleRef = useRef<HTMLButtonElement>(null);
  const desktopSummaryRefs = useRef<Record<string, HTMLElement | null>>({});
  const { t } = useWebsiteI18n();
  const mobileMenuId = 'mobile-navigation';
  const currentSearch = typeof window === 'undefined' ? '' : window.location.search;
  const currentPath = typeof window === 'undefined' ? '/' : window.location.pathname;
  const currentHash = typeof window === 'undefined' ? '' : window.location.hash;

  const hrefFor = useMemo(() => (href: string) => buildNavigationHref(href, currentSearch), [currentSearch]);

  const closeNavigation = () => {
    setOpenDesktopGroup(null);
    setOpenMobileGroup(null);
    setIsMenuOpen(false);
  };

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (openDesktopGroup && !headerRef.current?.contains(event.target as Node)) setOpenDesktopGroup(null);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [openDesktopGroup]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      const group = openDesktopGroup;
      const mobileWasOpen = isMenuOpen;
      closeNavigation();
      window.requestAnimationFrame(() => {
        if (group) desktopSummaryRefs.current[group]?.focus();
        else if (mobileWasOpen) mobileToggleRef.current?.focus();
      });
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isMenuOpen, openDesktopGroup]);

  useEffect(() => {
    if (!isMenuOpen) return undefined;
    const onResize = () => {
      if (window.innerWidth > 1024) closeNavigation();
    };
    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`;
    window.addEventListener('resize', onResize);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
      window.removeEventListener('resize', onResize);
    };
  }, [isMenuOpen]);

  return (
    <header ref={headerRef} className="site-header" data-scrolled={isScrolled || undefined}>
      <div className="site-header__inner">
        <div className="site-header__bar">
          <a className="brand" href={hrefFor('/#top')} aria-label={t('header.brand_home_aria', 'Bankrupt to 1 Million home')} aria-current={currentPath === '/' && (currentHash === '' || currentHash === '#top') ? 'page' : undefined} onClick={closeNavigation}>
            <span className="brand__mark"><MissionLogo eager decorative /></span>
            <span className="brand__text">Bankrupt to 1 Million</span>
          </a>

          <nav className="site-nav site-nav--desktop" aria-label={t('header.primary_navigation_aria', 'Primary navigation')}>
            <div className="site-nav--primary">
              {visiblePrimaryNavItems.map((item) => (
                <a key={item.href} href={hrefFor(item.href)} aria-current={isActive(item, currentPath, currentHash) ? 'page' : undefined} onClick={closeNavigation}>{t(item.translationKey, item.label)}</a>
              ))}
              {visibleNavGroups.map((group) => {
                const groupActive = group.items.some((item) => isActive(item, currentPath, currentHash));
                return (
                  <details key={group.id} className="site-nav__group" open={openDesktopGroup === group.id} data-active={groupActive || undefined} onToggle={(event) => {
                    if (event.currentTarget.open) setOpenDesktopGroup(group.id);
                    else setOpenDesktopGroup((current) => current === group.id ? null : current);
                  }}>
                    <summary ref={(node) => { desktopSummaryRefs.current[group.id] = node; }} aria-expanded={openDesktopGroup === group.id} aria-label={t('header.nav_group_toggle_aria', 'Open {group} links', { group: t(group.labelKey, groupLabelFallbacks[group.labelKey] ?? group.id) })}>
                      {t(group.labelKey, groupLabelFallbacks[group.labelKey] ?? group.id)}
                    </summary>
                    <div className="site-nav__dropdown" role="list">
                      {group.items.map((item) => (
                        <a key={item.href} href={hrefFor(item.href)} role="listitem" aria-current={isActive(item, currentPath, currentHash) ? 'page' : undefined} onClick={closeNavigation}>{t(item.translationKey, item.label)}</a>
                      ))}
                    </div>
                  </details>
                );
              })}
            </div>
          </nav>

          <div className="site-header__tools"><LanguageSelector /></div>
          <button ref={mobileToggleRef} className="menu-toggle" type="button" aria-controls={mobileMenuId} aria-expanded={isMenuOpen} aria-label={isMenuOpen ? t('header.close_menu_aria', 'Close navigation menu') : t('header.open_menu_aria', 'Open navigation menu')} onClick={() => setIsMenuOpen((open) => !open)}>
            {isMenuOpen ? <X aria-hidden="true" size={22} /> : <Menu aria-hidden="true" size={22} />}
          </button>
        </div>
      </div>

      {isMenuOpen && <button className="mobile-nav-backdrop" type="button" aria-label={t('header.close_menu_aria', 'Close navigation menu')} onClick={closeNavigation} />}
      <div className="mobile-nav-panel" id={mobileMenuId} data-open={isMenuOpen} hidden={!isMenuOpen}>
        <nav className="site-nav site-nav--mobile-groups" aria-label={t('header.mobile_navigation_aria', 'Mobile primary navigation')}>
          <div className="site-nav__mobile-primary">
            {visiblePrimaryNavItems.map((item) => (
              <a key={item.href} href={hrefFor(item.href)} aria-current={isActive(item, currentPath, currentHash) ? 'page' : undefined} onClick={closeNavigation}>{t(item.translationKey, item.label)}</a>
            ))}
          </div>
          {visibleNavGroups.map((group) => {
            const groupActive = group.items.some((item) => isActive(item, currentPath, currentHash));
            return (
              <details key={group.id} className="site-nav__mobile-group" open={openMobileGroup === group.id} data-active={groupActive || undefined} onToggle={(event) => {
                if (event.currentTarget.open) setOpenMobileGroup(group.id);
                else setOpenMobileGroup((current) => current === group.id ? null : current);
              }}>
                <summary aria-expanded={openMobileGroup === group.id}>{t(group.labelKey, groupLabelFallbacks[group.labelKey] ?? group.id)}</summary>
                <div className="site-nav__mobile-group__links">
                  {group.items.map((item) => (
                    <a key={item.href} href={hrefFor(item.href)} aria-current={isActive(item, currentPath, currentHash) ? 'page' : undefined} onClick={closeNavigation}>{t(item.translationKey, item.label)}</a>
                  ))}
                </div>
              </details>
            );
          })}
        </nav>
        <div className="mobile-nav-panel__actions"><LanguageSelector /></div>
      </div>
    </header>
  );
}
