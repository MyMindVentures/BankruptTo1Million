begin;

-- Worker settings (mirrors private.translation_settings)
create table if not exists private.journal_ai_settings (
  id boolean primary key default true check (id = true),
  webhook_secret text not null default encode(gen_random_bytes(32), 'hex'),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into private.journal_ai_settings (id)
values (true)
on conflict (id) do nothing;

create or replace function public.get_journal_ai_worker_secret()
returns text
language sql
security definer
set search_path to 'private', 'public', 'pg_catalog', 'pg_temp'
as $function$
  select webhook_secret from private.journal_ai_settings where id = true;
$function$;

revoke all on function public.get_journal_ai_worker_secret() from public;
grant execute on function public.get_journal_ai_worker_secret() to service_role;

create or replace function public.journal_ai_completed_translation_count(p_post_id uuid)
returns bigint
language sql
stable
security definer
set search_path to 'public', 'pg_catalog', 'pg_temp'
as $function$
  select count(*)::bigint
  from public.journal_translations t
  where t.journal_post_id = p_post_id
    and nullif(trim(t.title), '') is not null
    and nullif(trim(t.body), '') is not null
    and char_length(trim(t.body)) between
      (select bounds.min_chars from public.journal_ai_body_length_bounds(t.language_code) as bounds)
      and
      (select bounds.max_chars from public.journal_ai_body_length_bounds(t.language_code) as bounds);
$function$;

create or replace function public.list_journal_ai_posts_needing_batch(p_limit integer default 3)
returns table(journal_post_id uuid, translation_count bigint, expected_count bigint)
language sql
security definer
set search_path to 'public', 'pg_catalog', 'pg_temp'
as $function$
  with expected as (
    select count(*)::bigint as total
    from public.site_languages
    where is_active = true
  )
  select
    p.id as journal_post_id,
    public.journal_ai_completed_translation_count(p.id) as translation_count,
    expected.total as expected_count
  from public.journal_posts p
  cross join expected
  left join public.journal_ai_sources s on s.journal_post_id = p.id
  where coalesce(s.generation_status, p.ai_generation_status) = 'processing'
    and public.journal_ai_completed_translation_count(p.id) < expected.total
  order by coalesce(s.updated_at, p.updated_at) asc
  limit greatest(1, least(coalesce(p_limit, 3), 10));
$function$;

revoke all on function public.list_journal_ai_posts_needing_batch(integer) from public;
grant execute on function public.list_journal_ai_posts_needing_batch(integer) to service_role;

create or replace function public.recover_stale_journal_ai_generation(p_stale_minutes integer default 5)
returns integer
language plpgsql
security definer
set search_path to 'public', 'pg_catalog', 'pg_temp'
as $function$
declare
  v_stale interval := make_interval(mins => greatest(3, least(coalesce(p_stale_minutes, 5), 60)));
  v_count integer := 0;
begin
  update public.journal_ai_sources s
  set
    last_error = null,
    updated_at = now()
  from public.journal_posts p
  where p.id = s.journal_post_id
    and coalesce(s.generation_status, p.ai_generation_status) = 'processing'
    and s.updated_at < now() - v_stale
    and public.journal_ai_completed_translation_count(p.id) <
      (select count(*) from public.site_languages where is_active = true);

  get diagnostics v_count = row_count;

  update public.journal_posts p
  set updated_at = now()
  from public.journal_ai_sources s
  where s.journal_post_id = p.id
    and p.ai_generation_status = 'processing'
    and s.updated_at >= now() - interval '5 seconds';

  return v_count;
end;
$function$;

revoke all on function public.recover_stale_journal_ai_generation(integer) from public;
grant execute on function public.recover_stale_journal_ai_generation(integer) to service_role;

-- Place context draft storage for batched generation
alter table public.journal_post_place_context
  add column if not exists draft_payload jsonb,
  add column if not exists last_error text;

create or replace function public.upsert_journal_ai_translation_batch(
  p_post_id uuid,
  p_translations jsonb,
  p_batch_index integer,
  p_total_batches integer
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_catalog', 'pg_temp'
as $function$
declare
  lang text;
  item jsonb;
  body_text text;
  min_chars integer;
  max_chars integer;
  batch_langs text[];
  expected_count integer;
  count_rows bigint;
  now_ts timestamptz := now();
begin
  if jsonb_typeof(p_translations) <> 'object' then
    raise exception 'Translations must be an object';
  end if;

  if p_batch_index < 1 or p_total_batches < 1 or p_batch_index > p_total_batches then
    raise exception 'Invalid batch index % of %', p_batch_index, p_total_batches;
  end if;

  select coalesce(array_agg(key order by key), '{}')
    into batch_langs
  from jsonb_object_keys(p_translations) as key;

  if coalesce(array_length(batch_langs, 1), 0) = 0 then
    raise exception 'Batch translations object is empty';
  end if;

  foreach lang in array batch_langs loop
    item := p_translations -> lang;
    body_text := trim(coalesce(item ->> 'body', ''));

    if item is null or nullif(trim(item ->> 'title'), '') is null or nullif(body_text, '') is null then
      raise exception 'Missing valid translation for %', lang;
    end if;

    select bounds.min_chars, bounds.max_chars
      into min_chars, max_chars
    from public.journal_ai_body_length_bounds(lang) as bounds;

    if char_length(body_text) < min_chars or char_length(body_text) > max_chars then
      raise exception 'Invalid % body length: %; expected %-%', lang, char_length(body_text), min_chars, max_chars;
    end if;

    if body_text !~ '(^|\n)### ' then
      raise exception 'Missing Markdown headings for %', lang;
    end if;

    insert into public.journal_translations(
      journal_post_id, language_code, title, subtitle, excerpt, body, seo_title, seo_description,
      translation_status, translation_source, translated_at, published_at, updated_at
    ) values (
      p_post_id, lang, item->>'title', nullif(item->>'subtitle', ''), nullif(item->>'excerpt', ''), body_text,
      nullif(item->>'seo_title', ''), nullif(item->>'seo_description', ''), 'draft', 'ai', now_ts, null, now_ts
    )
    on conflict (journal_post_id, language_code) do update set
      title = excluded.title,
      subtitle = excluded.subtitle,
      excerpt = excluded.excerpt,
      body = excluded.body,
      seo_title = excluded.seo_title,
      seo_description = excluded.seo_description,
      translation_status = 'draft',
      translation_source = 'ai',
      translated_at = now_ts,
      published_at = null,
      updated_at = now_ts;
  end loop;

  update public.journal_posts set
    ai_generation_status = 'processing',
    updated_at = now_ts
  where id = p_post_id;

  update public.journal_ai_sources set
    generation_status = 'processing',
    last_error = null,
    metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
      'last_batch_index', p_batch_index,
      'total_batches', p_total_batches,
      'last_batch_languages', to_jsonb(batch_langs)
    ),
    updated_at = now_ts
  where journal_post_id = p_post_id;

  select count(*) into expected_count
  from public.site_languages
  where is_active = true;

  count_rows := public.journal_ai_completed_translation_count(p_post_id);

  return jsonb_build_object(
    'ok', true,
    'post_id', p_post_id,
    'batch_index', p_batch_index,
    'total_batches', p_total_batches,
    'batch_languages', to_jsonb(batch_langs),
    'translation_count', count_rows,
    'expected_translation_count', expected_count,
    'has_more', count_rows < expected_count
  );
end;
$function$;

update public.ai_edge_function_configs
set
  config_version = config_version + 1,
  max_output_tokens = 12288,
  timeout_ms = 360000,
  generation_settings = coalesce(generation_settings, '{}'::jsonb)
    || jsonb_build_object('batch_size', 3)
    || jsonb_build_object('batches_per_invocation', 1),
  updated_at = now()
where edge_function_slug = 'generate-journal-ai-post';

update public.ai_edge_function_configs
set
  generation_settings = coalesce(generation_settings, '{}'::jsonb)
    || jsonb_build_object('batch_size', 3)
    || jsonb_build_object('batches_per_invocation', 1)
    || jsonb_build_object('place_history_by_language', jsonb_build_object(
      'zh', jsonb_build_object('min', 80, 'max', 500),
      'hi', jsonb_build_object('min', 100, 'max', 650),
      'ar', jsonb_build_object('min', 120, 'max', 700)
    ))
    || jsonb_build_object('area_history_by_language', jsonb_build_object(
      'zh', jsonb_build_object('min', 100, 'max', 700),
      'hi', jsonb_build_object('min', 120, 'max', 900),
      'ar', jsonb_build_object('min', 150, 'max', 1000)
    )),
  updated_at = now()
where edge_function_slug = 'generate-journal-place-context';

-- pg_cron drain worker (idempotent)
do $cron$
begin
  if exists (select 1 from cron.job where jobname = 'drain-journal-ai-batches-every-2-minutes') then
    perform cron.unschedule((select jobid from cron.job where jobname = 'drain-journal-ai-batches-every-2-minutes' limit 1));
  end if;

  perform cron.schedule(
    'drain-journal-ai-batches-every-2-minutes',
    '*/2 * * * *',
    $cmd$
    select net.http_post(
      url := 'https://zlwwncmbxohnezotomcx.supabase.co/functions/v1/drain-journal-ai-batches',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-journal-ai-worker-secret', public.get_journal_ai_worker_secret()
      ),
      body := jsonb_build_object('limit', 3),
      timeout_milliseconds := 150000
    );
    $cmd$
  );
end;
$cron$;

commit;
