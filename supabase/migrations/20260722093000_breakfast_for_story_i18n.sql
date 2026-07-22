begin;

insert into public.website_translation_keys
  (translation_key, namespace, description, default_text, value_type, is_required, is_active, interpolation_variables, supports_plural)
values
  ('navigation.breakfast_for_a_story', 'navigation', 'Navigation label for the Breakfast for a Story page', 'Breakfast for a Story', 'text', true, true, '{}', false),
  ('breakfast_for_story.eyebrow', 'breakfast_for_story', 'Breakfast exchange eyebrow', 'A simple exchange', 'text', true, true, '{}', false),
  ('breakfast_for_story.title', 'breakfast_for_story', 'Breakfast exchange page title', 'Breakfast for a Story', 'text', true, true, '{}', false),
  ('breakfast_for_story.introduction', 'breakfast_for_story', 'Introduction of Kevin and Micha', 'We are Kevin and Micha, rebuilding our lives from rock bottom while documenting every honest step of the journey.', 'text', true, true, '{}', false),
  ('breakfast_for_story.question', 'breakfast_for_story', 'Main breakfast exchange question', 'Would you be willing to offer us a simple breakfast?', 'text', true, true, '{}', false),
  ('breakfast_for_story.exchange', 'breakfast_for_story', 'Description of what is offered in return', 'In return, we will create beautiful photos, write an authentic Journal story about your place, and share it through our website and social channels.', 'text', true, true, '{}', false),
  ('breakfast_for_story.no_charity', 'breakfast_for_story', 'Clarification that this is a value exchange', 'We are not asking for charity. We want to create something valuable in return.', 'text', true, true, '{}', false),
  ('breakfast_for_story.value.photos', 'breakfast_for_story', 'Photos value item', 'Beautiful, authentic photos', 'text', true, true, '{}', false),
  ('breakfast_for_story.value.story', 'breakfast_for_story', 'Journal story value item', 'An honest Journal story', 'text', true, true, '{}', false),
  ('breakfast_for_story.value.visibility', 'breakfast_for_story', 'Online visibility value item', 'Visibility on our website and social media', 'text', true, true, '{}', false),
  ('breakfast_for_story.closing', 'breakfast_for_story', 'Breakfast exchange closing sentence', 'One breakfast can become a meaningful story that keeps travelling long after we leave.', 'text', true, true, '{}', false),
  ('breakfast_for_story.website_label', 'breakfast_for_story', 'Website label on the breakfast exchange page', 'bankruptto1million.com', 'text', true, true, '{}', false)
on conflict (translation_key) do update
set namespace = excluded.namespace,
    description = excluded.description,
    default_text = excluded.default_text,
    is_active = true,
    updated_at = now();

with catalog(translation_key, language_code, translated_text) as (
  values
    ('navigation.breakfast_for_a_story','en','Breakfast for a Story'),
    ('navigation.breakfast_for_a_story','nl','Ontbijt voor een verhaal'),
    ('navigation.breakfast_for_a_story','es','Desayuno por una historia'),

    ('breakfast_for_story.eyebrow','en','A simple exchange'),
    ('breakfast_for_story.eyebrow','nl','Een eenvoudige ruil'),
    ('breakfast_for_story.eyebrow','es','Un intercambio sencillo'),

    ('breakfast_for_story.title','en','Breakfast for a Story'),
    ('breakfast_for_story.title','nl','Ontbijt voor een verhaal'),
    ('breakfast_for_story.title','es','Desayuno por una historia'),

    ('breakfast_for_story.introduction','en','We are Kevin and Micha, rebuilding our lives from rock bottom while documenting every honest step of the journey.'),
    ('breakfast_for_story.introduction','nl','Wij zijn Kevin en Micha. We bouwen ons leven opnieuw op vanaf de bodem en leggen elke eerlijke stap van onze reis vast.'),
    ('breakfast_for_story.introduction','es','Somos Kevin y Micha. Estamos reconstruyendo nuestras vidas desde cero mientras documentamos con honestidad cada paso del camino.'),

    ('breakfast_for_story.question','en','Would you be willing to offer us a simple breakfast?'),
    ('breakfast_for_story.question','nl','Zou je ons een eenvoudig ontbijt willen aanbieden?'),
    ('breakfast_for_story.question','es','¿Estarías dispuesto a ofrecernos un desayuno sencillo?'),

    ('breakfast_for_story.exchange','en','In return, we will create beautiful photos, write an authentic Journal story about your place, and share it through our website and social channels.'),
    ('breakfast_for_story.exchange','nl','In ruil maken we mooie foto’s, schrijven we een authentiek Journal-verhaal over jouw zaak en delen we het via onze website en sociale kanalen.'),
    ('breakfast_for_story.exchange','es','A cambio, crearemos fotos bonitas, escribiremos una historia auténtica en nuestro Journal sobre tu local y la compartiremos en nuestra web y redes sociales.'),

    ('breakfast_for_story.no_charity','en','We are not asking for charity. We want to create something valuable in return.'),
    ('breakfast_for_story.no_charity','nl','We vragen niet om liefdadigheid. We willen in ruil iets waardevols creëren.'),
    ('breakfast_for_story.no_charity','es','No pedimos caridad. Queremos crear algo valioso a cambio.'),

    ('breakfast_for_story.value.photos','en','Beautiful, authentic photos'),
    ('breakfast_for_story.value.photos','nl','Mooie, authentieke foto’s'),
    ('breakfast_for_story.value.photos','es','Fotos bonitas y auténticas'),

    ('breakfast_for_story.value.story','en','An honest Journal story'),
    ('breakfast_for_story.value.story','nl','Een eerlijk Journal-verhaal'),
    ('breakfast_for_story.value.story','es','Una historia honesta en el Journal'),

    ('breakfast_for_story.value.visibility','en','Visibility on our website and social media'),
    ('breakfast_for_story.value.visibility','nl','Zichtbaarheid op onze website en sociale media'),
    ('breakfast_for_story.value.visibility','es','Visibilidad en nuestra web y redes sociales'),

    ('breakfast_for_story.closing','en','One breakfast can become a meaningful story that keeps travelling long after we leave.'),
    ('breakfast_for_story.closing','nl','Eén ontbijt kan een betekenisvol verhaal worden dat nog lang na ons vertrek blijft rondreizen.'),
    ('breakfast_for_story.closing','es','Un desayuno puede convertirse en una historia con significado que seguirá viajando mucho después de que nos vayamos.'),

    ('breakfast_for_story.website_label','en','bankruptto1million.com'),
    ('breakfast_for_story.website_label','nl','bankruptto1million.com'),
    ('breakfast_for_story.website_label','es','bankruptto1million.com')
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

commit;
