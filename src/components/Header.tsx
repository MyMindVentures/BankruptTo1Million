import { navItems } from '../data/siteContent';

export function Header() {
  return (
    <header className="site-header">
      <a className="brand" href="#top" aria-label="Bankrupt to 1 Million home">
        <span className="brand__mark">B1M</span>
        <span className="brand__text">Bankrupt to 1 Million</span>
      </a>
      <nav className="site-nav" aria-label="Primary navigation">
        {navItems.map((item) => (
          <a key={item.href} href={item.href}>
            {item.label}
          </a>
        ))}
      </nav>
      <a className="button button--small" href="https://github.com/MyMindVentures/BankruptTo1Million/issues">
        View Issues
      </a>
    </header>
  );
}
