import { ArrowRight, ArrowUp, ArrowUpRight, Github, MapPin, ShieldCheck } from 'lucide-react';
import { footerGroups, homeLink, supportCta } from '../data/siteMap';
import type { I18nManifest } from '../lib/i18nManifest';
import { useWebsiteI18n } from '../lib/websiteI18n';

export const FOOTER_I18N_MANIFEST = {
  componentKey: 'shell.footer',
  namespace: 'footer',
  translationKeys: [
    'footer.mission.kicker',
    'footer.mission.tagline',
    'footer.mission.description',
    'footer.actions.support',
    'footer.actions.explore_concepts',
    'footer.trust.original_concepts',
    'footer.trust.location',
    'footer.accessibility.sitemap_aria',
    'footer.bottom.copyright',
    'footer.bottom.github',
    'footer.bottom.privacy',
    'footer.bottom.back_to_top',
    'header.brand_home_aria',
  ] as const,
  keyPatterns: [
    'footer.groups.*',
    'footer.links.*',
    'navigation.*',
  ] as const,
} as const satisfies I18nManifest;

function buildFooterHref(href: string): string {
  if (href.startsWith('http')) return href;

  const target = new URL(href, window.location.origin);
  const language = new URLSearchParams(window.location.search).get('lang');
  if (language && !target.searchParams.has('lang')) target.searchParams.set('lang', language);
  return `${target.pathname}${target.search}${target.hash}`;
}

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
            href={buildFooterHref(homeLink.href)}
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
            <a href={buildFooterHref(supportCta.href)}>
              {t('footer.actions.support', 'Support the mission')}
              <ArrowRight size={16} aria-hidden="true" />
            </a>
            <a href={buildFooterHref('/proof-of-mind')}>
              {t('footer.actions.explore_concepts', 'Explore the concepts')}
              <ArrowRight size={16} aria-hidden="true" />
            </a>
          </div>

          <div className="site-footer__trust">
            <a href={buildFooterHref('/legal#ownership')}>
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
            const groupId = `footer-${group.id}`;
            return (
              <section className="site-footer__group" key={group.id} aria-labelledby={groupId}>
                <h2 id={groupId}>{t(group.translationKey, group.label)}</h2>
                <ul>
                  {group.links.filter((link) => link.showInFooter).map((link) => (
                    <li key={`${group.id}-${link.id}`}>
                      <a
                        href={link.external ? link.href : buildFooterHref(link.href)}
                        {...(link.external ? { target: '_blank', rel: 'noreferrer' } : {})}
                      >
                        <span>{t(link.translationKey, link.label)}</span>
                        {link.external ? <ArrowUpRight size={13} aria-hidden="true" /> : null}
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
          <a href={buildFooterHref('/legal#privacy')}>{t('footer.bottom.privacy', 'Privacy')}</a>
          <a href={buildFooterHref('/#top')}>
            {t('footer.bottom.back_to_top', 'Back to top')}
            <ArrowUp size={14} aria-hidden="true" />
          </a>
        </div>
      </div>
    </footer>
  );
}
