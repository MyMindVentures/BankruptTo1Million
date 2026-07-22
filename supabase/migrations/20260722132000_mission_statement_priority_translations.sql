-- Priority market translations for issue #217.
-- Production currently contains complete six-block translations for nl, es, fr and de,
-- plus localized hero/core blocks for it, pt, ar, zh and hi.

begin;

-- This migration records the completed translation rollout applied through Supabase.
-- Content remains canonical in website_page_block_translations; no frontend copy is duplicated.

update public.website_pages
set metadata = metadata || jsonb_build_object(
  'translation_rollout', jsonb_build_object(
    'fully_localized', jsonb_build_array('nl','es','fr','de'),
    'priority_localized', jsonb_build_array('it','pt','ar','zh','hi'),
    'updated_at', now()
  )
)
where slug = 'mission-statement';

commit;
