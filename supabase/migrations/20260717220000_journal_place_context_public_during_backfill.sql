begin;

-- Serve published place/area content while thank-you-only backfill runs (generation_status = processing).

create or replace function public.journal_place_context_is_publicly_readable(p_generation_status text)
returns boolean
language sql
immutable
as $$
  select p_generation_status in ('completed', 'processing');
$$;

drop policy if exists "public reads published place context" on public.journal_post_place_context;
create policy "public reads published place context"
  on public.journal_post_place_context for select
  using (
    public.journal_place_context_is_publicly_readable(generation_status)
    and exists (
      select 1 from public.journal_posts p
      where p.id = journal_post_id
        and p.status = 'published'
        and p.published_at is not null
        and p.published_at <= now()
    )
  );

drop policy if exists "public reads published place context translations" on public.journal_post_place_context_translations;
create policy "public reads published place context translations"
  on public.journal_post_place_context_translations for select
  using (
    translation_status = 'published'
    and (published_at is null or published_at <= now())
    and nullif(trim(place_title), '') is not null
    and nullif(trim(place_history), '') is not null
    and nullif(trim(area_title), '') is not null
    and nullif(trim(area_history), '') is not null
    and exists (
      select 1
      from public.journal_post_place_context c
      join public.journal_posts p on p.id = c.journal_post_id
      where c.id = place_context_id
        and public.journal_place_context_is_publicly_readable(c.generation_status)
        and p.status = 'published'
        and p.published_at is not null
        and p.published_at <= now()
    )
  );

drop policy if exists "public reads pois for published posts" on public.journal_post_pois;
create policy "public reads pois for published posts"
  on public.journal_post_pois for select
  using (
    exists (
      select 1
      from public.journal_post_place_context c
      join public.journal_posts p on p.id = c.journal_post_id
      where c.journal_post_id = journal_post_pois.journal_post_id
        and public.journal_place_context_is_publicly_readable(c.generation_status)
        and p.status = 'published'
        and p.published_at is not null
        and p.published_at <= now()
    )
  );

drop policy if exists "public reads published poi translations" on public.journal_post_poi_translations;
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
        and public.journal_place_context_is_publicly_readable(c.generation_status)
        and p.status = 'published'
        and p.published_at is not null
        and p.published_at <= now()
    )
  );

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
    and public.journal_place_context_is_publicly_readable(c.generation_status);

  if not found then
    return null;
  end if;

  v_lang := coalesce(nullif(trim(p_language_code), ''), 'en');

  select * into v_trans
  from public.journal_post_place_context_translations t
  where t.place_context_id = v_context.id
    and t.language_code = v_lang
    and t.translation_status = 'published'
    and (t.published_at is null or t.published_at <= now())
    and nullif(trim(t.place_title), '') is not null
    and nullif(trim(t.place_history), '') is not null
    and nullif(trim(t.area_title), '') is not null
    and nullif(trim(t.area_history), '') is not null;

  if not found then
    select * into v_trans
    from public.journal_post_place_context_translations t
    where t.place_context_id = v_context.id
      and t.language_code = 'en'
      and t.translation_status = 'published'
      and (t.published_at is null or t.published_at <= now())
      and nullif(trim(t.place_title), '') is not null
      and nullif(trim(t.place_history), '') is not null
      and nullif(trim(t.area_title), '') is not null
      and nullif(trim(t.area_history), '') is not null;
  end if;

  if not found then
    return null;
  end if;

  v_thank_you := case
    when nullif(trim(v_trans.venue_thank_you_message), '') is not null then
      jsonb_build_object('message', trim(v_trans.venue_thank_you_message))
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
    'thank_you', v_thank_you,
    'pois', v_pois
  );
end;
$$;

revoke all on function public.get_localized_journal_place_context(text, text) from public;
grant execute on function public.get_localized_journal_place_context(text, text) to anon, authenticated, service_role;

-- Align edge function config with worker-invoked deployment (verify_jwt disabled at gateway).
update public.ai_edge_function_configs
set verify_jwt = false,
    updated_at = now()
where edge_function_slug = 'generate-journal-place-context';

commit;
