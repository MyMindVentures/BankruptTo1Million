import { Menu, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { headerGroups, homeLink, supportCta } from '../data/siteMap';
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
  keyPatterns: [
    'navigation.*',
    'navigation.group.*',
  ] as const,
} as const satisfies I18nManifest;

function buildNavigationHref(href: string, currentSearch: string): string {
  const target = new URL(href, window.location.origin);
  const language = new URLSearchParams(currentSearch).get('lang');

  if (language && !target.searchParams.has('lang')) {
    target.searchParams.set('lang', language);
  }

  return `${target.pathname}${target.search}${target.hash}`;
}

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const [openDesktopGroup, setOpenDesktopGroup] = useState<string | null>(null);
  const [openMobileGroup, setOpenMobileGroup] = useState<string | null>(null);
  const { t } = useWebsiteI18n();
  const mobileMenuId = 'mobile-navigation';

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

  const toggleMobileMenu = () => {
    setIsMenuOpen((isOpen) => {
      if (isOpen) setOpenMobileGroup(null);
      return !isOpen;
    });
  };

  const currentSearch = typeof window === 'undefined' ? '' : window.location.search;

  const hrefFor = useMemo(
    () => (href: string) => buildNavigationHref(href, currentSearch),
    [currentSearch],
  );

  useEffect(() => {
    if (!isMenuOpen) return undefined;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeNavigation();
    };
    const onResize = () => {
      if (window.innerWidth > 1024) closeMobileMenu();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', onResize);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', onResize);
    };
  }, [isMenuOpen]);

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <div className="site-header__bar">
          <a className="brand" href={hrefFor(homeLink.href)} aria-label={t('header.brand_home_aria', 'Bankrupt to 1 Million home')} onClick={closeNavigation}>
            <span className="brand__mark"><MissionLogo eager decorative /></span>
            <span className="brand__text">Bankrupt to 1 Million</span>
          </a>

          <nav className="site-nav site-nav--desktop" aria-label={t('header.primary_navigation_aria', 'Primary navigation')}>
            <div className="site-nav--primary">
              <a href={hrefFor(homeLink.href)} onClick={closeAllGroups}>{t(homeLink.translationKey, homeLink.label)}</a>
              {headerGroups.map((group) => (
                <details
                  key={group.id}
                  className="site-nav__group"
                  open={openDesktopGroup === group.id}
                  onToggle={(event) => {
                    const isOpen = event.currentTarget.open;
                    setOpenDesktopGroup(isOpen ? group.id : (current) => current === group.id ? null : current);
                  }}
                >
                  <summary aria-label={t('header.nav_group_toggle_aria', 'Open {group} links', { group: t(group.translationKey, group.label) })}>
                    {t(group.translationKey, group.label)}
                  </summary>
                  <div className="site-nav__dropdown" role="list">
                    {group.links.filter((link) => link.showInHeader).map((link) => (
                      <a key={link.id} href={hrefFor(link.href)} role="listitem" onClick={closeAllGroups}>
                        {t(link.translationKey, link.label)}
                      </a>
                    ))}
                  </div>
                </details>
              ))}
              <a className="site-nav__cta" href={hrefFor(supportCta.href)} onClick={closeAllGroups}>
                {t(supportCta.translationKey, supportCta.label)}
              </a>
            </div>
          </nav>

          <div className="site-header__tools"><LanguageSelector /></div>
          <button className="menu-toggle" type="button" aria-controls={mobileMenuId} aria-expanded={isMenuOpen} aria-label={isMenuOpen ? t('header.close_menu_aria', 'Close navigation menu') : t('header.open_menu_aria', 'Open navigation menu')} onClick={toggleMobileMenu}>
            {isMenuOpen ? <X aria-hidden="true" size={22} /> : <Menu aria-hidden="true" size={22} />}
          </button>
        </div>
      </div>

      {isMenuOpen && <button className="mobile-nav-backdrop" type="button" aria-label={t('header.close_menu_aria', 'Close navigation menu')} onClick={closeMobileMenu} />}
      <div className="mobile-nav-panel" id={mobileMenuId} data-open={isMenuOpen} hidden={!isMenuOpen}>
        <nav className="site-nav site-nav--mobile-groups" aria-label={t('header.mobile_navigation_aria', 'Mobile primary navigation')}>
          <div className="site-nav__mobile-primary">
            <a href={hrefFor(homeLink.href)} onClick={closeNavigation}>{t(homeLink.translationKey, homeLink.label)}</a>
            <a className="site-nav__cta" href={hrefFor(supportCta.href)} onClick={closeNavigation}>{t(supportCta.translationKey, supportCta.label)}</a>
          </div>
          {headerGroups.map((group) => (
            <details
              key={group.id}
              className="site-nav__mobile-group"
              open={openMobileGroup === group.id}
              onToggle={(event) => {
                const isOpen = event.currentTarget.open;
                setOpenMobileGroup(isOpen ? group.id : (current) => current === group.id ? null : current);
              }}
            >
              <summary>{t(group.translationKey, group.label)}</summary>
              <div className="site-nav__mobile-group__links">
                {group.links.filter((link) => link.showInHeader).map((link) => (
                  <a key={link.id} href={hrefFor(link.href)} onClick={closeNavigation}>{t(link.translationKey, link.label)}</a>
                ))}
              </div>
            </details>
          ))}
        </nav>
        <div className="mobile-nav-panel__actions"><LanguageSelector /></div>
      </div>
    </header>
  );
}
