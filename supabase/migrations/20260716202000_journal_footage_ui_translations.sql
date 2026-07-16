-- Journal footage UI translation keys

insert into public.website_translation_keys
  (translation_key, namespace, description, default_text, value_type, is_required, is_active, interpolation_variables, supports_plural)
values
  ('journal.footage.eyebrow', 'journal', 'Eyebrow label for journal footage section', 'Footage from the journey', 'text', true, true, '{}', false),
  ('journal.footage.title', 'journal', 'Heading for journal footage section', 'See the moment as it happened.', 'text', true, true, '{}', false),
  ('journal.footage.open', 'journal', 'Open footage tile button label', 'Open footage {number}', 'text', true, true, '{"number"}', false),
  ('journal.footage.close', 'journal', 'Close footage viewer button label', 'Close viewer', 'text', true, true, '{}', false),
  ('journal.footage.previous', 'journal', 'Previous footage in viewer', 'Previous', 'text', true, true, '{}', false),
  ('journal.footage.next', 'journal', 'Next footage in viewer', 'Next', 'text', true, true, '{}', false),
  ('journal.footage.counter', 'journal', 'Footage position counter in viewer', '{current} of {total}', 'text', true, true, '{"current","total"}', false),
  ('journal.footage.alt.image', 'journal', 'Fallback alt text for journal event photos', 'Event photo {number}', 'text', true, true, '{"number"}', false),
  ('journal.footage.alt.video', 'journal', 'Fallback alt text for journal event videos', 'Event video {number}', 'text', true, true, '{"number"}', false),
  ('journal.footage.loading', 'journal', 'Footage loading state', 'Loading footage…', 'text', true, true, '{}', false),
  ('journal.footage.error', 'journal', 'Footage error state', 'Footage could not be loaded.', 'text', true, true, '{}', false)
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
where k.translation_key like 'journal.footage.%'
  and sl.is_active = true
on conflict (translation_key_id, language_code) do update
set translated_text = excluded.translated_text,
    translation_status = 'published',
    translation_source = 'manual',
    translated_at = now(),
    reviewed_at = now(),
    published_at = now(),
    updated_at = now();

-- Spanish overrides
with catalog(translation_key, language_code, translated_text) as (
  values
    ('journal.footage.eyebrow','es','Imágenes del viaje'),
    ('journal.footage.title','es','Vive el momento tal como ocurrió.'),
    ('journal.footage.open','es','Abrir imagen {number}'),
    ('journal.footage.close','es','Cerrar visor'),
    ('journal.footage.previous','es','Anterior'),
    ('journal.footage.next','es','Siguiente'),
    ('journal.footage.counter','es','{current} de {total}'),
    ('journal.footage.alt.image','es','Foto del evento {number}'),
    ('journal.footage.alt.video','es','Vídeo del evento {number}'),
    ('journal.footage.loading','es','Cargando imágenes…'),
    ('journal.footage.error','es','No se pudieron cargar las imágenes.')
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

-- German overrides
with catalog(translation_key, language_code, translated_text) as (
  values
    ('journal.footage.eyebrow','de','Aufnahmen von der Reise'),
    ('journal.footage.title','de','Erlebe den Moment, wie er war.'),
    ('journal.footage.open','de','Aufnahme {number} öffnen'),
    ('journal.footage.close','de','Viewer schließen'),
    ('journal.footage.previous','de','Zurück'),
    ('journal.footage.next','de','Weiter'),
    ('journal.footage.counter','de','{current} von {total}'),
    ('journal.footage.alt.image','de','Eventfoto {number}'),
    ('journal.footage.alt.video','de','Eventvideo {number}'),
    ('journal.footage.loading','de','Aufnahmen werden geladen…'),
    ('journal.footage.error','de','Aufnahmen konnten nicht geladen werden.')
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
