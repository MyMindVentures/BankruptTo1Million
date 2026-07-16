-- Fix venue thank-you UI keys: remove English placeholder rows that blocked AI translation jobs.

begin;

delete from public.website_translations wt
using public.website_translation_keys k
where wt.translation_key_id = k.id
  and k.translation_key = any(array[
    'journal.place_context.thank_you.eyebrow',
    'journal.place_context.thank_you.heading',
    'journal.place_context.thank_you.aria_label'
  ])
  and wt.language_code <> 'en'
  and wt.translation_source = 'manual'
  and wt.translated_text = k.default_text;

do $$
declare
  rec record;
  v_dispatched integer;
begin
  if to_regprocedure('private.enqueue_translation_job_expansion(text,uuid,text,jsonb,text)') is null then
    return;
  end if;

  for rec in
    select id, translation_key, default_text
    from public.website_translation_keys
    where translation_key in (
      'journal.place_context.thank_you.eyebrow',
      'journal.place_context.thank_you.heading',
      'journal.place_context.thank_you.aria_label'
    )
  loop
    perform private.enqueue_translation_job_expansion(
      'website_key',
      rec.id,
      'en',
      jsonb_build_object(
        'translation_key', rec.translation_key,
        'default_text', rec.default_text
      ),
      'journal-venue-thank-you-ui-v2'
    );
  end loop;

  if to_regprocedure('private.dispatch_pending_translation_jobs(integer)') is not null then
    v_dispatched := private.dispatch_pending_translation_jobs(10);
    raise notice 'Dispatched % venue thank-you UI translation jobs', v_dispatched;
  end if;
end $$;

commit;
