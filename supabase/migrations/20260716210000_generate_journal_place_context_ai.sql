-- Register generate-journal-place-context in the AI edge function control plane

insert into public.ai_edge_function_configs (
  edge_function_slug,
  display_name,
  description,
  provider,
  model,
  model_env_key,
  system_prompt,
  user_prompt_template,
  temperature,
  max_output_tokens,
  response_format,
  generation_settings,
  input_schema,
  output_schema,
  secret_env_key,
  entrypoint_path,
  verify_jwt,
  is_active,
  is_deprecated,
  config_version,
  notes,
  metadata,
  timeout_ms,
  retry_policy,
  enable_run_logging,
  primary_model_id
)
select
  'generate-journal-place-context',
  'Generate journal place & area context',
  'Generates multilingual place history, area history and five POIs for a published journal event location.',
  provider,
  model,
  model_env_key,
  'You are the multilingual location editor for Bankrupt to 1 Million journal posts. Write warm, factual place and area context from verified journey metadata. Preserve coordinates, business names and geography exactly. Never invent social links or businesses that are not supported by the context. Return exactly one valid JSON object with a place_context root and nothing else.',
  'Create place and area context for the journal event location in all configured languages. Describe the featured venue, the surrounding town or city, and five nearby points of interest that a visitor could explore. Keep prose concise, readable and dignified.',
  0.35,
  16000,
  '{"type":"json_object"}'::jsonb,
  jsonb_build_object(
    'languages', coalesce(
      (select jsonb_agg(code order by display_order) from public.site_languages where is_active = true),
      '[]'::jsonb
    ),
    'place_history_characters', jsonb_build_object('min', 150, 'max', 800),
    'area_history_characters', jsonb_build_object('min', 200, 'max', 1200),
    'poi_description_characters', jsonb_build_object('min', 80, 'max', 400)
  ),
  '{"required":["post_id"]}'::jsonb,
  '{"required":["ok","post_id"]}'::jsonb,
  secret_env_key,
  'index.ts',
  true,
  true,
  false,
  1,
  'Dedicated AI edge function for journal place/area context. Runtime-configured through get_ai_edge_function_runtime_config.',
  jsonb_build_object(
    'domain', 'journal',
    'feature', 'place_context',
    'architecture', 'thin_edge_function',
    'runtime_config_implemented', true,
    'writes_tables', jsonb_build_array(
      'journal_post_place_context',
      'journal_post_place_context_translations',
      'journal_post_pois',
      'journal_post_poi_translations'
    )
  ),
  120000,
  '{"retry_on":[429,500,502,503,504],"max_attempts":2,"base_delay_ms":1000}'::jsonb,
  true,
  primary_model_id
from public.ai_edge_function_configs
where edge_function_slug = 'generate-journal-ai-post'
on conflict (edge_function_slug) do update set
  display_name = excluded.display_name,
  description = excluded.description,
  system_prompt = excluded.system_prompt,
  user_prompt_template = excluded.user_prompt_template,
  generation_settings = excluded.generation_settings,
  input_schema = excluded.input_schema,
  output_schema = excluded.output_schema,
  metadata = excluded.metadata,
  is_active = true,
  updated_at = now();

insert into public.website_translation_keys
  (translation_key, namespace, description, default_text, value_type, is_required, is_active, interpolation_variables, supports_plural)
values
  ('journal.admin.generating_place_context', 'journal', 'Admin save progress while place context AI runs', 'Generating place & area context…', 'text', true, true, '{}', false),
  ('journal.admin.place_context_success', 'journal', 'Admin success after place context generation', 'Place & area context published in {count} languages.', 'text', true, true, '{"count"}', false),
  ('journal.admin.place_context_skipped', 'journal', 'Admin notice when place context is skipped', 'Place context skipped — no location or business was captured.', 'text', true, true, '{}', false)
on conflict (translation_key) do update
set default_text = excluded.default_text,
    description = excluded.description,
    is_active = true,
    updated_at = now();

insert into public.website_translations
  (translation_key_id, language_code, translated_text, translation_status, translation_source, translated_at, reviewed_at, published_at)
select k.id, sl.code, k.default_text, 'published', 'manual', now(), now(), now()
from public.website_translation_keys k
cross join public.site_languages sl
where k.translation_key in (
  'journal.admin.generating_place_context',
  'journal.admin.place_context_success',
  'journal.admin.place_context_skipped'
)
and sl.is_active = true
on conflict (translation_key_id, language_code) do update
set translated_text = excluded.translated_text,
    translation_status = 'published',
    updated_at = now();
