-- Widen place/area history acceptance ranges and add Romance-language overrides
-- so minor AI overshoots (e.g. es place_history at 832 chars) no longer block publication.

update public.ai_edge_function_configs
set
  config_version = config_version + 1,
  user_prompt_template = 'Create place and area context for the journal event location in all configured languages. Describe the featured venue, the surrounding town or city, and five nearby points of interest that a visitor could explore. Keep prose concise, readable and dignified. Target the preferred character ranges in generation settings; never exceed the accepted hard maximum for any field.',
  generation_settings = coalesce(generation_settings, '{}'::jsonb)
    || jsonb_build_object('length_soft_margin', 50)
    || jsonb_build_object(
      'place_history_characters',
      jsonb_build_object(
        'min', 150,
        'max', 900,
        'preferred_min', 150,
        'preferred_max', 750
      )
    )
    || jsonb_build_object(
      'area_history_characters',
      jsonb_build_object(
        'min', 200,
        'max', 1400,
        'preferred_min', 200,
        'preferred_max', 1100
      )
    )
    || jsonb_build_object(
      'poi_description_characters',
      jsonb_build_object(
        'min', 80,
        'max', 450,
        'preferred_min', 80,
        'preferred_max', 350
      )
    )
    || jsonb_build_object(
      'thank_you_characters',
      jsonb_build_object(
        'min', 150,
        'max', 700,
        'preferred_min', 180,
        'preferred_max', 650
      )
    )
    || jsonb_build_object(
      'place_history_by_language',
      coalesce(generation_settings->'place_history_by_language', '{}'::jsonb)
        || jsonb_build_object(
          'es', jsonb_build_object('min', 150, 'max', 900, 'preferred_min', 150, 'preferred_max', 750),
          'fr', jsonb_build_object('min', 150, 'max', 900, 'preferred_min', 150, 'preferred_max', 750),
          'pt', jsonb_build_object('min', 150, 'max', 900, 'preferred_min', 150, 'preferred_max', 750),
          'it', jsonb_build_object('min', 150, 'max', 900, 'preferred_min', 150, 'preferred_max', 750),
          'de', jsonb_build_object('min', 150, 'max', 900, 'preferred_min', 150, 'preferred_max', 750),
          'nl', jsonb_build_object('min', 150, 'max', 900, 'preferred_min', 150, 'preferred_max', 750)
        )
    )
    || jsonb_build_object(
      'area_history_by_language',
      coalesce(generation_settings->'area_history_by_language', '{}'::jsonb)
        || jsonb_build_object(
          'es', jsonb_build_object('min', 200, 'max', 1400, 'preferred_min', 200, 'preferred_max', 1100),
          'fr', jsonb_build_object('min', 200, 'max', 1400, 'preferred_min', 200, 'preferred_max', 1100),
          'pt', jsonb_build_object('min', 200, 'max', 1400, 'preferred_min', 200, 'preferred_max', 1100),
          'it', jsonb_build_object('min', 200, 'max', 1400, 'preferred_min', 200, 'preferred_max', 1100),
          'de', jsonb_build_object('min', 200, 'max', 1400, 'preferred_min', 200, 'preferred_max', 1100),
          'nl', jsonb_build_object('min', 200, 'max', 1400, 'preferred_min', 200, 'preferred_max', 1100),
          'hi', jsonb_build_object('min', 120, 'max', 1400, 'preferred_min', 120, 'preferred_max', 1100),
          'ar', jsonb_build_object('min', 150, 'max', 1400, 'preferred_min', 150, 'preferred_max', 1100),
          'zh', jsonb_build_object('min', 100, 'max', 1400, 'preferred_min', 100, 'preferred_max', 1100)
        )
    ),
  updated_at = now()
where edge_function_slug = 'generate-journal-place-context';
