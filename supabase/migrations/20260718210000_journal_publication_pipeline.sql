begin;

-- Journal staged publication pipeline: runs, steps, draft saves, and finalize.

create table if not exists public.journal_post_publication_runs (
  id uuid primary key default gen_random_uuid(),
  journal_post_id uuid not null references public.journal_posts(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'completed', 'failed')),
  current_step_key text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  last_error text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists journal_post_publication_runs_post_id_idx
  on public.journal_post_publication_runs (journal_post_id, created_at desc);

create table if not exists public.journal_post_publication_steps (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.journal_post_publication_runs(id) on delete cascade,
  step_key text not null,
  label_key text not null,
  display_order integer not null,
  status text not null default 'pending'
    check (status in ('pending', 'running', 'completed', 'failed', 'skipped')),
  started_at timestamptz,
  completed_at timestamptz,
  last_error text,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (run_id, step_key)
);

create index if not exists journal_post_publication_steps_run_order_idx
  on public.journal_post_publication_steps (run_id, display_order);

alter table public.journal_post_publication_runs enable row level security;
alter table public.journal_post_publication_steps enable row level security;

create or replace function public.journal_publication_assert_caller()
returns void
language plpgsql
security definer
set search_path to 'public', 'auth', 'pg_catalog', 'pg_temp'
as $function$
begin
  if coalesce(auth.jwt() ->> 'role', '') = 'service_role' then
    return;
  end if;
  if not public.is_admin_user() then
    raise exception 'Admin access required';
  end if;
end;
$function$;

revoke all on function public.journal_publication_assert_caller() from public;
grant execute on function public.journal_publication_assert_caller() to authenticated, service_role;

create or replace function public.journal_publication_translate_batch_count(p_batch_size integer default 3)
returns integer
language plpgsql
stable
security definer
set search_path to 'public', 'pg_catalog', 'pg_temp'
as $function$
declare
  v_non_en_count integer;
  v_batch_size integer := greatest(1, coalesce(p_batch_size, 3));
begin
  select count(*)::integer
    into v_non_en_count
  from public.site_languages
  where is_active = true
    and code <> 'en';

  if v_non_en_count <= 0 then
    return 0;
  end if;

  return ceil(v_non_en_count::numeric / v_batch_size::numeric)::integer;
end;
$function$;

create or replace function public.journal_publication_non_english_languages()
returns text[]
language sql
stable
security definer
set search_path to 'public', 'pg_catalog', 'pg_temp'
as $function$
  select coalesce(array_agg(code order by display_order, code), '{}')
  from public.site_languages
  where is_active = true
    and code <> 'en';
$function$;

create or replace function public.admin_start_journal_publication(
  p_post_id uuid,
  p_has_location boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'auth', 'pg_catalog', 'pg_temp'
as $function$
declare
  v_run_id uuid;
  v_existing record;
  v_order integer := 0;
  v_batch_size integer := 3;
  v_batch_count integer;
  v_non_en text[];
  v_batch_index integer;
  v_start integer;
  v_end integer;
  v_batch_langs text[];
  v_now timestamptz := now();
begin
  perform public.journal_publication_assert_caller();

  if not exists (select 1 from public.journal_posts where id = p_post_id) then
    raise exception 'Journal post not found: %', p_post_id;
  end if;

  select r.id, r.status
    into v_existing
  from public.journal_post_publication_runs r
  where r.journal_post_id = p_post_id
    and r.status in ('pending', 'processing')
  order by r.created_at desc
  limit 1;

  if found then
    return jsonb_build_object('ok', true, 'run_id', v_existing.id, 'resumed', true);
  end if;

  update public.journal_post_publication_runs
  set status = 'failed',
      last_error = coalesce(last_error, 'Superseded by a new publication run'),
      completed_at = v_now,
      updated_at = v_now
  where journal_post_id = p_post_id
    and status in ('pending', 'processing');

  insert into public.journal_post_publication_runs (
    journal_post_id, status, current_step_key, started_at, metadata, updated_at
  ) values (
    p_post_id, 'processing', 'upload', v_now,
    jsonb_build_object('has_location', p_has_location, 'batch_size', v_batch_size),
    v_now
  )
  returning id into v_run_id;

  update public.journal_posts
  set status = 'draft',
      ai_generation_status = 'processing',
      updated_at = v_now
  where id = p_post_id;

  update public.journal_ai_sources
  set generation_status = 'processing',
      last_error = null,
      updated_at = v_now
  where journal_post_id = p_post_id;

  v_order := v_order + 1;
  insert into public.journal_post_publication_steps (
    run_id, step_key, label_key, display_order, status, completed_at, updated_at
  ) values (
    v_run_id, 'upload', 'journal.admin.pipeline.upload', v_order, 'completed', v_now, v_now
  );

  v_order := v_order + 1;
  insert into public.journal_post_publication_steps (
    run_id, step_key, label_key, display_order, status, updated_at
  ) values (
    v_run_id, 'story_english', 'journal.admin.pipeline.story_english', v_order, 'pending', v_now
  );

  if p_has_location then
    v_order := v_order + 1;
    insert into public.journal_post_publication_steps (
      run_id, step_key, label_key, display_order, status, updated_at
    ) values (
      v_run_id, 'place_english', 'journal.admin.pipeline.place_english', v_order, 'pending', v_now
    );

    v_order := v_order + 1;
    insert into public.journal_post_publication_steps (
      run_id, step_key, label_key, display_order, status, updated_at
    ) values (
      v_run_id, 'area_english', 'journal.admin.pipeline.area_english', v_order, 'pending', v_now
    );

    v_order := v_order + 1;
    insert into public.journal_post_publication_steps (
      run_id, step_key, label_key, display_order, status, updated_at
    ) values (
      v_run_id, 'thank_you_english', 'journal.admin.pipeline.thank_you_english', v_order, 'pending', v_now
    );
  else
    v_order := v_order + 1;
    insert into public.journal_post_publication_steps (
      run_id, step_key, label_key, display_order, status, updated_at
    ) values
      (v_run_id, 'place_english', 'journal.admin.pipeline.place_english', v_order, 'skipped', v_now),
      (v_run_id, 'area_english', 'journal.admin.pipeline.area_english', v_order + 1, 'skipped', v_now),
      (v_run_id, 'thank_you_english', 'journal.admin.pipeline.thank_you_english', v_order + 2, 'skipped', v_now);
    v_order := v_order + 3;
  end if;

  v_non_en := public.journal_publication_non_english_languages();
  v_batch_count := public.journal_publication_translate_batch_count(v_batch_size);

  for v_batch_index in 1..v_batch_count loop
    v_start := (v_batch_index - 1) * v_batch_size + 1;
    v_end := least(v_batch_index * v_batch_size, coalesce(array_length(v_non_en, 1), 0));
    v_batch_langs := v_non_en[v_start:v_end];
    v_order := v_order + 1;

    insert into public.journal_post_publication_steps (
      run_id, step_key, label_key, display_order, status, detail, updated_at
    ) values (
      v_run_id,
      'translate_batch_' || v_batch_index,
      'journal.admin.pipeline.translate_batch',
      v_order,
      'pending',
      jsonb_build_object(
        'batch_index', v_batch_index,
        'batch_count', v_batch_count,
        'languages', to_jsonb(v_batch_langs)
      ),
      v_now
    );
  end loop;

  v_order := v_order + 1;
  insert into public.journal_post_publication_steps (
    run_id, step_key, label_key, display_order, status, updated_at
  ) values (
    v_run_id, 'finalize', 'journal.admin.pipeline.finalize', v_order, 'pending', v_now
  );

  return jsonb_build_object(
    'ok', true,
    'run_id', v_run_id,
    'resumed', false,
    'translate_batch_count', v_batch_count
  );
end;
$function$;

create or replace function public.admin_update_publication_step(
  p_post_id uuid,
  p_step_key text,
  p_status text,
  p_detail jsonb default null,
  p_error text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'auth', 'pg_catalog', 'pg_temp'
as $function$
declare
  v_run record;
  v_step record;
  v_now timestamptz := now();
begin
  perform public.journal_publication_assert_caller();

  if p_status not in ('pending', 'running', 'completed', 'failed', 'skipped') then
    raise exception 'Invalid publication step status: %', p_status;
  end if;

  select r.id, r.status
    into v_run
  from public.journal_post_publication_runs r
  where r.journal_post_id = p_post_id
  order by r.created_at desc
  limit 1;

  if not found then
    raise exception 'No publication run found for post %', p_post_id;
  end if;

  select s.id, s.status, s.detail
    into v_step
  from public.journal_post_publication_steps s
  where s.run_id = v_run.id
    and s.step_key = p_step_key;

  if not found then
    raise exception 'Publication step % not found for post %', p_step_key, p_post_id;
  end if;

  update public.journal_post_publication_steps
  set status = p_status,
      started_at = case when p_status = 'running' and started_at is null then v_now else started_at end,
      completed_at = case when p_status in ('completed', 'failed', 'skipped') then v_now else completed_at end,
      last_error = case when p_status = 'failed' then left(coalesce(p_error, 'Publication step failed'), 4000) else null end,
      detail = case when p_detail is null then detail else detail || p_detail end,
      updated_at = v_now
  where id = v_step.id;

  update public.journal_post_publication_runs
  set current_step_key = p_step_key,
      status = case
        when p_status = 'failed' then 'failed'
        when p_status = 'running' then 'processing'
        else status
      end,
      last_error = case when p_status = 'failed' then left(coalesce(p_error, 'Publication step failed'), 4000) else last_error end,
      updated_at = v_now
  where id = v_run.id;

  if p_status = 'failed' then
    update public.journal_posts
    set ai_generation_status = 'failed',
        updated_at = v_now
    where id = p_post_id;

    update public.journal_ai_sources
    set generation_status = 'failed',
        last_error = left(coalesce(p_error, 'Publication step failed'), 4000),
        updated_at = v_now
    where journal_post_id = p_post_id;
  end if;

  return jsonb_build_object('ok', true, 'run_id', v_run.id, 'step_key', p_step_key, 'status', p_status);
end;
$function$;

create or replace function public.get_publication_translate_batch(p_post_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'auth', 'pg_catalog', 'pg_temp'
as $function$
declare
  v_step record;
begin
  perform public.journal_publication_assert_caller();

  select s.step_key, s.status, s.detail
    into v_step
  from public.journal_post_publication_runs r
  join public.journal_post_publication_steps s on s.run_id = r.id
  where r.journal_post_id = p_post_id
    and r.status = 'processing'
    and s.step_key like 'translate_batch_%'
    and s.status in ('pending', 'running')
  order by s.display_order
  limit 1;

  if not found then
    return jsonb_build_object('ok', true, 'complete', true);
  end if;

  return jsonb_build_object(
    'ok', true,
    'complete', false,
    'step_key', v_step.step_key,
    'status', v_step.status,
    'batch_index', v_step.detail -> 'batch_index',
    'batch_count', v_step.detail -> 'batch_count',
    'languages', v_step.detail -> 'languages'
  );
end;
$function$;

create or replace function public.save_journal_ai_english_result(
  p_post_id uuid,
  p_translation jsonb,
  p_model text default null,
  p_config_version integer default null,
  p_prompt_version integer default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_catalog', 'pg_temp'
as $function$
declare
  body_text text;
  min_chars integer;
  max_chars integer;
  now_ts timestamptz := now();
begin
  if jsonb_typeof(p_translation) <> 'object' then
    raise exception 'English translation must be an object';
  end if;

  body_text := trim(coalesce(p_translation ->> 'body', ''));
  if nullif(trim(p_translation ->> 'title'), '') is null or nullif(body_text, '') is null then
    raise exception 'Missing valid English translation';
  end if;

  select bounds.min_chars, bounds.max_chars
    into min_chars, max_chars
  from public.journal_ai_body_length_bounds('en') as bounds;

  if char_length(body_text) < min_chars or char_length(body_text) > max_chars then
    raise exception 'Invalid en body length: %; expected %-%', char_length(body_text), min_chars, max_chars;
  end if;

  if body_text !~ '(^|\n)### ' then
    raise exception 'Missing Markdown headings for en';
  end if;

  insert into public.journal_translations(
    journal_post_id, language_code, title, subtitle, excerpt, body, seo_title, seo_description,
    translation_status, translation_source, translated_at, published_at, updated_at
  ) values (
    p_post_id, 'en', p_translation->>'title', nullif(p_translation->>'subtitle', ''),
    nullif(p_translation->>'excerpt', ''), body_text,
    nullif(p_translation->>'seo_title', ''), nullif(p_translation->>'seo_description', ''),
    'draft', 'ai', now_ts, null, now_ts
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

  update public.journal_posts set
    title = p_translation->>'title',
    subtitle = nullif(p_translation->>'subtitle', ''),
    excerpt = nullif(p_translation->>'excerpt', ''),
    body = body_text,
    seo_title = nullif(p_translation->>'seo_title', ''),
    seo_description = nullif(p_translation->>'seo_description', ''),
    status = 'draft',
    original_language = 'en',
    content_format = 'markdown',
    ai_generation_status = 'processing',
    ai_model = coalesce(p_model, ai_model),
    updated_at = now_ts
  where id = p_post_id;

  update public.journal_ai_sources set
    generation_status = 'processing',
    model = coalesce(p_model, model),
    last_error = null,
    metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
      'ai_config_version', p_config_version,
      'prompt_version', p_prompt_version,
      'english_saved_at', now_ts
    ),
    updated_at = now_ts
  where journal_post_id = p_post_id;

  return jsonb_build_object('ok', true, 'post_id', p_post_id, 'language', 'en');
end;
$function$;

create or replace function public.save_journal_ai_draft_result(
  p_post_id uuid,
  p_translations jsonb,
  p_model text,
  p_config_version integer,
  p_prompt_version integer
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
  now_ts timestamptz := now();
  english jsonb;
  count_rows integer;
  active_languages text[];
  expected_count integer;
begin
  if jsonb_typeof(p_translations) <> 'object' then
    raise exception 'Translations must be an object';
  end if;

  select coalesce(array_agg(code order by display_order), '{}')
    into active_languages
  from public.site_languages
  where is_active = true;

  expected_count := coalesce(array_length(active_languages, 1), 0);
  if expected_count = 0 then
    raise exception 'No active languages configured';
  end if;

  foreach lang in array active_languages loop
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

  select count(*)
    into count_rows
  from public.journal_translations t
  where t.journal_post_id = p_post_id
    and t.translation_status = 'draft'
    and t.language_code = any(active_languages)
    and nullif(trim(t.title), '') is not null
    and nullif(trim(t.body), '') is not null;

  english := p_translations -> 'en';
  if english is null then
    raise exception 'Missing English translation';
  end if;

  update public.journal_posts set
    title = english->>'title',
    subtitle = nullif(english->>'subtitle', ''),
    excerpt = nullif(english->>'excerpt', ''),
    body = trim(english->>'body'),
    seo_title = nullif(english->>'seo_title', ''),
    seo_description = nullif(english->>'seo_description', ''),
    status = 'draft',
    original_language = 'en',
    content_format = 'markdown',
    ai_generation_status = 'processing',
    ai_model = p_model,
    updated_at = now_ts
  where id = p_post_id;

  update public.journal_ai_sources set
    generation_status = 'processing',
    model = p_model,
    last_error = null,
    metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
      'ai_config_version', p_config_version,
      'prompt_version', p_prompt_version
    ),
    updated_at = now_ts
  where journal_post_id = p_post_id;

  return jsonb_build_object(
    'ok', true,
    'post_id', p_post_id,
    'translation_count', count_rows,
    'expected_translation_count', expected_count
  );
end;
$function$;

create or replace function public.finalize_journal_publication(p_post_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'auth', 'pg_catalog', 'pg_temp'
as $function$
declare
  v_run record;
  v_pending_steps integer;
  v_now timestamptz := now();
  v_active_languages text[];
  v_expected_count integer;
  v_story_count integer;
  v_place_context jsonb;
  v_has_location boolean;
  v_place_saved jsonb;
begin
  perform public.journal_publication_assert_caller();

  select r.id, r.status, coalesce((r.metadata ->> 'has_location')::boolean, true)
    into v_run
  from public.journal_post_publication_runs r
  where r.journal_post_id = p_post_id
  order by r.created_at desc
  limit 1;

  if not found then
    raise exception 'No publication run found for post %', p_post_id;
  end if;

  if v_run.status = 'completed' then
    return jsonb_build_object('ok', true, 'post_id', p_post_id, 'already_completed', true);
  end if;

  select count(*)
    into v_pending_steps
  from public.journal_post_publication_steps s
  where s.run_id = v_run.id
    and s.step_key <> 'finalize'
    and s.status not in ('completed', 'skipped');

  if v_pending_steps > 0 then
    raise exception 'Publication pipeline incomplete: % steps still pending', v_pending_steps;
  end if;

  perform public.admin_update_publication_step(p_post_id, 'finalize', 'running');

  select coalesce(array_agg(code order by display_order), '{}')
    into v_active_languages
  from public.site_languages
  where is_active = true;

  v_expected_count := coalesce(array_length(v_active_languages, 1), 0);

  select count(*)
    into v_story_count
  from public.journal_translations t
  where t.journal_post_id = p_post_id
    and t.language_code = any(v_active_languages)
    and t.translation_status in ('draft', 'published')
    and nullif(trim(t.title), '') is not null
    and nullif(trim(t.body), '') is not null;

  if v_story_count <> v_expected_count then
    raise exception 'Expected % story translations before finalize, found %', v_expected_count, v_story_count;
  end if;

  update public.journal_translations
  set translation_status = 'published',
      published_at = v_now,
      reviewed_at = coalesce(reviewed_at, v_now),
      updated_at = v_now
  where journal_post_id = p_post_id
    and language_code = any(v_active_languages)
    and translation_status = 'draft';

  update public.journal_posts
  set status = 'published',
      published_at = v_now,
      ai_generation_status = 'completed',
      ai_generated_at = v_now,
      updated_at = v_now
  where id = p_post_id;

  update public.journal_ai_sources
  set generation_status = 'completed',
      generated_at = v_now,
      last_error = null,
      updated_at = v_now
  where journal_post_id = p_post_id;

  v_has_location := coalesce((v_run.metadata ->> 'has_location')::boolean, true);

  if v_has_location then
    select draft_payload
      into v_place_context
    from public.journal_post_place_context
    where journal_post_id = p_post_id;

    if v_place_context is not null then
      v_place_saved := public.save_journal_place_context_result(
        p_post_id,
        v_place_context,
        (select ai_model from public.journal_post_place_context where journal_post_id = p_post_id)
      );
    elsif exists (
      select 1
      from public.journal_post_place_context
      where journal_post_id = p_post_id
        and generation_status = 'skipped'
    ) then
      null;
    else
      raise exception 'Place context draft payload missing at finalize';
    end if;
  end if;

  update public.journal_post_publication_runs
  set status = 'completed',
      current_step_key = 'finalize',
      completed_at = v_now,
      last_error = null,
      updated_at = v_now
  where id = v_run.id;

  perform public.admin_update_publication_step(p_post_id, 'finalize', 'completed');

  return jsonb_build_object(
    'ok', true,
    'post_id', p_post_id,
    'translation_count', v_story_count,
    'expected_translation_count', v_expected_count,
    'published_at', v_now
  );
end;
$function$;

create or replace function public.admin_get_journal_publication_status(p_post_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'auth', 'pg_catalog', 'pg_temp'
as $function$
declare
  v_run record;
  v_steps jsonb := '[]'::jsonb;
  v_expected bigint;
  v_story_count bigint;
  v_place_count bigint;
  v_place_status text;
  v_place_skipped boolean := false;
begin
  perform public.journal_publication_assert_caller();

  select count(*)::bigint
    into v_expected
  from public.site_languages
  where is_active = true;

  select count(*)::bigint
    into v_story_count
  from public.journal_translations t
  where t.journal_post_id = p_post_id
    and nullif(trim(t.title), '') is not null
    and nullif(trim(t.body), '') is not null
    and (
      t.translation_status = 'published'
      or (
        exists (
          select 1
          from public.journal_post_publication_runs r
          where r.journal_post_id = p_post_id
            and r.status in ('pending', 'processing')
        )
        and t.translation_status = 'draft'
      )
    );

  select coalesce(pc.generation_status, 'not_requested'), pc.id is not null and pc.generation_status = 'skipped'
    into v_place_status, v_place_skipped
  from public.journal_posts p
  left join public.journal_post_place_context pc on pc.journal_post_id = p.id
  where p.id = p_post_id;

  if v_place_skipped then
    v_place_count := 0;
  else
    select greatest(
      (
        select count(*)::bigint
        from public.journal_post_place_context pc
        join public.journal_post_place_context_translations t on t.place_context_id = pc.id
        where pc.journal_post_id = p_post_id
          and t.translation_status in ('published', 'draft')
      ),
      (
        select count(*)::bigint
        from public.journal_post_place_context pc
        cross join lateral jsonb_object_keys(coalesce(pc.draft_payload -> 'translations', '{}'::jsonb)) as lang(code)
        where pc.journal_post_id = p_post_id
      )
    )
      into v_place_count;
  end if;

  select r.id, r.status, r.current_step_key, r.started_at, r.completed_at, r.last_error, r.metadata
    into v_run
  from public.journal_post_publication_runs r
  where r.journal_post_id = p_post_id
  order by r.created_at desc
  limit 1;

  if found then
    select coalesce(jsonb_agg(
      jsonb_build_object(
        'step_key', s.step_key,
        'label_key', s.label_key,
        'display_order', s.display_order,
        'status', s.status,
        'started_at', s.started_at,
        'completed_at', s.completed_at,
        'last_error', s.last_error,
        'detail', s.detail
      )
      order by s.display_order
    ), '[]'::jsonb)
      into v_steps
    from public.journal_post_publication_steps s
    where s.run_id = v_run.id;
  end if;

  return jsonb_build_object(
    'run', case when v_run.id is null then null else jsonb_build_object(
      'id', v_run.id,
      'status', v_run.status,
      'current_step_key', v_run.current_step_key,
      'started_at', v_run.started_at,
      'completed_at', v_run.completed_at,
      'last_error', v_run.last_error,
      'metadata', v_run.metadata
    ) end,
    'steps', v_steps,
    'story', jsonb_build_object(
      'translation_count', v_story_count,
      'expected_translation_count', v_expected
    ),
    'place_context', jsonb_build_object(
      'generation_status', coalesce(v_place_status, 'not_requested'),
      'translation_count', v_place_count,
      'expected_translation_count', case when v_place_skipped then 0 else v_expected end,
      'skipped', v_place_skipped
    )
  );
end;
$function$;

revoke all on function public.admin_start_journal_publication(uuid, boolean) from public;
revoke all on function public.admin_update_publication_step(uuid, text, text, jsonb, text) from public;
revoke all on function public.get_publication_translate_batch(uuid) from public;
revoke all on function public.save_journal_ai_english_result(uuid, jsonb, text, integer, integer) from public;
revoke all on function public.save_journal_ai_draft_result(uuid, jsonb, text, integer, integer) from public;
revoke all on function public.finalize_journal_publication(uuid) from public;
revoke all on function public.admin_get_journal_publication_status(uuid) from public;

grant execute on function public.admin_start_journal_publication(uuid, boolean) to authenticated, service_role;
grant execute on function public.admin_update_publication_step(uuid, text, text, jsonb, text) to authenticated, service_role;
grant execute on function public.get_publication_translate_batch(uuid) to authenticated, service_role;
grant execute on function public.save_journal_ai_english_result(uuid, jsonb, text, integer, integer) to service_role;
grant execute on function public.save_journal_ai_draft_result(uuid, jsonb, text, integer, integer) to service_role;
grant execute on function public.finalize_journal_publication(uuid) to authenticated, service_role;
grant execute on function public.admin_get_journal_publication_status(uuid) to authenticated, service_role;

update public.ai_edge_function_configs
set
  config_version = config_version + 1,
  generation_settings = coalesce(generation_settings, '{}'::jsonb)
    || jsonb_build_object('batch_size', 3)
    || jsonb_build_object('batches_per_invocation', 1),
  updated_at = now()
where edge_function_slug in ('generate-journal-ai-post', 'generate-journal-place-context');

commit;
