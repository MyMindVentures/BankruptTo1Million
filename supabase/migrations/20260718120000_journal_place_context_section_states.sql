begin;

insert into public.website_translation_keys
  (translation_key, namespace, description, default_text, value_type, is_required, is_active, interpolation_variables, supports_plural)
values
  ('journal.place_context.loading', 'journal', 'Place context section loading state', 'Loading place information…', 'text', true, true, '{}', false),
  ('journal.place_context.error', 'journal', 'Place context section load error', 'Place information is temporarily unavailable.', 'text', true, true, '{}', false)
on conflict (translation_key) do update
set default_text = excluded.default_text,
    description = excluded.description,
    is_active = true,
    updated_at = now();

insert into public.website_translations
  (translation_key_id, language_code, translated_text, translation_status, translation_source, translated_at, reviewed_at, published_at)
select k.id, sl.code, k.default_text, 'published', 'manual', now(), now(), now()
from public.website_translation_keys k
cross join public.site_languages sl
where k.translation_key in ('journal.place_context.loading', 'journal.place_context.error')
  and sl.is_active = true
on conflict (translation_key_id, language_code) do update
set translated_text = excluded.translated_text,
    translation_status = 'published',
    updated_at = now();

insert into public.website_translation_key_usage (component_key, translation_key)
values
  ('journal.place_context.section', 'journal.place_context.loading'),
  ('journal.place_context.section', 'journal.place_context.error')
on conflict do nothing;

commit;
