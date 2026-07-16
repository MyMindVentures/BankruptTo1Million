begin;

insert into public.website_translation_keys
  (translation_key, namespace, description, default_text, value_type, is_required, is_active, interpolation_variables, supports_plural)
values
  ('content_card.read_time', 'content_card', 'Reading time label for premium content cards', '{minutes} min read', 'text', true, true, '{"minutes":"number"}', false)
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
where k.translation_key = any(array['content_card.read_time'])
  and sl.is_active = true
on conflict (translation_key_id, language_code) do update set
  translated_text = excluded.translated_text,
  translation_status = 'published',
  translation_source = 'manual',
  translated_at = now(),
  reviewed_at = now(),
  published_at = now(),
  updated_at = now();

insert into public.website_ui_components
  (component_key, source_path, export_name, surface_type, namespace, is_public, entity_content, coverage_status)
values
  ('components.journal.post.card', 'src/components/journal/JournalPostCard.tsx', 'JournalPostCard', 'component', 'content_card', true, '{"tables":["journal_posts","journal_translations","journal_categories","journal_category_translations"]}', 'connected')
on conflict (component_key) do update set
  source_path = excluded.source_path,
  export_name = excluded.export_name,
  namespace = excluded.namespace,
  is_public = excluded.is_public,
  entity_content = excluded.entity_content,
  coverage_status = excluded.coverage_status,
  updated_at = now();

insert into public.website_ui_component_translation_keys (component_id, translation_key_id, usage_kind, is_required)
select c.id, k.id, v.usage_kind, true
from public.website_ui_components c
cross join lateral (
  values
    ('components.journal.post.card', 'content_card.category.journal', 'label'),
    ('components.journal.post.card', 'content_card.read_time', 'label'),
    ('components.aceternity.content.card', 'content_card.read_time', 'label')
) as v(component_key, translation_key, usage_kind)
join public.website_translation_keys k on k.translation_key = v.translation_key
where c.component_key = v.component_key
on conflict (component_id, translation_key_id) do update set
  usage_kind = excluded.usage_kind,
  is_required = excluded.is_required,
  updated_at = now();

insert into public.website_translation_key_usage (translation_key_id, source_path, source_identifier, migration_status, notes)
select k.id, 'supabase/migrations/20260718180000_journal_post_card_premium_ui.sql', k.translation_key, 'seeded', 'Premium journal post card reading-time copy'
from public.website_translation_keys k
where k.translation_key = any(array['content_card.read_time'])
on conflict do nothing;

commit;
