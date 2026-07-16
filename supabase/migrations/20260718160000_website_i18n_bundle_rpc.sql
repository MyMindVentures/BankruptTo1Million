-- Return the full website UI translation bundle as one JSON object so PostgREST
-- row limits (default 1000) do not truncate keys added after the catalog grows.

begin;

create or replace function public.get_website_i18n_bundle(p_language_code text)
returns jsonb
language sql
stable
set search_path = public
as $$
  with resolved as (
    select
      k.translation_key,
      trim(regexp_replace(coalesce(k.default_text, ''), '\s+', ' ', 'g')) as source_text,
      coalesce(requested.translated_text, english.translated_text, k.default_text) as translated_text
    from public.website_translation_keys k
    left join public.website_translations requested
      on requested.translation_key_id = k.id
     and requested.language_code = p_language_code
     and requested.translation_status = 'published'
    left join public.website_translations english
      on english.translation_key_id = k.id
     and english.language_code = 'en'
     and english.translation_status = 'published'
    where k.is_active = true
      and exists (
        select 1
        from public.site_languages l
        where l.code = p_language_code
          and l.is_active = true
      )
  ),
  by_key as (
    select coalesce(jsonb_object_agg(translation_key, translated_text), '{}'::jsonb) as value
    from resolved
  ),
  by_source as (
    select coalesce(
      jsonb_object_agg(source_text, translated_text) filter (where source_text <> ''),
      '{}'::jsonb
    ) as value
    from resolved
    where p_language_code <> 'en'
  )
  select jsonb_build_object(
    'byKey', (select value from by_key),
    'bySource', case
      when p_language_code = 'en' then '{}'::jsonb
      else (select value from by_source)
    end
  );
$$;

grant execute on function public.get_website_i18n_bundle(text) to anon, authenticated, service_role;

commit;
