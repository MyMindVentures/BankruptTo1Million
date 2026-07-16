-- RPC updates and demo backfill for POI coordinates (columns added in prior migration)

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
      'description', coalesce(loc.description, en.description),
      'latitude', poi.latitude,
      'longitude', poi.longitude,
      'google_maps_url', coalesce(
        poi.google_maps_url,
        public.build_google_maps_url(poi.latitude, poi.longitude)
      )
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

  if not found then
    raise exception 'Journey entry not found for post %', p_post_id;
  end if;

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
    google_maps_url, website_url, instagram_url, generation_status, generated_at, ai_model, updated_at
  ) values (
    p_post_id,
    coalesce(nullif(trim(p_place_context->>'place_type'), ''), 'other'),
    coalesce(nullif(trim(p_place_context->>'area_type'), ''), 'town'),
    coalesce(nullif(trim(p_place_context->>'area_name'), ''), nullif(trim(v_entry.city_name), ''), nullif(trim(v_entry.location_name), ''), nullif(trim(v_entry.region_name), '')),
    v_entry.latitude, v_entry.longitude, v_google_maps_url,
    nullif(trim(v_links->>'website_url'), ''), nullif(trim(v_links->>'instagram_url'), ''),
    'completed', v_published, p_model, v_published
  )
  on conflict (journal_post_id) do update set
    place_type = excluded.place_type, area_type = excluded.area_type, area_name = excluded.area_name,
    latitude = excluded.latitude, longitude = excluded.longitude,
    google_maps_url = excluded.google_maps_url, website_url = excluded.website_url, instagram_url = excluded.instagram_url,
    generation_status = 'completed', generated_at = v_published, ai_model = excluded.ai_model, updated_at = v_published
  returning id into v_context_id;

  delete from public.journal_post_place_context_translations where place_context_id = v_context_id;

  foreach v_lang in array v_active_languages loop
    v_item := p_place_context->'translations'->v_lang;
    if v_item is null or nullif(trim(v_item->>'place_title'), '') is null or nullif(trim(v_item->>'place_history'), '') is null
       or nullif(trim(v_item->>'area_title'), '') is null or nullif(trim(v_item->>'area_history'), '') is null then
      raise exception 'Missing valid place context translation for %', v_lang;
    end if;
    if char_length(trim(v_item->>'place_history')) > 4000 or char_length(trim(v_item->>'area_history')) > 6000 then
      raise exception 'Place context history too long for %', v_lang;
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
  where place_context_id = v_context_id and translation_status = 'published' and language_code = any(v_active_languages);

  if v_translation_count <> v_expected_count then
    raise exception 'Expected % place context translations, found %', v_expected_count, v_translation_count;
  end if;

  delete from public.journal_post_poi_translations where poi_id in (select id from public.journal_post_pois where journal_post_id = p_post_id);
  delete from public.journal_post_pois where journal_post_id = p_post_id;

  v_poi_idx := 0;
  for v_poi in select value from jsonb_array_elements(coalesce(p_place_context->'pois', '[]'::jsonb)) order by coalesce((value->>'display_order')::integer, 0) loop
    v_poi_idx := v_poi_idx + 1;

    v_poi_lat := nullif(trim(v_poi->>'latitude'), '')::numeric;
    v_poi_lng := nullif(trim(v_poi->>'longitude'), '')::numeric;
    if v_poi_lat is null or v_poi_lng is null then
      raise exception 'Missing POI coordinates for order %', v_poi_idx;
    end if;
    if v_poi_lat < -90 or v_poi_lat > 90 or v_poi_lng < -180 or v_poi_lng > 180 then
      raise exception 'Invalid POI coordinates for order %', v_poi_idx;
    end if;

    v_poi_source := coalesce(nullif(trim(v_poi->>'coordinate_source'), ''), 'ai');
    if v_poi_source not in ('ai', 'geocoded', 'manual') then
      raise exception 'Invalid coordinate_source for POI order %', v_poi_idx;
    end if;

    v_poi_maps_url := nullif(trim(v_poi->>'google_maps_url'), '');
    if v_poi_maps_url is null then
      v_poi_maps_url := public.build_google_maps_url(v_poi_lat, v_poi_lng);
    end if;

    insert into public.journal_post_pois (
      journal_post_id, display_order, poi_type, latitude, longitude, google_maps_url, coordinate_source, updated_at
    ) values (
      p_post_id,
      coalesce(nullif((v_poi->>'display_order')::integer, 0), v_poi_idx),
      coalesce(nullif(trim(v_poi->>'poi_type'), ''), 'other'),
      v_poi_lat,
      v_poi_lng,
      v_poi_maps_url,
      v_poi_source,
      v_published
    )
    returning id into v_poi_id;

    foreach v_lang in array v_active_languages loop
      v_item := v_poi->'translations'->v_lang;
      if v_item is null or nullif(trim(v_item->>'title'), '') is null or nullif(trim(v_item->>'description'), '') is null then
        raise exception 'Missing valid POI translation for % order %', v_lang, v_poi_idx;
      end if;
      if char_length(trim(v_item->>'description')) > 1200 then
        raise exception 'POI description too long for % order %', v_lang, v_poi_idx;
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
  if v_poi_count <> 5 then raise exception 'Expected 5 POIs, found %', v_poi_count; end if;

  return jsonb_build_object('ok', true, 'post_id', p_post_id, 'place_context_id', v_context_id, 'translation_count', v_translation_count, 'poi_count', v_poi_count);
end;
$$;

grant execute on function public.get_localized_journal_place_context(text, text) to anon, authenticated;
grant execute on function public.save_journal_place_context_result(uuid, jsonb, text) to service_role;

do $$
declare
  v_post_id uuid;
begin
  select id into v_post_id from public.journal_posts where slug = 'journal-event-15-7-2026-14-42-00';
  if v_post_id is null then
    return;
  end if;

  update public.journal_post_pois poi
  set
    latitude = coords.latitude,
    longitude = coords.longitude,
    google_maps_url = public.build_google_maps_url(coords.latitude, coords.longitude),
    coordinate_source = 'manual',
    updated_at = now()
  from (
    values
      (1, 36.778611::numeric, -4.100833::numeric),
      (2, 36.781389::numeric, -4.101944::numeric),
      (3, 36.781111::numeric, -4.102222::numeric),
      (4, 36.905278::numeric, -4.043611::numeric),
      (5, 36.742222::numeric, -4.094444::numeric)
  ) as coords(display_order, latitude, longitude)
  where poi.journal_post_id = v_post_id
    and poi.display_order = coords.display_order;
end $$;
