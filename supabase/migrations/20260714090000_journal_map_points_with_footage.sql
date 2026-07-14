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
  j.involved_people,
  coalesce(post_media.footage, '[]'::jsonb) as footage
from public.public_journal_journey j
left join lateral (
  select jsonb_agg(
    jsonb_build_object(
      'id', ma.id,
      'url', coalesce(ma.external_url, 'https://zlwwncmbxohnezotomcx.supabase.co/storage/v1/object/public/' || ma.storage_bucket || '/' || ma.storage_path),
      'asset_type', ma.asset_type,
      'mime_type', ma.mime_type,
      'thumbnail_url', ma.thumbnail_url,
      'caption', coalesce(jpm.caption_override, ma.caption),
      'alt_text', coalesce(jpm.alt_text_override, ma.alt_text, ma.title),
      'display_order', jpm.display_order
    ) order by jpm.display_order, jpm.created_at
  ) as footage
  from public.journal_post_media jpm
  join public.media_assets ma on ma.id = jpm.media_asset_id
  where jpm.journal_post_id = j.journal_post_id
    and ma.visibility = 'public'
    and ma.status = 'published'
) post_media on true
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
      'avatar_url', fp.avatar_url,
      'relation_role', 'founder',
      'display_order', 0
    )
  ) as involved_people,
  coalesce(event_media.footage, post_media.footage, '[]'::jsonb) as footage
from public.founder_timeline_events e
join public.locations l on l.id = e.location_id
join public.founder_profiles fp on fp.id = e.founder_profile_id
join public.journal_posts p on p.id = e.related_journal_post_id
left join lateral (
  select jsonb_agg(
    jsonb_build_object(
      'id', coalesce(m.media_asset_id, m.id),
      'url', coalesce(m.media_url, ma.external_url, 'https://zlwwncmbxohnezotomcx.supabase.co/storage/v1/object/public/' || ma.storage_bucket || '/' || ma.storage_path),
      'asset_type', coalesce(m.media_type, ma.asset_type),
      'mime_type', ma.mime_type,
      'thumbnail_url', ma.thumbnail_url,
      'caption', coalesce(m.caption, ma.caption),
      'alt_text', coalesce(m.alt_text, ma.alt_text, ma.title),
      'display_order', m.display_order
    ) order by m.display_order, m.created_at
  ) as footage
  from public.founder_timeline_event_media m
  left join public.media_assets ma on ma.id = m.media_asset_id
  where m.timeline_event_id = e.id
    and m.is_public = true
    and (m.media_url is not null or (ma.visibility = 'public' and ma.status = 'published'))
) event_media on true
left join lateral (
  select jsonb_agg(
    jsonb_build_object(
      'id', ma.id,
      'url', coalesce(ma.external_url, 'https://zlwwncmbxohnezotomcx.supabase.co/storage/v1/object/public/' || ma.storage_bucket || '/' || ma.storage_path),
      'asset_type', ma.asset_type,
      'mime_type', ma.mime_type,
      'thumbnail_url', ma.thumbnail_url,
      'caption', coalesce(jpm.caption_override, ma.caption),
      'alt_text', coalesce(jpm.alt_text_override, ma.alt_text, ma.title),
      'display_order', jpm.display_order
    ) order by jpm.display_order, jpm.created_at
  ) as footage
  from public.journal_post_media jpm
  join public.media_assets ma on ma.id = jpm.media_asset_id
  where jpm.journal_post_id = p.id
    and ma.visibility = 'public'
    and ma.status = 'published'
) post_media on true
where e.is_public = true
  and e.event_type = 'fun'
  and l.is_public = true
  and p.status = 'published'
  and p.published_at is not null
  and p.published_at <= now()
  and coalesce(l.latitude, e.latitude) is not null
  and coalesce(l.longitude, e.longitude) is not null
  and not exists (
    select 1
    from public.journal_journey_entries je
    where je.journal_post_id = p.id
      and je.show_on_map = true
  );

grant select on public.public_journal_map_points to anon, authenticated;

comment on view public.public_journal_map_points is
  'Public Journal journey feed with chronological events, involved people and public footage arrays.';
