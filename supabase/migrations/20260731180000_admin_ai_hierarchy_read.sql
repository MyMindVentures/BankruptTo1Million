-- Read-only admin access to the live AI hierarchy. No writes or private configuration fields.
create or replace function public.admin_get_ai_hierarchy()
returns table (agent_id uuid, agent_slug text, agent_name text, agent_title text, agent_department text, agent_status text, reports_to_agent_id uuid, team_id uuid, team_slug text, team_name text, team_status text)
language plpgsql security invoker stable set search_path = public
as $$
begin
  if not public.has_active_admin_access() then raise exception 'Administrator access is required.' using errcode = '42501'; end if;
  return query select a.id, a.slug, a.name, a.title, a.department, a.status, a.reports_to_agent_id, t.id, t.slug, t.name, t.status from public.ai_agents a join public.ai_teams t on t.id = a.team_id order by t.name asc, a.priority asc, a.name asc;
end;
$$;
grant execute on function public.admin_get_ai_hierarchy() to authenticated;

do $$
begin
  if to_regclass('public.admin_modules') is not null then
    insert into public.admin_modules(key, label, description, route, icon, group_key, display_order, required_roles, is_enabled) values ('ai_hierarchy', 'AI Hierarchy', 'Live read-only Mermaid view of the Supabase AI hierarchy.', '/admin/ai-hierarchy', 'network', 'operations', 47, array['admin'], true)
    on conflict (key) do update set label = excluded.label, description = excluded.description, route = excluded.route, icon = excluded.icon, group_key = excluded.group_key, display_order = excluded.display_order, required_roles = excluded.required_roles, is_enabled = excluded.is_enabled, updated_at = now();
  end if;
end $$;

do $$
begin
  if to_regclass('public.website_ui_components') is not null then
    insert into public.website_ui_components(component_key, source_path, namespace, metadata) values ('admin.ai_hierarchy.page', 'src/pages/AdminAiHierarchyPage.tsx', 'admin.ai_hierarchy', '{"scope":"admin","source":"supabase-ai-agents"}'::jsonb)
    on conflict (component_key) do update set source_path = excluded.source_path, namespace = excluded.namespace, metadata = excluded.metadata;
  end if;
exception when undefined_column or undefined_table then null;
end $$;

-- Required translation keys are listed here; existing catalog seeding remains the source of truth.
/* admin.ai_hierarchy.eyebrow, admin.ai_hierarchy.title, admin.ai_hierarchy.description, admin.ai_hierarchy.loading, admin.ai_hierarchy.error, admin.ai_hierarchy.empty, admin.ai_hierarchy.refresh, admin.ai_hierarchy.graph_label, admin.ai_hierarchy.diagnostics, admin.ai_hierarchy.cycles, admin.ai_hierarchy.orphans, admin.ai_hierarchy.team, admin.ai_hierarchy.controls, admin.ai_hierarchy.zoom_in, admin.ai_hierarchy.zoom_out, admin.ai_hierarchy.reset, admin.ai_hierarchy.expand_all, admin.ai_hierarchy.collapse_all, admin.ai_hierarchy.teams */
-- No agent/team rows are inserted, updated, or deleted by this migration.