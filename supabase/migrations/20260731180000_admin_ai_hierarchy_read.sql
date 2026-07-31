-- Read-only admin access to the live AI hierarchy. No writes or private configuration fields.
create or replace function public.admin_get_ai_hierarchy()
returns table (agent_id uuid, agent_slug text, agent_name text, agent_title text, agent_department text, agent_status text, reports_to_agent_id uuid, team_id uuid, team_slug text, team_name text, team_status text)
language plpgsql security invoker stable set search_path = public
as $$
begin
  if not public.has_active_admin_access() then raise exception 'Administrator access is required.' using errcode = '42501'; end if;
  return query select a.id,a.slug,a.name,a.title,a.department,a.status,a.reports_to_agent_id,t.id,t.slug,t.name,t.status
    from public.ai_agents a join public.ai_teams t on t.id = a.team_id order by t.name asc,a.priority asc,a.name asc;
end;
$$;
grant execute on function public.admin_get_ai_hierarchy() to authenticated;
