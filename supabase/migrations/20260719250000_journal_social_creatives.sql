-- Journal social creatives: generate-only IG/X image + caption packs from journal footage.

begin;

create table if not exists public.journal_social_creatives (
  id uuid primary key default gen_random_uuid(),
  journal_post_id uuid not null references public.journal_posts(id) on delete cascade,
  source_media_asset_id uuid not null references public.media_assets(id) on delete restrict,
  status text not null default 'pending'
    check (status in ('pending', 'generating', 'ready', 'failed')),
  hook_text text,
  caption_instagram_feed text,
  caption_instagram_story text,
  caption_x text,
  image_ig_feed_media_id uuid references public.media_assets(id) on delete set null,
  image_ig_story_media_id uuid references public.media_assets(id) on delete set null,
  image_x_media_id uuid references public.media_assets(id) on delete set null,
  model_image text,
  model_caption text,
  error_message text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists journal_social_creatives_post_created_idx
  on public.journal_social_creatives (journal_post_id, created_at desc);

create index if not exists journal_social_creatives_status_idx
  on public.journal_social_creatives (status);

alter table public.journal_social_creatives enable row level security;

drop policy if exists "active admins read journal social creatives" on public.journal_social_creatives;
create policy "active admins read journal social creatives"
on public.journal_social_creatives for select to authenticated
using (public.has_active_admin_access());

drop policy if exists "active admins insert journal social creatives" on public.journal_social_creatives;
create policy "active admins insert journal social creatives"
on public.journal_social_creatives for insert to authenticated
with check (public.has_active_admin_access());

drop policy if exists "active admins update journal social creatives" on public.journal_social_creatives;
create policy "active admins update journal social creatives"
on public.journal_social_creatives for update to authenticated
using (public.has_active_admin_access())
with check (public.has_active_admin_access());

drop policy if exists "active admins delete journal social creatives" on public.journal_social_creatives;
create policy "active admins delete journal social creatives"
on public.journal_social_creatives for delete to authenticated
using (public.has_active_admin_access());

revoke all on table public.journal_social_creatives from public;
grant select, insert, update, delete on table public.journal_social_creatives to authenticated;
grant all on table public.journal_social_creatives to service_role;

create or replace function public.admin_start_journal_social_creative(
  p_post_id uuid,
  p_source_media_asset_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_post public.journal_posts%rowtype;
  v_asset public.media_assets%rowtype;
  v_linked boolean := false;
  v_creative public.journal_social_creatives%rowtype;
  v_public_url text;
begin
  if not public.is_admin_user() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  if p_post_id is null or p_source_media_asset_id is null then
    raise exception 'post_id and source_media_asset_id are required.';
  end if;

  select * into v_post from public.journal_posts where id = p_post_id;
  if not found then
    raise exception 'Journal post not found.';
  end if;

  select * into v_asset from public.media_assets where id = p_source_media_asset_id;
  if not found then
    raise exception 'Source media asset not found.';
  end if;

  if v_asset.asset_type <> 'image' then
    raise exception 'Source media must be an image.';
  end if;

  select exists (
    select 1
    from public.journal_post_media jpm
    where jpm.journal_post_id = p_post_id
      and jpm.media_asset_id = p_source_media_asset_id
  ) into v_linked;

  if not v_linked then
    raise exception 'Source media is not linked to this journal post.';
  end if;

  if coalesce(v_asset.storage_bucket, '') = '' or coalesce(v_asset.storage_path, '') = '' then
    raise exception 'Source media is missing storage location.';
  end if;

  insert into public.journal_social_creatives (
    journal_post_id,
    source_media_asset_id,
    status,
    created_by
  ) values (
    p_post_id,
    p_source_media_asset_id,
    'generating',
    auth.uid()
  )
  returning * into v_creative;

  v_public_url := concat(
    '/storage/v1/object/public/',
    v_asset.storage_bucket,
    '/',
    v_asset.storage_path
  );

  return jsonb_build_object(
    'creative_id', v_creative.id,
    'journal_post_id', v_post.id,
    'slug', v_post.slug,
    'title', v_post.title,
    'subtitle', v_post.subtitle,
    'excerpt', v_post.excerpt,
    'body', left(coalesce(v_post.body, ''), 4000),
    'source_media_asset_id', v_asset.id,
    'source_storage_bucket', v_asset.storage_bucket,
    'source_storage_path', v_asset.storage_path,
    'source_public_path', v_public_url,
    'source_mime_type', v_asset.mime_type
  );
end;
$function$;

create or replace function public.admin_register_journal_social_image(
  p_creative_id uuid,
  p_format text,
  p_bucket_name text,
  p_object_path text,
  p_file_name text,
  p_mime_type text,
  p_file_size bigint,
  p_width integer default null,
  p_height integer default null
)
returns public.media_assets
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_creative public.journal_social_creatives%rowtype;
  v_result public.media_assets%rowtype;
  v_format text;
begin
  if not public.is_admin_user() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  v_format := lower(trim(coalesce(p_format, '')));
  if v_format not in ('ig_feed', 'ig_story', 'x') then
    raise exception 'Unsupported social format.';
  end if;

  if coalesce(p_bucket_name, '') = '' or coalesce(p_object_path, '') = '' then
    raise exception 'Storage location is required.';
  end if;

  select * into v_creative
  from public.journal_social_creatives
  where id = p_creative_id
  for update;

  if not found then
    raise exception 'Social creative not found.';
  end if;

  if p_object_path not like ('journal/' || v_creative.journal_post_id::text || '/social/' || p_creative_id::text || '/%') then
    raise exception 'Social image path does not match creative.';
  end if;

  insert into public.media_assets(
    asset_type, title, alt_text, caption, original_filename, storage_bucket, storage_path,
    external_url, provider, mime_type, file_extension, file_size_bytes, width, height,
    aspect_ratio, visibility, status, metadata, tags, created_by, updated_by,
    published_at, show_in_media_vault
  ) values (
    'image',
    coalesce(nullif(p_file_name, ''), 'Journal social creative'),
    'Social creative for journal post',
    v_format,
    p_file_name,
    p_bucket_name,
    p_object_path,
    null,
    'supabase',
    coalesce(nullif(p_mime_type, ''), 'image/png'),
    nullif(regexp_replace(p_file_name, '^.*\.', ''), ''),
    p_file_size,
    p_width,
    p_height,
    case v_format
      when 'ig_feed' then 1.0
      when 'ig_story' then 0.5625
      when 'x' then 1.7778
      else null
    end,
    'public',
    'published',
    jsonb_build_object(
      'source', 'journal_social_creative',
      'creative_id', p_creative_id,
      'format', v_format,
      'journal_post_id', v_creative.journal_post_id
    ),
    array['journal', 'social-creative', v_format],
    auth.uid(),
    auth.uid(),
    now(),
    false
  )
  returning * into v_result;

  if v_format = 'ig_feed' then
    update public.journal_social_creatives
    set image_ig_feed_media_id = v_result.id, updated_at = now()
    where id = p_creative_id;
  elsif v_format = 'ig_story' then
    update public.journal_social_creatives
    set image_ig_story_media_id = v_result.id, updated_at = now()
    where id = p_creative_id;
  else
    update public.journal_social_creatives
    set image_x_media_id = v_result.id, updated_at = now()
    where id = p_creative_id;
  end if;

  return v_result;
end;
$function$;

create or replace function public.admin_finalize_journal_social_creative(
  p_creative_id uuid,
  p_status text,
  p_hook_text text default null,
  p_caption_instagram_feed text default null,
  p_caption_instagram_story text default null,
  p_caption_x text default null,
  p_model_image text default null,
  p_model_caption text default null,
  p_error_message text default null
)
returns public.journal_social_creatives
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_status text;
  v_result public.journal_social_creatives%rowtype;
begin
  if not public.is_admin_user() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  v_status := lower(trim(coalesce(p_status, '')));
  if v_status not in ('ready', 'failed', 'generating') then
    raise exception 'Unsupported creative status.';
  end if;

  update public.journal_social_creatives
  set
    status = v_status,
    hook_text = coalesce(p_hook_text, hook_text),
    caption_instagram_feed = coalesce(p_caption_instagram_feed, caption_instagram_feed),
    caption_instagram_story = coalesce(p_caption_instagram_story, caption_instagram_story),
    caption_x = coalesce(p_caption_x, caption_x),
    model_image = coalesce(p_model_image, model_image),
    model_caption = coalesce(p_model_caption, model_caption),
    error_message = case when v_status = 'failed' then p_error_message else null end,
    updated_at = now()
  where id = p_creative_id
  returning * into v_result;

  if not found then
    raise exception 'Social creative not found.';
  end if;

  if v_status = 'ready' and (
    v_result.image_ig_feed_media_id is null
    or v_result.image_ig_story_media_id is null
    or v_result.image_x_media_id is null
  ) then
    raise exception 'Ready creatives require all three social images.';
  end if;

  return v_result;
end;
$function$;

create or replace function public.admin_get_journal_social_creatives(
  p_post_id uuid
)
returns table (
  id uuid,
  journal_post_id uuid,
  source_media_asset_id uuid,
  status text,
  hook_text text,
  caption_instagram_feed text,
  caption_instagram_story text,
  caption_x text,
  model_image text,
  model_caption text,
  error_message text,
  created_at timestamptz,
  updated_at timestamptz,
  image_ig_feed_url text,
  image_ig_story_url text,
  image_x_url text,
  source_image_url text
)
language plpgsql
security definer
set search_path = public
as $function$
begin
  if not public.is_admin_user() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  return query
  select
    c.id,
    c.journal_post_id,
    c.source_media_asset_id,
    c.status,
    c.hook_text,
    c.caption_instagram_feed,
    c.caption_instagram_story,
    c.caption_x,
    c.model_image,
    c.model_caption,
    c.error_message,
    c.created_at,
    c.updated_at,
    case
      when feed.storage_bucket is not null and feed.storage_path is not null
        then concat('/storage/v1/object/public/', feed.storage_bucket, '/', feed.storage_path)
      else null
    end as image_ig_feed_url,
    case
      when story.storage_bucket is not null and story.storage_path is not null
        then concat('/storage/v1/object/public/', story.storage_bucket, '/', story.storage_path)
      else null
    end as image_ig_story_url,
    case
      when ximg.storage_bucket is not null and ximg.storage_path is not null
        then concat('/storage/v1/object/public/', ximg.storage_bucket, '/', ximg.storage_path)
      else null
    end as image_x_url,
    case
      when src.storage_bucket is not null and src.storage_path is not null
        then concat('/storage/v1/object/public/', src.storage_bucket, '/', src.storage_path)
      else null
    end as source_image_url
  from public.journal_social_creatives c
  left join public.media_assets feed on feed.id = c.image_ig_feed_media_id
  left join public.media_assets story on story.id = c.image_ig_story_media_id
  left join public.media_assets ximg on ximg.id = c.image_x_media_id
  left join public.media_assets src on src.id = c.source_media_asset_id
  where c.journal_post_id = p_post_id
  order by c.created_at desc;
end;
$function$;

revoke all on function public.admin_start_journal_social_creative(uuid, uuid) from public;
revoke all on function public.admin_register_journal_social_image(uuid, text, text, text, text, text, bigint, integer, integer) from public;
revoke all on function public.admin_finalize_journal_social_creative(uuid, text, text, text, text, text, text, text, text) from public;
revoke all on function public.admin_get_journal_social_creatives(uuid) from public;

grant execute on function public.admin_start_journal_social_creative(uuid, uuid) to authenticated;
grant execute on function public.admin_register_journal_social_image(uuid, text, text, text, text, text, bigint, integer, integer) to authenticated;
grant execute on function public.admin_finalize_journal_social_creative(uuid, text, text, text, text, text, text, text, text) to authenticated;
grant execute on function public.admin_get_journal_social_creatives(uuid) to authenticated;

insert into public.ai_edge_function_configs (
  edge_function_slug,
  display_name,
  description,
  provider,
  model,
  model_env_key,
  system_prompt,
  user_prompt_template,
  temperature,
  max_output_tokens,
  response_format,
  generation_settings,
  input_schema,
  output_schema,
  secret_env_key,
  entrypoint_path,
  verify_jwt,
  is_active,
  is_deprecated,
  config_version,
  notes,
  metadata,
  timeout_ms,
  retry_policy,
  enable_run_logging,
  primary_model_id
)
select
  'generate-journal-social-creative',
  'Generate journal social creatives',
  'Writes Instagram/X captions and a short on-image hook for journal social creatives. Image reframing uses Flux Kontext Pro via fal.',
  provider,
  model,
  model_env_key,
  'You write short social media copy for Bankrupt to 1 Million journal posts. Return valid JSON only. No markdown.',
  'Create social copy for a journal post about an honest rebuild journey.

Return exactly one JSON object with these string fields:
- hook: short on-image title/hook, max 8 words, no hashtags
- caption_instagram_feed: Instagram feed caption, 1-3 short paragraphs, optional hashtags at end, include the journal URL if provided
- caption_instagram_story: shorter Instagram story caption, 1-2 sentences, include the journal URL if provided
- caption_x: X/Twitter caption, max 260 characters including the journal URL if provided

Tone: personal, credible, founder voice. No hype. English only.',
  0.6,
  2048,
  '{"type":"json_object"}'::jsonb,
  jsonb_build_object(
    'image_provider', 'fal',
    'image_model', 'fal-ai/flux-pro/kontext',
    'formats', jsonb_build_array('ig_feed', 'ig_story', 'x')
  ),
  '{"required":["post_id","source_media_asset_id"]}'::jsonb,
  '{"required":["ok","creative_id"]}'::jsonb,
  secret_env_key,
  'index.ts',
  true,
  true,
  false,
  1,
  'Caption/hook generation for journal social creatives. Image model is Flux Kontext Pro via FAL_KEY.',
  jsonb_build_object(
    'domain', 'journal',
    'feature', 'social_creatives',
    'architecture', 'hybrid_flux_openrouter',
    'runtime_config_implemented', true,
    'writes_tables', jsonb_build_array('journal_social_creatives', 'media_assets')
  ),
  180000,
  '{"retry_on":[429,500,502,503,504],"max_attempts":2,"base_delay_ms":1000}'::jsonb,
  true,
  primary_model_id
from public.ai_edge_function_configs
where edge_function_slug = 'generate-journal-ai-post'
on conflict (edge_function_slug) do update set
  display_name = excluded.display_name,
  description = excluded.description,
  system_prompt = excluded.system_prompt,
  user_prompt_template = excluded.user_prompt_template,
  temperature = excluded.temperature,
  max_output_tokens = excluded.max_output_tokens,
  response_format = excluded.response_format,
  generation_settings = excluded.generation_settings,
  input_schema = excluded.input_schema,
  output_schema = excluded.output_schema,
  metadata = excluded.metadata,
  timeout_ms = excluded.timeout_ms,
  retry_policy = excluded.retry_policy,
  enable_run_logging = excluded.enable_run_logging,
  updated_at = now();

commit;
