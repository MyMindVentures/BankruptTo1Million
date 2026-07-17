-- Hide public journey calendar stops whose date range has ended.
-- Keeps open-ended stops (ends_on is null) and stops still active on p_as_of_date.

begin;

drop function if exists public.get_localized_public_journey_calendar(text);

create or replace function public.get_localized_public_journey_calendar(
  p_language_code text default 'en',
  p_as_of_date date default current_date
)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public', 'pg_catalog', 'pg_temp'
as $$
declare
  v_lang text := coalesce(nullif(trim(p_language_code), ''), 'en');
  v_as_of date := coalesce(p_as_of_date, current_date);
  v_result jsonb;
begin
  with entries as (
    select
      e.*,
      p.slug as related_journal_post_slug,
      case
        when e.accommodation_needed
          and e.host_request_status = any (array['open'::text, 'offers_received'::text])
          and e.status = any (array['planned'::text, 'confirmed'::text, 'travelling'::text])
        then true
        else false
      end as can_offer_hosting
    from public.journey_calendar_entries e
    left join public.journal_posts p on p.id = e.related_journal_post_id
    where e.is_public = true
      and e.status <> 'cancelled'
      and (e.ends_on is null or e.ends_on >= v_as_of)
  ),
  localized as (
    select
      e.id,
      e.slug,
      e.journey_person,
      e.status,
      e.starts_on,
      e.ends_on,
      e.date_flexibility_days,
      e.country_code,
      e.latitude,
      e.longitude,
      e.transport_mode,
      e.accommodation_needed,
      e.accommodation_from,
      e.accommodation_until,
      e.guests_count,
      e.nights_needed,
      e.host_request_status,
      e.can_offer_hosting,
      e.is_featured,
      e.display_order,
      e.related_journal_post_id,
      e.related_journal_post_slug,
      e.created_at,
      coalesce(nullif(trim(loc.title), ''), nullif(trim(en.title), ''), e.title) as title,
      coalesce(nullif(trim(loc.country_name), ''), nullif(trim(en.country_name), ''), e.country_name) as country_name,
      coalesce(nullif(trim(loc.region_name), ''), nullif(trim(en.region_name), ''), e.region_name) as region_name,
      coalesce(nullif(trim(loc.city_name), ''), nullif(trim(en.city_name), ''), e.city_name) as city_name,
      coalesce(nullif(trim(loc.location_name), ''), nullif(trim(en.location_name), ''), e.location_name) as location_name,
      coalesce(nullif(trim(loc.public_summary), ''), nullif(trim(en.public_summary), ''), e.public_summary) as public_summary,
      coalesce(nullif(trim(loc.purpose), ''), nullif(trim(en.purpose), ''), e.purpose) as purpose,
      coalesce(nullif(trim(loc.host_request_message), ''), nullif(trim(en.host_request_message), ''), e.host_request_message) as host_request_message,
      case
        when loc.title is not null or loc.public_summary is not null then v_lang
        when en.title is not null or en.public_summary is not null then 'en'
        else 'en'
      end as active_language
    from entries e
    left join lateral (
      select t.title, t.country_name, t.region_name, t.city_name, t.location_name,
             t.public_summary, t.purpose, t.host_request_message
      from public.journey_calendar_entry_translations t
      where t.calendar_entry_id = e.id
        and t.language_code = v_lang
        and t.translation_status = any (array['machine'::text, 'reviewed'::text, 'published'::text])
      order by case t.translation_status when 'published' then 0 when 'reviewed' then 1 else 2 end
      limit 1
    ) loc on true
    left join lateral (
      select t.title, t.country_name, t.region_name, t.city_name, t.location_name,
             t.public_summary, t.purpose, t.host_request_message
      from public.journey_calendar_entry_translations t
      where t.calendar_entry_id = e.id
        and t.language_code = 'en'
        and t.translation_status = any (array['machine'::text, 'reviewed'::text, 'published'::text])
      order by case t.translation_status when 'published' then 0 when 'reviewed' then 1 else 2 end
      limit 1
    ) en on true
  ),
  founders as (
    select
      r.calendar_entry_id,
      coalesce(
        jsonb_agg(
          jsonb_build_object(
            'id', fp.id,
            'slug', fp.slug,
            'display_name', fp.display_name,
            'avatar_url', fp.avatar_url,
            'profile_url', '/founders/' || fp.slug
          )
          order by r.display_order, fp.display_name
        ),
        '[]'::jsonb
      ) as founders
    from public.journey_calendar_entry_founders r
    join public.founder_profiles fp on fp.id = r.founder_profile_id and fp.is_public = true
    group by r.calendar_entry_id
  ),
  exchange as (
    select
      x.calendar_entry_id,
      x.item_type,
      coalesce(
        jsonb_agg(
          jsonb_build_object(
            'id', x.id,
            'slug', x.slug,
            'category', x.category,
            'title', coalesce(nullif(trim(xtitle.title), ''), x.title),
            'description', coalesce(nullif(trim(xtitle.description), ''), x.description),
            'priority', x.priority,
            'display_order', x.display_order,
            'journey_person', x.journey_person
          )
          order by x.display_order, x.created_at
        ),
        '[]'::jsonb
      ) as items
    from public.journey_exchange_items x
    left join lateral (
      select coalesce(loc.title, en.title) as title,
             coalesce(loc.description, en.description) as description
      from (select 1) _
      left join lateral (
        select t.title, t.description
        from public.journey_exchange_item_translations t
        where t.exchange_item_id = x.id
          and t.language_code = v_lang
          and t.translation_status = any (array['machine'::text, 'reviewed'::text, 'published'::text])
        order by case t.translation_status when 'published' then 0 when 'reviewed' then 1 else 2 end
        limit 1
      ) loc on true
      left join lateral (
        select t.title, t.description
        from public.journey_exchange_item_translations t
        where t.exchange_item_id = x.id
          and t.language_code = 'en'
          and t.translation_status = any (array['machine'::text, 'reviewed'::text, 'published'::text])
        order by case t.translation_status when 'published' then 0 when 'reviewed' then 1 else 2 end
        limit 1
      ) en on true
    ) xtitle on true
    where x.is_public = true
      and x.status = 'active'
      and x.calendar_entry_id is not null
    group by x.calendar_entry_id, x.item_type
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', l.id,
        'slug', l.slug,
        'journey_person', l.journey_person,
        'status', l.status,
        'starts_on', l.starts_on,
        'ends_on', l.ends_on,
        'date_flexibility_days', l.date_flexibility_days,
        'country_code', l.country_code,
        'country_name', l.country_name,
        'region_name', l.region_name,
        'city_name', l.city_name,
        'location_name', l.location_name,
        'latitude', l.latitude,
        'longitude', l.longitude,
        'title', l.title,
        'public_summary', l.public_summary,
        'purpose', l.purpose,
        'transport_mode', l.transport_mode,
        'accommodation_needed', l.accommodation_needed,
        'accommodation_from', l.accommodation_from,
        'accommodation_until', l.accommodation_until,
        'guests_count', l.guests_count,
        'nights_needed', l.nights_needed,
        'host_request_message', l.host_request_message,
        'host_request_status', l.host_request_status,
        'can_offer_hosting', l.can_offer_hosting,
        'is_featured', l.is_featured,
        'display_order', l.display_order,
        'related_journal_post_id', l.related_journal_post_id,
        'related_journal_post_slug', l.related_journal_post_slug,
        'active_language', l.active_language,
        'founders', coalesce(f.founders, '[]'::jsonb),
        'needs', coalesce(n.items, '[]'::jsonb),
        'offers', coalesce(o.items, '[]'::jsonb)
      )
      order by l.starts_on, l.display_order, l.created_at
    ),
    '[]'::jsonb
  )
  into v_result
  from localized l
  left join founders f on f.calendar_entry_id = l.id
  left join exchange n on n.calendar_entry_id = l.id and n.item_type = 'need'
  left join exchange o on o.calendar_entry_id = l.id and o.item_type = 'offer';

  return coalesce(v_result, '[]'::jsonb);
end;
$$;

revoke all on function public.get_localized_public_journey_calendar(text, date) from public;
grant execute on function public.get_localized_public_journey_calendar(text, date) to anon, authenticated, service_role;

commit;
