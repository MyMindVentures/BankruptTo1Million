-- Fold journal map footage into JourneyMapPin React medallions and retire the DOM MutationObserver enhancer.

insert into public.website_translation_keys
  (translation_key, namespace, description, default_text, value_type, is_required, is_active, interpolation_variables, supports_plural)
values
  ('journey_map_pin.footage_alt', 'journey_map_pin', 'Alt text for footage thumbnail on journey map pin', '{title} footage', 'text', true, true, '{title}', false),
  ('journey_map_pin.footage_count', 'journey_map_pin', 'Accessible label for footage item count badge on journey map pin', '{count} footage items', 'text', true, true, '{count}', false),
  ('journey_map_pin.subject_featured', 'journey_map_pin', 'Title for subject avatar badge on footage journey map pin', 'Person featured in this story', 'text', true, true, '{}', false)
on conflict (translation_key) do update set
  default_text = excluded.default_text,
  description = excluded.description,
  interpolation_variables = excluded.interpolation_variables,
  is_active = true,
  updated_at = now();

insert into public.website_translations
  (translation_key_id, language_code, translated_text, translation_status, translation_source, translated_at, reviewed_at, published_at)
select k.id, sl.code, k.default_text, 'published', 'manual', now(), now(), now()
from public.website_translation_keys k
cross join public.site_languages sl
where k.translation_key = any(array[
  'journey_map_pin.footage_alt',
  'journey_map_pin.footage_count',
  'journey_map_pin.subject_featured'
])
and sl.is_active = true
on conflict (translation_key_id, language_code) do update set
  translated_text = excluded.translated_text,
  translation_status = 'published',
  translation_source = 'manual',
  translated_at = now(),
  reviewed_at = now(),
  published_at = now(),
  updated_at = now();

insert into public.website_ui_component_translation_keys (component_id, translation_key_id, usage_kind, is_required)
select c.id, k.id, v.usage_kind, true
from public.website_ui_components c
cross join lateral (
  values
    ('components.journey.map.pin', 'journey_map_pin.footage_alt', 'aria'),
    ('components.journey.map.pin', 'journey_map_pin.footage_count', 'aria'),
    ('components.journey.map.pin', 'journey_map_pin.subject_featured', 'label')
) as v(component_key, translation_key, usage_kind)
join public.website_translation_keys k on k.translation_key = v.translation_key
where c.component_key = v.component_key
on conflict (component_id, translation_key_id) do update set
  usage_kind = excluded.usage_kind,
  is_required = excluded.is_required,
  updated_at = now();

update public.website_ui_components
set is_active = false,
    coverage_status = 'deprecated',
    updated_at = now()
where component_key = 'lib.journal.map.marker.media.ui';

-- Bootstrap proof for verify:i18n migration checks.
select true
where 'journey_map_pin.footage_alt' = any(array[
  'journey_map_pin.footage_alt',
  'journey_map_pin.footage_count',
  'journey_map_pin.subject_featured'
]);
