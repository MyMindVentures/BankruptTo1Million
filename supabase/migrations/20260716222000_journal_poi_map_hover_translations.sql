-- POI type labels and map hover detail card UI keys

insert into public.website_translation_keys
  (translation_key, namespace, description, default_text, value_type, is_required, is_active, interpolation_variables, supports_plural)
values
  ('journal.place_context.poi_type.landmark', 'journal', 'POI type label landmark', 'Landmark', 'text', true, true, '{}', false),
  ('journal.place_context.poi_type.museum', 'journal', 'POI type label museum', 'Museum', 'text', true, true, '{}', false),
  ('journal.place_context.poi_type.nature', 'journal', 'POI type label nature', 'Nature', 'text', true, true, '{}', false),
  ('journal.place_context.poi_type.food', 'journal', 'POI type label food', 'Food & drink', 'text', true, true, '{}', false),
  ('journal.place_context.poi_type.culture', 'journal', 'POI type label culture', 'Culture', 'text', true, true, '{}', false),
  ('journal.place_context.poi_type.other', 'journal', 'POI type label other', 'Point of interest', 'text', true, true, '{}', false),
  ('journal.place_context.map.card.close_label', 'journal', 'Close POI map detail card', 'Close point of interest details', 'text', true, true, '{}', false),
  ('journal.place_context.map.card.order', 'journal', 'POI map card order badge', 'Stop {order}', 'text', true, true, '{order}', false)
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
where (k.translation_key like 'journal.place_context.poi_type.%'
   or k.translation_key like 'journal.place_context.map.card.%')
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
    ('journal.place_context.poi_type.landmark','es','Monumento'),
    ('journal.place_context.poi_type.museum','es','Museo'),
    ('journal.place_context.poi_type.nature','es','Naturaleza'),
    ('journal.place_context.poi_type.food','es','Comida y bebida'),
    ('journal.place_context.poi_type.culture','es','Cultura'),
    ('journal.place_context.poi_type.other','es','Punto de interés'),
    ('journal.place_context.map.card.close_label','es','Cerrar detalles del punto de interés'),
    ('journal.place_context.map.card.order','es','Parada {order}'),
    ('journal.place_context.poi_type.landmark','ar','معلم'),
    ('journal.place_context.poi_type.museum','ar','متحف'),
    ('journal.place_context.poi_type.nature','ar','طبيعة'),
    ('journal.place_context.poi_type.food','ar','طعام وشراب'),
    ('journal.place_context.poi_type.culture','ar','ثقافة'),
    ('journal.place_context.poi_type.other','ar','معلم'),
    ('journal.place_context.map.card.close_label','ar','إغلاق تفاصيل المعلم'),
    ('journal.place_context.map.card.order','ar','محطة {order}')
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
