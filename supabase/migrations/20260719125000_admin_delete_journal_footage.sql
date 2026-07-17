-- Admin delete pipeline for journal footage linked to a post group.
-- Step 1: unlink from journal_post_media + clear cover when needed.
-- Step 2 (Edge Function): remove storage object when hard_delete.
-- Step 3: finalize deletes the media_assets row after storage is gone.

create or replace function public.admin_delete_journal_footage(
  p_post_id uuid,
  p_asset_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'auth', 'storage', 'pg_catalog', 'pg_temp'
as $function$
declare
  v_asset public.media_assets;
  v_link_id uuid;
  v_cover text;
  v_cover_cleared boolean := false;
  v_path_fragment text;
  v_public_cover text;
  v_hard_delete boolean;
begin
  if not public.is_admin_user() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  select jpm.id
  into v_link_id
  from public.journal_post_media jpm
  where jpm.journal_post_id = p_post_id
    and jpm.media_asset_id = p_asset_id
  limit 1;

  if v_link_id is null then
    raise exception 'Journal footage link not found' using errcode = 'P0002';
  end if;

  select *
  into v_asset
  from public.media_assets
  where id = p_asset_id
  for update;

  if not found then
    raise exception 'Media asset not found' using errcode = 'P0002';
  end if;

  delete from public.journal_post_media
  where id = v_link_id;

  v_path_fragment := coalesce(v_asset.storage_bucket, '') || '/' || coalesce(v_asset.storage_path, '');
  v_public_cover := '/storage/v1/object/public/' || coalesce(v_asset.storage_bucket, '') || '/' || coalesce(v_asset.storage_path, '');

  select jp.cover_image_url
  into v_cover
  from public.journal_posts jp
  where jp.id = p_post_id
  for update;

  if v_cover is not null
     and length(trim(v_cover)) > 0
     and (
       position(v_path_fragment in v_cover) > 0
       or position(v_public_cover in v_cover) > 0
       or v_cover = v_public_cover
       or right(v_cover, length(coalesce(v_asset.storage_path, ''))) = coalesce(v_asset.storage_path, '')
     )
  then
    update public.journal_posts
    set cover_image_url = null,
        updated_at = now()
    where id = p_post_id;
    v_cover_cleared := true;
  end if;

  v_hard_delete := public.media_asset_is_unused(p_asset_id);

  return jsonb_build_object(
    'ok', true,
    'unlinked', true,
    'cover_cleared', v_cover_cleared,
    'hard_delete', v_hard_delete,
    'storage_bucket', case when v_hard_delete then v_asset.storage_bucket else null end,
    'storage_path', case when v_hard_delete then v_asset.storage_path else null end,
    'provider', case when v_hard_delete then v_asset.provider else null end
  );
end;
$function$;

create or replace function public.admin_finalize_journal_footage_delete(
  p_asset_id uuid
)
returns boolean
language plpgsql
security definer
set search_path to 'public', 'auth', 'storage', 'pg_catalog', 'pg_temp'
as $function$
declare
  v_asset public.media_assets;
begin
  if not public.is_admin_user() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  select *
  into v_asset
  from public.media_assets
  where id = p_asset_id
  for update;

  if not found then
    return true;
  end if;

  if not public.media_asset_is_unused(p_asset_id) then
    raise exception 'Media asset is still in use';
  end if;

  if v_asset.provider = 'supabase'
     and coalesce(v_asset.storage_bucket, '') <> ''
     and coalesce(v_asset.storage_path, '') <> ''
     and exists (
       select 1
       from storage.objects
       where bucket_id = v_asset.storage_bucket
         and name = v_asset.storage_path
     )
  then
    raise exception 'Storage object still exists; delete it before finalizing metadata deletion';
  end if;

  delete from public.media_assets where id = p_asset_id;
  return true;
end;
$function$;

revoke all on function public.admin_delete_journal_footage(uuid, uuid) from public;
grant execute on function public.admin_delete_journal_footage(uuid, uuid) to authenticated, service_role;

revoke all on function public.admin_finalize_journal_footage_delete(uuid) from public;
grant execute on function public.admin_finalize_journal_footage_delete(uuid) to authenticated, service_role;
