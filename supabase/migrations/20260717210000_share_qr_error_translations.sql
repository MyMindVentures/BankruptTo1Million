begin;

insert into public.website_translation_keys
  (translation_key, namespace, description, default_text, value_type, is_required, is_active, interpolation_variables, supports_plural)
values
  ('share.qr.network_error', 'share', 'QR modal network failure message', 'Could not reach the QR code service. Check your connection and try again.', 'text', true, true, '{}', false),
  ('share.qr.api_error', 'share', 'QR modal generic API failure message', 'Unable to generate the QR code. Please try again.', 'text', true, true, '{}', false)
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
where k.translation_key in ('share.qr.network_error', 'share.qr.api_error')
  and sl.is_active = true
on conflict (translation_key_id, language_code) do update set
  translated_text = excluded.translated_text,
  translation_status = 'published',
  translation_source = 'manual',
  translated_at = now(),
  reviewed_at = now(),
  published_at = now(),
  updated_at = now();

with catalog(translation_key, language_code, translated_text) as (
  values
    ('share.qr.network_error', 'nl', 'De QR-codeservice is niet bereikbaar. Controleer je verbinding en probeer het opnieuw.'),
    ('share.qr.api_error', 'nl', 'De QR-code kon niet worden gegenereerd. Probeer het opnieuw.'),
    ('share.qr.network_error', 'fr', 'Impossible de joindre le service de QR code. Vérifiez votre connexion et réessayez.'),
    ('share.qr.api_error', 'fr', 'Impossible de générer le QR code. Veuillez réessayer.'),
    ('share.qr.network_error', 'de', 'Der QR-Code-Dienst ist nicht erreichbar. Prüfen Sie Ihre Verbindung und versuchen Sie es erneut.'),
    ('share.qr.api_error', 'de', 'Der QR-Code konnte nicht erstellt werden. Bitte versuchen Sie es erneut.'),
    ('share.qr.network_error', 'es', 'No se pudo contactar con el servicio de códigos QR. Comprueba tu conexión e inténtalo de nuevo.'),
    ('share.qr.api_error', 'es', 'No se pudo generar el código QR. Inténtalo de nuevo.')
), resolved as (
  select k.id as translation_key_id, c.language_code, c.translated_text
  from catalog c
  join public.website_translation_keys k on k.translation_key = c.translation_key
)
insert into public.website_translations
  (translation_key_id, language_code, translated_text, translation_status, translation_source, translated_at, reviewed_at, published_at)
select translation_key_id, language_code, translated_text, 'published', 'manual', now(), now(), now()
from resolved
on conflict (translation_key_id, language_code) do update set
  translated_text = excluded.translated_text,
  translation_status = 'published',
  translation_source = 'manual',
  updated_at = now();

insert into public.website_translation_key_usage (translation_key_id, source_path, source_identifier, migration_status, notes)
select k.id, 'supabase/migrations/20260717210000_share_qr_error_translations.sql', k.translation_key, 'seeded', 'Share QR modal error copy'
from public.website_translation_keys k
where k.translation_key in ('share.qr.network_error', 'share.qr.api_error')
on conflict do nothing;

commit;
