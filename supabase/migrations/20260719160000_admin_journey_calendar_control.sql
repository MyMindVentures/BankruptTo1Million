-- Admin Journey Calendar Control
-- Align RLS with Mission Control allowlist, add admin RPCs, register /admin/calendar module.

begin;

-- ---------------------------------------------------------------------------
-- 1. RLS: has_active_admin_access() for manage policies + missing write tables
-- ---------------------------------------------------------------------------

drop policy if exists "Admins manage journey calendar" on public.journey_calendar_entries;
create policy "Admins manage journey calendar"
  on public.journey_calendar_entries
  for all
  to authenticated
  using (public.has_active_admin_access())
  with check (public.has_active_admin_access());

drop policy if exists "Admins manage journey exchange items" on public.journey_exchange_items;
create policy "Admins manage journey exchange items"
  on public.journey_exchange_items
  for all
  to authenticated
  using (public.has_active_admin_access())
  with check (public.has_active_admin_access());

drop policy if exists "Admins manage host offers" on public.journey_host_offers;
create policy "Admins manage host offers"
  on public.journey_host_offers
  for all
  to authenticated
  using (public.has_active_admin_access())
  with check (public.has_active_admin_access());

drop policy if exists "Admins manage journey exchange inquiries" on public.journey_exchange_inquiries;
create policy "Admins manage journey exchange inquiries"
  on public.journey_exchange_inquiries
  for all
  to authenticated
  using (public.has_active_admin_access())
  with check (public.has_active_admin_access());

drop policy if exists "Admins manage journey calendar translations" on public.journey_calendar_entry_translations;
create policy "Admins manage journey calendar translations"
  on public.journey_calendar_entry_translations
  for all
  to authenticated
  using (public.has_active_admin_access())
  with check (public.has_active_admin_access());

drop policy if exists "Admins manage journey calendar founders" on public.journey_calendar_entry_founders;
create policy "Admins manage journey calendar founders"
  on public.journey_calendar_entry_founders
  for all
  to authenticated
  using (public.has_active_admin_access())
  with check (public.has_active_admin_access());

drop policy if exists "Admins manage journey exchange translations" on public.journey_exchange_item_translations;
create policy "Admins manage journey exchange translations"
  on public.journey_exchange_item_translations
  for all
  to authenticated
  using (public.has_active_admin_access())
  with check (public.has_active_admin_access());

-- ---------------------------------------------------------------------------
-- 2. Admin RPCs
-- ---------------------------------------------------------------------------

create or replace function public.admin_get_journey_calendar_overview(
  p_status text default null,
  p_query text default null,
  p_limit integer default 200,
  p_offset integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'auth', 'pg_catalog', 'pg_temp'
as $$
declare
  v_rows jsonb;
  v_counts jsonb;
  v_founders jsonb;
  v_host_counts jsonb;
  v_q text := '%' || lower(trim(coalesce(p_query, ''))) || '%';
begin
  if not public.has_active_admin_access() then
    raise exception 'Active administrator access is required.' using errcode = '42501';
  end if;

  with filtered as (
    select
      e.id,
      e.title,
      e.slug,
      e.journey_person,
      e.status,
      e.starts_on,
      e.ends_on,
      e.country_code,
      e.country_name,
      e.city_name,
      e.location_name,
      e.accommodation_needed,
      e.host_request_status,
      e.is_public,
      e.is_featured,
      e.display_order,
      e.updated_at,
      e.created_at,
      (
        select count(*)::int
        from public.journey_host_offers h
        where h.calendar_entry_id = e.id
          and h.status in ('new', 'reviewing')
      ) as open_host_offers,
      (
        select count(*)::int
        from public.journey_exchange_items x
        where x.calendar_entry_id = e.id
      ) as exchange_item_count
    from public.journey_calendar_entries e
    where (p_status is null or p_status = 'all' or e.status = p_status)
      and (
        coalesce(p_query, '') = ''
        or lower(concat_ws(
          ' ',
          e.title,
          e.slug,
          coalesce(e.city_name, ''),
          coalesce(e.country_name, ''),
          coalesce(e.location_name, ''),
          coalesce(e.public_summary, '')
        )) like v_q
      )
    order by e.starts_on desc nulls last, e.display_order, e.created_at desc
    limit greatest(1, least(coalesce(p_limit, 200), 500))
    offset greatest(coalesce(p_offset, 0), 0)
  )
  select coalesce(jsonb_agg(to_jsonb(filtered)), '[]'::jsonb) into v_rows from filtered;

  select jsonb_build_object(
    'all', count(*),
    'idea', count(*) filter (where status = 'idea'),
    'planned', count(*) filter (where status = 'planned'),
    'confirmed', count(*) filter (where status = 'confirmed'),
    'travelling', count(*) filter (where status = 'travelling'),
    'completed', count(*) filter (where status = 'completed'),
    'cancelled', count(*) filter (where status = 'cancelled')
  )
  into v_counts
  from public.journey_calendar_entries;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', fp.id,
        'slug', fp.slug,
        'display_name', fp.display_name,
        'is_public', fp.is_public
      )
      order by fp.display_name
    ),
    '[]'::jsonb
  )
  into v_founders
  from public.founder_profiles fp;

  select jsonb_build_object(
    'all', count(*),
    'new', count(*) filter (where status = 'new'),
    'reviewing', count(*) filter (where status = 'reviewing'),
    'contacted', count(*) filter (where status = 'contacted'),
    'accepted', count(*) filter (where status = 'accepted'),
    'declined', count(*) filter (where status = 'declined'),
    'withdrawn', count(*) filter (where status = 'withdrawn')
  )
  into v_host_counts
  from public.journey_host_offers;

  return jsonb_build_object(
    'rows', coalesce(v_rows, '[]'::jsonb),
    'counts', coalesce(v_counts, '{}'::jsonb),
    'host_offer_counts', coalesce(v_host_counts, '{}'::jsonb),
    'founders', coalesce(v_founders, '[]'::jsonb)
  );
end;
$$;

create or replace function public.admin_get_journey_calendar_entry(p_entry_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'auth', 'pg_catalog', 'pg_temp'
as $$
declare
  v_entry jsonb;
  v_founders jsonb;
  v_exchange jsonb;
  v_translations jsonb;
begin
  if not public.has_active_admin_access() then
    raise exception 'Active administrator access is required.' using errcode = '42501';
  end if;

  select to_jsonb(e) into v_entry
  from public.journey_calendar_entries e
  where e.id = p_entry_id;

  if v_entry is null then
    raise exception 'Calendar entry not found.' using errcode = 'P0002';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'founder_profile_id', r.founder_profile_id,
        'display_order', r.display_order,
        'display_name', fp.display_name,
        'slug', fp.slug
      )
      order by r.display_order, fp.display_name
    ),
    '[]'::jsonb
  )
  into v_founders
  from public.journey_calendar_entry_founders r
  join public.founder_profiles fp on fp.id = r.founder_profile_id
  where r.calendar_entry_id = p_entry_id;

  select coalesce(
    jsonb_agg(to_jsonb(x) order by x.display_order, x.created_at),
    '[]'::jsonb
  )
  into v_exchange
  from public.journey_exchange_items x
  where x.calendar_entry_id = p_entry_id;

  select jsonb_build_object(
    'total', count(*),
    'draft', count(*) filter (where translation_status = 'draft'),
    'machine', count(*) filter (where translation_status = 'machine'),
    'reviewed', count(*) filter (where translation_status = 'reviewed'),
    'published', count(*) filter (where translation_status = 'published'),
    'languages', coalesce(
      jsonb_agg(
        jsonb_build_object(
          'language_code', language_code,
          'translation_status', translation_status,
          'updated_at', updated_at
        )
        order by language_code
      ),
      '[]'::jsonb
    )
  )
  into v_translations
  from public.journey_calendar_entry_translations
  where calendar_entry_id = p_entry_id;

  return jsonb_build_object(
    'entry', v_entry,
    'founders', coalesce(v_founders, '[]'::jsonb),
    'exchange_items', coalesce(v_exchange, '[]'::jsonb),
    'translations', coalesce(v_translations, '{}'::jsonb)
  );
end;
$$;

create or replace function public.admin_upsert_journey_calendar_entry(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'auth', 'pg_catalog', 'pg_temp'
as $$
declare
  v_id uuid := nullif(p_payload->>'id', '')::uuid;
  v_slug text := nullif(trim(coalesce(p_payload->>'slug', '')), '');
  v_title text := nullif(trim(coalesce(p_payload->>'title', '')), '');
  v_status text := coalesce(nullif(trim(p_payload->>'status'), ''), 'planned');
  v_person text := coalesce(nullif(trim(p_payload->>'journey_person'), ''), 'together');
  v_host_status text := coalesce(nullif(trim(p_payload->>'host_request_status'), ''), 'not_needed');
  v_starts date := (p_payload->>'starts_on')::date;
  v_row public.journey_calendar_entries%rowtype;
begin
  if not public.has_active_admin_access() then
    raise exception 'Active administrator access is required.' using errcode = '42501';
  end if;

  if v_title is null then
    raise exception 'title is required.' using errcode = '22023';
  end if;
  if v_slug is null then
    raise exception 'slug is required.' using errcode = '22023';
  end if;
  if v_starts is null then
    raise exception 'starts_on is required.' using errcode = '22023';
  end if;
  if v_status not in ('idea', 'planned', 'confirmed', 'travelling', 'completed', 'cancelled') then
    raise exception 'Invalid status: %', v_status using errcode = '22023';
  end if;
  if v_person not in ('kevin', 'micha', 'together') then
    raise exception 'Invalid journey_person: %', v_person using errcode = '22023';
  end if;
  if v_host_status not in ('not_needed', 'open', 'offers_received', 'matched', 'closed') then
    raise exception 'Invalid host_request_status: %', v_host_status using errcode = '22023';
  end if;

  if v_id is null then
    insert into public.journey_calendar_entries (
      title, slug, journey_person, status, starts_on, ends_on, date_flexibility_days,
      timezone, country_code, country_name, region_name, city_name, location_name,
      latitude, longitude, public_summary, purpose, transport_mode,
      accommodation_needed, accommodation_from, accommodation_until, guests_count, nights_needed,
      host_request_message, host_request_status, is_public, is_featured, display_order,
      related_journal_post_id, metadata, created_by, updated_by
    ) values (
      v_title,
      v_slug,
      v_person,
      v_status,
      v_starts,
      nullif(p_payload->>'ends_on', '')::date,
      coalesce((p_payload->>'date_flexibility_days')::int, 0),
      nullif(trim(coalesce(p_payload->>'timezone', '')), ''),
      nullif(trim(coalesce(p_payload->>'country_code', '')), ''),
      nullif(trim(coalesce(p_payload->>'country_name', '')), ''),
      nullif(trim(coalesce(p_payload->>'region_name', '')), ''),
      nullif(trim(coalesce(p_payload->>'city_name', '')), ''),
      nullif(trim(coalesce(p_payload->>'location_name', '')), ''),
      nullif(p_payload->>'latitude', '')::numeric,
      nullif(p_payload->>'longitude', '')::numeric,
      nullif(trim(coalesce(p_payload->>'public_summary', '')), ''),
      nullif(trim(coalesce(p_payload->>'purpose', '')), ''),
      nullif(trim(coalesce(p_payload->>'transport_mode', '')), ''),
      coalesce((p_payload->>'accommodation_needed')::boolean, false),
      nullif(p_payload->>'accommodation_from', '')::date,
      nullif(p_payload->>'accommodation_until', '')::date,
      coalesce(nullif(p_payload->>'guests_count', '')::int, 1),
      nullif(p_payload->>'nights_needed', '')::int,
      nullif(trim(coalesce(p_payload->>'host_request_message', '')), ''),
      v_host_status,
      coalesce((p_payload->>'is_public')::boolean, true),
      coalesce((p_payload->>'is_featured')::boolean, false),
      coalesce((p_payload->>'display_order')::int, 0),
      nullif(p_payload->>'related_journal_post_id', '')::uuid,
      coalesce(p_payload->'metadata', '{}'::jsonb),
      auth.uid(),
      auth.uid()
    )
    returning * into v_row;
  else
    update public.journey_calendar_entries e set
      title = v_title,
      slug = v_slug,
      journey_person = v_person,
      status = v_status,
      starts_on = v_starts,
      ends_on = nullif(p_payload->>'ends_on', '')::date,
      date_flexibility_days = coalesce((p_payload->>'date_flexibility_days')::int, e.date_flexibility_days),
      timezone = coalesce(nullif(trim(coalesce(p_payload->>'timezone', '')), ''), e.timezone),
      country_code = case when p_payload ? 'country_code' then nullif(trim(p_payload->>'country_code'), '') else e.country_code end,
      country_name = case when p_payload ? 'country_name' then nullif(trim(p_payload->>'country_name'), '') else e.country_name end,
      region_name = case when p_payload ? 'region_name' then nullif(trim(p_payload->>'region_name'), '') else e.region_name end,
      city_name = case when p_payload ? 'city_name' then nullif(trim(p_payload->>'city_name'), '') else e.city_name end,
      location_name = case when p_payload ? 'location_name' then nullif(trim(p_payload->>'location_name'), '') else e.location_name end,
      latitude = case when p_payload ? 'latitude' then nullif(p_payload->>'latitude', '')::numeric else e.latitude end,
      longitude = case when p_payload ? 'longitude' then nullif(p_payload->>'longitude', '')::numeric else e.longitude end,
      public_summary = case when p_payload ? 'public_summary' then nullif(trim(p_payload->>'public_summary'), '') else e.public_summary end,
      purpose = case when p_payload ? 'purpose' then nullif(trim(p_payload->>'purpose'), '') else e.purpose end,
      transport_mode = case when p_payload ? 'transport_mode' then nullif(trim(p_payload->>'transport_mode'), '') else e.transport_mode end,
      accommodation_needed = coalesce((p_payload->>'accommodation_needed')::boolean, e.accommodation_needed),
      accommodation_from = case when p_payload ? 'accommodation_from' then nullif(p_payload->>'accommodation_from', '')::date else e.accommodation_from end,
      accommodation_until = case when p_payload ? 'accommodation_until' then nullif(p_payload->>'accommodation_until', '')::date else e.accommodation_until end,
      guests_count = coalesce(nullif(p_payload->>'guests_count', '')::int, e.guests_count),
      nights_needed = case when p_payload ? 'nights_needed' then nullif(p_payload->>'nights_needed', '')::int else e.nights_needed end,
      host_request_message = case when p_payload ? 'host_request_message' then nullif(trim(p_payload->>'host_request_message'), '') else e.host_request_message end,
      host_request_status = v_host_status,
      is_public = coalesce((p_payload->>'is_public')::boolean, e.is_public),
      is_featured = coalesce((p_payload->>'is_featured')::boolean, e.is_featured),
      display_order = coalesce((p_payload->>'display_order')::int, e.display_order),
      related_journal_post_id = case when p_payload ? 'related_journal_post_id' then nullif(p_payload->>'related_journal_post_id', '')::uuid else e.related_journal_post_id end,
      metadata = coalesce(p_payload->'metadata', e.metadata),
      updated_by = auth.uid(),
      updated_at = now()
    where e.id = v_id
    returning * into v_row;

    if v_row.id is null then
      raise exception 'Calendar entry not found.' using errcode = 'P0002';
    end if;
  end if;

  return to_jsonb(v_row);
end;
$$;

create or replace function public.admin_set_journey_calendar_founders(
  p_entry_id uuid,
  p_founder_ids uuid[]
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'auth', 'pg_catalog', 'pg_temp'
as $$
declare
  v_result jsonb;
  v_id uuid;
  v_ord int := 0;
begin
  if not public.has_active_admin_access() then
    raise exception 'Active administrator access is required.' using errcode = '42501';
  end if;

  if not exists (select 1 from public.journey_calendar_entries where id = p_entry_id) then
    raise exception 'Calendar entry not found.' using errcode = 'P0002';
  end if;

  delete from public.journey_calendar_entry_founders where calendar_entry_id = p_entry_id;

  if p_founder_ids is not null then
    foreach v_id in array p_founder_ids loop
      if v_id is null then
        continue;
      end if;
      if not exists (select 1 from public.founder_profiles where id = v_id) then
        raise exception 'Founder profile not found: %', v_id using errcode = 'P0002';
      end if;
      insert into public.journey_calendar_entry_founders (calendar_entry_id, founder_profile_id, display_order)
      values (p_entry_id, v_id, v_ord)
      on conflict (calendar_entry_id, founder_profile_id) do update
        set display_order = excluded.display_order;
      v_ord := v_ord + 1;
    end loop;
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'founder_profile_id', r.founder_profile_id,
        'display_order', r.display_order,
        'display_name', fp.display_name,
        'slug', fp.slug
      )
      order by r.display_order
    ),
    '[]'::jsonb
  )
  into v_result
  from public.journey_calendar_entry_founders r
  join public.founder_profiles fp on fp.id = r.founder_profile_id
  where r.calendar_entry_id = p_entry_id;

  return coalesce(v_result, '[]'::jsonb);
end;
$$;

create or replace function public.admin_upsert_journey_exchange_item(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'auth', 'pg_catalog', 'pg_temp'
as $$
declare
  v_id uuid := nullif(p_payload->>'id', '')::uuid;
  v_title text := nullif(trim(coalesce(p_payload->>'title', '')), '');
  v_item_type text := coalesce(nullif(trim(p_payload->>'item_type'), ''), 'need');
  v_category text := coalesce(nullif(trim(p_payload->>'category'), ''), 'other');
  v_priority text := coalesce(nullif(trim(p_payload->>'priority'), ''), 'normal');
  v_status text := coalesce(nullif(trim(p_payload->>'status'), ''), 'active');
  v_person text := coalesce(nullif(trim(p_payload->>'journey_person'), ''), 'together');
  v_exchange_type text := coalesce(nullif(trim(p_payload->>'exchange_type'), ''), 'free');
  v_row public.journey_exchange_items%rowtype;
begin
  if not public.has_active_admin_access() then
    raise exception 'Active administrator access is required.' using errcode = '42501';
  end if;

  if v_title is null then
    raise exception 'title is required.' using errcode = '22023';
  end if;
  if v_item_type not in ('need', 'offer') then
    raise exception 'Invalid item_type: %', v_item_type using errcode = '22023';
  end if;
  if v_priority not in ('low', 'normal', 'high', 'urgent') then
    raise exception 'Invalid priority: %', v_priority using errcode = '22023';
  end if;
  if v_status not in ('draft', 'active', 'fulfilled', 'paused', 'archived') then
    raise exception 'Invalid status: %', v_status using errcode = '22023';
  end if;
  if v_person not in ('kevin', 'micha', 'together') then
    raise exception 'Invalid journey_person: %', v_person using errcode = '22023';
  end if;
  if v_exchange_type not in ('free', 'barter', 'donation', 'paid', 'mixed') then
    raise exception 'Invalid exchange_type: %', v_exchange_type using errcode = '22023';
  end if;

  if v_id is null then
    insert into public.journey_exchange_items (
      calendar_entry_id, journey_person, item_type, category, title, description,
      quantity, unit, priority, status, is_public, display_order, metadata,
      slug, tagline, full_description, exchange_type, currency, is_featured,
      created_by, updated_by
    ) values (
      nullif(p_payload->>'calendar_entry_id', '')::uuid,
      v_person,
      v_item_type,
      v_category,
      v_title,
      nullif(trim(coalesce(p_payload->>'description', '')), ''),
      nullif(p_payload->>'quantity', '')::int,
      nullif(trim(coalesce(p_payload->>'unit', '')), ''),
      v_priority,
      v_status,
      coalesce((p_payload->>'is_public')::boolean, true),
      coalesce((p_payload->>'display_order')::int, 0),
      coalesce(p_payload->'metadata', '{}'::jsonb),
      nullif(trim(coalesce(p_payload->>'slug', '')), ''),
      nullif(trim(coalesce(p_payload->>'tagline', '')), ''),
      nullif(trim(coalesce(p_payload->>'full_description', '')), ''),
      v_exchange_type,
      coalesce(nullif(trim(p_payload->>'currency'), ''), 'EUR'),
      coalesce((p_payload->>'is_featured')::boolean, false),
      auth.uid(),
      auth.uid()
    )
    returning * into v_row;
  else
    update public.journey_exchange_items x set
      calendar_entry_id = case when p_payload ? 'calendar_entry_id' then nullif(p_payload->>'calendar_entry_id', '')::uuid else x.calendar_entry_id end,
      journey_person = v_person,
      item_type = v_item_type,
      category = v_category,
      title = v_title,
      description = case when p_payload ? 'description' then nullif(trim(p_payload->>'description'), '') else x.description end,
      quantity = case when p_payload ? 'quantity' then nullif(p_payload->>'quantity', '')::int else x.quantity end,
      unit = case when p_payload ? 'unit' then nullif(trim(p_payload->>'unit'), '') else x.unit end,
      priority = v_priority,
      status = v_status,
      is_public = coalesce((p_payload->>'is_public')::boolean, x.is_public),
      display_order = coalesce((p_payload->>'display_order')::int, x.display_order),
      slug = case when p_payload ? 'slug' then nullif(trim(p_payload->>'slug'), '') else x.slug end,
      tagline = case when p_payload ? 'tagline' then nullif(trim(p_payload->>'tagline'), '') else x.tagline end,
      full_description = case when p_payload ? 'full_description' then nullif(trim(p_payload->>'full_description'), '') else x.full_description end,
      exchange_type = v_exchange_type,
      currency = coalesce(nullif(trim(p_payload->>'currency'), ''), x.currency),
      is_featured = coalesce((p_payload->>'is_featured')::boolean, x.is_featured),
      metadata = coalesce(p_payload->'metadata', x.metadata),
      updated_by = auth.uid(),
      updated_at = now()
    where x.id = v_id
    returning * into v_row;

    if v_row.id is null then
      raise exception 'Exchange item not found.' using errcode = 'P0002';
    end if;
  end if;

  return to_jsonb(v_row);
end;
$$;

create or replace function public.admin_list_journey_exchange_items(
  p_calendar_entry_id uuid default null,
  p_status text default null,
  p_query text default null,
  p_limit integer default 200,
  p_offset integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'auth', 'pg_catalog', 'pg_temp'
as $$
declare
  v_rows jsonb;
  v_counts jsonb;
  v_q text := '%' || lower(trim(coalesce(p_query, ''))) || '%';
begin
  if not public.has_active_admin_access() then
    raise exception 'Active administrator access is required.' using errcode = '42501';
  end if;

  with filtered as (
    select
      x.*,
      e.title as calendar_entry_title,
      e.slug as calendar_entry_slug
    from public.journey_exchange_items x
    left join public.journey_calendar_entries e on e.id = x.calendar_entry_id
    where (p_calendar_entry_id is null or x.calendar_entry_id = p_calendar_entry_id)
      and (p_status is null or p_status = 'all' or x.status = p_status)
      and (
        coalesce(p_query, '') = ''
        or lower(concat_ws(' ', x.title, coalesce(x.description, ''), coalesce(x.category, ''), coalesce(e.title, ''))) like v_q
      )
    order by x.updated_at desc
    limit greatest(1, least(coalesce(p_limit, 200), 500))
    offset greatest(coalesce(p_offset, 0), 0)
  )
  select coalesce(jsonb_agg(to_jsonb(filtered)), '[]'::jsonb) into v_rows from filtered;

  select jsonb_build_object(
    'all', count(*),
    'draft', count(*) filter (where status = 'draft'),
    'active', count(*) filter (where status = 'active'),
    'fulfilled', count(*) filter (where status = 'fulfilled'),
    'paused', count(*) filter (where status = 'paused'),
    'archived', count(*) filter (where status = 'archived')
  )
  into v_counts
  from public.journey_exchange_items;

  return jsonb_build_object(
    'rows', coalesce(v_rows, '[]'::jsonb),
    'counts', coalesce(v_counts, '{}'::jsonb)
  );
end;
$$;

create or replace function public.admin_list_journey_host_offers(
  p_status text default null,
  p_calendar_entry_id uuid default null,
  p_query text default null,
  p_limit integer default 200,
  p_offset integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'auth', 'pg_catalog', 'pg_temp'
as $$
declare
  v_rows jsonb;
  v_counts jsonb;
  v_q text := '%' || lower(trim(coalesce(p_query, ''))) || '%';
begin
  if not public.has_active_admin_access() then
    raise exception 'Active administrator access is required.' using errcode = '42501';
  end if;

  with filtered as (
    select
      h.*,
      e.title as calendar_entry_title,
      e.slug as calendar_entry_slug,
      e.city_name as calendar_entry_city
    from public.journey_host_offers h
    join public.journey_calendar_entries e on e.id = h.calendar_entry_id
    where (p_status is null or p_status = 'all' or h.status = p_status)
      and (p_calendar_entry_id is null or h.calendar_entry_id = p_calendar_entry_id)
      and (
        coalesce(p_query, '') = ''
        or lower(concat_ws(
          ' ',
          h.host_name,
          h.email,
          coalesce(h.phone, ''),
          coalesce(h.city_name, ''),
          coalesce(h.message, ''),
          e.title
        )) like v_q
      )
    order by h.created_at desc
    limit greatest(1, least(coalesce(p_limit, 200), 500))
    offset greatest(coalesce(p_offset, 0), 0)
  )
  select coalesce(jsonb_agg(to_jsonb(filtered)), '[]'::jsonb) into v_rows from filtered;

  select jsonb_build_object(
    'all', count(*),
    'new', count(*) filter (where status = 'new'),
    'reviewing', count(*) filter (where status = 'reviewing'),
    'contacted', count(*) filter (where status = 'contacted'),
    'accepted', count(*) filter (where status = 'accepted'),
    'declined', count(*) filter (where status = 'declined'),
    'withdrawn', count(*) filter (where status = 'withdrawn')
  )
  into v_counts
  from public.journey_host_offers;

  return jsonb_build_object(
    'rows', coalesce(v_rows, '[]'::jsonb),
    'counts', coalesce(v_counts, '{}'::jsonb)
  );
end;
$$;

create or replace function public.admin_update_journey_host_offer(
  p_offer_id uuid,
  p_status text,
  p_internal_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'auth', 'pg_catalog', 'pg_temp'
as $$
declare
  v_row public.journey_host_offers%rowtype;
begin
  if not public.has_active_admin_access() then
    raise exception 'Active administrator access is required.' using errcode = '42501';
  end if;

  if p_status not in ('new', 'reviewing', 'contacted', 'accepted', 'declined', 'withdrawn') then
    raise exception 'Invalid host offer status: %', p_status using errcode = '22023';
  end if;

  update public.journey_host_offers h set
    status = p_status,
    internal_notes = coalesce(p_internal_notes, h.internal_notes),
    reviewed_at = case
      when p_status in ('accepted', 'declined', 'contacted') then coalesce(h.reviewed_at, now())
      else h.reviewed_at
    end,
    updated_at = now()
  where h.id = p_offer_id
  returning * into v_row;

  if v_row.id is null then
    raise exception 'Host offer not found.' using errcode = 'P0002';
  end if;

  return to_jsonb(v_row);
end;
$$;

create or replace function public.admin_get_journey_calendar_translation_status(
  p_entry_id uuid default null,
  p_exchange_item_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'auth', 'pg_catalog', 'pg_temp'
as $$
declare
  v_entry jsonb := null;
  v_exchange jsonb := null;
  v_active_langs int;
begin
  if not public.has_active_admin_access() then
    raise exception 'Active administrator access is required.' using errcode = '42501';
  end if;

  select count(*)::int into v_active_langs
  from public.site_languages
  where is_active = true;

  if p_entry_id is not null then
    select jsonb_build_object(
      'entity_type', 'journey_calendar_entry',
      'entity_id', p_entry_id,
      'expected_languages', greatest(v_active_langs - 1, 0),
      'total', count(*),
      'draft', count(*) filter (where translation_status = 'draft'),
      'machine', count(*) filter (where translation_status = 'machine'),
      'reviewed', count(*) filter (where translation_status = 'reviewed'),
      'published', count(*) filter (where translation_status = 'published'),
      'languages', coalesce(
        jsonb_agg(
          jsonb_build_object(
            'language_code', language_code,
            'translation_status', translation_status,
            'updated_at', updated_at
          )
          order by language_code
        ),
        '[]'::jsonb
      )
    )
    into v_entry
    from public.journey_calendar_entry_translations
    where calendar_entry_id = p_entry_id;
  end if;

  if p_exchange_item_id is not null then
    select jsonb_build_object(
      'entity_type', 'journey_exchange_item',
      'entity_id', p_exchange_item_id,
      'expected_languages', greatest(v_active_langs - 1, 0),
      'total', count(*),
      'draft', count(*) filter (where translation_status = 'draft'),
      'machine', count(*) filter (where translation_status = 'machine'),
      'reviewed', count(*) filter (where translation_status = 'reviewed'),
      'published', count(*) filter (where translation_status = 'published'),
      'languages', coalesce(
        jsonb_agg(
          jsonb_build_object(
            'language_code', language_code,
            'translation_status', translation_status,
            'updated_at', updated_at
          )
          order by language_code
        ),
        '[]'::jsonb
      )
    )
    into v_exchange
    from public.journey_exchange_item_translations
    where exchange_item_id = p_exchange_item_id;
  end if;

  return jsonb_build_object(
    'entry', v_entry,
    'exchange_item', v_exchange
  );
end;
$$;

create or replace function public.admin_requeue_journey_calendar_translations(
  p_entity_type text,
  p_entity_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'private', 'auth', 'pg_catalog', 'pg_temp'
as $$
declare
  v_payload jsonb;
  v_job_id uuid;
begin
  if not public.has_active_admin_access() then
    raise exception 'Active administrator access is required.' using errcode = '42501';
  end if;

  if p_entity_type = 'journey_calendar_entry' then
    select jsonb_build_object(
      'title', e.title,
      'country_name', e.country_name,
      'region_name', e.region_name,
      'city_name', e.city_name,
      'location_name', e.location_name,
      'public_summary', e.public_summary,
      'purpose', e.purpose,
      'host_request_message', e.host_request_message
    )
    into v_payload
    from public.journey_calendar_entries e
    where e.id = p_entity_id;

    if v_payload is null then
      raise exception 'Calendar entry not found.' using errcode = 'P0002';
    end if;
  elsif p_entity_type = 'journey_exchange_item' then
    select jsonb_build_object(
      'title', x.title,
      'description', x.description,
      'tagline', x.tagline,
      'full_description', x.full_description,
      'highlights', x.highlights,
      'what_is_included', x.what_is_included,
      'suitable_for', x.suitable_for,
      'requirements', x.requirements,
      'availability_text', x.availability_text,
      'location_text', x.location_text,
      'cta_label', x.cta_label,
      'secondary_cta_label', x.secondary_cta_label,
      'seo_title', x.seo_title,
      'seo_description', x.seo_description
    )
    into v_payload
    from public.journey_exchange_items x
    where x.id = p_entity_id;

    if v_payload is null then
      raise exception 'Exchange item not found.' using errcode = 'P0002';
    end if;
  else
    raise exception 'Unsupported entity type: %', p_entity_type using errcode = '22023';
  end if;

  if to_regprocedure('private.enqueue_translation_job(text,uuid,text,jsonb)') is null then
    raise exception 'Translation queue is unavailable.' using errcode = 'P0001';
  end if;

  v_job_id := private.enqueue_translation_job(p_entity_type, p_entity_id, 'en', v_payload);

  return jsonb_build_object(
    'entity_type', p_entity_type,
    'entity_id', p_entity_id,
    'job_id', v_job_id,
    'queued', v_job_id is not null
  );
end;
$$;

revoke all on function public.admin_get_journey_calendar_overview(text, text, integer, integer) from public;
revoke all on function public.admin_get_journey_calendar_entry(uuid) from public;
revoke all on function public.admin_upsert_journey_calendar_entry(jsonb) from public;
revoke all on function public.admin_set_journey_calendar_founders(uuid, uuid[]) from public;
revoke all on function public.admin_upsert_journey_exchange_item(jsonb) from public;
revoke all on function public.admin_list_journey_exchange_items(uuid, text, text, integer, integer) from public;
revoke all on function public.admin_list_journey_host_offers(text, uuid, text, integer, integer) from public;
revoke all on function public.admin_update_journey_host_offer(uuid, text, text) from public;
revoke all on function public.admin_get_journey_calendar_translation_status(uuid, uuid) from public;
revoke all on function public.admin_requeue_journey_calendar_translations(text, uuid) from public;

grant execute on function public.admin_get_journey_calendar_overview(text, text, integer, integer) to authenticated;
grant execute on function public.admin_get_journey_calendar_entry(uuid) to authenticated;
grant execute on function public.admin_upsert_journey_calendar_entry(jsonb) to authenticated;
grant execute on function public.admin_set_journey_calendar_founders(uuid, uuid[]) to authenticated;
grant execute on function public.admin_upsert_journey_exchange_item(jsonb) to authenticated;
grant execute on function public.admin_list_journey_exchange_items(uuid, text, text, integer, integer) to authenticated;
grant execute on function public.admin_list_journey_host_offers(text, uuid, text, integer, integer) to authenticated;
grant execute on function public.admin_update_journey_host_offer(uuid, text, text) to authenticated;
grant execute on function public.admin_get_journey_calendar_translation_status(uuid, uuid) to authenticated;
grant execute on function public.admin_requeue_journey_calendar_translations(text, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Admin module registration
-- ---------------------------------------------------------------------------

insert into public.admin_modules(key, label, description, route, icon, group_key, display_order, required_roles, is_enabled)
values (
  'journey_calendar',
  'Calendar',
  'Manage public journey stops, host offers, needs/offers and translations.',
  '/admin/calendar',
  'CalendarDays',
  'content',
  25,
  array['admin', 'editor'],
  true
)
on conflict (key) do update set
  label = excluded.label,
  description = excluded.description,
  route = excluded.route,
  icon = excluded.icon,
  group_key = excluded.group_key,
  display_order = excluded.display_order,
  required_roles = excluded.required_roles,
  is_enabled = excluded.is_enabled,
  updated_at = now();

commit;
