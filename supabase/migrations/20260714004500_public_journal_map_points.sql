create or replace view public.public_journal_map_points
with (security_invoker = true)
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
  ''::text as slug,
  e.title,
  coalesce(e.description, e.subtitle) as excerpt,
  e.occurred_at,
  coalesce(l.country, e.country) as country_name,
  coalesce(l.city, e.city) as city_name,
  coalesce(l.name, e.location_name) as location_name,
  l.latitude,
  l.longitude,
  case
    when fp.slug = 'kevin-de-vlieger' then 'kevin'
    when fp.slug = 'micha' then 'micha'
    else 'together'
  end::text as journey_person,
  coalesce(e.is_featured, false) as is_milestone,
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
where e.is_public = true
  and l.is_public = true
  and l.latitude is not null
  and l.longitude is not null;

grant select on public.public_journal_map_points to anon, authenticated;

comment on view public.public_journal_map_points is
  'Public map feed combining published Journal journey entries with public founder timeline events that have verified coordinates.';
