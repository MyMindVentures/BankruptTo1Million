import { createRoot, type Root } from 'react-dom/client';
import { PostQrCodeButton } from '../components/PostQrCodeButton';
import { supabase } from './supabase';

type JournalQrContext = {
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

async function readContext(slug: string): Promise<JournalQrContext | null> {
  const response = await supabase.from('journal_timeline_cards').request({
    query: `select=journal_post_id,title&slug=eq.${encodeURIComponent(slug)}&limit=1`,
  });
  if (!response.ok) throw new Error(await response.text());
  const rows = await response.json() as JournalQrContext[];
  return rows[0] || null;
}

async function mountJournalPostQrButton() {
  if (!isJournalPostPath() || loading) return;

  const shareActions = document.querySelector<HTMLElement>('.journal-share .share-actions');
  if (!shareActions) return;
  if (shareActions.querySelector('[data-post-qr-host="journal"]')) return;

  loading = true;
  try {
    const slug = decodeURIComponent(window.location.pathname.replace(/\/$/, '').split('/')[2] || '');
    if (!slug) return;

    const context = await readContext(slug);
    if (!context?.journal_post_id) return;

    const host = document.createElement('span');
    host.dataset.postQrHost = 'journal';
    host.className = 'post-qr-host';

    const copyButton = Array.from(shareActions.querySelectorAll('button')).find((button) =>
      button.textContent?.toLowerCase().includes('copy'),
    );

    if (copyButton?.nextSibling) shareActions.insertBefore(host, copyButton.nextSibling);
    else shareActions.appendChild(host);

    mountedRoot?.unmount();
    mountedRoot = createRoot(host);
    mountedHost = host;
    mountedRoot.render(
      <PostQrCodeButton
        entityType="journal_post"
        entityId={context.journal_post_id}
        canonicalUrl={exactPublicUrl()}
        title={context.title || document.title}
      />,
    );
  } catch (error) {
    if (import.meta.env.DEV) console.error('[Journal QR] mount failed', error);
    mountedHost?.remove();
    mountedHost = null;
    mountedRoot = null;
  } finally {
    loading = false;
  }
}

export function initializeJournalPostQrMount() {
  const observer = new MutationObserver(() => void mountJournalPostQrButton());
  observer.observe(document.documentElement, { childList: true, subtree: true });
  void mountJournalPostQrButton();
}
