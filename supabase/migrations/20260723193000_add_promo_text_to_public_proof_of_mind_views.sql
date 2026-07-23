begin;

alter table public.proof_of_mind_concepts
  add column if not exists mega_promo_text text;

drop view if exists public.proof_of_mind_public_details;
drop view if exists public.proof_of_mind_public_teasers;

create view public.proof_of_mind_public_teasers
with (security_invoker = true)
as
select
  c.id, c.slug, c.title, c.tagline, c.short_description, c.innovation_summary, c.concept_score,
  c.mega_promo_text,
  (select round(avg(ce.score), 2) from public.concept_evaluations ce where ce.concept_id = c.id) as evaluation_average_score,
  c.problems_solved, c.key_features, c.concept_type, c.concept_format, c.delivery_model, c.primary_market,
  c.physical_location_required, c.category, c.tags, c.concept_status, c.visibility, c.is_featured, c.display_order,
  c.cover_image_url, c.cover_image_alt, c.original_language, c.published_at, c.updated_at, c.competition_summary,
  c.competition_comparisons,
  (select pc.our_advantage from public.proof_of_mind_competitors pc where pc.concept_id = c.id and pc.is_public = true and pc.our_advantage is not null order by pc.display_order limit 1) as competitive_advantage,
  (select jsonb_build_object('name', f.display_name, 'full_name', f.full_name, 'role', coalesce(cf.founder_role, f.role_title), 'is_original_creator', cf.is_original_creator, 'bio', f.bio)
     from public.proof_of_mind_concept_founders cf join public.concept_founders f on f.id = cf.founder_id
    where cf.concept_id = c.id and f.is_public = true order by cf.display_order limit 1) as founder,
  coalesce((select jsonb_agg(jsonb_build_object('name', f.display_name, 'full_name', f.full_name, 'role', coalesce(cf.founder_role, f.role_title), 'is_original_creator', cf.is_original_creator, 'bio', f.bio) order by cf.display_order)
     from public.proof_of_mind_concept_founders cf join public.concept_founders f on f.id = cf.founder_id
    where cf.concept_id = c.id and f.is_public = true), '[]'::jsonb) as founders,
  jsonb_build_object('average_score', (select round(avg(ce.score), 2) from public.concept_evaluations ce where ce.concept_id = c.id),
    'criteria', coalesce((select jsonb_agg(jsonb_build_object('criterion', ec.criterion_name, 'score', ce.score, 'assessment', ce.assessment, 'risks', case when ce.risks is null then '[]'::jsonb else jsonb_build_array(ce.risks) end, 'improvement_actions', ce.improvement_actions) order by ec.display_order)
      from public.concept_evaluations ce join public.concept_evaluation_criteria ec on ec.id = ce.criterion_id where ce.concept_id = c.id and ec.is_active = true), '[]'::jsonb)) as evaluation_summary,
  jsonb_build_object('count', (select count(*) from public.proof_of_mind_competitors pc where pc.concept_id = c.id and pc.is_public = true),
    'summary', c.competition_summary,
    'competitive_advantage', (select pc.our_advantage from public.proof_of_mind_competitors pc where pc.concept_id = c.id and pc.is_public = true and pc.our_advantage is not null order by pc.display_order limit 1),
    'comparisons', coalesce((select jsonb_agg(jsonb_build_object('name', pc.competitor_name, 'product', pc.competitor_product, 'similarities', pc.similarities, 'differences', pc.differences, 'our_advantage', pc.our_advantage, 'competitor_advantage', pc.competitor_advantage, 'strategic_risk', pc.strategic_risk) order by pc.display_order)
      from public.proof_of_mind_competitors pc where pc.concept_id = c.id and pc.is_public = true), '[]'::jsonb)) as competition_summary_data,
  jsonb_build_object('category_count', (select count(*) from public.concept_lead_categories lc where lc.concept_id = c.id and lc.is_active = true),
    'target_slots', (select count(*) from public.concept_lead_targets lt where lt.concept_id = c.id),
    'identified_leads', (select count(*) from public.concept_lead_targets lt where lt.concept_id = c.id and lt.research_status = any(array['identified','researched','verified'])),
    'categories', '[]'::jsonb) as lead_pipeline_summary,
  (select jsonb_build_object('link_id', pcm.id, 'media_asset_id', ma.id, 'title', ma.title, 'description', ma.description,
      'caption', coalesce(pcm.caption_override, ma.caption), 'alt_text', coalesce(pcm.alt_text_override, ma.alt_text),
      'storage_bucket', ma.storage_bucket, 'storage_path', ma.storage_path, 'external_url', ma.external_url,
      'provider', ma.provider, 'mime_type', ma.mime_type, 'duration_seconds', ma.duration_seconds,
      'aspect_ratio', ma.aspect_ratio, 'thumbnail_url', ma.thumbnail_url, 'poster_asset_id', ma.poster_asset_id,
      'captions_url', ma.captions_url, 'language_code', ma.language_code)
     from public.proof_of_mind_concept_media pcm join public.media_assets ma on ma.id = pcm.media_asset_id
    where pcm.concept_id = c.id and pcm.placement = 'founder_video' and ma.asset_type = 'video'
      and ma.visibility = 'public' and ma.status = 'published' limit 1) as founder_video
from public.proof_of_mind_concepts c
where c.visibility = any(array['teaser','full']) and c.published_at is not null and c.published_at <= now();

create view public.proof_of_mind_public_details
with (security_invoker = true)
as
select
  c.id, c.slug, c.title, c.tagline, c.short_description, c.full_description, c.problem_statement, c.solution_overview,
  c.target_audience, c.business_model, c.key_features, c.category, c.tags, c.concept_status, c.visibility, c.is_featured,
  c.display_order, c.cover_image_url, c.cover_image_alt, c.external_url, c.repository_url, c.original_language,
  c.published_at, c.created_at, c.updated_at, c.source_system, c.source_base_id, c.source_table_id, c.source_record_id,
  c.source_created_at, c.source_payload, c.concept_score, c.innovation_summary, c.problems_solved, c.vision_statement,
  c.target_users, c.key_use_cases, c.differentiation_points, c.market_opportunity, c.business_model_summary,
  c.validation_summary, c.validation_evidence, c.roadmap_summary, c.collaboration_opportunities, c.demo_url,
  c.pitch_deck_url, c.gallery_images, c.detail_cta_label, c.detail_cta_url, c.concept_type, c.concept_format,
  c.delivery_model, c.primary_market, c.physical_location_required, c.competition_summary, c.competition_comparisons,
  c.mega_promo_text,
  (select round(avg(ce.score), 2) from public.concept_evaluations ce where ce.concept_id = c.id) as evaluation_average_score,
  (select jsonb_build_object('name', f.display_name, 'full_name', f.full_name, 'role', coalesce(cf.founder_role, f.role_title), 'is_original_creator', cf.is_original_creator, 'bio', f.bio)
     from public.proof_of_mind_concept_founders cf join public.concept_founders f on f.id = cf.founder_id
    where cf.concept_id = c.id and f.is_public = true order by cf.display_order limit 1) as founder,
  coalesce((select jsonb_agg(jsonb_build_object('name', f.display_name, 'full_name', f.full_name, 'role', coalesce(cf.founder_role, f.role_title), 'is_original_creator', cf.is_original_creator, 'bio', f.bio) order by cf.display_order)
     from public.proof_of_mind_concept_founders cf join public.concept_founders f on f.id = cf.founder_id
    where cf.concept_id = c.id and f.is_public = true), '[]'::jsonb) as founders,
  jsonb_build_object('average_score', (select round(avg(ce.score), 2) from public.concept_evaluations ce where ce.concept_id = c.id),
    'criteria', coalesce((select jsonb_agg(jsonb_build_object('criterion', ec.criterion_name, 'score', ce.score, 'assessment', ce.assessment, 'risks', case when ce.risks is null then '[]'::jsonb else jsonb_build_array(ce.risks) end, 'improvement_actions', ce.improvement_actions) order by ec.display_order)
      from public.concept_evaluations ce join public.concept_evaluation_criteria ec on ec.id = ce.criterion_id where ce.concept_id = c.id and ec.is_active = true), '[]'::jsonb)) as evaluation_summary,
  (select pc.our_advantage from public.proof_of_mind_competitors pc where pc.concept_id = c.id and pc.is_public = true and pc.our_advantage is not null order by pc.display_order limit 1) as competitive_advantage,
  jsonb_build_object('count', (select count(*) from public.proof_of_mind_competitors pc where pc.concept_id = c.id and pc.is_public = true),
    'summary', c.competition_summary,
    'competitive_advantage', (select pc.our_advantage from public.proof_of_mind_competitors pc where pc.concept_id = c.id and pc.is_public = true and pc.our_advantage is not null order by pc.display_order limit 1),
    'comparisons', coalesce((select jsonb_agg(jsonb_build_object('name', pc.competitor_name, 'product', pc.competitor_product, 'similarities', pc.similarities, 'differences', pc.differences, 'our_advantage', pc.our_advantage, 'competitor_advantage', pc.competitor_advantage, 'strategic_risk', pc.strategic_risk) order by pc.display_order)
      from public.proof_of_mind_competitors pc where pc.concept_id = c.id and pc.is_public = true), '[]'::jsonb)) as competition_summary_data,
  jsonb_build_object('category_count', (select count(*) from public.concept_lead_categories lc where lc.concept_id = c.id and lc.is_active = true),
    'target_slots', (select count(*) from public.concept_lead_targets lt where lt.concept_id = c.id),
    'identified_leads', (select count(*) from public.concept_lead_targets lt where lt.concept_id = c.id and lt.research_status = any(array['identified','researched','verified'])),
    'categories', '[]'::jsonb) as lead_pipeline_summary,
  (select jsonb_build_object('link_id', pcm.id, 'media_asset_id', ma.id, 'title', ma.title, 'description', ma.description,
      'caption', coalesce(pcm.caption_override, ma.caption), 'alt_text', coalesce(pcm.alt_text_override, ma.alt_text),
      'storage_bucket', ma.storage_bucket, 'storage_path', ma.storage_path, 'external_url', ma.external_url,
      'provider', ma.provider, 'mime_type', ma.mime_type, 'duration_seconds', ma.duration_seconds,
      'aspect_ratio', ma.aspect_ratio, 'thumbnail_url', ma.thumbnail_url, 'poster_asset_id', ma.poster_asset_id,
      'captions_url', ma.captions_url, 'language_code', ma.language_code)
     from public.proof_of_mind_concept_media pcm join public.media_assets ma on ma.id = pcm.media_asset_id
    where pcm.concept_id = c.id and pcm.placement = 'founder_video' and ma.asset_type = 'video'
      and ma.visibility = 'public' and ma.status = 'published' limit 1) as founder_video
from public.proof_of_mind_concepts c
where c.visibility = 'full' and c.published_at is not null and c.published_at <= now();

grant select on public.proof_of_mind_public_teasers to anon, authenticated;
grant select on public.proof_of_mind_public_details to anon, authenticated;

commit;
