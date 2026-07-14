create or replace function public.admin_get_journal_ai_status(post_id uuid)
returns table(
  status text,
  generation_status text,
  last_error text,
  published_at timestamptz,
  ai_generated_at timestamptz,
  translation_count bigint
)
language sql
security definer
set search_path = public, auth, pg_catalog, pg_temp
as $$
  select
    p.status,
    coalesce(s.generation_status, p.ai_generation_status, 'not_requested') as generation_status,
    coalesce(
      s.last_error,
      case when p.ai_generation_status = 'failed' then 'Journal AI generation failed.' end
    ) as last_error,
    p.published_at,
    p.ai_generated_at,
    (
      select count(*)
      from public.journal_translations t
      where t.journal_post_id = p.id
        and t.translation_status = 'published'
        and nullif(trim(t.title), '') is not null
        and char_length(trim(t.body)) between 1800 and 4500
    ) as translation_count
  from public.journal_posts p
  left join public.journal_ai_sources s on s.journal_post_id = p.id
  where p.id = post_id
    and public.is_admin_user();
$$;

create or replace function public.admin_prepare_journal_ai(
  post_id uuid,
  event_payload jsonb,
  raw_description text,
  source_metadata jsonb default '{}'::jsonb
)
returns table(journey_entry_id uuid, ai_source_id uuid, generation_status text)
language plpgsql
security definer
set search_path = public, auth, pg_catalog, pg_temp
as $$
declare
  saved_entry_id uuid;
  saved_source public.journal_ai_sources%rowtype;
begin
  if not public.is_admin_user() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  if not exists (select 1 from public.journal_posts where id = post_id) then
    raise exception 'Journal post not found' using errcode = 'P0002';
  end if;

  if event_payload is null or jsonb_typeof(event_payload) <> 'object' then
    raise exception 'Event payload is required' using errcode = '22023';
  end if;

  if nullif(trim(raw_description), '') is null then
    raise exception 'Raw description is required' using errcode = '22023';
  end if;

  saved_entry_id := public.admin_save_journal_event_context(post_id, event_payload);

  select * into saved_source
  from public.admin_save_journal_ai_source(
    post_id,
    raw_description,
    coalesce(source_metadata, '{}'::jsonb)
      || jsonb_build_object('prepared_at', now(), 'target_body_characters', '2500-3500')
  );

  delete from public.journal_translations
  where journal_post_id = post_id
    and (
      nullif(trim(title), '') is null
      or nullif(trim(body), '') is null
    );

  update public.journal_posts
  set status = 'draft',
      published_at = null,
      ai_generation_status = 'pending',
      ai_generated_at = null,
      updated_at = now()
  where id = post_id;

  return query
  select saved_entry_id, saved_source.journal_post_id, saved_source.generation_status;
exception
  when others then
    update public.journal_posts
    set ai_generation_status = 'failed',
        updated_at = now()
    where id = post_id;
    raise;
end;
$$;

grant execute on function public.admin_prepare_journal_ai(uuid, jsonb, text, jsonb) to authenticated;
grant execute on function public.admin_get_journal_ai_status(uuid) to authenticated;
