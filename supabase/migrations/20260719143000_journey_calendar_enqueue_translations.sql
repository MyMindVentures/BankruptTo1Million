-- Re-bootstrap journey_calendar (+ navigation.calendar) across 30 languages
-- and enqueue translation-job expansion for real non-English copy.

begin;

insert into public.website_translations
  (translation_key_id, language_code, translated_text, translation_status, translation_source, translated_at, reviewed_at, published_at)
select
  k.id,
  sl.code,
  k.default_text,
  'published',
  'manual',
  now(),
  now(),
  now()
from public.website_translation_keys k
cross join public.site_languages sl
where k.is_active = true
  and sl.is_active = true
  and (
    k.translation_key like 'journey_calendar.%'
    or k.translation_key = 'navigation.calendar'
  )
on conflict (translation_key_id, language_code) do update set
  translated_text = case
    when public.website_translations.translated_text is not distinct from (
      select dk.default_text
      from public.website_translation_keys dk
      where dk.id = public.website_translations.translation_key_id
    ) then excluded.translated_text
    else public.website_translations.translated_text
  end,
  translation_status = 'published',
  translation_source = coalesce(public.website_translations.translation_source, 'manual'),
  translated_at = now(),
  reviewed_at = now(),
  published_at = now(),
  updated_at = now();

do $$
declare
  rec record;
begin
  if to_regprocedure('private.enqueue_translation_job_expansion(text,uuid,text,jsonb,text)') is null then
    raise notice 'enqueue_translation_job_expansion unavailable; skipping translation job enqueue';
    return;
  end if;

  for rec in
    select id, translation_key, default_text
    from public.website_translation_keys
    where is_active = true
      and (
        translation_key like 'journey_calendar.%'
        or translation_key = 'navigation.calendar'
      )
    order by translation_key
  loop
    perform private.enqueue_translation_job_expansion(
      'website_key',
      rec.id,
      'en',
      jsonb_build_object(
        'translation_key', rec.translation_key,
        'default_text', rec.default_text
      ),
      'public-i18n-registry-v1'
    );
  end loop;
end $$;

commit;
