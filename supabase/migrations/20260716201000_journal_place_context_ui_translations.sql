-- Journal place context UI translation keys

insert into public.website_translation_keys
  (translation_key, namespace, description, default_text, value_type, is_required, is_active, interpolation_variables, supports_plural)
values
  ('journal.place_context.section.title', 'journal', 'Section heading for journal place context block', 'About this place', 'text', true, true, '{}', false),
  ('journal.place_context.place.history_heading', 'journal', 'Place history subheading', 'History & info', 'text', true, true, '{}', false),
  ('journal.place_context.area.history_heading', 'journal', 'Area history subheading', 'Area history', 'text', true, true, '{}', false),
  ('journal.place_context.poi.heading', 'journal', 'POI list heading', 'Points of interest nearby', 'text', true, true, '{}', false),
  ('journal.place_context.weather.heading', 'journal', 'Weather card heading', 'Current weather', 'text', true, true, '{}', false),
  ('journal.place_context.weather.loading', 'journal', 'Weather loading state', 'Loading current weather…', 'text', true, true, '{}', false),
  ('journal.place_context.weather.error', 'journal', 'Weather error state', 'Weather is temporarily unavailable.', 'text', true, true, '{}', false),
  ('journal.place_context.weather.temperature', 'journal', 'Weather temperature label', 'Temperature', 'text', true, true, '{}', false),
  ('journal.place_context.weather.feels_like', 'journal', 'Weather feels-like label', 'Feels like', 'text', true, true, '{}', false),
  ('journal.place_context.weather.wind', 'journal', 'Weather wind label', 'Wind', 'text', true, true, '{}', false),
  ('journal.place_context.weather.humidity', 'journal', 'Weather humidity label', 'Humidity', 'text', true, true, '{}', false),
  ('journal.place_context.links.google_maps', 'journal', 'Google Maps link label', 'Google Maps', 'text', true, true, '{}', false),
  ('journal.place_context.links.instagram', 'journal', 'Instagram link label', 'Instagram', 'text', true, true, '{}', false),
  ('journal.place_context.links.website', 'journal', 'Website link label', 'Website', 'text', true, true, '{}', false),
  ('journal.place_context.place_type.restaurant', 'journal', 'Place type label restaurant', 'Restaurant', 'text', true, true, '{}', false),
  ('journal.place_context.place_type.bar', 'journal', 'Place type label bar', 'Bar', 'text', true, true, '{}', false),
  ('journal.place_context.place_type.cafe', 'journal', 'Place type label cafe', 'Café', 'text', true, true, '{}', false),
  ('journal.place_context.place_type.hotel', 'journal', 'Place type label hotel', 'Hotel', 'text', true, true, '{}', false),
  ('journal.place_context.place_type.shop', 'journal', 'Place type label shop', 'Shop', 'text', true, true, '{}', false),
  ('journal.place_context.place_type.venue', 'journal', 'Place type label venue', 'Venue', 'text', true, true, '{}', false),
  ('journal.place_context.place_type.other', 'journal', 'Place type label other', 'Place', 'text', true, true, '{}', false),
  ('journal.place_context.area_type.city', 'journal', 'Area type label city', 'City', 'text', true, true, '{}', false),
  ('journal.place_context.area_type.village', 'journal', 'Area type label village', 'Village', 'text', true, true, '{}', false),
  ('journal.place_context.area_type.town', 'journal', 'Area type label town', 'Town', 'text', true, true, '{}', false),
  ('journal.place_context.area_type.region', 'journal', 'Area type label region', 'Region', 'text', true, true, '{}', false),
  ('journal.place_context.weather.condition.clear', 'journal', 'Weather condition clear sky', 'Clear sky', 'text', true, true, '{}', false),
  ('journal.place_context.weather.condition.mainly_clear', 'journal', 'Weather condition mainly clear', 'Mainly clear', 'text', true, true, '{}', false),
  ('journal.place_context.weather.condition.partly_cloudy', 'journal', 'Weather condition partly cloudy', 'Partly cloudy', 'text', true, true, '{}', false),
  ('journal.place_context.weather.condition.overcast', 'journal', 'Weather condition overcast', 'Overcast', 'text', true, true, '{}', false),
  ('journal.place_context.weather.condition.fog', 'journal', 'Weather condition fog', 'Fog', 'text', true, true, '{}', false),
  ('journal.place_context.weather.condition.drizzle', 'journal', 'Weather condition drizzle', 'Drizzle', 'text', true, true, '{}', false),
  ('journal.place_context.weather.condition.rain', 'journal', 'Weather condition rain', 'Rain', 'text', true, true, '{}', false),
  ('journal.place_context.weather.condition.snow', 'journal', 'Weather condition snow', 'Snow', 'text', true, true, '{}', false),
  ('journal.place_context.weather.condition.thunderstorm', 'journal', 'Weather condition thunderstorm', 'Thunderstorm', 'text', true, true, '{}', false),
  ('journal.place_context.weather.condition.unknown', 'journal', 'Weather condition unknown', 'Current conditions', 'text', true, true, '{}', false)
on conflict (translation_key) do update
set default_text = excluded.default_text,
    description = excluded.description,
    is_active = true,
    updated_at = now();

-- Seed English for every active language missing a row (UI chrome; editorial POI/place copy comes from entity tables)
insert into public.website_translations
  (translation_key_id, language_code, translated_text, translation_status, translation_source, translated_at, reviewed_at, published_at)
select k.id, sl.code, k.default_text, 'published', 'manual', now(), now(), now()
from public.website_translation_keys k
cross join public.site_languages sl
where k.translation_key like 'journal.place_context.%'
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
    ('journal.place_context.section.title','es','Sobre este lugar'),
    ('journal.place_context.place.history_heading','es','Historia e información'),
    ('journal.place_context.area.history_heading','es','Historia del área'),
    ('journal.place_context.poi.heading','es','Puntos de interés cercanos'),
    ('journal.place_context.weather.heading','es','Clima actual'),
    ('journal.place_context.weather.loading','es','Cargando el clima actual…'),
    ('journal.place_context.weather.error','es','El clima no está disponible temporalmente.'),
    ('journal.place_context.weather.temperature','es','Temperatura'),
    ('journal.place_context.weather.feels_like','es','Sensación térmica'),
    ('journal.place_context.weather.wind','es','Viento'),
    ('journal.place_context.weather.humidity','es','Humedad'),
    ('journal.place_context.links.google_maps','es','Google Maps'),
    ('journal.place_context.links.instagram','es','Instagram'),
    ('journal.place_context.links.website','es','Sitio web'),
    ('journal.place_context.place_type.restaurant','es','Restaurante'),
    ('journal.place_context.place_type.bar','es','Bar'),
    ('journal.place_context.place_type.cafe','es','Cafetería'),
    ('journal.place_context.place_type.hotel','es','Hotel'),
    ('journal.place_context.place_type.shop','es','Tienda'),
    ('journal.place_context.place_type.venue','es','Local'),
    ('journal.place_context.place_type.other','es','Lugar'),
    ('journal.place_context.area_type.city','es','Ciudad'),
    ('journal.place_context.area_type.village','es','Pueblo'),
    ('journal.place_context.area_type.town','es','Ciudad'),
    ('journal.place_context.area_type.region','es','Región'),
    ('journal.place_context.weather.condition.clear','es','Cielo despejado'),
    ('journal.place_context.weather.condition.mainly_clear','es','Mayormente despejado'),
    ('journal.place_context.weather.condition.partly_cloudy','es','Parcialmente nublado'),
    ('journal.place_context.weather.condition.overcast','es','Nublado'),
    ('journal.place_context.weather.condition.fog','es','Niebla'),
    ('journal.place_context.weather.condition.drizzle','es','Llovizna'),
    ('journal.place_context.weather.condition.rain','es','Lluvia'),
    ('journal.place_context.weather.condition.snow','es','Nieve'),
    ('journal.place_context.weather.condition.thunderstorm','es','Tormenta'),
    ('journal.place_context.weather.condition.unknown','es','Condiciones actuales')
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

-- Arabic overrides
with catalog(translation_key, language_code, translated_text) as (
  values
    ('journal.place_context.section.title','ar','حول هذا المكان'),
    ('journal.place_context.place.history_heading','ar','التاريخ والمعلومات'),
    ('journal.place_context.area.history_heading','ar','تاريخ المنطقة'),
    ('journal.place_context.poi.heading','ar','معالم قريبة'),
    ('journal.place_context.weather.heading','ar','الطقس الحالي'),
    ('journal.place_context.weather.loading','ar','جارٍ تحميل الطقس الحالي…'),
    ('journal.place_context.weather.error','ar','الطقس غير متاح مؤقتًا.'),
    ('journal.place_context.weather.temperature','ar','درجة الحرارة'),
    ('journal.place_context.weather.feels_like','ar','الإحساس الحراري'),
    ('journal.place_context.weather.wind','ar','الرياح'),
    ('journal.place_context.weather.humidity','ar','الرطوبة'),
    ('journal.place_context.links.google_maps','ar','خرائط Google'),
    ('journal.place_context.links.instagram','ar','إنستغرام'),
    ('journal.place_context.links.website','ar','الموقع'),
    ('journal.place_context.place_type.restaurant','ar','مطعم'),
    ('journal.place_context.place_type.bar','ar','بار'),
    ('journal.place_context.place_type.cafe','ar','مقهى'),
    ('journal.place_context.place_type.hotel','ar','فندق'),
    ('journal.place_context.place_type.shop','ar','متجر'),
    ('journal.place_context.place_type.venue','ar','مكان'),
    ('journal.place_context.place_type.other','ar','مكان'),
    ('journal.place_context.area_type.city','ar','مدينة'),
    ('journal.place_context.area_type.village','ar','قرية'),
    ('journal.place_context.area_type.town','ar','بلدة'),
    ('journal.place_context.area_type.region','ar','منطقة'),
    ('journal.place_context.weather.condition.clear','ar','سماء صافية'),
    ('journal.place_context.weather.condition.mainly_clear','ar','صافٍ غالبًا'),
    ('journal.place_context.weather.condition.partly_cloudy','ar','غائم جزئيًا'),
    ('journal.place_context.weather.condition.overcast','ar','غائم'),
    ('journal.place_context.weather.condition.fog','ar','ضباب'),
    ('journal.place_context.weather.condition.drizzle','ar','رذاذ'),
    ('journal.place_context.weather.condition.rain','ar','مطر'),
    ('journal.place_context.weather.condition.snow','ar','ثلج'),
    ('journal.place_context.weather.condition.thunderstorm','ar','عاصفة رعدية'),
    ('journal.place_context.weather.condition.unknown','ar','الأحوال الحالية')
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
