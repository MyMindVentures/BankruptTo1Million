-- Media Vault: category groups by storage path + keep journal post groups.

create or replace function public.admin_list_media_vault_groups()
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public', 'auth', 'pg_catalog', 'pg_temp'
as $function$
declare
  v_posts jsonb;
  v_categories jsonb;
begin
  if not public.is_admin_user() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  with linked as (
    select
      jp.id as post_id,
      jp.title,
      jp.slug,
      jp.status::text as status,
      count(jpm.id)::integer as asset_count,
      max(greatest(jpm.updated_at, jp.updated_at)) as updated_at
    from public.journal_posts jp
    join public.journal_post_media jpm on jpm.journal_post_id = jp.id
    join public.media_assets ma on ma.id = jpm.media_asset_id
    where ma.asset_type in ('image', 'video')
    group by jp.id, jp.title, jp.slug, jp.status
  ),
  cover_ranked as (
    select
      jpm.journal_post_id as post_id,
      ma.storage_bucket as cover_storage_bucket,
      ma.storage_path as cover_storage_path,
      ma.thumbnail_url as cover_thumbnail_url,
      ma.asset_type::text as cover_asset_type,
      row_number() over (
        partition by jpm.journal_post_id
        order by
          case when ma.asset_type = 'image' then 0 else 1 end,
          jpm.display_order asc,
          jpm.created_at asc,
          jpm.id asc
      ) as rn
    from public.journal_post_media jpm
    join public.media_assets ma on ma.id = jpm.media_asset_id
    where ma.asset_type in ('image', 'video')
  ),
  event_ranked as (
    select
      jje.journal_post_id as post_id,
      jje.occurred_at,
      coalesce(nullif(trim(jje.timezone), ''), 'Europe/Madrid') as event_timezone,
      row_number() over (
        partition by jje.journal_post_id
        order by jje.created_at asc, jje.id asc
      ) as rn
    from public.journal_journey_entries jje
    where jje.journal_post_id is not null
  )
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'post_id', l.post_id,
      'title', l.title,
      'slug', l.slug,
      'status', l.status,
      'asset_count', l.asset_count,
      'cover_storage_bucket', c.cover_storage_bucket,
      'cover_storage_path', c.cover_storage_path,
      'cover_thumbnail_url', c.cover_thumbnail_url,
      'cover_asset_type', c.cover_asset_type,
      'occurred_at', e.occurred_at,
      'event_timezone', e.event_timezone,
      'updated_at', l.updated_at
    )
    order by l.updated_at desc nulls last, l.title asc
  ), '[]'::jsonb)
  into v_posts
  from linked l
  left join cover_ranked c on c.post_id = l.post_id and c.rn = 1
  left join event_ranked e on e.post_id = l.post_id and e.rn = 1;

  with categorized as (
    select
      case
        when ma.storage_path like 'journal/%' then 'journal_unlinked'
        when ma.storage_path like 'founders/%' then 'founders'
        when ma.storage_path like 'journey-events/%' then 'journey_events'
        else 'other'
      end as category_key,
      ma.id as asset_id,
      ma.asset_type::text as asset_type,
      ma.storage_bucket,
      ma.storage_path,
      ma.thumbnail_url,
      ma.mime_type,
      ma.alt_text,
      ma.caption,
      ma.created_at,
      coalesce(
        nullif(trim(ma.original_filename), ''),
        nullif(trim(ma.metadata->>'original_client_filename'), ''),
        nullif(regexp_replace(coalesce(ma.storage_path, ''), '^.*/', ''), '')
      ) as original_filename
    from public.media_assets ma
    where not exists (
      select 1 from public.journal_post_media jpm where jpm.media_asset_id = ma.id
    )
  ),
  category_counts as (
    select category_key, count(*)::integer as asset_count
    from categorized
    group by category_key
  ),
  cover_ranked as (
    select
      c.category_key,
      c.storage_bucket as cover_storage_bucket,
      c.storage_path as cover_storage_path,
      c.thumbnail_url as cover_thumbnail_url,
      c.asset_type as cover_asset_type,
      row_number() over (
        partition by c.category_key
        order by
          case when c.asset_type = 'image' then 0 else 1 end,
          c.created_at desc,
          c.asset_id asc
      ) as rn
    from categorized c
  ),
  assets_by_category as (
    select
      c.category_key,
      jsonb_agg(
        jsonb_build_object(
          'asset_id', c.asset_id,
          'asset_type', c.asset_type,
          'storage_bucket', c.storage_bucket,
          'storage_path', c.storage_path,
          'thumbnail_url', c.thumbnail_url,
          'mime_type', c.mime_type,
          'alt_text', c.alt_text,
          'caption', c.caption,
          'display_order', 0,
          'created_at', c.created_at,
          'original_filename', c.original_filename
        )
        order by c.created_at desc, c.asset_id asc
      ) as assets
    from categorized c
    group by c.category_key
  )
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'key', cc.category_key,
      'asset_count', cc.asset_count,
      'cover_storage_bucket', cr.cover_storage_bucket,
      'cover_storage_path', cr.cover_storage_path,
      'cover_thumbnail_url', cr.cover_thumbnail_url,
      'cover_asset_type', cr.cover_asset_type,
      'assets', coalesce(abc.assets, '[]'::jsonb)
    )
    order by
      case cc.category_key
        when 'journal_unlinked' then 1
        when 'founders' then 2
        when 'journey_events' then 3
        else 4
      end
  ), '[]'::jsonb)
  into v_categories
  from category_counts cc
  left join cover_ranked cr on cr.category_key = cc.category_key and cr.rn = 1
  left join assets_by_category abc on abc.category_key = cc.category_key
  where cc.asset_count > 0;

  return jsonb_build_object(
    'posts', coalesce(v_posts, '[]'::jsonb),
    'categories', coalesce(v_categories, '[]'::jsonb)
  );
end;
$function$;

revoke all on function public.admin_list_media_vault_groups() from public;
grant execute on function public.admin_list_media_vault_groups() to authenticated, service_role;
