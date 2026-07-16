-- Register journal POI map surfaces in the public UI component registry.

begin;

insert into public.website_ui_components
  (component_key, source_path, export_name, surface_type, namespace, is_public, entity_content, coverage_status)
values
  ('journal.poi.map', 'src/components/journal/JournalPoiMap.tsx', 'JournalPoiMap', 'component', 'journal.place_context.map', true, null, 'connected'),
  ('journal.poi.map.detail.card', 'src/components/journal/JournalPoiMapDetailCard.tsx', 'JournalPoiMapDetailCard', 'component', 'journal.place_context', true, null, 'connected')
on conflict (component_key) do update set
  source_path = excluded.source_path,
  export_name = excluded.export_name,
  surface_type = excluded.surface_type,
  namespace = excluded.namespace,
  is_public = excluded.is_public,
  entity_content = excluded.entity_content,
  coverage_status = excluded.coverage_status,
  updated_at = now();

insert into public.website_ui_component_translation_keys (component_id, translation_key_id, usage_kind, is_required)
select c.id, k.id, v.usage_kind, true
from (
  values
    ('journal.poi.map', 'journal.place_context.map.card.close_label', 'aria'),
    ('journal.poi.map', 'journal.place_context.map.card.order', 'label'),
    ('journal.poi.map', 'journal.place_context.map.error', 'error'),
    ('journal.poi.map', 'journal.place_context.map.heading', 'label'),
    ('journal.poi.map', 'journal.place_context.map.open_in_maps', 'label'),
    ('journal.poi.map', 'journal.place_context.map.poi_pin', 'aria'),
    ('journal.poi.map', 'journal.place_context.map.venue_pin', 'aria'),
    ('journal.poi.map', 'journal.place_context.poi_type.culture', 'label'),
    ('journal.poi.map', 'journal.place_context.poi_type.food', 'label'),
    ('journal.poi.map', 'journal.place_context.poi_type.landmark', 'label'),
    ('journal.poi.map', 'journal.place_context.poi_type.museum', 'label'),
    ('journal.poi.map', 'journal.place_context.poi_type.nature', 'label'),
    ('journal.poi.map', 'journal.place_context.poi_type.other', 'label'),
    ('journal.poi.map.detail.card', 'journal.place_context.map.card.close_label', 'aria'),
    ('journal.poi.map.detail.card', 'journal.place_context.map.card.order', 'label'),
    ('journal.poi.map.detail.card', 'journal.place_context.map.open_in_maps', 'label'),
    ('journal.poi.map.detail.card', 'journal.place_context.poi_type.culture', 'label'),
    ('journal.poi.map.detail.card', 'journal.place_context.poi_type.food', 'label'),
    ('journal.poi.map.detail.card', 'journal.place_context.poi_type.landmark', 'label'),
    ('journal.poi.map.detail.card', 'journal.place_context.poi_type.museum', 'label'),
    ('journal.poi.map.detail.card', 'journal.place_context.poi_type.nature', 'label'),
    ('journal.poi.map.detail.card', 'journal.place_context.poi_type.other', 'label')
) as v(component_key, translation_key, usage_kind)
join public.website_ui_components c on c.component_key = v.component_key
join public.website_translation_keys k on k.translation_key = v.translation_key
on conflict (component_id, translation_key_id) do update set
  usage_kind = excluded.usage_kind,
  is_required = excluded.is_required,
  updated_at = now();

commit;
