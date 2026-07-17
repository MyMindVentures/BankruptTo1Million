import { supabase } from './supabase';

type GroupCard = {
  group_key: string;
  slug: string;
  title: string;
  description: string | null;
  group_type: string;
  storage_bucket: string;
  storage_folder: string;
  location_name: string | null;
  started_at: string | null;
  ended_at: string | null;
  item_count: number;
  items: unknown[] | null;
};

export async function initializeMediaVaultGroupsUi(): Promise<void> {
  const page = document.querySelector<HTMLElement>('.media-vault');
  if (!page || page.querySelector('.media-group-section')) return;

  const query = new URLSearchParams({
    select: 'group_key,slug,title,description,group_type,storage_bucket,storage_folder,location_name,started_at,ended_at,item_count,items',
    order: 'ended_at.desc.nullslast,title.asc',
  });
  const response = await supabase.from('media_group_cards').request({ query: query.toString() });
  if (!response.ok) return;

  const groups = await response.json() as GroupCard[];
  if (!groups.length) return;

  page.classList.add('media-vault--grouped-by-post');

  const section = document.createElement('section');
  section.className = 'media-group-section';
  section.setAttribute('aria-labelledby', 'media-groups-title');
  section.innerHTML = `
    <div class="media-group-section__heading">
      <div><p class="eyebrow">Explore the archive</p><h2 id="media-groups-title">Stories and posts</h2></div>
      <p>Every photo and video is grouped inside its journal post. No loose footage is shown.</p>
    </div>
    <div class="media-group-grid"></div>`;

  const grid = section.querySelector<HTMLElement>('.media-group-grid')!;
  groups.forEach((group) => {
    const card = document.createElement('a');
    card.className = 'media-group-card';
    card.href = `/journal/${encodeURIComponent(group.slug)}`;
    card.dataset.groupKey = group.group_key;
    card.dataset.groupType = group.group_type;
    card.dataset.storageSources = `${group.storage_bucket}/${group.storage_folder}`;

    const meta = [
      `${Number(group.item_count) || 0} ${(Number(group.item_count) || 0) === 1 ? 'media item' : 'media items'}`,
      group.location_name,
      'Journal post',
    ].filter(Boolean).join(' · ');

    card.innerHTML = `
      <span class="media-group-card__eyebrow">Journal post</span>
      <strong>${escapeHtml(group.title)}</strong>
      ${group.description ? `<span>${escapeHtml(group.description)}</span>` : ''}
      <small>${escapeHtml(meta)}</small>`;

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
