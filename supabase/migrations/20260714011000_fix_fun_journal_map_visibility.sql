-- Public map feed for published journey entries and public fun timeline events.
-- This view deliberately exposes only the fields required by the public map.
create or replace view public.public_journal_map_points
with (security_invoker = false)
as
select
  j.journey_entry_id,
  j.slug,
  j.title,
  j.excerpt,
  j.occurred_at,
  j.country_name,
  j.city_name,
  j.location_name,
  j.latitude,
  j.longitude,
  j.journey_person,
  j.is_milestone,
  j.is_current_location,
  j.involved_people
from public.public_journal_journey j
where j.latitude is not null
  and j.longitude is not null

union all

select
  e.id as journey_entry_id,
  p.slug,
  e.title,
  coalesce(e.description, e.subtitle, p.excerpt) as excerpt,
  e.occurred_at,
  coalesce(l.country, e.country) as country_name,
  coalesce(l.city, e.city) as city_name,
  coalesce(l.name, e.location_name) as location_name,
  coalesce(l.latitude, e.latitude) as latitude,
  coalesce(l.longitude, e.longitude) as longitude,
  case
    when fp.slug = 'kevin-de-vlieger' then 'kevin'
    when fp.slug = 'micha' then 'micha'
    else 'together'
  end::text as journey_person,
  false as is_milestone,
  false as is_current_location,
  jsonb_build_array(
    jsonb_build_object(
      'id', fp.id,
      'slug', fp.slug,
      'display_name', fp.display_name,
      'avatar_url', null,
      'relation_role', 'founder',
      'display_order', 0
    )
  ) as involved_people
from public.founder_timeline_events e
join public.locations l on l.id = e.location_id
join public.founder_profiles fp on fp.id = e.founder_profile_id
join public.journal_posts p on p.id = e.related_journal_post_id
where e.is_public = true
  and e.event_type = 'fun'
  and l.is_public = true
  and p.status = 'published'
  and p.published_at is not null
  and p.published_at <= now()
  and coalesce(l.latitude, e.latitude) is not null
  and coalesce(l.longitude, e.longitude) is not null;

grant select on public.public_journal_map_points to anon, authenticated;

comment on view public.public_journal_map_points is
  'Public Journal map feed. Fun timeline events are emitted once, as standalone pins linked to their published Journal post.';