-- Journey Calendar admin pickers: lookup options, exchange link set-RPC, journal search.

-- ---------------------------------------------------------------------------
-- 1. Lookup options table (transport, exchange category, timezone presets)
-- ---------------------------------------------------------------------------

create table if not exists public.journey_admin_lookup_options (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  option_key text not null,
  label text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint journey_admin_lookup_options_kind_check
    check (kind in ('transport_mode', 'exchange_category', 'timezone_preset')),
  constraint journey_admin_lookup_options_key_nonempty
    check (length(trim(option_key)) > 0 and length(trim(label)) > 0),
  constraint journey_admin_lookup_options_kind_key_unique
    unique (kind, option_key)
);

create index if not exists journey_admin_lookup_options_kind_active_idx
  on public.journey_admin_lookup_options (kind, is_active, sort_order, label);

alter table public.journey_admin_lookup_options enable row level security;

drop policy if exists "Admins manage journey admin lookup options"
  on public.journey_admin_lookup_options;
create policy "Admins manage journey admin lookup options"
  on public.journey_admin_lookup_options
  for all
  to authenticated
  using (public.has_active_admin_access())
  with check (public.has_active_admin_access());

-- Seed transport modes (include live values + sensible defaults)
insert into public.journey_admin_lookup_options (kind, option_key, label, sort_order, is_active)
values
  ('transport_mode', 'Camper', 'Camper', 10, true),
  ('transport_mode', 'Small car', 'Small car', 20, true),
  ('transport_mode', 'small car and camper', 'Small car and camper', 30, true),
  ('transport_mode', 'Walk', 'Walk', 40, true),
  ('transport_mode', 'Bicycle', 'Bicycle', 50, true),
  ('transport_mode', 'Train', 'Train', 60, true),
  ('transport_mode', 'Bus', 'Bus', 70, true),
  ('transport_mode', 'Ferry', 'Ferry', 80, true),
  ('transport_mode', 'Plane', 'Plane', 90, true)
on conflict (kind, option_key) do update set
  label = excluded.label,
  sort_order = excluded.sort_order,
  is_active = true,
  updated_at = now();

-- Seed exchange categories (live + i18n-aligned)
insert into public.journey_admin_lookup_options (kind, option_key, label, sort_order, is_active)
values
  ('exchange_category', 'accommodation', 'Accommodation', 5, true),
  ('exchange_category', 'basic_facilities', 'Basic facilities', 10, true),
  ('exchange_category', 'sleeping_place', 'Sleeping place', 20, true),
  ('exchange_category', 'bbq', 'BBQ', 30, true),
  ('exchange_category', 'paddleboard', 'Paddleboard', 40, true),
  ('exchange_category', 'photography', 'Photography', 50, true),
  ('exchange_category', 'skipper', 'Skipper', 60, true),
  ('exchange_category', 'other', 'Other', 100, true)
on conflict (kind, option_key) do update set
  label = excluded.label,
  sort_order = excluded.sort_order,
  is_active = true,
  updated_at = now();

-- Seed common timezone presets
insert into public.journey_admin_lookup_options (kind, option_key, label, sort_order, is_active)
values
  ('timezone_preset', 'Europe/Amsterdam', 'Europe/Amsterdam', 10, true),
  ('timezone_preset', 'Europe/Madrid', 'Europe/Madrid', 20, true),
  ('timezone_preset', 'Europe/London', 'Europe/London', 30, true),
  ('timezone_preset', 'Europe/Berlin', 'Europe/Berlin', 40, true),
  ('timezone_preset', 'Europe/Paris', 'Europe/Paris', 50, true),
  ('timezone_preset', 'UTC', 'UTC', 60, true),
  ('timezone_preset', 'America/New_York', 'America/New_York', 70, true),
  ('timezone_preset', 'America/Los_Angeles', 'America/Los_Angeles', 80, true),
  ('timezone_preset', 'Asia/Dubai', 'Asia/Dubai', 90, true),
  ('timezone_preset', 'Asia/Tokyo', 'Asia/Tokyo', 100, true),
  ('timezone_preset', 'Australia/Sydney', 'Australia/Sydney', 110, true)
on conflict (kind, option_key) do update set
  label = excluded.label,
  sort_order = excluded.sort_order,
  is_active = true,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- 2. Lookup list / upsert RPCs
-- ---------------------------------------------------------------------------

create or replace function public.admin_list_journey_lookup_options(
  p_kind text default null,
  p_include_inactive boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'auth', 'pg_catalog', 'pg_temp'
as $$
declare
  v_rows jsonb;
begin
  if not public.has_active_admin_access() then
    raise exception 'Active administrator access is required.' using errcode = '42501';
  end if;

  if p_kind is not null
     and p_kind not in ('transport_mode', 'exchange_category', 'timezone_preset') then
    raise exception 'Invalid lookup kind: %', p_kind using errcode = '22023';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', o.id,
        'kind', o.kind,
        'option_key', o.option_key,
        'label', o.label,
        'sort_order', o.sort_order,
        'is_active', o.is_active,
        'metadata', o.metadata,
        'updated_at', o.updated_at
      )
      order by o.kind, o.sort_order, o.label
    ),
    '[]'::jsonb
  )
  into v_rows
  from public.journey_admin_lookup_options o
  where (p_kind is null or o.kind = p_kind)
    and (p_include_inactive or o.is_active);

  return jsonb_build_object('rows', v_rows);
end;
$$;

create or replace function public.admin_upsert_journey_lookup_option(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'auth', 'pg_catalog', 'pg_temp'
as $$
declare
  v_id uuid := nullif(p_payload->>'id', '')::uuid;
  v_kind text := nullif(trim(coalesce(p_payload->>'kind', '')), '');
  v_key text := nullif(trim(coalesce(p_payload->>'option_key', '')), '');
  v_label text := nullif(trim(coalesce(p_payload->>'label', '')), '');
  v_sort integer := coalesce((p_payload->>'sort_order')::integer, 0);
  v_active boolean := coalesce((p_payload->>'is_active')::boolean, true);
  v_row public.journey_admin_lookup_options%rowtype;
begin
  if not public.has_active_admin_access() then
    raise exception 'Active administrator access is required.' using errcode = '42501';
  end if;

  if v_kind is null or v_kind not in ('transport_mode', 'exchange_category', 'timezone_preset') then
    raise exception 'Invalid lookup kind.' using errcode = '22023';
  end if;
  if v_key is null then
    raise exception 'option_key is required.' using errcode = '22023';
  end if;
  if v_label is null then
    raise exception 'label is required.' using errcode = '22023';
  end if;

  if v_id is null then
    insert into public.journey_admin_lookup_options (kind, option_key, label, sort_order, is_active)
    values (v_kind, v_key, v_label, v_sort, v_active)
    on conflict (kind, option_key) do update set
      label = excluded.label,
      sort_order = excluded.sort_order,
      is_active = excluded.is_active,
      updated_at = now()
    returning * into v_row;
  else
    update public.journey_admin_lookup_options
    set
      kind = v_kind,
      option_key = v_key,
      label = v_label,
      sort_order = v_sort,
      is_active = v_active,
      updated_at = now()
    where id = v_id
    returning * into v_row;

    if not found then
      raise exception 'Lookup option not found.' using errcode = 'P0002';
    end if;
  end if;

  return to_jsonb(v_row);
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Replace-set linked exchange items on a calendar stop
-- ---------------------------------------------------------------------------

create or replace function public.admin_set_journey_calendar_exchange_items(
  p_entry_id uuid,
  p_item_ids uuid[]
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'auth', 'pg_catalog', 'pg_temp'
as $$
declare
  v_id uuid;
  v_rows jsonb;
begin
  if not public.has_active_admin_access() then
    raise exception 'Active administrator access is required.' using errcode = '42501';
  end if;

  if not exists (select 1 from public.journey_calendar_entries where id = p_entry_id) then
    raise exception 'Calendar entry not found.' using errcode = 'P0002';
  end if;

  -- Unlink items currently on this stop that are not in the new set
  update public.journey_exchange_items
  set
    calendar_entry_id = null,
    updated_at = now()
  where calendar_entry_id = p_entry_id
    and (
      p_item_ids is null
      or not (id = any (p_item_ids))
    );

  if p_item_ids is not null then
    foreach v_id in array p_item_ids loop
      if v_id is null then
        continue;
      end if;
      if not exists (select 1 from public.journey_exchange_items where id = v_id) then
        raise exception 'Exchange item not found: %', v_id using errcode = 'P0002';
      end if;
      update public.journey_exchange_items
      set
        calendar_entry_id = p_entry_id,
        updated_at = now()
      where id = v_id;
    end loop;
  end if;

  select coalesce(jsonb_agg(to_jsonb(x) order by x.display_order, x.title), '[]'::jsonb)
  into v_rows
  from public.journey_exchange_items x
  where x.calendar_entry_id = p_entry_id;

  return coalesce(v_rows, '[]'::jsonb);
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Journal post search for related-post picker
-- ---------------------------------------------------------------------------

create or replace function public.admin_search_journal_posts(
  p_query text default null,
  p_limit integer default 25
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'auth', 'pg_catalog', 'pg_temp'
as $$
declare
  v_rows jsonb;
  v_q text := '%' || lower(trim(coalesce(p_query, ''))) || '%';
  v_limit integer := greatest(1, least(coalesce(p_limit, 25), 100));
begin
  if not public.has_active_admin_access() then
    raise exception 'Active administrator access is required.' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(to_jsonb(row_data)), '[]'::jsonb)
  into v_rows
  from (
    select
      p.id,
      p.title,
      p.slug,
      p.status,
      p.published_at,
      p.created_at
    from public.journal_posts p
    where coalesce(p_query, '') = ''
       or lower(concat_ws(' ', p.title, p.slug, coalesce(p.status, ''))) like v_q
       or p.id::text = trim(coalesce(p_query, ''))
    order by
      case when p.published_at is null then 1 else 0 end,
      p.published_at desc nulls last,
      p.created_at desc
    limit v_limit
  ) row_data;

  return jsonb_build_object('rows', coalesce(v_rows, '[]'::jsonb));
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Grants
-- ---------------------------------------------------------------------------

revoke all on function public.admin_list_journey_lookup_options(text, boolean) from public;
revoke all on function public.admin_upsert_journey_lookup_option(jsonb) from public;
revoke all on function public.admin_set_journey_calendar_exchange_items(uuid, uuid[]) from public;
revoke all on function public.admin_search_journal_posts(text, integer) from public;

grant execute on function public.admin_list_journey_lookup_options(text, boolean) to authenticated;
grant execute on function public.admin_upsert_journey_lookup_option(jsonb) to authenticated;
grant execute on function public.admin_set_journey_calendar_exchange_items(uuid, uuid[]) to authenticated;
grant execute on function public.admin_search_journal_posts(text, integer) to authenticated;
