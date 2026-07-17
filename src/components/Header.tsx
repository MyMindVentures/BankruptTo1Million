import { Menu, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { headerGroups, homeLink, supportCta } from '../data/siteMap';
import type { SiteLink } from '../data/siteMap';
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

function buildNavigationHref(href: string, currentSearch: string): string {
  const target = new URL(href, window.location.origin);
  const language = new URLSearchParams(currentSearch).get('lang');
  if (language && !target.searchParams.has('lang')) target.searchParams.set('lang', language);
  return `${target.pathname}${target.search}${target.hash}`;
}

function isLinkActive(link: SiteLink, currentPath: string): boolean {
  const targetPath = new URL(link.href, window.location.origin).pathname.replace(/\/$/, '') || '/';
  const normalizedCurrent = currentPath.replace(/\/$/, '') || '/';
  if (targetPath === '/') return normalizedCurrent === '/';
  return normalizedCurrent === targetPath || normalizedCurrent.startsWith(`${targetPath}/`);
}

function handleLinkListKeys(event: ReactKeyboardEvent<HTMLDivElement>) {
  if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
  const links = Array.from(event.currentTarget.querySelectorAll<HTMLAnchorElement>('a[href]'));
  if (!links.length) return;
  const currentIndex = links.indexOf(document.activeElement as HTMLAnchorElement);
  let nextIndex = currentIndex;
  if (event.key === 'Home') nextIndex = 0;
  if (event.key === 'End') nextIndex = links.length - 1;
  if (event.key === 'ArrowDown') nextIndex = currentIndex < links.length - 1 ? currentIndex + 1 : 0;
  if (event.key === 'ArrowUp') nextIndex = currentIndex > 0 ? currentIndex - 1 : links.length - 1;
  event.preventDefault();
  links[nextIndex]?.focus();
}

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [openDesktopGroup, setOpenDesktopGroup] = useState<string | null>(null);
  const [openMobileGroup, setOpenMobileGroup] = useState<string | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const desktopSummaryRefs = useRef<Record<string, HTMLElement | null>>({});
  const mobileToggleRef = useRef<HTMLButtonElement>(null);
  const { t } = useWebsiteI18n();
  const mobileMenuId = 'mobile-navigation';
  const currentSearch = typeof window === 'undefined' ? '' : window.location.search;
  const currentPath = typeof window === 'undefined' ? '/' : window.location.pathname;

  const hrefFor = useMemo(() => (href: string) => buildNavigationHref(href, currentSearch), [currentSearch]);

  const closeAllGroups = () => {
    setOpenDesktopGroup(null);
    setOpenMobileGroup(null);
  };
  const closeMobileMenu = () => {
    setIsMenuOpen(false);
    setOpenMobileGroup(null);
  };
  const closeNavigation = () => {
    closeAllGroups();
    setIsMenuOpen(false);
  };

  useEffect(() => {
    closeNavigation();
  }, [currentPath, currentSearch]);

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
      const groupToRestore = openDesktopGroup;
      const mobileWasOpen = isMenuOpen;
      closeNavigation();
      window.requestAnimationFrame(() => {
        if (groupToRestore) desktopSummaryRefs.current[groupToRestore]?.focus();
        else if (mobileWasOpen) mobileToggleRef.current?.focus();
      });
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isMenuOpen, openDesktopGroup]);

  useEffect(() => {
    if (!isMenuOpen) return undefined;
    const onResize = () => {
      if (window.innerWidth > 1024) closeMobileMenu();
    };
    const previousOverflow = document.body.style.overflow;
    const previousPadding = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`;
    window.addEventListener('resize', onResize);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPadding;
      window.removeEventListener('resize', onResize);
    };
  }, [isMenuOpen]);

  return (
    <header ref={headerRef} className="site-header" data-scrolled={isScrolled || undefined}>
      <div className="site-header__inner">
        <div className="site-header__bar">
          <a className="brand" href={hrefFor(homeLink.href)} aria-label={t('header.brand_home_aria', 'Bankrupt to 1 Million home')} aria-current={isLinkActive(homeLink, currentPath) ? 'page' : undefined} onClick={closeNavigation}>
            <span className="brand__mark"><MissionLogo eager decorative /></span>
            <span className="brand__text">Bankrupt to 1 Million</span>
          </a>

          <nav className="site-nav site-nav--desktop" aria-label={t('header.primary_navigation_aria', 'Primary navigation')}>
            <div className="site-nav--primary">
              <a href={hrefFor(homeLink.href)} aria-current={isLinkActive(homeLink, currentPath) ? 'page' : undefined} onClick={closeAllGroups}>{t(homeLink.translationKey, homeLink.label)}</a>
              {headerGroups.map((group) => {
                const groupActive = group.links.some((link) => isLinkActive(link, currentPath));
                const dropdownId = `desktop-nav-${group.id}`;
                return (
                  <details key={group.id} className="site-nav__group" open={openDesktopGroup === group.id} data-active={groupActive || undefined} onToggle={(event) => {
                    const isOpen = event.currentTarget.open;
                    setOpenDesktopGroup(isOpen ? group.id : (current) => current === group.id ? null : current);
                  }}>
                    <summary ref={(node) => { desktopSummaryRefs.current[group.id] = node; }} aria-controls={dropdownId} aria-expanded={openDesktopGroup === group.id} aria-label={t('header.nav_group_toggle_aria', 'Open {group} links', { group: t(group.translationKey, group.label) })} onKeyDown={(event) => {
                      if (event.key === 'ArrowDown') {
                        event.preventDefault();
                        setOpenDesktopGroup(group.id);
                        window.requestAnimationFrame(() => document.querySelector<HTMLAnchorElement>(`#${dropdownId} a`)?.focus());
                      }
                    }}>
                      {t(group.translationKey, group.label)}
                    </summary>
                    <div id={dropdownId} className="site-nav__dropdown" role="list" onKeyDown={handleLinkListKeys}>
                      {group.links.filter((link) => link.showInHeader).map((link) => (
                        <a key={link.id} href={hrefFor(link.href)} role="listitem" aria-current={isLinkActive(link, currentPath) ? 'page' : undefined} onClick={closeAllGroups}>{t(link.translationKey, link.label)}</a>
                      ))}
                    </div>
                  </details>
                );
              })}
              <a className="site-nav__cta" href={hrefFor(supportCta.href)} aria-current={isLinkActive(supportCta, currentPath) ? 'page' : undefined} onClick={closeAllGroups}>{t(supportCta.translationKey, supportCta.label)}</a>
            </div>
          </nav>

          <div className="site-header__tools"><LanguageSelector /></div>
          <button ref={mobileToggleRef} className="menu-toggle" type="button" aria-controls={mobileMenuId} aria-expanded={isMenuOpen} aria-label={isMenuOpen ? t('header.close_menu_aria', 'Close navigation menu') : t('header.open_menu_aria', 'Open navigation menu')} onClick={() => setIsMenuOpen((open) => { if (open) setOpenMobileGroup(null); return !open; })}>
            {isMenuOpen ? <X aria-hidden="true" size={22} /> : <Menu aria-hidden="true" size={22} />}
          </button>
        </div>
      </div>

      {isMenuOpen && <button className="mobile-nav-backdrop" type="button" aria-label={t('header.close_menu_aria', 'Close navigation menu')} onClick={closeMobileMenu} />}
      <div className="mobile-nav-panel" id={mobileMenuId} data-open={isMenuOpen} hidden={!isMenuOpen}>
        <nav className="site-nav site-nav--mobile-groups" aria-label={t('header.mobile_navigation_aria', 'Mobile primary navigation')}>
          <div className="site-nav__mobile-primary">
            <a href={hrefFor(homeLink.href)} aria-current={isLinkActive(homeLink, currentPath) ? 'page' : undefined} onClick={closeNavigation}>{t(homeLink.translationKey, homeLink.label)}</a>
            <a className="site-nav__cta" href={hrefFor(supportCta.href)} aria-current={isLinkActive(supportCta, currentPath) ? 'page' : undefined} onClick={closeNavigation}>{t(supportCta.translationKey, supportCta.label)}</a>
          </div>
          {headerGroups.map((group) => {
            const groupActive = group.links.some((link) => isLinkActive(link, currentPath));
            const groupId = `mobile-nav-${group.id}`;
            return (
              <details key={group.id} className="site-nav__mobile-group" open={openMobileGroup === group.id} data-active={groupActive || undefined} onToggle={(event) => {
                const isOpen = event.currentTarget.open;
                setOpenMobileGroup(isOpen ? group.id : (current) => current === group.id ? null : current);
              }}>
                <summary aria-controls={groupId} aria-expanded={openMobileGroup === group.id}>{t(group.translationKey, group.label)}</summary>
                <div id={groupId} className="site-nav__mobile-group__links" onKeyDown={handleLinkListKeys}>
                  {group.links.filter((link) => link.showInHeader).map((link) => (
                    <a key={link.id} href={hrefFor(link.href)} aria-current={isLinkActive(link, currentPath) ? 'page' : undefined} onClick={closeNavigation}>{t(link.translationKey, link.label)}</a>
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
