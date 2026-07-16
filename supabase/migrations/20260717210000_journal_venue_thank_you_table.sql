begin;

-- Dedicated venue thank-you entity per journal post (decoupled from place context)

create table if not exists public.journal_post_venue_thank_you (
  id uuid primary key default gen_random_uuid(),
  journal_post_id uuid not null unique references public.journal_posts(id) on delete cascade,
  generation_status text not null default 'pending'
    check (generation_status in ('pending', 'processing', 'completed', 'failed', 'skipped')),
  draft_payload jsonb,
  last_error text,
  ai_model text,
  generated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.journal_post_venue_thank_you_translations (
  id uuid primary key default gen_random_uuid(),
  venue_thank_you_id uuid not null references public.journal_post_venue_thank_you(id) on delete cascade,
  language_code text not null references public.site_languages(code) on delete restrict,
  message text not null,
  translation_status text not null default 'draft'
    check (translation_status in ('draft', 'review', 'published', 'archived')),
  translation_source text not null default 'ai',
  translated_at timestamptz,
  reviewed_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (venue_thank_you_id, language_code)
);

create index if not exists journal_post_venue_thank_you_post_idx
  on public.journal_post_venue_thank_you (journal_post_id);

create index if not exists journal_post_venue_thank_you_translations_lang_idx
  on public.journal_post_venue_thank_you_translations (venue_thank_you_id, language_code);

alter table public.journal_post_venue_thank_you enable row level security;
alter table public.journal_post_venue_thank_you_translations enable row level security;

create policy "public reads published venue thank-you"
  on public.journal_post_venue_thank_you for select
  using (
    generation_status = 'completed'
    and exists (
      select 1 from public.journal_posts p
      where p.id = journal_post_id
        and p.status = 'published'
        and p.published_at is not null
        and p.published_at <= now()
    )
  );

create policy "public reads published venue thank-you translations"
  on public.journal_post_venue_thank_you_translations for select
  using (
    translation_status = 'published'
    and (published_at is null or published_at <= now())
    and exists (
      select 1
      from public.journal_post_venue_thank_you v
      join public.journal_post_place_context c on c.journal_post_id = v.journal_post_id
      join public.journal_posts p on p.id = v.journal_post_id
      where v.id = venue_thank_you_id
        and v.generation_status = 'completed'
        and c.generation_status = 'completed'
        and p.status = 'published'
        and p.published_at is not null
        and p.published_at <= now()
    )
  );

create or replace function public.journal_venue_thank_you_draft_lang_complete(
  p_draft jsonb,
  p_lang text
)
returns boolean
language plpgsql
immutable
as $$
declare
  v_row jsonb;
begin
  if p_draft is null or jsonb_typeof(p_draft) <> 'object' then
    return false;
  end if;
  v_row := p_draft->'translations'->p_lang;
  return nullif(trim(v_row->>'message'), '') is not null;
end;
$$;

create or replace function public.journal_venue_thank_you_completed_translation_count(p_post_id uuid)
returns bigint
language sql
stable
security definer
set search_path to 'public', 'pg_catalog', 'pg_temp'
as $function$
  with ctx as (
    select v.draft_payload
    from public.journal_post_venue_thank_you v
    where v.journal_post_id = p_post_id
      and v.generation_status = 'processing'
    limit 1
  ),
  langs as (
    select sl.code from public.site_languages sl where sl.is_active = true
  )
  select count(*)::bigint
  from langs l
  cross join ctx
  where public.journal_venue_thank_you_draft_lang_complete(ctx.draft_payload, l.code);
$function$;

revoke all on function public.journal_venue_thank_you_completed_translation_count(uuid) from public;
grant execute on function public.journal_venue_thank_you_completed_translation_count(uuid) to service_role;

create or replace function public.list_journal_venue_thank_you_needing_batch(p_limit integer default 2)
returns table(journal_post_id uuid, translation_count bigint, expected_count bigint)
language sql
security definer
set search_path to 'public', 'pg_catalog', 'pg_temp'
as $function$
  with expected as (
    select count(*)::bigint as total from public.site_languages where is_active = true
  )
  select
    v.journal_post_id,
    public.journal_venue_thank_you_completed_translation_count(v.journal_post_id) as translation_count,
    expected.total as expected_count
  from public.journal_post_venue_thank_you v
  cross join expected
  where v.generation_status = 'processing'
    and (
      v.draft_payload is null
      or public.journal_venue_thank_you_completed_translation_count(v.journal_post_id) < expected.total
    )
  order by v.updated_at asc
  limit greatest(1, least(coalesce(p_limit, 2), 5));
$function$;

revoke all on function public.list_journal_venue_thank_you_needing_batch(integer) from public;
grant execute on function public.list_journal_venue_thank_you_needing_batch(integer) to service_role;

create or replace function public.recover_stale_journal_venue_thank_you_generation(p_stale_minutes integer default 5)
returns integer
language plpgsql
security definer
set search_path to 'public', 'pg_catalog', 'pg_temp'
as $function$
declare
  v_stale interval := make_interval(mins => greatest(3, least(coalesce(p_stale_minutes, 5), 60)));
  v_count integer := 0;
  v_expected bigint;
begin
  select count(*)::bigint into v_expected from public.site_languages where is_active = true;

  update public.journal_post_venue_thank_you v
  set last_error = null, updated_at = now()
  where v.generation_status = 'processing'
    and v.draft_payload is not null
    and v.updated_at < now() - v_stale
    and public.journal_venue_thank_you_completed_translation_count(v.journal_post_id) < v_expected;

  get diagnostics v_count = row_count;
  return v_count;
end;
$function$;

revoke all on function public.recover_stale_journal_venue_thank_you_generation(integer) from public;
grant execute on function public.recover_stale_journal_venue_thank_you_generation(integer) to service_role;

create or replace function public.save_journal_venue_thank_you_result(
  p_post_id uuid,
  p_payload jsonb,
  p_model text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_catalog', 'pg_temp'
as $$
declare
  v_entry record;
  v_row_id uuid;
  v_lang text;
  v_item jsonb;
  v_message text;
  v_published timestamptz := now();
  v_active_languages text[];
  v_expected_count integer;
  v_translation_count integer;
begin
  if jsonb_typeof(p_payload) <> 'object' then
    raise exception 'venue_thank_you payload must be an object';
  end if;

  select je.featured_business_name, je.latitude, je.longitude
  into v_entry
  from public.journal_journey_entries je
  where je.journal_post_id = p_post_id
  order by je.created_at asc
  limit 1;

  if not found then
    raise exception 'Journey entry not found for post %', p_post_id;
  end if;

  if v_entry.featured_business_name is null and v_entry.latitude is null and v_entry.longitude is null then
    insert into public.journal_post_venue_thank_you (journal_post_id, generation_status, updated_at)
    values (p_post_id, 'skipped', v_published)
    on conflict (journal_post_id) do update set generation_status = 'skipped', updated_at = v_published;
    return jsonb_build_object('ok', true, 'skipped', true, 'post_id', p_post_id);
  end if;

  if not exists (
    select 1 from public.journal_post_place_context c
    where c.journal_post_id = p_post_id and c.generation_status = 'completed'
  ) then
    raise exception 'Place context must be completed before saving venue thank-you for post %', p_post_id;
  end if;

  select coalesce(array_agg(code order by display_order), '{}') into v_active_languages
  from public.site_languages where is_active = true;

  v_expected_count := coalesce(array_length(v_active_languages, 1), 0);
  if v_expected_count = 0 then raise exception 'No active languages configured'; end if;

  insert into public.journal_post_venue_thank_you (
    journal_post_id, generation_status, draft_payload, last_error, ai_model, generated_at, updated_at
  ) values (
    p_post_id, 'completed', null, null, p_model, v_published, v_published
  )
  on conflict (journal_post_id) do update set
    generation_status = 'completed',
    draft_payload = null,
    last_error = null,
    ai_model = excluded.ai_model,
    generated_at = v_published,
    updated_at = v_published
  returning id into v_row_id;

  delete from public.journal_post_venue_thank_you_translations where venue_thank_you_id = v_row_id;

  foreach v_lang in array v_active_languages loop
    v_item := p_payload->'translations'->v_lang;
    v_message := nullif(trim(v_item->>'message'), '');
    if v_message is null then
      raise exception 'Missing venue thank-you message for %', v_lang;
    end if;
    if char_length(v_message) > 1200 then
      raise exception 'Venue thank-you message too long for %', v_lang;
    end if;
    insert into public.journal_post_venue_thank_you_translations (
      venue_thank_you_id, language_code, message, translation_status, translation_source,
      translated_at, reviewed_at, published_at, updated_at
    ) values (
      v_row_id, v_lang, v_message, 'published', 'ai', v_published, v_published, v_published, v_published
    );
  end loop;

  select count(*) into v_translation_count
  from public.journal_post_venue_thank_you_translations
  where venue_thank_you_id = v_row_id and translation_status = 'published';

  if v_translation_count <> v_expected_count then
    raise exception 'Expected % venue thank-you translations, found %', v_expected_count, v_translation_count;
  end if;

  return jsonb_build_object(
    'ok', true,
    'post_id', p_post_id,
    'venue_thank_you_id', v_row_id,
    'translation_count', v_translation_count
  );
end;
$$;

grant execute on function public.save_journal_venue_thank_you_result(uuid, jsonb, text) to service_role;

-- Restore place-context batch completion without thank-you coupling
create or replace function public.journal_place_context_draft_lang_complete(
  p_draft jsonb,
  p_lang text
)
returns boolean
language plpgsql
immutable
as $$
declare
  v_row jsonb;
  v_poi jsonb;
  v_poi_trans jsonb;
begin
  if p_draft is null or jsonb_typeof(p_draft) <> 'object' then
    return false;
  end if;

  v_row := p_draft->'translations'->p_lang;
  if v_row is null
     or nullif(trim(v_row->>'place_title'), '') is null
     or nullif(trim(v_row->>'place_history'), '') is null
     or nullif(trim(v_row->>'area_title'), '') is null
     or nullif(trim(v_row->>'area_history'), '') is null then
    return false;
  end if;

  if jsonb_array_length(coalesce(p_draft->'pois', '[]'::jsonb)) <> 5 then
    return false;
  end if;

  for v_poi in
    select value from jsonb_array_elements(coalesce(p_draft->'pois', '[]'::jsonb))
  loop
    v_poi_trans := v_poi->'translations'->p_lang;
    if v_poi_trans is null
       or nullif(trim(v_poi_trans->>'title'), '') is null
       or nullif(trim(v_poi_trans->>'description'), '') is null then
      return false;
    end if;
  end loop;

  return true;
end;
$$;

-- Unblock place contexts stuck in thank-you backfill processing
update public.journal_post_place_context c
set
  generation_status = 'completed',
  draft_payload = null,
  last_error = null,
  updated_at = now()
where c.generation_status = 'processing'
  and exists (
    select 1
    from public.journal_post_place_context_translations t
    where t.place_context_id = c.id
      and t.translation_status = 'published'
  );

-- Seed venue thank-you rows: migrate in-flight draft messages from place context when present
insert into public.journal_post_venue_thank_you (journal_post_id, generation_status, draft_payload, updated_at)
select
  c.journal_post_id,
  'processing',
  jsonb_build_object(
    'translations',
    coalesce((
      select jsonb_object_agg(lang_key, jsonb_build_object('message', trim(lang_row->>'venue_thank_you_message')))
      from jsonb_each(c.draft_payload->'translations') as e(lang_key, lang_row)
      where nullif(trim(lang_row->>'venue_thank_you_message'), '') is not null
    ), '{}'::jsonb)
  ),
  now()
from public.journal_post_place_context c
where c.draft_payload is not null
  and c.draft_payload->'translations' is not null
  and exists (
    select 1
    from jsonb_each(c.draft_payload->'translations') as e(lang_key, lang_row)
    where nullif(trim(lang_row->>'venue_thank_you_message'), '') is not null
  )
on conflict (journal_post_id) do update set
  generation_status = 'processing',
  draft_payload = excluded.draft_payload,
  last_error = null,
  updated_at = now();

-- Queue thank-you generation for completed place contexts without a thank-you record
insert into public.journal_post_venue_thank_you (journal_post_id, generation_status, updated_at)
select c.journal_post_id, 'processing', now()
from public.journal_post_place_context c
where c.generation_status = 'completed'
  and not exists (
    select 1 from public.journal_post_venue_thank_you v where v.journal_post_id = c.journal_post_id
  )
on conflict (journal_post_id) do nothing;

-- Queue posts with incomplete thank-you translations
insert into public.journal_post_venue_thank_you (journal_post_id, generation_status, updated_at)
select c.journal_post_id, 'processing', now()
from public.journal_post_place_context c
where c.generation_status = 'completed'
  and exists (
    select 1 from public.journal_post_venue_thank_you v
    where v.journal_post_id = c.journal_post_id
      and v.generation_status = 'completed'
      and (
        select count(*)
        from public.journal_post_venue_thank_you_translations t
        where t.venue_thank_you_id = v.id and t.translation_status = 'published'
      ) < (select count(*) from public.site_languages where is_active = true)
  )
on conflict (journal_post_id) do update set
  generation_status = 'processing',
  last_error = null,
  updated_at = now()
where journal_post_venue_thank_you.generation_status = 'completed';

create or replace function public.get_localized_journal_place_context(
  p_slug text,
  p_language_code text
)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public', 'pg_catalog', 'pg_temp'
as $$
declare
  v_post_id uuid;
  v_context public.journal_post_place_context%rowtype;
  v_lang text;
  v_trans public.journal_post_place_context_translations%rowtype;
  v_pois jsonb;
  v_thank_you jsonb;
  v_thank_you_message text;
begin
  select p.id into v_post_id
  from public.journal_posts p
  where p.slug = p_slug
    and p.status = 'published'
    and p.published_at is not null
    and p.published_at <= now();

  if v_post_id is null then return null; end if;

  select * into v_context
  from public.journal_post_place_context c
  where c.journal_post_id = v_post_id and c.generation_status = 'completed';

  if not found then return null; end if;

  v_lang := coalesce(nullif(trim(p_language_code), ''), 'en');

  select * into v_trans
  from public.journal_post_place_context_translations t
  where t.place_context_id = v_context.id
    and t.language_code = v_lang
    and t.translation_status = 'published'
    and (t.published_at is null or t.published_at <= now());

  if not found then
    select * into v_trans
    from public.journal_post_place_context_translations t
    where t.place_context_id = v_context.id
      and t.language_code = 'en'
      and t.translation_status = 'published'
      and (t.published_at is null or t.published_at <= now());
  end if;

  if not found then return null; end if;

  select coalesce(loc.message, en.message) into v_thank_you_message
  from public.journal_post_venue_thank_you v
  left join lateral (
    select t.message
    from public.journal_post_venue_thank_you_translations t
    where t.venue_thank_you_id = v.id
      and t.language_code = v_lang
      and t.translation_status = 'published'
      and (t.published_at is null or t.published_at <= now())
    limit 1
  ) loc on true
  left join lateral (
    select t.message
    from public.journal_post_venue_thank_you_translations t
    where t.venue_thank_you_id = v.id
      and t.language_code = 'en'
      and t.translation_status = 'published'
      and (t.published_at is null or t.published_at <= now())
    limit 1
  ) en on true
  where v.journal_post_id = v_post_id and v.generation_status = 'completed';

  v_thank_you := case
    when nullif(trim(v_thank_you_message), '') is not null then jsonb_build_object('message', trim(v_thank_you_message))
    else null
  end;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'display_order', poi.display_order,
      'poi_type', poi.poi_type,
      'title', coalesce(loc.title, en.title),
      'description', coalesce(loc.description, en.description),
      'latitude', poi.latitude,
      'longitude', poi.longitude,
      'google_maps_url', coalesce(poi.google_maps_url, public.build_google_maps_url(poi.latitude, poi.longitude))
    )
    order by poi.display_order
  ), '[]'::jsonb)
  into v_pois
  from public.journal_post_pois poi
  left join lateral (
    select pt.title, pt.description from public.journal_post_poi_translations pt
    where pt.poi_id = poi.id and pt.language_code = v_lang
      and pt.translation_status = 'published'
      and (pt.published_at is null or pt.published_at <= now()) limit 1
  ) loc on true
  left join lateral (
    select pt.title, pt.description from public.journal_post_poi_translations pt
    where pt.poi_id = poi.id and pt.language_code = 'en'
      and pt.translation_status = 'published'
      and (pt.published_at is null or pt.published_at <= now()) limit 1
  ) en on true
  where poi.journal_post_id = v_post_id and coalesce(loc.title, en.title) is not null;

  return jsonb_build_object(
    'place_type', v_context.place_type,
    'area_type', v_context.area_type,
    'area_name', v_context.area_name,
    'latitude', v_context.latitude,
    'longitude', v_context.longitude,
    'active_language', v_trans.language_code,
    'links', jsonb_build_object(
      'google_maps_url', coalesce(v_context.google_maps_url, public.build_google_maps_url(v_context.latitude, v_context.longitude)),
      'website_url', v_context.website_url,
      'instagram_url', v_context.instagram_url
    ),
    'place', jsonb_build_object('title', v_trans.place_title, 'history', v_trans.place_history),
    'area', jsonb_build_object('title', v_trans.area_title, 'history', v_trans.area_history),
    'thank_you', v_thank_you,
    'pois', v_pois
  );
end;
$$;

-- Restore place-context save RPC without thank-you column requirement
create or replace function public.save_journal_place_context_result(
  p_post_id uuid,
  p_place_context jsonb,
  p_model text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_catalog', 'pg_temp'
as $$
declare
  v_entry record;
  v_context_id uuid;
  v_lang text;
  v_item jsonb;
  v_poi jsonb;
  v_poi_id uuid;
  v_poi_idx integer;
  v_published timestamptz := now();
  v_active_languages text[];
  v_expected_count integer;
  v_translation_count integer;
  v_poi_count integer;
  v_links jsonb;
  v_google_maps_url text;
  v_poi_lat numeric;
  v_poi_lng numeric;
  v_poi_maps_url text;
  v_poi_source text;
begin
  if jsonb_typeof(p_place_context) <> 'object' then
    raise exception 'place_context must be an object';
  end if;

  select je.latitude, je.longitude, je.featured_business_name, je.location_name, je.city_name, je.region_name
  into v_entry
  from public.journal_journey_entries je
  where je.journal_post_id = p_post_id
  order by je.created_at asc
  limit 1;

  if not found then raise exception 'Journey entry not found for post %', p_post_id; end if;

  if v_entry.featured_business_name is null and v_entry.latitude is null and v_entry.longitude is null then
    insert into public.journal_post_place_context (journal_post_id, generation_status, updated_at)
    values (p_post_id, 'skipped', v_published)
    on conflict (journal_post_id) do update set generation_status = 'skipped', updated_at = v_published;
    return jsonb_build_object('ok', true, 'skipped', true, 'post_id', p_post_id);
  end if;

  select coalesce(array_agg(code order by display_order), '{}') into v_active_languages
  from public.site_languages where is_active = true;

  v_expected_count := coalesce(array_length(v_active_languages, 1), 0);
  if v_expected_count = 0 then raise exception 'No active languages configured'; end if;
  if jsonb_array_length(coalesce(p_place_context->'pois', '[]'::jsonb)) <> 5 then
    raise exception 'Expected exactly 5 POIs';
  end if;

  v_links := coalesce(p_place_context->'links', '{}'::jsonb);
  v_google_maps_url := nullif(trim(v_links->>'google_maps_url'), '');
  if v_google_maps_url is null then
    v_google_maps_url := public.build_google_maps_url(v_entry.latitude, v_entry.longitude);
  end if;

  insert into public.journal_post_place_context (
    journal_post_id, place_type, area_type, area_name, latitude, longitude,
    google_maps_url, website_url, instagram_url, generation_status, generated_at, ai_model,
    draft_payload, last_error, updated_at
  ) values (
    p_post_id,
    coalesce(nullif(trim(p_place_context->>'place_type'), ''), 'other'),
    coalesce(nullif(trim(p_place_context->>'area_type'), ''), 'town'),
    coalesce(nullif(trim(p_place_context->>'area_name'), ''), nullif(trim(v_entry.city_name), ''), nullif(trim(v_entry.location_name), ''), nullif(trim(v_entry.region_name), '')),
    v_entry.latitude, v_entry.longitude, v_google_maps_url,
    nullif(trim(v_links->>'website_url'), ''), nullif(trim(v_links->>'instagram_url'), ''),
    'completed', v_published, p_model, null, null, v_published
  )
  on conflict (journal_post_id) do update set
    place_type = excluded.place_type, area_type = excluded.area_type, area_name = excluded.area_name,
    latitude = excluded.latitude, longitude = excluded.longitude,
    google_maps_url = excluded.google_maps_url, website_url = excluded.website_url, instagram_url = excluded.instagram_url,
    generation_status = 'completed', generated_at = v_published, ai_model = excluded.ai_model,
    draft_payload = null, last_error = null, updated_at = v_published
  returning id into v_context_id;

  delete from public.journal_post_place_context_translations where place_context_id = v_context_id;

  foreach v_lang in array v_active_languages loop
    v_item := p_place_context->'translations'->v_lang;
    if v_item is null or nullif(trim(v_item->>'place_title'), '') is null or nullif(trim(v_item->>'place_history'), '') is null
       or nullif(trim(v_item->>'area_title'), '') is null or nullif(trim(v_item->>'area_history'), '') is null then
      raise exception 'Missing valid place context translation for %', v_lang;
    end if;
    insert into public.journal_post_place_context_translations (
      place_context_id, language_code, place_title, place_history, area_title, area_history,
      translation_status, translation_source, translated_at, reviewed_at, published_at, updated_at
    ) values (
      v_context_id, v_lang, trim(v_item->>'place_title'), trim(v_item->>'place_history'),
      trim(v_item->>'area_title'), trim(v_item->>'area_history'),
      'published', 'ai', v_published, v_published, v_published, v_published
    );
  end loop;

  select count(*) into v_translation_count from public.journal_post_place_context_translations
  where place_context_id = v_context_id and translation_status = 'published';

  delete from public.journal_post_poi_translations where poi_id in (select id from public.journal_post_pois where journal_post_id = p_post_id);
  delete from public.journal_post_pois where journal_post_id = p_post_id;

  v_poi_idx := 0;
  for v_poi in select value from jsonb_array_elements(coalesce(p_place_context->'pois', '[]'::jsonb)) order by coalesce((value->>'display_order')::integer, 0) loop
    v_poi_idx := v_poi_idx + 1;
    v_poi_lat := nullif(trim(v_poi->>'latitude'), '')::numeric;
    v_poi_lng := nullif(trim(v_poi->>'longitude'), '')::numeric;
    if v_poi_lat is null or v_poi_lng is null then raise exception 'Missing POI coordinates for order %', v_poi_idx; end if;
    v_poi_source := coalesce(nullif(trim(v_poi->>'coordinate_source'), ''), 'ai');
    v_poi_maps_url := coalesce(nullif(trim(v_poi->>'google_maps_url'), ''), public.build_google_maps_url(v_poi_lat, v_poi_lng));
    insert into public.journal_post_pois (
      journal_post_id, display_order, poi_type, latitude, longitude, google_maps_url, coordinate_source, updated_at
    ) values (
      p_post_id, coalesce(nullif((v_poi->>'display_order')::integer, 0), v_poi_idx),
      coalesce(nullif(trim(v_poi->>'poi_type'), ''), 'other'),
      v_poi_lat, v_poi_lng, v_poi_maps_url, v_poi_source, v_published
    ) returning id into v_poi_id;
    foreach v_lang in array v_active_languages loop
      v_item := v_poi->'translations'->v_lang;
      if v_item is null or nullif(trim(v_item->>'title'), '') is null or nullif(trim(v_item->>'description'), '') is null then
        raise exception 'Missing valid POI translation for % order %', v_lang, v_poi_idx;
      end if;
      insert into public.journal_post_poi_translations (
        poi_id, language_code, title, description, translation_status, translation_source,
        translated_at, reviewed_at, published_at, updated_at
      ) values (
        v_poi_id, v_lang, trim(v_item->>'title'), trim(v_item->>'description'),
        'published', 'ai', v_published, v_published, v_published, v_published
      );
    end loop;
  end loop;

  select count(*) into v_poi_count from public.journal_post_pois where journal_post_id = p_post_id;
  if v_translation_count <> v_expected_count then
    raise exception 'Expected % place context translations, found %', v_expected_count, v_translation_count;
  end if;
  if v_poi_count <> 5 then raise exception 'Expected 5 POIs, found %', v_poi_count; end if;

  return jsonb_build_object('ok', true, 'post_id', p_post_id, 'place_context_id', v_context_id, 'translation_count', v_translation_count, 'poi_count', v_poi_count);
end;
$$;

-- Restore place-context AI prompts (thank-you moved to dedicated function)
update public.ai_edge_function_configs
set
  config_version = config_version + 1,
  system_prompt = 'You are the multilingual location editor for Bankrupt to 1 Million journal posts. Write warm, factual place and area context from verified journey metadata. Preserve coordinates, business names and geography exactly. Never invent social links or businesses that are not supported by the context. Return exactly one valid JSON object with a place_context root and nothing else.',
  user_prompt_template = 'Create place and area context for the journal event location in all configured languages. Describe the featured venue, the surrounding town or city, and five nearby points of interest that a visitor could explore. Keep prose concise, readable and dignified.',
  generation_settings = coalesce(generation_settings, '{}'::jsonb)
    || jsonb_build_object('batch_size', 3)
    || jsonb_build_object('batches_per_invocation', 1),
  updated_at = now()
where edge_function_slug = 'generate-journal-place-context';

insert into public.ai_edge_function_configs (
  edge_function_slug, display_name, description, provider, model, model_env_key,
  system_prompt, user_prompt_template, temperature, max_output_tokens, response_format,
  generation_settings, input_schema, output_schema, secret_env_key, entrypoint_path,
  verify_jwt, is_active, is_deprecated, config_version, notes, metadata, timeout_ms, retry_policy, enable_run_logging, primary_model_id
)
select
  'generate-journal-venue-thank-you',
  'Generate journal venue thank-you messages',
  'Generates multilingual thank-you notes to venue teams for journal posts with completed place context.',
  provider, model, model_env_key,
  'You are the gratitude editor for Bankrupt to 1 Million journal posts. Write warm, sincere thank-you messages addressed to the team, staff, and owner of the featured venue (never invent personal names). Thank them for hosting workspace for the website, mission, and projects, and express genuine happiness to feature their place in the journal post and on the website. Return exactly one valid JSON object with a venue_thank_you root and nothing else.',
  'Write a dignified venue thank-you message for each requested language. Mention gratitude for workspace during the journey, the mission and projects, and happiness to promote their place in the journal and on the website.',
  0.35, 8000, '{"type":"json_object"}'::jsonb,
  jsonb_build_object(
    'batch_size', 3,
    'batches_per_invocation', 1,
    'thank_you_characters', jsonb_build_object('min', 180, 'max', 700)
  ),
  '{"required":["post_id"]}'::jsonb,
  '{"required":["ok","post_id"]}'::jsonb,
  secret_env_key, 'index.ts', true, true, false, 1,
  'Dedicated AI edge function for journal venue thank-you messages.',
  jsonb_build_object('domain', 'journal', 'feature', 'venue_thank_you', 'architecture', 'thin_edge_function'),
  120000,
  '{"retry_on":[429,500,502,503,504],"max_attempts":2,"base_delay_ms":1000}'::jsonb,
  true, primary_model_id
from public.ai_edge_function_configs
where edge_function_slug = 'generate-journal-place-context'
on conflict (edge_function_slug) do update set
  display_name = excluded.display_name,
  description = excluded.description,
  system_prompt = excluded.system_prompt,
  user_prompt_template = excluded.user_prompt_template,
  generation_settings = excluded.generation_settings,
  metadata = excluded.metadata,
  is_active = true,
  updated_at = now();

grant execute on function public.get_localized_journal_place_context(text, text) to anon, authenticated;

insert into public.website_translation_keys
  (translation_key, namespace, description, default_text, value_type, is_required, is_active, interpolation_variables, supports_plural)
values
  ('journal.admin.generating_venue_thank_you', 'journal', 'Admin save progress while venue thank-you AI runs', 'Generating venue thank-you message…', 'text', true, true, '{}', false),
  ('journal.admin.venue_thank_you_success', 'journal', 'Admin success after venue thank-you generation', 'Venue thank-you published in {count} languages.', 'text', true, true, '{"count"}', false),
  ('journal.admin.venue_thank_you_skipped', 'journal', 'Admin notice when venue thank-you is skipped', 'Venue thank-you skipped — place context is not ready.', 'text', true, true, '{}', false)
on conflict (translation_key) do update
set default_text = excluded.default_text,
    description = excluded.description,
    is_active = true,
    updated_at = now();

insert into public.website_translations
  (translation_key_id, language_code, translated_text, translation_status, translation_source, translated_at, reviewed_at, published_at)
select k.id, sl.code, k.default_text, 'published', 'manual', now(), now(), now()
from public.website_translation_keys k
cross join public.site_languages sl
where k.translation_key = any(array[
  'journal.admin.generating_venue_thank_you',
  'journal.admin.venue_thank_you_success',
  'journal.admin.venue_thank_you_skipped'
])
and sl.is_active = true
on conflict (translation_key_id, language_code) do update
set translated_text = excluded.translated_text,
    translation_status = 'published',
    updated_at = now();

commit;
