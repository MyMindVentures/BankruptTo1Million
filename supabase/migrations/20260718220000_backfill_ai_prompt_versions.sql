-- Backfill initial ai_prompt_versions for functions registered with config-level prompts only.

begin;

insert into public.ai_prompt_versions (
  edge_function_config_id,
  version,
  name,
  system_prompt,
  user_prompt_template,
  change_summary,
  is_active
)
select
  c.id,
  1,
  'Initial registered prompt',
  c.system_prompt,
  c.user_prompt_template,
  'Backfilled from ai_edge_function_configs during prompt version normalization.',
  true
from public.ai_edge_function_configs c
where c.edge_function_slug in (
  'generate-journal-place-context',
  'generate-journal-venue-thank-you',
  'generate-outreach-ai-content'
)
  and nullif(trim(c.system_prompt), '') is not null
  and not exists (
    select 1
    from public.ai_prompt_versions pv
    where pv.edge_function_config_id = c.id
  );

update public.ai_edge_function_configs c
set
  active_prompt_version_id = pv.id,
  updated_at = now()
from public.ai_prompt_versions pv
where pv.edge_function_config_id = c.id
  and pv.version = 1
  and pv.name = 'Initial registered prompt'
  and c.edge_function_slug in (
    'generate-journal-place-context',
    'generate-journal-venue-thank-you',
    'generate-outreach-ai-content'
  )
  and c.active_prompt_version_id is null;

commit;
