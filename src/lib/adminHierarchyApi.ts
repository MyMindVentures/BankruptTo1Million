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

export async function getAdminAiHierarchy(): Promise<AdminAiHierarchyRow[]> {
  if (!supabaseUrl || !anonKey) throw new Error('VITE_SUPABASE_URL en VITE_SUPABASE_ANON_KEY ontbreken.');
  let session: AdminSession | null = null;
  try { session = JSON.parse(localStorage.getItem(sessionKey) || 'null') as AdminSession | null; } catch { session = null; }
  const token = session?.access_token || anonKey;
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/admin_get_ai_hierarchy`, {
    method: 'POST',
    cache: 'no-store',
    headers: { apikey: anonKey, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: '{}',
  });
  if (!response.ok) throw new Error(`AI hierarchy request failed (${response.status}).`);
  return response.json() as Promise<AdminAiHierarchyRow[]>;
}
