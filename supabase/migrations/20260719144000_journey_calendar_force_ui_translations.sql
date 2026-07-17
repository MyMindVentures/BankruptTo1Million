-- Force real non-English calendar UI translations by removing English bootstrap
-- placeholders that caused process-translation-job to skip_existing all languages.
-- Also enqueue entity translation jobs for calendar stops and exchange items.

begin;

delete from public.website_translations wt
using public.website_translation_keys k
where wt.translation_key_id = k.id
  and wt.language_code <> 'en'
  and k.is_active = true
  and (
    k.translation_key like 'journey_calendar.%'
    or k.translation_key = 'navigation.calendar'
  )
  and wt.translated_text is not distinct from k.default_text;

do $$
declare
  rec record;
begin
  if to_regprocedure('private.enqueue_translation_job_expansion(text,uuid,text,jsonb,text)') is null then
    raise notice 'enqueue_translation_job_expansion unavailable; skipping enqueue';
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
      'public-i18n-calendar-force-v1'
    );
  end loop;

  for rec in
    select id
    from public.journey_calendar_entries
    where coalesce(is_public, true) = true
  loop
    perform private.enqueue_translation_job_expansion(
      'journey_calendar_entry',
      rec.id,
      'en',
      jsonb_build_object('calendar_entry_id', rec.id),
      'public-i18n-calendar-force-v1'
    );
  end loop;

  for rec in
    select id
    from public.journey_exchange_items
    where coalesce(is_public, true) = true
  loop
    perform private.enqueue_translation_job_expansion(
      'journey_exchange_item',
      rec.id,
      'en',
      jsonb_build_object('exchange_item_id', rec.id),
      'public-i18n-calendar-force-v1'
    );
  end loop;
end $$;

commit;
