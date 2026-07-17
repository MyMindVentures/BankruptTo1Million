-- Tighten preferred place_history ranges for compact scripts and raise hard maxima
-- so Hindi/Chinese/Arabic overshoots can soft-clamp instead of failing publication.

update public.ai_edge_function_configs
set
  config_version = config_version + 1,
  user_prompt_template = 'Create place and area context for the journal event location in all configured languages. Describe the featured venue, the surrounding town or city, and five nearby points of interest that a visitor could explore. Keep prose concise, readable and dignified. For hi, zh, and ar especially, stay near the preferred character targets and never exceed the accepted hard maximum for any field. Target the preferred character ranges in generation settings.',
  generation_settings = coalesce(generation_settings, '{}'::jsonb)
    || jsonb_build_object('length_soft_margin', 80)
    || jsonb_build_object(
      'place_history_by_language',
      coalesce(generation_settings->'place_history_by_language', '{}'::jsonb)
        || jsonb_build_object(
          'hi', jsonb_build_object(
            'min', 100,
            'max', 850,
            'preferred_min', 120,
            'preferred_max', 480
          ),
          'zh', jsonb_build_object(
            'min', 80,
            'max', 650,
            'preferred_min', 80,
            'preferred_max', 360
          ),
          'ar', jsonb_build_object(
            'min', 120,
            'max', 850,
            'preferred_min', 120,
            'preferred_max', 520
          )
        )
    ),
  updated_at = now()
where edge_function_slug = 'generate-journal-place-context';
