-- Demo seed for journal-event-15-7-2026-14-42-00 place context (development verification only)

do $$
declare
  v_post_id uuid;
  v_lang text;
  v_translations jsonb := '{}'::jsonb;
  v_poi jsonb;
  v_pois jsonb := '[]'::jsonb;
  v_poi_trans jsonb;
  i int;
  v_place_context jsonb;
begin
  select id into v_post_id from public.journal_posts where slug = 'journal-event-15-7-2026-14-42-00';
  if v_post_id is null then
    return;
  end if;

  for v_lang in select code from public.site_languages where is_active order by display_order, code loop
    v_translations := v_translations || jsonb_build_object(v_lang, jsonb_build_object(
      'place_title', case when v_lang = 'es' then 'Cafetería Cajiz' else 'Cafeteria Cajiz' end,
      'place_history', 'A familiar café in Vélez-Málaga where locals meet for coffee, conversation, and a calm pause before the next stretch of the journey.',
      'area_title', 'Vélez-Málaga',
      'area_history', 'Vélez-Málaga is a historic town in Axarquía, east of Málaga, shaped by Moorish heritage, citrus agriculture, and a compact old quarter overlooking the coast.'
    ));
  end loop;

  for i in 1..5 loop
    v_poi_trans := '{}'::jsonb;
    for v_lang in select code from public.site_languages where is_active order by display_order, code loop
      v_poi_trans := v_poi_trans || jsonb_build_object(v_lang, jsonb_build_object(
        'title', case i
          when 1 then 'Fortress of Vélez-Málaga'
          when 2 then 'Old Town Plaza'
          when 3 then 'Axarquía Museum'
          when 4 then 'La Maroma viewpoint'
          else 'Torre del Mar promenade' end,
        'description', case i
          when 1 then 'A hilltop fortress with views over the town and surrounding orchards.'
          when 2 then 'A lively square surrounded by cafés, shops, and historic façades.'
          when 3 then 'Regional museum covering local history, crafts, and daily life.'
          when 4 then 'Mountain viewpoint popular for hiking and wide coastal panoramas.'
          else 'Seaside promenade linking beaches, restaurants, and evening walks.' end
      ));
    end loop;
    v_poi := jsonb_build_object(
      'display_order', i,
      'poi_type', case i when 1 then 'landmark' when 3 then 'museum' when 4 then 'nature' when 5 then 'culture' else 'food' end,
      'translations', v_poi_trans
    );
    v_pois := v_pois || jsonb_build_array(v_poi);
  end loop;

  v_place_context := jsonb_build_object(
    'place_type', 'cafe',
    'area_type', 'town',
    'area_name', 'Vélez-Málaga',
    'links', jsonb_build_object('google_maps_url', null, 'website_url', null, 'instagram_url', null),
    'translations', v_translations,
    'pois', v_pois
  );

  perform public.save_journal_place_context_result(v_post_id, v_place_context, 'seed');
end $$;
