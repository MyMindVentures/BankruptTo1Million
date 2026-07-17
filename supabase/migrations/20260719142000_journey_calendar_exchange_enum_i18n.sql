-- Calendar exchange priority/category UI keys (30-language bootstrap).

begin;

insert into public.website_translation_keys
  (translation_key, namespace, description, default_text, value_type, is_required, is_active, interpolation_variables, supports_plural)
values
  ('journey_calendar.priority.low', 'journey_calendar', 'Public UI key journey_calendar.priority.low', 'Low', 'text', true, true, '{}'::text[], false),
  ('journey_calendar.priority.normal', 'journey_calendar', 'Public UI key journey_calendar.priority.normal', 'Normal', 'text', true, true, '{}'::text[], false),
  ('journey_calendar.priority.high', 'journey_calendar', 'Public UI key journey_calendar.priority.high', 'High', 'text', true, true, '{}'::text[], false),
  ('journey_calendar.priority.urgent', 'journey_calendar', 'Public UI key journey_calendar.priority.urgent', 'Urgent', 'text', true, true, '{}'::text[], false),
  ('journey_calendar.category.basic_facilities', 'journey_calendar', 'Public UI key journey_calendar.category.basic_facilities', 'Basic facilities', 'text', true, true, '{}'::text[], false),
  ('journey_calendar.category.sleeping_place', 'journey_calendar', 'Public UI key journey_calendar.category.sleeping_place', 'Sleeping place', 'text', true, true, '{}'::text[], false),
  ('journey_calendar.category.bbq', 'journey_calendar', 'Public UI key journey_calendar.category.bbq', 'BBQ', 'text', true, true, '{}'::text[], false),
  ('journey_calendar.category.paddleboard', 'journey_calendar', 'Public UI key journey_calendar.category.paddleboard', 'Paddleboard', 'text', true, true, '{}'::text[], false),
  ('journey_calendar.category.photography', 'journey_calendar', 'Public UI key journey_calendar.category.photography', 'Photography', 'text', true, true, '{}'::text[], false),
  ('journey_calendar.category.skipper', 'journey_calendar', 'Public UI key journey_calendar.category.skipper', 'Skipper', 'text', true, true, '{}'::text[], false),
  ('journey_calendar.exchange.meta', 'journey_calendar', 'Public UI key journey_calendar.exchange.meta', '{person} · {category}', 'text', true, true, array['person','category']::text[], false)
on conflict (translation_key) do update set
  default_text = excluded.default_text,
  description = excluded.description,
  interpolation_variables = excluded.interpolation_variables,
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
    'journey_calendar.priority.low',
    'journey_calendar.priority.normal',
    'journey_calendar.priority.high',
    'journey_calendar.priority.urgent',
    'journey_calendar.category.basic_facilities',
    'journey_calendar.category.sleeping_place',
    'journey_calendar.category.bbq',
    'journey_calendar.category.paddleboard',
    'journey_calendar.category.photography',
    'journey_calendar.category.skipper',
    'journey_calendar.exchange.meta'
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
    ('journey_calendar.priority.low'),
    ('journey_calendar.priority.normal'),
    ('journey_calendar.priority.high'),
    ('journey_calendar.priority.urgent'),
    ('journey_calendar.category.basic_facilities'),
    ('journey_calendar.category.sleeping_place'),
    ('journey_calendar.category.bbq'),
    ('journey_calendar.category.paddleboard'),
    ('journey_calendar.category.photography'),
    ('journey_calendar.category.skipper'),
    ('journey_calendar.exchange.meta')
) as v(translation_key)
join public.website_translation_keys k on k.translation_key = v.translation_key
where c.component_key = 'components.journey.calendar.page'
on conflict (component_id, translation_key_id) do update set
  usage_kind = excluded.usage_kind,
  is_required = excluded.is_required,
  updated_at = now();

commit;
