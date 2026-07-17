-- Admin Media Vault: group footage by journal post (+ unlinked assets).

create or replace function public.admin_list_media_vault_groups()
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public', 'auth', 'pg_catalog', 'pg_temp'
as $function$
declare
  v_posts jsonb;
  v_unlinked_assets jsonb;
  v_unlinked_count integer;
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
      'updated_at', l.updated_at
    )
    order by l.updated_at desc nulls last, l.title asc
  ), '[]'::jsonb)
  into v_posts
  from linked l
  left join cover_ranked c on c.post_id = l.post_id and c.rn = 1;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'asset_id', ma.id,
      'asset_type', ma.asset_type::text,
      'storage_bucket', ma.storage_bucket,
      'storage_path', ma.storage_path,
      'thumbnail_url', ma.thumbnail_url,
      'mime_type', ma.mime_type,
      'alt_text', ma.alt_text,
      'caption', ma.caption,
      'display_order', 0,
      'created_at', ma.created_at,
      'original_filename', coalesce(
        nullif(trim(ma.original_filename), ''),
        nullif(trim(ma.metadata->>'original_client_filename'), ''),
        nullif(regexp_replace(coalesce(ma.storage_path, ''), '^.*/', ''), '')
      )
    )
    order by ma.created_at desc, ma.id asc
  ), '[]'::jsonb), count(*)::integer
  into v_unlinked_assets, v_unlinked_count
  from public.media_assets ma
  where not exists (
    select 1 from public.journal_post_media jpm where jpm.media_asset_id = ma.id
  );

  return jsonb_build_object(
    'posts', coalesce(v_posts, '[]'::jsonb),
    'unlinked', jsonb_build_object(
      'asset_count', coalesce(v_unlinked_count, 0),
      'assets', coalesce(v_unlinked_assets, '[]'::jsonb)
    )
  );
end;
$function$;

revoke all on function public.admin_list_media_vault_groups() from public;
grant execute on function public.admin_list_media_vault_groups() to authenticated, service_role;
