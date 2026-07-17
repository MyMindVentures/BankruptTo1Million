import { ArrowRight, Award, CheckCircle2, Clock, ExternalLink, Gift, GitPullRequest, HeartHandshake, RefreshCw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { SectionHeading } from './components/SectionHeading';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { BreakTheCircleArticlePage, BreakTheCirclePage, AdminBreakTheCirclePage, AdminBreakTheCircleEditorPage, AdminBreakTheCirclePreviewPage } from './pages/BreakTheCirclePages';
import { HomePage } from './pages/HomePage';
import { JournalArticlePage, JournalPage, AdminJournalCommentsPage } from './pages/JournalPages';
import { ProofOfMindDetailPage, ProofOfMindPage } from './pages/ProofOfMindPages';
import { AdminBreakTheCircleEditorPage, AdminBreakTheCirclePage, AdminBreakTheCirclePreviewPage, BreakTheCircleArticlePage, BreakTheCirclePage } from './pages/BreakTheCirclePages';
import { SectionHeading } from './components/SectionHeading';
import { HomePage } from './pages/HomePage';
import { FoundingHeroesFinancialSupport } from './components/FoundingHeroesFinancialSupport';
import { supabase } from './lib/supabase';
import { getPublishedFoundingHeroes } from './lib/foundingHeroes';
import type { PublicFoundingHero } from './lib/foundingHeroes';
import { foundingHeroRoles } from './data/siteContent';
import { categoryById, getSupportOpportunities, opportunitiesForCategory, submitSupportOffer, supportCategories } from './lib/supportMission';
import type { SupportOffer, SupportOpportunity } from './lib/supportMission';
import { useWebsiteI18n } from './lib/websiteI18n';
import type { I18nManifest } from './lib/i18nManifest';

export const APP_I18N_MANIFEST = {
  componentKey: 'app',
  namespace: 'app',
  translationKeys: [
    'founding_heroes.card.website', 'founding_heroes.card.featured', 'founding_heroes.card.default_level', 'founding_heroes.card.joined', 'founding_heroes.card.private_identity', 'founding_heroes.hero.eyebrow', 'founding_heroes.hero.title', 'founding_heroes.hero.description', 'founding_heroes.hero.actions_aria', 'founding_heroes.hero.apply_cta', 'founding_heroes.hero.profiles_cta', 'founding_heroes.hero.financial_cta', 'founding_heroes.hero.card_aria', 'founding_heroes.hero.card_quote', 'founding_heroes.hero.card_description', 'founding_heroes.recognition.eyebrow', 'founding_heroes.recognition.title', 'founding_heroes.recognition.description', 'founding_heroes.recognition.body_one', 'founding_heroes.recognition.body_two', 'founding_heroes.profiles.eyebrow', 'founding_heroes.profiles.title', 'founding_heroes.profiles.description', 'founding_heroes.profiles.loading', 'founding_heroes.profiles.empty_title', 'founding_heroes.profiles.empty_description', 'founding_heroes.roles.eyebrow', 'founding_heroes.roles.title', 'founding_heroes.roles.description', 'founding_heroes.roles.aria',
    'issues.eyebrow', 'issues.title', 'issues.description', 'issues.back_to_impact', 'issues.matches', 'issues.loaded_count', 'issues.search_label', 'issues.search_placeholder', 'issues.sort_label', 'issues.sort.newest', 'issues.sort.updated', 'issues.sort.easy', 'issues.sort.short', 'issues.reset_filters', 'issues.loading', 'issues.error', 'issues.empty', 'issues.card.summary_empty', 'issues.card.type', 'issues.card.discipline', 'issues.card.difficulty', 'issues.card.time', 'issues.card.claim', 'issues.card.updated', 'issues.card.implementation', 'issues.card.unlabeled', 'issues.card.available', 'issues.card.claimed_by', 'issues.card.view', 'issues.card.claim_cta', 'issues.card.linked_pr', 'issues.detail.loading', 'issues.detail.unavailable', 'issues.detail.eyebrow', 'issues.detail.open_github', 'issues.detail.repository', 'issues.detail.author', 'issues.detail.unknown', 'issues.detail.state', 'issues.detail.state_reason', 'issues.detail.estimated_time', 'issues.detail.claim_status', 'issues.detail.created', 'issues.detail.closed', 'issues.detail.implemented', 'issues.detail.last_sync', 'issues.detail.not_recorded', 'issues.detail.contributor_profile', 'issues.detail.body_empty',
    'profile.sign_in_title', 'profile.email_placeholder', 'profile.password_placeholder', 'profile.sign_in', 'profile.create_account', 'profile.complete_title', 'profile.display_name', 'profile.github_login', 'profile.github_url', 'profile.avatar_url', 'profile.bio', 'profile.experience', 'profile.disciplines', 'profile.public_consent', 'profile.guidelines_consent', 'profile.save', 'profile.dashboard', 'profile.dashboard_description', 'profile.claimed',
    'impact.unknown_date', 'impact.stat.issues', 'impact.stat.prs', 'impact.stat.features', 'impact.stat.fixes', 'impact.stat.reviews', 'impact.first_latest', 'impact.badges_aria', 'impact.view_history', 'impact.contributor_detail', 'impact.first_contribution', 'impact.implemented_issues', 'impact.merged_prs', 'impact.reviews_performed', 'impact.timeline_aria', 'impact.contribution', 'impact.loading', 'impact.error', 'impact.empty', 'impact.hero.eyebrow', 'impact.hero.title', 'impact.hero.description', 'impact.hero.card_aria', 'impact.hero.card_quote', 'impact.hero.card_description', 'impact.overview.eyebrow', 'impact.overview.title', 'impact.overview.description', 'impact.browse_issues', 'impact.latest_refresh', 'impact.refresh_window', 'impact.data_stale', 'impact.builders.eyebrow', 'impact.builders.title', 'impact.builders.description', 'impact.selected_detail', 'impact.attribution.eyebrow', 'impact.attribution.title', 'impact.attribution.description', 'impact.bots_present', 'impact.bots_none', 'impact.stat.total_issues', 'impact.stat.open_issues', 'impact.stat.closed_issues', 'impact.stat.completed_features', 'impact.stat.completed_fixes', 'impact.stat.merged_prs', 'impact.stat.workflow_checks', 'impact.stat.not_reported',
    'application.validation.motivation', 'application.validation.contact', 'application.validation.submit_error', 'application.hero.eyebrow', 'application.hero.title', 'application.hero.description', 'application.hero.card_aria', 'application.hero.card_quote', 'application.hero.card_description', 'application.context.eyebrow', 'application.context.title', 'application.context.description', 'application.privacy.title', 'application.privacy.description', 'application.models.title', 'application.models.description', 'application.form.eyebrow', 'application.form.title', 'application.form.description', 'application.identity.legend', 'application.name', 'application.name_placeholder', 'application.name_help', 'application.email', 'application.email_help', 'application.contribution.legend', 'application.participation_type', 'application.participation_placeholder', 'application.participation_help', 'application.focus', 'application.focus_placeholder', 'application.focus_help', 'application.motivation.legend', 'application.motivation', 'application.required', 'application.motivation_placeholder', 'application.motivation_help', 'application.experience', 'application.optional', 'application.experience_placeholder', 'application.experience_help', 'application.availability', 'application.availability_placeholder', 'application.availability_help', 'application.contact_consent', 'application.contact_help', 'application.public_recognition', 'application.public_recognition_help', 'application.status.complete', 'application.status.closed', 'application.status.complete_description', 'application.status.closed_description', 'application.submit',
    'support.validation.required', 'support.validation.submit_error', 'support.hero.eyebrow', 'support.hero.title', 'support.hero.description', 'support.hero.body', 'support.hero.categories_cta', 'support.hero.offer_cta', 'support.hero.card_quote', 'support.hero.card_description', 'support.categories.eyebrow', 'support.categories.title', 'support.categories.description', 'support.categories.loading', 'support.categories.error_suffix', 'support.categories.opportunity_count', 'support.detail.eyebrow', 'support.detail.needs_title', 'support.detail.opportunities_title', 'support.detail.loading', 'support.detail.empty', 'support.detail.apply', 'support.detail.apply_opportunity', 'support.detail.medical_note', 'support.offer.eyebrow', 'support.offer.title', 'support.offer.description', 'support.offer.name', 'support.offer.email', 'support.offer.category', 'support.offer.another_category', 'support.offer.message', 'support.offer.contact_consent', 'support.offer.public_consent', 'support.offer.success', 'support.offer.submitting', 'support.offer.private', 'support.offer.success_description', 'support.offer.private_description',
  ] as const,
  keyPatterns: [
    'founding_heroes.card.*', 'issues.filter.*', 'issues.filter_value.*', 'issues.status.*', 'issues.detail.*', 'profile.role.*', 'profile.discipline.*', 'profile.experience.*', 'impact.*', 'application.participation.*', 'application.availability.*',
  ] as const,
} as const satisfies I18nManifest;

function FoundingHeroCard({ hero }: { hero: PublicFoundingHero }) {
  const { t, formatDate } = useWebsiteI18n();
  const initials = hero.displayName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'FH';
  const links = [
    { href: hero.websiteUrl, label: t('founding_heroes.card.website', 'Website') },
    { href: hero.githubUrl, label: 'GitHub' },
    { href: hero.linkedinUrl, label: 'LinkedIn' },
  ].filter((link) => link.href);
  return <article className={`founding-profile-card${hero.featured ? ' founding-profile-card--featured' : ''}`}>
    <div className="founding-profile-card__top">
      {hero.avatarUrl ? <img src={hero.avatarUrl} alt={t('founding_heroes.card.portrait_alt', '{name} profile portrait', { name: hero.displayName })} loading="lazy" /> : <div className="founding-profile-card__avatar" aria-hidden="true">{initials}</div>}
      <div>
        <p className="eyebrow">{hero.featured ? t('founding_heroes.card.featured', 'Featured Founding Hero') : hero.recognitionLevel || t('founding_heroes.card.default_level', 'Founding Hero')}</p>
        <h3>{hero.displayName}</h3>
        <p>{hero.roleTitle}</p>
      </div>
    </div>
    {hero.shortBio ? <p>{hero.shortBio}</p> : null}
    {hero.supportMessage ? <blockquote>{hero.supportMessage}</blockquote> : null}
    <div className="founding-profile-card__meta">
      {hero.location ? <span>{hero.location}</span> : null}
      {hero.joinedAt ? <span>{t('founding_heroes.card.joined', 'Joined {date}', { date: formatDate(hero.joinedAt) })}</span> : null}
      {hero.isAnonymous ? <span>{t('founding_heroes.card.private_identity', 'Identity kept private by request')}</span> : null}
    </div>
    {links.length ? <div className="founding-profile-card__links">{links.map((link) => <a key={link.label} href={link.href} target="_blank" rel="noreferrer">{link.label}<ExternalLink size={14} aria-hidden="true" /></a>)}</div> : null}
  </article>;
}

export function FoundingHeroesPage() {
  const { t } = useWebsiteI18n();
  const [heroes, setHeroes] = useState<PublicFoundingHero[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');
  useEffect(() => {
    getPublishedFoundingHeroes().then((rows) => { setHeroes(rows); setStatus('ready'); }).catch((e: Error) => { setError(e.message); setStatus('error'); });
  }, []);
  return (
    <main id="top" className="founding-page">
      <section className="hero founding-hero section-grid" aria-labelledby="founding-hero-title">
        <div className="hero__content">
          <p className="eyebrow">{t('founding_heroes.hero.eyebrow', 'Founding Heroes')}</p>
          <h1 id="founding-hero-title">{t('founding_heroes.hero.title', 'Belief before proof.')}</h1>
          <p className="hero__lede">
            {t('founding_heroes.hero.description', 'This wall recognizes approved early builders who chose to contribute before the outcome was certain. It is a quiet public thank you for useful work, courage and trust.')}
          </p>
          <div className="hero__actions" aria-label={t('founding_heroes.hero.actions_aria', 'Founding Heroes calls to action')}>
            <a className="button" href="/become-a-founding-hero">
              {t('founding_heroes.hero.apply_cta', 'Become a Founding Hero')} <ArrowRight aria-hidden="true" size={18} />
            </a>
            <a className="button button--ghost" href="#founding-hero-profiles">
              {t('founding_heroes.hero.profiles_cta', 'View profiles')}
            </a>
            <a className="button button--ghost" href="#founding-hero-financial-support">
              {t('founding_heroes.hero.financial_cta', 'Financial support')}
            </a>
          </div>
        </div>
        <aside className="hero-card founding-hero__note" aria-label={t('founding_heroes.hero.card_aria', 'Recognition principle')}>
          <HeartHandshake aria-hidden="true" />
          <blockquote>{t('founding_heroes.hero.card_quote', 'Recognition without performance.')}</blockquote>
          <p>
            {t('founding_heroes.hero.card_description', 'Only published Supabase records appear here. Private applications, email addresses and internal notes stay hidden.')}
          </p>
        </aside>
      </section>

      <section className="section section-grid" aria-labelledby="recognition-title">
        <SectionHeading eyebrow={t('founding_heroes.recognition.eyebrow', 'Recognition')} title={t('founding_heroes.recognition.title', 'A permanent place for early trust')} titleId="recognition-title">
          {t('founding_heroes.recognition.description', 'Founding Heroes are people who help shape the foundation: code, design, writing, testing, accessibility, introductions and practical support.')}
        </SectionHeading>
        <div className="story-panel">
          <p>
            {t('founding_heroes.recognition.body_one', 'The wall is loaded from the approved public profile fields in Supabase, so publication changes are reflected on reload.')}
          </p>
          <p>
            {t('founding_heroes.recognition.body_two', 'Anonymous recognition is supported without exposing names, locations, avatars or social links.')}
          </p>
        </div>
      </section>

      <section className="section" id="founding-hero-profiles" aria-labelledby="profile-slots-title">
        <SectionHeading eyebrow={t('founding_heroes.profiles.eyebrow', 'Public wall')} title={t('founding_heroes.profiles.title', 'Published Founding Heroes')} titleId="profile-slots-title">
          {t('founding_heroes.profiles.description', 'Real profiles appear only after they are explicitly approved for publication.')}
        </SectionHeading>
        {status === 'loading' ? <div className="impact-state" role="status" aria-live="polite">{t('founding_heroes.profiles.loading', 'Loading Founding Heroes from Supabase…')}</div> : null}
        {status === 'error' ? <div className="impact-state impact-state--error" role="alert">{error}</div> : null}
        {status === 'ready' && !heroes.length ? <div className="impact-state"><strong>{t('founding_heroes.profiles.empty_title', 'No Founding Heroes are published yet.')}</strong><br />{t('founding_heroes.profiles.empty_description', 'Approved contributor profiles will appear here as soon as they are ready.')}</div> : null}
        {heroes.length ? <div className="founding-profile-grid" role="list">{heroes.map((hero) => <div role="listitem" key={hero.id}><FoundingHeroCard hero={hero} /></div>)}</div> : null}
      </section>

      <section className="section" id="founding-hero-financial-support" aria-labelledby="financial-support-title">
        <FoundingHeroesFinancialSupport />
      </section>

      <section className="section section-grid" id="founding-hero-roles" aria-labelledby="roles-title">
        <SectionHeading eyebrow={t('founding_heroes.roles.eyebrow', 'Open roles')} title={t('founding_heroes.roles.title', 'Useful ways to help next')} titleId="roles-title">
          {t('founding_heroes.roles.description', 'The first opportunities stay small, practical and issue-led so contributors can build one meaningful feature at a time.')}
        </SectionHeading>
        <ul className="role-list" aria-label={t('founding_heroes.roles.aria', 'Future open role categories')}>
          {foundingHeroRoles.map((role) => (
            <li key={role.title}>
              <h3>{role.title}</h3>
              <p>{role.description}</p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}


type JsonRecord = Record<string, unknown>;

type PublicProfile = {
  id: string;
  display_name?: string;
  role?: string;
  github_profile_url?: string;
  github_login?: string;
  avatar_url?: string;
  bio?: string;
  primary_disciplines?: string[];
  experience_level?: string;
  consent_public_recognition?: boolean;
  accepted_contribution_guidelines?: boolean;
};

type IssueDeveloper = {
  id?: string;
  github_issue_id?: number | string;
  profile_id?: string;
  github_login?: string;
  contribution_status?: string;
  is_primary_claimant?: boolean;
  claimed_at?: string;
  profiles?: PublicProfile | PublicProfile[] | null;
};

type GithubIssue = {
  id: number | string;
  issue_number?: number;
  number?: number;
  repository?: string;
  title: string;
  summary?: string;
  body?: string;
  html_url?: string;
  github_url?: string;
  author_login?: string;
  user_login?: string;
  labels?: unknown;
  state?: string;
  state_reason?: string;
  issue_type?: string;
  discipline?: string;
  difficulty?: string;
  estimated_time?: string;
  claim_status?: string;
  implementation_status?: string;
  linked_pull_request_url?: string;
  linked_pull_request?: string;
  created_at?: string;
  updated_at?: string;
  closed_at?: string;
  implemented_at?: string;
  synced_at?: string;
  last_synced_at?: string;
  github_issue_developers?: IssueDeveloper[];
};

type ProfileForm = Required<Pick<PublicProfile, 'display_name' | 'role' | 'github_profile_url' | 'github_login' | 'avatar_url' | 'bio' | 'experience_level'>> & {
  primary_disciplines: string[];
  consent_public_recognition: boolean;
  accepted_contribution_guidelines: boolean;
};

const disciplines = ['Frontend', 'Backend', 'Full-stack', 'UI/UX', 'Accessibility', 'Testing / QA', 'DevOps', 'Database', 'API / Integrations', 'Translation / i18n', 'Content', 'Documentation'];
const difficulties = ['Beginner', 'Intermediate', 'Advanced'];
const times = ['Under 1 hour', '1–2 hours', '2–4 hours', '4–8 hours', 'More than 8 hours'];
const statuses = ['Available', 'Claimed', 'In progress', 'In review', 'Implemented', 'Open', 'Closed'];
const issueTypes = ['Feature', 'Bug', 'Accessibility', 'Translation', 'Documentation', 'Maintenance'];

type FilterKey = 'discipline' | 'difficulty' | 'time' | 'status' | 'type';
const filterGroups: { key: FilterKey; label: string; values: string[] }[] = [
  { key: 'discipline', label: 'Discipline', values: disciplines },
  { key: 'difficulty', label: 'Difficulty', values: difficulties },
  { key: 'time', label: 'Estimated time', values: times },
  { key: 'status', label: 'Status', values: statuses },
  { key: 'type', label: 'Issue type', values: issueTypes },
];

function normalize(value?: unknown) { return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
function titleCase(value?: unknown) { return String(value || '').replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()); }
function issueNumber(issue: GithubIssue) { return Number(issue.issue_number ?? issue.number ?? 0); }
function labelsOf(issue: GithubIssue): string[] {
  if (Array.isArray(issue.labels)) return issue.labels.map((label) => typeof label === 'string' ? label : String((label as JsonRecord).name || '')).filter(Boolean);
  if (typeof issue.labels === 'string') { try { const parsed = JSON.parse(issue.labels); return Array.isArray(parsed) ? parsed.map(String) : issue.labels.split(',').map((v) => v.trim()); } catch { return issue.labels.split(',').map((v) => v.trim()); } }
  return [];
}
function labelValue(issue: GithubIssue, prefix: string) { return labelsOf(issue).find((label) => normalize(label).startsWith(normalize(prefix)))?.split(':').slice(1).join(':'); }
function issueField(issue: GithubIssue, key: FilterKey) {
  if (key === 'discipline') return titleCase(issue.discipline || labelValue(issue, 'discipline'));
  if (key === 'difficulty') return titleCase(issue.difficulty || labelValue(issue, 'difficulty'));
  if (key === 'time') {
    const raw = normalize(issue.estimated_time || labelValue(issue, 'time'));
    if (raw.includes('1-2')) return '1–2 hours'; if (raw.includes('2-4')) return '2–4 hours'; if (raw.includes('4-8')) return '4–8 hours'; if (raw.includes('8h')) return 'More than 8 hours'; if (raw.includes('1h') || raw.includes('under')) return 'Under 1 hour';
  }
  if (key === 'status') return titleCase(issue.claim_status || issue.implementation_status || issue.state || labelValue(issue, 'status'));
  return titleCase(issue.issue_type || labelValue(issue, 'type'));
}
function primaryClaim(issue: GithubIssue) { return issue.github_issue_developers?.find((d) => d.is_primary_claimant !== false && !['released', 'completed'].includes(normalize(d.contribution_status))) || null; }
function claimProfile(claim: IssueDeveloper | null): PublicProfile | null { return Array.isArray(claim?.profiles) ? claim.profiles[0] || null : claim?.profiles || null; }
function isClaimAvailable(issue: GithubIssue) { return normalize(issue.state) !== 'closed' && !primaryClaim(issue) && !['claimed', 'in-progress'].includes(normalize(issue.claim_status)); }
function markdown(text?: string) {
  const safe = String(text || 'No issue body was synchronized.').replace(/[&<>]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]!));
  return safe.replace(/^### (.*)$/gm, '<h3>$1</h3>').replace(/^## (.*)$/gm, '<h2>$1</h2>').replace(/^# (.*)$/gm, '<h1>$1</h1>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\n/g, '<br />');
}

async function readJson<T = unknown>(responseOrPromise: Response | Promise<Response>): Promise<T> { const response = await responseOrPromise; if (!response.ok) throw new Error(await response.text()); return response.json() as Promise<T>; }

function useSessionState() {
  const [session, setSession] = useState(() => supabase.auth.getSession());
  const refresh = () => setSession(supabase.auth.getSession());
  return { session, refresh };
}

/** @deprecated Unreachable via public routing; `/issues` uses PublicBuildRequestsPage. Kept for IssueCard helpers. */
export function IssuesPage() {
  const { t, formatNumber } = useWebsiteI18n();
  const [issues, setIssues] = useState<GithubIssue[]>([]), [status, setStatus] = useState('loading'), [error, setError] = useState(''), [search, setSearch] = useState(new URLSearchParams(location.search).get('q') || ''), [sort, setSort] = useState(new URLSearchParams(location.search).get('sort') || 'newest');
  const [filters, setFilters] = useState(() => ({
    discipline: new URLSearchParams(location.search).getAll('discipline'),
    difficulty: new URLSearchParams(location.search).getAll('difficulty'),
    time: new URLSearchParams(location.search).getAll('time'),
    status: new URLSearchParams(location.search).getAll('status'),
    type: new URLSearchParams(location.search).getAll('type'),
  }));
  useEffect(() => { readJson<GithubIssue[]>(supabase.from('github_issues').request({ query: 'select=*,github_issue_developers(*,profiles(*))&order=created_at.desc' })).then(setIssues).then(() => setStatus('ready')).catch((e: Error) => { setError(e.message); setStatus('error'); }); }, []);
  useEffect(() => { const params = new URLSearchParams(); if (search) params.set('q', search); if (sort !== 'newest') params.set('sort', sort); filterGroups.forEach((g) => filters[g.key].forEach((v) => params.append(g.key, v))); history.replaceState(null, '', `/issues${params.toString() ? `?${params}` : ''}`); }, [filters, search, sort]);
  const filtered = useMemo(() => issues.filter((issue) => {
    const q = search.trim().toLowerCase();
    if (q && !String(issueNumber(issue)).includes(q) && !issue.title.toLowerCase().includes(q)) return false;
    return filterGroups.every((g) => !filters[g.key].length || filters[g.key].some((v) => normalize(issueField(issue, g.key)) === normalize(v) || labelsOf(issue).some((l) => normalize(l).includes(normalize(v)))));
  }).sort((a,b) => sort === 'updated' ? Date.parse(b.updated_at || '') - Date.parse(a.updated_at || '') : sort === 'easy' ? difficulties.indexOf(issueField(a,'difficulty')) - difficulties.indexOf(issueField(b,'difficulty')) : sort === 'short' ? times.indexOf(issueField(a,'time')) - times.indexOf(issueField(b,'time')) : Date.parse(b.created_at || '') - Date.parse(a.created_at || '')), [issues, filters, search, sort]);
  const toggle = (key: FilterKey, value: string) => setFilters((current) => ({ ...current, [key]: current[key].includes(value) ? current[key].filter((v) => v !== value) : [...current[key], value] }));
  return <main className="issues-page"><section className="hero issue-hero section-grid"><div><p className="eyebrow">{t('issues.eyebrow', 'Supabase issue browser')}</p><h1>{t('issues.title', 'Choose focused work.')}</h1><p className="hero__lede">{t('issues.description', 'Browse synchronized GitHub issues from Supabase, filter by real labels, and claim work only after contributor profile completion.')}</p><a className="button" href="/impact">{t('issues.back_to_impact', 'Back to impact')}</a></div><aside className="hero-card"><GitPullRequest/><blockquote>{t('issues.matches', '{count} matches', { count: formatNumber(filtered.length) })}</blockquote><p>{t('issues.loaded_count', '{count} synchronized public issues loaded from Supabase.', { count: formatNumber(issues.length) })}</p></aside></section><section className="section"><div className="issue-toolbar"><label>{t('issues.search_label', 'Search issues')}<input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder={t('issues.search_placeholder', 'Number or title')} /></label><label>{t('issues.sort_label', 'Sort')}<select value={sort} onChange={(e)=>setSort(e.target.value)}><option value="newest">{t('issues.sort.newest', 'Newest')}</option><option value="updated">{t('issues.sort.updated', 'Recently updated')}</option><option value="easy">{t('issues.sort.easy', 'Easiest first')}</option><option value="short">{t('issues.sort.short', 'Shortest estimated time')}</option></select></label><button className="button button--ghost button--small" onClick={()=>{setFilters(Object.fromEntries(filterGroups.map((g)=>[g.key, []])) as unknown as Record<FilterKey,string[]>); setSearch('');}}>{t('issues.reset_filters', 'Reset filters')}</button></div>{filterGroups.map((group)=><fieldset className="chip-group" key={group.key}><legend>{t(`issues.filter.${group.key}`, group.label)}</legend><div>{group.values.map((value)=><button type="button" className={`chip ${filters[group.key].includes(value) ? 'chip--active' : ''}`} onClick={()=>toggle(group.key,value)} key={value}>{t(`issues.filter_value.${normalize(value)}`, value)}</button>)}</div></fieldset>)}{status==='loading' ? <div className="impact-state">{t('issues.loading', 'Loading Supabase issues…')}</div> : null}{status==='error' ? <div className="impact-state impact-state--error">{t('issues.error', 'Could not load Supabase issues. {error}', { error })}</div> : null}{status==='ready' && !filtered.length ? <div className="impact-state">{t('issues.empty', 'No issues match these filters. Reset filters or try a broader search.')}</div> : null}<div className="issue-grid">{filtered.map((issue)=><IssueCard issue={issue} key={issue.id}/>)}</div></section></main>;
}
function IssueCard({ issue }: { issue: GithubIssue }) { const { t, formatDate } = useWebsiteI18n(); const claim = primaryClaim(issue), profile = claimProfile(claim); const unlabeled = t('issues.card.unlabeled', 'Unlabeled'); return <article className="issue-card"><div className="issue-card__top"><span>#{issueNumber(issue)}</span><strong>{titleCase(issue.state || t('issues.status.open', 'open'))}</strong></div><h2>{issue.title}</h2><p>{issue.summary || String(issue.body || '').slice(0, 180) || t('issues.card.summary_empty', 'No summary synchronized yet.')}</p><dl><div><dt>{t('issues.card.type', 'Type')}</dt><dd>{issueField(issue,'type') || unlabeled}</dd></div><div><dt>{t('issues.card.discipline', 'Discipline')}</dt><dd>{issueField(issue,'discipline') || unlabeled}</dd></div><div><dt>{t('issues.card.difficulty', 'Difficulty')}</dt><dd>{issueField(issue,'difficulty') || unlabeled}</dd></div><div><dt>{t('issues.card.time', 'Time')}</dt><dd>{issueField(issue,'time') || unlabeled}</dd></div><div><dt>{t('issues.card.claim', 'Claim')}</dt><dd>{claim ? t('issues.card.claimed_by', 'Claimed by @{login}', { login: claim.github_login || profile?.github_login || '' }) : t('issues.card.available', 'Available')}</dd></div><div><dt>{t('issues.card.updated', 'Updated')}</dt><dd>{issue.updated_at ? formatDate(issue.updated_at) : t('issues.detail.not_recorded', 'Not recorded')}</dd></div><div><dt>{t('issues.card.implementation', 'Implementation')}</dt><dd>{titleCase(issue.implementation_status || t('issues.status.not_started', 'Not started'))}</dd></div></dl><div className="label-row">{labelsOf(issue).map((label)=><span key={label}>{label}</span>)}</div><div className="issue-actions"><a className="button button--small" href={`/issues/${issueNumber(issue)}`}>{t('issues.card.view', 'View issue')}</a>{isClaimAvailable(issue) ? <a className="button button--ghost button--small" href={`/issues/${issueNumber(issue)}?claim=1`}>{t('issues.card.claim_cta', 'Claim this issue')}</a> : null}{issue.linked_pull_request_url ? <a className="button button--ghost button--small" href={issue.linked_pull_request_url} target="_blank" rel="noreferrer">{t('issues.card.linked_pr', 'Linked PR')}</a> : null}</div></article>; }

export function IssueDetailPage({ number }: { number: number }) {
  const { t, formatDate } = useWebsiteI18n();
  const { session } = useSessionState(); const [issue,setIssue]=useState<GithubIssue|null>(null),[status,setStatus]=useState('loading'),[message,setMessage]=useState('');
  useEffect(()=>{ readJson<GithubIssue[]>(supabase.from('github_issues').request({ query: `select=*,github_issue_developers(*,profiles(*))&issue_number=eq.${number}` })).then((rows)=>{setIssue(rows[0]||null); setStatus('ready');}).catch((e:Error)=>{setMessage(e.message);setStatus('error');});},[number]);
  async function claim() { if (!session) { location.href = `/profile?returnTo=${encodeURIComponent(`/issues/${number}?claim=1`)}`; return; } const profs=await readJson<PublicProfile[]>(supabase.from('profiles').request({query:`select=*&id=eq.${session.user.id}`, accessToken: session.access_token})); const p=profs[0]; if (!profileComplete(p)) { location.href=`/profile/complete?returnTo=${encodeURIComponent(`/issues/${number}?claim=1`)}`; return; } await readJson(supabase.rpc('claim_github_issue',{ p_issue_number:number },session.access_token)); location.href=`/issues/${number}`; }
  if (status==='loading') return <main className="section"><div className="impact-state">{t('issues.detail.loading', 'Loading issue detail…')}</div></main>; if(status==='error'||!issue) return <main className="section"><div className="impact-state impact-state--error">{t('issues.detail.unavailable', 'Issue detail unavailable. {message}', { message })}</div></main>;
  const claimRow=primaryClaim(issue), p=claimProfile(claimRow);
  const notRecorded = t('issues.detail.not_recorded', 'Not recorded');
  const unknown = t('issues.detail.unknown', 'Unknown');
  const details: Array<[string, string]> = [[t('issues.detail.repository', 'Repository'),issue.repository || 'MyMindVentures/BankruptTo1Million'],[t('issues.detail.author', 'Author'),issue.author_login || issue.user_login || unknown],[t('issues.detail.state', 'State'),titleCase(issue.state)],[t('issues.detail.state_reason', 'State reason'),issue.state_reason || notRecorded],[t('issues.card.discipline', 'Discipline'),issueField(issue,'discipline')],[t('issues.card.difficulty', 'Difficulty'),issueField(issue,'difficulty')],[t('issues.detail.estimated_time', 'Estimated time'),issueField(issue,'time')],[t('issues.detail.claim_status', 'Claim status'),claimRow ? t('issues.card.claimed_by', 'Claimed by @{login}', { login: claimRow.github_login || p?.github_login || '' }) : t('issues.card.available', 'Available')],[t('issues.detail.created', 'Created'),issue.created_at ? formatDate(issue.created_at) : notRecorded],[t('issues.card.updated', 'Updated'),issue.updated_at ? formatDate(issue.updated_at) : notRecorded],[t('issues.detail.closed', 'Closed'),issue.closed_at ? formatDate(issue.closed_at) : notRecorded],[t('issues.detail.implemented', 'Implemented'),issue.implemented_at ? formatDate(issue.implemented_at) : notRecorded],[t('issues.detail.last_sync', 'Last Supabase sync'),issue.synced_at || issue.last_synced_at ? formatDate(issue.synced_at || issue.last_synced_at || '') : notRecorded]];
  return <main className="issues-page"><section className="section issue-detail"><p className="eyebrow">{t('issues.detail.eyebrow', 'Issue #{number}', { number })}</p><h1>{issue.title}</h1><div className="issue-actions"><a className="button" href={issue.html_url || issue.github_url || `https://github.com/MyMindVentures/BankruptTo1Million/issues/${number}`} target="_blank" rel="noreferrer">{t('issues.detail.open_github', 'Open original issue on GitHub')}</a>{isClaimAvailable(issue)?<button className="button button--ghost" onClick={claim}>{t('issues.card.claim_cta', 'Claim this issue')}</button>:null}</div><dl className="detail-grid">{details.map(([k,v])=><div key={k}><dt>{k}</dt><dd>{v || t('issues.card.unlabeled', 'Unlabeled')}</dd></div>)}</dl>{p?<a className="claimant" href="/profile/issues"><img src={p.avatar_url} alt={t('issues.detail.claimant_avatar_alt', 'Contributor avatar')} />@{p.github_login} {t('issues.detail.contributor_profile', 'contributor profile')}</a>:null}<div className="label-row">{labelsOf(issue).map((label)=><span key={label}>{label}</span>)}</div><article className="markdown-body" dangerouslySetInnerHTML={{__html: markdown(issue.body || t('issues.detail.body_empty', 'No issue body was synchronized.'))}} /></section></main>;
}
function profileComplete(p?: PublicProfile) { return Boolean(p?.display_name && p.role && p.github_profile_url && p.github_login && p.avatar_url && p.bio && p.primary_disciplines?.length && p.experience_level && p.consent_public_recognition && p.accepted_contribution_guidelines); }
export function ProfilePage() { const { t } = useWebsiteI18n(); const {session,refresh}=useSessionState(); const [mode,setMode]=useState<'signin'|'profile'>('signin'); const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[form,setForm]=useState<ProfileForm>({display_name:'',role:'Contributor',github_profile_url:'',github_login:'',avatar_url:'',bio:'',primary_disciplines:[],experience_level:'Beginner',consent_public_recognition:false,accepted_contribution_guidelines:false}); const returnTo=new URLSearchParams(location.search).get('returnTo')||'/profile/issues'; // eslint-disable-next-line react-hooks/exhaustive-deps
 useEffect(()=>{ if(session){setMode('profile'); readJson<PublicProfile[]>(supabase.from('profiles').request({query:`select=*&id=eq.${session.user.id}`,accessToken:session.access_token})).then((r)=>{if(r[0]) setForm({...form,...r[0], primary_disciplines:r[0].primary_disciplines||[]});});}},[]); async function auth(signUp=false){ await (signUp ? supabase.auth.signUp(email,password) : supabase.auth.signInWithPassword(email,password)); refresh(); setMode('profile'); }
 async function save(e:FormEvent){e.preventDefault(); if(!session) return; await readJson(supabase.from('profiles').request({method:'POST',accessToken:session.access_token,headers:{Prefer:'resolution=merge-duplicates,return=representation'},body:{id:session.user.id,...form}})); location.href=returnTo; }
 if(!session&&mode==='signin') return <main className="section"><h1>{t('profile.sign_in_title', 'Sign in to claim.')}</h1><div className="application-form"><input placeholder={t('profile.email_placeholder', 'Email')} value={email} onChange={(e)=>setEmail(e.target.value)}/><input placeholder={t('profile.password_placeholder', 'Password')} type="password" value={password} onChange={(e)=>setPassword(e.target.value)}/><button className="button" onClick={()=>auth(false)}>{t('profile.sign_in', 'Sign in')}</button><button className="button button--ghost" onClick={()=>auth(true)}>{t('profile.create_account', 'Create account')}</button></div></main>;
 return <main className="section"><h1>{t('profile.complete_title', 'Complete contributor profile.')}</h1><form className="application-form" onSubmit={save}><input required placeholder={t('profile.display_name', 'Display name')} value={form.display_name} onChange={(e)=>setForm({...form,display_name:e.target.value})}/><select value={form.role} onChange={(e)=>setForm({...form,role:e.target.value})}><option>{t('profile.role.contributor', 'Contributor')}</option><option>{t('profile.role.developer', 'Developer')}</option></select><input required placeholder={t('profile.github_login', 'GitHub login')} value={form.github_login} onChange={(e)=>setForm({...form,github_login:e.target.value})}/><input required placeholder={t('profile.github_url', 'GitHub profile URL')} value={form.github_profile_url} onChange={(e)=>setForm({...form,github_profile_url:e.target.value})}/><input required placeholder={t('profile.avatar_url', 'Avatar URL')} value={form.avatar_url} onChange={(e)=>setForm({...form,avatar_url:e.target.value})}/><textarea required placeholder={t('profile.bio', 'Short biography or skills summary')} value={form.bio} onChange={(e)=>setForm({...form,bio:e.target.value})}/><select value={form.experience_level} onChange={(e)=>setForm({...form,experience_level:e.target.value})}>{difficulties.map((d)=><option key={d}>{t(`profile.experience.${normalize(d)}`, d)}</option>)}</select><fieldset className="chip-group"><legend>{t('profile.disciplines', 'Primary disciplines')}</legend><div>{disciplines.map((d)=><button type="button" className={`chip ${form.primary_disciplines.includes(d)?'chip--active':''}`} onClick={()=>setForm({...form,primary_disciplines:form.primary_disciplines.includes(d)?form.primary_disciplines.filter(x=>x!==d):[...form.primary_disciplines,d]})} key={d}>{t(`profile.discipline.${normalize(d)}`, d)}</button>)}</div></fieldset><label><input type="checkbox" checked={form.consent_public_recognition} onChange={(e)=>setForm({...form,consent_public_recognition:e.target.checked})}/> {t('profile.public_consent', 'Consent to public recognition')}</label><label><input type="checkbox" checked={form.accepted_contribution_guidelines} onChange={(e)=>setForm({...form,accepted_contribution_guidelines:e.target.checked})}/> {t('profile.guidelines_consent', 'Accept contribution guidelines')}</label><button className="button" type="submit">{t('profile.save', 'Save profile')}</button></form></main> }
export function ProfileIssuesPage(){ const { t, formatDate } = useWebsiteI18n(); const {session}=useSessionState(); const [claims,setClaims]=useState<IssueDeveloper[]>([]); // eslint-disable-next-line react-hooks/exhaustive-deps
 useEffect(()=>{ if(session) readJson<IssueDeveloper[]>(supabase.from('github_issue_developers').request({query:`select=*,github_issues(*)&profile_id=eq.${session.user.id}`,accessToken:session.access_token})).then(setClaims);},[]); if(!session) return <main className="section"><h1>{t('profile.dashboard', 'Contributor dashboard')}</h1><a className="button" href="/profile?returnTo=/profile/issues">{t('profile.sign_in', 'Sign in')}</a></main>; return <main className="section"><h1>{t('profile.dashboard', 'Contributor dashboard')}</h1><p>{t('profile.dashboard_description', 'Public profile status, GitHub profile and contribution history are shown from Supabase.')}</p><div className="issue-grid">{claims.map((c)=><article className="issue-card" key={c.id}><h2>{titleCase(c.contribution_status)}</h2><p>{t('profile.claimed', 'Claimed {date} as @{login}.', { date: c.claimed_at ? formatDate(c.claimed_at) : t('issues.detail.not_recorded', 'Not recorded'), login: c.github_login || '' })}</p></article>)}</div></main> }
type ImpactStat = {
  label: string;
  value: number | string;
  description: string;
};

type ImpactBadge = {
  label: string;
  criteria: string;
};

type ContributionItem = {
  number: number;
  title: string;
  url: string;
  state?: string;
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
  badges: ImpactBadge[];
  isBot?: boolean;
};

type ImpactData = {
  source: string;
  refreshedAt: string;
  cacheTtlMinutes: number;
  stale: boolean;
  warning?: string;
  stats: {
    totalIssues: number;
    openIssues: number;
    closedIssues: number;
    featuresCompleted: number;
    bugFixesCompleted: number;
    mergedPullRequests: number;
    testsPassed?: number | null;
  };
  contributors: Contributor[];
  bots: Contributor[];
  attributionRules: string[];
};

function formatImpactDate(value: string | undefined, formatDate: (value: string | Date, options?: Intl.DateTimeFormatOptions) => string, unknown: string) {
  if (!value) return unknown;

  return formatDate(value, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function ImpactStatCard({ stat }: { stat: ImpactStat }) {
  return (
    <article className="impact-stat-card">
      <span>{stat.label}</span>
      <strong>{stat.value}</strong>
      <p>{stat.description}</p>
    </article>
  );
}

function ContributionBadge({ badge }: { badge: ImpactBadge }) {
  return <span className="contribution-badge" title={badge.criteria}>{badge.label}</span>;
}

function ContributorCard({ contributor, onSelect }: { contributor: Contributor; onSelect: (login: string) => void }) {
  const { t, formatDate } = useWebsiteI18n();
  return (
    <article className="contributor-card">
      <div className="contributor-card__identity">
        {contributor.avatarUrl ? (
          <img src={contributor.avatarUrl} alt={t('impact.avatar_alt', '{login} GitHub avatar', { login: contributor.login })} loading="lazy" />
        ) : (
          <span className="contributor-card__fallback" aria-hidden="true">{contributor.login.slice(0, 2).toUpperCase()}</span>
        )}
        <div>
          <h3>{contributor.displayName || contributor.login}</h3>
          <a href={contributor.profileUrl} target="_blank" rel="noreferrer">
            @{contributor.login} <ExternalLink aria-hidden="true" size={14} />
          </a>
        </div>
      </div>
      <dl className="contributor-card__stats">
        <div><dt>{t('impact.stat.issues', 'Issues')}</dt><dd>{contributor.implementedIssues.length}</dd></div>
        <div><dt>{t('impact.stat.prs', 'PRs')}</dt><dd>{contributor.mergedPullRequests.length}</dd></div>
        <div><dt>{t('impact.stat.features', 'Features')}</dt><dd>{contributor.featuresCompleted}</dd></div>
        <div><dt>{t('impact.stat.fixes', 'Fixes')}</dt><dd>{contributor.bugFixesCompleted}</dd></div>
        <div><dt>{t('impact.stat.reviews', 'Reviews')}</dt><dd>{contributor.reviewsPerformed}</dd></div>
      </dl>
      <p className="contributor-card__dates">{t('impact.first_latest', 'First: {first} · Latest: {latest}', { first: formatImpactDate(contributor.firstContributionDate, formatDate, t('impact.unknown_date', 'Unknown')), latest: formatImpactDate(contributor.mostRecentContributionDate, formatDate, t('impact.unknown_date', 'Unknown')) })}</p>
      <div className="badge-list" aria-label={t('impact.badges_aria', 'Badges for {login}', { login: contributor.login })}>
        {contributor.badges.map((badge) => <ContributionBadge badge={badge} key={badge.label} />)}
      </div>
      <button className="button button--ghost button--small" type="button" onClick={() => onSelect(contributor.login)}>
        {t('impact.view_history', 'View verified history')}
      </button>
    </article>
  );
}

function ContributorProfile({ contributor }: { contributor: Contributor }) {
  const { t, formatDate } = useWebsiteI18n();
  const timeline = [...contributor.mergedPullRequests, ...contributor.implementedIssues]
    .sort((a, b) => new Date(b.mergedAt || b.closedAt || 0).getTime() - new Date(a.mergedAt || a.closedAt || 0).getTime())
    .slice(0, 10);

  return (
    <article className="contributor-profile" aria-labelledby="contributor-profile-title">
      <div className="contributor-profile__header">
        <Award aria-hidden="true" />
        <div>
          <p className="eyebrow">{t('impact.contributor_detail', 'Contributor detail')}</p>
          <h2 id="contributor-profile-title">{contributor.displayName || contributor.login}</h2>
          <p>
            {t('impact.first_contribution', 'First contribution: {first} · Latest: {latest}', { first: formatImpactDate(contributor.firstContributionDate, formatDate, t('impact.unknown_date', 'Unknown')), latest: formatImpactDate(contributor.mostRecentContributionDate, formatDate, t('impact.unknown_date', 'Unknown')) })}
          </p>
        </div>
      </div>
      <dl className="contributor-profile__totals">
        <div><dt>{t('impact.implemented_issues', 'Implemented issues')}</dt><dd>{contributor.implementedIssues.length}</dd></div>
        <div><dt>{t('impact.merged_prs', 'Merged pull requests')}</dt><dd>{contributor.mergedPullRequests.length}</dd></div>
        <div><dt>{t('impact.reviews_performed', 'Reviews performed')}</dt><dd>{contributor.reviewsPerformed}</dd></div>
      </dl>
      <div className="badge-list">
        {contributor.badges.map((badge) => <ContributionBadge badge={badge} key={badge.label} />)}
      </div>
      <ol className="contribution-timeline" aria-label={t('impact.timeline_aria', 'Verified contribution timeline for {login}', { login: contributor.login })}>
        {timeline.map((item) => (
          <li key={`${item.url}-${item.number}`}>
            <span>{item.category || t('impact.contribution', 'Contribution')} #{item.number}</span>
            <a href={item.url} target="_blank" rel="noreferrer">{item.title}</a>
            <time dateTime={item.mergedAt || item.closedAt}>{formatImpactDate(item.mergedAt || item.closedAt, formatDate, t('impact.unknown_date', 'Unknown'))}</time>
          </li>
        ))}
      </ol>
    </article>
  );
}

function ImpactLoadingState() {
  const { t } = useWebsiteI18n();
  return <div className="impact-state" role="status"><RefreshCw aria-hidden="true" /> {t('impact.loading', 'Loading verified GitHub impact data…')}</div>;
}

function ImpactErrorState({ message }: { message: string }) {
  const { t } = useWebsiteI18n();
  return <div className="impact-state impact-state--error" role="alert">{t('impact.error', 'GitHub impact data could not be loaded. {message}', { message })}</div>;
}

function ImpactEmptyState() {
  const { t } = useWebsiteI18n();
  return <div className="impact-state">{t('impact.empty', 'No verified contributor activity is available yet. The dashboard will populate when merged pull requests and linked issues are found.')}</div>;
}

/** @deprecated Unreachable via public routing; `/impact` uses ImpactResultsPage. */
export function ImpactDashboardPage() {
  const { t, formatDate } = useWebsiteI18n();
  const [impactData, setImpactData] = useState<ImpactData | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedLogin, setSelectedLogin] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    fetch('/api/impact')
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json() as Promise<ImpactData>;
      })
      .then((data) => {
        if (!data || !data.stats || !Array.isArray(data.contributors)) throw new Error('Unexpected response shape.');
        if (!isMounted) return;
        setImpactData(data);
        setSelectedLogin(data.contributors[0]?.login ?? null);
        setStatus('ready');
      })
      .catch((error: Error) => {
        if (!isMounted) return;
        setErrorMessage(error.message);
        setStatus('error');
      });

    return () => { isMounted = false; };
  }, []);

  const selectedContributor = useMemo(
    () => impactData?.contributors.find((contributor) => contributor.login === selectedLogin) ?? null,
    [impactData, selectedLogin],
  );

  const stats: ImpactStat[] = impactData ? [
    { label: t('impact.stat.total_issues', 'Total issues created'), value: impactData.stats.totalIssues, description: t('impact.stat.total_issues_description', 'Issues tracked in the public repository.') },
    { label: t('impact.stat.open_issues', 'Open issues'), value: impactData.stats.openIssues, description: t('impact.stat.open_issues_description', 'Visible opportunities still waiting for builders.') },
    { label: t('impact.stat.closed_issues', 'Closed issues'), value: impactData.stats.closedIssues, description: t('impact.stat.closed_issues_description', 'Issues closed or implemented in GitHub.') },
    { label: t('impact.stat.completed_features', 'Features completed'), value: impactData.stats.featuresCompleted, description: t('impact.stat.completed_features_description', 'Closed issues and merged PRs marked as feature, UI or backend work.') },
    { label: t('impact.stat.completed_fixes', 'Bug fixes completed'), value: impactData.stats.bugFixesCompleted, description: t('impact.stat.completed_fixes_description', 'Closed issues and merged PRs marked as fixes.') },
    { label: t('impact.stat.merged_prs', 'Pull requests merged'), value: impactData.stats.mergedPullRequests, description: t('impact.stat.merged_prs_description', 'Merged PRs counted once by PR number.') },
    { label: t('impact.stat.workflow_checks', 'Workflow checks passed'), value: impactData.stats.testsPassed ?? t('impact.stat.not_reported', 'Not reported'), description: t('impact.stat.workflow_checks_description', 'Successful completed GitHub Actions runs when workflow data is available.') },
  ] : [];

  return (
    <main id="top" className="impact-page">
      <section className="hero impact-hero section-grid" aria-labelledby="impact-hero-title">
        <div className="hero__content">
          <p className="eyebrow">{t('impact.hero.eyebrow', 'Public impact dashboard')}</p>
          <h1 id="impact-hero-title">{t('impact.hero.title', 'Proof that work is moving.')}</h1>
          <p className="hero__lede">
            {t('impact.hero.description', 'Verified GitHub issues, pull requests and contributor history are translated into a transparent progress view for visitors, partners and founding builders.')}
          </p>
        </div>
        <aside className="hero-card impact-hero__note" aria-label={t('impact.hero.card_aria', 'Data source summary')}>
          <GitPullRequest aria-hidden="true" />
          <blockquote>{t('impact.hero.card_quote', 'Real repository data.')}</blockquote>
          <p>{t('impact.hero.card_description', 'No fake production statistics. Public data is synchronized server-side and cached to reduce GitHub API rate-limit risk.')}</p>
        </aside>
      </section>

      <section className="section" aria-labelledby="impact-overview-title">
        <SectionHeading eyebrow={t('impact.overview.eyebrow', 'Progress')} title={t('impact.overview.title', 'Current repository impact')} titleId="impact-overview-title">
          {t('impact.overview.description', 'Open work, completed work and merged pull requests remain useful aggregate statistics. For contributor action, browse the full Supabase-backed issue browser.')}
        </SectionHeading>
        <p><a className="button" href="/issues">{t('impact.browse_issues', 'Browse synchronized issues')}</a></p>
        {status === 'loading' ? <ImpactLoadingState /> : null}
        {status === 'error' ? <ImpactErrorState message={errorMessage} /> : null}
        {status === 'ready' && impactData ? (
          <>
            <div className="impact-refresh-note" role="status">
              <Clock aria-hidden="true" size={18} /> {t('impact.latest_refresh', 'Latest refresh: {date}', { date: formatImpactDate(impactData.refreshedAt, formatDate, t('impact.unknown_date', 'Unknown')) })} · {t('impact.refresh_window', 'Refresh window: {minutes} minutes', { minutes: impactData.cacheTtlMinutes })}{impactData.stale ? ` · ${t('impact.data_stale', 'Data may be stale')}` : ''}{impactData.warning ? ` · ${impactData.warning}` : ''}
            </div>
            <div className="impact-stat-grid">{stats.map((stat) => <ImpactStatCard stat={stat} key={stat.label} />)}</div>
          </>
        ) : null}
      </section>

      {status === 'ready' && impactData ? (
        <>
          <section className="section" aria-labelledby="builders-wall-title">
            <SectionHeading eyebrow={t('impact.builders.eyebrow', 'Wall of Founding Builders')} title={t('impact.builders.title', 'Verified early contributors')} titleId="builders-wall-title">
              {t('impact.builders.description', 'The wall recognizes contributors with merged repository work. Bot activity is excluded from the main wall and tracked separately when present.')}
            </SectionHeading>
            {impactData.contributors.length ? (
              <div className="contributor-grid">
                {impactData.contributors.map((contributor) => <ContributorCard contributor={contributor} key={contributor.login} onSelect={setSelectedLogin} />)}
              </div>
            ) : <ImpactEmptyState />}
          </section>

          {selectedContributor ? (
            <section className="section" aria-labelledby="contributor-detail-heading">
              <h2 className="visually-hidden" id="contributor-detail-heading">{t('impact.selected_detail', 'Selected contributor detail')}</h2>
              <ContributorProfile contributor={selectedContributor} />
            </section>
          ) : null}

          <section className="section section-grid" aria-labelledby="impact-rules-title">
            <SectionHeading eyebrow={t('impact.attribution.eyebrow', 'Attribution')} title={t('impact.attribution.title', 'How recognition is calculated')} titleId="impact-rules-title">
              {t('impact.attribution.description', 'Rules are documented here so visitors can understand how completed issues, merged pull requests and badges are assigned.')}
            </SectionHeading>
            <div className="story-panel">
              <ul className="impact-rule-list">
                {impactData.attributionRules.map((rule) => <li key={rule}>{rule}</li>)}
              </ul>
              {impactData.bots.length ? <p>{t('impact.bots_present', 'Separated bot accounts: {bots}.', { bots: impactData.bots.map((bot) => bot.login).join(', ') })}</p> : <p>{t('impact.bots_none', 'No automated bot contributors were included in the public wall.')}</p>}
            </div>
          </section>
        </>
      ) : null}
    </main>
  );
}

type FoundingHeroApplicationForm = {
  motivation: string;
  experienceSummary: string;
  availability: string;
  consentToContact: boolean;
  consentToPublicRecognition: boolean;
};

type FoundingHeroApplicationErrors = Partial<Record<keyof FoundingHeroApplicationForm, string>>;

const initialFoundingHeroApplication: FoundingHeroApplicationForm = {
  motivation: '',
  experienceSummary: '',
  availability: '',
  consentToContact: false,
  consentToPublicRecognition: false,
};

export function BecomeFoundingHeroPage() {
  const { t } = useWebsiteI18n();
  const [application, setApplication] = useState<FoundingHeroApplicationForm>(initialFoundingHeroApplication);
  const [errors, setErrors] = useState<FoundingHeroApplicationErrors>({});
  const [submissionState, setSubmissionState] = useState<'idle' | 'submitted'>('idle');

  const updateField = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, type, value } = event.target;
    const fieldName = name as keyof FoundingHeroApplicationForm;
    const nextValue = type === 'checkbox' ? (event.target as HTMLInputElement).checked : value;

    setApplication((currentApplication) => ({
      ...currentApplication,
      [fieldName]: nextValue,
    }));
    setErrors((currentErrors) => {
      if (!currentErrors[fieldName]) {
        return currentErrors;
      }

      const nextErrors = { ...currentErrors };
      delete nextErrors[fieldName];
      return nextErrors;
    });
    setSubmissionState('idle');
  };

  const validateApplication = () => {
    const nextErrors: FoundingHeroApplicationErrors = {};

    if (!application.motivation.trim()) {
      nextErrors.motivation = t('application.validation.motivation', 'Share a short motivation so we understand why this mission fits you.');
    }

    if (!application.consentToContact) {
      nextErrors.consentToContact = t('application.validation.contact', 'Confirm that we may contact you about this application.');
    }

    return nextErrors;
  };

  const handlePreviewSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors = validateApplication();
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setSubmissionState('idle');
      return;
    }

    setSubmissionState('submitted');
  };

  return (
    <main id="top" className="application-page">
      <section className="hero application-hero section-grid" aria-labelledby="application-hero-title">
        <div className="hero__content">
          <p className="eyebrow">{t('application.hero.eyebrow', 'Founding Hero application')}</p>
          <h1 id="application-hero-title">{t('application.hero.title', 'Start with one honest contribution.')}</h1>
          <p className="hero__lede">
            {t('application.hero.description', 'This page is the first public shell for people who want to help shape Bankrupt to 1 Million before the outcome is certain. The form is not connected yet, so it validates the local application structure without pretending a submission was sent.')}
          </p>
        </div>
        <aside className="hero-card application-hero__note" aria-label={t('application.hero.card_aria', 'Application status')}>
          <CheckCircle2 aria-hidden="true" />
          <blockquote>{t('application.hero.card_quote', 'Frontend preview.')}</blockquote>
          <p>
            {t('application.hero.card_description', 'The application flow uses local state only for now. A real submission step will be added only after privacy, storage and backend handling are configured.')}
          </p>
        </aside>
      </section>

      <section className="section section-grid" aria-labelledby="application-context-title">
        <SectionHeading eyebrow={t('application.context.eyebrow', 'Before you apply')} title={t('application.context.title', 'Choose the way you can help')} titleId="application-context-title">
          {t('application.context.description', 'Founding Heroes can support the mission through voluntary contribution, practical resources, sponsorship, investment interest or commercial collaboration depending on the role.')}
        </SectionHeading>
        <div className="story-panel application-note">
          <h3>{t('application.privacy.title', 'Privacy first')}</h3>
          <p>
            {t('application.privacy.description', 'Share only information you are comfortable providing. Public recognition will always require permission, and sensitive contact details should never appear on the Founding Heroes Wall.')}
          </p>
          <h3>{t('application.models.title', 'Participation models')}</h3>
          <p>
            {t('application.models.description', 'Some roles may be volunteer or in-kind support. Others may become sponsored, invested or commercial only through a separate written agreement.')}
          </p>
        </div>
      </section>

      <section className="section" aria-labelledby="application-form-title">
        <SectionHeading eyebrow={t('application.form.eyebrow', 'Form shell')} title={t('application.form.title', 'Structured application preview')} titleId="application-form-title">
          {t('application.form.description', 'This frontend-only form captures motivation, experience, availability and consent locally so the future Supabase submission can inherit a clear, accessible structure.')}
        </SectionHeading>

        <form className="application-form" aria-describedby="application-form-status" noValidate onSubmit={handlePreviewSubmit}>
          <fieldset>
            <legend>{t('application.identity.legend', 'Your identity')}</legend>
            <div className="form-grid">
              <div className="form-field">
                <label htmlFor="founding-hero-name">{t('application.name', 'Name')}</label>
                <input
                  id="founding-hero-name"
                  name="name"
                  type="text"
                  placeholder={t('application.name_placeholder', 'Your name or public alias')}
                  aria-describedby="founding-hero-name-help"
                  disabled
                />
                <p id="founding-hero-name-help">{t('application.name_help', 'Identity fields will be finalized in a follow-up issue.')}</p>
              </div>
              <div className="form-field">
                <label htmlFor="founding-hero-email">{t('application.email', 'Email')}</label>
                <input
                  id="founding-hero-email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  aria-describedby="founding-hero-email-help"
                  disabled
                />
                <p id="founding-hero-email-help">{t('application.email_help', 'Used only for application follow-up after backend storage is configured.')}</p>
              </div>
            </div>
          </fieldset>

          <fieldset>
            <legend>{t('application.contribution.legend', 'How you want to contribute')}</legend>
            <div className="form-grid">
              <div className="form-field">
                <label htmlFor="founding-hero-participation">{t('application.participation_type', 'Participation type')}</label>
                <select
                  id="founding-hero-participation"
                  name="participation"
                  aria-describedby="founding-hero-participation-help"
                  disabled
                  defaultValue=""
                >
                  <option value="">{t('application.participation.placeholder', 'Choose a future option')}</option>
                  <option>{t('application.participation.volunteer', 'Volunteer contribution')}</option>
                  <option>{t('application.participation.in_kind', 'In-kind support')}</option>
                  <option>{t('application.participation.sponsored', 'Sponsored support')}</option>
                  <option>{t('application.participation.investment', 'Investment interest')}</option>
                  <option>{t('application.participation.commercial', 'Commercial collaboration')}</option>
                </select>
                <p id="founding-hero-participation-help">{t('application.participation_help', 'These models explain intent only and do not create an automatic agreement.')}</p>
              </div>
              <div className="form-field">
                <label htmlFor="founding-hero-role">{t('application.focus', 'Contribution focus')}</label>
                <input
                  id="founding-hero-role"
                  name="role"
                  type="text"
                  placeholder={t('application.focus_placeholder', 'Frontend, writing, testing, hosting...')}
                  aria-describedby="founding-hero-role-help"
                  disabled
                />
                <p id="founding-hero-role-help">{t('application.focus_help', 'Role selection will be implemented in a separate focused issue.')}</p>
              </div>
            </div>
          </fieldset>

          <fieldset>
            <legend>{t('application.motivation.legend', 'Motivation and consent')}</legend>
            <div className="form-grid form-grid--single">
              <div className="form-field">
                <label htmlFor="founding-hero-motivation">{t('application.motivation', 'Why this mission fits you')} <span aria-hidden="true">*</span></label>
                <textarea
                  id="founding-hero-motivation"
                  name="motivation"
                  value={application.motivation}
                  placeholder={t('application.motivation_placeholder', 'A short note about why you want to contribute')}
                  aria-describedby={`founding-hero-motivation-help${errors.motivation ? ' founding-hero-motivation-error' : ''}`}
                  aria-invalid={errors.motivation ? 'true' : undefined}
                  onChange={updateField}
                  required
                />
                <p id="founding-hero-motivation-help">{t('application.motivation_help', 'Required. Share what draws you to the mission and the contribution you hope to make.')}</p>
                {errors.motivation ? (
                  <p className="form-error" id="founding-hero-motivation-error">
                    {errors.motivation}
                  </p>
                ) : null}
              </div>
              <div className="form-field">
                <label htmlFor="founding-hero-experience">{t('application.experience', 'Relevant experience')} <span className="optional-label">{t('application.optional', 'Optional')}</span></label>
                <textarea
                  id="founding-hero-experience"
                  name="experienceSummary"
                  value={application.experienceSummary}
                  placeholder={t('application.experience_placeholder', 'Skills, lived experience, projects or practical support you can offer')}
                  aria-describedby="founding-hero-experience-help"
                  onChange={updateField}
                />
                <p id="founding-hero-experience-help">{t('application.experience_help', 'Optional. Include only the background you are comfortable sharing.')}</p>
              </div>
              <div className="form-field">
                <label htmlFor="founding-hero-availability">{t('application.availability', 'Availability')} <span className="optional-label">{t('application.optional', 'Optional')}</span></label>
                <select
                  id="founding-hero-availability"
                  name="availability"
                  value={application.availability}
                  aria-describedby="founding-hero-availability-help"
                  onChange={updateField}
                >
                  <option value="">{t('application.availability.placeholder', 'Choose if you want to share availability')}</option>
                  <option value="one-off">{t('application.availability.one_off', 'One focused contribution')}</option>
                  <option value="few-hours-month">{t('application.availability.month', 'A few hours per month')}</option>
                  <option value="few-hours-week">{t('application.availability.week', 'A few hours per week')}</option>
                  <option value="discuss-first">{t('application.availability.discuss', 'I would rather discuss what is realistic')}</option>
                </select>
                <p id="founding-hero-availability-help">{t('application.availability_help', 'Optional. This helps plan respectfully and does not imply a long-term commitment.')}</p>
              </div>
              <div className="form-field consent-field">
                <div className="consent-field__control">
                  <input
                    id="founding-hero-contact-consent"
                    name="consentToContact"
                    type="checkbox"
                    checked={application.consentToContact}
                    aria-describedby={`founding-hero-contact-consent-help${errors.consentToContact ? ' founding-hero-contact-consent-error' : ''}`}
                    aria-invalid={errors.consentToContact ? 'true' : undefined}
                    onChange={updateField}
                    required
                  />
                  <label htmlFor="founding-hero-contact-consent">{t('application.contact_consent', 'You may contact me about this application')} <span aria-hidden="true">*</span></label>
                </div>
                <p id="founding-hero-contact-consent-help">{t('application.contact_help', 'Required. Contact permission is only for application follow-up and future consent confirmation.')}</p>
                {errors.consentToContact ? (
                  <p className="form-error" id="founding-hero-contact-consent-error">
                    {errors.consentToContact}
                  </p>
                ) : null}
              </div>
              <div className="form-field consent-field">
                <div className="consent-field__control">
                  <input
                    id="founding-hero-public-recognition-consent"
                    name="consentToPublicRecognition"
                    type="checkbox"
                    checked={application.consentToPublicRecognition}
                    aria-describedby="founding-hero-public-recognition-consent-help"
                    onChange={updateField}
                  />
                  <label htmlFor="founding-hero-public-recognition-consent">{t('application.public_recognition', 'I may want public recognition later')} <span className="optional-label">{t('application.optional', 'Optional')}</span></label>
                </div>
                <p id="founding-hero-public-recognition-consent-help">
                  {t('application.public_recognition_help', 'Optional and off by default. Public recognition will still require separate confirmation before anything is published on the Founding Heroes Wall.')}
                </p>
              </div>
            </div>
          </fieldset>

          <div className="form-status" id="application-form-status" role="status">
            <strong>{submissionState === 'submitted' ? t('application.status.complete', 'Local validation complete.') : t('application.status.closed', 'Submissions are not open yet.')}</strong>
            <span>
              {submissionState === 'submitted'
                ? t('application.status.complete_description', 'This frontend preview has not sent data anywhere. Supabase submission will be added in a separate backend issue.')
                : t('application.status.closed_description', 'Complete the required local fields to preview validation. Secure storage, privacy handling and real submission logic are still pending.')}
            </span>
          </div>
          <button className="button" type="submit">
            {t('application.submit', 'Preview application validation')}
          </button>
        </form>
      </section>
    </main>
  );
}


export function SupportMissionPage({ categoryId }: { categoryId?: string }) {
  const { t } = useWebsiteI18n();
  const selectedCategory = categoryById(categoryId || '') || supportCategories[0];
  const [opportunities, setOpportunities] = useState<SupportOpportunity[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');
  const [offer, setOffer] = useState<SupportOffer>({ name: '', email: '', categoryId: selectedCategory.id, message: '', consentToContact: false, consentToPublicRecognition: false });
  const [formState, setFormState] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    setOffer((current) => ({ ...current, categoryId: selectedCategory.id }));
  }, [selectedCategory.id]);

  useEffect(() => {
    getSupportOpportunities()
      .then((rows) => { setOpportunities(rows); setStatus('ready'); })
      .catch((e: Error) => { setError(e.message); setStatus('error'); });
  }, []);

  const counts = useMemo(() => Object.fromEntries(supportCategories.map((category) => [category.id, opportunitiesForCategory(opportunities, category.id).length])), [opportunities]);
  const selectedOpportunities = opportunitiesForCategory(opportunities, selectedCategory.id);

  async function handleOfferSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormState('submitting');
    setFormError('');
    if (!offer.name.trim() || !offer.email.trim() || !offer.message.trim() || !offer.consentToContact) {
      setFormError(t('support.validation.required', 'Please complete your name, email, support note and contact consent.'));
      setFormState('error');
      return;
    }
    try {
      await submitSupportOffer(offer);
      setFormState('success');
      setOffer({ name: '', email: '', categoryId: selectedCategory.id, message: '', consentToContact: false, consentToPublicRecognition: false });
    } catch (e) {
      setFormError(e instanceof Error ? e.message : t('support.validation.submit_error', 'Your support offer could not be submitted.'));
      setFormState('error');
    }
  }

  return <main id="top" className="support-page"><section className="hero support-hero section-grid" aria-labelledby="support-title"><div className="hero__content"><p className="eyebrow">{t('support.hero.eyebrow', 'Mission ecosystem')}</p><h1 id="support-title">{t('support.hero.title', 'Support Our Mission')}</h1><p className="hero__lede">{t('support.hero.description', 'Every great mission is built by people who choose to contribute in their own unique way.')}</p><p>{t('support.hero.body', 'Bankrupt to 1 Million needs support across technology, wellbeing, business, storytelling, practical help and funding — without turning the mission into a generic donation page.')}</p><div className="hero__actions"><a className="button" href="#support-categories">{t('support.hero.categories_cta', 'Choose How You Can Help')} <ArrowRight aria-hidden="true" size={18} /></a><a className="button button--ghost" href="#support-offer">{t('support.hero.offer_cta', 'Offer Another Kind of Support')}</a></div></div><aside className="hero-card"><Gift aria-hidden="true"/><blockquote>{t('support.hero.card_quote', 'Many ways to help.')}</blockquote><p>{t('support.hero.card_description', 'Choose a pathway, inspect current needs, or send a private offer when your skill, connection or resource does not fit a listed role.')}</p></aside></section><section className="section" id="support-categories" aria-labelledby="support-grid-title"><SectionHeading eyebrow={t('support.categories.eyebrow', 'Pathways')} title={t('support.categories.title', 'Choose your contribution lane')} titleId="support-grid-title">{t('support.categories.description', 'Each category is data-driven and connects to a stable detail view with current needs, open opportunities and privacy-first next steps.')}</SectionHeading>{status === 'loading' ? <div className="impact-state" role="status">{t('support.categories.loading', 'Loading active support opportunities…')}</div> : null}{status === 'error' ? <div className="impact-state impact-state--error" role="alert">{error} {t('support.categories.error_suffix', 'Showing evergreen support pathways.')}</div> : null}<div className="support-grid">{supportCategories.map((category) => <article className="support-card" key={category.id}><span className="support-card__marker">{category.marker}</span><h3>{category.title}</h3><p>{category.summary}</p><p className="support-card__count">{t('support.categories.opportunity_count', '{count} active opportunities', { count: counts[category.id] || 0 })}</p><a className="button button--ghost button--small" href={`/support/${category.id}`}>{category.cta}</a></article>)}</div></section><section className="section section-grid support-detail" id="support-detail" aria-labelledby="support-detail-title"><div><p className="eyebrow">{t('support.detail.eyebrow', 'Category detail')}</p><h2 id="support-detail-title">{selectedCategory.title}</h2><p>{selectedCategory.whyItMatters}</p>{selectedCategory.privacyNote ? <p className="support-privacy-note">{selectedCategory.privacyNote} {t('support.detail.medical_note', 'Coaches, therapists and wellbeing supporters do not replace licensed medical care.')}</p> : null}<h3>{t('support.detail.needs_title', 'Current concrete needs')}</h3><ul className="support-need-list">{selectedCategory.needs.map((need) => <li key={need}>{need}</li>)}</ul></div><div className="story-panel"><h3>{t('support.detail.opportunities_title', 'Open opportunities')}</h3>{status === 'loading' ? <p>{t('support.detail.loading', 'Checking for current open roles…')}</p> : null}{status !== 'loading' && !selectedOpportunities.length ? <p>{t('support.detail.empty', 'No specific open opportunity is published for this category yet. You can still send a private offer below.')}</p> : null}{selectedOpportunities.map((opportunity) => <article className="support-opportunity" key={opportunity.id}><h4>{opportunity.title}</h4><p>{opportunity.summary}</p><a className="button button--small" href={opportunity.applicationUrl || '#support-offer'}>{opportunity.applicationUrl ? t('support.detail.apply_opportunity', 'Apply to opportunity') : t('support.detail.apply', 'Apply')}</a></article>)}</div></section><section className="section" id="support-offer" aria-labelledby="support-offer-title"><SectionHeading eyebrow={t('support.offer.eyebrow', 'Private offer')} title={t('support.offer.title', 'Offer another kind of support')} titleId="support-offer-title">{t('support.offer.description', 'You may have a skill, connection or resource we have not thought of yet. Tell us how you believe you can help.')}</SectionHeading><form className="application-form" onSubmit={handleOfferSubmit}><div className="form-grid"><div className="form-field"><label htmlFor="support-name">{t('support.offer.name', 'Name')}</label><input id="support-name" value={offer.name} onChange={(e)=>setOffer({...offer,name:e.target.value})} required /></div><div className="form-field"><label htmlFor="support-email">{t('support.offer.email', 'Email')}</label><input id="support-email" type="email" value={offer.email} onChange={(e)=>setOffer({...offer,email:e.target.value})} required /></div></div><div className="form-field"><label htmlFor="support-category">{t('support.offer.category', 'Support category')}</label><select id="support-category" value={offer.categoryId} onChange={(e)=>setOffer({...offer,categoryId:e.target.value})}>{supportCategories.map((category)=><option value={category.id} key={category.id}>{category.title}</option>)}<option value="another-kind">{t('support.offer.another_category', 'Another kind of support')}</option></select></div><div className="form-field"><label htmlFor="support-message">{t('support.offer.message', 'How can you help?')}</label><textarea id="support-message" value={offer.message} onChange={(e)=>setOffer({...offer,message:e.target.value})} required /></div><label><input type="checkbox" checked={offer.consentToContact} onChange={(e)=>setOffer({...offer,consentToContact:e.target.checked})} required /> {t('support.offer.contact_consent', 'You may contact me privately about this offer.')}</label><label><input type="checkbox" checked={offer.consentToPublicRecognition} onChange={(e)=>setOffer({...offer,consentToPublicRecognition:e.target.checked})} /> {t('support.offer.public_consent', 'I may be open to public recognition later, after explicit separate consent.')}</label><div className={`form-status${formState === 'error' ? ' impact-state--error' : ''}`} role={formState === 'error' ? 'alert' : 'status'}><strong>{formState === 'success' ? t('support.offer.success', 'Support offer received.') : formState === 'submitting' ? t('support.offer.submitting', 'Submitting…') : t('support.offer.private', 'Private by default.')}</strong><span>{formState === 'success' ? t('support.offer.success_description', 'Thank you. Public recognition still requires separate explicit consent.') : formError || t('support.offer.private_description', 'Email, health details and internal notes are never displayed publicly from this page.')}</span></div><button className="button" type="submit" disabled={formState === 'submitting'}>{t('support.hero.offer_cta', 'Offer Another Kind of Support')}</button></form></section></main>;
}

function App() {
  const path = window.location.pathname;

  return (
    <>
      <Header />
      <div className="page-shell">
      {path === '/help-us-break-the-circle' ? (
        <BreakTheCirclePage />
      ) : path.startsWith('/help-us-break-the-circle/') ? (
        <BreakTheCircleArticlePage slug={decodeURIComponent(path.split('/')[2] || '')} />
      ) : path === '/admin/journal/comments' ? (
        <AdminJournalCommentsPage />
      ) : path === '/admin/break-the-circle' ? (
        <AdminBreakTheCirclePage />
      ) : path === '/admin/break-the-circle/new' ? (
        <AdminBreakTheCircleEditorPage />
      ) : path.startsWith('/admin/break-the-circle/') && path.endsWith('/preview') ? (
        <AdminBreakTheCirclePreviewPage id={decodeURIComponent(path.split('/')[3] || '')} />
      ) : path.startsWith('/admin/break-the-circle/') ? (
        <AdminBreakTheCircleEditorPage id={decodeURIComponent(path.split('/')[3] || '')} />
      ) : path === '/break-the-circle' ? (
        <BreakTheCirclePage />
      ) : path.startsWith('/break-the-circle/') ? (
        <BreakTheCircleArticlePage slug={decodeURIComponent(path.split('/')[2] || '')} />
      ) : path === '/proof-of-mind' ? (
        <ProofOfMindPage />
      ) : path.startsWith('/proof-of-mind/') ? (
        <ProofOfMindDetailPage slug={decodeURIComponent(path.split('/')[2] || '')} />
      ) : path === '/journal' ? (
        <JournalPage />
      ) : path.startsWith('/journal/category/') || path.startsWith('/journal/tag/') || path.startsWith('/journal/venture/') || path.startsWith('/journal/author/') ? (
        <JournalPage />
      ) : path.startsWith('/journal/') ? (
        <JournalArticlePage slug={decodeURIComponent(path.split('/')[2] || '')} />
      ) : path === '/founding-heroes' ? (
        <FoundingHeroesPage />
      ) : path === '/support' ? (
        <SupportMissionPage />
      ) : path.startsWith('/support/') ? (
        <SupportMissionPage categoryId={decodeURIComponent(path.split('/')[2] || '')} />
      ) : path === '/impact' ? (
        <ImpactDashboardPage />
      ) : path === '/issues' ? (
        <IssuesPage />
      ) : path.startsWith('/issues/') ? (
        <IssueDetailPage number={Number(path.split('/')[2])} />
      ) : path === '/profile' || path === '/profile/complete' ? (
        <ProfilePage />
      ) : path === '/profile/issues' ? (
        <ProfileIssuesPage />
      ) : path === '/become-a-founding-hero' ? (
        <BecomeFoundingHeroPage />
      ) : (
        <HomePage />
      )}
      </div>
      <Footer />
    </>
  );
}

export default App;
