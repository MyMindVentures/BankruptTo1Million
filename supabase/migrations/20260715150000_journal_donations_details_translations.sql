begin;

insert into public.website_translation_keys
  (translation_key, namespace, description, default_text, value_type, is_required, is_active, interpolation_variables, supports_plural)
values
  ('donations.form.your_details', 'donations', 'Donation form details step title', 'Your details', 'text', true, true, '{}', false),
  ('donations.form.privacy_preferences', 'donations', 'Donation form privacy preferences heading', 'Privacy preferences', 'text', true, true, '{}', false)
on conflict (translation_key) do update set
  default_text = excluded.default_text,
  description = excluded.description,
  is_active = true,
  updated_at = now();

with catalog(translation_key, language_code, translated_text) as (
  values
    ('donations.form.your_details','en','Your details'),('donations.form.your_details','nl','Jouw gegevens'),('donations.form.your_details','fr','Vos informations'),('donations.form.your_details','de','Ihre Angaben'),('donations.form.your_details','es','Tus datos'),('donations.form.your_details','pt','Os seus dados'),('donations.form.your_details','it','I tuoi dati'),('donations.form.your_details','pl','Twoje dane'),('donations.form.your_details','cs','Vaše údaje'),('donations.form.your_details','tr','Bilgileriniz'),('donations.form.your_details','ar','بياناتك'),('donations.form.your_details','hi','आपका विवरण'),('donations.form.your_details','zh','您的信息'),('donations.form.your_details','ja','あなたの情報'),('donations.form.your_details','ko','내 정보'),
    ('donations.form.privacy_preferences','en','Privacy preferences'),('donations.form.privacy_preferences','nl','Privacyvoorkeuren'),('donations.form.privacy_preferences','fr','Préférences de confidentialité'),('donations.form.privacy_preferences','de','Datenschutzeinstellungen'),('donations.form.privacy_preferences','es','Preferencias de privacidad'),('donations.form.privacy_preferences','pt','Preferências de privacidade'),('donations.form.privacy_preferences','it','Preferenze sulla privacy'),('donations.form.privacy_preferences','pl','Ustawienia prywatności'),('donations.form.privacy_preferences','cs','Nastavení soukromí'),('donations.form.privacy_preferences','tr','Gizlilik tercihleri'),('donations.form.privacy_preferences','ar','تفضيلات الخصوصية'),('donations.form.privacy_preferences','hi','गोपनीयता प्राथमिकताएँ'),('donations.form.privacy_preferences','zh','隐私偏好'),('donations.form.privacy_preferences','ja','プライバシー設定'),('donations.form.privacy_preferences','ko','개인정보 설정')
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
  translated_at = now(),
  reviewed_at = now(),
  published_at = now(),
  updated_at = now();

insert into public.website_translation_key_usage (translation_key_id, source_path, source_identifier, migration_status, notes)
select k.id, 'supabase/migrations/20260715150000_journal_donations_details_translations.sql', k.translation_key, 'seeded', 'Journal donations details section translation keys'
from public.website_translation_keys k
where k.translation_key in (
  'donations.form.your_details',
  'donations.form.privacy_preferences'
)
on conflict (translation_key_id, source_path, source_identifier) do update set
  migration_status = excluded.migration_status,
  notes = excluded.notes,
  updated_at = now();

commit;
