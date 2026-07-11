import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { navItems } from '../data/siteContent';

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const mobileMenuId = 'mobile-navigation';

  const closeMobileMenu = () => setIsMenuOpen(false);
  const toggleMobileMenu = () => setIsMenuOpen((isOpen) => !isOpen);

  return (
    <header className="site-header">
      <div className="site-header__bar">
        <a className="brand" href="#top" aria-label="Bankrupt to 1 Million home" onClick={closeMobileMenu}>
          <span className="brand__mark">B1M</span>
          <span className="brand__text">Bankrupt to 1 Million</span>
        </a>

        <nav className="site-nav site-nav--desktop" aria-label="Primary navigation">
          {navItems.map((item) => (
            <a key={item.href} href={item.href}>
              {item.label}
            </a>
          ))}
        </nav>

        <a className="button button--small site-header__cta" href="https://github.com/MyMindVentures/BankruptTo1Million/issues">
          View Issues
        </a>

        <button
          className="menu-toggle"
          type="button"
          aria-controls={mobileMenuId}
          aria-expanded={isMenuOpen}
          aria-label={isMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          onClick={toggleMobileMenu}
        >
          {isMenuOpen ? <X aria-hidden="true" size={22} /> : <Menu aria-hidden="true" size={22} />}
        </button>
      </div>

      <div className="mobile-nav-panel" id={mobileMenuId} data-open={isMenuOpen} hidden={!isMenuOpen}>
        <nav className="site-nav site-nav--mobile" aria-label="Mobile primary navigation">
          {navItems.map((item) => (
            <a key={item.href} href={item.href} onClick={closeMobileMenu}>
              {item.label}
            </a>
          ))}
        </nav>
        <a className="button button--small" href="https://github.com/MyMindVentures/BankruptTo1Million/issues" onClick={closeMobileMenu}>
          View Issues
        </a>
      </div>
    </header>
  );
}
