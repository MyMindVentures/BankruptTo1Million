-- Register AI Control Center in admin sidebar navigation.

do $$
begin
  if to_regclass('public.admin_modules') is not null then
    insert into public.admin_modules(key, label, route, icon, group_key, display_order, required_roles, is_enabled)
    values ('ai_control', 'AI Control', '/admin/ai', 'bot', 'operations', 46, array['admin'], true)
    on conflict (key) do update set
      label = excluded.label,
      route = excluded.route,
      icon = excluded.icon,
      group_key = excluded.group_key,
      display_order = excluded.display_order,
      required_roles = excluded.required_roles,
      is_enabled = excluded.is_enabled,
      updated_at = now();
  end if;
end $$;
