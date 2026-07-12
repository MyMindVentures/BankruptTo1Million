import { ArrowRight, Award, CheckCircle2, Clock, ExternalLink, Gift, GitPullRequest, HeartHandshake, RefreshCw, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { AdminJournalCommentsPage, JournalArticlePage, JournalPage } from './pages/JournalPages';
import { ProofOfMindDetailPage, ProofOfMindPage } from './pages/ProofOfMindPages';
import { AdminBreakTheCircleEditorPage, AdminBreakTheCirclePage, AdminBreakTheCirclePreviewPage, BreakTheCircleArticlePage, BreakTheCirclePage } from './pages/BreakTheCirclePages';
import { SectionHeading } from './components/SectionHeading';
import { supabase } from './lib/supabase';
import { getPublishedFoundingHeroes } from './lib/foundingHeroes';
import type { PublicFoundingHero } from './lib/foundingHeroes';
import { foundingHeroRoles, platformFeatures, roadmap } from './data/siteContent';
import { categoryById, getSupportOpportunities, opportunitiesForCategory, submitSupportOffer, supportCategories } from './lib/supportMission';
import type { SupportOffer, SupportOpportunity } from './lib/supportMission';

function HomePage() {
  return (
    <main id="top">
      <section className="hero section-grid" aria-labelledby="hero-title">
        <div className="hero__content">
          <p className="eyebrow">More than rebuilding a life. Building a movement.</p>
          <h1 id="hero-title">Building in public from financial rock bottom.</h1>
          <p className="hero__lede">
            Bankrupt to 1 Million is a living documentary, community platform and venture story about rebuilding honestly — one story,
            one connection and one feature at a time.
          </p>
          <div className="hero__actions" aria-label="Primary calls to action">
            <a className="button" href="/issues">
              Browse contribution issues <ArrowRight aria-hidden="true" size={18} />
            </a>
            <a className="button button--ghost" href="/support">
              Support our mission
            </a>
          </div>
        </div>
        <aside className="hero-card" aria-label="Project belief">
          <HeartHandshake aria-hidden="true" />
          <blockquote>No one rebuilds alone.</blockquote>
          <p>
            The platform exists to help the right people find each other through trust, collaboration and human connection.
          </p>
        </aside>
      </section>

      <section className="section section-grid" id="story" aria-labelledby="story-title">
        <SectionHeading eyebrow="The story" title="A real journey in progress" titleId="story-title">
          Kevin De Vlieger and Micha are starting from financial rock bottom and choosing to build publicly instead of waiting for a perfect moment.
        </SectionHeading>
        <div className="story-panel">
          <p>
            This website is designed to feel human, cinematic, editorial and warm — a credible home for transparent founder updates,
            contribution opportunities, documentary moments and future ventures.
          </p>
          <p>
            The goal is not to manufacture a polished success story after the fact. The goal is to invite builders, creators,
            supporters and partners into the rebuild while the outcome is still being shaped.
          </p>
        </div>
      </section>

      <section className="section" id="platform" aria-labelledby="platform-title">
        <SectionHeading eyebrow="Platform vision" title="The full product scaffold" titleId="platform-title">
          The long-term platform combines storytelling, community recognition, partnership pathways and a public roadmap into one coherent experience.
        </SectionHeading>
        <div className="feature-grid">
          {platformFeatures.map((feature) => {
            const Icon = feature.icon;
            return (
              <article className="feature-card" key={feature.title}>
                <Icon aria-hidden="true" />
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="section section-grid" id="roadmap" aria-labelledby="roadmap-title">
        <SectionHeading eyebrow="Build path" title="Progressive, issue-led growth" titleId="roadmap-title">
          The scaffold supports small, focused contributions today while leaving room for future pages, integrations and content systems.
        </SectionHeading>
        <ol className="roadmap-list">
          {roadmap.map((item) => (
            <li key={item.phase}>
              <span>{item.phase}</span>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="section contribute" id="contribute" aria-labelledby="contribute-title">
        <div>
          <p className="eyebrow">Founding builders</p>
          <h2 id="contribute-title">Build one meaningful feature.</h2>
          <p>
            Contributors can help with components, pages, forms, accessibility, documentation, testing workflows, translations and future integrations.
            Every focused contribution becomes part of the public history of the movement.
          </p>
        </div>
        <div className="contribute__actions">
          <a className="button" href="/issues">
            <Users aria-hidden="true" size={18} /> Browse open issues
          </a>
          <a className="button button--ghost" href="https://github.com/MyMindVentures/BankruptTo1Million#how-to-contribute">
            <CheckCircle2 aria-hidden="true" size={18} /> Contribution guide
          </a>
        </div>
      </section>
    </main>
  );
}

function FoundingHeroCard({ hero }: { hero: PublicFoundingHero }) {
  const initials = hero.displayName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'FH';
  const links = [
    { href: hero.websiteUrl, label: 'Website' },
    { href: hero.githubUrl, label: 'GitHub' },
    { href: hero.linkedinUrl, label: 'LinkedIn' },
  ].filter((link) => link.href);
  return <article className={`founding-profile-card${hero.featured ? ' founding-profile-card--featured' : ''}`}>
    <div className="founding-profile-card__top">
      {hero.avatarUrl ? <img src={hero.avatarUrl} alt={`${hero.displayName} profile portrait`} loading="lazy" /> : <div className="founding-profile-card__avatar" aria-hidden="true">{initials}</div>}
      <div>
        <p className="eyebrow">{hero.featured ? 'Featured Founding Hero' : hero.recognitionLevel || 'Founding Hero'}</p>
        <h3>{hero.displayName}</h3>
        <p>{hero.roleTitle}</p>
      </div>
    </div>
    {hero.shortBio ? <p>{hero.shortBio}</p> : null}
    {hero.supportMessage ? <blockquote>{hero.supportMessage}</blockquote> : null}
    <div className="founding-profile-card__meta">
      {hero.location ? <span>{hero.location}</span> : null}
      {hero.joinedAt ? <span>Joined {fmt(hero.joinedAt)}</span> : null}
      {hero.isAnonymous ? <span>Identity kept private by request</span> : null}
    </div>
    {links.length ? <div className="founding-profile-card__links">{links.map((link) => <a key={link.label} href={link.href} target="_blank" rel="noreferrer">{link.label}<ExternalLink size={14} aria-hidden="true" /></a>)}</div> : null}
  </article>;
}

function FoundingHeroesPage() {
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
          <p className="eyebrow">Founding Heroes</p>
          <h1 id="founding-hero-title">Belief before proof.</h1>
          <p className="hero__lede">
            This wall recognizes approved early builders who chose to contribute before the outcome was certain.
            It is a quiet public thank you for useful work, courage and trust.
          </p>
          <div className="hero__actions" aria-label="Founding Heroes calls to action">
            <a className="button" href="/become-a-founding-hero">
              Become a Founding Hero <ArrowRight aria-hidden="true" size={18} />
            </a>
            <a className="button button--ghost" href="#founding-hero-profiles">
              View profiles
            </a>
          </div>
        </div>
        <aside className="hero-card founding-hero__note" aria-label="Recognition principle">
          <HeartHandshake aria-hidden="true" />
          <blockquote>Recognition without performance.</blockquote>
          <p>
            Only published Supabase records appear here. Private applications, email addresses and internal notes stay hidden.
          </p>
        </aside>
      </section>

      <section className="section section-grid" aria-labelledby="recognition-title">
        <SectionHeading eyebrow="Recognition" title="A permanent place for early trust" titleId="recognition-title">
          Founding Heroes are people who help shape the foundation: code, design, writing, testing, accessibility, introductions and practical support.
        </SectionHeading>
        <div className="story-panel">
          <p>
            The wall is loaded from the approved public profile fields in Supabase, so publication changes are reflected on reload.
          </p>
          <p>
            Anonymous recognition is supported without exposing names, locations, avatars or social links.
          </p>
        </div>
      </section>

      <section className="section" id="founding-hero-profiles" aria-labelledby="profile-slots-title">
        <SectionHeading eyebrow="Public wall" title="Published Founding Heroes" titleId="profile-slots-title">
          Real profiles appear only after they are explicitly approved for publication.
        </SectionHeading>
        {status === 'loading' ? <div className="impact-state" role="status" aria-live="polite">Loading Founding Heroes from Supabase…</div> : null}
        {status === 'error' ? <div className="impact-state impact-state--error" role="alert">{error}</div> : null}
        {status === 'ready' && !heroes.length ? <div className="impact-state"><strong>No Founding Heroes are published yet.</strong><br />Approved contributor profiles will appear here as soon as they are ready.</div> : null}
        {heroes.length ? <div className="founding-profile-grid" role="list">{heroes.map((hero) => <div role="listitem" key={hero.id}><FoundingHeroCard hero={hero} /></div>)}</div> : null}
      </section>

      <section className="section section-grid" id="founding-hero-roles" aria-labelledby="roles-title">
        <SectionHeading eyebrow="Open roles" title="Useful ways to help next" titleId="roles-title">
          The first opportunities stay small, practical and issue-led so contributors can build one meaningful feature at a time.
        </SectionHeading>
        <ul className="role-list" aria-label="Future open role categories">
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
function fmt(value?: string) { return value ? new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(value)) : 'Not recorded'; }
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

function IssuesPage() {
  const [issues, setIssues] = useState<GithubIssue[]>([]), [status, setStatus] = useState('loading'), [error, setError] = useState(''), [search, setSearch] = useState(new URLSearchParams(location.search).get('q') || ''), [sort, setSort] = useState(new URLSearchParams(location.search).get('sort') || 'newest');
  const [filters, setFilters] = useState<Record<FilterKey, string[]>>(() => Object.fromEntries(filterGroups.map((g) => [g.key, new URLSearchParams(location.search).getAll(g.key)])) as Record<FilterKey, string[]>);
  useEffect(() => { readJson<GithubIssue[]>(supabase.from('github_issues').request({ query: 'select=*,github_issue_developers(*,profiles(*))&order=created_at.desc' })).then(setIssues).then(() => setStatus('ready')).catch((e: Error) => { setError(e.message); setStatus('error'); }); }, []);
  useEffect(() => { const params = new URLSearchParams(); if (search) params.set('q', search); if (sort !== 'newest') params.set('sort', sort); filterGroups.forEach((g) => filters[g.key].forEach((v) => params.append(g.key, v))); history.replaceState(null, '', `/issues${params.toString() ? `?${params}` : ''}`); }, [filters, search, sort]);
  const filtered = useMemo(() => issues.filter((issue) => {
    const q = search.trim().toLowerCase();
    if (q && !String(issueNumber(issue)).includes(q) && !issue.title.toLowerCase().includes(q)) return false;
    return filterGroups.every((g) => !filters[g.key].length || filters[g.key].some((v) => normalize(issueField(issue, g.key)) === normalize(v) || labelsOf(issue).some((l) => normalize(l).includes(normalize(v)))));
  }).sort((a,b) => sort === 'updated' ? Date.parse(b.updated_at || '') - Date.parse(a.updated_at || '') : sort === 'easy' ? difficulties.indexOf(issueField(a,'difficulty')) - difficulties.indexOf(issueField(b,'difficulty')) : sort === 'short' ? times.indexOf(issueField(a,'time')) - times.indexOf(issueField(b,'time')) : Date.parse(b.created_at || '') - Date.parse(a.created_at || '')), [issues, filters, search, sort]);
  const toggle = (key: FilterKey, value: string) => setFilters((current) => ({ ...current, [key]: current[key].includes(value) ? current[key].filter((v) => v !== value) : [...current[key], value] }));
  return <main className="issues-page"><section className="hero issue-hero section-grid"><div><p className="eyebrow">Supabase issue browser</p><h1>Choose focused work.</h1><p className="hero__lede">Browse synchronized GitHub issues from Supabase, filter by real labels, and claim work only after contributor profile completion.</p><a className="button" href="/impact">Back to impact</a></div><aside className="hero-card"><GitPullRequest/><blockquote>{filtered.length} matches</blockquote><p>{issues.length} synchronized public issues loaded from Supabase.</p></aside></section><section className="section"><div className="issue-toolbar"><label>Search issues<input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Number or title" /></label><label>Sort<select value={sort} onChange={(e)=>setSort(e.target.value)}><option value="newest">Newest</option><option value="updated">Recently updated</option><option value="easy">Easiest first</option><option value="short">Shortest estimated time</option></select></label><button className="button button--ghost button--small" onClick={()=>{setFilters(Object.fromEntries(filterGroups.map((g)=>[g.key, []])) as unknown as Record<FilterKey,string[]>); setSearch('');}}>Reset filters</button></div>{filterGroups.map((group)=><fieldset className="chip-group" key={group.key}><legend>{group.label}</legend><div>{group.values.map((value)=><button type="button" className={`chip ${filters[group.key].includes(value) ? 'chip--active' : ''}`} onClick={()=>toggle(group.key,value)} key={value}>{value}</button>)}</div></fieldset>)}{status==='loading' ? <div className="impact-state">Loading Supabase issues…</div> : null}{status==='error' ? <div className="impact-state impact-state--error">Could not load Supabase issues. {error}</div> : null}{status==='ready' && !filtered.length ? <div className="impact-state">No issues match these filters. Reset filters or try a broader search.</div> : null}<div className="issue-grid">{filtered.map((issue)=><IssueCard issue={issue} key={issue.id}/>)}</div></section></main>;
}
function IssueCard({ issue }: { issue: GithubIssue }) { const claim = primaryClaim(issue), profile = claimProfile(claim); return <article className="issue-card"><div className="issue-card__top"><span>#{issueNumber(issue)}</span><strong>{titleCase(issue.state || 'open')}</strong></div><h2>{issue.title}</h2><p>{issue.summary || String(issue.body || '').slice(0, 180) || 'No summary synchronized yet.'}</p><dl><div><dt>Type</dt><dd>{issueField(issue,'type') || 'Unlabeled'}</dd></div><div><dt>Discipline</dt><dd>{issueField(issue,'discipline') || 'Unlabeled'}</dd></div><div><dt>Difficulty</dt><dd>{issueField(issue,'difficulty') || 'Unlabeled'}</dd></div><div><dt>Time</dt><dd>{issueField(issue,'time') || 'Unlabeled'}</dd></div><div><dt>Claim</dt><dd>{claim ? `Claimed by @${claim.github_login || profile?.github_login}` : 'Available'}</dd></div><div><dt>Updated</dt><dd>{fmt(issue.updated_at)}</dd></div><div><dt>Implementation</dt><dd>{titleCase(issue.implementation_status || 'Not started')}</dd></div></dl><div className="label-row">{labelsOf(issue).map((label)=><span key={label}>{label}</span>)}</div><div className="issue-actions"><a className="button button--small" href={`/issues/${issueNumber(issue)}`}>View issue</a>{isClaimAvailable(issue) ? <a className="button button--ghost button--small" href={`/issues/${issueNumber(issue)}?claim=1`}>Claim this issue</a> : null}{issue.linked_pull_request_url ? <a className="button button--ghost button--small" href={issue.linked_pull_request_url} target="_blank" rel="noreferrer">Linked PR</a> : null}</div></article>; }

function IssueDetailPage({ number }: { number: number }) {
  const { session } = useSessionState(); const [issue,setIssue]=useState<GithubIssue|null>(null),[status,setStatus]=useState('loading'),[message,setMessage]=useState('');
  useEffect(()=>{ readJson<GithubIssue[]>(supabase.from('github_issues').request({ query: `select=*,github_issue_developers(*,profiles(*))&issue_number=eq.${number}` })).then((rows)=>{setIssue(rows[0]||null); setStatus('ready');}).catch((e:Error)=>{setMessage(e.message);setStatus('error');});},[number]);
  async function claim() { if (!session) { location.href = `/profile?returnTo=${encodeURIComponent(`/issues/${number}?claim=1`)}`; return; } const profs=await readJson<PublicProfile[]>(supabase.from('profiles').request({query:`select=*&id=eq.${session.user.id}`, accessToken: session.access_token})); const p=profs[0]; if (!profileComplete(p)) { location.href=`/profile/complete?returnTo=${encodeURIComponent(`/issues/${number}?claim=1`)}`; return; } await readJson(supabase.rpc('claim_github_issue',{ p_issue_number:number },session.access_token)); location.href=`/issues/${number}`; }
  if (status==='loading') return <main className="section"><div className="impact-state">Loading issue detail…</div></main>; if(status==='error'||!issue) return <main className="section"><div className="impact-state impact-state--error">Issue detail unavailable. {message}</div></main>;
  const claimRow=primaryClaim(issue), p=claimProfile(claimRow);
  return <main className="issues-page"><section className="section issue-detail"><p className="eyebrow">Issue #{number}</p><h1>{issue.title}</h1><div className="issue-actions"><a className="button" href={issue.html_url || issue.github_url || `https://github.com/MyMindVentures/BankruptTo1Million/issues/${number}`} target="_blank" rel="noreferrer">Open original issue on GitHub</a>{isClaimAvailable(issue)?<button className="button button--ghost" onClick={claim}>Claim this issue</button>:null}</div><dl className="detail-grid">{[['Repository',issue.repository||'MyMindVentures/BankruptTo1Million'],['Author',issue.author_login||issue.user_login||'Unknown'],['State',titleCase(issue.state)],['State reason',issue.state_reason||'Not recorded'],['Discipline',issueField(issue,'discipline')],['Difficulty',issueField(issue,'difficulty')],['Estimated time',issueField(issue,'time')],['Claim status',claimRow?`Claimed by @${claimRow.github_login || p?.github_login}`:'Available'],['Created',fmt(issue.created_at)],['Updated',fmt(issue.updated_at)],['Closed',fmt(issue.closed_at)],['Implemented',fmt(issue.implemented_at)],['Last Supabase sync',fmt(issue.synced_at||issue.last_synced_at)]].map(([k,v])=><div key={k}><dt>{k}</dt><dd>{v||'Unlabeled'}</dd></div>)}</dl>{p?<a className="claimant" href="/profile/issues"><img src={p.avatar_url} alt=""/>@{p.github_login} contributor profile</a>:null}<div className="label-row">{labelsOf(issue).map((label)=><span key={label}>{label}</span>)}</div><article className="markdown-body" dangerouslySetInnerHTML={{__html: markdown(issue.body)}} /></section></main>;
}
function profileComplete(p?: PublicProfile) { return Boolean(p?.display_name && p.role && p.github_profile_url && p.github_login && p.avatar_url && p.bio && p.primary_disciplines?.length && p.experience_level && p.consent_public_recognition && p.accepted_contribution_guidelines); }
function ProfilePage() { const {session,refresh}=useSessionState(); const [mode,setMode]=useState<'signin'|'profile'>('signin'); const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[form,setForm]=useState<ProfileForm>({display_name:'',role:'Contributor',github_profile_url:'',github_login:'',avatar_url:'',bio:'',primary_disciplines:[],experience_level:'Beginner',consent_public_recognition:false,accepted_contribution_guidelines:false}); const returnTo=new URLSearchParams(location.search).get('returnTo')||'/profile/issues'; // eslint-disable-next-line react-hooks/exhaustive-deps
 useEffect(()=>{ if(session){setMode('profile'); readJson<PublicProfile[]>(supabase.from('profiles').request({query:`select=*&id=eq.${session.user.id}`,accessToken:session.access_token})).then((r)=>{if(r[0]) setForm({...form,...r[0], primary_disciplines:r[0].primary_disciplines||[]});});}},[]); async function auth(signUp=false){ await (signUp ? supabase.auth.signUp(email,password) : supabase.auth.signInWithPassword(email,password)); refresh(); setMode('profile'); }
 async function save(e:FormEvent){e.preventDefault(); if(!session) return; await readJson(supabase.from('profiles').request({method:'POST',accessToken:session.access_token,headers:{Prefer:'resolution=merge-duplicates,return=representation'},body:{id:session.user.id,...form}})); location.href=returnTo; }
 if(!session&&mode==='signin') return <main className="section"><h1>Sign in to claim.</h1><div className="application-form"><input placeholder="Email" value={email} onChange={(e)=>setEmail(e.target.value)}/><input placeholder="Password" type="password" value={password} onChange={(e)=>setPassword(e.target.value)}/><button className="button" onClick={()=>auth(false)}>Sign in</button><button className="button button--ghost" onClick={()=>auth(true)}>Create account</button></div></main>;
 return <main className="section"><h1>Complete contributor profile.</h1><form className="application-form" onSubmit={save}><input required placeholder="Display name" value={form.display_name} onChange={(e)=>setForm({...form,display_name:e.target.value})}/><select value={form.role} onChange={(e)=>setForm({...form,role:e.target.value})}><option>Contributor</option><option>Developer</option></select><input required placeholder="GitHub login" value={form.github_login} onChange={(e)=>setForm({...form,github_login:e.target.value})}/><input required placeholder="GitHub profile URL" value={form.github_profile_url} onChange={(e)=>setForm({...form,github_profile_url:e.target.value})}/><input required placeholder="Avatar URL" value={form.avatar_url} onChange={(e)=>setForm({...form,avatar_url:e.target.value})}/><textarea required placeholder="Short biography or skills summary" value={form.bio} onChange={(e)=>setForm({...form,bio:e.target.value})}/><select value={form.experience_level} onChange={(e)=>setForm({...form,experience_level:e.target.value})}>{difficulties.map((d)=><option key={d}>{d}</option>)}</select><fieldset className="chip-group"><legend>Primary disciplines</legend><div>{disciplines.map((d)=><button type="button" className={`chip ${form.primary_disciplines.includes(d)?'chip--active':''}`} onClick={()=>setForm({...form,primary_disciplines:form.primary_disciplines.includes(d)?form.primary_disciplines.filter(x=>x!==d):[...form.primary_disciplines,d]})} key={d}>{d}</button>)}</div></fieldset><label><input type="checkbox" checked={form.consent_public_recognition} onChange={(e)=>setForm({...form,consent_public_recognition:e.target.checked})}/> Consent to public recognition</label><label><input type="checkbox" checked={form.accepted_contribution_guidelines} onChange={(e)=>setForm({...form,accepted_contribution_guidelines:e.target.checked})}/> Accept contribution guidelines</label><button className="button" type="submit">Save profile</button></form></main> }
function ProfileIssuesPage(){ const {session}=useSessionState(); const [claims,setClaims]=useState<IssueDeveloper[]>([]); // eslint-disable-next-line react-hooks/exhaustive-deps
 useEffect(()=>{ if(session) readJson<IssueDeveloper[]>(supabase.from('github_issue_developers').request({query:`select=*,github_issues(*)&profile_id=eq.${session.user.id}`,accessToken:session.access_token})).then(setClaims);},[]); if(!session) return <main className="section"><h1>Contributor dashboard</h1><a className="button" href="/profile?returnTo=/profile/issues">Sign in</a></main>; return <main className="section"><h1>Contributor dashboard.</h1><p>Public profile status, GitHub profile and contribution history are shown from Supabase.</p><div className="issue-grid">{claims.map((c)=><article className="issue-card" key={c.id}><h2>{titleCase(c.contribution_status)}</h2><p>Claimed {fmt(c.claimed_at)} as @{c.github_login}.</p></article>)}</div></main> }
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

function formatImpactDate(value?: string) {
  if (!value) return 'Unknown';

  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
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
  return (
    <article className="contributor-card">
      <div className="contributor-card__identity">
        {contributor.avatarUrl ? (
          <img src={contributor.avatarUrl} alt={`${contributor.login} GitHub avatar`} loading="lazy" />
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
        <div><dt>Issues</dt><dd>{contributor.implementedIssues.length}</dd></div>
        <div><dt>PRs</dt><dd>{contributor.mergedPullRequests.length}</dd></div>
        <div><dt>Features</dt><dd>{contributor.featuresCompleted}</dd></div>
        <div><dt>Fixes</dt><dd>{contributor.bugFixesCompleted}</dd></div>
        <div><dt>Reviews</dt><dd>{contributor.reviewsPerformed}</dd></div>
      </dl>
      <p className="contributor-card__dates">First: {formatImpactDate(contributor.firstContributionDate)} · Latest: {formatImpactDate(contributor.mostRecentContributionDate)}</p>
      <div className="badge-list" aria-label={`Badges for ${contributor.login}`}>
        {contributor.badges.map((badge) => <ContributionBadge badge={badge} key={badge.label} />)}
      </div>
      <button className="button button--ghost button--small" type="button" onClick={() => onSelect(contributor.login)}>
        View verified history
      </button>
    </article>
  );
}

function ContributorProfile({ contributor }: { contributor: Contributor }) {
  const timeline = [...contributor.mergedPullRequests, ...contributor.implementedIssues]
    .sort((a, b) => new Date(b.mergedAt || b.closedAt || 0).getTime() - new Date(a.mergedAt || a.closedAt || 0).getTime())
    .slice(0, 10);

  return (
    <article className="contributor-profile" aria-labelledby="contributor-profile-title">
      <div className="contributor-profile__header">
        <Award aria-hidden="true" />
        <div>
          <p className="eyebrow">Contributor detail</p>
          <h2 id="contributor-profile-title">{contributor.displayName || contributor.login}</h2>
          <p>
            First contribution: {formatImpactDate(contributor.firstContributionDate)} · Latest: {formatImpactDate(contributor.mostRecentContributionDate)}
          </p>
        </div>
      </div>
      <dl className="contributor-profile__totals">
        <div><dt>Implemented issues</dt><dd>{contributor.implementedIssues.length}</dd></div>
        <div><dt>Merged pull requests</dt><dd>{contributor.mergedPullRequests.length}</dd></div>
        <div><dt>Reviews performed</dt><dd>{contributor.reviewsPerformed}</dd></div>
      </dl>
      <div className="badge-list">
        {contributor.badges.map((badge) => <ContributionBadge badge={badge} key={badge.label} />)}
      </div>
      <ol className="contribution-timeline" aria-label={`Verified contribution timeline for ${contributor.login}`}>
        {timeline.map((item) => (
          <li key={`${item.url}-${item.number}`}>
            <span>{item.category || 'Contribution'} #{item.number}</span>
            <a href={item.url} target="_blank" rel="noreferrer">{item.title}</a>
            <time dateTime={item.mergedAt || item.closedAt}>{formatImpactDate(item.mergedAt || item.closedAt)}</time>
          </li>
        ))}
      </ol>
    </article>
  );
}

function ImpactLoadingState() {
  return <div className="impact-state" role="status"><RefreshCw aria-hidden="true" /> Loading verified GitHub impact data…</div>;
}

function ImpactErrorState({ message }: { message: string }) {
  return <div className="impact-state impact-state--error" role="alert">GitHub impact data could not be loaded. {message}</div>;
}

function ImpactEmptyState() {
  return <div className="impact-state">No verified contributor activity is available yet. The dashboard will populate when merged pull requests and linked issues are found.</div>;
}

function ImpactDashboardPage() {
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
    { label: 'Total issues created', value: impactData.stats.totalIssues, description: 'Issues tracked in the public repository.' },
    { label: 'Open issues', value: impactData.stats.openIssues, description: 'Visible opportunities still waiting for builders.' },
    { label: 'Closed issues', value: impactData.stats.closedIssues, description: 'Issues closed or implemented in GitHub.' },
    { label: 'Features completed', value: impactData.stats.featuresCompleted, description: 'Closed issues and merged PRs marked as feature, UI or backend work.' },
    { label: 'Bug fixes completed', value: impactData.stats.bugFixesCompleted, description: 'Closed issues and merged PRs marked as fixes.' },
    { label: 'Pull requests merged', value: impactData.stats.mergedPullRequests, description: 'Merged PRs counted once by PR number.' },
    { label: 'Workflow checks passed', value: impactData.stats.testsPassed ?? 'Not reported', description: 'Successful completed GitHub Actions runs when workflow data is available.' },
  ] : [];

  return (
    <main id="top" className="impact-page">
      <section className="hero impact-hero section-grid" aria-labelledby="impact-hero-title">
        <div className="hero__content">
          <p className="eyebrow">Public impact dashboard</p>
          <h1 id="impact-hero-title">Proof that work is moving.</h1>
          <p className="hero__lede">
            Verified GitHub issues, pull requests and contributor history are translated into a transparent progress view for visitors, partners and founding builders.
          </p>
        </div>
        <aside className="hero-card impact-hero__note" aria-label="Data source summary">
          <GitPullRequest aria-hidden="true" />
          <blockquote>Real repository data.</blockquote>
          <p>No fake production statistics. Public data is synchronized server-side and cached to reduce GitHub API rate-limit risk.</p>
        </aside>
      </section>

      <section className="section" aria-labelledby="impact-overview-title">
        <SectionHeading eyebrow="Progress" title="Current repository impact" titleId="impact-overview-title">
          Open work, completed work and merged pull requests remain useful aggregate statistics. For contributor action, browse the full Supabase-backed issue browser.
        </SectionHeading>
        <p><a className="button" href="/issues">Browse synchronized issues</a></p>
        {status === 'loading' ? <ImpactLoadingState /> : null}
        {status === 'error' ? <ImpactErrorState message={errorMessage} /> : null}
        {status === 'ready' && impactData ? (
          <>
            <div className="impact-refresh-note" role="status">
              <Clock aria-hidden="true" size={18} /> Latest refresh: {formatImpactDate(impactData.refreshedAt)} · Refresh window: {impactData.cacheTtlMinutes} minutes{impactData.stale ? ' · Data may be stale' : ''}{impactData.warning ? ` · ${impactData.warning}` : ''}
            </div>
            <div className="impact-stat-grid">{stats.map((stat) => <ImpactStatCard stat={stat} key={stat.label} />)}</div>
          </>
        ) : null}
      </section>

      {status === 'ready' && impactData ? (
        <>
          <section className="section" aria-labelledby="builders-wall-title">
            <SectionHeading eyebrow="Wall of Founding Builders" title="Verified early contributors" titleId="builders-wall-title">
              The wall recognizes contributors with merged repository work. Bot activity is excluded from the main wall and tracked separately when present.
            </SectionHeading>
            {impactData.contributors.length ? (
              <div className="contributor-grid">
                {impactData.contributors.map((contributor) => <ContributorCard contributor={contributor} key={contributor.login} onSelect={setSelectedLogin} />)}
              </div>
            ) : <ImpactEmptyState />}
          </section>

          {selectedContributor ? (
            <section className="section" aria-labelledby="contributor-detail-heading">
              <h2 className="visually-hidden" id="contributor-detail-heading">Selected contributor detail</h2>
              <ContributorProfile contributor={selectedContributor} />
            </section>
          ) : null}

          <section className="section section-grid" aria-labelledby="impact-rules-title">
            <SectionHeading eyebrow="Attribution" title="How recognition is calculated" titleId="impact-rules-title">
              Rules are documented here so visitors can understand how completed issues, merged pull requests and badges are assigned.
            </SectionHeading>
            <div className="story-panel">
              <ul className="impact-rule-list">
                {impactData.attributionRules.map((rule) => <li key={rule}>{rule}</li>)}
              </ul>
              {impactData.bots.length ? <p>Separated bot accounts: {impactData.bots.map((bot) => bot.login).join(', ')}.</p> : <p>No automated bot contributors were included in the public wall.</p>}
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

function BecomeFoundingHeroPage() {
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
      nextErrors.motivation = 'Share a short motivation so we understand why this mission fits you.';
    }

    if (!application.consentToContact) {
      nextErrors.consentToContact = 'Confirm that we may contact you about this application.';
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
          <p className="eyebrow">Founding Hero application</p>
          <h1 id="application-hero-title">Start with one honest contribution.</h1>
          <p className="hero__lede">
            This page is the first public shell for people who want to help shape Bankrupt to 1 Million before the outcome is certain.
            The form is not connected yet, so it validates the local application structure without pretending a submission was sent.
          </p>
        </div>
        <aside className="hero-card application-hero__note" aria-label="Application status">
          <CheckCircle2 aria-hidden="true" />
          <blockquote>Frontend preview.</blockquote>
          <p>
            The application flow uses local state only for now. A real submission step will be added only after privacy, storage and backend handling are configured.
          </p>
        </aside>
      </section>

      <section className="section section-grid" aria-labelledby="application-context-title">
        <SectionHeading eyebrow="Before you apply" title="Choose the way you can help" titleId="application-context-title">
          Founding Heroes can support the mission through voluntary contribution, practical resources, sponsorship, investment interest or commercial collaboration depending on the role.
        </SectionHeading>
        <div className="story-panel application-note">
          <h3>Privacy first</h3>
          <p>
            Share only information you are comfortable providing. Public recognition will always require permission, and sensitive contact details should never appear on the Founding Heroes Wall.
          </p>
          <h3>Participation models</h3>
          <p>
            Some roles may be volunteer or in-kind support. Others may become sponsored, invested or commercial only through a separate written agreement.
          </p>
        </div>
      </section>

      <section className="section" aria-labelledby="application-form-title">
        <SectionHeading eyebrow="Form shell" title="Structured application preview" titleId="application-form-title">
          This frontend-only form captures motivation, experience, availability and consent locally so the future Supabase submission can inherit a clear, accessible structure.
        </SectionHeading>

        <form className="application-form" aria-describedby="application-form-status" noValidate onSubmit={handlePreviewSubmit}>
          <fieldset>
            <legend>Your identity</legend>
            <div className="form-grid">
              <div className="form-field">
                <label htmlFor="founding-hero-name">Name</label>
                <input
                  id="founding-hero-name"
                  name="name"
                  type="text"
                  placeholder="Your name or public alias"
                  aria-describedby="founding-hero-name-help"
                  disabled
                />
                <p id="founding-hero-name-help">Identity fields will be finalized in a follow-up issue.</p>
              </div>
              <div className="form-field">
                <label htmlFor="founding-hero-email">Email</label>
                <input
                  id="founding-hero-email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  aria-describedby="founding-hero-email-help"
                  disabled
                />
                <p id="founding-hero-email-help">Used only for application follow-up after backend storage is configured.</p>
              </div>
            </div>
          </fieldset>

          <fieldset>
            <legend>How you want to contribute</legend>
            <div className="form-grid">
              <div className="form-field">
                <label htmlFor="founding-hero-participation">Participation type</label>
                <select
                  id="founding-hero-participation"
                  name="participation"
                  aria-describedby="founding-hero-participation-help"
                  disabled
                  defaultValue=""
                >
                  <option value="">Choose a future option</option>
                  <option>Volunteer contribution</option>
                  <option>In-kind support</option>
                  <option>Sponsored support</option>
                  <option>Investment interest</option>
                  <option>Commercial collaboration</option>
                </select>
                <p id="founding-hero-participation-help">These models explain intent only and do not create an automatic agreement.</p>
              </div>
              <div className="form-field">
                <label htmlFor="founding-hero-role">Contribution focus</label>
                <input
                  id="founding-hero-role"
                  name="role"
                  type="text"
                  placeholder="Frontend, writing, testing, hosting..."
                  aria-describedby="founding-hero-role-help"
                  disabled
                />
                <p id="founding-hero-role-help">Role selection will be implemented in a separate focused issue.</p>
              </div>
            </div>
          </fieldset>

          <fieldset>
            <legend>Motivation and consent</legend>
            <div className="form-grid form-grid--single">
              <div className="form-field">
                <label htmlFor="founding-hero-motivation">Why this mission fits you <span aria-hidden="true">*</span></label>
                <textarea
                  id="founding-hero-motivation"
                  name="motivation"
                  value={application.motivation}
                  placeholder="A short note about why you want to contribute"
                  aria-describedby={`founding-hero-motivation-help${errors.motivation ? ' founding-hero-motivation-error' : ''}`}
                  aria-invalid={errors.motivation ? 'true' : undefined}
                  onChange={updateField}
                  required
                />
                <p id="founding-hero-motivation-help">Required. Share what draws you to the mission and the contribution you hope to make.</p>
                {errors.motivation ? (
                  <p className="form-error" id="founding-hero-motivation-error">
                    {errors.motivation}
                  </p>
                ) : null}
              </div>
              <div className="form-field">
                <label htmlFor="founding-hero-experience">Relevant experience <span className="optional-label">Optional</span></label>
                <textarea
                  id="founding-hero-experience"
                  name="experienceSummary"
                  value={application.experienceSummary}
                  placeholder="Skills, lived experience, projects or practical support you can offer"
                  aria-describedby="founding-hero-experience-help"
                  onChange={updateField}
                />
                <p id="founding-hero-experience-help">Optional. Include only the background you are comfortable sharing.</p>
              </div>
              <div className="form-field">
                <label htmlFor="founding-hero-availability">Availability <span className="optional-label">Optional</span></label>
                <select
                  id="founding-hero-availability"
                  name="availability"
                  value={application.availability}
                  aria-describedby="founding-hero-availability-help"
                  onChange={updateField}
                >
                  <option value="">Choose if you want to share availability</option>
                  <option value="one-off">One focused contribution</option>
                  <option value="few-hours-month">A few hours per month</option>
                  <option value="few-hours-week">A few hours per week</option>
                  <option value="discuss-first">I would rather discuss what is realistic</option>
                </select>
                <p id="founding-hero-availability-help">Optional. This helps plan respectfully and does not imply a long-term commitment.</p>
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
                  <label htmlFor="founding-hero-contact-consent">You may contact me about this application <span aria-hidden="true">*</span></label>
                </div>
                <p id="founding-hero-contact-consent-help">Required. Contact permission is only for application follow-up and future consent confirmation.</p>
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
                  <label htmlFor="founding-hero-public-recognition-consent">I may want public recognition later <span className="optional-label">Optional</span></label>
                </div>
                <p id="founding-hero-public-recognition-consent-help">
                  Optional and off by default. Public recognition will still require separate confirmation before anything is published on the Founding Heroes Wall.
                </p>
              </div>
            </div>
          </fieldset>

          <div className="form-status" id="application-form-status" role="status">
            <strong>{submissionState === 'submitted' ? 'Local validation complete.' : 'Submissions are not open yet.'}</strong>
            <span>
              {submissionState === 'submitted'
                ? 'This frontend preview has not sent data anywhere. Supabase submission will be added in a separate backend issue.'
                : 'Complete the required local fields to preview validation. Secure storage, privacy handling and real submission logic are still pending.'}
            </span>
          </div>
          <button className="button" type="submit">
            Preview application validation
          </button>
        </form>
      </section>
    </main>
  );
}


function SupportMissionPage({ categoryId }: { categoryId?: string }) {
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
      setFormError('Please complete your name, email, support note and contact consent.');
      setFormState('error');
      return;
    }
    try {
      await submitSupportOffer(offer);
      setFormState('success');
      setOffer({ name: '', email: '', categoryId: selectedCategory.id, message: '', consentToContact: false, consentToPublicRecognition: false });
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Your support offer could not be submitted.');
      setFormState('error');
    }
  }

  return <main id="top" className="support-page"><section className="hero support-hero section-grid" aria-labelledby="support-title"><div className="hero__content"><p className="eyebrow">Mission ecosystem</p><h1 id="support-title">Support Our Mission</h1><p className="hero__lede">Every great mission is built by people who choose to contribute in their own unique way.</p><p>Bankrupt to 1 Million needs support across technology, wellbeing, business, storytelling, practical help and funding — without turning the mission into a generic donation page.</p><div className="hero__actions"><a className="button" href="#support-categories">Choose How You Can Help <ArrowRight aria-hidden="true" size={18} /></a><a className="button button--ghost" href="#support-offer">Offer Another Kind of Support</a></div></div><aside className="hero-card"><Gift aria-hidden="true"/><blockquote>Many ways to help.</blockquote><p>Choose a pathway, inspect current needs, or send a private offer when your skill, connection or resource does not fit a listed role.</p></aside></section><section className="section" id="support-categories" aria-labelledby="support-grid-title"><SectionHeading eyebrow="Pathways" title="Choose your contribution lane" titleId="support-grid-title">Each category is data-driven and connects to a stable detail view with current needs, open opportunities and privacy-first next steps.</SectionHeading>{status === 'loading' ? <div className="impact-state" role="status">Loading active support opportunities…</div> : null}{status === 'error' ? <div className="impact-state impact-state--error" role="alert">{error} Showing evergreen support pathways.</div> : null}<div className="support-grid">{supportCategories.map((category) => <article className="support-card" key={category.id}><span className="support-card__marker">{category.marker}</span><h3>{category.title}</h3><p>{category.summary}</p><p className="support-card__count">{counts[category.id] || 0} active opportunities</p><a className="button button--ghost button--small" href={`/support/${category.id}`}>{category.cta}</a></article>)}</div></section><section className="section section-grid support-detail" id="support-detail" aria-labelledby="support-detail-title"><div><p className="eyebrow">Category detail</p><h2 id="support-detail-title">{selectedCategory.title}</h2><p>{selectedCategory.whyItMatters}</p>{selectedCategory.privacyNote ? <p className="support-privacy-note">{selectedCategory.privacyNote} Coaches, therapists and wellbeing supporters do not replace licensed medical care.</p> : null}<h3>Current concrete needs</h3><ul className="support-need-list">{selectedCategory.needs.map((need) => <li key={need}>{need}</li>)}</ul></div><div className="story-panel"><h3>Open opportunities</h3>{status === 'loading' ? <p>Checking for current open roles…</p> : null}{status !== 'loading' && !selectedOpportunities.length ? <p>No specific open opportunity is published for this category yet. You can still send a private offer below.</p> : null}{selectedOpportunities.map((opportunity) => <article className="support-opportunity" key={opportunity.id}><h4>{opportunity.title}</h4><p>{opportunity.summary}</p><a className="button button--small" href={opportunity.applicationUrl || '#support-offer'}>{opportunity.applicationUrl ? 'Apply to opportunity' : 'Apply'}</a></article>)}</div></section><section className="section" id="support-offer" aria-labelledby="support-offer-title"><SectionHeading eyebrow="Private offer" title="Offer another kind of support" titleId="support-offer-title">You may have a skill, connection or resource we have not thought of yet. Tell us how you believe you can help.</SectionHeading><form className="application-form" onSubmit={handleOfferSubmit}><div className="form-grid"><div className="form-field"><label htmlFor="support-name">Name</label><input id="support-name" value={offer.name} onChange={(e)=>setOffer({...offer,name:e.target.value})} required /></div><div className="form-field"><label htmlFor="support-email">Email</label><input id="support-email" type="email" value={offer.email} onChange={(e)=>setOffer({...offer,email:e.target.value})} required /></div></div><div className="form-field"><label htmlFor="support-category">Support category</label><select id="support-category" value={offer.categoryId} onChange={(e)=>setOffer({...offer,categoryId:e.target.value})}>{supportCategories.map((category)=><option value={category.id} key={category.id}>{category.title}</option>)}<option value="another-kind">Another kind of support</option></select></div><div className="form-field"><label htmlFor="support-message">How can you help?</label><textarea id="support-message" value={offer.message} onChange={(e)=>setOffer({...offer,message:e.target.value})} required /></div><label><input type="checkbox" checked={offer.consentToContact} onChange={(e)=>setOffer({...offer,consentToContact:e.target.checked})} required /> You may contact me privately about this offer.</label><label><input type="checkbox" checked={offer.consentToPublicRecognition} onChange={(e)=>setOffer({...offer,consentToPublicRecognition:e.target.checked})} /> I may be open to public recognition later, after explicit separate consent.</label><div className={`form-status${formState === 'error' ? ' impact-state--error' : ''}`} role={formState === 'error' ? 'alert' : 'status'}><strong>{formState === 'success' ? 'Support offer received.' : formState === 'submitting' ? 'Submitting…' : 'Private by default.'}</strong><span>{formState === 'success' ? 'Thank you. Public recognition still requires separate explicit consent.' : formError || 'Email, health details and internal notes are never displayed publicly from this page.'}</span></div><button className="button" type="submit" disabled={formState === 'submitting'}>Offer Another Kind of Support</button></form></section></main>;
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
