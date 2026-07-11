import { ArrowRight, Award, CheckCircle2, Clock, ExternalLink, GitPullRequest, HeartHandshake, RefreshCw, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { Header } from './components/Header';
import { SectionHeading } from './components/SectionHeading';
import { foundingHeroPlaceholders, foundingHeroRoles, platformFeatures, roadmap } from './data/siteContent';

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
            <a className="button" href="#contribute">
              Become a founding builder <ArrowRight aria-hidden="true" size={18} />
            </a>
            <a className="button button--ghost" href="#story">
              Read the mission
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
          <a className="button" href="https://github.com/MyMindVentures/BankruptTo1Million/issues">
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

function FoundingHeroesPage() {
  return (
    <main id="top" className="founding-page">
      <section className="hero founding-hero section-grid" aria-labelledby="founding-hero-title">
        <div className="hero__content">
          <p className="eyebrow">Founding Heroes</p>
          <h1 id="founding-hero-title">Belief before proof.</h1>
          <p className="hero__lede">
            This future wall will recognize the early builders who chose to contribute before the outcome was certain.
            It is a quiet public thank you for useful work, courage and trust.
          </p>
          <div className="hero__actions" aria-label="Founding Heroes calls to action">
            <a className="button" href="/become-a-founding-hero">
              Become a Founding Hero <ArrowRight aria-hidden="true" size={18} />
            </a>
            <a className="button button--ghost" href="#founding-hero-profiles">
              View future profiles
            </a>
          </div>
        </div>
        <aside className="hero-card founding-hero__note" aria-label="Recognition principle">
          <HeartHandshake aria-hidden="true" />
          <blockquote>Recognition without performance.</blockquote>
          <p>
            Profiles will only appear with permission and will focus on meaningful contributions, not rankings, points or invented social proof.
          </p>
        </aside>
      </section>

      <section className="section section-grid" aria-labelledby="recognition-title">
        <SectionHeading eyebrow="Recognition" title="A permanent place for early trust" titleId="recognition-title">
          Founding Heroes are people who help shape the foundation: code, design, writing, testing, accessibility, introductions and practical support.
        </SectionHeading>
        <div className="story-panel">
          <p>
            The page shell is intentionally honest today. It creates the structure for recognition without pretending that profiles,
            numbers or testimonials already exist.
          </p>
          <p>
            As the project grows, this chapter can hold approved contributor stories, public or anonymous recognition and the context behind each contribution.
          </p>
        </div>
      </section>

      <section className="section" id="founding-hero-profiles" aria-labelledby="profile-slots-title">
        <SectionHeading eyebrow="Future profiles" title="Profile slots for later contributors" titleId="profile-slots-title">
          These placeholders reserve space for permission-first editorial profiles once real contributors choose how they want to be recognized.
        </SectionHeading>
        <div className="placeholder-grid">
          {foundingHeroPlaceholders.map((slot) => (
            <article className="placeholder-card" key={slot.title}>
              <span>{slot.label}</span>
              <h3>{slot.title}</h3>
              <p>{slot.description}</p>
            </article>
          ))}
        </div>
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
      </dl>
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
    { label: 'Features completed', value: impactData.stats.featuresCompleted, description: 'Closed issues and merged PRs marked as features.' },
    { label: 'Bug fixes completed', value: impactData.stats.bugFixesCompleted, description: 'Closed issues and merged PRs marked as fixes.' },
    { label: 'Pull requests merged', value: impactData.stats.mergedPullRequests, description: 'Merged PRs counted once by PR number.' },
    { label: 'Tests passed', value: impactData.stats.testsPassed ?? 'Not reported', description: 'Shown only when reliable workflow data is available.' },
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
          Open work, completed work and merged pull requests are loaded from GitHub and refreshed through the site server instead of exposing privileged tokens in the browser.
        </SectionHeading>
        {status === 'loading' ? <ImpactLoadingState /> : null}
        {status === 'error' ? <ImpactErrorState message={errorMessage} /> : null}
        {status === 'ready' && impactData ? (
          <>
            <div className="impact-refresh-note" role="status">
              <Clock aria-hidden="true" size={18} /> Latest refresh: {formatImpactDate(impactData.refreshedAt)} · Refresh window: {impactData.cacheTtlMinutes} minutes{impactData.stale ? ' · Data may be stale' : ''}
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

function App() {
  const path = window.location.pathname;

  return (
    <>
      <Header />
      {path === '/founding-heroes' ? (
        <FoundingHeroesPage />
      ) : path === '/impact' ? (
        <ImpactDashboardPage />
      ) : path === '/become-a-founding-hero' ? (
        <BecomeFoundingHeroPage />
      ) : (
        <HomePage />
      )}
    </>
  );
}

export default App;
