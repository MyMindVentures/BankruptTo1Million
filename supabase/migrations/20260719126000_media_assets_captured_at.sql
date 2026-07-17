-- Store device capture time from media file metadata; expose in admin vault lists.

alter table public.media_assets
  add column if not exists captured_at timestamptz;

create index if not exists media_assets_captured_at_desc_idx
  on public.media_assets (captured_at desc nulls last);

drop function if exists public.admin_register_journal_footage(
  uuid, text, text, text, text, bigint, text, integer, jsonb
);

create or replace function public.admin_register_journal_footage(
  post_id uuid,
  bucket_name text,
  object_path text,
  file_name text,
  mime_type text,
  file_size bigint,
  placement_name text default 'gallery'::text,
  display_index integer default 0,
  asset_metadata jsonb default '{}'::jsonb,
  captured_at timestamptz default null
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
  post_title text;
  v_captured timestamptz;
  v_metadata jsonb;
begin
  if not public.is_admin_user() then
    raise exception 'Not authorized' using errcode='42501';
  end if;

  select jp.slug, jp.title
  into post_slug, post_title
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

  v_captured := coalesce(
    captured_at,
    case
      when nullif(trim(coalesce(asset_metadata->>'captured_at', '')), '') is not null
        then (asset_metadata->>'captured_at')::timestamptz
      else null
    end
  );

  v_metadata := coalesce(asset_metadata, '{}'::jsonb) || jsonb_build_object(
    'journal_post_id', post_id,
    'journal_post_slug', post_slug,
    'source', coalesce(nullif(asset_metadata->>'source', ''), 'journal_event_capture')
  );
  if v_captured is not null then
    v_metadata := v_metadata || jsonb_build_object('captured_at', v_captured);
  end if;

  generated_alt_text := case
    when kind = 'image' then coalesce(
      nullif(asset_metadata->>'alt_text', ''),
      nullif(
        regexp_replace(
          regexp_replace(
            coalesce(
              nullif(trim(post_title), ''),
              nullif(regexp_replace(regexp_replace(file_name, '\.[^.]+$', ''), '[-_]+', ' ', 'g'), '')
            ),
            '\s+\d+$',
            '',
            'g'
          ),
          '\s+',
          ' ',
          'g'
        ),
        ''
      ),
      'Journal event photo'
    )
    else null
  end;

  insert into public.media_assets(
    asset_type,title,alt_text,original_filename,storage_bucket,storage_path,external_url,provider,
    mime_type,file_extension,file_size_bytes,visibility,status,metadata,tags,created_by,updated_by,
    published_at,show_in_media_vault,captured_at
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
    v_metadata,
    array['journal','event-footage'],
    auth.uid(),auth.uid(),now(),true,
    v_captured
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
  uuid, text, text, text, text, bigint, text, integer, jsonb, timestamptz
) to authenticated, service_role;

drop function if exists public.admin_get_journal_footage(uuid);

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
  original_filename text,
  captured_at timestamptz
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
    ) as original_filename,
    ma.captured_at
  from public.journal_post_media jpm
  join public.media_assets ma on ma.id = jpm.media_asset_id
  where jpm.journal_post_id = p_post_id
    and ma.storage_path like 'journal/%'
    and ma.asset_type in ('image', 'video')
  order by ma.captured_at desc nulls last, jpm.created_at desc, jpm.id asc;
end;
$function$;

revoke all on function public.admin_get_journal_footage(uuid) from public;
grant execute on function public.admin_get_journal_footage(uuid) to authenticated, service_role;

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
      ma.captured_at,
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
          c.captured_at desc nulls last,
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
          'captured_at', c.captured_at,
          'original_filename', c.original_filename
        )
        order by c.captured_at desc nulls last, c.created_at desc, c.asset_id asc
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
