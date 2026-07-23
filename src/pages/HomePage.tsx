import { ArrowRight, CheckCircle2, HeartHandshake, Users } from 'lucide-react';
import { useEffect } from 'react';
import { SectionHeading } from '../components/SectionHeading';
import { platformFeatures, roadmap } from '../data/siteContent';
import type { I18nManifest } from '../lib/i18nManifest';
import { useWebsiteI18n } from '../lib/websiteI18n';

export const HOME_PAGE_I18N_MANIFEST = {
  componentKey: 'page.home',
  namespace: 'home',
  translationKeys: [
    'home.seo.title',
    'home.seo.description',
    'home.page_aria',
    'home.hero.eyebrow',
    'home.hero.title',
    'home.hero.description',
    'home.hero.actions_aria',
    'home.hero.primary_cta',
    'home.hero.secondary_cta',
    'home.hero.card_aria',
    'home.hero.card_quote',
    'home.hero.card_description',
    'home.story.eyebrow',
    'home.story.title',
    'home.story.description',
    'home.story.body_one',
    'home.story.body_two',
    'home.platform.eyebrow',
    'home.platform.title',
    'home.platform.description',
    'home.platform.features_aria',
    'home.roadmap.eyebrow',
    'home.roadmap.title',
    'home.roadmap.description',
    'home.roadmap.list_aria',
    'home.contribute.eyebrow',
    'home.contribute.title',
    'home.contribute.description',
    'home.contribute.actions_aria',
    'home.contribute.primary_cta',
    'home.contribute.secondary_cta',
  ] as const,
  keyPatterns: [
    'home.platform.features.*',
    'home.roadmap.items.*',
  ] as const,
} as const satisfies I18nManifest;

function setMetaDescription(content: string) {
  let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'description';
    document.head.appendChild(meta);
  }
  meta.content = content;
}

export function HomePage() {
  const { t } = useWebsiteI18n();

  const pageTitle = t('home.seo.title', 'Bankrupt to 1 Million — Rebuilding in public');
  const pageDescription = t(
    'home.seo.description',
    'Follow the honest public journey from financial rock bottom toward momentum, community and new ventures.',
  );

  useEffect(() => {
    document.title = pageTitle;
    setMetaDescription(pageDescription);
  }, [pageDescription, pageTitle]);

  return (
    <main id="top" aria-label={t('home.page_aria', 'Bankrupt to 1 Million homepage')}>
      <section className="hero section-grid" aria-labelledby="hero-title">
        <div className="hero__content">
          <p className="eyebrow">
            {t('home.hero.eyebrow', 'More than rebuilding a life. Building a movement.')}
          </p>
          <h1 id="hero-title">
            {t('home.hero.title', 'Building in public from financial rock bottom.')}
          </h1>
          <p className="hero__lede">
            {t(
              'home.hero.description',
              'Bankrupt to 1 Million is a living documentary, community platform and venture story about rebuilding honestly — one story, one connection and one feature at a time.',
            )}
          </p>
          <div
            className="hero__actions"
            aria-label={t('home.hero.actions_aria', 'Primary calls to action')}
          >
            <a className="button" href="/issues">
              {t('home.hero.primary_cta', 'Browse contribution issues')}{' '}
              <ArrowRight aria-hidden="true" size={18} />
            </a>
            <a className="button button--ghost" href="/support">
              {t('home.hero.secondary_cta', 'Support our mission')}
            </a>
          </div>
        </div>
        <aside
          className="hero-card"
          aria-label={t('home.hero.card_aria', 'Project belief')}
        >
          <HeartHandshake aria-hidden="true" />
          <blockquote>{t('home.hero.card_quote', 'No one rebuilds alone.')}</blockquote>
          <p>
            {t(
              'home.hero.card_description',
              'The platform exists to help the right people find each other through trust, collaboration and human connection.',
            )}
          </p>
        </aside>
      </section>

      <section className="section section-grid" id="story" aria-labelledby="story-title">
        <SectionHeading
          eyebrow={t('home.story.eyebrow', 'The story')}
          title={t('home.story.title', 'A real journey in progress')}
          titleId="story-title"
        >
          {t(
            'home.story.description',
            'Kevin and Micha are starting from financial rock bottom and choosing to build publicly instead of waiting for a perfect moment.',
          )}
        </SectionHeading>
        <div className="story-panel">
          <p>
            {t(
              'home.story.body_one',
              'This website is designed to feel human, cinematic, editorial and warm — a credible home for transparent founder updates, contribution opportunities, documentary moments and future ventures.',
            )}
          </p>
          <p>
            {t(
              'home.story.body_two',
              'The goal is not to manufacture a polished success story after the fact. The goal is to invite builders, creators, supporters and partners into the rebuild while the outcome is still being shaped.',
            )}
          </p>
        </div>
      </section>

      <section className="section" id="platform" aria-labelledby="platform-title">
        <SectionHeading
          eyebrow={t('home.platform.eyebrow', 'Platform vision')}
          title={t('home.platform.title', 'The full product scaffold')}
          titleId="platform-title"
        >
          {t(
            'home.platform.description',
            'The long-term platform combines storytelling, community recognition, partnership pathways and a public roadmap into one coherent experience.',
          )}
        </SectionHeading>
        <div
          className="feature-grid"
          aria-label={t('home.platform.features_aria', 'Platform features')}
        >
          {platformFeatures.map((feature) => {
            const Icon = feature.icon;
            return (
              <article className="feature-card" key={feature.translationKey}>
                <Icon aria-hidden="true" />
                <h3>{t(`${feature.translationKey}.title`, feature.title)}</h3>
                <p>{t(`${feature.translationKey}.description`, feature.description)}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="section section-grid" id="roadmap" aria-labelledby="roadmap-title">
        <SectionHeading
          eyebrow={t('home.roadmap.eyebrow', 'Build path')}
          title={t('home.roadmap.title', 'Progressive, issue-led growth')}
          titleId="roadmap-title"
        >
          {t(
            'home.roadmap.description',
            'The scaffold supports small, focused contributions today while leaving room for future pages, integrations and content systems.',
          )}
        </SectionHeading>
        <ol
          className="roadmap-list"
          aria-label={t('home.roadmap.list_aria', 'Public build roadmap')}
        >
          {roadmap.map((item) => (
            <li key={item.translationKey}>
              <span>{t(`${item.translationKey}.phase`, item.phase)}</span>
              <h3>{t(`${item.translationKey}.title`, item.title)}</h3>
              <p>{t(`${item.translationKey}.description`, item.description)}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="section contribute" id="contribute" aria-labelledby="contribute-title">
        <div>
          <p className="eyebrow">{t('home.contribute.eyebrow', 'Founding builders')}</p>
          <h2 id="contribute-title">
            {t('home.contribute.title', 'Build one meaningful feature.')}
          </h2>
          <p>
            {t(
              'home.contribute.description',
              'Contributors can help with components, pages, forms, accessibility, documentation, testing workflows, translations and future integrations. Every focused contribution becomes part of the public history of the movement.',
            )}
          </p>
        </div>
        <div
          className="contribute__actions"
          aria-label={t('home.contribute.actions_aria', 'Contribution calls to action')}
        >
          <a className="button" href="/issues">
            <Users aria-hidden="true" size={18} />{' '}
            {t('home.contribute.primary_cta', 'Browse open issues')}
          </a>
          <a
            className="button button--ghost"
            href="https://github.com/MyMindVentures/BankruptTo1Million#how-to-contribute"
          >
            <CheckCircle2 aria-hidden="true" size={18} />{' '}
            {t('home.contribute.secondary_cta', 'Contribution guide')}
          </a>
        </div>
      </section>
    </main>
  );
}
