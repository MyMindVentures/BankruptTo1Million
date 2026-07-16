-- save_journal_place_context_result RPC (split for remote apply)

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
    insert into public.journal_post_pois (journal_post_id, display_order, poi_type, updated_at)
    values (p_post_id, coalesce(nullif((v_poi->>'display_order')::integer, 0), v_poi_idx), coalesce(nullif(trim(v_poi->>'poi_type'), ''), 'other'), v_published)
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

grant execute on function public.save_journal_place_context_result(uuid, jsonb, text) to service_role;
