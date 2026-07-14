export type AdminModule = {
  key: string;
  label: string;
  route: string;
  icon: string | null;
  group_key: string | null;
  display_order: number | null;
  required_roles: string[] | null;
  badge_source: string | null;
  is_enabled: boolean;
};

export type AdminTask = { id: string; title: string; status: string | null; priority: string | null; due_at: string | null; };
export type AdminNotification = { id: string; title: string; message: string | null; severity: string | null; created_at: string; is_read: boolean; };
export type AuditEntry = { id: number; action: string; table_name: string | null; occurred_at: string; actor_email: string | null; };
export type AdminOverview = {
  content?: { journal_total?: number; journal_drafts?: number; scheduled?: number; published?: number; journey_entries?: number; pending_comments?: number; };
  media?: { assets?: number; processing?: number; failed?: number; private?: number; };
  people?: { journey_people?: number; hosts?: number; interviews?: number; jobs?: number; founding_heroes?: number; };
  ventures?: { concepts?: number; concept_drafts?: number; leads?: number; applications?: number; };
  delivery?: { github_issues?: number; open_issues?: number; contributors?: number; };
  alerts?: { unread_notifications?: number; overdue_tasks?: number; failed_media?: number; };
};
export type AdminSession = { access_token: string; refresh_token: string; expires_at?: number; user: { id: string; email?: string }; };
export type AdminAccess = { email: string; full_name: string | null; role: string; is_active: boolean; };
export type AdminRow = Record<string, unknown>;

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '');
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const sessionKey = 'bankrupt1m.admin.session';

function requireConfig() {
  if (!supabaseUrl || !anonKey) throw new Error('VITE_SUPABASE_URL en VITE_SUPABASE_ANON_KEY ontbreken.');
}

export function getAdminSession(): AdminSession | null {
  try {
    const stored = localStorage.getItem(sessionKey);
    if (!stored) return null;
    const session = JSON.parse(stored) as AdminSession;
    if (!session.access_token || !session.user) return null;
    if (session.expires_at && Date.now() / 1000 >= session.expires_at) {
      localStorage.removeItem(sessionKey);
      return null;
    }
    return session;
  } catch {
    localStorage.removeItem(sessionKey);
    return null;
  }
}

function accessToken(): string | null { return getAdminSession()?.access_token || null; }

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  requireConfig();
  const token = accessToken();
  const response = await fetch(`${supabaseUrl}${path}`, {
    ...init,
    headers: { apikey: anonKey!, Authorization: `Bearer ${token || anonKey}`, 'Content-Type': 'application/json', ...(init?.headers || {}) },
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { message?: string; error_description?: string } | null;
    throw new Error(payload?.message || payload?.error_description || `Supabase request failed (${response.status})`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export async function signInAdmin(email: string, password: string): Promise<{ session: AdminSession; access: AdminAccess }> {
  requireConfig();
  const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: anonKey!, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const payload = await response.json() as AdminSession & { error_description?: string; msg?: string };
  if (!response.ok || !payload.access_token) throw new Error(payload.error_description || payload.msg || 'Ongeldige login.');
  payload.expires_at = payload.expires_at || Math.floor(Date.now() / 1000) + 3600;
  localStorage.setItem(sessionKey, JSON.stringify(payload));
  try {
    const access = await getAdminAccess();
    return { session: payload, access };
  } catch (error) {
    localStorage.removeItem(sessionKey);
    throw error;
  }
}

export async function getAdminAccess(): Promise<AdminAccess> {
  if (!getAdminSession()) throw new Error('Geen geldige adminsessie.');
  const rows = await request<AdminAccess[]>('/rest/v1/rpc/get_my_admin_access', { method: 'POST', body: '{}' });
  const access = rows[0];
  if (!access || !access.is_active) throw new Error('Dit account heeft geen actieve admin-toegang.');
  return access;
}

export async function restoreAdminAuth(): Promise<{ session: AdminSession; access: AdminAccess } | null> {
  const session = getAdminSession();
  if (!session) return null;
  try { return { session, access: await getAdminAccess() }; }
  catch { localStorage.removeItem(sessionKey); return null; }
}

export async function signOutAdmin() {
  const token = accessToken();
  if (token && supabaseUrl && anonKey) {
    await fetch(`${supabaseUrl}/auth/v1/logout`, { method: 'POST', headers: { apikey: anonKey, Authorization: `Bearer ${token}` } }).catch(() => undefined);
  }
  localStorage.removeItem(sessionKey);
}

export async function getAdminDashboardData() {
  const [modules, overview, tasks, notifications, audit] = await Promise.all([
    request<AdminModule[]>('/rest/v1/admin_modules?select=key,label,route,icon,group_key,display_order,required_roles,badge_source,is_enabled&is_enabled=eq.true&order=group_key.asc,display_order.asc'),
    request<AdminOverview>('/rest/v1/rpc/get_admin_dashboard_overview', { method: 'POST', body: '{}' }),
    request<AdminTask[]>('/rest/v1/admin_tasks?select=id,title,status,priority,due_at&status=not.in.(done,cancelled)&order=due_at.asc.nullslast&limit=6'),
    request<AdminNotification[]>('/rest/v1/admin_notifications?select=id,title,message,severity,created_at,is_read&order=created_at.desc&limit=6'),
    request<AuditEntry[]>('/rest/v1/admin_audit_log?select=id,action,table_name,occurred_at,actor_email&order=occurred_at.desc&limit=8'),
  ]);
  return { modules, overview, tasks, notifications, audit };
}

export async function getAdminSectionRows(table: string, select: string, order: string, limit = 100): Promise<AdminRow[]> {
  return request<AdminRow[]>(`/rest/v1/${table}?select=${encodeURIComponent(select)}&order=${encodeURIComponent(order)}&limit=${limit}`);
}

export async function updateAdminRow(table: string, key: string, value: string, changes: AdminRow): Promise<AdminRow[]> {
  return request<AdminRow[]>(`/rest/v1/${table}?${key}=eq.${encodeURIComponent(value)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(changes),
  });
}

export async function createAdminRow(table: string, values: AdminRow): Promise<AdminRow[]> {
  return request<AdminRow[]>(`/rest/v1/${table}`, {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(values),
  });
}
