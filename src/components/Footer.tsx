import { ArrowUpRight, HeartHandshake } from 'lucide-react';
import { navItems } from '../data/siteContent';

export function Footer() {
  return (
    <footer className="site-footer" aria-labelledby="footer-title">
      <div className="site-footer__brand">
        <span className="brand__mark" aria-hidden="true">B1M</span>
        <div>
          <h2 id="footer-title">Bankrupt to 1 Million</h2>
          <p>A public rebuild told with honesty, useful work and human connection.</p>
        </div>
      </div>
      <nav className="site-footer__nav" aria-label="Footer navigation">
        {navItems.map((item) => <a key={item.href} href={item.href}>{item.label}</a>)}
      </nav>
      <a className="site-footer__mission" href="/support">
        <HeartHandshake aria-hidden="true" size={18} /> Support the mission <ArrowUpRight aria-hidden="true" size={16} />
      </a>
    </footer>
  );
}
