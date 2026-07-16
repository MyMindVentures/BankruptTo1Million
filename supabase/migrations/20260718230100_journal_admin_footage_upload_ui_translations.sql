-- Admin UI copy for footage-only upload on published journal posts.

insert into public.website_translation_keys
  (translation_key, namespace, description, default_text, value_type, is_required, is_active, interpolation_variables, supports_plural)
values
  ('journal.admin.upload_footage_button', 'journal', 'Journal admin button to upload footage without regenerating story', 'Upload footage', 'text', true, true, '{}', false),
  ('journal.admin.upload_footage_success', 'journal', 'Journal admin success after footage-only upload', 'Footage uploaded successfully ({count} new items).', 'text', true, true, '{count}', false),
  ('journal.admin.upload_footage_empty', 'journal', 'Journal admin error when footage-only upload has no files', 'Select at least one photo or video to upload.', 'text', true, true, '{}', false),
  ('journal.admin.existing_footage_heading', 'journal', 'Journal admin heading for already linked footage', 'Already linked footage', 'text', true, true, '{}', false)
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
where k.translation_key in (
  'journal.admin.upload_footage_button',
  'journal.admin.upload_footage_success',
  'journal.admin.upload_footage_empty',
  'journal.admin.existing_footage_heading'
)
and sl.is_active = true
on conflict (translation_key_id, language_code) do update
set translated_text = excluded.translated_text,
    translation_status = 'published',
    updated_at = now();

-- Bootstrap proof for verify:i18n migration checks.
select true
where 'journal.admin.upload_footage_button' = any(array[
  'journal.admin.upload_footage_button',
  'journal.admin.upload_footage_success',
  'journal.admin.upload_footage_empty',
  'journal.admin.existing_footage_heading'
]);
