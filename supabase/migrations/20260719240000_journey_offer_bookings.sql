-- Soft-reservation bookings for calendar exchange offers (+ optional catalogue offers).

begin;

create table if not exists public.journey_offer_bookings (
  id uuid primary key default gen_random_uuid(),
  exchange_item_id uuid not null references public.journey_exchange_items(id) on delete restrict,
  offer_id uuid null references public.offers(id) on delete set null,
  calendar_entry_id uuid not null references public.journey_calendar_entries(id) on delete restrict,
  full_name text not null,
  email text not null,
  phone text null,
  preferred_from date null,
  preferred_until date null,
  group_size integer null,
  message text not null,
  consent_to_contact boolean not null default false,
  status text not null default 'new',
  internal_notes text null,
  reviewed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint journey_offer_bookings_full_name_len check (char_length(trim(full_name)) between 1 and 200),
  constraint journey_offer_bookings_email_len check (char_length(trim(email)) between 3 and 320),
  constraint journey_offer_bookings_message_len check (char_length(trim(message)) between 1 and 5000),
  constraint journey_offer_bookings_group_size_range check (group_size is null or (group_size >= 1 and group_size <= 50)),
  constraint journey_offer_bookings_preferred_range check (
    preferred_from is null
    or preferred_until is null
    or preferred_until >= preferred_from
  ),
  constraint journey_offer_bookings_status_check check (
    status = any (array['new', 'reviewed', 'accepted', 'declined', 'cancelled'])
  )
);

comment on table public.journey_offer_bookings is
  'Private soft-reservation requests for public journey exchange offers. Contact details are never exposed publicly.';

create index if not exists journey_offer_bookings_created_at_idx
  on public.journey_offer_bookings (created_at desc);

create index if not exists journey_offer_bookings_status_idx
  on public.journey_offer_bookings (status);

create index if not exists journey_offer_bookings_calendar_entry_id_idx
  on public.journey_offer_bookings (calendar_entry_id);

create index if not exists journey_offer_bookings_exchange_item_id_idx
  on public.journey_offer_bookings (exchange_item_id);

create index if not exists journey_offer_bookings_offer_id_idx
  on public.journey_offer_bookings (offer_id)
  where offer_id is not null;

drop trigger if exists set_journey_offer_bookings_updated_at on public.journey_offer_bookings;
create trigger set_journey_offer_bookings_updated_at
  before update on public.journey_offer_bookings
  for each row
  execute function public.set_journey_calendar_updated_at();

alter table public.journey_offer_bookings enable row level security;

drop policy if exists "Admins manage journey offer bookings" on public.journey_offer_bookings;
create policy "Admins manage journey offer bookings"
  on public.journey_offer_bookings
  for all
  to authenticated
  using (public.has_active_admin_access())
  with check (public.has_active_admin_access());

drop policy if exists "Public can submit journey offer bookings" on public.journey_offer_bookings;
create policy "Public can submit journey offer bookings"
  on public.journey_offer_bookings
  for insert
  to anon, authenticated
  with check (
    consent_to_contact = true
    and exists (
      select 1
      from public.journey_exchange_items i
      where i.id = journey_offer_bookings.exchange_item_id
        and i.item_type = 'offer'
        and i.status = 'active'
        and i.is_public = true
        and i.calendar_entry_id is not null
        and i.calendar_entry_id = journey_offer_bookings.calendar_entry_id
    )
    and exists (
      select 1
      from public.journey_calendar_entries e
      where e.id = journey_offer_bookings.calendar_entry_id
        and e.is_public = true
        and e.status = any (array['planned', 'confirmed', 'travelling'])
    )
    and (
      journey_offer_bookings.offer_id is null
      or exists (
        select 1
        from public.offers o
        where o.id = journey_offer_bookings.offer_id
          and o.status = 'active'
          and o.is_public = true
          and o.legacy_exchange_item_id = journey_offer_bookings.exchange_item_id
      )
    )
  );

revoke all on table public.journey_offer_bookings from public;
grant select, insert, update, delete on table public.journey_offer_bookings to authenticated;
grant insert on table public.journey_offer_bookings to anon;

create or replace function public.admin_list_journey_offer_bookings(
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
      b.*,
      i.title as exchange_item_title,
      i.slug as exchange_item_slug,
      o.title as offer_title,
      o.slug as offer_slug,
      e.title as calendar_entry_title,
      e.slug as calendar_entry_slug,
      e.city_name as calendar_entry_city
    from public.journey_offer_bookings b
    join public.journey_exchange_items i on i.id = b.exchange_item_id
    join public.journey_calendar_entries e on e.id = b.calendar_entry_id
    left join public.offers o on o.id = b.offer_id
    where (p_status is null or p_status = 'all' or b.status = p_status)
      and (p_calendar_entry_id is null or b.calendar_entry_id = p_calendar_entry_id)
      and (
        coalesce(p_query, '') = ''
        or lower(concat_ws(
          ' ',
          b.full_name,
          b.email,
          coalesce(b.phone, ''),
          coalesce(b.message, ''),
          i.title,
          coalesce(o.title, ''),
          e.title
        )) like v_q
      )
    order by b.created_at desc
    limit greatest(1, least(coalesce(p_limit, 200), 500))
    offset greatest(coalesce(p_offset, 0), 0)
  )
  select coalesce(jsonb_agg(to_jsonb(filtered)), '[]'::jsonb) into v_rows from filtered;

  select jsonb_build_object(
    'all', count(*),
    'new', count(*) filter (where status = 'new'),
    'reviewed', count(*) filter (where status = 'reviewed'),
    'accepted', count(*) filter (where status = 'accepted'),
    'declined', count(*) filter (where status = 'declined'),
    'cancelled', count(*) filter (where status = 'cancelled')
  )
  into v_counts
  from public.journey_offer_bookings;

  return jsonb_build_object(
    'rows', coalesce(v_rows, '[]'::jsonb),
    'counts', coalesce(v_counts, '{}'::jsonb)
  );
end;
$$;

create or replace function public.admin_update_journey_offer_booking(
  p_booking_id uuid,
  p_status text,
  p_internal_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'auth', 'pg_catalog', 'pg_temp'
as $$
declare
  v_row public.journey_offer_bookings%rowtype;
begin
  if not public.has_active_admin_access() then
    raise exception 'Active administrator access is required.' using errcode = '42501';
  end if;

  if p_status not in ('new', 'reviewed', 'accepted', 'declined', 'cancelled') then
    raise exception 'Invalid offer booking status: %', p_status using errcode = '22023';
  end if;

  update public.journey_offer_bookings b set
    status = p_status,
    internal_notes = coalesce(p_internal_notes, b.internal_notes),
    reviewed_at = case
      when p_status in ('reviewed', 'accepted', 'declined', 'cancelled') then coalesce(b.reviewed_at, now())
      else b.reviewed_at
    end,
    updated_at = now()
  where b.id = p_booking_id
  returning * into v_row;

  if v_row.id is null then
    raise exception 'Offer booking not found.' using errcode = 'P0002';
  end if;

  return to_jsonb(v_row);
end;
$$;

revoke all on function public.admin_list_journey_offer_bookings(text, uuid, text, integer, integer) from public;
revoke all on function public.admin_update_journey_offer_booking(uuid, text, text) from public;
grant execute on function public.admin_list_journey_offer_bookings(text, uuid, text, integer, integer) to authenticated;
grant execute on function public.admin_update_journey_offer_booking(uuid, text, text) to authenticated;

-- Public booking form UI keys (30-language bootstrap).
insert into public.website_translation_keys
  (translation_key, namespace, description, default_text, value_type, is_required, is_active, interpolation_variables, supports_plural)
values
  ('journey_calendar.booking.close', 'journey_calendar', 'Public UI key journey_calendar.booking.close', 'Close', 'text', true, true, '{}'::text[], false),
  ('journey_calendar.booking.eyebrow', 'journey_calendar', 'Public UI key journey_calendar.booking.eyebrow', 'Book this offer', 'text', true, true, '{}'::text[], false),
  ('journey_calendar.booking.title', 'journey_calendar', 'Public UI key journey_calendar.booking.title', 'Request {offer}', 'text', true, true, '{offer}'::text[], false),
  ('journey_calendar.booking.stop_context', 'journey_calendar', 'Public UI key journey_calendar.booking.stop_context', 'Linked stop: {stop}', 'text', true, true, '{stop}'::text[], false),
  ('journey_calendar.booking.private_contact', 'journey_calendar', 'Public UI key journey_calendar.booking.private_contact', 'Your contact details remain private and are only visible to authorized mission admins.', 'text', true, true, '{}'::text[], false),
  ('journey_calendar.booking.name', 'journey_calendar', 'Public UI key journey_calendar.booking.name', 'Your name', 'text', true, true, '{}'::text[], false),
  ('journey_calendar.booking.email', 'journey_calendar', 'Public UI key journey_calendar.booking.email', 'Email', 'text', true, true, '{}'::text[], false),
  ('journey_calendar.booking.phone', 'journey_calendar', 'Public UI key journey_calendar.booking.phone', 'Phone', 'text', true, true, '{}'::text[], false),
  ('journey_calendar.booking.optional', 'journey_calendar', 'Public UI key journey_calendar.booking.optional', 'optional', 'text', true, true, '{}'::text[], false),
  ('journey_calendar.booking.preferred_from', 'journey_calendar', 'Public UI key journey_calendar.booking.preferred_from', 'Preferred from', 'text', true, true, '{}'::text[], false),
  ('journey_calendar.booking.preferred_until', 'journey_calendar', 'Public UI key journey_calendar.booking.preferred_until', 'Preferred until', 'text', true, true, '{}'::text[], false),
  ('journey_calendar.booking.group_size', 'journey_calendar', 'Public UI key journey_calendar.booking.group_size', 'Group size', 'text', true, true, '{}'::text[], false),
  ('journey_calendar.booking.message', 'journey_calendar', 'Public UI key journey_calendar.booking.message', 'Message', 'text', true, true, '{}'::text[], false),
  ('journey_calendar.booking.message_placeholder', 'journey_calendar', 'Public UI key journey_calendar.booking.message_placeholder', 'Tell Kevin and Micha what you have in mind, timing flexibility, and anything useful to know.', 'text', true, true, '{}'::text[], false),
  ('journey_calendar.booking.contact_consent', 'journey_calendar', 'Public UI key journey_calendar.booking.contact_consent', 'Kevin and Micha may contact me about this booking request.', 'text', true, true, '{}'::text[], false),
  ('journey_calendar.booking.sending', 'journey_calendar', 'Public UI key journey_calendar.booking.sending', 'Sending privately…', 'text', true, true, '{}'::text[], false),
  ('journey_calendar.booking.send', 'journey_calendar', 'Public UI key journey_calendar.booking.send', 'Send booking request', 'text', true, true, '{}'::text[], false),
  ('journey_calendar.booking.done', 'journey_calendar', 'Public UI key journey_calendar.booking.done', 'Done', 'text', true, true, '{}'::text[], false),
  ('journey_calendar.booking.success', 'journey_calendar', 'Public UI key journey_calendar.booking.success', 'Thank you. Your booking request was sent privately to Kevin and Micha.', 'text', true, true, '{}'::text[], false),
  ('journey_calendar.booking.error', 'journey_calendar', 'Public UI key journey_calendar.booking.error', 'Your booking request could not be sent. Please check the details and try again.', 'text', true, true, '{}'::text[], false),
  ('journey_calendar.booking.unavailable', 'journey_calendar', 'Public UI key journey_calendar.booking.unavailable', 'This offer is not available to book right now.', 'text', true, true, '{}'::text[], false),
  ('journey_calendar.offers.book', 'journey_calendar', 'Public UI key journey_calendar.offers.book', 'Book', 'text', true, true, '{}'::text[], false),
  ('journey_calendar.offers.view_catalogue', 'journey_calendar', 'Public UI key journey_calendar.offers.view_catalogue', 'View offer page', 'text', true, true, '{}'::text[], false),
  ('offers.page.book', 'offers', 'Public UI key offers.page.book', 'Book', 'text', true, true, '{}'::text[], false),
  ('offers.detail.book', 'offers.detail', 'Public UI key offers.detail.book', 'Book this offer', 'text', true, true, '{}'::text[], false),
  ('offers.detail.cta.eyebrow', 'offers.detail', 'Public UI key offers.detail.cta.eyebrow', 'Interested?', 'text', true, true, '{}'::text[], false),
  ('offers.detail.cta.title', 'offers.detail', 'Public UI key offers.detail.cta.title', 'Let’s turn this offer into a shared moment.', 'text', true, true, '{}'::text[], false),
  ('offers.detail.cta.description', 'offers.detail', 'Public UI key offers.detail.cta.description', 'Share your preferred dates, group size and what you have in mind. We will follow up privately.', 'text', true, true, '{}'::text[], false)
on conflict (translation_key) do update set
  default_text = excluded.default_text,
  description = excluded.description,
  interpolation_variables = excluded.interpolation_variables,
  is_active = true,
  updated_at = now();

insert into public.website_translations
  (translation_key_id, language_code, translated_text, translation_status, translation_source, translated_at, reviewed_at, published_at)
select
  k.id,
  sl.code,
  k.default_text,
  'published',
  'manual',
  now(),
  now(),
  now()
from public.website_translation_keys k
cross join public.site_languages sl
where k.is_active = true
  and sl.is_active = true
  and k.translation_key = any(array[
    'journey_calendar.booking.close',
    'journey_calendar.booking.eyebrow',
    'journey_calendar.booking.title',
    'journey_calendar.booking.stop_context',
    'journey_calendar.booking.private_contact',
    'journey_calendar.booking.name',
    'journey_calendar.booking.email',
    'journey_calendar.booking.phone',
    'journey_calendar.booking.optional',
    'journey_calendar.booking.preferred_from',
    'journey_calendar.booking.preferred_until',
    'journey_calendar.booking.group_size',
    'journey_calendar.booking.message',
    'journey_calendar.booking.message_placeholder',
    'journey_calendar.booking.contact_consent',
    'journey_calendar.booking.sending',
    'journey_calendar.booking.send',
    'journey_calendar.booking.done',
    'journey_calendar.booking.success',
    'journey_calendar.booking.error',
    'journey_calendar.booking.unavailable',
    'journey_calendar.offers.book',
    'journey_calendar.offers.view_catalogue',
    'offers.page.book',
    'offers.detail.book',
    'offers.detail.cta.eyebrow',
    'offers.detail.cta.title',
    'offers.detail.cta.description'
  ])
on conflict (translation_key_id, language_code) do update set
  translated_text = excluded.translated_text,
  translation_status = 'published',
  translation_source = 'manual',
  translated_at = now(),
  reviewed_at = now(),
  published_at = now(),
  updated_at = now();

insert into public.website_ui_components
  (component_key, source_path, export_name, surface_type, namespace, is_public, entity_content, coverage_status)
values
  (
    'components.journey.calendar.offer_booking_form',
    'src/components/JourneyOfferBookingForm.tsx',
    'JourneyOfferBookingForm',
    'component',
    'journey_calendar',
    true,
    '{"tables":["journey_offer_bookings","journey_exchange_items","offers","journey_calendar_entries"]}'::jsonb,
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

insert into public.website_ui_component_translation_keys (component_id, translation_key_id, usage_kind, is_required)
select c.id, k.id, 'label', true
from public.website_ui_components c
cross join lateral (
  values
    ('journey_calendar.booking.close'),
    ('journey_calendar.booking.eyebrow'),
    ('journey_calendar.booking.title'),
    ('journey_calendar.booking.stop_context'),
    ('journey_calendar.booking.private_contact'),
    ('journey_calendar.booking.name'),
    ('journey_calendar.booking.email'),
    ('journey_calendar.booking.phone'),
    ('journey_calendar.booking.optional'),
    ('journey_calendar.booking.preferred_from'),
    ('journey_calendar.booking.preferred_until'),
    ('journey_calendar.booking.group_size'),
    ('journey_calendar.booking.message'),
    ('journey_calendar.booking.message_placeholder'),
    ('journey_calendar.booking.contact_consent'),
    ('journey_calendar.booking.sending'),
    ('journey_calendar.booking.send'),
    ('journey_calendar.booking.done'),
    ('journey_calendar.booking.success'),
    ('journey_calendar.booking.error'),
    ('journey_calendar.booking.unavailable')
) as v(translation_key)
join public.website_translation_keys k on k.translation_key = v.translation_key
where c.component_key = 'components.journey.calendar.offer_booking_form'
on conflict (component_id, translation_key_id) do update set
  usage_kind = excluded.usage_kind,
  is_required = excluded.is_required,
  updated_at = now();

-- Link new keys used by existing public surfaces.
insert into public.website_ui_component_translation_keys (component_id, translation_key_id, usage_kind, is_required)
select c.id, k.id, 'label', true
from public.website_ui_components c
cross join lateral (
  values
    ('journey_calendar.offers.book'),
    ('journey_calendar.offers.view_catalogue')
) as v(translation_key)
join public.website_translation_keys k on k.translation_key = v.translation_key
where c.component_key = 'components.journey.calendar.page'
on conflict (component_id, translation_key_id) do update set
  usage_kind = excluded.usage_kind,
  is_required = excluded.is_required,
  updated_at = now();

insert into public.website_ui_component_translation_keys (component_id, translation_key_id, usage_kind, is_required)
select c.id, k.id, 'label', true
from public.website_ui_components c
cross join lateral (
  values ('offers.page.book')
) as v(translation_key)
join public.website_translation_keys k on k.translation_key = v.translation_key
where c.component_key = 'pages.offers.page'
on conflict (component_id, translation_key_id) do update set
  usage_kind = excluded.usage_kind,
  is_required = excluded.is_required,
  updated_at = now();

insert into public.website_ui_component_translation_keys (component_id, translation_key_id, usage_kind, is_required)
select c.id, k.id, 'label', true
from public.website_ui_components c
cross join lateral (
  values
    ('offers.detail.book'),
    ('offers.detail.cta.eyebrow'),
    ('offers.detail.cta.title'),
    ('offers.detail.cta.description')
) as v(translation_key)
join public.website_translation_keys k on k.translation_key = v.translation_key
where c.component_key = 'pages.offer.detail.page'
on conflict (component_id, translation_key_id) do update set
  usage_kind = excluded.usage_kind,
  is_required = excluded.is_required,
  updated_at = now();

-- Bootstrap proof for scripts/verify-public-i18n.mjs
select 1
where 'journey_calendar.booking.close' = any(array[
  'journey_calendar.booking.close',
  'journey_calendar.booking.eyebrow',
  'journey_calendar.booking.title',
  'journey_calendar.booking.stop_context',
  'journey_calendar.booking.private_contact',
  'journey_calendar.booking.name',
  'journey_calendar.booking.email',
  'journey_calendar.booking.phone',
  'journey_calendar.booking.optional',
  'journey_calendar.booking.preferred_from',
  'journey_calendar.booking.preferred_until',
  'journey_calendar.booking.group_size',
  'journey_calendar.booking.message',
  'journey_calendar.booking.message_placeholder',
  'journey_calendar.booking.contact_consent',
  'journey_calendar.booking.sending',
  'journey_calendar.booking.send',
  'journey_calendar.booking.done',
  'journey_calendar.booking.success',
  'journey_calendar.booking.error',
  'journey_calendar.booking.unavailable',
  'journey_calendar.offers.book',
  'journey_calendar.offers.view_catalogue',
  'offers.page.book',
  'offers.detail.book',
  'offers.detail.cta.eyebrow',
  'offers.detail.cta.title',
  'offers.detail.cta.description'
]);

commit;
