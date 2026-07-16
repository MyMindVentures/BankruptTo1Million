-- Sync founder support admin inbox RPC into repo (idempotent with production).

create or replace function public.admin_get_founder_support_inbox()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_access public.admin_allowlist%rowtype;
  v_messages jsonb;
  v_counts jsonb;
begin
  select * into v_access
  from public.admin_allowlist
  where lower(email) = lower(coalesce(auth.jwt()->>'email', ''))
    and is_active = true
  limit 1;

  if v_access.email is null or v_access.role not in ('admin', 'editor') then
    raise exception 'Active admin or editor access required';
  end if;

  select coalesce(jsonb_agg(to_jsonb(m) order by m.created_at desc), '[]'::jsonb)
  into v_messages
  from public.founder_support_messages m;

  with normalized as (
    select lower(trim(coalesce(status, ''))) as normalized_status
    from public.founder_support_messages
  )
  select jsonb_build_object(
    'pending', coalesce(sum((normalized_status = 'pending')::int), 0)::int,
    'approved', coalesce(sum((normalized_status = 'approved')::int), 0)::int,
    'rejected', coalesce(sum((normalized_status = 'rejected')::int), 0)::int,
    'spam', coalesce(sum((normalized_status = 'spam')::int), 0)::int,
    'total', count(*)::int
  )
  into v_counts
  from normalized;

  return jsonb_build_object('messages', v_messages, 'counts', v_counts);
end;
$function$;

revoke all on function public.admin_get_founder_support_inbox() from public;
grant execute on function public.admin_get_founder_support_inbox() to authenticated;

comment on function public.admin_get_founder_support_inbox() is
  'Admin-only inbox payload for founder support moderation. Prefer this RPC over direct table reads.';
