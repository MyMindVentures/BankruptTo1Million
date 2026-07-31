import type { AdminSession } from './adminApi';

export type AdminAiHierarchyRow = {
  agent_id: string;
  agent_slug: string;
  agent_name: string;
  agent_title: string;
  agent_department: string;
  agent_status: string;
  reports_to_agent_id: string | null;
  team_id: string;
  team_slug: string;
  team_name: string;
  team_status: string;
};

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '');
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const sessionKey = 'bankrupt1m.admin.session';

function readSession(): AdminSession | null {
  try {
    return JSON.parse(localStorage.getItem(sessionKey) || 'null') as AdminSession | null;
  } catch {
    localStorage.removeItem(sessionKey);
    return null;
  }
}

async function refreshSession(session: AdminSession): Promise<AdminSession | null> {
  if (!supabaseUrl || !anonKey || !session.refresh_token) return null;

  const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    cache: 'no-store',
    headers: { apikey: anonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: session.refresh_token }),
  });

  if (!response.ok) {
    localStorage.removeItem(sessionKey);
    return null;
  }

  const refreshed = await response.json() as AdminSession & { expires_in?: number };
  refreshed.expires_at = refreshed.expires_at
    || Math.floor(Date.now() / 1000) + (refreshed.expires_in || 3600);
  localStorage.setItem(sessionKey, JSON.stringify(refreshed));
  return refreshed;
}

async function getValidSession(forceRefresh = false): Promise<AdminSession | null> {
  const session = readSession();
  if (!session?.access_token) return null;

  const expiresSoon = Boolean(
    session.expires_at
    && Date.now() / 1000 >= session.expires_at - 30,
  );

  if (forceRefresh || expiresSoon) return refreshSession(session);
  return session;
}

async function requestHierarchy(token: string): Promise<Response> {
  return fetch(`${supabaseUrl}/rest/v1/rpc/admin_get_ai_hierarchy`, {
    method: 'POST',
    cache: 'no-store',
    headers: {
      apikey: anonKey!,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: '{}',
  });
}

export async function getAdminAiHierarchy(): Promise<AdminAiHierarchyRow[]> {
  if (!supabaseUrl || !anonKey) {
    throw new Error('VITE_SUPABASE_URL en VITE_SUPABASE_ANON_KEY ontbreken.');
  }

  let session = await getValidSession();
  if (!session) throw new Error('Geen geldige adminsessie. Log opnieuw in.');

  let response = await requestHierarchy(session.access_token);

  if (response.status === 401) {
    session = await getValidSession(true);
    if (!session) throw new Error('Adminsessie verlopen. Log opnieuw in.');
    response = await requestHierarchy(session.access_token);
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { message?: string } | null;
    throw new Error(payload?.message || `AI hierarchy request failed (${response.status}).`);
  }

  return response.json() as Promise<AdminAiHierarchyRow[]>;
}
