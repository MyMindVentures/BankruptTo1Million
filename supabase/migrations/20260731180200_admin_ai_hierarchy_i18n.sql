begin;

insert into public.website_translation_keys
  (translation_key, namespace, description, default_text, value_type, is_required, is_active, interpolation_variables, supports_plural)
values
  ('admin.ai_hierarchy.eyebrow','admin.ai_hierarchy','Admin hierarchy eyebrow','AI GOVERNANCE','text',true,true,'{}',false),
  ('admin.ai_hierarchy.title','admin.ai_hierarchy','Admin hierarchy title','Live AI hierarchy','text',true,true,'{}',false),
  ('admin.ai_hierarchy.description','admin.ai_hierarchy','Admin hierarchy description','Read-only view of agents, teams and reporting relationships from Supabase.','text',true,true,'{}',false),
  ('admin.ai_hierarchy.loading','admin.ai_hierarchy','Admin hierarchy loading state','Loading the live AI hierarchy…','text',true,true,'{}',false),
  ('admin.ai_hierarchy.error','admin.ai_hierarchy','Admin hierarchy error state','The AI hierarchy could not be loaded.','text',true,true,'{}',false),
  ('admin.ai_hierarchy.empty','admin.ai_hierarchy','Admin hierarchy empty state','No AI agents are available.','text',true,true,'{}',false),
  ('admin.ai_hierarchy.refresh','admin.ai_hierarchy','Admin hierarchy refresh action','Refresh','text',true,true,'{}',false),
  ('admin.ai_hierarchy.graph_label','admin.ai_hierarchy','Admin hierarchy graph accessible label','Mermaid diagram of the live AI hierarchy','text',true,true,'{}',false),
  ('admin.ai_hierarchy.diagnostics','admin.ai_hierarchy','Admin hierarchy diagnostics label','Hierarchy diagnostics','text',true,true,'{}',false),
  ('admin.ai_hierarchy.cycles','admin.ai_hierarchy','Admin hierarchy cycle diagnostic','Cycles detected','text',true,true,'{}',false),
  ('admin.ai_hierarchy.orphans','admin.ai_hierarchy','Admin hierarchy orphan diagnostic','Orphaned agents','text',true,true,'{}',false),
  ('admin.ai_hierarchy.team','admin.ai_hierarchy','Admin hierarchy team label','Team','text',true,true,'{}',false)
on conflict (translation_key) do update set
  namespace=excluded.namespace, description=excluded.description, default_text=excluded.default_text,
  is_required=true, is_active=true, updated_at=now();

insert into public.website_translations
  (translation_key_id, language_code, translated_text, translation_status, translation_source, translated_at, reviewed_at, published_at)
select k.id, sl.code, k.default_text, 'published', 'bootstrap', now(), now(), now()
from public.website_translation_keys k
cross join public.site_languages sl
where sl.is_active = true
  and k.translation_key = any(array[
    'admin.ai_hierarchy.eyebrow','admin.ai_hierarchy.title','admin.ai_hierarchy.description',
    'admin.ai_hierarchy.loading','admin.ai_hierarchy.error','admin.ai_hierarchy.empty',
    'admin.ai_hierarchy.refresh','admin.ai_hierarchy.graph_label','admin.ai_hierarchy.diagnostics',
    'admin.ai_hierarchy.cycles','admin.ai_hierarchy.orphans','admin.ai_hierarchy.team'
  ])
on conflict (translation_key_id, language_code) do update set
  translated_text=excluded.translated_text, translation_status='published', translation_source='bootstrap',
  translated_at=now(), reviewed_at=now(), published_at=now(), updated_at=now();

insert into public.website_ui_components
  (component_key, source_path, export_name, surface_type, namespace, is_public, entity_content, coverage_status)
values
  ('admin.ai_hierarchy.page','src/pages/AdminAiHierarchyPage.tsx','AdminAiHierarchyPage','admin','admin.ai_hierarchy',false,
   '{"rpc":"admin_get_ai_hierarchy","tables":["ai_agents","ai_teams"]}'::jsonb,'connected')
on conflict (component_key) do update set
  source_path=excluded.source_path, export_name=excluded.export_name, namespace=excluded.namespace,
  is_public=false, entity_content=excluded.entity_content, coverage_status='connected', updated_at=now();

insert into public.website_ui_component_translation_keys (component_id, translation_key_id, usage_kind, is_required)
select c.id, k.id, 'label', true
from public.website_ui_components c
join public.website_translation_keys k on k.translation_key = any(array[
  'admin.ai_hierarchy.eyebrow','admin.ai_hierarchy.title','admin.ai_hierarchy.description',
  'admin.ai_hierarchy.loading','admin.ai_hierarchy.error','admin.ai_hierarchy.empty',
  'admin.ai_hierarchy.refresh','admin.ai_hierarchy.graph_label','admin.ai_hierarchy.diagnostics',
  'admin.ai_hierarchy.cycles','admin.ai_hierarchy.orphans','admin.ai_hierarchy.team'
])
where c.component_key='admin.ai_hierarchy.page'
on conflict (component_id, translation_key_id) do update set usage_kind='label', is_required=true, updated_at=now();

commit;
