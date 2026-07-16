-- Operational fixes for venue thank-you generation and public place-context reads.

update public.ai_edge_function_configs
set generation_settings = coalesce(generation_settings, '{}'::jsonb)
  || jsonb_build_object(
    'thank_you_characters', jsonb_build_object('min', 120, 'max', 700),
    'batches_per_invocation', 10
  )
where edge_function_slug = 'generate-journal-venue-thank-you';

update public.journal_post_place_context c
set
  generation_status = 'completed',
  draft_payload = null,
  last_error = null,
  updated_at = now()
where c.generation_status <> 'completed'
  and public.journal_place_context_completed_translation_count(c.journal_post_id) >= (
    select count(*) from public.site_languages where is_active = true
  )
  and exists (
    select 1
    from public.journal_post_place_context_translations t
    where t.place_context_id = c.id
      and t.translation_status = 'published'
    group by t.place_context_id
    having count(*) >= (select count(*) from public.site_languages where is_active = true)
  );

create or replace function public.list_journal_place_context_needing_batch(p_limit integer default 1)
returns table(journal_post_id uuid, translation_count bigint, expected_count bigint)
language sql
security definer
set search_path to 'public', 'pg_catalog', 'pg_temp'
as $$
  with expected as (
    select count(*)::bigint as total from public.site_languages where is_active = true
  )
  select
    c.journal_post_id,
    public.journal_place_context_completed_translation_count(c.journal_post_id) as translation_count,
    expected.total as expected_count
  from public.journal_post_place_context c
  cross join expected
  where c.generation_status = 'processing'
    and c.draft_payload is not null
    and public.journal_place_context_completed_translation_count(c.journal_post_id) < expected.total
    and not exists (
      select 1
      from public.journal_post_place_context_translations t
      where t.place_context_id = c.id
        and t.translation_status = 'published'
      group by t.place_context_id
      having count(*) >= expected.total
    )
  order by c.updated_at asc
  limit greatest(1, least(coalesce(p_limit, 1), 5));
$$;

revoke all on function public.list_journal_place_context_needing_batch(integer) from public;
grant execute on function public.list_journal_place_context_needing_batch(integer) to service_role;

create or replace function public.get_localized_journal_place_context(p_slug text, p_language_code text)
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
  v_expected_langs bigint;
  v_published_langs bigint;
begin
  select p.id into v_post_id
  from public.journal_posts p
  where p.slug = p_slug
    and p.status = 'published'
    and p.published_at is not null
    and p.published_at <= now();

  if v_post_id is null then return null; end if;

  select count(*)::bigint into v_expected_langs
  from public.site_languages
  where is_active = true;

  select * into v_context
  from public.journal_post_place_context c
  where c.journal_post_id = v_post_id;

  if not found then return null; end if;

  select count(*)::bigint into v_published_langs
  from public.journal_post_place_context_translations t
  where t.place_context_id = v_context.id
    and t.translation_status = 'published';

  if v_context.generation_status <> 'completed' and v_published_langs < v_expected_langs then
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
  where v.journal_post_id = v_post_id
    and v.generation_status = 'completed';

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

grant execute on function public.get_localized_journal_place_context(text, text) to anon, authenticated;
