-- Journal post donations: provider-agnostic schema, RLS, RPCs, admin metadata and i18n seeds.

begin;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.donation_providers (
  slug text primary key,
  display_order integer not null default 0,
  is_enabled boolean not null default false,
  checkout_mode text not null default 'hosted_checkout'
    check (checkout_mode in ('hosted_checkout', 'payment_link', 'manual_instructions')),
  config jsonb not null default '{}'::jsonb check (jsonb_typeof(config) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.donation_amount_presets (
  id uuid primary key default gen_random_uuid(),
  amount_minor_units integer not null check (amount_minor_units > 0),
  currency text not null default 'EUR',
  display_order integer not null default 0,
  is_enabled boolean not null default true,
  is_custom_allowed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists donation_amount_presets_one_custom_allowed_idx
  on public.donation_amount_presets ((is_custom_allowed))
  where is_custom_allowed = true;

create table if not exists public.journal_post_donation_settings (
  journal_post_id uuid primary key references public.journal_posts(id) on delete cascade,
  is_enabled boolean not null default true,
  thanks_message_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.donations (
  id uuid primary key default gen_random_uuid(),
  journal_post_id uuid references public.journal_posts(id) on delete set null,
  provider_slug text not null references public.donation_providers(slug) on delete restrict,
  status text not null default 'initiated'
    check (status in ('initiated', 'pending', 'awaiting_transfer', 'succeeded', 'failed', 'cancelled', 'refunded')),
  amount_minor_units integer not null check (amount_minor_units > 0),
  currency text not null default 'EUR',
  donor_email text not null,
  donor_display_name text,
  is_anonymous boolean not null default false,
  consent_to_public_thanks boolean not null default false,
  supporter_message text,
  moderation_status text not null default 'pending'
    check (moderation_status in ('pending', 'approved', 'rejected')),
  language_code text not null references public.site_languages(code) on delete restrict,
  session_key text,
  user_id uuid references auth.users(id) on delete set null,
  provider_checkout_id text,
  provider_payment_id text,
  provider_metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(provider_metadata) = 'object'),
  initiated_at timestamptz not null default now(),
  completed_at timestamptz,
  internal_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists donations_journal_post_status_idx
  on public.donations (journal_post_id, status)
  where journal_post_id is not null;

create index if not exists donations_status_initiated_at_idx
  on public.donations (status, initiated_at desc);

create unique index if not exists donations_provider_payment_succeeded_unique_idx
  on public.donations (provider_slug, provider_payment_id)
  where status = 'succeeded' and provider_payment_id is not null;

create table if not exists public.donation_events (
  id uuid primary key default gen_random_uuid(),
  donation_id uuid not null references public.donations(id) on delete cascade,
  event_type text not null
    check (event_type in ('initiated', 'checkout_created', 'webhook_received', 'status_changed', 'admin_confirmed', 'refunded')),
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  idempotency_key text,
  created_at timestamptz not null default now()
);

create unique index if not exists donation_events_idempotency_key_unique_idx
  on public.donation_events (idempotency_key)
  where idempotency_key is not null;

create index if not exists donation_events_donation_created_idx
  on public.donation_events (donation_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.has_active_admin_access()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.admin_allowlist a
    where lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      and a.is_active = true
  );
$$;

revoke all on function public.has_active_admin_access() from public;
grant execute on function public.has_active_admin_access() to authenticated;

create or replace function public.get_donation_system_setting(p_key text, p_default jsonb)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select s.value
      from public.admin_system_settings s
      where s.key = p_key
    ),
    p_default
  );
$$;

revoke all on function public.get_donation_system_setting(text, jsonb) from public;
grant execute on function public.get_donation_system_setting(text, jsonb) to anon, authenticated, service_role;

create or replace function public.donations_are_globally_enabled()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((public.get_donation_system_setting('donations.enabled', 'false'::jsonb))::boolean, false);
$$;

revoke all on function public.donations_are_globally_enabled() from public;
grant execute on function public.donations_are_globally_enabled() to anon, authenticated, service_role;

create or replace function public.journal_post_accepts_donations(p_journal_post_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.donations_are_globally_enabled()
    and exists (
      select 1
      from public.journal_posts p
      where p.id = p_journal_post_id
        and p.status = 'published'
        and p.published_at is not null
        and p.published_at <= now()
    )
    and coalesce(
      (
        select s.is_enabled
        from public.journal_post_donation_settings s
        where s.journal_post_id = p_journal_post_id
      ),
      true
    );
$$;

revoke all on function public.journal_post_accepts_donations(uuid) from public;
grant execute on function public.journal_post_accepts_donations(uuid) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.donation_providers enable row level security;
alter table public.donation_amount_presets enable row level security;
alter table public.journal_post_donation_settings enable row level security;
alter table public.donations enable row level security;
alter table public.donation_events enable row level security;

drop policy if exists "public reads enabled donation providers" on public.donation_providers;
create policy "public reads enabled donation providers"
on public.donation_providers for select
using (is_enabled = true);

drop policy if exists "admins manage donation providers" on public.donation_providers;
create policy "admins manage donation providers"
on public.donation_providers for all to authenticated
using (public.has_active_admin_access())
with check (public.has_active_admin_access());

drop policy if exists "public reads enabled donation amount presets" on public.donation_amount_presets;
create policy "public reads enabled donation amount presets"
on public.donation_amount_presets for select
using (is_enabled = true);

drop policy if exists "admins manage donation amount presets" on public.donation_amount_presets;
create policy "admins manage donation amount presets"
on public.donation_amount_presets for all to authenticated
using (public.has_active_admin_access())
with check (public.has_active_admin_access());

drop policy if exists "public reads donation settings for published posts" on public.journal_post_donation_settings;
create policy "public reads donation settings for published posts"
on public.journal_post_donation_settings for select
using (
  exists (
    select 1
    from public.journal_posts p
    where p.id = journal_post_id
      and p.status = 'published'
      and p.published_at is not null
      and p.published_at <= now()
  )
);

drop policy if exists "admins manage journal post donation settings" on public.journal_post_donation_settings;
create policy "admins manage journal post donation settings"
on public.journal_post_donation_settings for all to authenticated
using (public.has_active_admin_access())
with check (public.has_active_admin_access());

drop policy if exists "users read own donations" on public.donations;
create policy "users read own donations"
on public.donations for select to authenticated
using (user_id = auth.uid());

drop policy if exists "admins manage donations" on public.donations;
create policy "admins manage donations"
on public.donations for all to authenticated
using (public.has_active_admin_access())
with check (public.has_active_admin_access());

drop policy if exists "admins read donation events" on public.donation_events;
create policy "admins read donation events"
on public.donation_events for select to authenticated
using (public.has_active_admin_access());

drop policy if exists "admins insert donation events" on public.donation_events;
create policy "admins insert donation events"
on public.donation_events for insert to authenticated
with check (public.has_active_admin_access());

-- ---------------------------------------------------------------------------
-- Public RPCs
-- ---------------------------------------------------------------------------

create or replace function public.get_donation_public_config(p_language text default 'en')
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_enabled boolean := public.donations_are_globally_enabled();
  v_default_currency text := coalesce(public.get_donation_system_setting('donations.default_currency', '"EUR"'::jsonb)#>>'{}', 'EUR');
  v_min_amount integer := coalesce((public.get_donation_system_setting('donations.min_amount_cents', '100'::jsonb))::integer, 100);
  v_max_amount integer := coalesce((public.get_donation_system_setting('donations.max_amount_cents', '1000000'::jsonb))::integer, 1000000);
  v_wise_link text := nullif(public.get_donation_system_setting('donations.wise_payment_link', 'null'::jsonb)#>>'{}', '');
begin
  return jsonb_build_object(
    'enabled', v_enabled,
    'default_currency', v_default_currency,
    'min_amount_minor_units', v_min_amount,
    'max_amount_minor_units', v_max_amount,
    'wise_payment_link', v_wise_link,
    'providers', coalesce((
      select jsonb_agg(jsonb_build_object(
        'slug', dp.slug,
        'checkout_mode', dp.checkout_mode,
        'display_order', dp.display_order,
        'config', dp.config
      ) order by dp.display_order, dp.slug)
      from public.donation_providers dp
      where dp.is_enabled = true
    ), '[]'::jsonb),
    'presets', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id,
        'amount_minor_units', p.amount_minor_units,
        'currency', p.currency,
        'display_order', p.display_order,
        'is_custom_allowed', p.is_custom_allowed
      ) order by p.display_order, p.amount_minor_units)
      from public.donation_amount_presets p
      where p.is_enabled = true
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.get_donation_public_config(text) from public;
grant execute on function public.get_donation_public_config(text) to anon, authenticated;

create or replace function public.get_journal_donation_public_stats(p_journal_post_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_default_currency text := coalesce(public.get_donation_system_setting('donations.default_currency', '"EUR"'::jsonb)#>>'{}', 'EUR');
  v_count integer := 0;
  v_total bigint := 0;
begin
  if not public.journal_post_accepts_donations(p_journal_post_id) then
    return jsonb_build_object('enabled', false);
  end if;

  select
    count(*)::integer,
    coalesce(sum(d.amount_minor_units), 0)::bigint
  into v_count, v_total
  from public.donations d
  where d.journal_post_id = p_journal_post_id
    and d.status = 'succeeded';

  return jsonb_build_object(
    'enabled', true,
    'donation_count', v_count,
    'total_amount_minor_units', v_total,
    'currency', v_default_currency
  );
end;
$$;

revoke all on function public.get_journal_donation_public_stats(uuid) from public;
grant execute on function public.get_journal_donation_public_stats(uuid) to anon, authenticated;

create or replace function public.get_journal_donation_supporter_thanks(
  p_journal_post_id uuid,
  p_language text default 'en'
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.journal_post_accepts_donations(p_journal_post_id) then
    return '[]'::jsonb;
  end if;

  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'donation_id', d.id,
      'display_name', case when d.is_anonymous then null else d.donor_display_name end,
      'message', d.supporter_message,
      'completed_at', d.completed_at
    ) order by d.completed_at desc nulls last, d.initiated_at desc)
    from public.donations d
    where d.journal_post_id = p_journal_post_id
      and d.status = 'succeeded'
      and d.consent_to_public_thanks = true
      and d.moderation_status = 'approved'
      and (
        d.supporter_message is not null
        or (d.donor_display_name is not null and d.is_anonymous = false)
      )
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.get_journal_donation_supporter_thanks(uuid, text) from public;
grant execute on function public.get_journal_donation_supporter_thanks(uuid, text) to anon, authenticated;

create or replace function public.create_donation_intent(
  p_journal_post_id uuid,
  p_provider_slug text,
  p_amount_minor_units integer,
  p_donor_email text,
  p_currency text default null,
  p_donor_display_name text default null,
  p_is_anonymous boolean default false,
  p_consent_to_public_thanks boolean default false,
  p_supporter_message text default null,
  p_language_code text default 'en',
  p_session_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_donation_id uuid;
  v_provider public.donation_providers%rowtype;
  v_default_currency text := coalesce(public.get_donation_system_setting('donations.default_currency', '"EUR"'::jsonb)#>>'{}', 'EUR');
  v_min_amount integer := coalesce((public.get_donation_system_setting('donations.min_amount_cents', '100'::jsonb))::integer, 100);
  v_max_amount integer := coalesce((public.get_donation_system_setting('donations.max_amount_cents', '1000000'::jsonb))::integer, 1000000);
  v_currency text := upper(coalesce(nullif(trim(p_currency), ''), v_default_currency));
  v_email text := lower(trim(p_donor_email));
  v_initial_status text := 'initiated';
begin
  if not public.donations_are_globally_enabled() then
    raise exception 'donations.error.disabled' using errcode = 'P0001';
  end if;

  if p_journal_post_id is null then
    raise exception 'donations.error.invalid_post' using errcode = 'P0001';
  end if;

  if not public.journal_post_accepts_donations(p_journal_post_id) then
    raise exception 'donations.error.invalid_post' using errcode = 'P0001';
  end if;

  select * into v_provider
  from public.donation_providers dp
  where dp.slug = p_provider_slug and dp.is_enabled = true;

  if not found then
    raise exception 'donations.error.invalid_provider' using errcode = 'P0001';
  end if;

  if p_amount_minor_units is null or p_amount_minor_units < v_min_amount or p_amount_minor_units > v_max_amount then
    raise exception 'donations.error.invalid_amount' using errcode = 'P0001';
  end if;

  if v_email is null or v_email !~ '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$' then
    raise exception 'donations.error.invalid_email' using errcode = 'P0001';
  end if;

  if not exists (
    select 1 from public.site_languages sl
    where sl.code = p_language_code and sl.is_active = true
  ) then
    raise exception 'donations.error.invalid_language' using errcode = 'P0001';
  end if;

  if v_provider.checkout_mode = 'manual_instructions' then
    v_initial_status := 'awaiting_transfer';
  elsif v_provider.checkout_mode = 'payment_link' then
    v_initial_status := 'pending';
  end if;

  insert into public.donations (
    journal_post_id,
    provider_slug,
    status,
    amount_minor_units,
    currency,
    donor_email,
    donor_display_name,
    is_anonymous,
    consent_to_public_thanks,
    supporter_message,
    moderation_status,
    language_code,
    session_key,
    user_id,
    initiated_at,
    updated_at
  )
  values (
    p_journal_post_id,
    v_provider.slug,
    v_initial_status,
    p_amount_minor_units,
    v_currency,
    v_email,
    nullif(trim(coalesce(p_donor_display_name, '')), ''),
    coalesce(p_is_anonymous, false),
    coalesce(p_consent_to_public_thanks, false),
    nullif(trim(coalesce(p_supporter_message, '')), ''),
    case
      when coalesce(p_consent_to_public_thanks, false) = true
        and nullif(trim(coalesce(p_supporter_message, '')), '') is not null
      then 'pending'
      else 'rejected'
    end,
    p_language_code,
    nullif(trim(coalesce(p_session_key, '')), ''),
    auth.uid(),
    now(),
    now()
  )
  returning id into v_donation_id;

  insert into public.donation_events (donation_id, event_type, payload)
  values (
    v_donation_id,
    'initiated',
    jsonb_build_object(
      'provider_slug', v_provider.slug,
      'amount_minor_units', p_amount_minor_units,
      'currency', v_currency,
      'journal_post_id', p_journal_post_id
    )
  );

  return jsonb_build_object(
    'donation_id', v_donation_id,
    'provider_slug', v_provider.slug,
    'checkout_mode', v_provider.checkout_mode,
    'status', v_initial_status,
    'amount_minor_units', p_amount_minor_units,
    'currency', v_currency
  );
end;
$$;

revoke all on function public.create_donation_intent(uuid, text, integer, text, text, text, boolean, boolean, text, text, text) from public;
grant execute on function public.create_donation_intent(uuid, text, integer, text, text, text, boolean, boolean, text, text, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Provider / admin RPCs
-- ---------------------------------------------------------------------------

create or replace function public.record_donation_provider_event(
  p_idempotency_key text,
  p_donation_id uuid,
  p_event_type text,
  p_payload jsonb default '{}'::jsonb,
  p_new_status text default null,
  p_provider_checkout_id text default null,
  p_provider_payment_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing_event_id uuid;
  v_donation public.donations%rowtype;
begin
  if nullif(trim(coalesce(p_idempotency_key, '')), '') is not null then
    select e.id into v_existing_event_id
    from public.donation_events e
    where e.idempotency_key = p_idempotency_key;

    if found then
      return jsonb_build_object('duplicate', true, 'event_id', v_existing_event_id);
    end if;
  end if;

  select * into v_donation
  from public.donations d
  where d.id = p_donation_id;

  if not found then
    raise exception 'Donation % was not found.', p_donation_id using errcode = 'P0002';
  end if;

  insert into public.donation_events (donation_id, event_type, payload, idempotency_key)
  values (
    p_donation_id,
    p_event_type,
    coalesce(p_payload, '{}'::jsonb),
    nullif(trim(coalesce(p_idempotency_key, '')), '')
  );

  if p_new_status is not null then
    update public.donations d
    set
      status = p_new_status,
      provider_checkout_id = coalesce(nullif(trim(coalesce(p_provider_checkout_id, '')), ''), d.provider_checkout_id),
      provider_payment_id = coalesce(nullif(trim(coalesce(p_provider_payment_id, '')), ''), d.provider_payment_id),
      completed_at = case when p_new_status = 'succeeded' then coalesce(d.completed_at, now()) else d.completed_at end,
      updated_at = now()
    where d.id = p_donation_id;
  elsif p_provider_checkout_id is not null or p_provider_payment_id is not null then
    update public.donations d
    set
      provider_checkout_id = coalesce(nullif(trim(coalesce(p_provider_checkout_id, '')), ''), d.provider_checkout_id),
      provider_payment_id = coalesce(nullif(trim(coalesce(p_provider_payment_id, '')), ''), d.provider_payment_id),
      updated_at = now()
    where d.id = p_donation_id;
  end if;

  return jsonb_build_object('duplicate', false, 'donation_id', p_donation_id);
end;
$$;

revoke all on function public.record_donation_provider_event(text, uuid, text, jsonb, text, text, text) from public;
grant execute on function public.record_donation_provider_event(text, uuid, text, jsonb, text, text, text) to service_role;

create or replace function public.admin_confirm_donation(
  p_donation_id uuid,
  p_provider_payment_id text default null,
  p_internal_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_donation public.donations%rowtype;
begin
  if not public.has_active_admin_access() then
    raise exception 'Active administrator access is required.' using errcode = '42501';
  end if;

  select * into v_donation
  from public.donations d
  where d.id = p_donation_id;

  if not found then
    raise exception 'Donation % was not found.', p_donation_id using errcode = 'P0002';
  end if;

  if v_donation.status not in ('initiated', 'pending', 'awaiting_transfer') then
    raise exception 'Donation % cannot be confirmed from status %.', p_donation_id, v_donation.status using errcode = 'P0001';
  end if;

  if v_donation.provider_slug not in ('wise', 'manual') then
    raise exception 'Donation % must be confirmed through its payment provider webhook.', p_donation_id using errcode = 'P0001';
  end if;

  update public.donations d
  set
    status = 'succeeded',
    provider_payment_id = coalesce(nullif(trim(coalesce(p_provider_payment_id, '')), ''), d.provider_payment_id),
    internal_notes = coalesce(nullif(trim(coalesce(p_internal_notes, '')), ''), d.internal_notes),
    completed_at = now(),
    updated_at = now()
  where d.id = p_donation_id;

  insert into public.donation_events (donation_id, event_type, payload)
  values (
    p_donation_id,
    'admin_confirmed',
    jsonb_build_object(
      'provider_payment_id', p_provider_payment_id,
      'internal_notes', p_internal_notes
    )
  );

  return jsonb_build_object('donation_id', p_donation_id, 'status', 'succeeded');
end;
$$;

revoke all on function public.admin_confirm_donation(uuid, text, text) from public;
grant execute on function public.admin_confirm_donation(uuid, text, text) to authenticated;

create or replace function public.admin_moderate_donation_thanks(
  p_donation_id uuid,
  p_moderation_status text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_active_admin_access() then
    raise exception 'Active administrator access is required.' using errcode = '42501';
  end if;

  if p_moderation_status not in ('approved', 'rejected') then
    raise exception 'Moderation status must be approved or rejected.' using errcode = 'P0001';
  end if;

  update public.donations d
  set moderation_status = p_moderation_status, updated_at = now()
  where d.id = p_donation_id;

  if not found then
    raise exception 'Donation % was not found.', p_donation_id using errcode = 'P0002';
  end if;

  insert into public.donation_events (donation_id, event_type, payload)
  values (
    p_donation_id,
    'status_changed',
    jsonb_build_object('moderation_status', p_moderation_status)
  );

  return jsonb_build_object('donation_id', p_donation_id, 'moderation_status', p_moderation_status);
end;
$$;

revoke all on function public.admin_moderate_donation_thanks(uuid, text) from public;
grant execute on function public.admin_moderate_donation_thanks(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Admin view
-- ---------------------------------------------------------------------------

create or replace view public.donation_admin_inbox as
select
  d.id,
  d.journal_post_id,
  p.slug as journal_post_slug,
  p.title as journal_post_title,
  d.provider_slug,
  d.status,
  d.amount_minor_units,
  d.currency,
  d.donor_email,
  d.donor_display_name,
  d.is_anonymous,
  d.consent_to_public_thanks,
  d.supporter_message,
  d.moderation_status,
  d.language_code,
  d.provider_checkout_id,
  d.provider_payment_id,
  d.initiated_at,
  d.completed_at,
  d.internal_notes,
  d.created_at,
  d.updated_at
from public.donations d
left join public.journal_posts p on p.id = d.journal_post_id;

comment on view public.donation_admin_inbox is
  'Administrator inbox for journal post donations. Access is restricted through donations RLS policies.';

grant select on public.donation_admin_inbox to authenticated;

-- ---------------------------------------------------------------------------
-- Seeds: providers, presets, settings, admin sections
-- ---------------------------------------------------------------------------

insert into public.donation_providers (slug, display_order, is_enabled, checkout_mode, config)
values
  ('stripe', 10, true, 'hosted_checkout', '{"supported_currencies":["EUR","USD","GBP"]}'::jsonb),
  ('paypal', 20, true, 'hosted_checkout', '{"supported_currencies":["EUR","USD","GBP"]}'::jsonb),
  ('wise', 30, true, 'payment_link', '{"supported_currencies":["EUR","USD","GBP"]}'::jsonb),
  ('manual', 40, false, 'manual_instructions', '{"supported_currencies":["EUR"]}'::jsonb)
on conflict (slug) do update set
  display_order = excluded.display_order,
  checkout_mode = excluded.checkout_mode,
  config = excluded.config,
  updated_at = now();

insert into public.donation_amount_presets (amount_minor_units, currency, display_order, is_enabled, is_custom_allowed)
select v.amount_minor_units, v.currency, v.display_order, v.is_enabled, v.is_custom_allowed
from (
  values
    (500, 'EUR', 10, true, false),
    (1000, 'EUR', 20, true, false),
    (2500, 'EUR', 30, true, false),
    (5000, 'EUR', 40, true, false),
    (1, 'EUR', 50, true, true)
) as v(amount_minor_units, currency, display_order, is_enabled, is_custom_allowed)
where not exists (
  select 1
  from public.donation_amount_presets p
  where p.currency = v.currency
    and p.is_custom_allowed = v.is_custom_allowed
    and (
      (v.is_custom_allowed = true and p.is_custom_allowed = true)
      or (v.is_custom_allowed = false and p.amount_minor_units = v.amount_minor_units)
    )
);

insert into public.admin_system_settings (key, category, label, description, value, is_secret)
values
  ('donations.enabled', 'donations', 'Donations enabled', 'Whether journal post donations are accepted publicly.', 'true'::jsonb, false),
  ('donations.default_currency', 'donations', 'Default donation currency', 'Default ISO currency for new donation intents.', '"EUR"'::jsonb, false),
  ('donations.min_amount_cents', 'donations', 'Minimum donation amount', 'Minimum allowed donation amount in minor units.', '100'::jsonb, false),
  ('donations.max_amount_cents', 'donations', 'Maximum donation amount', 'Maximum allowed donation amount in minor units.', '1000000'::jsonb, false),
  ('donations.wise_payment_link', 'donations', 'Wise payment link', 'Public Wise payment link used for transfer-based donations.', 'null'::jsonb, false)
on conflict (key) do update set
  category = excluded.category,
  label = excluded.label,
  description = excluded.description,
  value = excluded.value,
  is_secret = excluded.is_secret,
  updated_at = now();

do $donation_admin_sections$
begin
  if to_regclass('public.admin_sections') is not null then
    insert into public.admin_sections
    (section_key, route, title_key, title_fallback, description_key, description_fallback, source_table, primary_key, title_field, subtitle_field, status_field, date_field, image_field, link_field, variant, order_field, order_direction, display_order)
    values
    ('donations','/admin/donations','admin.donations.title','Donations','admin.donations.description','Review post-attributed supporter donations, statuses and moderation.','donations','id','donor_display_name','provider_slug','status','initiated_at',null,null,'table','initiated_at','desc',95),
    ('donation_events','/admin/donation-events','admin.donation_events.title','Donation Events','admin.donation_events.description','Read-only audit trail for donation lifecycle and provider events.','donation_events','id','event_type','donation_id',null,'created_at',null,null,'audit','created_at','desc',96)
    on conflict (route) do update set
      section_key = excluded.section_key,
      title_key = excluded.title_key,
      title_fallback = excluded.title_fallback,
      description_key = excluded.description_key,
      description_fallback = excluded.description_fallback,
      source_table = excluded.source_table,
      primary_key = excluded.primary_key,
      title_field = excluded.title_field,
      subtitle_field = excluded.subtitle_field,
      status_field = excluded.status_field,
      date_field = excluded.date_field,
      image_field = excluded.image_field,
      link_field = excluded.link_field,
      variant = excluded.variant,
      order_field = excluded.order_field,
      order_direction = excluded.order_direction,
      display_order = excluded.display_order,
      updated_at = now();
  end if;

  if to_regclass('public.admin_section_fields') is not null then
    with field_seed(route, field_name, label_fallback, display_order, show_in_list, show_in_editor, is_readonly, input_type, options) as (
    values
    ('/admin/donations','donor_display_name','Display name',10,true,true,false,'text','[]'::jsonb),
    ('/admin/donations','donor_email','Donor email',20,true,true,false,'email','[]'::jsonb),
    ('/admin/donations','provider_slug','Provider',30,true,true,false,'text','[]'::jsonb),
    ('/admin/donations','status','Status',40,true,true,false,'select','["initiated","pending","awaiting_transfer","succeeded","failed","cancelled","refunded"]'::jsonb),
    ('/admin/donations','amount_minor_units','Amount (minor units)',50,true,true,false,'number','[]'::jsonb),
    ('/admin/donations','currency','Currency',60,true,true,false,'text','[]'::jsonb),
    ('/admin/donations','journal_post_id','Journal post',70,true,true,false,'text','[]'::jsonb),
    ('/admin/donations','moderation_status','Thanks moderation',80,true,true,false,'select','["pending","approved","rejected"]'::jsonb),
    ('/admin/donations','supporter_message','Supporter message',90,false,true,false,'textarea','[]'::jsonb),
    ('/admin/donations','internal_notes','Internal notes',100,false,true,false,'textarea','[]'::jsonb),
    ('/admin/donations','initiated_at','Initiated at',110,true,false,true,'datetime','[]'::jsonb),
    ('/admin/donation-events','event_type','Event type',10,true,false,true,'text','[]'::jsonb),
    ('/admin/donation-events','donation_id','Donation',20,true,false,true,'text','[]'::jsonb),
    ('/admin/donation-events','idempotency_key','Idempotency key',30,true,false,true,'text','[]'::jsonb),
    ('/admin/donation-events','created_at','Created at',40,true,false,true,'datetime','[]'::jsonb)
    )
    insert into public.admin_section_fields(section_id, field_name, label_key, label_fallback, display_order, show_in_list, show_in_editor, is_readonly, input_type, options)
    select s.id, f.field_name, 'admin.field.' || replace(f.field_name, '_', '.'), f.label_fallback, f.display_order, f.show_in_list, f.show_in_editor, f.is_readonly, f.input_type, f.options
    from field_seed f
    join public.admin_sections s on s.route = f.route
    on conflict(section_id, field_name) do update set
      label_key = excluded.label_key,
      label_fallback = excluded.label_fallback,
      display_order = excluded.display_order,
      show_in_list = excluded.show_in_list,
      show_in_editor = excluded.show_in_editor,
      is_readonly = excluded.is_readonly,
      input_type = excluded.input_type,
      options = excluded.options,
      updated_at = now();
  end if;
end
$donation_admin_sections$;

-- ---------------------------------------------------------------------------
-- i18n seeds
-- ---------------------------------------------------------------------------

insert into public.website_translation_keys
  (translation_key, namespace, description, default_text, value_type, is_required, is_active, interpolation_variables, supports_plural)
values
  ('donations.cta.support_this_story', 'donations', 'Primary CTA to support a journal post', 'Support this story', 'text', true, true, '{}', false),
  ('donations.cta.choose_amount', 'donations', 'Heading above preset donation amounts', 'Choose an amount', 'text', true, true, '{}', false),
  ('donations.cta.custom_amount', 'donations', 'Label for custom donation amount option', 'Other amount', 'text', true, true, '{}', false),
  ('donations.form.email_label', 'donations', 'Donation form email label', 'Email address', 'text', true, true, '{}', false),
  ('donations.form.display_name_label', 'donations', 'Donation form display name label', 'Display name (optional)', 'text', true, true, '{}', false),
  ('donations.form.message_label', 'donations', 'Donation form supporter message label', 'Leave a message (optional)', 'text', true, true, '{}', false),
  ('donations.form.anonymous_label', 'donations', 'Donation form anonymous checkbox label', 'Keep my support anonymous', 'text', true, true, '{}', false),
  ('donations.form.public_thanks_consent', 'donations', 'Consent to show supporter thanks publicly', 'You may show my name and message with this story', 'text', true, true, '{}', false),
  ('donations.status.initiated', 'donations', 'Donation status initiated', 'Started', 'text', true, true, '{}', false),
  ('donations.status.pending', 'donations', 'Donation status pending', 'Pending', 'text', true, true, '{}', false),
  ('donations.status.awaiting_transfer', 'donations', 'Donation status awaiting transfer', 'Awaiting transfer', 'text', true, true, '{}', false),
  ('donations.status.succeeded', 'donations', 'Donation status succeeded', 'Completed', 'text', true, true, '{}', false),
  ('donations.status.failed', 'donations', 'Donation status failed', 'Failed', 'text', true, true, '{}', false),
  ('donations.status.cancelled', 'donations', 'Donation status cancelled', 'Cancelled', 'text', true, true, '{}', false),
  ('donations.status.refunded', 'donations', 'Donation status refunded', 'Refunded', 'text', true, true, '{}', false),
  ('donations.provider.stripe', 'donations', 'Stripe provider label', 'Card payment', 'text', true, true, '{}', false),
  ('donations.provider.paypal', 'donations', 'PayPal provider label', 'PayPal', 'text', true, true, '{}', false),
  ('donations.provider.wise', 'donations', 'Wise provider label', 'Wise transfer', 'text', true, true, '{}', false),
  ('donations.provider.manual', 'donations', 'Manual provider label', 'Manual transfer', 'text', true, true, '{}', false),
  ('donations.error.disabled', 'donations', 'Donations disabled error', 'Donations are not available right now.', 'text', true, true, '{}', false),
  ('donations.error.invalid_amount', 'donations', 'Invalid donation amount error', 'Choose an amount within the allowed range.', 'text', true, true, '{}', false),
  ('donations.error.invalid_post', 'donations', 'Invalid journal post error', 'This story cannot receive donations.', 'text', true, true, '{}', false),
  ('donations.error.invalid_provider', 'donations', 'Invalid provider error', 'Choose a supported payment method.', 'text', true, true, '{}', false),
  ('donations.error.invalid_email', 'donations', 'Invalid email error', 'Enter a valid email address.', 'text', true, true, '{}', false),
  ('donations.stats.supporters', 'donations', 'Supporter count label', '{count} supporters', 'text', true, true, '{count}', false),
  ('donations.empty.not_enabled', 'donations', 'Donations not enabled empty state', 'Financial support is not open for this story yet.', 'text', true, true, '{}', false),
  ('admin.donations.title', 'admin', 'Admin donations section title', 'Donations', 'text', true, true, '{}', false),
  ('admin.donations.description', 'admin', 'Admin donations section description', 'Review post-attributed supporter donations, statuses and moderation.', 'text', true, true, '{}', false),
  ('admin.donation_events.title', 'admin', 'Admin donation events section title', 'Donation Events', 'text', true, true, '{}', false),
  ('admin.donation_events.description', 'admin', 'Admin donation events section description', 'Read-only audit trail for donation lifecycle and provider events.', 'text', true, true, '{}', false)
on conflict (translation_key) do update set
  default_text = excluded.default_text,
  description = excluded.description,
  is_active = true,
  interpolation_variables = excluded.interpolation_variables,
  updated_at = now();

with catalog(translation_key, language_code, translated_text) as (
  values
    ('donations.cta.support_this_story','en','Support this story'),('donations.cta.support_this_story','nl','Steun dit verhaal'),('donations.cta.support_this_story','fr','Soutenir cette histoire'),('donations.cta.support_this_story','de','Diese Geschichte unterstützen'),('donations.cta.support_this_story','es','Apoyar esta historia'),('donations.cta.support_this_story','pt','Apoiar esta história'),('donations.cta.support_this_story','it','Sostieni questa storia'),('donations.cta.support_this_story','pl','Wesprzyj tę historię'),('donations.cta.support_this_story','cs','Podpořte tento příběh'),('donations.cta.support_this_story','tr','Bu hikayeyi destekle'),('donations.cta.support_this_story','ar','ادعم هذه القصة'),('donations.cta.support_this_story','hi','इस कहानी का समर्थन करें'),('donations.cta.support_this_story','zh','支持这个故事'),('donations.cta.support_this_story','ja','このストーリーを支援する'),('donations.cta.support_this_story','ko','이 이야기 후원하기'),
    ('donations.cta.choose_amount','en','Choose an amount'),('donations.cta.choose_amount','nl','Kies een bedrag'),('donations.cta.choose_amount','fr','Choisissez un montant'),('donations.cta.choose_amount','de','Betrag wählen'),('donations.cta.choose_amount','es','Elige un importe'),('donations.cta.choose_amount','pt','Escolha um valor'),('donations.cta.choose_amount','it','Scegli un importo'),('donations.cta.choose_amount','pl','Wybierz kwotę'),('donations.cta.choose_amount','cs','Vyberte částku'),('donations.cta.choose_amount','tr','Bir tutar seçin'),('donations.cta.choose_amount','ar','اختر مبلغًا'),('donations.cta.choose_amount','hi','राशि चुनें'),('donations.cta.choose_amount','zh','选择金额'),('donations.cta.choose_amount','ja','金額を選択'),('donations.cta.choose_amount','ko','금액 선택'),
    ('donations.cta.custom_amount','en','Other amount'),('donations.cta.custom_amount','nl','Ander bedrag'),('donations.cta.custom_amount','fr','Autre montant'),('donations.cta.custom_amount','de','Anderer Betrag'),('donations.cta.custom_amount','es','Otro importe'),('donations.cta.custom_amount','pt','Outro valor'),('donations.cta.custom_amount','it','Altro importo'),('donations.cta.custom_amount','pl','Inna kwota'),('donations.cta.custom_amount','cs','Jiná částka'),('donations.cta.custom_amount','tr','Başka tutar'),('donations.cta.custom_amount','ar','مبلغ آخر'),('donations.cta.custom_amount','hi','अन्य राशि'),('donations.cta.custom_amount','zh','其他金额'),('donations.cta.custom_amount','ja','その他の金額'),('donations.cta.custom_amount','ko','다른 금액'),
    ('donations.form.email_label','en','Email address'),('donations.form.email_label','nl','E-mailadres'),('donations.form.email_label','fr','Adresse e-mail'),('donations.form.email_label','de','E-Mail-Adresse'),('donations.form.email_label','es','Correo electrónico'),('donations.form.email_label','pt','Endereço de e-mail'),('donations.form.email_label','it','Indirizzo email'),('donations.form.email_label','pl','Adres e-mail'),('donations.form.email_label','cs','E-mailová adresa'),('donations.form.email_label','tr','E-posta adresi'),('donations.form.email_label','ar','عنوان البريد الإلكتروني'),('donations.form.email_label','hi','ईमेल पता'),('donations.form.email_label','zh','电子邮件地址'),('donations.form.email_label','ja','メールアドレス'),('donations.form.email_label','ko','이메일 주소'),
    ('donations.form.display_name_label','en','Display name (optional)'),('donations.form.display_name_label','nl','Weergavenaam (optioneel)'),('donations.form.display_name_label','fr','Nom affiché (facultatif)'),('donations.form.display_name_label','de','Anzeigename (optional)'),('donations.form.display_name_label','es','Nombre visible (opcional)'),('donations.form.display_name_label','pt','Nome exibido (opcional)'),('donations.form.display_name_label','it','Nome visualizzato (opzionale)'),('donations.form.display_name_label','pl','Nazwa wyświetlana (opcjonalnie)'),('donations.form.display_name_label','cs','Zobrazované jméno (volitelné)'),('donations.form.display_name_label','tr','Görünen ad (isteğe bağlı)'),('donations.form.display_name_label','ar','الاسم المعروض (اختياري)'),('donations.form.display_name_label','hi','प्रदर्शित नाम (वैकल्पिक)'),('donations.form.display_name_label','zh','显示名称（可选）'),('donations.form.display_name_label','ja','表示名（任意）'),('donations.form.display_name_label','ko','표시 이름(선택)'),
    ('donations.form.message_label','en','Leave a message (optional)'),('donations.form.message_label','nl','Laat een bericht achter (optioneel)'),('donations.form.message_label','fr','Laisser un message (facultatif)'),('donations.form.message_label','de','Nachricht hinterlassen (optional)'),('donations.form.message_label','es','Deja un mensaje (opcional)'),('donations.form.message_label','pt','Deixe uma mensagem (opcional)'),('donations.form.message_label','it','Lascia un messaggio (opzionale)'),('donations.form.message_label','pl','Zostaw wiadomość (opcjonalnie)'),('donations.form.message_label','cs','Zanechte zprávu (volitelné)'),('donations.form.message_label','tr','Mesaj bırakın (isteğe bağlı)'),('donations.form.message_label','ar','اترك رسالة (اختياري)'),('donations.form.message_label','hi','संदेश छोड़ें (वैकल्पिक)'),('donations.form.message_label','zh','留言（可选）'),('donations.form.message_label','ja','メッセージを残す（任意）'),('donations.form.message_label','ko','메시지 남기기(선택)'),
    ('donations.form.anonymous_label','en','Keep my support anonymous'),('donations.form.anonymous_label','nl','Houd mijn steun anoniem'),('donations.form.anonymous_label','fr','Garder mon soutien anonyme'),('donations.form.anonymous_label','de','Meine Unterstützung anonym halten'),('donations.form.anonymous_label','es','Mantener mi apoyo anónimo'),('donations.form.anonymous_label','pt','Manter o meu apoio anónimo'),('donations.form.anonymous_label','it','Mantieni il mio supporto anonimo'),('donations.form.anonymous_label','pl','Zachowaj anonimowość wsparcia'),('donations.form.anonymous_label','cs','Ponechat mou podporu anonymní'),('donations.form.anonymous_label','tr','Desteğimi anonim tut'),('donations.form.anonymous_label','ar','إبقاء دعمي مجهولاً'),('donations.form.anonymous_label','hi','मेरा समर्थन गुमनाम रखें'),('donations.form.anonymous_label','zh','保持匿名支持'),('donations.form.anonymous_label','ja','支援を匿名のままにする'),('donations.form.anonymous_label','ko','후원을 익명으로 유지'),
    ('donations.form.public_thanks_consent','en','You may show my name and message with this story'),('donations.form.public_thanks_consent','nl','Je mag mijn naam en bericht bij dit verhaal tonen'),('donations.form.public_thanks_consent','fr','Vous pouvez afficher mon nom et mon message avec cette histoire'),('donations.form.public_thanks_consent','de','Name und Nachricht dürfen mit dieser Geschichte gezeigt werden'),('donations.form.public_thanks_consent','es','Puedes mostrar mi nombre y mensaje con esta historia'),('donations.form.public_thanks_consent','pt','Pode mostrar o meu nome e mensagem com esta história'),('donations.form.public_thanks_consent','it','Puoi mostrare il mio nome e messaggio con questa storia'),('donations.form.public_thanks_consent','pl','Możesz pokazać moje imię i wiadomość przy tej historii'),('donations.form.public_thanks_consent','cs','Můžete zobrazit mé jméno a zprávu u tohoto příběhu'),('donations.form.public_thanks_consent','tr','Adımı ve mesajımı bu hikayeyle gösterebilirsiniz'),('donations.form.public_thanks_consent','ar','يمكنك عرض اسمي ورسالتي مع هذه القصة'),('donations.form.public_thanks_consent','hi','आप मेरा नाम और संदेश इस कहानी के साथ दिखा सकते हैं'),('donations.form.public_thanks_consent','zh','可以在此故事旁显示我的姓名和留言'),('donations.form.public_thanks_consent','ja','このストーリーと一緒に名前とメッセージを表示してよい'),('donations.form.public_thanks_consent','ko','이 이야기와 함께 내 이름과 메시지를 표시해도 됩니다'),
    ('donations.error.disabled','en','Donations are not available right now.'),('donations.error.disabled','nl','Donaties zijn momenteel niet beschikbaar.'),('donations.error.disabled','fr','Les dons ne sont pas disponibles pour le moment.'),('donations.error.disabled','de','Spenden sind derzeit nicht verfügbar.'),('donations.error.disabled','es','Las donaciones no están disponibles ahora.'),('donations.error.disabled','pt','As doações não estão disponíveis neste momento.'),('donations.error.disabled','it','Le donazioni non sono disponibili al momento.'),('donations.error.disabled','pl','Darowizny są obecnie niedostępne.'),('donations.error.disabled','cs','Dary nejsou momentálně k dispozici.'),('donations.error.disabled','tr','Bağışlar şu anda kullanılamıyor.'),('donations.error.disabled','ar','التبرعات غير متاحة حالياً.'),('donations.error.disabled','hi','दान अभी उपलब्ध नहीं हैं।'),('donations.error.disabled','zh','捐赠目前不可用。'),('donations.error.disabled','ja','現在、寄付は利用できません。'),('donations.error.disabled','ko','현재 기부를 이용할 수 없습니다.'),
    ('donations.error.invalid_amount','en','Choose an amount within the allowed range.'),('donations.error.invalid_amount','nl','Kies een bedrag binnen het toegestane bereik.'),('donations.error.invalid_amount','fr','Choisissez un montant dans la plage autorisée.'),('donations.error.invalid_amount','de','Wählen Sie einen Betrag innerhalb des erlaubten Bereichs.'),('donations.error.invalid_amount','es','Elige un importe dentro del rango permitido.'),('donations.error.invalid_amount','pt','Escolha um valor dentro do intervalo permitido.'),('donations.error.invalid_amount','it','Scegli un importo entro l’intervallo consentito.'),('donations.error.invalid_amount','pl','Wybierz kwotę w dozwolonym zakresie.'),('donations.error.invalid_amount','cs','Vyberte částku v povoleném rozsahu.'),('donations.error.invalid_amount','tr','İzin verilen aralıkta bir tutar seçin.'),('donations.error.invalid_amount','ar','اختر مبلغًا ضمن النطاق المسموح.'),('donations.error.invalid_amount','hi','अनुमत सीमा के भीतर राशि चुनें।'),('donations.error.invalid_amount','zh','请选择允许范围内的金额。'),('donations.error.invalid_amount','ja','許可された範囲の金額を選択してください。'),('donations.error.invalid_amount','ko','허용된 범위의 금액을 선택하세요.'),
    ('donations.error.invalid_post','en','This story cannot receive donations.'),('donations.error.invalid_post','nl','Dit verhaal kan geen donaties ontvangen.'),('donations.error.invalid_post','fr','Cette histoire ne peut pas recevoir de dons.'),('donations.error.invalid_post','de','Diese Geschichte kann keine Spenden erhalten.'),('donations.error.invalid_post','es','Esta historia no puede recibir donaciones.'),('donations.error.invalid_post','pt','Esta história não pode receber doações.'),('donations.error.invalid_post','it','Questa storia non può ricevere donazioni.'),('donations.error.invalid_post','pl','Ta historia nie może otrzymywać darowizn.'),('donations.error.invalid_post','cs','Tento příběh nemůže přijímat dary.'),('donations.error.invalid_post','tr','Bu hikaye bağış alamaz.'),('donations.error.invalid_post','ar','لا يمكن لهذه القصة استقبال تبرعات.'),('donations.error.invalid_post','hi','यह कहानी दान स्वीकार नहीं कर सकती।'),('donations.error.invalid_post','zh','此故事无法接受捐赠。'),('donations.error.invalid_post','ja','このストーリーは寄付を受け付けられません。'),('donations.error.invalid_post','ko','이 이야기는 기부를 받을 수 없습니다.'),
    ('donations.error.invalid_provider','en','Choose a supported payment method.'),('donations.error.invalid_provider','nl','Kies een ondersteunde betaalmethode.'),('donations.error.invalid_provider','fr','Choisissez un mode de paiement pris en charge.'),('donations.error.invalid_provider','de','Wählen Sie eine unterstützte Zahlungsmethode.'),('donations.error.invalid_provider','es','Elige un método de pago compatible.'),('donations.error.invalid_provider','pt','Escolha um método de pagamento suportado.'),('donations.error.invalid_provider','it','Scegli un metodo di pagamento supportato.'),('donations.error.invalid_provider','pl','Wybierz obsługiwaną metodę płatności.'),('donations.error.invalid_provider','cs','Vyberte podporovaný způsob platby.'),('donations.error.invalid_provider','tr','Desteklenen bir ödeme yöntemi seçin.'),('donations.error.invalid_provider','ar','اختر طريقة دفع مدعومة.'),('donations.error.invalid_provider','hi','कोई समर्थित भुगतान विधि चुनें।'),('donations.error.invalid_provider','zh','请选择支持的支付方式。'),('donations.error.invalid_provider','ja','サポートされている支払い方法を選択してください。'),('donations.error.invalid_provider','ko','지원되는 결제 수단을 선택하세요.'),
    ('donations.error.invalid_email','en','Enter a valid email address.'),('donations.error.invalid_email','nl','Voer een geldig e-mailadres in.'),('donations.error.invalid_email','fr','Saisissez une adresse e-mail valide.'),('donations.error.invalid_email','de','Geben Sie eine gültige E-Mail-Adresse ein.'),('donations.error.invalid_email','es','Introduce un correo electrónico válido.'),('donations.error.invalid_email','pt','Introduza um e-mail válido.'),('donations.error.invalid_email','it','Inserisci un indirizzo email valido.'),('donations.error.invalid_email','pl','Wprowadź prawidłowy adres e-mail.'),('donations.error.invalid_email','cs','Zadejte platnou e-mailovou adresu.'),('donations.error.invalid_email','tr','Geçerli bir e-posta adresi girin.'),('donations.error.invalid_email','ar','أدخل عنوان بريد إلكتروني صالحًا.'),('donations.error.invalid_email','hi','मान्य ईमेल पता दर्ज करें।'),('donations.error.invalid_email','zh','请输入有效的电子邮件地址。'),('donations.error.invalid_email','ja','有効なメールアドレスを入力してください。'),('donations.error.invalid_email','ko','유효한 이메일 주소를 입력하세요.'),
    ('donations.stats.supporters','en','{count} supporters'),('donations.stats.supporters','nl','{count} supporters'),('donations.stats.supporters','fr','{count} supporters'),('donations.stats.supporters','de','{count} Unterstützer'),('donations.stats.supporters','es','{count} supporters'),('donations.stats.supporters','pt','{count} apoiantes'),('donations.stats.supporters','it','{count} sostenitori'),('donations.stats.supporters','pl','{count} wspierających'),('donations.stats.supporters','cs','{count} podporovatelů'),('donations.stats.supporters','tr','{count} destekçi'),('donations.stats.supporters','ar','{count} داعم'),('donations.stats.supporters','hi','{count} समर्थक'),('donations.stats.supporters','zh','{count} 位支持者'),('donations.stats.supporters','ja','{count} 人の支援者'),('donations.stats.supporters','ko','후원자 {count}명'),
    ('donations.empty.not_enabled','en','Financial support is not open for this story yet.'),('donations.empty.not_enabled','nl','Financiële steun is voor dit verhaal nog niet open.'),('donations.empty.not_enabled','fr','Le soutien financier n’est pas encore ouvert pour cette histoire.'),('donations.empty.not_enabled','de','Finanzielle Unterstützung ist für diese Geschichte noch nicht geöffnet.'),('donations.empty.not_enabled','es','El apoyo financiero aún no está abierto para esta historia.'),('donations.empty.not_enabled','pt','O apoio financeiro ainda não está aberto para esta história.'),('donations.empty.not_enabled','it','Il supporto finanziario non è ancora aperto per questa storia.'),('donations.empty.not_enabled','pl','Wsparcie finansowe nie jest jeszcze otwarte dla tej historii.'),('donations.empty.not_enabled','cs','Finanční podpora pro tento příběh zatím není otevřená.'),('donations.empty.not_enabled','tr','Bu hikaye için mali destek henüz açık değil.'),('donations.empty.not_enabled','ar','الدعم المالي غير مفتوح لهذه القصة بعد.'),('donations.empty.not_enabled','hi','इस कहानी के लिए वित्तीय सहायता अभी खुली नहीं है।'),('donations.empty.not_enabled','zh','此故事的财务支持尚未开放。'),('donations.empty.not_enabled','ja','このストーリーではまだ資金支援を受け付けていません。'),('donations.empty.not_enabled','ko','이 이야기는 아직 재정 지원을 받지 않습니다.'),
    ('donations.provider.stripe','en','Card payment'),('donations.provider.stripe','nl','Kaartbetaling'),('donations.provider.stripe','fr','Paiement par carte'),('donations.provider.stripe','de','Kartenzahlung'),('donations.provider.stripe','es','Pago con tarjeta'),('donations.provider.stripe','pt','Pagamento com cartão'),('donations.provider.stripe','it','Pagamento con carta'),('donations.provider.stripe','pl','Płatność kartą'),('donations.provider.stripe','cs','Platba kartou'),('donations.provider.stripe','tr','Kart ödemesi'),('donations.provider.stripe','ar','الدفع بالبطاقة'),('donations.provider.stripe','hi','कार्ड भुगतान'),('donations.provider.stripe','zh','银行卡支付'),('donations.provider.stripe','ja','カード決済'),('donations.provider.stripe','ko','카드 결제'),
    ('donations.provider.paypal','en','PayPal'),('donations.provider.paypal','nl','PayPal'),('donations.provider.paypal','fr','PayPal'),('donations.provider.paypal','de','PayPal'),('donations.provider.paypal','es','PayPal'),('donations.provider.paypal','pt','PayPal'),('donations.provider.paypal','it','PayPal'),('donations.provider.paypal','pl','PayPal'),('donations.provider.paypal','cs','PayPal'),('donations.provider.paypal','tr','PayPal'),('donations.provider.paypal','ar','PayPal'),('donations.provider.paypal','hi','PayPal'),('donations.provider.paypal','zh','PayPal'),('donations.provider.paypal','ja','PayPal'),('donations.provider.paypal','ko','PayPal'),
    ('donations.provider.wise','en','Wise transfer'),('donations.provider.wise','nl','Wise-overboeking'),('donations.provider.wise','fr','Virement Wise'),('donations.provider.wise','de','Wise-Überweisung'),('donations.provider.wise','es','Transferencia Wise'),('donations.provider.wise','pt','Transferência Wise'),('donations.provider.wise','it','Bonifico Wise'),('donations.provider.wise','pl','Przelew Wise'),('donations.provider.wise','cs','Převod Wise'),('donations.provider.wise','tr','Wise transferi'),('donations.provider.wise','ar','تحويل Wise'),('donations.provider.wise','hi','Wise ट्रांसफर'),('donations.provider.wise','zh','Wise 转账'),('donations.provider.wise','ja','Wise送金'),('donations.provider.wise','ko','Wise 이체'),
    ('donations.provider.manual','en','Manual transfer'),('donations.provider.manual','nl','Handmatige overboeking'),('donations.provider.manual','fr','Virement manuel'),('donations.provider.manual','de','Manuelle Überweisung'),('donations.provider.manual','es','Transferencia manual'),('donations.provider.manual','pt','Transferência manual'),('donations.provider.manual','it','Bonifico manuale'),('donations.provider.manual','pl','Przelew ręczny'),('donations.provider.manual','cs','Ruční převod'),('donations.provider.manual','tr','Manuel transfer'),('donations.provider.manual','ar','تحويل يدوي'),('donations.provider.manual','hi','मैन्युअल ट्रांसफर'),('donations.provider.manual','zh','手动转账'),('donations.provider.manual','ja','手動送金'),('donations.provider.manual','ko','수동 이체'),
    ('donations.status.initiated','en','Started'),('donations.status.initiated','nl','Gestart'),('donations.status.initiated','fr','Démarré'),('donations.status.initiated','de','Gestartet'),('donations.status.initiated','es','Iniciado'),('donations.status.initiated','pt','Iniciado'),('donations.status.initiated','it','Avviato'),('donations.status.initiated','pl','Rozpoczęto'),('donations.status.initiated','cs','Zahájeno'),('donations.status.initiated','tr','Başlatıldı'),('donations.status.initiated','ar','بدأ'),('donations.status.initiated','hi','शुरू'),('donations.status.initiated','zh','已开始'),('donations.status.initiated','ja','開始済み'),('donations.status.initiated','ko','시작됨'),
    ('donations.status.pending','en','Pending'),('donations.status.pending','nl','In behandeling'),('donations.status.pending','fr','En attente'),('donations.status.pending','de','Ausstehend'),('donations.status.pending','es','Pendiente'),('donations.status.pending','pt','Pendente'),('donations.status.pending','it','In sospeso'),('donations.status.pending','pl','Oczekujące'),('donations.status.pending','cs','Čeká'),('donations.status.pending','tr','Beklemede'),('donations.status.pending','ar','قيد الانتظار'),('donations.status.pending','hi','लंबित'),('donations.status.pending','zh','待处理'),('donations.status.pending','ja','保留中'),('donations.status.pending','ko','대기 중'),
    ('donations.status.awaiting_transfer','en','Awaiting transfer'),('donations.status.awaiting_transfer','nl','Wacht op overboeking'),('donations.status.awaiting_transfer','fr','En attente de virement'),('donations.status.awaiting_transfer','de','Überweisung ausstehend'),('donations.status.awaiting_transfer','es','Esperando transferencia'),('donations.status.awaiting_transfer','pt','A aguardar transferência'),('donations.status.awaiting_transfer','it','In attesa di bonifico'),('donations.status.awaiting_transfer','pl','Oczekiwanie na przelew'),('donations.status.awaiting_transfer','cs','Čeká na převod'),('donations.status.awaiting_transfer','tr','Transfer bekleniyor'),('donations.status.awaiting_transfer','ar','في انتظار التحويل'),('donations.status.awaiting_transfer','hi','ट्रांसफर की प्रतीक्षा'),('donations.status.awaiting_transfer','zh','等待转账'),('donations.status.awaiting_transfer','ja','送金待ち'),('donations.status.awaiting_transfer','ko','이체 대기 중'),
    ('donations.status.succeeded','en','Completed'),('donations.status.succeeded','nl','Voltooid'),('donations.status.succeeded','fr','Terminé'),('donations.status.succeeded','de','Abgeschlossen'),('donations.status.succeeded','es','Completado'),('donations.status.succeeded','pt','Concluído'),('donations.status.succeeded','it','Completato'),('donations.status.succeeded','pl','Zakończone'),('donations.status.succeeded','cs','Dokončeno'),('donations.status.succeeded','tr','Tamamlandı'),('donations.status.succeeded','ar','مكتمل'),('donations.status.succeeded','hi','पूर्ण'),('donations.status.succeeded','zh','已完成'),('donations.status.succeeded','ja','完了'),('donations.status.succeeded','ko','완료'),
    ('donations.status.failed','en','Failed'),('donations.status.failed','nl','Mislukt'),('donations.status.failed','fr','Échoué'),('donations.status.failed','de','Fehlgeschlagen'),('donations.status.failed','es','Fallido'),('donations.status.failed','pt','Falhou'),('donations.status.failed','it','Non riuscito'),('donations.status.failed','pl','Niepowodzenie'),('donations.status.failed','cs','Selhalo'),('donations.status.failed','tr','Başarısız'),('donations.status.failed','ar','فشل'),('donations.status.failed','hi','विफल'),('donations.status.failed','zh','失败'),('donations.status.failed','ja','失敗'),('donations.status.failed','ko','실패'),
    ('donations.status.cancelled','en','Cancelled'),('donations.status.cancelled','nl','Geannuleerd'),('donations.status.cancelled','fr','Annulé'),('donations.status.cancelled','de','Storniert'),('donations.status.cancelled','es','Cancelado'),('donations.status.cancelled','pt','Cancelado'),('donations.status.cancelled','it','Annullato'),('donations.status.cancelled','pl','Anulowano'),('donations.status.cancelled','cs','Zrušeno'),('donations.status.cancelled','tr','İptal edildi'),('donations.status.cancelled','ar','ملغى'),('donations.status.cancelled','hi','रद्द'),('donations.status.cancelled','zh','已取消'),('donations.status.cancelled','ja','キャンセル'),('donations.status.cancelled','ko','취소됨'),
    ('donations.status.refunded','en','Refunded'),('donations.status.refunded','nl','Terugbetaald'),('donations.status.refunded','fr','Remboursé'),('donations.status.refunded','de','Erstattet'),('donations.status.refunded','es','Reembolsado'),('donations.status.refunded','pt','Reembolsado'),('donations.status.refunded','it','Rimborsato'),('donations.status.refunded','pl','Zwrócono'),('donations.status.refunded','cs','Vráceno'),('donations.status.refunded','tr','İade edildi'),('donations.status.refunded','ar','مسترد'),('donations.status.refunded','hi','रिफंड'),('donations.status.refunded','zh','已退款'),('donations.status.refunded','ja','返金済み'),('donations.status.refunded','ko','환불됨'),
    ('admin.donations.title','en','Donations'),('admin.donations.title','nl','Donaties'),('admin.donations.title','fr','Dons'),('admin.donations.title','de','Spenden'),('admin.donations.title','es','Donaciones'),('admin.donations.title','pt','Doações'),('admin.donations.title','it','Donazioni'),('admin.donations.title','pl','Darowizny'),('admin.donations.title','cs','Dary'),('admin.donations.title','tr','Bağışlar'),('admin.donations.title','ar','التبرعات'),('admin.donations.title','hi','दान'),('admin.donations.title','zh','捐赠'),('admin.donations.title','ja','寄付'),('admin.donations.title','ko','기부'),
    ('admin.donations.description','en','Review post-attributed supporter donations, statuses and moderation.'),('admin.donations.description','nl','Bekijk aan verhalen gekoppelde donaties, statussen en moderatie.'),('admin.donations.description','fr','Examiner les dons liés aux articles, statuts et modération.'),('admin.donations.description','de','Spenden mit Beitragszuordnung, Status und Moderation prüfen.'),('admin.donations.description','es','Revisar donaciones atribuidas a publicaciones, estados y moderación.'),('admin.donations.description','pt','Rever doações atribuídas a publicações, estados e moderação.'),('admin.donations.description','it','Rivedi donazioni attribuite ai post, stati e moderazione.'),('admin.donations.description','pl','Przeglądaj darowizny przypisane do wpisów, statusy i moderację.'),('admin.donations.description','cs','Kontrola darů přiřazených k příspěvkům, stavů a moderace.'),('admin.donations.description','tr','Gönderilere atfedilen bağışları, durumları ve moderasyonu inceleyin.'),('admin.donations.description','ar','مراجعة التبرعات المنسوبة للمنشورات والحالات والإشراف.'),('admin.donations.description','hi','पोस्ट से जुड़े समर्थन दान, स्थिति और मॉडरेशन की समीक्षा करें।'),('admin.donations.description','zh','查看与文章关联的支持者捐赠、状态和审核。'),('admin.donations.description','ja','投稿に紐づく寄付、ステータス、モデレーションを確認します。'),('admin.donations.description','ko','게시물에 연결된 후원 기부, 상태 및 검토를 확인합니다.'),
    ('admin.donation_events.title','en','Donation Events'),('admin.donation_events.title','nl','Donatiegebeurtenissen'),('admin.donation_events.title','fr','Événements de don'),('admin.donation_events.title','de','Spendenvorgänge'),('admin.donation_events.title','es','Eventos de donación'),('admin.donation_events.title','pt','Eventos de doação'),('admin.donation_events.title','it','Eventi donazione'),('admin.donation_events.title','pl','Zdarzenia darowizn'),('admin.donation_events.title','cs','Události darů'),('admin.donation_events.title','tr','Bağış olayları'),('admin.donation_events.title','ar','أحداث التبرع'),('admin.donation_events.title','hi','दान घटनाएँ'),('admin.donation_events.title','zh','捐赠事件'),('admin.donation_events.title','ja','寄付イベント'),('admin.donation_events.title','ko','기부 이벤트'),
    ('admin.donation_events.description','en','Read-only audit trail for donation lifecycle and provider events.'),('admin.donation_events.description','nl','Alleen-lezen audittrail voor donatielevenscyclus en providergebeurtenissen.'),('admin.donation_events.description','fr','Piste d’audit en lecture seule pour le cycle de vie des dons et les événements fournisseurs.'),('admin.donation_events.description','de','Schreibgeschütztes Audit-Protokoll für Spenden-Lebenszyklus und Anbieterereignisse.'),('admin.donation_events.description','es','Registro de auditoría de solo lectura del ciclo de vida de donaciones y eventos del proveedor.'),('admin.donation_events.description','pt','Trilho de auditoria só de leitura do ciclo de vida das doações e eventos do fornecedor.'),('admin.donation_events.description','it','Audit trail in sola lettura per ciclo di vita donazioni ed eventi provider.'),('admin.donation_events.description','pl','Ścieżka audytu tylko do odczytu dla cyklu życia darowizn i zdarzeń dostawcy.'),('admin.donation_events.description','cs','Auditní stopa pouze pro čtení životního cyklu darů a událostí poskytovatele.'),('admin.donation_events.description','tr','Bağış yaşam döngüsü ve sağlayıcı olayları için salt okunur denetim izi.'),('admin.donation_events.description','ar','سجل تدقيق للقراءة فقط لدورة حياة التبرع وأحداث المزود.'),('admin.donation_events.description','hi','दान जीवनचक्र और प्रदाता घटनाओं के लिए केवल-पढ़ने योग्य ऑडिट ट्रेल।'),('admin.donation_events.description','zh','捐赠生命周期和提供商事件的只读审计跟踪。'),('admin.donation_events.description','ja','寄付のライフサイクルとプロバイダーイベントの読み取り専用監査ログ。'),('admin.donation_events.description','ko','기부 수명 주기 및 제공자 이벤트에 대한 읽기 전용 감사 추적입니다.')
), resolved as (
  select k.id as translation_key_id, c.language_code, c.translated_text
  from catalog c
  join public.website_translation_keys k on k.translation_key = c.translation_key
)
insert into public.website_translations
  (translation_key_id, language_code, translated_text, translation_status, translation_source, translated_at, reviewed_at, published_at)
select translation_key_id, language_code, translated_text, 'published', 'manual', now(), now(), now()
from resolved
on conflict (translation_key_id, language_code) do update set
  translated_text = excluded.translated_text,
  translation_status = 'published',
  translation_source = 'manual',
  translated_at = now(),
  reviewed_at = now(),
  published_at = now(),
  updated_at = now();

insert into public.website_translation_key_usage (translation_key_id, source_path, source_identifier, migration_status, notes)
select k.id, 'supabase/migrations/20260715130000_journal_post_donations.sql', k.translation_key, 'seeded', 'Journal post donations database foundation'
from public.website_translation_keys k
where k.translation_key like 'donations.%' or k.translation_key like 'admin.donation%'
on conflict (translation_key_id, source_path, source_identifier) do update set
  migration_status = excluded.migration_status,
  notes = excluded.notes,
  updated_at = now();

commit;
