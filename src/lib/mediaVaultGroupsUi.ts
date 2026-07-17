import { supabase } from './supabase';

type GroupCardRow = {
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

type GroupCard = GroupCardRow & {
  storage_sources: string[];
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

  const rows = await response.json() as GroupCardRow[];
  const groups = mergeGroupRows(rows);
  if (!groups.length) return;

  const section = document.createElement('section');
  section.className = 'media-group-section';
  section.setAttribute('aria-labelledby', 'media-groups-title');
  section.innerHTML = `
    <div class="media-group-section__heading">
      <div><p class="eyebrow">Explore the archive</p><h2 id="media-groups-title">Media groups</h2></div>
      <p>Groups are built directly from the existing Media Vault records, event links and Supabase bucket folders.</p>
    </div>
    <div class="media-group-grid"></div>`;

  const grid = section.querySelector<HTMLElement>('.media-group-grid')!;
  groups.forEach((group) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'media-group-card';
    card.dataset.groupKey = group.group_key;
    card.dataset.groupType = group.group_type;
    card.dataset.storageSources = group.storage_sources.join(',');

    const meta = [
      `${group.item_count} ${group.item_count === 1 ? 'item' : 'items'}`,
      group.location_name,
      humanize(group.group_type),
    ].filter(Boolean).join(' · ');

    card.innerHTML = `
      <span class="media-group-card__eyebrow">${escapeHtml(humanize(group.group_type))}</span>
      <strong>${escapeHtml(group.title)}</strong>
      ${group.description ? `<span>${escapeHtml(group.description)}</span>` : ''}
      <small>${escapeHtml(meta)}</small>`;

    card.addEventListener('click', () => {
      const input = page.querySelector<HTMLInputElement>('.media-search input');
      if (!input) return;
      setReactInputValue(input, group.title);
      input.focus();
      page.querySelector('.media-explorer')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    grid.appendChild(card);
  });

  const intro = page.querySelector('.media-vault__intro');
  intro?.insertAdjacentElement('afterend', section);
}

function mergeGroupRows(rows: GroupCardRow[]): GroupCard[] {
  const groups = new Map<string, GroupCard>();

  rows.forEach((row) => {
    const existing = groups.get(row.group_key);
    const source = `${row.storage_bucket}/${row.storage_folder}`;
    if (!existing) {
      groups.set(row.group_key, {
        ...row,
        item_count: Number(row.item_count) || 0,
        storage_sources: [source],
      });
      return;
    }

    existing.item_count += Number(row.item_count) || 0;
    existing.items = [...(existing.items || []), ...(row.items || [])];
    if (!existing.storage_sources.includes(source)) existing.storage_sources.push(source);
    if (!existing.location_name && row.location_name) existing.location_name = row.location_name;
    if (!existing.description && row.description) existing.description = row.description;
    if ((!existing.ended_at || (row.ended_at && row.ended_at > existing.ended_at))) existing.ended_at = row.ended_at;
  });

  return Array.from(groups.values()).sort((a, b) => (b.ended_at || '').localeCompare(a.ended_at || '') || a.title.localeCompare(b.title));
}

function setReactInputValue(input: HTMLInputElement, value: string): void {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function humanize(value: string): string {
  return value.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  })[character] || character);
}
