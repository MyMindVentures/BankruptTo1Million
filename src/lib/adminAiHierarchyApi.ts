import { getAdminSession } from './adminApi';

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

export async function getAdminAiHierarchy(): Promise<AdminAiHierarchyRow[]> {
  if (!supabaseUrl || !anonKey) throw new Error('Supabase configuration is unavailable.');
  const session = getAdminSession();
  if (!session?.access_token) throw new Error('A valid admin session is required.');
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/admin_get_ai_hierarchy`, {
    method: 'POST', cache: 'no-store', headers: {
      apikey: anonKey,
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    }, body: '{}',
  });
  if (!response.ok) throw new Error(`AI hierarchy query failed (${response.status}).`);
  return response.json() as Promise<AdminAiHierarchyRow[]>;
}
