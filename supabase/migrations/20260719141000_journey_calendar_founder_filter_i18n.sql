-- Calendar founder filter UI keys (30-language bootstrap).

begin;

insert into public.website_translation_keys
  (translation_key, namespace, description, default_text, value_type, is_required, is_active, interpolation_variables, supports_plural)
values
  ('journey_calendar.filter.all', 'journey_calendar', 'Public UI key journey_calendar.filter.all', 'Everyone', 'text', true, true, '{}'::text[], false),
  ('journey_calendar.filter.aria', 'journey_calendar', 'Public UI key journey_calendar.filter.aria', 'Filter calendar by founder', 'text', true, true, '{}'::text[], false),
  ('journey_calendar.filter.empty', 'journey_calendar', 'Public UI key journey_calendar.filter.empty', 'No stops match this founder filter.', 'text', true, true, '{}'::text[], false)
on conflict (translation_key) do update set
  default_text = excluded.default_text,
  description = excluded.description,
  is_active = true,
  updated_at = now();

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
  and k.translation_key = any(array[
    'journey_calendar.filter.all',
    'journey_calendar.filter.aria',
    'journey_calendar.filter.empty'
  ])
on conflict (translation_key_id, language_code) do update set
  translated_text = excluded.translated_text,
  translation_status = 'published',
  translation_source = 'manual',
  translated_at = now(),
  reviewed_at = now(),
  published_at = now(),
  updated_at = now();

insert into public.website_ui_component_translation_keys (component_id, translation_key_id, usage_kind, is_required)
select c.id, k.id, 'label', true
from public.website_ui_components c
cross join lateral (
  values
    ('journey_calendar.filter.all'),
    ('journey_calendar.filter.aria'),
    ('journey_calendar.filter.empty')
) as v(translation_key)
join public.website_translation_keys k on k.translation_key = v.translation_key
where c.component_key = 'components.journey.calendar.page'
on conflict (component_id, translation_key_id) do update set
  usage_kind = excluded.usage_kind,
  is_required = excluded.is_required,
  updated_at = now();

commit;
