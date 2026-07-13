import { supabase } from './supabase';

type FounderPostRow = {
  founder_post_id: string;
  concept_slug: string;
  concept_title: string;
  post_slug: string;
  post_title: string;
  subtitle: string | null;
  excerpt: string | null;
  personal_intro: string | null;
  why_i_created_it: string | null;
  lived_experience: string | null;
  vision_for_impact: string | null;
  personal_problem: string | null;
  solution_i_envisioned: string | null;
  who_it_is_for: string | null;
  why_it_matters: string | null;
  concept_thinker_insight: string | null;
  vision_partner_angle: string | null;
  adhd_strength_connection: string | null;
  founder_video_title: string | null;
  founder_video_description: string | null;
  video_status: string | null;
  cta_label: string | null;
  cta_url: string | null;
  founder_message_id: string | null;
  founder_message_eyebrow: string | null;
  founder_message_title: string | null;
  founder_message_body: string | null;
  founder_name: string | null;
  founder_role: string | null;
  founder_statement: string | null;
  founder_message_cta_label: string | null;
  founder_message_cta_url: string | null;
  founder_profile_url: string | null;
};

async function readJson<T>(responseOrPromise: Response | Promise<Response>): Promise<T> {
  const response = await responseOrPromise;
  if (!response.ok) throw new Error(await response.text());
  return response.json() as Promise<T>;
}

const entities: Record<string, string> = { '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' };
function escapeHtml(value?: string | null) {
  return (value || '').replace(/[&<>'"]/g, (character) => entities[character] || character);
}

function safeHref(value?: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value, window.location.origin);
    return ['http:','https:'].includes(url.protocol) ? url.toString() : null;
  } catch { return null; }
}

function emphasize(value?: string | null) {
  if (!value) return '';
  const escaped = escapeHtml(value);
  const phrases = [
    'ADHD','RSD','Concept Thinker','Vision Partner','language barriers','fifteen languages',
    'trusted knowledge','original creators','patients','families','professionals','content creators',
    'personal problem','real problem','win-win','lived experience','pattern recognition'
  ];
  return phrases.reduce((html, phrase) => html.replace(new RegExp(`(${phrase.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')})`,'gi'),'<strong>$1</strong>'), escaped);
}

function section(number: string, eyebrow: string, title: string, body?: string | null) {
  if (!body) return '';
  return `<section class="founder-post-section">
    <div class="founder-post-section__number">${number}</div>
    <div><p class="eyebrow">${escapeHtml(eyebrow)}</p><h2>${escapeHtml(title)}</h2><p>${emphasize(body)}</p></div>
  </section>`;
}

function renderFounderPost(row: FounderPostRow) {
  const conceptUrl = `/proof-of-mind/${encodeURIComponent(row.concept_slug)}`;
  const conceptCta = safeHref(row.cta_url) || conceptUrl;
  const founderProfile = safeHref(row.founder_profile_url);
  const footerCta = safeHref(row.founder_message_cta_url);

  const wrapper = document.createElement('div');
  wrapper.className = 'founder-post-premium';
  wrapper.dataset.founderPostPremium = 'true';
  wrapper.innerHTML = `
    <section class="founder-post-intro">
      <div><p class="eyebrow">Founder Post · ${escapeHtml(row.concept_title)}</p><h2>The story behind the concept</h2><p>${emphasize(row.personal_intro || row.excerpt)}</p></div>
      <a class="founder-post-concept-card" href="${escapeHtml(conceptUrl)}">
        <span>Linked app concept</span><strong>${escapeHtml(row.concept_title)}</strong><small>Open the full Proof of Mind concept →</small>
      </a>
    </section>
    <div class="founder-post-sections">
      ${section('01','The trigger','The problem I experienced',row.personal_problem || row.lived_experience)}
      ${section('02','Why I built it','Why this concept had to exist',row.why_i_created_it)}
      ${section('03','The solution','What I envisioned',row.solution_i_envisioned)}
      ${section('04','The people','Who this is for',row.who_it_is_for)}
      ${section('05','The importance','Why it matters',row.why_it_matters)}
      ${section('06','Concept thinking','The pattern I recognised',row.concept_thinker_insight)}
      ${section('07','Vision partnership','How I see it growing',row.vision_partner_angle)}
      ${section('08','ADHD as strength','How my brain contributed',row.adhd_strength_connection)}
      ${section('09','Impact','What I hope this changes',row.vision_for_impact)}
    </div>
    <section class="founder-post-concept-cta">
      <div><p class="eyebrow">From story to venture</p><h2>Explore ${escapeHtml(row.concept_title)}</h2><p>This Founder Post explains the personal reason behind the concept. The full Proof of Mind page contains the product vision, audience, features, commercial opportunity and partnership pathways.</p></div>
      <a class="button" href="${escapeHtml(conceptCta)}">${escapeHtml(row.cta_label || `View ${row.concept_title}`)} →</a>
    </section>
    ${row.founder_message_id ? `<footer class="founder-message-footer">
      <div class="founder-message-footer__identity">
        <span class="founder-message-footer__mark">KV</span>
        <div><p class="eyebrow">${escapeHtml(row.founder_message_eyebrow || 'Founder Message')}</p><h2>${escapeHtml(row.founder_message_title || 'Every concept starts with a real problem')}</h2></div>
      </div>
      ${row.founder_message_body ? `<p class="founder-message-footer__body">${emphasize(row.founder_message_body)}</p>` : ''}
      ${row.founder_statement ? `<blockquote>${emphasize(row.founder_statement)}</blockquote>` : ''}
      <div class="founder-message-footer__bottom">
        <div><strong>${escapeHtml(row.founder_name || 'Kevin De Vlieger')}</strong><span>${escapeHtml(row.founder_role || 'Concept Thinker & Vision Partner')}</span></div>
        <div class="founder-message-footer__actions">
          ${founderProfile ? `<a class="button button--ghost button--small" href="${escapeHtml(founderProfile)}">View Founder Profile</a>` : ''}
          ${footerCta ? `<a class="button button--small" href="${escapeHtml(footerCta)}">${escapeHtml(row.founder_message_cta_label || 'Explore more concepts')}</a>` : ''}
        </div>
      </div>
    </footer>` : ''}`;
  return wrapper;
}

export function initializeFounderPostUi() {
  let enhancedSlug = '';
  const enhance = async () => {
    const match = window.location.pathname.match(/^\/journal\/([^/]+)$/);
    if (!match) return;
    const slug = decodeURIComponent(match[1]);
    if (slug === enhancedSlug && document.querySelector('[data-founder-post-premium="true"]')) return;
    const body = document.querySelector<HTMLElement>('.journal-article .journal-body');
    if (!body || document.querySelector('[data-founder-post-premium="true"]')) return;
    try {
      const rows = await readJson<FounderPostRow[]>(supabase.from('founder_posts_public').request({ query: `select=*&post_slug=eq.${encodeURIComponent(slug)}&limit=1` }));
      const row = rows[0];
      if (!row) return;
      enhancedSlug = slug;
      const premium = renderFounderPost(row);
      body.classList.add('journal-body--founder-post-source');
      body.before(premium);
    } catch {
      // A normal Journal article remains fully usable if Founder Post enhancement is unavailable.
    }
  };
  const observer = new MutationObserver(() => void enhance());
  observer.observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener('popstate',()=>void enhance());
  window.addEventListener('hashchange',()=>void enhance());
  void enhance();
}
