-- Map UI translation keys for journal place context POI map

insert into public.website_translation_keys
  (translation_key, namespace, description, default_text, value_type, is_required, is_active, interpolation_variables, supports_plural)
values
  ('journal.place_context.map.heading', 'journal', 'POI map heading', 'Map of nearby points', 'text', true, true, '{}', false),
  ('journal.place_context.map.venue_pin', 'journal', 'Venue map marker aria label', 'Featured place: {title}', 'text', true, true, '{title}', false),
  ('journal.place_context.map.poi_pin', 'journal', 'POI map marker aria label', 'Point of interest {order}: {title}', 'text', true, true, '{order,title}', false),
  ('journal.place_context.map.open_in_maps', 'journal', 'Open POI in Google Maps link', 'Open in Google Maps', 'text', true, true, '{}', false),
  ('journal.place_context.map.error', 'journal', 'POI map error state', 'Map is temporarily unavailable.', 'text', true, true, '{}', false)
on conflict (translation_key) do update
set default_text = excluded.default_text,
    description = excluded.description,
    is_active = true,
    interpolation_variables = excluded.interpolation_variables,
    updated_at = now();

insert into public.website_translations
  (translation_key_id, language_code, translated_text, translation_status, translation_source, translated_at, reviewed_at, published_at)
select k.id, sl.code, k.default_text, 'published', 'manual', now(), now(), now()
from public.website_translation_keys k
cross join public.site_languages sl
where k.translation_key like 'journal.place_context.map.%'
  and sl.is_active = true
on conflict (translation_key_id, language_code) do update
set translated_text = excluded.translated_text,
    translation_status = 'published',
    translation_source = 'manual',
    translated_at = now(),
    reviewed_at = now(),
    published_at = now(),
    updated_at = now();

with catalog(translation_key, language_code, translated_text) as (
  values
    ('journal.place_context.map.heading','es','Mapa de puntos cercanos'),
    ('journal.place_context.map.venue_pin','es','Lugar destacado: {title}'),
    ('journal.place_context.map.poi_pin','es','Punto de interés {order}: {title}'),
    ('journal.place_context.map.open_in_maps','es','Abrir en Google Maps'),
    ('journal.place_context.map.error','es','El mapa no está disponible temporalmente.'),
    ('journal.place_context.map.heading','ar','خريطة المعالم القريبة'),
    ('journal.place_context.map.venue_pin','ar','المكان المميز: {title}'),
    ('journal.place_context.map.poi_pin','ar','معلم {order}: {title}'),
    ('journal.place_context.map.open_in_maps','ar','فتح في خرائط Google'),
    ('journal.place_context.map.error','ar','الخريطة غير متاحة مؤقتًا.')
), resolved as (
  select k.id as translation_key_id, c.language_code, c.translated_text
  from catalog c
  join public.website_translation_keys k on k.translation_key = c.translation_key
)
insert into public.website_translations
  (translation_key_id, language_code, translated_text, translation_status, translation_source, translated_at, reviewed_at, published_at)
select translation_key_id, language_code, translated_text, 'published', 'manual', now(), now(), now()
from resolved
on conflict (translation_key_id, language_code) do update
set translated_text = excluded.translated_text,
    translation_status = 'published',
    translation_source = 'manual',
    updated_at = now();
