import { Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { navGroups, primaryNavItems } from '../data/siteContent';
import type { NavItem } from '../data/siteContent';
import { RouterLink, useRouter } from '../lib/clientRouter';
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
  'navigation.group.community': 'People & work',
  'navigation.group.participate': 'Join & support',
};

const allNavigationItems = [...primaryNavItems, ...navGroups.flatMap((group) => group.items)];
const navigationItemByHref = new Map(allNavigationItems.map((item) => [item.href, item]));

function navigationItems(hrefs: string[]): NavItem[] {
  return hrefs
    .map((href) => navigationItemByHref.get(href))
    .filter((item): item is NavItem => Boolean(item));
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
    items: navigationItems(['/break-the-circle', '/founder-support', '/issues']),
  },
].filter((group) => group.items.length > 0);

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const { t } = useWebsiteI18n();
  const router = useRouter();
  const mobileMenuId = 'mobile-navigation';
  const closeMobileMenu = () => setIsMenuOpen(false);
  const toggleMobileMenu = () => setIsMenuOpen((isOpen) => !isOpen);
  const isItemActive = (item: NavItem) => router.isActive(item.href, item.href === '/#top');
  const isGroupActive = (items: NavItem[]) => items.some(isItemActive);

  useEffect(() => {
    closeMobileMenu();
  }, [router.location.key]);

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
          <RouterLink className="brand" to="/#top" aria-label={t('header.brand_home_aria', 'Bankrupt to 1 Million home')}>
            <span className="brand__mark"><MissionLogo eager decorative /></span>
            <span className="brand__text">Bankrupt to 1 Million</span>
          </RouterLink>
          <nav className="site-nav site-nav--desktop" aria-label={t('header.primary_navigation_aria', 'Primary navigation')}>
            <div className="site-nav--primary">
              {visiblePrimaryNavItems.map((item) => (
                <RouterLink key={item.href} to={item.href} aria-current={isItemActive(item) ? 'page' : undefined}>
                  {t(item.translationKey, item.label)}
                </RouterLink>
              ))}
              {visibleNavGroups.map((group) => (
                <details key={group.id} className="site-nav__group" data-active={isGroupActive(group.items)}>
                  <summary aria-label={t('header.nav_group_toggle_aria', 'Open {group} links', { group: t(group.labelKey, groupLabelFallbacks[group.labelKey] ?? group.id) })}>
                    {t(group.labelKey, groupLabelFallbacks[group.labelKey] ?? group.id)}
                  </summary>
                  <div className="site-nav__dropdown" role="list">
                    {group.items.map((item) => (
                      <RouterLink key={item.href} to={item.href} role="listitem" aria-current={isItemActive(item) ? 'page' : undefined}>
                        {t(item.translationKey, item.label)}
                      </RouterLink>
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
              <RouterLink key={item.href} to={item.href} aria-current={isItemActive(item) ? 'page' : undefined}>
                {t(item.translationKey, item.label)}
              </RouterLink>
            ))}
          </div>
          {visibleNavGroups.map((group) => (
            <details key={group.id} className="site-nav__mobile-group" open={isGroupActive(group.items)}>
              <summary>{t(group.labelKey, groupLabelFallbacks[group.labelKey] ?? group.id)}</summary>
              <div className="site-nav__mobile-group__links">
                {group.items.map((item) => (
                  <RouterLink key={item.href} to={item.href} aria-current={isItemActive(item) ? 'page' : undefined}>
                    {t(item.translationKey, item.label)}
                  </RouterLink>
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
