import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { navItems } from '../data/siteContent';
import { useWebsiteI18n } from '../lib/websiteI18n';
import { LanguageSelector } from './LanguageSelector';

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const { t } = useWebsiteI18n();
  const mobileMenuId = 'mobile-navigation';

  const closeMobileMenu = () => setIsMenuOpen(false);
  const toggleMobileMenu = () => setIsMenuOpen((isOpen) => !isOpen);

  return (
    <header className="site-header">
      <div className="site-header__bar">
        <a
          className="brand"
          href="/#top"
          aria-label={t('header.brand_home_aria', 'Bankrupt to 1 Million home')}
          onClick={closeMobileMenu}
        >
          <span className="brand__mark">B1M</span>
          <span className="brand__text">Bankrupt to 1 Million</span>
        </a>

        <nav
          className="site-nav site-nav--desktop"
          aria-label={t('header.primary_navigation_aria', 'Primary navigation')}
        >
          {navItems.map((item) => (
            <a key={item.href} href={item.href}>
              {t(item.translationKey, item.label)}
            </a>
          ))}
        </nav>

        <div className="site-header__tools">
          <LanguageSelector />
          <a className="button button--small site-header__cta" href="/issues">
            {t('header.view_issues', 'View Issues')}
          </a>
        </div>

        <button
          className="menu-toggle"
          type="button"
          aria-controls={mobileMenuId}
          aria-expanded={isMenuOpen}
          aria-label={isMenuOpen
            ? t('header.close_menu_aria', 'Close navigation menu')
            : t('header.open_menu_aria', 'Open navigation menu')}
          onClick={toggleMobileMenu}
        >
          {isMenuOpen ? <X aria-hidden="true" size={22} /> : <Menu aria-hidden="true" size={22} />}
        </button>
      </div>

      <div className="mobile-nav-panel" id={mobileMenuId} data-open={isMenuOpen} hidden={!isMenuOpen}>
        <nav
          className="site-nav site-nav--mobile"
          aria-label={t('header.mobile_navigation_aria', 'Mobile primary navigation')}
        >
          {navItems.map((item) => (
            <a key={item.href} href={item.href} onClick={closeMobileMenu}>
              {t(item.translationKey, item.label)}
            </a>
          ))}
        </nav>
        <div className="mobile-nav-panel__actions">
          <LanguageSelector />
          <a className="button button--small" href="/issues" onClick={closeMobileMenu}>
            {t('header.view_issues', 'View Issues')}
          </a>
        </div>
      </div>
    </header>
  );
}
