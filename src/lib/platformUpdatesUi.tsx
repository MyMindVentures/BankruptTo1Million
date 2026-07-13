import { ArrowRight, CalendarDays, CheckCircle2, Lightbulb, Sparkles, TrendingUp, UserRound, Wrench } from 'lucide-react';
import { createRoot, type Root } from 'react-dom/client';
import { supabase } from './supabase';

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
  icon_key: string | null;
  deployed_at: string | null;
  published_at: string | null;
  effective_at: string;
  founder_slug: string | null;
  founder_name: string | null;
  founder_role: string | null;
  founder_profile_url: string | null;
  journal_post_slug: string | null;
  concept_slug: string | null;
};

let mountedRoot: Root | null = null;
let loading = false;
let mountedPath = '';

function humanize(value: string) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Madrid',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function UpdateIcon({ iconKey }: { iconKey: string | null }) {
  if (iconKey === 'user-round') return <UserRound size={20} aria-hidden="true" />;
  if (iconKey === 'shield-check') return <CheckCircle2 size={20} aria-hidden="true" />;
  if (iconKey === 'sparkles') return <Sparkles size={20} aria-hidden="true" />;
  if (iconKey === 'send') return <ArrowRight size={20} aria-hidden="true" />;
  return <Wrench size={20} aria-hidden="true" />;
}

function PlatformUpdatesSection({ updates }: { updates: PlatformUpdate[] }) {
  const latest = updates[0];
  return <section className="platform-updates section" aria-labelledby="platform-updates-title" data-platform-updates>
    <div className="platform-updates__intro">
      <div>
        <p className="eyebrow">BUILDING IN PUBLIC</p>
        <h2 id="platform-updates-title">Latest platform upgrades</h2>
        <p>Every meaningful improvement starts as an idea. We show the reasoning behind the work, not only the finished result.</p>
      </div>
      <div className="platform-updates__signal">
        <Sparkles size={22} aria-hidden="true" />
        <div><strong>{updates.length} latest upgrades</strong><span>{latest ? `Last shipped ${formatDate(latest.effective_at)}` : 'Continuously evolving'}</span></div>
      </div>
    </div>

    <div className="platform-updates__grid">
      {updates.map((update, index) => <article className={`platform-update-card${index === 0 ? ' platform-update-card--latest' : ''}`} key={update.id}>
        <header className="platform-update-card__header">
          <span className="platform-update-card__icon"><UpdateIcon iconKey={update.icon_key} /></span>
          <div className="platform-update-card__badges">
            {update.version ? <span>{update.version}</span> : null}
            <span>{humanize(update.status)}</span>
          </div>
        </header>

        <div className="platform-update-card__title">
          <span>{String(index + 1).padStart(2, '0')}</span>
          <div><small>{update.feature_area || humanize(update.category)}</small><h3>{update.title}</h3></div>
        </div>
        <p className="platform-update-card__summary">{update.short_description}</p>

        <div className="platform-update-card__reasoning">
          <div><Lightbulb size={17} aria-hidden="true" /><div><strong>Why we built this</strong><p>{update.motivation}</p></div></div>
          <div><TrendingUp size={17} aria-hidden="true" /><div><strong>Positive impact</strong><p>{update.positive_impact}</p></div></div>
        </div>

        <footer className="platform-update-card__footer">
          <div><CalendarDays size={15} aria-hidden="true" /><time dateTime={update.effective_at}>{formatDate(update.effective_at)}</time></div>
          {update.founder_profile_url && update.founder_name ? <a href={update.founder_profile_url}>By {update.founder_name} <ArrowRight size={14} aria-hidden="true" /></a> : <span>Bankrupt to 1 Million</span>}
        </footer>
      </article>)}
    </div>

    <div className="platform-updates__footer">
      <div><CheckCircle2 size={18} aria-hidden="true" /><span>Transparent reasoning. Visible execution. Continuous improvement.</span></div>
      <a href="/founders/kevin-de-vlieger">Meet the founder behind the upgrades <ArrowRight size={16} aria-hidden="true" /></a>
    </div>
  </section>;
}

async function fetchUpdates() {
  const response = await supabase.from('platform_updates_public').request({
    query: 'select=id,slug,version,title,short_description,motivation,positive_impact,category,update_type,status,feature_area,icon_key,deployed_at,published_at,effective_at,founder_slug,founder_name,founder_role,founder_profile_url,journal_post_slug,concept_slug&order=effective_at.desc&limit=5',
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json() as Promise<PlatformUpdate[]>;
}

function unmountPlatformUpdates() {
  mountedRoot?.unmount();
  mountedRoot = null;
  document.querySelector('[data-platform-updates-host]')?.remove();
  mountedPath = '';
}

async function mountPlatformUpdates() {
  if (window.location.pathname !== '/proof-of-mind') {
    loading = false;
    unmountPlatformUpdates();
    return;
  }

  const hero = document.querySelector<HTMLElement>('.proof-page .proof-hero');
  if (!hero || loading || mountedPath === window.location.pathname || document.querySelector('[data-platform-updates-host]')) return;
  loading = true;

  try {
    const updates = await fetchUpdates();
    if (!updates.length || window.location.pathname !== '/proof-of-mind') return;

    const host = document.createElement('div');
    host.dataset.platformUpdatesHost = 'true';
    hero.insertAdjacentElement('afterend', host);

    const nextRoot = createRoot(host);
    mountedRoot = nextRoot;
    nextRoot.render(<PlatformUpdatesSection updates={updates} />);
    mountedPath = window.location.pathname;
  } catch (error) {
    console.error('Could not render platform updates.', error);
    unmountPlatformUpdates();
  } finally {
    loading = false;
  }
}

export function initializePlatformUpdatesUi() {
  const observer = new MutationObserver(() => void mountPlatformUpdates());
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('popstate', () => void mountPlatformUpdates());
  void mountPlatformUpdates();
}
