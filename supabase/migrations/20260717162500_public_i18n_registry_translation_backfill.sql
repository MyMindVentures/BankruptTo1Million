-- Idempotent backfill: ensure every public UI registry key has published rows for all active languages.

begin;

insert into public.website_translations
  (translation_key_id, language_code, translated_text, translation_status, translation_source, translated_at, reviewed_at, published_at)
select distinct
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
  and (
    k.description like 'Public UI key %'
    or exists (
      select 1
      from public.website_ui_component_translation_keys ck
      join public.website_ui_components c on c.id = ck.component_id
      where ck.translation_key_id = k.id
        and c.is_active = true
        and c.is_public = true
    )
  )
on conflict (translation_key_id, language_code) do update set
  translated_text = excluded.translated_text,
  translation_status = 'published',
  translation_source = 'manual',
  translated_at = now(),
  reviewed_at = now(),
  published_at = now(),
  updated_at = now();

commit;
