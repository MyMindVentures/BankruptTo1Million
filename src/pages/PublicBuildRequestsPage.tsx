import { ChevronDown, ExternalLink, GitPullRequest } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useWebsiteI18n } from '../lib/websiteI18n';

export type BuildRequest = {
  id: string;
  title: string;
  raw_request?: string | null;
  desired_outcome?: string | null;
  technical_summary?: string | null;
  technical_title?: string | null;
  technical_affected_routes?: string[] | null;
  technical_affected_components?: string[] | null;
  processing_status?: string | null;
  status?: string | null;
  priority?: string | null;
  area?: string | null;
  created_at: string;
  updated_at?: string | null;
  github_issue_number?: number | null;
  github_issue_url?: string | null;
  github_pr_number?: number | null;
  github_pr_url?: string | null;
  deployment_status?: string | null;
  deployment_url?: string | null;
};

const terminalStatuses = new Set(['completed', 'done', 'cancelled', 'wont_do']);

async function readJson<T>(response: Response | Promise<Response>): Promise<T> {
  const resolved = await response;
  if (!resolved.ok) throw new Error(await resolved.text());
  return resolved.json() as Promise<T>;
}

function humanize(value?: string | null) {
  return String(value || 'open').replace(/[_-]+/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}

function isOpen(request: BuildRequest) {
  return !terminalStatuses.has(String(request.processing_status || request.status || '').toLowerCase());
}

function BuildRequestCard({ request }: { request: BuildRequest }) {
  const { formatDate, t } = useWebsiteI18n();
  const [expanded, setExpanded] = useState(false);
  const panelId = `build-request-${request.id}`;
  const affected = [...(request.technical_affected_routes || []), ...(request.technical_affected_components || [])];

  return (
    <article className={`build-request-card${expanded ? ' build-request-card--expanded' : ''}`}>
      <button
        type="button"
        className="build-request-card__toggle"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={() => setExpanded((current) => !current)}
      >
        <span className="build-request-card__main">
          <span className="build-request-card__title">{request.title}</span>
          <span className="build-request-card__meta">
            <span>{humanize(request.processing_status || request.status)}</span>
            <span>{humanize(request.priority || 'normal')}</span>
            <time dateTime={request.created_at}>{formatDate(request.created_at)}</time>
          </span>
        </span>
        <ChevronDown className="build-request-card__chevron" aria-hidden="true" size={20} />
      </button>

      {expanded ? (
        <div className="build-request-card__body" id={panelId}>
          {request.raw_request ? <section><h3>{t('issues.buildRequest.founderRequest', 'Founder request')}</h3><p>{request.raw_request}</p></section> : null}
          {request.desired_outcome ? <section><h3>{t('issues.buildRequest.desiredOutcome', 'Desired outcome')}</h3><p>{request.desired_outcome}</p></section> : null}
          {request.technical_summary ? <section><h3>{t('issues.buildRequest.technicalSummary', 'Technical summary')}</h3><p>{request.technical_summary}</p></section> : null}
          {affected.length ? (
            <section>
              <h3>{t('issues.buildRequest.affectedAreas', 'Affected areas')}</h3>
              <div className="build-request-card__tags">{affected.map((item) => <span key={item}>{item}</span>)}</div>
            </section>
          ) : null}
          <div className="build-request-card__links">
            {request.github_issue_url ? <a href={request.github_issue_url} target="_blank" rel="noreferrer">GitHub issue #{request.github_issue_number}<ExternalLink size={14} aria-hidden="true" /></a> : null}
            {request.github_pr_url ? <a href={request.github_pr_url} target="_blank" rel="noreferrer">Pull request #{request.github_pr_number}<ExternalLink size={14} aria-hidden="true" /></a> : null}
            {request.deployment_url ? <a href={request.deployment_url} target="_blank" rel="noreferrer">{t('issues.buildRequest.deployment', 'Deployment')}: {humanize(request.deployment_status)}<ExternalLink size={14} aria-hidden="true" /></a> : null}
          </div>
        </div>
      ) : null}
    </article>
  );
}

export function PublicBuildRequestsPage() {
  const { t } = useWebsiteI18n();
  const [requests, setRequests] = useState<BuildRequest[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    const query = 'select=id,title,raw_request,desired_outcome,technical_summary,technical_title,technical_affected_routes,technical_affected_components,processing_status,status,priority,area,created_at,updated_at,github_issue_number,github_issue_url,github_pr_number,github_pr_url,deployment_status,deployment_url&order=created_at.desc';
    readJson<BuildRequest[]>(supabase.from('build_requests').request({ query }))
      .then((rows) => { setRequests(rows); setStatus('ready'); })
      .catch((reason: Error) => { setError(reason.message); setStatus('error'); });
  }, []);

  const latest = useMemo(() => requests.slice(0, 5), [requests]);
  const remainingOpen = useMemo(() => requests.slice(5).filter(isOpen), [requests]);

  return (
    <main className="issues-page build-requests-page">
      <section className="hero issue-hero section-grid" aria-labelledby="build-requests-title">
        <div>
          <p className="eyebrow">{t('issues.buildRequests.eyebrow', 'Live build requests')}</p>
          <h1 id="build-requests-title">{t('issues.buildRequests.title', 'See what we are building next.')}</h1>
          <p className="hero__lede">{t('issues.buildRequests.intro', 'Follow the newest founder requests, open each card for the full context, and discover where focused help can move the mission forward.')}</p>
          <a className="button" href="/impact">{t('issues.buildRequests.backToImpact', 'Back to impact')}</a>
        </div>
        <aside className="hero-card">
          <GitPullRequest aria-hidden="true" />
          <blockquote>{requests.filter(isOpen).length}</blockquote>
          <p>{t('issues.buildRequests.openCount', 'open build requests loaded dynamically from Supabase.')}</p>
        </aside>
      </section>

      <section className="section build-request-section" aria-labelledby="latest-build-requests">
        <div className="build-request-section__heading">
          <div>
            <p className="eyebrow">{t('issues.buildRequests.latestEyebrow', 'Latest activity')}</p>
            <h2 id="latest-build-requests">{t('issues.buildRequests.latestTitle', 'Latest five build requests')}</h2>
          </div>
          <p>{t('issues.buildRequests.latestDescription', 'Newest first. Expand a request to see the founder context and technical direction.')}</p>
        </div>

        {status === 'loading' ? <div className="impact-state" role="status">{t('issues.buildRequests.loading', 'Loading build requests…')}</div> : null}
        {status === 'error' ? <div className="impact-state impact-state--error" role="alert">{t('issues.buildRequests.error', 'Could not load build requests.')} {error}</div> : null}
        {status === 'ready' && !latest.length ? <div className="impact-state">{t('issues.buildRequests.empty', 'No build requests are available yet.')}</div> : null}
        <div className="build-request-list">{latest.map((request) => <BuildRequestCard request={request} key={request.id} />)}</div>
      </section>

      <section className="section build-request-section build-request-section--remaining" aria-labelledby="remaining-build-requests">
        <div className="build-request-section__heading">
          <div>
            <p className="eyebrow">{t('issues.buildRequests.remainingEyebrow', 'Still open')}</p>
            <h2 id="remaining-build-requests">{t('issues.buildRequests.remainingTitle', 'Remaining open build requests')}</h2>
          </div>
          <p>{t('issues.buildRequests.remainingDescription', 'All other requests that have not reached a terminal status.')}</p>
        </div>
        {status === 'ready' && !remainingOpen.length ? <div className="impact-state">{t('issues.buildRequests.noRemaining', 'No additional open build requests remain.')}</div> : null}
        <div className="build-request-list">{remainingOpen.map((request) => <BuildRequestCard request={request} key={request.id} />)}</div>
      </section>
    </main>
  );
}
