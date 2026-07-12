import { supabase } from './lib/supabase';
import './styles/partnershipEcosystem.css';

type PartnershipTarget = {
  id: string;
  name: string;
  full_name: string | null;
  organization_name: string | null;
  channel_name: string | null;
  job_title: string | null;
  contact_type: string | null;
  country: string | null;
  website_url: string | null;
  youtube_url: string | null;
  linkedin_url: string | null;
  instagram_url: string | null;
  x_url: string | null;
  relevance_score: number | null;
  priority: string | null;
  relationship_status: string | null;
  why_this_partner: string | null;
  value_proposition: string | null;
  desired_collaboration: string | null;
};

type PartnershipCategory = {
  category_id: string;
  category_key: string;
  category_name: string;
  category_description: string | null;
  strategic_goal: string | null;
  partnership_objective: string | null;
  desired_partner_profile: string | null;
  category_priority: string | null;
  target_count: number | null;
  identified_count: number;
  partners: PartnershipTarget[];
};

type PartnershipEcosystem = {
  concept_id: string;
  concept_slug: string;
  concept_title: string;
  category_count: number;
  identified_partners: number;
  target_partners: number;
  categories: PartnershipCategory[];
};

const WIDGET_ID = 'proof-partnership-ecosystem';
let activeSlug = '';
let requestVersion = 0;

function getConceptSlug() {
  const match = window.location.pathname.match(/^\/proof-of-mind\/([^/?#]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function safeUrl(value: string | null | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

function text(value: string | null | undefined) {
  return value?.trim() || '';
}

function label(value: string | null | undefined) {
  return text(value).replace(/_/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}

function makeElement<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  return element;
}

function appendText(parent: HTMLElement, tag: keyof HTMLElementTagNameMap, value: string | null | undefined, className?: string) {
  if (!text(value)) return null;
  const element = makeElement(tag, className);
  element.textContent = text(value);
  parent.appendChild(element);
  return element;
}

function partnerLink(partner: PartnershipTarget) {
  return safeUrl(partner.website_url)
    || safeUrl(partner.youtube_url)
    || safeUrl(partner.linkedin_url)
    || safeUrl(partner.instagram_url)
    || safeUrl(partner.x_url);
}

function renderPartnerCard(partner: PartnershipTarget, rank: number) {
  const card = makeElement('article', 'partnership-card');

  const header = makeElement('div', 'partnership-card__header');
  const rankBadge = makeElement('span', 'partnership-card__rank');
  rankBadge.textContent = String(rank).padStart(2, '0');
  header.appendChild(rankBadge);

  const identity = makeElement('div', 'partnership-card__identity');
  appendText(identity, 'h4', partner.name);
  const supportingIdentity = [partner.job_title, partner.organization_name && partner.organization_name !== partner.name ? partner.organization_name : null]
    .filter(Boolean)
    .join(' · ');
  appendText(identity, 'p', supportingIdentity, 'partnership-card__subtitle');
  header.appendChild(identity);

  if (partner.relevance_score !== null && partner.relevance_score !== undefined) {
    const score = makeElement('strong', 'partnership-card__score');
    score.textContent = `${Number(partner.relevance_score).toFixed(1)}/10`;
    score.title = 'Strategic relevance score';
    header.appendChild(score);
  }
  card.appendChild(header);

  const meta = makeElement('div', 'partnership-card__meta');
  [label(partner.contact_type), partner.country, label(partner.priority), label(partner.relationship_status)]
    .filter(Boolean)
    .forEach((item) => appendText(meta, 'span', item));
  card.appendChild(meta);

  if (partner.why_this_partner) {
    const block = makeElement('div', 'partnership-card__block');
    appendText(block, 'strong', 'Why this partner');
    appendText(block, 'p', partner.why_this_partner);
    card.appendChild(block);
  }

  if (partner.value_proposition) {
    const block = makeElement('div', 'partnership-card__block partnership-card__block--value');
    appendText(block, 'strong', 'The win-win');
    appendText(block, 'p', partner.value_proposition);
    card.appendChild(block);
  }

  if (partner.desired_collaboration) {
    const block = makeElement('div', 'partnership-card__block');
    appendText(block, 'strong', 'Proposed collaboration');
    appendText(block, 'p', partner.desired_collaboration);
    card.appendChild(block);
  }

  const url = partnerLink(partner);
  if (url) {
    const link = makeElement('a', 'partnership-card__link');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noreferrer';
    link.textContent = 'View partner profile ↗';
    card.appendChild(link);
  }

  return card;
}

function renderCategory(category: PartnershipCategory, isActive: boolean) {
  const panel = makeElement('section', 'partnership-category-panel');
  panel.dataset.category = category.category_key;
  panel.hidden = !isActive;

  const intro = makeElement('div', 'partnership-category-panel__intro');
  const headingRow = makeElement('div', 'partnership-category-panel__heading');
  appendText(headingRow, 'h3', category.category_name);
  const count = makeElement('span');
  count.textContent = `${category.identified_count} identified · target ${category.target_count || 20}`;
  headingRow.appendChild(count);
  intro.appendChild(headingRow);
  appendText(intro, 'p', category.partnership_objective || category.strategic_goal || category.category_description);
  if (category.desired_partner_profile) {
    const profile = makeElement('p', 'partnership-category-panel__profile');
    const strong = makeElement('strong');
    strong.textContent = 'Ideal profile: ';
    profile.appendChild(strong);
    profile.append(category.desired_partner_profile);
    intro.appendChild(profile);
  }
  panel.appendChild(intro);

  const grid = makeElement('div', 'partnership-grid');
  category.partners.slice(0, 20).forEach((partner, index) => grid.appendChild(renderPartnerCard(partner, index + 1)));
  panel.appendChild(grid);
  return panel;
}

function renderEcosystem(data: PartnershipEcosystem) {
  const existing = document.getElementById(WIDGET_ID);
  existing?.remove();
  if (!data.categories?.length) return;

  const section = makeElement('section', 'concept-detail-section partnership-ecosystem');
  section.id = WIDGET_ID;

  appendText(section, 'p', '12 · Strategic ecosystem', 'eyebrow');
  appendText(section, 'h2', 'Partnerships that could make this venture move');
  appendText(section, 'p', `This concept is mapped to ${data.identified_partners} researched partnership targets across ${data.category_count} categories. The public ecosystem shows up to 20 targets per category, including the strategic fit and the win-win proposal.`);

  const stats = makeElement('div', 'partnership-ecosystem__stats');
  [
    [String(data.identified_partners), 'researched targets'],
    [String(data.category_count), 'partner categories'],
    [String(data.target_partners), 'ecosystem target'],
  ].forEach(([value, caption]) => {
    const article = makeElement('article');
    appendText(article, 'strong', value);
    appendText(article, 'span', caption);
    stats.appendChild(article);
  });
  section.appendChild(stats);

  const tabs = makeElement('div', 'partnership-tabs');
  tabs.setAttribute('role', 'tablist');
  tabs.setAttribute('aria-label', 'Partnership categories');

  const panels = makeElement('div', 'partnership-panels');
  data.categories.forEach((category, index) => {
    const button = makeElement('button', index === 0 ? 'is-active' : '');
    button.type = 'button';
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-selected', index === 0 ? 'true' : 'false');
    button.dataset.category = category.category_key;
    button.textContent = `${category.category_name} (${category.identified_count})`;
    tabs.appendChild(button);
    panels.appendChild(renderCategory(category, index === 0));
  });

  tabs.addEventListener('click', (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button[data-category]');
    if (!button) return;
    const selected = button.dataset.category;
    tabs.querySelectorAll('button').forEach((item) => {
      const active = item === button;
      item.classList.toggle('is-active', active);
      item.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    panels.querySelectorAll<HTMLElement>('.partnership-category-panel').forEach((panel) => {
      panel.hidden = panel.dataset.category !== selected;
    });
  });

  section.appendChild(tabs);
  section.appendChild(panels);

  const callout = makeElement('div', 'partnership-ecosystem__callout');
  const calloutCopy = makeElement('div');
  appendText(calloutCopy, 'strong', 'See your name, company or community in this ecosystem?');
  appendText(calloutCopy, 'p', 'Share the concept or start a conversation. The strongest partnerships are designed around measurable value for both sides.');
  callout.appendChild(calloutCopy);
  const action = makeElement('a', 'button button--small');
  action.href = '/support';
  action.textContent = 'Explore a partnership';
  callout.appendChild(action);
  section.appendChild(callout);

  const detailContainer = document.querySelector('.concept-detail--premium');
  if (!detailContainer) return;
  const collaborationSection = Array.from(detailContainer.querySelectorAll<HTMLElement>('.concept-detail-section'))
    .find((candidate) => candidate.querySelector('h2')?.textContent?.trim() === 'Who we want to meet');
  detailContainer.insertBefore(section, collaborationSection || null);
}

async function loadForSlug(slug: string) {
  const version = ++requestVersion;
  try {
    const response = await supabase.rpc('get_public_concept_partnership_ecosystem', {
      requested_slug: slug,
      per_category_limit: 20,
    });
    if (!response.ok) throw new Error(await response.text());
    const data = await response.json() as PartnershipEcosystem;
    if (version !== requestVersion || getConceptSlug() !== slug) return;
    renderEcosystem(data);
  } catch (error) {
    console.warn('Partnership ecosystem could not be loaded.', error);
  }
}

function synchronize() {
  const slug = getConceptSlug();
  if (!slug) {
    activeSlug = '';
    document.getElementById(WIDGET_ID)?.remove();
    return;
  }
  if (!document.querySelector('.concept-detail--premium')) return;
  if (slug === activeSlug && document.getElementById(WIDGET_ID)) return;
  activeSlug = slug;
  void loadForSlug(slug);
}

const observer = new MutationObserver(synchronize);
observer.observe(document.documentElement, { childList: true, subtree: true });
window.addEventListener('popstate', synchronize);
window.addEventListener('hashchange', synchronize);
window.addEventListener('DOMContentLoaded', synchronize);
window.setTimeout(synchronize, 0);
