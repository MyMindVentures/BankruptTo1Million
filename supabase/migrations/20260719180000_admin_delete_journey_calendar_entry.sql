-- Soft-delete journey calendar entries from Mission Control.
-- Sets status=cancelled and is_public=false so the stop leaves the public calendar
-- while preserving host offers and history.

create or replace function public.admin_delete_journey_calendar_entry(p_entry_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'auth', 'pg_catalog', 'pg_temp'
as $$
declare
  v_row public.journey_calendar_entries%rowtype;
begin
  if not public.has_active_admin_access() then
    raise exception 'Active administrator access is required.' using errcode = '42501';
  end if;

  update public.journey_calendar_entries e set
    status = 'cancelled',
    is_public = false,
    host_request_status = case
      when e.host_request_status in ('open', 'offers_received') then 'closed'
      else e.host_request_status
    end,
    updated_by = auth.uid(),
    updated_at = now()
  where e.id = p_entry_id
  returning * into v_row;

  if v_row.id is null then
    raise exception 'Calendar entry not found.' using errcode = 'P0002';
  end if;

  return to_jsonb(v_row);
end;
$$;

revoke all on function public.admin_delete_journey_calendar_entry(uuid) from public;
grant execute on function public.admin_delete_journey_calendar_entry(uuid) to authenticated;
