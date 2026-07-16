-- Allow public i18n verification tooling to read the component registry via RPC (anon-safe).

begin;

create or replace function public.get_public_ui_component_registry()
returns table (
  component_key text,
  source_path text
)
language sql
stable
security definer
set search_path = public
as $$
  select c.component_key, c.source_path
  from public.website_ui_components c
  where c.is_active = true
    and c.is_public = true
  order by c.source_path;
$$;

revoke all on function public.get_public_ui_component_registry() from public;
grant execute on function public.get_public_ui_component_registry() to anon, authenticated;

commit;
