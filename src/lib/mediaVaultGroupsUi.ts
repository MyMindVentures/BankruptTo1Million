import { supabase } from './supabase';

type GroupCard = {
  id: string;
  offer_slug: string;
  offer_title: string;
  title: string;
  description: string | null;
  storage_folder: string;
  accepted_asset_types: string[] | null;
  item_count: number;
};

export async function initializeMediaVaultGroupsUi(): Promise<void> {
  const page = document.querySelector<HTMLElement>('.media-vault');
  if (!page || page.querySelector('.media-group-section')) return;

  const query = new URLSearchParams({
    select: 'id,offer_slug,offer_title,title,description,storage_folder,accepted_asset_types,item_count',
    is_public: 'eq.true',
    order: 'offer_title.asc,display_order.asc,title.asc',
  });
  const response = await supabase.from('offer_media_group_cards').request({ query: query.toString() });
  if (!response.ok) return;

  const groups = await response.json() as GroupCard[];
  if (!groups.length) return;

  const section = document.createElement('section');
  section.className = 'media-group-section';
  section.setAttribute('aria-labelledby', 'media-groups-title');
  section.innerHTML = `
    <div class="media-group-section__heading">
      <div><p class="eyebrow">Browse by offer</p><h2 id="media-groups-title">Media groups</h2></div>
      <p>Open a group to filter the archive around a specific offer.</p>
    </div>
    <div class="media-group-grid"></div>`;

  const grid = section.querySelector<HTMLElement>('.media-group-grid')!;
  groups.forEach((group) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'media-group-card';
    card.dataset.offer = group.offer_title;
    card.innerHTML = `
      <span class="media-group-card__eyebrow">${escapeHtml(group.offer_title)}</span>
      <strong>${escapeHtml(group.title)}</strong>
      <span>${escapeHtml(group.description || 'Media connected to this offer.')}</span>
      <small>${group.item_count || 0} items · ${(group.accepted_asset_types || []).join(' + ') || 'media'}</small>`;
    card.addEventListener('click', () => {
      const input = page.querySelector<HTMLInputElement>('.media-search input');
      if (!input) return;
      input.value = group.offer_title;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.focus();
      page.querySelector('.media-explorer')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    grid.appendChild(card);
  });

  const intro = page.querySelector('.media-vault__intro');
  intro?.insertAdjacentElement('afterend', section);
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  })[character] || character);
}
