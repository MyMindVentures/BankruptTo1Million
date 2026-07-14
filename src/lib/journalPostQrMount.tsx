import { createRoot, type Root } from 'react-dom/client';
import { ShareActions } from '../components/ShareActions';
import { recordJournalShare } from './journal';
import { supabase } from './supabase';

type JournalShareContext = {
  journal_post_id: string;
  title: string | null;
};

let mountedRoot: Root | null = null;
let mountedHost: HTMLElement | null = null;
let loading = false;

function isJournalPostPath() {
  const path = window.location.pathname.replace(/\/$/, '');
  return path.startsWith('/journal/') && path.split('/').length >= 3;
}

function exactPublicUrl() {
  const url = new URL(window.location.href);
  url.hash = '';
  return url.toString();
}

async function readContext(slug: string): Promise<JournalShareContext | null> {
  const response = await supabase.from('journal_timeline_cards').request({
    query: `select=journal_post_id,title&slug=eq.${encodeURIComponent(slug)}&limit=1`,
  });
  if (!response.ok) throw new Error(await response.text());
  const rows = await response.json() as JournalShareContext[];
  return rows[0] || null;
}

async function mountJournalShareActions() {
  if (!isJournalPostPath() || loading) return;

  const currentActions = document.querySelector<HTMLElement>('.journal-share .share-actions');
  if (!currentActions) return;
  if (currentActions.dataset.reusableShareActions === 'true') return;

  loading = true;
  try {
    const slug = decodeURIComponent(window.location.pathname.replace(/\/$/, '').split('/')[2] || '');
    if (!slug) return;

    const context = await readContext(slug);
    if (!context?.journal_post_id) return;

    const host = document.createElement('div');
    host.className = 'share-actions';
    host.dataset.reusableShareActions = 'true';

    mountedRoot?.unmount();
    currentActions.replaceWith(host);

    mountedRoot = createRoot(host);
    mountedHost = host;
    mountedRoot.render(
      <ShareActions
        entityType="journal_post"
        entityId={context.journal_post_id}
        url={exactPublicUrl()}
        title={context.title || document.title}
        onShare={(platform) => recordJournalShare(context.journal_post_id, platform)}
      />,
    );
  } catch (error) {
    if (import.meta.env.DEV) console.error('[Journal share] mount failed', error);
    mountedHost?.remove();
    mountedHost = null;
    mountedRoot = null;
  } finally {
    loading = false;
  }
}

export function initializeJournalPostQrMount() {
  const observer = new MutationObserver(() => void mountJournalShareActions());
  observer.observe(document.documentElement, { childList: true, subtree: true });
  void mountJournalShareActions();
}
