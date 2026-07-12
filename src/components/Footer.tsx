import { ArrowUp, ArrowUpRight, Github, HeartHandshake, MapPin, ShieldCheck } from 'lucide-react';

const footerGroups = [
  {
    title: 'Explore',
    links: [
      { label: 'Home', href: '/#top' },
      { label: 'Our Story', href: '/#story' },
      { label: 'Platform Vision', href: '/#platform' },
      { label: 'Roadmap', href: '/#roadmap' },
      { label: 'Journal', href: '/journal' },
      { label: 'Proof of Mind', href: '/proof-of-mind' },
      { label: 'Break the Circle', href: '/break-the-circle' },
    ],
  },
  {
    title: 'Participate',
    links: [
      { label: 'Support the Mission', href: '/support' },
      { label: 'Open Issues', href: '/issues' },
      { label: 'Founding Heroes', href: '/founding-heroes' },
      { label: 'Become a Founding Hero', href: '/become-a-founding-hero' },
      { label: 'Contributor Profile', href: '/profile/issues' },
      { label: 'Impact Dashboard', href: '/impact' },
    ],
  },
  {
    title: 'Legal & Transparency',
    links: [
      { label: 'Legal Overview', href: '/legal' },
      { label: 'Ownership & IP Notice', href: '/legal#ownership' },
      { label: 'Terms of Use', href: '/legal#terms' },
      { label: 'Privacy Policy', href: '/legal#privacy' },
      { label: 'Public Mission Statement', href: '/legal#mission' },
      { label: 'Source Repository', href: 'https://github.com/MyMindVentures/BankruptTo1Million', external: true },
    ],
  },
] as const;

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer" aria-labelledby="footer-title">
      <div className="site-footer__glow" aria-hidden="true" />
      <div className="site-footer__inner">
        <section className="site-footer__intro">
          <a className="site-footer__brand" href="/#top" aria-label="Bankrupt to 1 Million home">
            <span className="brand__mark" aria-hidden="true">B1M</span>
            <span>
              <strong id="footer-title">Bankrupt to 1 Million</strong>
              <small>From financial rock bottom to freedom — built in public.</small>
            </span>
          </a>

          <p>
            A transparent founder journey, venture archive and community mission by Kevin De Vlieger and Micha.
            Built around honest progress, useful work and the belief that no one rebuilds alone.
          </p>

          <div className="site-footer__trust">
            <a href="/legal#ownership"><ShieldCheck size={16} aria-hidden="true" /> Original concepts protected</a>
            <span><MapPin size={16} aria-hidden="true" /> Based in Alicante, Spain</span>
          </div>

          <div className="site-footer__actions">
            <a className="button" href="/support">
              <HeartHandshake size={18} aria-hidden="true" /> Support the mission
            </a>
            <a className="button button--ghost" href="/proof-of-mind">
              Explore the concepts <ArrowUpRight size={16} aria-hidden="true" />
            </a>
          </div>
        </section>

        <nav className="site-footer__sitemap" aria-label="Complete website sitemap">
          {footerGroups.map((group) => (
            <section className="site-footer__group" key={group.title} aria-labelledby={`footer-${group.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}>
              <h2 id={`footer-${group.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}>{group.title}</h2>
              <ul>
                {group.links.map((link) => (
                  <li key={`${group.title}-${link.href}`}>
                    <a
                      href={link.href}
                      {...('external' in link && link.external ? { target: '_blank', rel: 'noreferrer' } : {})}
                    >
                      <span>{link.label}</span>
                      {'external' in link && link.external ? <ArrowUpRight size={14} aria-hidden="true" /> : null}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </nav>
      </div>

      <div className="site-footer__bottom">
        <p>© {year} MyMindVentures.io · Kevin De Vlieger · Bankrupt to 1 Million</p>
        <div className="site-footer__bottom-links">
          <a href="https://github.com/MyMindVentures/BankruptTo1Million" target="_blank" rel="noreferrer">
            <Github size={16} aria-hidden="true" /> GitHub
          </a>
          <a href="/legal#ownership">Ownership notice</a>
          <a href="/legal#privacy">Privacy</a>
          <a href="#top"><ArrowUp size={15} aria-hidden="true" /> Back to top</a>
        </div>
      </div>
    </footer>
  );
}
