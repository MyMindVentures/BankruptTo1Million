-- Complete the public component registry and 30-language bootstrap for the
-- Breakfast for a Story page introduced in 20260722093000.

begin;

insert into public.website_translation_keys
  (translation_key, namespace, description, default_text, value_type, is_required, is_active, interpolation_variables, supports_plural)
values
  (
    'breakfast_for_story.values_aria',
    'breakfast_for_story',
    'Accessible label for the list of value offered in return',
    'What we give in return',
    'text',
    true,
    true,
    '{}'::text[],
    false
  )
on conflict (translation_key) do update set
  namespace = excluded.namespace,
  description = excluded.description,
  default_text = excluded.default_text,
  is_required = excluded.is_required,
  is_active = true,
  updated_at = now();

-- The original migration contains reviewed English, Dutch, and Spanish copy.
-- Preserve those rows while ensuring that every active site language has a
-- published row for every key before the component becomes public.
insert into public.website_translations
  (translation_key_id, language_code, translated_text, translation_status, translation_source, translated_at, reviewed_at, published_at)
select
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
  and k.translation_key = any(array[
    'navigation.breakfast_for_a_story',
    'breakfast_for_story.eyebrow',
    'breakfast_for_story.title',
    'breakfast_for_story.introduction',
    'breakfast_for_story.question',
    'breakfast_for_story.exchange',
    'breakfast_for_story.no_charity',
    'breakfast_for_story.value.photos',
    'breakfast_for_story.value.story',
    'breakfast_for_story.value.visibility',
    'breakfast_for_story.values_aria',
    'breakfast_for_story.closing',
    'breakfast_for_story.website_label'
  ])
on conflict (translation_key_id, language_code) do nothing;

insert into public.website_ui_components
  (component_key, source_path, export_name, surface_type, namespace, is_public, entity_content, coverage_status)
values
  (
    'pages.breakfast.for.a.story',
    'src/pages/BreakfastForAStoryPage.tsx',
    'BreakfastForAStoryPage',
    'page',
    'breakfast_for_story',
    true,
    '{}'::jsonb,
    'connected'
  )
on conflict (component_key) do update set
  source_path = excluded.source_path,
  export_name = excluded.export_name,
  surface_type = excluded.surface_type,
  namespace = excluded.namespace,
  is_public = excluded.is_public,
  entity_content = excluded.entity_content,
  coverage_status = excluded.coverage_status,
  updated_at = now();

insert into public.website_ui_component_translation_keys
  (component_id, translation_key_id, usage_kind, is_required)
select c.id, k.id, 'label', true
from public.website_ui_components c
cross join lateral (
  values
    ('breakfast_for_story.eyebrow'),
    ('breakfast_for_story.title'),
    ('breakfast_for_story.introduction'),
    ('breakfast_for_story.question'),
    ('breakfast_for_story.exchange'),
    ('breakfast_for_story.no_charity'),
    ('breakfast_for_story.value.photos'),
    ('breakfast_for_story.value.story'),
    ('breakfast_for_story.value.visibility'),
    ('breakfast_for_story.values_aria'),
    ('breakfast_for_story.closing'),
    ('breakfast_for_story.website_label')
) as v(translation_key)
join public.website_translation_keys k on k.translation_key = v.translation_key
where c.component_key = 'pages.breakfast.for.a.story'
on conflict (component_id, translation_key_id) do update set
  usage_kind = excluded.usage_kind,
  is_required = excluded.is_required,
  updated_at = now();

commit;
