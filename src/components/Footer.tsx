import { ArrowRight, ArrowUp, ArrowUpRight, Github, MapPin, ShieldCheck } from 'lucide-react';
import { useWebsiteI18n } from '../lib/websiteI18n';

const footerGroups = [
  {
    title: 'Explore',
    titleKey: 'footer.groups.explore',
    links: [
      { label: 'Home', key: 'footer.links.home', href: '/#top' },
      { label: 'Our Story', key: 'footer.links.our_story', href: '/#story' },
      { label: 'Platform Vision', key: 'footer.links.platform_vision', href: '/#platform' },
      { label: 'Roadmap', key: 'footer.links.roadmap', href: '/#roadmap' },
      { label: 'Journal', key: 'footer.links.journal', href: '/journal' },
      { label: 'Media Vault', key: 'footer.links.media', href: '/media' },
      { label: 'Proof of Mind', key: 'footer.links.proof_of_mind', href: '/proof-of-mind' },
      { label: 'Break the Circle', key: 'footer.links.break_the_circle', href: '/break-the-circle' },
    ],
  },
  {
    title: 'Participate',
    titleKey: 'footer.groups.participate',
    links: [
      { label: 'Support the Mission', key: 'footer.links.support_mission', href: '/support' },
      { label: 'Open Issues', key: 'footer.links.open_issues', href: '/issues' },
      { label: 'Founding Heroes', key: 'footer.links.founding_heroes', href: '/founding-heroes' },
      { label: 'Become a Founding Hero', key: 'footer.links.become_founding_hero', href: '/become-a-founding-hero' },
      { label: 'Contributor Profile', key: 'footer.links.contributor_profile', href: '/profile/issues' },
      { label: 'Impact Dashboard', key: 'footer.links.impact_dashboard', href: '/impact' },
    ],
  },
  {
    title: 'Legal & Transparency',
    titleKey: 'footer.groups.legal_transparency',
    links: [
      { label: 'Legal Overview', key: 'footer.links.legal_overview', href: '/legal' },
      { label: 'Ownership & IP Notice', key: 'footer.links.ownership_ip_notice', href: '/legal#ownership' },
      { label: 'Terms of Use', key: 'footer.links.terms_of_use', href: '/legal#terms' },
      { label: 'Privacy Policy', key: 'footer.links.privacy_policy', href: '/legal#privacy' },
      { label: 'Public Mission Statement', key: 'footer.links.public_mission_statement', href: '/legal#mission' },
      { label: 'Source Repository', key: 'footer.links.source_repository', href: 'https://github.com/MyMindVentures/BankruptTo1Million', external: true },
    ],
  },
] as const;

export function Footer() {
  const year = new Date().getFullYear();
  const { t } = useWebsiteI18n();

  return (
    <footer className="site-footer" aria-labelledby="footer-title">
      <div className="site-footer__ambient" aria-hidden="true" />

      <div className="site-footer__inner">
        <section className="site-footer__brand-panel">
          <p className="site-footer__kicker">{t('footer.mission.kicker', 'A public rebuild in motion')}</p>

          <a
            className="site-footer__brand"
            href="/#top"
            aria-label={t('header.brand_home_aria', 'Bankrupt to 1 Million home')}
          >
            <span className="brand__mark site-footer__logo-mark" aria-hidden="true">B1M</span>
            <span className="site-footer__brand-copy">
              <strong id="footer-title">Bankrupt to 1 Million</strong>
              <small>{t('footer.mission.tagline', 'From financial rock bottom to freedom — built in public.')}</small>
            </span>
          </a>

          <p className="site-footer__mission">{t(
            'footer.mission.description',
            'A transparent founder journey, venture archive and community mission by Kevin De Vlieger and Micha. Built around honest progress, useful work and the belief that no one rebuilds alone.',
          )}</p>

          <div className="site-footer__primary-links">
            <a href="/support">
              {t('footer.actions.support', 'Support the mission')}
              <ArrowRight size={16} aria-hidden="true" />
            </a>
            <a href="/proof-of-mind">
              {t('footer.actions.explore_concepts', 'Explore the concepts')}
              <ArrowRight size={16} aria-hidden="true" />
            </a>
          </div>

          <div className="site-footer__trust">
            <a href="/legal#ownership">
              <ShieldCheck size={15} aria-hidden="true" />
              {t('footer.trust.original_concepts', 'Original concepts protected')}
            </a>
            <span>
              <MapPin size={15} aria-hidden="true" />
              {t('footer.trust.location', 'Based in Alicante, Spain')}
            </span>
          </div>
        </section>

        <nav
          className="site-footer__sitemap"
          aria-label={t('footer.accessibility.sitemap_aria', 'Complete website sitemap')}
        >
          {footerGroups.map((group) => {
            const groupId = `footer-${group.titleKey.replace(/[^a-z0-9]+/g, '-')}`;
            return (
              <section className="site-footer__group" key={group.titleKey} aria-labelledby={groupId}>
                <h2 id={groupId}>{t(group.titleKey, group.title)}</h2>
                <ul>
                  {group.links.map((link) => (
                    <li key={`${group.titleKey}-${link.href}`}>
                      <a
                        href={link.href}
                        {...('external' in link && link.external ? { target: '_blank', rel: 'noreferrer' } : {})}
                      >
                        <span>{t(link.key, link.label)}</span>
                        {'external' in link && link.external ? <ArrowUpRight size={13} aria-hidden="true" /> : null}
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </nav>
      </div>

      <div className="site-footer__bottom">
        <p>{t(
          'footer.bottom.copyright',
          '© {year} MyMindVentures.io · Kevin De Vlieger · Bankrupt to 1 Million',
          { year },
        )}</p>
        <div className="site-footer__bottom-links">
          <a href="https://github.com/MyMindVentures/BankruptTo1Million" target="_blank" rel="noreferrer">
            <Github size={15} aria-hidden="true" /> {t('footer.bottom.github', 'GitHub')}
          </a>
          <a href="/legal#privacy">{t('footer.bottom.privacy', 'Privacy')}</a>
          <a href="#top">
            {t('footer.bottom.back_to_top', 'Back to top')}
            <ArrowUp size={14} aria-hidden="true" />
          </a>
        </div>
      </div>
    </footer>
  );
}
