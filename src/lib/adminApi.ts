export type AdminModule = {
  id: string;
  key: string;
  name: string;
  route: string;
  icon: string | null;
  group_name: string | null;
  sort_order: number | null;
  required_roles: string[] | null;
  badge_source: string | null;
  is_active: boolean | null;
};

export type AdminTask = {
  id: string;
  title: string;
  status: string | null;
  priority: string | null;
  due_at: string | null;
};

export type AdminNotification = {
  id: string;
  title: string;
  body: string | null;
  severity: string | null;
  created_at: string;
  read_at: string | null;
};

export type AuditEntry = {
  id: string;
  action: string;
  entity_type: string | null;
  created_at: string;
  actor_email: string | null;
};

export type AdminOverview = Record<string, unknown>;

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '');
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

function accessToken(): string | null {
  const direct = localStorage.getItem('supabase.auth.token');
  if (direct) return direct;

  const storageKey = Object.keys(localStorage).find((key) => key.startsWith('sb-') && key.endsWith('-auth-token'));
  if (!storageKey) return null;

  try {
    const session = JSON.parse(localStorage.getItem(storageKey) || '{}') as { access_token?: string };
    return session.access_token || null;
  } catch {
    return null;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!supabaseUrl || !anonKey) {
    throw new Error('VITE_SUPABASE_URL en VITE_SUPABASE_ANON_KEY ontbreken.');
  }

  const token = accessToken();
  const response = await fetch(`${supabaseUrl}${path}`, {
    ...init,
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${token || anonKey}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Supabase request failed (${response.status})`);
  }

  return response.json() as Promise<T>;
}

export async function getAdminDashboardData() {
  const [modules, overview, tasks, notifications, audit] = await Promise.all([
    request<AdminModule[]>('/rest/v1/admin_modules?select=*&is_active=eq.true&order=group_name.asc,sort_order.asc'),
    request<AdminOverview>('/rest/v1/rpc/get_admin_dashboard_overview', { method: 'POST', body: '{}' }),
    request<AdminTask[]>('/rest/v1/admin_tasks?select=id,title,status,priority,due_at&status=neq.completed&order=due_at.asc.nullslast&limit=6'),
    request<AdminNotification[]>('/rest/v1/admin_notifications?select=id,title,body,severity,created_at,read_at&order=created_at.desc&limit=6'),
    request<AuditEntry[]>('/rest/v1/admin_audit_log?select=id,action,entity_type,created_at,actor_email&order=created_at.desc&limit=8'),
  ]);

  return { modules, overview, tasks, notifications, audit };
}
