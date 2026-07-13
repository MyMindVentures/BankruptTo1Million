import { ArrowRight, CheckCircle2, HeartHandshake, Users } from 'lucide-react';
import { SectionHeading } from '../components/SectionHeading';
import { platformFeatures, roadmap } from '../data/siteContent';
import { useWebsiteI18n } from '../lib/websiteI18n';

export function HomePage() {
  const { t } = useWebsiteI18n();

  return (
    <main id="top">
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
            'Kevin De Vlieger and Micha are starting from financial rock bottom and choosing to build publicly instead of waiting for a perfect moment.',
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
        <div className="feature-grid">
          {platformFeatures.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <article className="feature-card" key={feature.title}>
                <Icon aria-hidden="true" />
                <h3>{t(`home.platform.feature_${index + 1}.title`, feature.title)}</h3>
                <p>{t(`home.platform.feature_${index + 1}.description`, feature.description)}</p>
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
        <ol className="roadmap-list">
          {roadmap.map((item, index) => (
            <li key={item.phase}>
              <span>{t(`home.roadmap.item_${index + 1}.phase`, item.phase)}</span>
              <h3>{t(`home.roadmap.item_${index + 1}.title`, item.title)}</h3>
              <p>{t(`home.roadmap.item_${index + 1}.description`, item.description)}</p>
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
        <div className="contribute__actions">
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
