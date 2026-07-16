-- Register generate-outreach-ai-content in the AI edge function control plane.

begin;

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
  'generate-outreach-ai-content',
  'Generate outreach page copy',
  'Generates personalized private outreach page copy for a single campaign language from verified admin brief and contact context.',
  provider,
  model,
  model_env_key,
  'You generate concise, personalized outreach page copy as valid JSON only. Write in the requested language. No markdown. Plain text only.',
  'Write a private, personalized outreach page for Bankrupt to 1 Million — a living documentary and community platform about rebuilding honestly.

Return exactly one JSON object with these string fields:
- personal_intro (warm greeting, 2-4 sentences)
- why_them (why this company/person is a fit, 3-5 sentences)
- what_we_offer (what Bankrupt to 1 Million can offer them, 3-5 sentences)
- what_we_ask (a clear, respectful ask, 2-4 sentences)
- win_win (mutual benefit framing, 2-4 sentences)
- personal_message (short closing note for the page, 2-3 sentences)
- mission_blurb (1-2 sentences about the mission, honest and non-salesy)

Tone: personal, credible, founder-to-founder. No hype.',
  0.7,
  4096,
  '{"type":"json_object"}'::jsonb,
  jsonb_build_object(
    'field_max_characters', 4000,
    'max_attempts', 3
  ),
  '{"required":["campaign_id"]}'::jsonb,
  '{"required":["ok","campaign_id","language_code"]}'::jsonb,
  secret_env_key,
  'index.ts',
  true,
  true,
  false,
  1,
  'Dedicated AI edge function for private outreach page copy. Runtime-configured through get_ai_edge_function_runtime_config.',
  jsonb_build_object(
    'domain', 'outreach',
    'feature', 'ai_page_copy',
    'architecture', 'thin_edge_function',
    'runtime_config_implemented', true,
    'writes_tables', jsonb_build_array(
      'outreach_pages',
      'outreach_campaigns',
      'outreach_ai_sources'
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
  temperature = excluded.temperature,
  max_output_tokens = excluded.max_output_tokens,
  response_format = excluded.response_format,
  generation_settings = excluded.generation_settings,
  input_schema = excluded.input_schema,
  output_schema = excluded.output_schema,
  metadata = excluded.metadata,
  timeout_ms = excluded.timeout_ms,
  retry_policy = excluded.retry_policy,
  enable_run_logging = excluded.enable_run_logging,
  verify_jwt = excluded.verify_jwt,
  is_active = true,
  updated_at = now();

commit;
