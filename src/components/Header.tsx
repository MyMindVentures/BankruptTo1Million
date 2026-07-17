import { Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { navGroups, primaryNavItems } from '../data/siteContent';
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

const groupLabelFallbacks: Record<string, string> = {
  'navigation.group.explore': 'Explore',
  'navigation.group.community': 'Community',
  'navigation.group.participate': 'Participate',
};

const activePublicNavigationHrefs = new Set([
  '/#top',
  '/#story',
  '/#platform',
  '/#roadmap',
  '/journal',
  '/founders',
  '/offers',
  '/media',
  '/calendar',
  '/proof-of-mind',
  '/break-the-circle',
  '/founder-support',
  '/impact',
  '/issues',
]);

const visiblePrimaryNavItems = primaryNavItems.filter((item) => activePublicNavigationHrefs.has(item.href));
const visibleNavGroups = navGroups
  .map((group) => ({
    ...group,
    items: group.items.filter((item) => activePublicNavigationHrefs.has(item.href)),
  }))
  .filter((group) => group.items.length > 0);

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const { t } = useWebsiteI18n();
  const mobileMenuId = 'mobile-navigation';
  const closeMobileMenu = () => setIsMenuOpen(false);
  const toggleMobileMenu = () => setIsMenuOpen((isOpen) => !isOpen);

  useEffect(() => {
    if (!isMenuOpen) return undefined;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeMobileMenu();
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
          <a className="brand" href="/#top" aria-label={t('header.brand_home_aria', 'Bankrupt to 1 Million home')} onClick={closeMobileMenu}>
            <span className="brand__mark"><MissionLogo eager decorative /></span>
            <span className="brand__text">Bankrupt to 1 Million</span>
          </a>
          <nav className="site-nav site-nav--desktop" aria-label={t('header.primary_navigation_aria', 'Primary navigation')}>
            <div className="site-nav--primary">
              {visiblePrimaryNavItems.map((item) => (
                <a key={item.href} href={item.href}>{t(item.translationKey, item.label)}</a>
              ))}
              {visibleNavGroups.map((group) => (
                <details key={group.id} className="site-nav__group">
                  <summary aria-label={t('header.nav_group_toggle_aria', 'Open {group} links', { group: t(group.labelKey, groupLabelFallbacks[group.labelKey] ?? group.id) })}>
                    {t(group.labelKey, groupLabelFallbacks[group.labelKey] ?? group.id)}
                  </summary>
                  <div className="site-nav__dropdown" role="list">
                    {group.items.map((item) => (
                      <a key={item.href} href={item.href} role="listitem">{t(item.translationKey, item.label)}</a>
                    ))}
                  </div>
                </details>
              ))}
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
            {visiblePrimaryNavItems.map((item) => (
              <a key={item.href} href={item.href} onClick={closeMobileMenu}>{t(item.translationKey, item.label)}</a>
            ))}
          </div>
          {visibleNavGroups.map((group) => (
            <details key={group.id} className="site-nav__mobile-group">
              <summary>{t(group.labelKey, groupLabelFallbacks[group.labelKey] ?? group.id)}</summary>
              <div className="site-nav__mobile-group__links">
                {group.items.map((item) => (
                  <a key={item.href} href={item.href} onClick={closeMobileMenu}>{t(item.translationKey, item.label)}</a>
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
