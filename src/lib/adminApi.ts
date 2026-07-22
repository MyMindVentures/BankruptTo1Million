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

export type AdminConceptSummary = {
  id: string;
  title: string;
  slug: string;
  source_text: string | null;
  concept_status: string;
  ai_orchestration_status: string;
  source_version_number: number;
  active_source_version_id: string | null;
  updated_at: string;
};

export type AdminConceptVersion = {
  id: string;
  concept_id: string;
  version_number: number;
  title: string | null;
  source_text: string;
  source_language: string;
  change_summary: string | null;
  is_active: boolean;
  ai_orchestration_status: string;
  created_at: string;
};

export type AdminSectionField = {
  name: string;
  labelKey: string;
  labelFallback: string;
  displayOrder: number;
  showInList: boolean;
  showInEditor: boolean;
  readOnly: boolean;
  required: boolean;
  inputType: 'text' | 'textarea' | 'boolean' | 'number' | 'datetime' | 'date' | 'url' | 'email' | 'select' | 'json';
  options: unknown[];
};

export type AdminSectionDefinition = {
  key: string;
  route: string;
  titleKey: string;
  titleFallback: string;
  descriptionKey: string;
  descriptionFallback: string;
  sourceTable: string;
  primaryKey: string;
  titleField: string;
  subtitleField?: string | null;
  statusField?: string | null;
  dateField?: string | null;
  imageField?: string | null;
  linkField?: string | null;
  variant: 'table' | 'cards' | 'media' | 'timeline' | 'settings' | 'audit';
  orderField: string;
  orderDirection: 'asc' | 'desc';
  defaultLimit: number;
  requiredRoles: string[];
  fields: AdminSectionField[];
};

export type AiRetryPolicy = { max_attempts?: number; base_delay_ms?: number; retry_on?: number[] };
export type AiEdgeFunctionConfig = AdminRow & { id: string; edge_function_slug: string; display_name?: string | null; description?: string | null; provider?: string | null; model?: string | null; primary_model_id?: string | null; active_prompt_version_id?: string | null; system_prompt?: string | null; user_prompt_template?: string | null; temperature?: number | string | null; max_output_tokens?: number | null; timeout_ms?: number | null; retry_policy?: AiRetryPolicy | null; cost_limit_usd?: number | string | null; latency_warning_ms?: number | null; enable_run_logging?: boolean | null; verify_jwt?: boolean | null; is_active?: boolean | null; is_deprecated?: boolean | null; config_version?: number | null; updated_at?: string | null; };
export type AiProvider = AdminRow & { id: string; slug: string; display_name: string; is_active?: boolean | null; };
export type AiModel = AdminRow & { id: string; model_key: string; display_name?: string | null; provider_id?: string | null; is_active?: boolean | null; max_output_tokens?: number | null; };
export type AiPromptVersion = AdminRow & { id: string; edge_function_config_id: string; name: string; version?: number | null; system_prompt?: string | null; user_prompt_template?: string | null; change_summary?: string | null; is_active?: boolean | null; created_at?: string | null; };
export type AiFunctionRun = AdminRow & { id: string; edge_function_slug?: string | null; status?: string | null; provider?: string | null; model?: string | null; latency_ms?: number | null; estimated_cost_usd?: number | string | null; started_at?: string | null; };
export type AiControlCenterData = { configs: AiEdgeFunctionConfig[]; providers: AiProvider[]; models: AiModel[]; prompts: AiPromptVersion[]; runs: AiFunctionRun[]; };

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

function formatSupabaseError(payload: unknown, status: number): string {
  if (!payload || typeof payload !== 'object') return `Supabase request failed (${status})`;
  const error = payload as { message?: string; error_description?: string; code?: string; details?: string; hint?: string };
  const parts = [error.message || error.error_description || `Supabase request failed (${status})`];
  if (error.code) parts.push(`code: ${error.code}`);
  if (error.details) parts.push(`details: ${error.details}`);
  if (error.hint) parts.push(`hint: ${error.hint}`);
  return parts.join(' · ');
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  requireConfig();
  const token = accessToken();
  const response = await fetch(`${supabaseUrl}${path}`, {
    ...init,
    cache: 'no-store',
    headers: { apikey: anonKey!, Authorization: `Bearer ${token || anonKey}`, 'Content-Type': 'application/json', ...(init?.headers || {}) },
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(formatSupabaseError(payload, response.status));
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export async function signInAdmin(email: string, password: string): Promise<{ session: AdminSession; access: AdminAccess }> {
  requireConfig();
  const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: anonKey!, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
  const payload = await response.json() as AdminSession & { error_description?: string; msg?: string };
  if (!response.ok || !payload.access_token) throw new Error(payload.error_description || payload.msg || 'Ongeldige login.');
  payload.expires_at = payload.expires_at || Math.floor(Date.now() / 1000) + 3600;
  localStorage.setItem(sessionKey, JSON.stringify(payload));
  try { return { session: payload, access: await getAdminAccess() }; }
  catch (error) { localStorage.removeItem(sessionKey); throw error; }
}

export async function getAdminAccess(): Promise<AdminAccess> {
  if (!getAdminSession()) throw new Error('Geen geldige adminsessie.');
  const rows = await request<AdminAccess[]>('/rest/v1/rpc/get_my_admin_access', { method: 'POST', body: '{}' });
  const access = rows[0];
  if (!access || !access.is_active) throw new Error('Dit account heeft geen actieve admin-toegang.');
  return access;
}

export async function canCreateJournalPost(): Promise<boolean> {
  if (!getAdminSession()) return false;
  return request<boolean>('/rest/v1/rpc/can_create_journal_post', { method: 'POST', body: '{}' });
}

export async function restoreAdminAuth(): Promise<{ session: AdminSession; access: AdminAccess } | null> {
  const session = getAdminSession();
  if (!session) return null;
  try { return { session, access: await getAdminAccess() }; }
  catch { localStorage.removeItem(sessionKey); return null; }
}

export async function signOutAdmin() {
  const token = accessToken();
  if (token && supabaseUrl && anonKey) await fetch(`${supabaseUrl}/auth/v1/logout`, { method: 'POST', headers: { apikey: anonKey, Authorization: `Bearer ${token}` } }).catch(() => undefined);
  localStorage.removeItem(sessionKey);
}

export async function getAdminDashboardData() {
  const sources = {
    modules: request<AdminModule[]>('/rest/v1/admin_modules?select=key,label,route,icon,group_key,display_order,required_roles,badge_source,is_enabled&is_enabled=eq.true&order=group_key.asc,display_order.asc'),
    overview: request<AdminOverview>('/rest/v1/rpc/get_admin_dashboard_overview', { method: 'POST', body: '{}' }),
    tasks: request<AdminTask[]>('/rest/v1/admin_tasks?select=id,title,status,priority,due_at&status=not.in.(done,cancelled)&order=due_at.asc.nullslast&limit=6'),
    notifications: request<AdminNotification[]>('/rest/v1/admin_notifications?select=id,title,message,severity,created_at,is_read&order=created_at.desc&limit=6'),
    audit: request<AuditEntry[]>('/rest/v1/admin_audit_log?select=id,action,table_name,occurred_at,actor_email&order=occurred_at.desc&limit=8'),
  };
  const entries = await Promise.all(Object.entries(sources).map(async ([name, promise]) => {
    try { return [name, { value: await promise }] as const; }
    catch (error) { return [name, { error: error instanceof Error ? error.message : 'Unknown query error' }] as const; }
  }));
  const result = Object.fromEntries(entries) as Record<string, { value?: unknown; error?: string }>;
  const modules = (result.modules.value as AdminModule[] | undefined) || [];
  return {
    modules,
    overview: (result.overview.value as AdminOverview | undefined) || {},
    tasks: (result.tasks.value as AdminTask[] | undefined) || [],
    notifications: (result.notifications.value as AdminNotification[] | undefined) || [],
    audit: (result.audit.value as AuditEntry[] | undefined) || [],
    errors: Object.fromEntries(Object.entries(result).filter(([, item]) => item.error).map(([name, item]) => [name, item.error!])) as Record<string, string>,
  };
}

export async function getAdminSectionDefinition(route: string, signal?: AbortSignal): Promise<AdminSectionDefinition> {
  const definition = await request<AdminSectionDefinition>('/rest/v1/rpc/get_admin_section_definition', {
    method: 'POST',
    body: JSON.stringify({ p_route: route }),
    signal,
  });
  if (!definition?.sourceTable || !definition.fields?.length) throw new Error(`Incomplete Admin metadata returned for ${route}.`);
  return definition;
}

function uniqueFields(definition: AdminSectionDefinition): string[] {
  return [...new Set([
    definition.primaryKey,
    definition.titleField,
    definition.subtitleField,
    definition.statusField,
    definition.dateField,
    definition.imageField,
    definition.linkField,
    definition.orderField,
    ...definition.fields.map((field) => field.name),
  ].filter((field): field is string => Boolean(field)))];
}

export async function getAdminSectionRows(definition: AdminSectionDefinition, signal?: AbortSignal): Promise<AdminRow[]> {
  const select = uniqueFields(definition).join(',');
  const order = `${definition.orderField}.${definition.orderDirection}`;
  return request<AdminRow[]>(`/rest/v1/${encodeURIComponent(definition.sourceTable)}?select=${encodeURIComponent(select)}&order=${encodeURIComponent(order)}&limit=${definition.defaultLimit}`, { signal });
}

export async function updateAdminSectionRow(definition: AdminSectionDefinition, keyValue: string, changes: AdminRow): Promise<AdminRow[]> {
  const allowed = new Set(definition.fields.filter((field) => field.showInEditor && !field.readOnly).map((field) => field.name));
  const sanitized = Object.fromEntries(Object.entries(changes).filter(([key]) => allowed.has(key)));
  if (!Object.keys(sanitized).length) throw new Error('No editable fields were supplied.');
  return request<AdminRow[]>(`/rest/v1/${encodeURIComponent(definition.sourceTable)}?${encodeURIComponent(definition.primaryKey)}=eq.${encodeURIComponent(keyValue)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(sanitized),
  });
}

export async function createAdminRow(table: string, values: AdminRow): Promise<AdminRow[]> {
  return request<AdminRow[]>(`/rest/v1/${table}`, { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(values) });
}

export async function deleteAdminRow(table: string, key: string, value: string): Promise<void> {
  await request<void>(`/rest/v1/${table}?${key}=eq.${encodeURIComponent(value)}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
}

export async function getAdminConcepts(): Promise<AdminConceptSummary[]> {
  return request<AdminConceptSummary[]>('/rest/v1/proof_of_mind_concepts?select=id,title,slug,source_text,concept_status,ai_orchestration_status,source_version_number,active_source_version_id,updated_at&order=updated_at.desc&limit=250');
}

export async function getConceptVersions(conceptId: string): Promise<AdminConceptVersion[]> {
  return request<AdminConceptVersion[]>(`/rest/v1/proof_of_mind_concept_versions?select=id,concept_id,version_number,title,source_text,source_language,change_summary,is_active,ai_orchestration_status,created_at&concept_id=eq.${encodeURIComponent(conceptId)}&order=version_number.desc`);
}

export async function createConceptFromSourceText(input: { sourceText: string; title: string; originalLanguage: string }): Promise<string> {
  return request<string>('/rest/v1/rpc/create_concept_from_source_text', {
    method: 'POST',
    body: JSON.stringify({
      p_source_text: input.sourceText,
      p_title: input.title,
      p_original_language: input.originalLanguage,
    }),
  });
}

export async function saveConceptSourceVersion(conceptId: string, input: { sourceText: string; title?: string; sourceLanguage?: string; changeSummary?: string }): Promise<string> {
  return request<string>('/rest/v1/rpc/save_concept_source_version', {
    method: 'POST',
    body: JSON.stringify({
      p_concept_id: conceptId,
      p_source_text: input.sourceText,
      p_title: input.title || null,
      p_source_language: input.sourceLanguage || null,
      p_change_summary: input.changeSummary || null,
    }),
  });
}

export async function runConceptAiEnrichment(conceptId: string, overwriteMode: 'empty_only' | 'ai_only' | 'all' = 'ai_only'): Promise<unknown> {
  return request('/functions/v1/orchestrate-concept-ai-enrichment', {
    method: 'POST',
    body: JSON.stringify({ concept_id: conceptId, overwrite_mode: overwriteMode }),
  });
}

export async function getAiControlCenterData(): Promise<AiControlCenterData> {
  const [configs, providers, models, prompts, runs] = await Promise.all([
    request<AiEdgeFunctionConfig[]>('/rest/v1/ai_edge_function_configs?select=id,edge_function_slug,display_name,description,provider,model,primary_model_id,active_prompt_version_id,system_prompt,user_prompt_template,temperature,max_output_tokens,timeout_ms,retry_policy,cost_limit_usd,latency_warning_ms,enable_run_logging,verify_jwt,is_active,is_deprecated,config_version,updated_at&order=edge_function_slug.asc'),
    request<AiProvider[]>('/rest/v1/ai_providers?select=id,slug,display_name,is_active&order=display_name.asc'),
    request<AiModel[]>('/rest/v1/ai_models?select=id,provider_id,model_key,display_name,max_output_tokens,is_active&order=display_name.asc.nullslast,model_key.asc'),
    request<AiPromptVersion[]>('/rest/v1/ai_prompt_versions?select=id,edge_function_config_id,version,name,system_prompt,user_prompt_template,change_summary,is_active,created_at&order=created_at.desc'),
    request<AiFunctionRun[]>('/rest/v1/ai_edge_function_runs?select=id,edge_function_slug,status,provider,model,latency_ms,estimated_cost_usd,started_at&order=started_at.desc&limit=100'),
  ]);
  return { configs, providers, models, prompts, runs };
}

export async function updateAiEdgeFunctionConfig(edgeFunctionSlug: string, patch: AdminRow): Promise<unknown> {
  return request('/rest/v1/rpc/admin_update_ai_edge_function_config', { method: 'POST', body: JSON.stringify({ p_edge_function_slug: edgeFunctionSlug, p_patch: patch }) });
}

export async function createAiPromptVersion(input: { edgeFunctionSlug: string; name: string; systemPrompt: string; userPromptTemplate: string; changeSummary: string; activate: boolean; }): Promise<unknown> {
  return request('/rest/v1/rpc/admin_create_ai_prompt_version', { method: 'POST', body: JSON.stringify({ p_edge_function_slug: input.edgeFunctionSlug, p_name: input.name, p_system_prompt: input.systemPrompt, p_user_prompt_template: input.userPromptTemplate, p_change_summary: input.changeSummary, p_activate: input.activate }) });
}

export async function activateAiPromptVersion(promptVersionId: string): Promise<unknown> {
  return request('/rest/v1/rpc/admin_activate_ai_prompt_version', { method: 'POST', body: JSON.stringify({ p_prompt_version_id: promptVersionId }) });
}

export type AdminMediaVaultPostGroup = {
  post_id: string;
  title: string;
  slug: string;
  status: string;
  asset_count: number;
  cover_storage_bucket: string | null;
  cover_storage_path: string | null;
  cover_thumbnail_url: string | null;
  cover_asset_type: string | null;
  occurred_at: string | null;
  event_timezone: string | null;
  updated_at: string | null;
};

export type AdminMediaVaultAsset = {
  asset_id: string;
  asset_type: string;
  storage_bucket: string | null;
  storage_path: string | null;
  thumbnail_url: string | null;
  mime_type: string | null;
  alt_text: string | null;
  caption: string | null;
  display_order: number;
  created_at: string;
  captured_at: string | null;
  original_filename: string | null;
};

export type AdminMediaVaultCategoryKey = 'journal_unlinked' | 'founders' | 'journey_events' | 'other';

export type AdminMediaVaultCategoryGroup = {
  key: AdminMediaVaultCategoryKey | string;
  asset_count: number;
  cover_storage_bucket: string | null;
  cover_storage_path: string | null;
  cover_thumbnail_url: string | null;
  cover_asset_type: string | null;
  assets: AdminMediaVaultAsset[];
};

export type AdminMediaVaultGroups = {
  posts: AdminMediaVaultPostGroup[];
  categories: AdminMediaVaultCategoryGroup[];
};

export async function listAdminMediaVaultGroups(signal?: AbortSignal): Promise<AdminMediaVaultGroups> {
  const payload = await request<AdminMediaVaultGroups>('/rest/v1/rpc/admin_list_media_vault_groups', {
    method: 'POST',
    body: '{}',
    signal,
  });
  if (!payload || !Array.isArray(payload.posts) || !Array.isArray(payload.categories)) {
    throw new Error('Incomplete Media Vault groups payload.');
  }
  return {
    posts: payload.posts,
    categories: payload.categories.map((category) => ({
      ...category,
      asset_count: Number(category.asset_count) || (category.assets?.length ?? 0),
      assets: Array.isArray(category.assets) ? category.assets : [],
    })),
  };
}
