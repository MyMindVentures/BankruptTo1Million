-- Hint copy for in-form footage-only upload on published journal posts.

insert into public.website_translation_keys
  (translation_key, namespace, description, default_text, value_type, is_required, is_active, interpolation_variables, supports_plural)
values
  (
    'journal.admin.upload_footage_hint',
    'journal',
    'Journal admin hint above footage-only upload button',
    'Add new photos or videos above, then upload without regenerating the public story.',
    'text',
    true,
    true,
    '{}',
    false
  )
on conflict (translation_key) do update set
  default_text = excluded.default_text,
  description = excluded.description,
  is_active = true,
  updated_at = now();

insert into public.website_translations
  (translation_key_id, language_code, translated_text, translation_status, translation_source, translated_at, reviewed_at, published_at)
select k.id, sl.code, k.default_text, 'published', 'manual', now(), now(), now()
from public.website_translation_keys k
cross join public.site_languages sl
where k.translation_key = 'journal.admin.upload_footage_hint'
  and sl.is_active = true
on conflict (translation_key_id, language_code) do update
set translated_text = excluded.translated_text,
    translation_status = 'published',
    updated_at = now();

select true
where 'journal.admin.upload_footage_hint' = any(array['journal.admin.upload_footage_hint']);
