-- Harden journal footage registration and enforce post ↔ storage path integrity.

create or replace function public.validate_journal_post_media_link()
returns trigger
language plpgsql
set search_path to 'public', 'pg_catalog', 'pg_temp'
as $function$
declare
  asset_path text;
  path_post_id text;
begin
  select ma.storage_path
  into asset_path
  from public.media_assets ma
  where ma.id = new.media_asset_id;

  if asset_path is null then
    raise exception 'Media asset not found for journal_post_media link' using errcode = 'P0002';
  end if;

  if asset_path like 'journey-events/%' then
    raise exception 'Journey-event storage paths must use founder_timeline_event_media, not journal_post_media'
      using errcode = '22023';
  end if;

  if asset_path like 'journal/%' then
    path_post_id := split_part(asset_path, '/', 4);
    if path_post_id <> new.journal_post_id::text then
      raise exception 'Storage path post id % does not match journal_post_id %', path_post_id, new.journal_post_id
        using errcode = '22023';
    end if;
  end if;

  return new;
end;
$function$;

drop trigger if exists journal_post_media_validate_link on public.journal_post_media;

create trigger journal_post_media_validate_link
before insert or update of journal_post_id, media_asset_id
on public.journal_post_media
for each row
execute function public.validate_journal_post_media_link();

create or replace function public.admin_register_journal_footage(
  post_id uuid,
  bucket_name text,
  object_path text,
  file_name text,
  mime_type text,
  file_size bigint,
  placement_name text default 'gallery'::text,
  display_index integer default 0,
  asset_metadata jsonb default '{}'::jsonb
)
returns public.media_assets
language plpgsql
security definer
set search_path to 'public', 'auth', 'pg_catalog', 'pg_temp'
as $function$
declare
  result public.media_assets;
  kind text;
  generated_alt_text text;
  post_slug text;
begin
  if not public.is_admin_user() then
    raise exception 'Not authorized' using errcode='42501';
  end if;

  select jp.slug
  into post_slug
  from public.journal_posts jp
  where jp.id = post_id;

  if post_slug is null then
    raise exception 'Journal post not found' using errcode='P0002';
  end if;

  if bucket_name not in ('media-images','media-videos') then
    raise exception 'Invalid media bucket' using errcode='22023';
  end if;

  if object_path !~ ('^journal/[0-9]{4}/[0-9]{2}/' || post_id::text || '/') then
    raise exception 'Object path must live under journal/YYYY/MM/%/ for the target post', post_id
      using errcode = '22023';
  end if;

  kind := case when mime_type like 'video/%' then 'video' else 'image' end;
  if (kind='video' and bucket_name<>'media-videos') or (kind='image' and bucket_name<>'media-images') then
    raise exception 'Bucket does not match media type' using errcode='22023';
  end if;

  generated_alt_text := case
    when kind = 'image' then coalesce(
      nullif(asset_metadata->>'alt_text', ''),
      nullif(regexp_replace(regexp_replace(file_name, '\.[^.]+$', ''), '[-_]+', ' ', 'g'), ''),
      'Journal event photo'
    )
    else null
  end;

  insert into public.media_assets(
    asset_type,title,alt_text,original_filename,storage_bucket,storage_path,external_url,provider,
    mime_type,file_extension,file_size_bytes,visibility,status,metadata,tags,created_by,updated_by,published_at,show_in_media_vault
  ) values (
    kind,
    coalesce(nullif(file_name,''),'Journal footage'),
    generated_alt_text,
    file_name,
    bucket_name,
    object_path,
    null,
    'supabase',
    mime_type,
    nullif(regexp_replace(file_name,'^.*\.','',''),''),
    file_size,
    'public',
    'published',
    coalesce(asset_metadata,'{}'::jsonb) || jsonb_build_object(
      'journal_post_id', post_id,
      'journal_post_slug', post_slug,
      'source', 'journal_event_capture'
    ),
    array['journal','event-footage'],
    auth.uid(),auth.uid(),now(),true
  ) returning * into result;

  insert into public.journal_post_media(
    journal_post_id,media_asset_id,placement,display_order,is_featured,autoplay,muted,loop
  ) values (
    post_id,result.id,coalesce(nullif(placement_name,''),'gallery'),coalesce(display_index,0),coalesce(display_index,0)=0,false,false,false
  );

  if coalesce(display_index,0)=0 and kind='image' then
    update public.journal_posts
    set cover_image_url = concat('/storage/v1/object/public/',bucket_name,'/',object_path),
        updated_at = now()
    where id = post_id
      and (cover_image_url is null or cover_image_url = '');
  end if;

  return result;
end;
$function$;

grant execute on function public.admin_register_journal_footage(
  uuid, text, text, text, text, bigint, text, integer, jsonb
) to authenticated, service_role;
