-- Prefer device capture time when resolving first-asset journal/YYYY/MM folders.

drop function if exists public.admin_resolve_journal_footage_upload(uuid, text, text);

create or replace function public.admin_resolve_journal_footage_upload(
  post_id uuid,
  mime_type text,
  file_extension text,
  p_captured_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'auth', 'pg_catalog', 'pg_temp'
as $function$
declare
  post_slug text;
  post_title text;
  name_base text;
  kind text;
  bucket_name text;
  type_folder text;
  folder_year text;
  folder_month text;
  folder_date timestamptz;
  journey_occurred_at timestamptz;
  published_at timestamptz;
  existing_path text;
  safe_extension text;
  next_file_number integer;
  next_display_index integer;
  storage_file_name text;
  object_path text;
  name_pattern text;
begin
  if not public.is_admin_user() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(post_id::text, 0));

  select jp.slug, jp.title
  into post_slug, post_title
  from public.journal_posts jp
  where jp.id = post_id;

  if post_slug is null then
    raise exception 'Journal post not found' using errcode = 'P0002';
  end if;

  safe_extension := lower(trim(both '.' from coalesce(nullif(trim(file_extension), ''), 'bin')));
  if safe_extension = '' then
    raise exception 'File extension is required' using errcode = '22023';
  end if;

  kind := case when coalesce(mime_type, '') like 'video/%' then 'video' else 'image' end;
  bucket_name := case when kind = 'video' then 'media-videos' else 'media-images' end;
  type_folder := case when kind = 'video' then 'videos' else 'images' end;

  if nullif(trim(post_title), '') is null or post_title ilike 'Journal event %' then
    name_base := post_slug;
  else
    name_base := coalesce(public.slugify_journal_footage_name(post_title), post_slug);
  end if;

  select ma.storage_path
  into existing_path
  from public.journal_post_media jpm
  join public.media_assets ma on ma.id = jpm.media_asset_id
  where jpm.journal_post_id = post_id
    and ma.storage_path like 'journal/%'
  order by jpm.created_at asc, jpm.id asc
  limit 1;

  if existing_path is not null then
    folder_year := split_part(existing_path, '/', 2);
    folder_month := split_part(existing_path, '/', 3);
  else
    select jje.occurred_at
    into journey_occurred_at
    from public.journal_journey_entries jje
    where jje.journal_post_id = post_id
    order by jje.created_at asc
    limit 1;

    select jp.published_at
    into published_at
    from public.journal_posts jp
    where jp.id = post_id;

    folder_date := coalesce(p_captured_at, journey_occurred_at, published_at, now());
    folder_year := to_char(folder_date, 'YYYY');
    folder_month := to_char(folder_date, 'MM');
  end if;

  name_pattern := '^' || regexp_replace(name_base, '([.^$|*+?(){}\[\]\\-])', '\\\1', 'g') || '-([0-9]+)\.' || regexp_replace(safe_extension, '([.^$|*+?(){}\[\]\\-])', '\\\1', 'g') || '$';

  select coalesce(max((regexp_match(split_part(ma.storage_path, '/', 6), name_pattern))[1]::integer), 0)
  into next_file_number
  from public.journal_post_media jpm
  join public.media_assets ma on ma.id = jpm.media_asset_id
  where jpm.journal_post_id = post_id
    and ma.storage_path like ('journal/' || folder_year || '/' || folder_month || '/' || post_id::text || '/' || type_folder || '/%');

  next_file_number := next_file_number + 1;

  select coalesce(max(jpm.display_order), -1) + 1
  into next_display_index
  from public.journal_post_media jpm
  where jpm.journal_post_id = post_id;

  storage_file_name := name_base || '-' || next_file_number::text || '.' || safe_extension;
  object_path := 'journal/' || folder_year || '/' || folder_month || '/' || post_id::text || '/' || type_folder || '/' || storage_file_name;

  return jsonb_build_object(
    'bucket_name', bucket_name,
    'object_path', object_path,
    'storage_file_name', storage_file_name,
    'display_index', next_display_index,
    'name_base', name_base,
    'asset_type', kind
  );
end;
$function$;

revoke all on function public.admin_resolve_journal_footage_upload(uuid, text, text, timestamptz) from public;
grant execute on function public.admin_resolve_journal_footage_upload(uuid, text, text, timestamptz) to authenticated, service_role;
