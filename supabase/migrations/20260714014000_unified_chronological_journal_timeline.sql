-- Unify published journey entries and public fun timeline events in one dynamic feed.
-- The frontend already reads journal_timeline_cards for both the map and timeline.
-- Ordering is derived strictly from occurred_at, with the record id as a stable tie-breaker.
create or replace view public.journal_timeline_cards
with (security_invoker = false)
as
with unified as (
  select
    je.id as journey_entry_id,
    je.journal_post_id,
    jp.slug,
    jp.title,
    jp.subtitle,
    jp.excerpt,
    jp.cover_image_url,
    jp.cover_image_alt,
    jp.published_at,
    je.entry_type,
    je.occurred_at,
    je.ended_at,
    je.country_code,
    je.country_name,
    je.region_name,
    je.city_name,
    je.location_name,
    je.latitude,
    je.longitude,
    je.journey_order,
    je.journey_person,
    je.journey_category,
    je.is_milestone,
    je.milestone_type,
    je.show_on_map,
    je.show_on_timeline,
    je.is_current_location,
    je.travel_mode,
    je.distance_from_previous_km,
    je.map_label,
    je.marker_variant,
    je.what_happened,
    je.why_it_mattered,
    je.lessons_learned,
    je.mood,
    author_profile.id as author_founder_profile_id,
    author_profile.display_name as author_name,
    author_profile.avatar_url as author_avatar_url,
    visual_profile.id as subject_founder_profile_id,
    visual_profile.slug as subject_slug,
    visual_profile.display_name as subject_name,
    visual_profile.avatar_url as subject_avatar_url,
    coalesce(people.people, '[]'::jsonb) as people
  from public.journal_journey_entries je
  join public.journal_posts jp on jp.id = je.journal_post_id
  left join lateral (
    select fp.*
    from public.content_person_relations r
    join public.founder_profiles fp on fp.id = r.founder_profile_id
    where r.journal_post_id = jp.id
      and r.relationship_role in ('author', 'co_author')
    order by r.is_primary desc, r.display_order, r.created_at
    limit 1
  ) author_profile on true
  left join lateral (
    select fp.*
    from public.content_person_relations r
    join public.founder_profiles fp on fp.id = r.founder_profile_id
    where r.journal_post_id = jp.id
      and r.use_for_avatar = true
    order by r.is_primary desc,
      case r.relationship_role
        when 'primary_subject' then 0
        when 'concept_creator' then 1
        when 'co_subject' then 2
        else 10
      end,
      r.display_order,
      r.created_at
    limit 1
  ) visual_profile on true
  left join lateral (
    select jsonb_agg(
      jsonb_build_object(
        'founder_profile_id', fp.id,
        'slug', fp.slug,
        'name', fp.display_name,
        'avatar_url', fp.avatar_url,
        'role', r.relationship_role,
        'role_label', r.role_label,
        'is_primary', r.is_primary,
        'use_for_avatar', r.use_for_avatar
      ) order by r.display_order, r.relationship_role
    ) as people
    from public.content_person_relations r
    join public.founder_profiles fp on fp.id = r.founder_profile_id
    where r.journal_post_id = jp.id
  ) people on true
  where jp.status = 'published'
    and jp.published_at is not null
    and jp.published_at <= now()
    and (je.show_on_map = true or je.show_on_timeline = true)

  union all

  select
    e.id as journey_entry_id,
    p.id as journal_post_id,
    p.slug,
    e.title,
    coalesce(e.subtitle, p.subtitle) as subtitle,
    coalesce(e.description, p.excerpt) as excerpt,
    coalesce(e.cover_image_url, p.cover_image_url) as cover_image_url,
    p.cover_image_alt,
    p.published_at,
    'adventure'::text as entry_type,
    e.occurred_at,
    e.ended_at,
    coalesce(l.country_code, 'ES') as country_code,
    coalesce(l.country, e.country) as country_name,
    coalesce(l.region, e.region) as region_name,
    coalesce(l.city, e.city) as city_name,
    coalesce(l.name, e.location_name) as location_name,
    coalesce(l.latitude, e.latitude) as latitude,
    coalesce(l.longitude, e.longitude) as longitude,
    null::integer as journey_order,
    case
      when fp.slug = 'kevin-de-vlieger' then 'kevin'
      when fp.slug = 'micha' then 'micha'
      else 'together'
    end::text as journey_person,
    'fun'::text as journey_category,
    false as is_milestone,
    null::text as milestone_type,
    true as show_on_map,
    true as show_on_timeline,
    false as is_current_location,
    null::text as travel_mode,
    null::numeric as distance_from_previous_km,
    coalesce(l.name, e.location_name) as map_label,
    'fun'::text as marker_variant,
    coalesce(e.description, p.excerpt) as what_happened,
    null::text as why_it_mattered,
    null::text as lessons_learned,
    'relaxed'::text as mood,
    fp.id as author_founder_profile_id,
    fp.display_name as author_name,
    fp.avatar_url as author_avatar_url,
    fp.id as subject_founder_profile_id,
    fp.slug as subject_slug,
    fp.display_name as subject_name,
    fp.avatar_url as subject_avatar_url,
    jsonb_build_array(
      jsonb_build_object(
        'founder_profile_id', fp.id,
        'slug', fp.slug,
        'name', fp.display_name,
        'avatar_url', fp.avatar_url,
        'role', 'primary_subject',
        'role_label', 'Founder',
        'is_primary', true,
        'use_for_avatar', true
      )
    ) as people
  from public.founder_timeline_events e
  join public.locations l on l.id = e.location_id
  join public.founder_profiles fp on fp.id = e.founder_profile_id
  join public.journal_posts p on p.id = e.related_journal_post_id
  where e.is_public = true
    and fp.is_public = true
    and l.is_public = true
    and e.event_type = 'fun'
    and p.status = 'published'
    and p.published_at is not null
    and p.published_at <= now()
    and coalesce(l.latitude, e.latitude) is not null
    and coalesce(l.longitude, e.longitude) is not null
)
select
  unified.*,
  row_number() over (order by occurred_at asc, journey_entry_id asc)::integer as effective_journey_order
from unified;

grant select on public.journal_timeline_cards to anon, authenticated;

comment on view public.journal_timeline_cards is
  'Unified dynamic feed for the Journal map and interactive timeline. Every card is ordered chronologically by occurred_at and stable id.';