begin;

-- Dedicated public read RPC for venue thank-you (decoupled from place context).

create or replace function public.get_localized_journal_venue_thank_you(
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
  v_lang text;
  v_message text;
  v_active_lang text;
  v_venue_title text;
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

  v_lang := coalesce(nullif(trim(p_language_code), ''), 'en');

  select
    trim(coalesce(loc.message, en.message)),
    case
      when loc.message is not null then v_lang
      when en.message is not null then 'en'
      else null
    end
  into v_message, v_active_lang
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

  if nullif(v_message, '') is null then
    return null;
  end if;

  select coalesce(loc.place_title, en.place_title)
  into v_venue_title
  from public.journal_post_place_context c
  left join lateral (
    select t.place_title
    from public.journal_post_place_context_translations t
    where t.place_context_id = c.id
      and t.language_code = v_active_lang
      and t.translation_status = 'published'
      and (t.published_at is null or t.published_at <= now())
      and nullif(trim(t.place_title), '') is not null
    limit 1
  ) loc on true
  left join lateral (
    select t.place_title
    from public.journal_post_place_context_translations t
    where t.place_context_id = c.id
      and t.language_code = 'en'
      and t.translation_status = 'published'
      and (t.published_at is null or t.published_at <= now())
      and nullif(trim(t.place_title), '') is not null
    limit 1
  ) en on true
  where c.journal_post_id = v_post_id;

  return jsonb_build_object(
    'message', v_message,
    'venue_title', nullif(trim(v_venue_title), ''),
    'active_language', coalesce(v_active_lang, v_lang)
  );
end;
$$;

revoke all on function public.get_localized_journal_venue_thank_you(text, text) from public;
grant execute on function public.get_localized_journal_venue_thank_you(text, text) to anon, authenticated, service_role;

-- Remove thank-you from place context public payload.

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
    'pois', v_pois
  );
end;
$$;

revoke all on function public.get_localized_journal_place_context(text, text) from public;
grant execute on function public.get_localized_journal_place_context(text, text) to anon, authenticated, service_role;

-- UI component registry: register dedicated thank-you section and re-link keys.

insert into public.website_ui_components
  (component_key, source_path, export_name, surface_type, namespace, is_public, entity_content, coverage_status)
values
  (
    'journal.venue_thank_you.section',
    'src/components/journal/JournalVenueThankYouSection.tsx',
    'JournalVenueThankYouSection',
    'component',
    'journal.place_context',
    true,
    '{"rpc":"get_localized_journal_venue_thank_you","tables":["journal_post_venue_thank_you_translations"]}'::jsonb,
    'connected'
  )
on conflict (component_key) do update set
  source_path = excluded.source_path,
  export_name = excluded.export_name,
  surface_type = excluded.surface_type,
  namespace = excluded.namespace,
  is_public = excluded.is_public,
  entity_content = excluded.entity_content,
  coverage_status = excluded.coverage_status,
  updated_at = now();

update public.website_ui_components
set entity_content = '{"rpc":"get_localized_journal_place_context","tables":["journal_post_place_context_translations","journal_post_poi_translations"]}'::jsonb,
    updated_at = now()
where component_key = 'journal.place_context.section';

delete from public.website_ui_component_translation_keys
where component_id = (
  select id from public.website_ui_components where component_key = 'journal.place_context.section'
)
and translation_key_id in (
  select id from public.website_translation_keys
  where translation_key in (
    'journal.place_context.thank_you.eyebrow',
    'journal.place_context.thank_you.heading',
    'journal.place_context.thank_you.aria_label'
  )
);

insert into public.website_ui_component_translation_keys (component_id, translation_key_id, usage_kind, is_required)
select c.id, k.id, 'label', true
from public.website_ui_components c
cross join lateral (
  values
    ('journal.venue_thank_you.section', 'journal.place_context.thank_you.eyebrow'),
    ('journal.venue_thank_you.section', 'journal.place_context.thank_you.heading'),
    ('journal.venue_thank_you.section', 'journal.place_context.thank_you.aria_label')
) as v(component_key, translation_key)
join public.website_translation_keys k on k.translation_key = v.translation_key
where c.component_key = v.component_key
on conflict (component_id, translation_key_id) do update set
  usage_kind = excluded.usage_kind,
  is_required = excluded.is_required,
  updated_at = now();

commit;
