begin;

create or replace function public.save_journal_ai_generation_result(
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
  published timestamptz := now();
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

    case lang
      when 'zh' then min_chars := 700; max_chars := 2200;
      when 'ja' then min_chars := 750; max_chars := 2300;
      when 'ko' then min_chars := 900; max_chars := 2700;
      when 'ar' then min_chars := 1200; max_chars := 3600;
      when 'hi' then min_chars := 1300; max_chars := 3800;
      when 'tr' then min_chars := 1700; max_chars := 4300;
      else min_chars := 1800; max_chars := 4500;
    end case;

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
      nullif(item->>'seo_title', ''), nullif(item->>'seo_description', ''), 'published', 'ai', published, published, published
    )
    on conflict (journal_post_id, language_code) do update set
      title = excluded.title,
      subtitle = excluded.subtitle,
      excerpt = excluded.excerpt,
      body = excluded.body,
      seo_title = excluded.seo_title,
      seo_description = excluded.seo_description,
      translation_status = 'published',
      translation_source = 'ai',
      translated_at = published,
      published_at = published,
      updated_at = published;
  end loop;

  select count(*)
    into count_rows
  from public.journal_translations
  where journal_post_id = p_post_id
    and translation_status = 'published'
    and language_code = any(active_languages);

  if count_rows <> expected_count then
    raise exception 'Expected % translations, found %', expected_count, count_rows;
  end if;

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
    status = 'published',
    published_at = published,
    original_language = 'en',
    content_format = 'markdown',
    ai_generation_status = 'completed',
    ai_generated_at = published,
    ai_model = p_model,
    updated_at = published
  where id = p_post_id;

  update public.journal_ai_sources set
    generation_status = 'completed',
    model = p_model,
    generated_at = published,
    last_error = null,
    metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
      'ai_config_version', p_config_version,
      'prompt_version', p_prompt_version
    ),
    updated_at = published
  where journal_post_id = p_post_id;

  return jsonb_build_object(
    'ok', true,
    'post_id', p_post_id,
    'translation_count', count_rows,
    'expected_translation_count', expected_count,
    'published_at', published
  );
end;
$function$;

update public.ai_edge_function_configs
set
  config_version = config_version + 1,
  generation_settings = jsonb_set(
    coalesce(generation_settings, '{}'::jsonb),
    '{languages}',
    coalesce(
      (
        select jsonb_agg(code order by display_order)
        from public.site_languages
        where is_active = true
      ),
      '[]'::jsonb
    ),
    true
  ),
  updated_at = now()
where edge_function_slug = 'generate-journal-ai-post';

commit;
