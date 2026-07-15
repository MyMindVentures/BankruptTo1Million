insert into public.website_translation_keys
  (translation_key, namespace, description, default_text, value_type, is_required, is_active, interpolation_variables, supports_plural)
values
  ('journal.timeline.open_chapter', 'journal', 'Accessible label for opening a journal chapter from the timeline card', 'Open chapter: {title}', 'text', true, true, '{title}', false)
on conflict (translation_key) do update
set default_text = excluded.default_text,
    description = excluded.description,
    interpolation_variables = excluded.interpolation_variables,
    is_active = true,
    updated_at = now();

with catalog(translation_key, language_code, translated_text) as (
  values
    ('journal.timeline.open_chapter','en','Open chapter: {title}'),
    ('journal.timeline.open_chapter','nl','Hoofdstuk openen: {title}'),
    ('journal.timeline.open_chapter','fr','Ouvrir le chapitre : {title}'),
    ('journal.timeline.open_chapter','de','Kapitel öffnen: {title}'),
    ('journal.timeline.open_chapter','es','Abrir capítulo: {title}'),
    ('journal.timeline.open_chapter','pt','Abrir capítulo: {title}'),
    ('journal.timeline.open_chapter','it','Apri capitolo: {title}'),
    ('journal.timeline.open_chapter','pl','Otwórz rozdział: {title}'),
    ('journal.timeline.open_chapter','cs','Otevřít kapitolu: {title}'),
    ('journal.timeline.open_chapter','tr','Bölümü aç: {title}'),
    ('journal.timeline.open_chapter','ar','فتح الفصل: {title}'),
    ('journal.timeline.open_chapter','hi','अध्याय खोलें: {title}'),
    ('journal.timeline.open_chapter','zh','打开章节：{title}'),
    ('journal.timeline.open_chapter','ja','章を開く: {title}'),
    ('journal.timeline.open_chapter','ko','챕터 열기: {title}')
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
    translated_at = now(),
    reviewed_at = now(),
    published_at = now(),
    updated_at = now();
