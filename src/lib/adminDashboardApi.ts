import { getAdminSession } from './adminApi';

export type AdminDashboardKpi = {
  kpi_key: string;
  label_key: string;
  label_fallback: string;
  overview_path: string[];
  icon: string | null;
  display_order: number;
};

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '');
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export async function getAdminDashboardKpis(): Promise<AdminDashboardKpi[]> {
  if (!supabaseUrl || !anonKey) throw new Error('Supabase configuration is missing.');
  const token = getAdminSession()?.access_token;
  const response = await fetch(`${supabaseUrl}/rest/v1/admin_dashboard_kpis?select=kpi_key,label_key,label_fallback,overview_path,icon,display_order&is_enabled=eq.true&order=display_order.asc`, {
    cache: 'no-store',
    headers: { apikey: anonKey, Authorization: `Bearer ${token || anonKey}` },
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { message?: string; code?: string; details?: string; hint?: string } | null;
    throw new Error([payload?.message || `Dashboard KPI query failed (${response.status})`, payload?.code, payload?.details, payload?.hint].filter(Boolean).join(' · '));
  }
  return response.json() as Promise<AdminDashboardKpi[]>;
}

export function resolveOverviewValue(overview: unknown, path: string[]): number | null {
  let cursor: unknown = overview;
  for (const segment of path) {
    if (!cursor || typeof cursor !== 'object') return null;
    cursor = (cursor as Record<string, unknown>)[segment];
  }
  return typeof cursor === 'number' && Number.isFinite(cursor) ? cursor : null;
}
