create or replace view public.public_journal_journey
with (security_invoker = true)
as
select
  e.id as journey_entry_id,
  e.journal_post_id,
  p.slug,
  p.title,
  p.subtitle,
  p.excerpt,
  p.cover_image_url,
  p.cover_image_alt,
  p.published_at,
  p.original_language,
  e.entry_type,
  e.occurred_at,
  e.ended_at,
  e.timezone,
  e.country_code,
  e.country_name,
  e.region_name,
  e.city_name,
  e.location_name,
  e.latitude,
  e.longitude,
  e.journey_order,
  e.journey_person,
  e.journey_category,
  e.is_milestone,
  e.milestone_type,
  e.show_on_map,
  e.show_on_timeline,
  e.is_current_location,
  e.is_host_related,
  e.is_daily_highlight,
  e.travel_mode,
  e.distance_from_previous_km,
  e.map_label,
  e.marker_variant,
  coalesce(e.journey_order, row_number() over (order by e.occurred_at, e.id)::integer) as effective_journey_order,
  coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'id', a.id,
        'slug', a.slug,
        'display_name', a.display_name,
        'avatar_url', a.avatar_url,
        'relation_role', l.author_role,
        'display_order', l.author_order
      ) order by l.author_order, a.display_name
    )
    from public.journal_post_author_links l
    join public.journal_authors a on a.id = l.journal_author_id
    where l.journal_post_id = p.id
      and l.author_role in ('subject', 'both')
      and a.is_public = true
  ), '[]'::jsonb) as involved_people
from public.journal_journey_entries e
join public.journal_posts p on p.id = e.journal_post_id
where p.status = 'published'
  and p.published_at is not null
  and p.published_at <= now()
  and (e.show_on_map = true or e.show_on_timeline = true);

grant select on public.public_journal_journey to anon, authenticated;
