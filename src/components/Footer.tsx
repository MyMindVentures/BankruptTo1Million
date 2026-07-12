import { ArrowUpRight, HeartHandshake } from 'lucide-react';
import { navItems } from '../data/siteContent';

const disclaimerHref = '/break-the-circle/what-this-journey-is-and-what-it-is-not';

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
      <div className="site-footer__sitemap">
        <p className="eyebrow">Sitemap</p>
        <nav className="site-footer__nav" aria-label="Website sitemap">
          {navItems.map((item) => <a key={item.href} href={item.href}>{item.label}</a>)}
          <a href={disclaimerHref}>Disclaimer</a>
        </nav>
      </div>
      <a className="site-footer__mission" href="/support">
        <HeartHandshake aria-hidden="true" size={18} /> Support the mission <ArrowUpRight aria-hidden="true" size={16} />
      </a>
    </footer>
  );
}
