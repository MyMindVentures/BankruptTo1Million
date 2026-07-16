-- Journal post place & area context (venue, area history, per-post POIs)

create table if not exists public.journal_post_place_context (
  id uuid primary key default gen_random_uuid(),
  journal_post_id uuid not null unique references public.journal_posts(id) on delete cascade,
  place_type text not null default 'other'
    check (place_type in ('restaurant', 'bar', 'cafe', 'hotel', 'shop', 'venue', 'other')),
  area_type text not null default 'town'
    check (area_type in ('city', 'village', 'town', 'region')),
  area_name text,
  latitude numeric,
  longitude numeric,
  google_maps_url text,
  website_url text,
  instagram_url text,
  generation_status text not null default 'pending'
    check (generation_status in ('pending', 'processing', 'completed', 'failed', 'skipped')),
  generated_at timestamptz,
  ai_model text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.journal_post_place_context_translations (
  id uuid primary key default gen_random_uuid(),
  place_context_id uuid not null references public.journal_post_place_context(id) on delete cascade,
  language_code text not null references public.site_languages(code) on delete restrict,
  translation_status text not null default 'draft'
    check (translation_status in ('draft', 'review', 'published', 'archived')),
  place_title text not null,
  place_history text not null,
  area_title text not null,
  area_history text not null,
  translation_source text not null default 'ai',
  translated_at timestamptz,
  reviewed_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (place_context_id, language_code)
);

create table if not exists public.journal_post_pois (
  id uuid primary key default gen_random_uuid(),
  journal_post_id uuid not null references public.journal_posts(id) on delete cascade,
  display_order integer not null check (display_order between 1 and 5),
  poi_type text not null default 'other'
    check (poi_type in ('landmark', 'museum', 'nature', 'food', 'culture', 'other')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (journal_post_id, display_order)
);

create table if not exists public.journal_post_poi_translations (
  id uuid primary key default gen_random_uuid(),
  poi_id uuid not null references public.journal_post_pois(id) on delete cascade,
  language_code text not null references public.site_languages(code) on delete restrict,
  translation_status text not null default 'draft'
    check (translation_status in ('draft', 'review', 'published', 'archived')),
  title text not null,
  description text not null,
  translation_source text not null default 'ai',
  translated_at timestamptz,
  reviewed_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (poi_id, language_code)
);

create index if not exists journal_post_place_context_post_idx
  on public.journal_post_place_context (journal_post_id);

create index if not exists journal_post_place_context_translations_lang_idx
  on public.journal_post_place_context_translations (place_context_id, language_code);

create index if not exists journal_post_pois_post_idx
  on public.journal_post_pois (journal_post_id, display_order);

alter table public.journal_post_place_context enable row level security;
alter table public.journal_post_place_context_translations enable row level security;
alter table public.journal_post_pois enable row level security;
alter table public.journal_post_poi_translations enable row level security;

create policy "public reads published place context"
  on public.journal_post_place_context for select
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

create policy "public reads published place context translations"
  on public.journal_post_place_context_translations for select
  using (
    translation_status = 'published'
    and (published_at is null or published_at <= now())
    and exists (
      select 1
      from public.journal_post_place_context c
      join public.journal_posts p on p.id = c.journal_post_id
      where c.id = place_context_id
        and c.generation_status = 'completed'
        and p.status = 'published'
        and p.published_at is not null
        and p.published_at <= now()
    )
  );

create policy "public reads pois for published posts"
  on public.journal_post_pois for select
  using (
    exists (
      select 1
      from public.journal_post_place_context c
      join public.journal_posts p on p.id = c.journal_post_id
      where c.journal_post_id = journal_post_pois.journal_post_id
        and c.generation_status = 'completed'
        and p.status = 'published'
        and p.published_at is not null
        and p.published_at <= now()
    )
  );

create policy "public reads published poi translations"
  on public.journal_post_poi_translations for select
  using (
    translation_status = 'published'
    and (published_at is null or published_at <= now())
    and exists (
      select 1
      from public.journal_post_pois poi
      join public.journal_post_place_context c on c.journal_post_id = poi.journal_post_id
      join public.journal_posts p on p.id = poi.journal_post_id
      where poi.id = poi_id
        and c.generation_status = 'completed'
        and p.status = 'published'
        and p.published_at is not null
        and p.published_at <= now()
    )
  );

create or replace function public.build_google_maps_url(p_latitude numeric, p_longitude numeric)
returns text
language sql
immutable
as $$
  select case
    when p_latitude is null or p_longitude is null then null
    else format('https://www.google.com/maps/search/?api=1&query=%s,%s', p_latitude, p_longitude)
  end;
$$;

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
begin
  select p.id into v_post_id
  from public.journal_posts p
  where p.slug = p_slug
    and p.status = 'published'
    and p.published_at is not null
    and p.published_at <= now();

  if v_post_id is null then
    return null;
  end if;

  select * into v_context
  from public.journal_post_place_context c
  where c.journal_post_id = v_post_id
    and c.generation_status = 'completed';

  if not found then
    return null;
  end if;

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

  if not found then
    return null;
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'display_order', poi.display_order,
      'poi_type', poi.poi_type,
      'title', coalesce(loc.title, en.title),
      'description', coalesce(loc.description, en.description)
    )
    order by poi.display_order
  ), '[]'::jsonb)
  into v_pois
  from public.journal_post_pois poi
  left join lateral (
    select pt.title, pt.description
    from public.journal_post_poi_translations pt
    where pt.poi_id = poi.id
      and pt.language_code = v_lang
      and pt.translation_status = 'published'
      and (pt.published_at is null or pt.published_at <= now())
    limit 1
  ) loc on true
  left join lateral (
    select pt.title, pt.description
    from public.journal_post_poi_translations pt
    where pt.poi_id = poi.id
      and pt.language_code = 'en'
      and pt.translation_status = 'published'
      and (pt.published_at is null or pt.published_at <= now())
    limit 1
  ) en on true
  where poi.journal_post_id = v_post_id
    and coalesce(loc.title, en.title) is not null;

  return jsonb_build_object(
    'place_type', v_context.place_type,
    'area_type', v_context.area_type,
    'area_name', v_context.area_name,
    'latitude', v_context.latitude,
    'longitude', v_context.longitude,
    'active_language', v_trans.language_code,
    'links', jsonb_build_object(
      'google_maps_url', coalesce(
        v_context.google_maps_url,
        public.build_google_maps_url(v_context.latitude, v_context.longitude)
      ),
      'website_url', v_context.website_url,
      'instagram_url', v_context.instagram_url
    ),
    'place', jsonb_build_object(
      'title', v_trans.place_title,
      'history', v_trans.place_history
    ),
    'area', jsonb_build_object(
      'title', v_trans.area_title,
      'history', v_trans.area_history
    ),
    'pois', v_pois
  );
end;
$$;

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
begin
  if jsonb_typeof(p_place_context) <> 'object' then
    raise exception 'place_context must be an object';
  end if;

  select
    je.latitude,
    je.longitude,
    je.featured_business_name,
    je.location_name,
    je.city_name,
    je.region_name
  into v_entry
  from public.journal_journey_entries je
  where je.journal_post_id = p_post_id
  order by je.created_at asc
  limit 1;

  if not found then
    raise exception 'Journey entry not found for post %', p_post_id;
  end if;

  if v_entry.featured_business_name is null
     and v_entry.latitude is null
     and v_entry.longitude is null then
    insert into public.journal_post_place_context (
      journal_post_id, generation_status, updated_at
    ) values (
      p_post_id, 'skipped', v_published
    )
    on conflict (journal_post_id) do update set
      generation_status = 'skipped',
      updated_at = v_published;

    return jsonb_build_object('ok', true, 'skipped', true, 'post_id', p_post_id);
  end if;

  select coalesce(array_agg(code order by display_order), '{}')
    into v_active_languages
  from public.site_languages
  where is_active = true;

  v_expected_count := coalesce(array_length(v_active_languages, 1), 0);
  if v_expected_count = 0 then
    raise exception 'No active languages configured';
  end if;

  if jsonb_array_length(coalesce(p_place_context->'pois', '[]'::jsonb)) <> 5 then
    raise exception 'Expected exactly 5 POIs';
  end if;

  v_links := coalesce(p_place_context->'links', '{}'::jsonb);
  v_google_maps_url := nullif(trim(v_links->>'google_maps_url'), '');
  if v_google_maps_url is null then
    v_google_maps_url := public.build_google_maps_url(v_entry.latitude, v_entry.longitude);
  end if;

  insert into public.journal_post_place_context (
    journal_post_id,
    place_type,
    area_type,
    area_name,
    latitude,
    longitude,
    google_maps_url,
    website_url,
    instagram_url,
    generation_status,
    generated_at,
    ai_model,
    updated_at
  ) values (
    p_post_id,
    coalesce(nullif(trim(p_place_context->>'place_type'), ''), 'other'),
    coalesce(nullif(trim(p_place_context->>'area_type'), ''), 'town'),
    coalesce(
      nullif(trim(p_place_context->>'area_name'), ''),
      nullif(trim(v_entry.city_name), ''),
      nullif(trim(v_entry.location_name), ''),
      nullif(trim(v_entry.region_name), '')
    ),
    v_entry.latitude,
    v_entry.longitude,
    v_google_maps_url,
    nullif(trim(v_links->>'website_url'), ''),
    nullif(trim(v_links->>'instagram_url'), ''),
    'completed',
    v_published,
    p_model,
    v_published
  )
  on conflict (journal_post_id) do update set
    place_type = excluded.place_type,
    area_type = excluded.area_type,
    area_name = excluded.area_name,
    latitude = excluded.latitude,
    longitude = excluded.longitude,
    google_maps_url = excluded.google_maps_url,
    website_url = excluded.website_url,
    instagram_url = excluded.instagram_url,
    generation_status = 'completed',
    generated_at = v_published,
    ai_model = excluded.ai_model,
    updated_at = v_published
  returning id into v_context_id;

  delete from public.journal_post_place_context_translations
  where place_context_id = v_context_id;

  foreach v_lang in array v_active_languages loop
    v_item := p_place_context->'translations'->v_lang;
    if v_item is null
       or nullif(trim(v_item->>'place_title'), '') is null
       or nullif(trim(v_item->>'place_history'), '') is null
       or nullif(trim(v_item->>'area_title'), '') is null
       or nullif(trim(v_item->>'area_history'), '') is null then
      raise exception 'Missing valid place context translation for %', v_lang;
    end if;

    if char_length(trim(v_item->>'place_history')) > 4000
       or char_length(trim(v_item->>'area_history')) > 6000 then
      raise exception 'Place context history too long for %', v_lang;
    end if;

    insert into public.journal_post_place_context_translations (
      place_context_id,
      language_code,
      place_title,
      place_history,
      area_title,
      area_history,
      translation_status,
      translation_source,
      translated_at,
      reviewed_at,
      published_at,
      updated_at
    ) values (
      v_context_id,
      v_lang,
      trim(v_item->>'place_title'),
      trim(v_item->>'place_history'),
      trim(v_item->>'area_title'),
      trim(v_item->>'area_history'),
      'published',
      'ai',
      v_published,
      v_published,
      v_published,
      v_published
    );
  end loop;

  select count(*) into v_translation_count
  from public.journal_post_place_context_translations
  where place_context_id = v_context_id
    and translation_status = 'published'
    and language_code = any(v_active_languages);

  if v_translation_count <> v_expected_count then
    raise exception 'Expected % place context translations, found %', v_expected_count, v_translation_count;
  end if;

  delete from public.journal_post_poi_translations
  where poi_id in (
    select id from public.journal_post_pois where journal_post_id = p_post_id
  );

  delete from public.journal_post_pois where journal_post_id = p_post_id;

  v_poi_idx := 0;
  for v_poi in
    select value
    from jsonb_array_elements(coalesce(p_place_context->'pois', '[]'::jsonb))
    order by coalesce((value->>'display_order')::integer, 0)
  loop
    v_poi_idx := v_poi_idx + 1;

    insert into public.journal_post_pois (
      journal_post_id,
      display_order,
      poi_type,
      updated_at
    ) values (
      p_post_id,
      coalesce(nullif((v_poi->>'display_order')::integer, 0), v_poi_idx),
      coalesce(nullif(trim(v_poi->>'poi_type'), ''), 'other'),
      v_published
    )
    returning id into v_poi_id;

    foreach v_lang in array v_active_languages loop
      v_item := v_poi->'translations'->v_lang;
      if v_item is null
         or nullif(trim(v_item->>'title'), '') is null
         or nullif(trim(v_item->>'description'), '') is null then
        raise exception 'Missing valid POI translation for % order %', v_lang, v_poi_idx;
      end if;

      if char_length(trim(v_item->>'description')) > 1200 then
        raise exception 'POI description too long for % order %', v_lang, v_poi_idx;
      end if;

      insert into public.journal_post_poi_translations (
        poi_id,
        language_code,
        title,
        description,
        translation_status,
        translation_source,
        translated_at,
        reviewed_at,
        published_at,
        updated_at
      ) values (
        v_poi_id,
        v_lang,
        trim(v_item->>'title'),
        trim(v_item->>'description'),
        'published',
        'ai',
        v_published,
        v_published,
        v_published,
        v_published
      );
    end loop;
  end loop;

  select count(*) into v_poi_count
  from public.journal_post_pois
  where journal_post_id = p_post_id;

  if v_poi_count <> 5 then
    raise exception 'Expected 5 POIs, found %', v_poi_count;
  end if;

  return jsonb_build_object(
    'ok', true,
    'post_id', p_post_id,
    'place_context_id', v_context_id,
    'translation_count', v_translation_count,
    'poi_count', v_poi_count
  );
end;
$$;

grant execute on function public.get_localized_journal_place_context(text, text) to anon, authenticated;
grant execute on function public.save_journal_place_context_result(uuid, jsonb, text) to service_role;
grant execute on function public.build_google_maps_url(numeric, numeric) to anon, authenticated;
