-- Admin RPC to list journal post footage for any post status (draft or published).

create or replace function public.admin_get_journal_footage(p_post_id uuid)
returns table(
  asset_id uuid,
  asset_type text,
  storage_bucket text,
  storage_path text,
  thumbnail_url text,
  mime_type text,
  alt_text text,
  caption text,
  display_order integer,
  created_at timestamptz,
  original_filename text
)
language plpgsql
security definer
set search_path to 'public', 'auth', 'pg_catalog', 'pg_temp'
as $function$
begin
  if not public.is_admin_user() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  if not exists (select 1 from public.journal_posts jp where jp.id = p_post_id) then
    raise exception 'Journal post not found' using errcode = 'P0002';
  end if;

  return query
  select
    ma.id as asset_id,
    ma.asset_type::text,
    ma.storage_bucket,
    ma.storage_path,
    ma.thumbnail_url,
    ma.mime_type,
    coalesce(nullif(trim(jpm.alt_text_override), ''), nullif(trim(ma.alt_text), '')) as alt_text,
    coalesce(nullif(trim(jpm.caption_override), ''), nullif(trim(ma.caption), '')) as caption,
    coalesce(jpm.display_order, 0) as display_order,
    jpm.created_at,
    coalesce(
      nullif(trim(ma.original_filename), ''),
      nullif(trim(ma.metadata->>'original_client_filename'), ''),
      nullif(regexp_replace(ma.storage_path, '^.*/', ''), '')
    ) as original_filename
  from public.journal_post_media jpm
  join public.media_assets ma on ma.id = jpm.media_asset_id
  where jpm.journal_post_id = p_post_id
    and ma.storage_path like 'journal/%'
    and ma.asset_type in ('image', 'video')
  order by jpm.display_order asc, jpm.created_at asc, jpm.id asc;
end;
$function$;

revoke all on function public.admin_get_journal_footage(uuid) from public;
grant execute on function public.admin_get_journal_footage(uuid) to authenticated, service_role;
