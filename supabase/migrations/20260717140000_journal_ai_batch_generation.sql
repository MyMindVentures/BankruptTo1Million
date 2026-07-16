begin;

create or replace function public.journal_ai_body_length_bounds(p_language_code text)
returns table(min_chars integer, max_chars integer)
language sql
immutable
set search_path to 'public', 'pg_catalog', 'pg_temp'
as $function$
  select
    case p_language_code
      when 'zh' then 700
      when 'ja' then 750
      when 'ko' then 900
      when 'ar' then 1200
      when 'hi' then 1300
      when 'tr' then 1700
      else 1800
    end as min_chars,
    case p_language_code
      when 'zh' then 2200
      when 'ja' then 2300
      when 'ko' then 2700
      when 'ar' then 3600
      when 'hi' then 3800
      when 'tr' then 4300
      else 4500
    end as max_chars;
$function$;

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
  count_rows integer;
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

  select count(*)::integer
    into expected_count
  from public.site_languages
  where is_active = true;

  select count(*)
    into count_rows
  from public.journal_translations t
  where t.journal_post_id = p_post_id
    and t.translation_status in ('draft', 'published')
    and nullif(trim(t.title), '') is not null
    and nullif(trim(t.body), '') is not null
    and char_length(trim(t.body)) between
      (select bounds.min_chars from public.journal_ai_body_length_bounds(t.language_code) as bounds)
      and
      (select bounds.max_chars from public.journal_ai_body_length_bounds(t.language_code) as bounds);

  return jsonb_build_object(
    'ok', true,
    'post_id', p_post_id,
    'batch_index', p_batch_index,
    'total_batches', p_total_batches,
    'batch_languages', to_jsonb(batch_langs),
    'translation_count', count_rows,
    'expected_translation_count', expected_count
  );
end;
$function$;

create or replace function public.admin_get_journal_ai_status(post_id uuid)
returns table(
  status text,
  generation_status text,
  last_error text,
  published_at timestamp with time zone,
  ai_generated_at timestamp with time zone,
  translation_count bigint,
  expected_translation_count bigint
)
language sql
security definer
set search_path to 'public', 'auth', 'pg_catalog', 'pg_temp'
as $function$
  with expected as (
    select count(*)::bigint as total
    from public.site_languages
    where is_active = true
  )
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
        and nullif(trim(t.title), '') is not null
        and nullif(trim(t.body), '') is not null
        and char_length(trim(t.body)) between
          (select bounds.min_chars from public.journal_ai_body_length_bounds(t.language_code) as bounds)
          and
          (select bounds.max_chars from public.journal_ai_body_length_bounds(t.language_code) as bounds)
        and (
          t.translation_status = 'published'
          or (
            coalesce(s.generation_status, p.ai_generation_status) = 'processing'
            and t.translation_status = 'draft'
          )
        )
    ) as translation_count,
    expected.total as expected_translation_count
  from public.journal_posts p
  cross join expected
  left join public.journal_ai_sources s on s.journal_post_id = p.id
  where p.id = post_id
    and public.is_admin_user();
$function$;

update public.ai_edge_function_configs
set
  config_version = config_version + 1,
  max_output_tokens = 8192,
  timeout_ms = 360000,
  generation_settings = jsonb_set(
    coalesce(generation_settings, '{}'::jsonb),
    '{batch_size}',
    '2'::jsonb,
    true
  ),
  updated_at = now()
where edge_function_slug = 'generate-journal-ai-post';

commit;
