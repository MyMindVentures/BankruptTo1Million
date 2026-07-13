import { supabase } from './supabase';

type LatestItem = {
  id: string;
  title: string;
  subtitle?: string | null;
  excerpt?: string | null;
  slug: string;
  href: string;
  updated_at?: string | null;
  published_at?: string | null;
  category?: string | null;
  cover_image_url?: string | null;
};

async function readJson<T>(responseOrPromise: Response | Promise<Response>): Promise<T> {
  const response = await responseOrPromise;
  if (!response.ok) throw new Error(await response.text());
  return response.json() as Promise<T>;
}

function formatTimestamp(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Madrid',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZoneName: 'short',
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value || '';
  const zone = get('timeZoneName').replace('GMT+2', 'CEST').replace('GMT+1', 'CET');
  return `${get('day')}/${get('month')}/${get('year')} · ${get('hour')}:${get('minute')} ${zone}`;
}

function escapeHtml(value?: string | null) {
  return (value || '').replace(/[&<>'"]/g, (character) => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' })[character] || character);
}

function renderLatest(items: LatestItem[], label: string, title: string) {
  const section = document.createElement('section');
  section.className = 'section latest-three-section';
  section.dataset.latestThree = 'true';
  section.innerHTML = `<div class="latest-three-heading"><div><p class="eyebrow">${escapeHtml(label)}</p><h2>${escapeHtml(title)}</h2><p>Newest publications and recently updated work appear here first.</p></div></div><div class="latest-three-grid">${items.map((item, index) => `<article class="latest-three-card">
    ${item.cover_image_url ? `<img src="${escapeHtml(item.cover_image_url)}" alt="" loading="lazy" />` : `<div class="latest-three-card__marker">${String(index + 1).padStart(2,'0')}</div>`}
    <div class="latest-three-card__copy">
      <div class="latest-three-card__meta">${item.category ? `<span>${escapeHtml(item.category)}</span>` : ''}<time datetime="${escapeHtml(item.updated_at || item.published_at)}">${escapeHtml(formatTimestamp(item.updated_at || item.published_at))}</time></div>
      <h3>${escapeHtml(item.title)}</h3>
      ${item.subtitle || item.excerpt ? `<p>${escapeHtml(item.subtitle || item.excerpt)}</p>` : ''}
      <a href="${escapeHtml(item.href)}">Open ${escapeHtml(item.category || 'item')} →</a>
    </div>
  </article>`).join('')}</div>`;
  return section;
}

async function journalLatest(): Promise<LatestItem[]> {
  const rows = await readJson<Array<Record<string, unknown>>>(supabase.from('journal_posts').request({ query: 'select=id,slug,title,subtitle,excerpt,updated_at,published_at,cover_image_url,journal_categories(name)&status=eq.published&published_at=not.is.null&order=updated_at.desc,published_at.desc&limit=3' }));
  return rows.map((row) => ({ id:String(row.id), slug:String(row.slug), title:String(row.title), subtitle:row.subtitle as string|null, excerpt:row.excerpt as string|null, href:`/journal/${row.slug}`, updated_at:row.updated_at as string|null, published_at:row.published_at as string|null, cover_image_url:row.cover_image_url as string|null, category:((row.journal_categories as {name?:string}|null)?.name || 'Journal') }));
}

async function proofLatest(): Promise<LatestItem[]> {
  const rows = await readJson<Array<Record<string, unknown>>>(supabase.from('proof_of_mind_public_teasers').request({ query: 'select=id,slug,title,tagline,short_description,updated_at,published_at,cover_image_url,category&order=updated_at.desc,published_at.desc&limit=3' }));
  return rows.map((row) => ({ id:String(row.id), slug:String(row.slug), title:String(row.title), subtitle:row.tagline as string|null, excerpt:row.short_description as string|null, href:`/proof-of-mind/${row.slug}`, updated_at:row.updated_at as string|null, published_at:row.published_at as string|null, cover_image_url:row.cover_image_url as string|null, category:(row.category as string|null) || 'Proof of Mind' }));
}

async function breakLatest(): Promise<LatestItem[]> {
  const rows = await readJson<Array<Record<string, unknown>>>(supabase.from('journal_posts').request({ query: 'select=id,slug,title,subtitle,excerpt,updated_at,published_at,cover_image_url,break_the_circle_posts!inner(id)&status=eq.published&published_at=not.is.null&order=updated_at.desc,published_at.desc&limit=3' }));
  return rows.map((row) => ({ id:String(row.id), slug:String(row.slug), title:String(row.title), subtitle:row.subtitle as string|null, excerpt:row.excerpt as string|null, href:`/break-the-circle/${row.slug}`, updated_at:row.updated_at as string|null, published_at:row.published_at as string|null, cover_image_url:row.cover_image_url as string|null, category:'Break the Circle' }));
}

export function initializeLatestThreeUi() {
  let activePath = '';
  const enhance = async () => {
    const path = window.location.pathname;
    if (path === activePath && document.querySelector('[data-latest-three="true"]')) return;
    if (!['/journal','/proof-of-mind','/break-the-circle','/help-us-break-the-circle'].includes(path)) return;
    activePath = path;
    const hero = document.querySelector('main > .hero, main > section.hero');
    if (!hero || document.querySelector('[data-latest-three="true"]')) return;
    try {
      const config = path === '/journal'
        ? { load: journalLatest, label:'Latest 3', title:'Latest Journal posts' }
        : path === '/proof-of-mind'
          ? { load: proofLatest, label:'Latest 3', title:'Newest and recently updated concepts' }
          : { load: breakLatest, label:'Latest 3', title:'Latest Break the Circle stories' };
      const items = await config.load();
      if (!items.length) return;
      hero.insertAdjacentElement('afterend', renderLatest(items, config.label, config.title));
    } catch {
      // The page remains fully usable when the latest feed is temporarily unavailable.
    }
  };
  const observer = new MutationObserver(() => void enhance());
  observer.observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener('popstate',()=>void enhance());
  window.addEventListener('hashchange',()=>void enhance());
  void enhance();
}
