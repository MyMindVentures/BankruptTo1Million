-- Compact current-location map UI keys + registry (30-language bootstrap).

begin;

insert into public.website_translation_keys
  (translation_key, namespace, description, default_text, value_type, is_required, is_active, interpolation_variables, supports_plural)
values
  ('journey_calendar.current_map.loading', 'journey_calendar', 'Public UI key journey_calendar.current_map.loading', 'Loading current locations…', 'text', true, true, '{}'::text[], false),
  ('journey_calendar.current_map.error', 'journey_calendar', 'Public UI key journey_calendar.current_map.error', 'Current locations could not be loaded.', 'text', true, true, '{}'::text[], false),
  ('journey_calendar.current_map.empty', 'journey_calendar', 'Public UI key journey_calendar.current_map.empty', 'No live current locations are available yet.', 'text', true, true, '{}'::text[], false),
  ('journey_calendar.current_map.region_label', 'journey_calendar', 'Public UI key journey_calendar.current_map.region_label', 'Current locations map', 'text', true, true, '{}'::text[], false)
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
    'journey_calendar.current_map.loading',
    'journey_calendar.current_map.error',
    'journey_calendar.current_map.empty',
    'journey_calendar.current_map.region_label'
  ])
on conflict (translation_key_id, language_code) do update set
  translated_text = excluded.translated_text,
  translation_status = 'published',
  translation_source = 'manual',
  translated_at = now(),
  reviewed_at = now(),
  published_at = now(),
  updated_at = now();

insert into public.website_ui_components
  (component_key, source_path, export_name, surface_type, namespace, is_public, entity_content, coverage_status)
values
  (
    'components.journey.calendar.current_map',
    'src/components/CurrentLocationMap.tsx',
    'CurrentLocationMap',
    'component',
    'journey_calendar',
    true,
    '{"tables":["public_journal_map_points"]}'::jsonb,
    'connected'
  )
on conflict (component_key) do update set
  source_path = excluded.source_path,
  export_name = excluded.export_name,
  surface_type = excluded.surface_type,
  namespace = excluded.namespace,
  is_public = excluded.is_public,
  entity_content = excluded.entity_content,
  coverage_status = excluded.coverage_status,
  updated_at = now();

insert into public.website_ui_component_translation_keys (component_id, translation_key_id, usage_kind, is_required)
select c.id, k.id, 'label', true
from public.website_ui_components c
cross join lateral (
  values
    ('journey_calendar.current_map.loading'),
    ('journey_calendar.current_map.error'),
    ('journey_calendar.current_map.empty'),
    ('journey_calendar.current_map.region_label')
) as v(translation_key)
join public.website_translation_keys k on k.translation_key = v.translation_key
where c.component_key = 'components.journey.calendar.current_map'
on conflict (component_id, translation_key_id) do update set
  usage_kind = excluded.usage_kind,
  is_required = excluded.is_required,
  updated_at = now();

commit;
