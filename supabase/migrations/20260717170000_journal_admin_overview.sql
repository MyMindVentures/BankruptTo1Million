create or replace function public.admin_get_journal_overview(
  p_status text default null,
  p_query text default null,
  p_limit integer default 200,
  p_offset integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_rows jsonb;
  v_counts jsonb;
  v_q text := '%' || lower(trim(coalesce(p_query, ''))) || '%';
begin
  if not public.has_active_admin_access() then
    raise exception 'Active administrator access is required.' using errcode = '42501';
  end if;

  with filtered as (
    select p.*
    from public.journal_posts p
    where (p_status is null or p_status = 'all' or p.status = p_status)
      and (
        coalesce(p_query, '') = ''
        or lower(concat_ws(' ', p.title, p.slug, coalesce(p.excerpt, ''))) like v_q
      )
    order by p.updated_at desc
    limit greatest(1, least(coalesce(p_limit, 200), 500))
    offset greatest(coalesce(p_offset, 0), 0)
  )
  select coalesce(jsonb_agg(to_jsonb(filtered)), '[]'::jsonb) into v_rows from filtered;

  select jsonb_build_object(
    'all', count(*),
    'draft', count(*) filter (where status = 'draft'),
    'scheduled', count(*) filter (where status = 'scheduled'),
    'published', count(*) filter (where status = 'published'),
    'archived', count(*) filter (where status = 'archived')
  )
  into v_counts
  from public.journal_posts;

  return jsonb_build_object('rows', coalesce(v_rows, '[]'::jsonb), 'counts', coalesce(v_counts, '{}'::jsonb));
end;
$$;

revoke all on function public.admin_get_journal_overview(text, text, integer, integer) from public;
grant execute on function public.admin_get_journal_overview(text, text, integer, integer) to authenticated;
