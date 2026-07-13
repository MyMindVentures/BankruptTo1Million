import { supabase } from './supabase';

type Opportunity = { id:string; name:string|null; organization?:string|null; type?:string|null; status?:string|null; role?:string|null; country?:string|null; priority?:string|null; fit_score?:number|null; summary?:string|null; why_fit?:string|null; value?:string|null; outreach_subject?:string|null; outreach_message?:string|null; outreach_cta_label?:string|null; outreach_cta_url?:string|null; share_token?:string|null; };
type OpportunityPayload = { partnerships: Opportunity[]; launch_partner_leads: Opportunity[] };
type FounderPostLookup = { concept_id: string };

async function readJson<T>(responseOrPromise: Response | Promise<Response>): Promise<T> { const response = await responseOrPromise; if (!response.ok) throw new Error(await response.text()); return response.json() as Promise<T>; }
const entities: Record<string,string> = {'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'};
function esc(value?: string | number | null) { return String(value ?? '').replace(/[&<>'"]/g,(character)=>entities[character] || character); }
function safeHref(value?: string | null) { if (!value) return null; try { const url = new URL(value, window.location.origin); return ['http:','https:'].includes(url.protocol) ? url.toString() : null; } catch { return null; } }
function card(item: Opportunity, kind: 'partnership' | 'lead', index: number) {
  const outreachLink = item.share_token ? `/outreach/${encodeURIComponent(item.share_token)}` : safeHref(item.outreach_cta_url);
  const fit = item.fit_score != null ? `<span>Fit ${esc(item.fit_score)}/100</span>` : '';
  return `<article class="founder-opportunity-card"><div class="founder-opportunity-card__top"><span>${String(index + 1).padStart(2,'0')}</span><div><p class="eyebrow">${kind === 'partnership' ? 'Partnership opportunity' : 'Launch partner lead'}</p><h3>${esc(item.name || item.organization || 'Opportunity')}</h3></div></div><div class="founder-opportunity-card__meta">${item.organization && item.organization !== item.name ? `<span>${esc(item.organization)}</span>` : ''}${item.type ? `<span>${esc(item.type)}</span>` : ''}${item.role ? `<span>${esc(item.role)}</span>` : ''}${item.country ? `<span>${esc(item.country)}</span>` : ''}${item.status ? `<span>${esc(item.status)}</span>` : ''}${item.priority ? `<span>${esc(item.priority)} priority</span>` : ''}${fit}</div>${item.summary || item.why_fit ? `<p>${esc(item.summary || item.why_fit)}</p>` : ''}${item.value ? `<div class="founder-opportunity-card__value"><strong>Why this could work</strong><p>${esc(item.value)}</p></div>` : ''}${item.outreach_message ? `<details class="founder-opportunity-outreach"><summary>View outreach message</summary><div>${item.outreach_subject ? `<strong>${esc(item.outreach_subject)}</strong>` : ''}<p>${esc(item.outreach_message)}</p>${outreachLink ? `<a class="button button--small" href="${esc(outreachLink)}">${esc(item.outreach_cta_label || 'Open outreach')} →</a>` : ''}</div></details>` : ''}</article>`;
}
function render(payload: OpportunityPayload, slug: string) {
  const section = document.createElement('section');
  section.className = 'founder-opportunities';
  section.dataset.founderOpportunities = slug;
  const partnerships = payload.partnerships || [];
  const leads = payload.launch_partner_leads || [];
  section.innerHTML = `<div class="founder-opportunities__heading"><p class="eyebrow">Building the network</p><h2>Best partnership and launch opportunities</h2><p>Only the five strongest public matches are shown. Outreach stays collapsed until a visitor chooses to open it.</p></div><div class="founder-opportunity-groups"><section><div class="founder-opportunity-group-title"><h3>Top partnerships</h3><span>${partnerships.length}/5</span></div>${partnerships.length ? `<div class="founder-opportunity-list">${partnerships.map((item,index)=>card(item,'partnership',index)).join('')}</div>` : '<div class="founder-opportunity-empty">No public partnership opportunities are published yet.</div>'}</section><section><div class="founder-opportunity-group-title"><h3>Top launch partner leads</h3><span>${leads.length}/5</span></div>${leads.length ? `<div class="founder-opportunity-list">${leads.map((item,index)=>card(item,'lead',index)).join('')}</div>` : '<div class="founder-opportunity-empty">No public launch partner leads are published yet.</div>'}</section></div>`;
  return section;
}

export function initializeFounderPostOpportunitiesUi() {
  let renderedSlug = '';
  let loadingSlug = '';
  const enhance = async () => {
    const match = window.location.pathname.match(/^\/journal\/([^/]+)$/);
    if (!match) return;
    const slug = decodeURIComponent(match[1]);
    const founderPost = document.querySelector<HTMLElement>(`[data-founder-post-premium="${CSS.escape(slug)}"]`);
    if (!founderPost) return;
    if (renderedSlug === slug && document.querySelector(`[data-founder-opportunities="${CSS.escape(slug)}"]`)) return;
    if (loadingSlug === slug) return;
    loadingSlug = slug;
    try {
      const rows = await readJson<FounderPostLookup[]>(supabase.from('founder_posts_public').request({ query:`select=concept_id&post_slug=eq.${encodeURIComponent(slug)}&limit=1` }));
      const conceptId = rows[0]?.concept_id;
      if (!conceptId || !document.body.contains(founderPost)) return;
      const payload = await readJson<OpportunityPayload>(supabase.rpc('get_founder_post_opportunities',{p_concept_id:conceptId}));
      document.querySelectorAll('[data-founder-opportunities]').forEach((node)=>node.remove());
      const section = render(payload,slug);
      const footer = founderPost.querySelector('.founder-message-footer');
      if (footer) footer.before(section); else founderPost.appendChild(section);
      renderedSlug = slug;
    } catch {
      // Founder Post remains usable when opportunities are unavailable.
    } finally {
      if (loadingSlug === slug) loadingSlug = '';
    }
  };
  const observer = new MutationObserver(()=>void enhance());
  observer.observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener('popstate',()=>{ renderedSlug=''; loadingSlug=''; void enhance(); });
  window.addEventListener('hashchange',()=>void enhance());
  void enhance();
}
