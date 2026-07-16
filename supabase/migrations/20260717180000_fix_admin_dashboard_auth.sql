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

create or replace function public.get_admin_dashboard_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth, pg_catalog, pg_temp
as $$
begin
  if not public.has_active_admin_access() then
    raise exception 'Active administrator access is required.' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'content',jsonb_build_object(
      'journal_total',(select count(*) from public.journal_posts),
      'journal_drafts',(select count(*) from public.journal_posts where status='draft'),
      'scheduled',(select count(*) from public.journal_posts where status='scheduled'),
      'published',(select count(*) from public.journal_posts where status='published'),
      'journey_entries',(select count(*) from public.journal_journey_entries),
      'pending_comments',(select count(*) from public.journal_comments where status='pending')
    ),
    'media',jsonb_build_object(
      'assets',(select count(*) from public.media_assets),
      'processing',(select count(*) from public.media_assets where status in ('uploading','processing')),
      'failed',(select count(*) from public.media_assets where status='failed'),
      'private',(select count(*) from public.media_assets where visibility='private')
    ),
    'people',jsonb_build_object(
      'journey_people',(select count(*) from public.journey_people),
      'hosts',(select count(*) from public.journey_people where person_type='host'),
      'interviews',(select count(*) from public.journey_interviews),
      'jobs',(select count(*) from public.journey_jobs),
      'founding_heroes',(select count(*) from public.founding_heroes)
    ),
    'ventures',jsonb_build_object(
      'concepts',(select count(*) from public.proof_of_mind_concepts),
      'concept_drafts',(select count(*) from public.proof_of_mind_concepts where published_at is null),
      'leads',(select count(*) from public.leads),
      'applications',(select count(*) from public.applications)
    ),
    'delivery',jsonb_build_object(
      'github_issues',(select count(*) from public.github_issues),
      'open_issues',(select count(*) from public.github_issues where state='open'),
      'contributors',(select count(distinct profile_id) from public.github_issue_developers where profile_id is not null)
    ),
    'alerts',jsonb_build_object(
      'unread_notifications',(select count(*) from public.admin_notifications where (user_id=auth.uid() or user_id is null) and not is_read),
      'overdue_tasks',(select count(*) from public.admin_tasks where status not in ('done','cancelled') and due_at<now()),
      'failed_media',(select count(*) from public.media_assets where status='failed')
    ),
    'recent_activity',coalesce((
      select jsonb_agg(to_jsonb(x) order by x.occurred_at desc)
      from (
        select id,occurred_at,actor_user_id,actor_email,action,table_name,record_id,changed_fields
        from public.admin_audit_log
        order by occurred_at desc limit 20
      ) x
    ),'[]'::jsonb)
  );
end;
$$;
