-- Link deployed Supabase edge function UUID to AI control plane config
UPDATE public.ai_edge_function_configs
SET edge_function_id = 'a0bce17e-2a13-4172-a4e7-af77d3eeabe6',
    updated_at = now()
WHERE edge_function_slug = 'generate-journal-place-context'
  AND (edge_function_id IS NULL OR edge_function_id <> 'a0bce17e-2a13-4172-a4e7-af77d3eeabe6');
