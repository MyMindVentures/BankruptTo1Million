export type JournalPost = {
  id: string;
  title: string;
  slug: string;
  status: 'draft' | 'scheduled' | 'published' | 'archived';
  subtitle: string | null;
  excerpt: string | null;
  body: string;
  content_format: 'markdown' | 'rich_text' | 'video' | 'mixed';
  cover_image_url: string | null;
  cover_image_alt: string | null;
  original_language: string;
  category_id: string | null;
  primary_creator_id: string | null;
  is_featured: boolean;
  is_vision_feature: boolean;
  published_at: string | null;
  scheduled_for: string | null;
  reading_time_minutes: number | null;
  seo_title: string | null;
  seo_description: string | null;
  publication_timezone: string;
  created_at: string;
  updated_at: string;
};

export type JournalOption = { id: string; label: string };
export type JournalPayload = Omit<JournalPost, 'id' | 'created_at' | 'updated_at'>;

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '');
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const sessionKey = 'bankrupt1m.admin.session';

function token() {
  const raw = localStorage.getItem(sessionKey);
  if (!raw) throw new Error('Geen geldige adminsessie.');
  const parsed = JSON.parse(raw) as { access_token?: string };
  if (!parsed.access_token) throw new Error('Geen geldige adminsessie.');
  return parsed.access_token;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!supabaseUrl || !anonKey) throw new Error('Supabase configuratie ontbreekt.');
  const response = await fetch(`${supabaseUrl}${path}`, {
    ...init,
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${token()}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { message?: string; details?: string; hint?: string } | null;
    throw new Error(payload?.message || payload?.details || `Supabase request failed (${response.status})`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export async function listJournalPosts(): Promise<JournalPost[]> {
  return request<JournalPost[]>('/rest/v1/journal_posts?select=*&order=updated_at.desc&limit=200');
}

export async function getJournalOptions() {
  const [categories, authors] = await Promise.all([
    request<Array<{ id: string; name: string }>>('/rest/v1/journal_categories?select=id,name&order=name.asc'),
    request<Array<{ id: string; display_name: string }>>('/rest/v1/journal_authors?select=id,display_name&order=display_name.asc'),
  ]);
  return {
    categories: categories.map((item) => ({ id: item.id, label: item.name })),
    authors: authors.map((item) => ({ id: item.id, label: item.display_name })),
  };
}

export async function createJournalPost(payload: Partial<JournalPayload>): Promise<JournalPost> {
  return request<JournalPost>('/rest/v1/rpc/admin_create_journal_post', {
    method: 'POST',
    body: JSON.stringify({ payload }),
  });
}

export async function updateJournalPost(id: string, payload: Partial<JournalPayload>): Promise<JournalPost> {
  return request<JournalPost>('/rest/v1/rpc/admin_update_journal_post', {
    method: 'POST',
    body: JSON.stringify({ post_id: id, payload }),
  });
}

export async function deleteJournalPost(id: string): Promise<boolean> {
  return request<boolean>('/rest/v1/rpc/admin_delete_journal_post', {
    method: 'POST',
    body: JSON.stringify({ post_id: id }),
  });
}
