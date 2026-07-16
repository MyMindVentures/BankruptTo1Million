import type { I18nManifest } from '../lib/i18nManifest';
import { ArrowRight, Award, CheckCircle2, Clock, ExternalLink, GitPullRequest, Sparkles, TrendingUp, Wrench } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Footer } from '../components/Footer';
import { Header } from '../components/Header';
import { SectionHeading } from '../components/SectionHeading';
import { supabase } from '../lib/supabase';
import { useWebsiteI18n } from '../lib/websiteI18n';
import '../styles/impactResults.css';

type ContributionItem = {
  number: number;
  title: string;
  url: string;
  category?: string;
  mergedAt?: string;
  closedAt?: string;
};

type Contributor = {
  login: string;
  displayName?: string;
  avatarUrl?: string;
  profileUrl: string;
  implementedIssues: ContributionItem[];
  mergedPullRequests: ContributionItem[];
  reviewsPerformed: number;
  featuresCompleted: number;
  bugFixesCompleted: number;
  firstContributionDate?: string;
  mostRecentContributionDate?: string;
  badges: Array<{ label: string; criteria: string }>;
};

type ImpactData = {
  refreshedAt: string;
  cacheTtlMinutes: number;
  stale: boolean;
  warning?: string;
  stats: {
    featuresCompleted: number;
    bugFixesCompleted: number;
    mergedPullRequests: number;
    testsPassed?: number | null;
  };
  contributors: Contributor[];
};

type PlatformUpdate = {
  id: string;
  slug: string;
  version: string | null;
  title: string;
  short_description: string;
  motivation: string;
  positive_impact: string;
  category: string;
  update_type: string;
  status: string;
  feature_area: string | null;
  effective_at: string;
  founder_name: string | null;
  founder_profile_url: string | null;
};

function formatDate(value?: string) {
  if (!value) return 'Not recorded';
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Madrid',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function humanize(value: string) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

async function readJson<T>(response: Response | Promise<Response>): Promise<T> {
  const resolved = await response;
  if (!resolved.ok) throw new Error(await resolved.text());
  return resolved.json() as Promise<T>;
}

export const IMPACT_RESULTS_PAGE_I18N_MANIFEST = {
  componentKey: 'pages.impact.results.page',
  namespace: 'impact.results',
  translationKeys: [
    'impact.results.boundary.cta',
    'impact.results.boundary.description',
    'impact.results.boundary.eyebrow',
    'impact.results.boundary.title',
    'impact.results.changelog.description',
    'impact.results.changelog.eyebrow',
    'impact.results.changelog.impact',
    'impact.results.changelog.title',
    'impact.results.changelog.why',
    'impact.results.contributors.description',
    'impact.results.contributors.empty',
    'impact.results.contributors.eyebrow',
    'impact.results.contributors.features',
    'impact.results.contributors.fixes',
    'impact.results.contributors.latest',
    'impact.results.contributors.merged_prs',
    'impact.results.contributors.reviews',
    'impact.results.contributors.title',
    'impact.results.error',
    'impact.results.hero.card_description',
    'impact.results.hero.card_quote',
    'impact.results.hero.description',
    'impact.results.hero.eyebrow',
    'impact.results.hero.primary_cta',
    'impact.results.hero.secondary_cta',
    'impact.results.hero.title',
    'impact.results.loading',
    'impact.results.metric.checks',
    'impact.results.metric.checks_desc',
    'impact.results.metric.contributors',
    'impact.results.metric.contributors_desc',
    'impact.results.metric.features',
    'impact.results.metric.features_desc',
    'impact.results.metric.fixes',
    'impact.results.metric.fixes_desc',
    'impact.results.metric.prs',
    'impact.results.metric.prs_desc',
    'impact.results.metric.upgrades',
    'impact.results.metric.upgrades_desc',
    'impact.results.section.description',
    'impact.results.section.eyebrow',
    'impact.results.section.title',
  ] as const,
  entityContent: {
    tables: ['platform_updates', 'platform_update_translations'],
  },
} as const satisfies I18nManifest;

export function ImpactResultsPage() {
  const { t } = useWebsiteI18n();
  const [impact, setImpact] = useState<ImpactData | null>(null);
  const [updates, setUpdates] = useState<PlatformUpdate[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      readJson<ImpactData>(fetch('/api/impact')),
      readJson<PlatformUpdate[]>(supabase.from('platform_updates_public').request({
        query: 'select=id,slug,version,title,short_description,motivation,positive_impact,category,update_type,status,feature_area,effective_at,founder_name,founder_profile_url&order=effective_at.desc',
      })),
    ])
      .then(([impactData, platformUpdates]) => {
        setImpact(impactData);
        setUpdates(platformUpdates);
        setStatus('ready');
        document.title = 'Impact | Bankrupt to 1 Million';
      })
      .catch((reason: Error) => {
        setError(reason.message);
        setStatus('error');
      });
  }, []);

  const metrics = useMemo(() => impact ? [
    { label: t('impact.results.metric.features', 'Features completed'), value: impact.stats.featuresCompleted, description: t('impact.results.metric.features_desc', 'Shipped feature, UI and backend work verified through repository activity.') },
    { label: t('impact.results.metric.fixes', 'Bug fixes completed'), value: impact.stats.bugFixesCompleted, description: t('impact.results.metric.fixes_desc', 'Verified fixes that improved stability, reliability or usability.') },
    { label: t('impact.results.metric.prs', 'Pull requests merged'), value: impact.stats.mergedPullRequests, description: t('impact.results.metric.prs_desc', 'Merged contributions that became part of the actual codebase.') },
    { label: t('impact.results.metric.checks', 'Workflow checks passed'), value: impact.stats.testsPassed ?? '—', description: t('impact.results.metric.checks_desc', 'Successful automated checks reported by the repository workflow.') },
    { label: t('impact.results.metric.upgrades', 'Platform upgrades shipped'), value: updates.length, description: t('impact.results.metric.upgrades_desc', 'Meaningful public improvements documented with their reasoning and positive impact.') },
    { label: t('impact.results.metric.contributors', 'Verified contributors'), value: impact.contributors.length, description: t('impact.results.metric.contributors_desc', 'People with visible, attributable repository contributions.') },
  ] : [], [impact, t, updates.length]);

  return <><Header /><div className="page-shell"><main id="top" className="impact-page impact-results-page">
    <section className="hero impact-hero section-grid" aria-labelledby="impact-title">
      <div className="hero__content">
        <p className="eyebrow">{t('impact.results.hero.eyebrow', 'REALIZED IMPACT')}</p>
        <h1 id="impact-title">{t('impact.results.hero.title', 'What has actually moved forward.')}</h1>
        <p className="hero__lede">{t('impact.results.hero.description', 'A transparent record of shipped improvements, completed work and people who helped turn ideas into visible progress.')}</p>
        <div className="hero__actions"><a className="button" href="#platform-changelog">{t('impact.results.hero.primary_cta', 'Explore shipped upgrades')} <ArrowRight size={17}/></a><a className="button button--ghost" href="/issues">{t('impact.results.hero.secondary_cta', 'See what we build next')}</a></div>
      </div>
      <aside className="hero-card impact-hero__note"><TrendingUp/><blockquote>{t('impact.results.hero.card_quote', 'Results, not promises.')}</blockquote><p>{t('impact.results.hero.card_description', 'Impact contains completed and shipped work. Open work, bugs and contribution opportunities belong on the Issues page.')}</p></aside>
    </section>

    {status === 'loading' ? <section className="section"><div className="impact-state"><Clock/> {t('impact.results.loading', 'Loading verified impact…')}</div></section> : null}
    {status === 'error' ? <section className="section"><div className="impact-state impact-state--error">{t('impact.results.error', 'Impact data could not be loaded.')} {error}</div></section> : null}

    {status === 'ready' && impact ? <>
      <section className="section" aria-labelledby="results-title">
        <SectionHeading eyebrow={t('impact.results.section.eyebrow', 'Verified output')} title={t('impact.results.section.title', 'Results already achieved')} titleId="results-title">{t('impact.results.section.description', 'Only completed, merged or publicly shipped work appears here. Backlog volume is deliberately excluded.')}</SectionHeading>
        <div className="impact-refresh-note"><Clock size={17}/> Latest verified refresh: {formatDate(impact.refreshedAt)}{impact.stale ? ' · Data may be stale' : ''}{impact.warning ? ` · ${impact.warning}` : ''}</div>
        <div className="impact-stat-grid">{metrics.map((metric) => <article className="impact-stat-card" key={metric.label}><span>{metric.label}</span><strong>{metric.value}</strong><p>{metric.description}</p></article>)}</div>
      </section>

      <section className="section" id="platform-changelog" aria-labelledby="changelog-title">
        <SectionHeading eyebrow={t('impact.results.changelog.eyebrow', 'Build in public')} title={t('impact.results.changelog.title', 'Complete platform improvement history')} titleId="changelog-title">{t('impact.results.changelog.description', 'Every meaningful upgrade includes the idea behind it, why it mattered and the positive impact it was designed to create.')}</SectionHeading>
        <div className="impact-changelog">{updates.map((update, index) => <article className="impact-changelog__item" key={update.id}>
          <div className="impact-changelog__rail"><span>{String(index + 1).padStart(2, '0')}</span></div>
          <div className="impact-changelog__card">
            <header><div><span>{update.version || humanize(update.update_type)}</span><small>{update.feature_area || humanize(update.category)}</small></div><time dateTime={update.effective_at}>{formatDate(update.effective_at)}</time></header>
            <h3>{update.title}</h3><p>{update.short_description}</p>
            <div className="impact-changelog__reasoning"><div><Sparkles size={17}/><div><strong>{t('impact.results.changelog.why', 'Why we built this')}</strong><p>{update.motivation}</p></div></div><div><CheckCircle2 size={17}/><div><strong>{t('impact.results.changelog.impact', 'Positive impact')}</strong><p>{update.positive_impact}</p></div></div></div>
            <footer><span>{humanize(update.status)}</span>{update.founder_name && update.founder_profile_url ? <a href={update.founder_profile_url}>By {update.founder_name} <ArrowRight size={14}/></a> : null}</footer>
          </div>
        </article>)}</div>
      </section>

      <section className="section" aria-labelledby="contributors-title">
        <SectionHeading eyebrow={t('impact.results.contributors.eyebrow', 'Recognition')} title={t('impact.results.contributors.title', 'Verified contributors')} titleId="contributors-title">{t('impact.results.contributors.description', 'People who helped move the codebase forward deserve visible, evidence-based recognition.')}</SectionHeading>
        {impact.contributors.length ? <div className="impact-contributor-grid">{impact.contributors.map((contributor) => <article key={contributor.login}>
          <div className="impact-contributor-grid__identity">{contributor.avatarUrl ? <img src={contributor.avatarUrl} alt={`${contributor.login} avatar`} loading="lazy"/> : <span>{contributor.login.slice(0,2).toUpperCase()}</span>}<div><h3>{contributor.displayName || contributor.login}</h3><a href={contributor.profileUrl} target="_blank" rel="noreferrer">@{contributor.login} <ExternalLink size={13}/></a></div></div>
          <dl><div><dt>{t('impact.results.contributors.features', 'Features')}</dt><dd>{contributor.featuresCompleted}</dd></div><div><dt>{t('impact.results.contributors.fixes', 'Fixes')}</dt><dd>{contributor.bugFixesCompleted}</dd></div><div><dt>{t('impact.results.contributors.merged_prs', 'Merged PRs')}</dt><dd>{contributor.mergedPullRequests.length}</dd></div><div><dt>{t('impact.results.contributors.reviews', 'Reviews')}</dt><dd>{contributor.reviewsPerformed}</dd></div></dl>
          <p>{t('impact.results.contributors.latest', 'Latest verified contribution: {date}', { date: formatDate(contributor.mostRecentContributionDate) })}</p>
        </article>)}</div> : <div className="impact-state">{t('impact.results.contributors.empty', 'No verified contributor activity is available yet.')}</div>}
      </section>

      <section className="impact-boundary section"><div><Wrench/><div><p className="eyebrow">{t('impact.results.boundary.eyebrow', 'Clear separation')}</p><h2>{t('impact.results.boundary.title', 'Looking for work that still needs to be done?')}</h2><p>{t('impact.results.boundary.description', 'Open issues, bugs, planned improvements, difficulty levels and claim actions now live exclusively in the public backlog.')}</p></div></div><a className="button" href="/issues">{t('impact.results.boundary.cta', 'Open the Issues backlog')} <ArrowRight size={17}/></a></section>
    </> : null}
  </main></div><Footer /></>;
}
