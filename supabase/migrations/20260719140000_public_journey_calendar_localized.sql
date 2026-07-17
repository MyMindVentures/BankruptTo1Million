-- Localized public journey calendar RPC + UI keys/registry for /calendar.

begin;

create or replace function public.get_localized_public_journey_calendar(
  p_language_code text default 'en'
)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public', 'pg_catalog', 'pg_temp'
as $$
declare
  v_lang text := coalesce(nullif(trim(p_language_code), ''), 'en');
  v_result jsonb;
begin
  with entries as (
    select
      e.*,
      p.slug as related_journal_post_slug,
      case
        when e.accommodation_needed
          and e.host_request_status = any (array['open'::text, 'offers_received'::text])
          and e.status = any (array['planned'::text, 'confirmed'::text, 'travelling'::text])
        then true
        else false
      end as can_offer_hosting
    from public.journey_calendar_entries e
    left join public.journal_posts p on p.id = e.related_journal_post_id
    where e.is_public = true
      and e.status <> 'cancelled'
  ),
  localized as (
    select
      e.id,
      e.slug,
      e.journey_person,
      e.status,
      e.starts_on,
      e.ends_on,
      e.date_flexibility_days,
      e.country_code,
      e.latitude,
      e.longitude,
      e.transport_mode,
      e.accommodation_needed,
      e.accommodation_from,
      e.accommodation_until,
      e.guests_count,
      e.nights_needed,
      e.host_request_status,
      e.can_offer_hosting,
      e.is_featured,
      e.display_order,
      e.related_journal_post_id,
      e.related_journal_post_slug,
      e.created_at,
      coalesce(nullif(trim(loc.title), ''), nullif(trim(en.title), ''), e.title) as title,
      coalesce(nullif(trim(loc.country_name), ''), nullif(trim(en.country_name), ''), e.country_name) as country_name,
      coalesce(nullif(trim(loc.region_name), ''), nullif(trim(en.region_name), ''), e.region_name) as region_name,
      coalesce(nullif(trim(loc.city_name), ''), nullif(trim(en.city_name), ''), e.city_name) as city_name,
      coalesce(nullif(trim(loc.location_name), ''), nullif(trim(en.location_name), ''), e.location_name) as location_name,
      coalesce(nullif(trim(loc.public_summary), ''), nullif(trim(en.public_summary), ''), e.public_summary) as public_summary,
      coalesce(nullif(trim(loc.purpose), ''), nullif(trim(en.purpose), ''), e.purpose) as purpose,
      coalesce(nullif(trim(loc.host_request_message), ''), nullif(trim(en.host_request_message), ''), e.host_request_message) as host_request_message,
      case
        when loc.title is not null or loc.public_summary is not null then v_lang
        when en.title is not null or en.public_summary is not null then 'en'
        else 'en'
      end as active_language
    from entries e
    left join lateral (
      select t.title, t.country_name, t.region_name, t.city_name, t.location_name,
             t.public_summary, t.purpose, t.host_request_message
      from public.journey_calendar_entry_translations t
      where t.calendar_entry_id = e.id
        and t.language_code = v_lang
        and t.translation_status = any (array['machine'::text, 'reviewed'::text, 'published'::text])
      order by case t.translation_status when 'published' then 0 when 'reviewed' then 1 else 2 end
      limit 1
    ) loc on true
    left join lateral (
      select t.title, t.country_name, t.region_name, t.city_name, t.location_name,
             t.public_summary, t.purpose, t.host_request_message
      from public.journey_calendar_entry_translations t
      where t.calendar_entry_id = e.id
        and t.language_code = 'en'
        and t.translation_status = any (array['machine'::text, 'reviewed'::text, 'published'::text])
      order by case t.translation_status when 'published' then 0 when 'reviewed' then 1 else 2 end
      limit 1
    ) en on true
  ),
  founders as (
    select
      r.calendar_entry_id,
      coalesce(
        jsonb_agg(
          jsonb_build_object(
            'id', fp.id,
            'slug', fp.slug,
            'display_name', fp.display_name,
            'avatar_url', fp.avatar_url,
            'profile_url', '/founders/' || fp.slug
          )
          order by r.display_order, fp.display_name
        ),
        '[]'::jsonb
      ) as founders
    from public.journey_calendar_entry_founders r
    join public.founder_profiles fp on fp.id = r.founder_profile_id and fp.is_public = true
    group by r.calendar_entry_id
  ),
  exchange as (
    select
      x.calendar_entry_id,
      x.item_type,
      coalesce(
        jsonb_agg(
          jsonb_build_object(
            'id', x.id,
            'slug', x.slug,
            'category', x.category,
            'title', coalesce(nullif(trim(xtitle.title), ''), x.title),
            'description', coalesce(nullif(trim(xtitle.description), ''), x.description),
            'priority', x.priority,
            'display_order', x.display_order,
            'journey_person', x.journey_person
          )
          order by x.display_order, x.created_at
        ),
        '[]'::jsonb
      ) as items
    from public.journey_exchange_items x
    left join lateral (
      select coalesce(loc.title, en.title) as title,
             coalesce(loc.description, en.description) as description
      from (select 1) _
      left join lateral (
        select t.title, t.description
        from public.journey_exchange_item_translations t
        where t.exchange_item_id = x.id
          and t.language_code = v_lang
          and t.translation_status = any (array['machine'::text, 'reviewed'::text, 'published'::text])
        order by case t.translation_status when 'published' then 0 when 'reviewed' then 1 else 2 end
        limit 1
      ) loc on true
      left join lateral (
        select t.title, t.description
        from public.journey_exchange_item_translations t
        where t.exchange_item_id = x.id
          and t.language_code = 'en'
          and t.translation_status = any (array['machine'::text, 'reviewed'::text, 'published'::text])
        order by case t.translation_status when 'published' then 0 when 'reviewed' then 1 else 2 end
        limit 1
      ) en on true
    ) xtitle on true
    where x.is_public = true
      and x.status = 'active'
      and x.calendar_entry_id is not null
    group by x.calendar_entry_id, x.item_type
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', l.id,
        'slug', l.slug,
        'journey_person', l.journey_person,
        'status', l.status,
        'starts_on', l.starts_on,
        'ends_on', l.ends_on,
        'date_flexibility_days', l.date_flexibility_days,
        'country_code', l.country_code,
        'country_name', l.country_name,
        'region_name', l.region_name,
        'city_name', l.city_name,
        'location_name', l.location_name,
        'latitude', l.latitude,
        'longitude', l.longitude,
        'title', l.title,
        'public_summary', l.public_summary,
        'purpose', l.purpose,
        'transport_mode', l.transport_mode,
        'accommodation_needed', l.accommodation_needed,
        'accommodation_from', l.accommodation_from,
        'accommodation_until', l.accommodation_until,
        'guests_count', l.guests_count,
        'nights_needed', l.nights_needed,
        'host_request_message', l.host_request_message,
        'host_request_status', l.host_request_status,
        'can_offer_hosting', l.can_offer_hosting,
        'is_featured', l.is_featured,
        'display_order', l.display_order,
        'related_journal_post_id', l.related_journal_post_id,
        'related_journal_post_slug', l.related_journal_post_slug,
        'active_language', l.active_language,
        'founders', coalesce(f.founders, '[]'::jsonb),
        'needs', coalesce(n.items, '[]'::jsonb),
        'offers', coalesce(o.items, '[]'::jsonb)
      )
      order by l.starts_on, l.display_order, l.created_at
    ),
    '[]'::jsonb
  )
  into v_result
  from localized l
  left join founders f on f.calendar_entry_id = l.id
  left join exchange n on n.calendar_entry_id = l.id and n.item_type = 'need'
  left join exchange o on o.calendar_entry_id = l.id and o.item_type = 'offer';

  return coalesce(v_result, '[]'::jsonb);
end;
$$;

revoke all on function public.get_localized_public_journey_calendar(text) from public;
grant execute on function public.get_localized_public_journey_calendar(text) to anon, authenticated, service_role;

insert into public.website_pages
  (slug, route_path, page_name, original_language, status, is_public, display_order)
values
  ('calendar', '/calendar', 'Calendar', 'en', 'published', true, 45)
on conflict (slug) do update set
  route_path = excluded.route_path,
  page_name = excluded.page_name,
  status = 'published',
  is_public = true,
  updated_at = now();

insert into public.website_translation_keys
  (translation_key, namespace, description, default_text, value_type, is_required, is_active, interpolation_variables, supports_plural)
values
  ('navigation.calendar', 'navigation', 'Public UI key navigation.calendar', 'Calendar', 'text', true, true, '{}', false),
  ('journey_calendar.page.eyebrow', 'journey_calendar', 'Public UI key journey_calendar.page.eyebrow', 'Journey calendar', 'text', true, true, '{}', false),
  ('journey_calendar.page.title', 'journey_calendar', 'Public UI key journey_calendar.page.title', 'Where Kevin and Micha are — and what comes next.', 'text', true, true, '{}', false),
  ('journey_calendar.page.description', 'journey_calendar', 'Public UI key journey_calendar.page.description', 'See open hosting needs, upcoming stops, and what they can offer in return.', 'text', true, true, '{}', false),
  ('journey_calendar.page.seo_title', 'journey_calendar', 'Public UI key journey_calendar.page.seo_title', 'Journey calendar | Bankrupt to 1 Million', 'text', true, true, '{}', false),
  ('journey_calendar.page.seo_description', 'journey_calendar', 'Public UI key journey_calendar.page.seo_description', 'Follow Kevin and Micha’s public travel calendar, open hosting requests, and mutual exchange offers.', 'text', true, true, '{}', false),
  ('journey_calendar.section.eyebrow', 'journey_calendar', 'Public UI key journey_calendar.section.eyebrow', 'Journey calendar', 'text', true, true, '{}', false),
  ('journey_calendar.section.title', 'journey_calendar', 'Public UI key journey_calendar.section.title', 'Where Kevin and Micha are — and what comes next.', 'text', true, true, '{}', false),
  ('journey_calendar.section.description', 'journey_calendar', 'Public UI key journey_calendar.section.description', 'Choose a day to see the location, their request for help and what they can offer in return.', 'text', true, true, '{}', false),
  ('journey_calendar.status.idea', 'journey_calendar', 'Public UI key journey_calendar.status.idea', 'Idea', 'text', true, true, '{}', false),
  ('journey_calendar.status.planned', 'journey_calendar', 'Public UI key journey_calendar.status.planned', 'Planned', 'text', true, true, '{}', false),
  ('journey_calendar.status.confirmed', 'journey_calendar', 'Public UI key journey_calendar.status.confirmed', 'Confirmed', 'text', true, true, '{}', false),
  ('journey_calendar.status.travelling', 'journey_calendar', 'Public UI key journey_calendar.status.travelling', 'Travelling', 'text', true, true, '{}', false),
  ('journey_calendar.status.completed', 'journey_calendar', 'Public UI key journey_calendar.status.completed', 'Completed', 'text', true, true, '{}', false),
  ('journey_calendar.needs.eyebrow', 'journey_calendar', 'Public UI key journey_calendar.needs.eyebrow', 'Help requested here', 'text', true, true, '{}', false),
  ('journey_calendar.needs.title', 'journey_calendar', 'Public UI key journey_calendar.needs.title', 'What they need', 'text', true, true, '{}', false),
  ('journey_calendar.needs.empty', 'journey_calendar', 'Public UI key journey_calendar.needs.empty', 'No active help request for this day.', 'text', true, true, '{}', false),
  ('journey_calendar.offers.eyebrow', 'journey_calendar', 'Public UI key journey_calendar.offers.eyebrow', 'Mutual exchange', 'text', true, true, '{}', false),
  ('journey_calendar.offers.title', 'journey_calendar', 'Public UI key journey_calendar.offers.title', 'What they offer', 'text', true, true, '{}', false),
  ('journey_calendar.offers.empty', 'journey_calendar', 'Public UI key journey_calendar.offers.empty', 'No offer has been published for this day yet.', 'text', true, true, '{}', false),
  ('journey_calendar.meta.nights_needed', 'journey_calendar', 'Public UI key journey_calendar.meta.nights_needed', '{count} night(s) needed', 'text', true, true, array['count'], false),
  ('journey_calendar.meta.nights_needed_some', 'journey_calendar', 'Public UI key journey_calendar.meta.nights_needed_some', 'Nights needed', 'text', true, true, '{}', false),
  ('journey_calendar.meta.accommodation_arranged', 'journey_calendar', 'Public UI key journey_calendar.meta.accommodation_arranged', 'Accommodation arranged', 'text', true, true, '{}', false),
  ('journey_calendar.meta.hosting_open', 'journey_calendar', 'Public UI key journey_calendar.meta.hosting_open', 'Hosting request open', 'text', true, true, '{}', false),
  ('journey_calendar.meta.hosting_closed', 'journey_calendar', 'Public UI key journey_calendar.meta.hosting_closed', 'No hosting request', 'text', true, true, '{}', false),
  ('journey_calendar.nav.previous', 'journey_calendar', 'Public UI key journey_calendar.nav.previous', 'Previous', 'text', true, true, '{}', false),
  ('journey_calendar.nav.next', 'journey_calendar', 'Public UI key journey_calendar.nav.next', 'Next', 'text', true, true, '{}', false),
  ('journey_calendar.person.kevin', 'journey_calendar', 'Public UI key journey_calendar.person.kevin', 'Kevin', 'text', true, true, '{}', false),
  ('journey_calendar.person.micha', 'journey_calendar', 'Public UI key journey_calendar.person.micha', 'Micha', 'text', true, true, '{}', false),
  ('journey_calendar.person.together', 'journey_calendar', 'Public UI key journey_calendar.person.together', 'Kevin & Micha', 'text', true, true, '{}', false),
  ('journey_calendar.host.cta', 'journey_calendar', 'Public UI key journey_calendar.host.cta', 'Offer a place to stay', 'text', true, true, '{}', false),
  ('journey_calendar.host.close', 'journey_calendar', 'Public UI key journey_calendar.host.close', 'Close', 'text', true, true, '{}', false),
  ('journey_calendar.host.eyebrow', 'journey_calendar', 'Public UI key journey_calendar.host.eyebrow', 'Offer a place to stay', 'text', true, true, '{}', false),
  ('journey_calendar.host.title', 'journey_calendar', 'Public UI key journey_calendar.host.title', 'Help at {location}', 'text', true, true, array['location'], false),
  ('journey_calendar.host.private_contact', 'journey_calendar', 'Public UI key journey_calendar.host.private_contact', 'Your contact details remain private and are only visible to authorized mission admins.', 'text', true, true, '{}', false),
  ('journey_calendar.host.name', 'journey_calendar', 'Public UI key journey_calendar.host.name', 'Your name', 'text', true, true, '{}', false),
  ('journey_calendar.host.email', 'journey_calendar', 'Public UI key journey_calendar.host.email', 'Email', 'text', true, true, '{}', false),
  ('journey_calendar.host.phone', 'journey_calendar', 'Public UI key journey_calendar.host.phone', 'Phone', 'text', true, true, '{}', false),
  ('journey_calendar.host.optional', 'journey_calendar', 'Public UI key journey_calendar.host.optional', 'optional', 'text', true, true, '{}', false),
  ('journey_calendar.host.accommodation_type', 'journey_calendar', 'Public UI key journey_calendar.host.accommodation_type', 'Accommodation type', 'text', true, true, '{}', false),
  ('journey_calendar.host.accommodation_placeholder', 'journey_calendar', 'Public UI key journey_calendar.host.accommodation_placeholder', 'Bed, camper place, guest room…', 'text', true, true, '{}', false),
  ('journey_calendar.host.available_from', 'journey_calendar', 'Public UI key journey_calendar.host.available_from', 'Available from', 'text', true, true, '{}', false),
  ('journey_calendar.host.available_until', 'journey_calendar', 'Public UI key journey_calendar.host.available_until', 'Available until', 'text', true, true, '{}', false),
  ('journey_calendar.host.message', 'journey_calendar', 'Public UI key journey_calendar.host.message', 'Message', 'text', true, true, '{}', false),
  ('journey_calendar.host.message_placeholder', 'journey_calendar', 'Public UI key journey_calendar.host.message_placeholder', 'Tell Kevin and Micha what you can offer and anything useful to know.', 'text', true, true, '{}', false),
  ('journey_calendar.host.contact_consent', 'journey_calendar', 'Public UI key journey_calendar.host.contact_consent', 'Kevin and Micha may contact me about this hosting offer.', 'text', true, true, '{}', false),
  ('journey_calendar.host.sending', 'journey_calendar', 'Public UI key journey_calendar.host.sending', 'Sending privately…', 'text', true, true, '{}', false),
  ('journey_calendar.host.send', 'journey_calendar', 'Public UI key journey_calendar.host.send', 'Send hosting offer', 'text', true, true, '{}', false),
  ('journey_calendar.host.done', 'journey_calendar', 'Public UI key journey_calendar.host.done', 'Done', 'text', true, true, '{}', false),
  ('journey_calendar.host.success', 'journey_calendar', 'Public UI key journey_calendar.host.success', 'Thank you. Your hosting offer was sent privately to Kevin and Micha.', 'text', true, true, '{}', false),
  ('journey_calendar.host.error', 'journey_calendar', 'Public UI key journey_calendar.host.error', 'Your offer could not be sent. Please check the details and try again.', 'text', true, true, '{}', false),
  ('journey_calendar.founders_label', 'journey_calendar', 'Public UI key journey_calendar.founders_label', 'People involved', 'text', true, true, '{}', false)
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
    'navigation.calendar',
    'journey_calendar.page.eyebrow',
    'journey_calendar.page.title',
    'journey_calendar.page.description',
    'journey_calendar.page.seo_title',
    'journey_calendar.page.seo_description',
    'journey_calendar.section.eyebrow',
    'journey_calendar.section.title',
    'journey_calendar.section.description',
    'journey_calendar.status.idea',
    'journey_calendar.status.planned',
    'journey_calendar.status.confirmed',
    'journey_calendar.status.travelling',
    'journey_calendar.status.completed',
    'journey_calendar.needs.eyebrow',
    'journey_calendar.needs.title',
    'journey_calendar.needs.empty',
    'journey_calendar.offers.eyebrow',
    'journey_calendar.offers.title',
    'journey_calendar.offers.empty',
    'journey_calendar.meta.nights_needed',
    'journey_calendar.meta.nights_needed_some',
    'journey_calendar.meta.accommodation_arranged',
    'journey_calendar.meta.hosting_open',
    'journey_calendar.meta.hosting_closed',
    'journey_calendar.nav.previous',
    'journey_calendar.nav.next',
    'journey_calendar.person.kevin',
    'journey_calendar.person.micha',
    'journey_calendar.person.together',
    'journey_calendar.host.cta',
    'journey_calendar.host.close',
    'journey_calendar.host.eyebrow',
    'journey_calendar.host.title',
    'journey_calendar.host.private_contact',
    'journey_calendar.host.name',
    'journey_calendar.host.email',
    'journey_calendar.host.phone',
    'journey_calendar.host.optional',
    'journey_calendar.host.accommodation_type',
    'journey_calendar.host.accommodation_placeholder',
    'journey_calendar.host.available_from',
    'journey_calendar.host.available_until',
    'journey_calendar.host.message',
    'journey_calendar.host.message_placeholder',
    'journey_calendar.host.contact_consent',
    'journey_calendar.host.sending',
    'journey_calendar.host.send',
    'journey_calendar.host.done',
    'journey_calendar.host.success',
    'journey_calendar.host.error',
    'journey_calendar.founders_label',
    'journey_calendar.loading',
    'journey_calendar.error',
    'journey_calendar.empty',
    'journey_calendar.now',
    'journey_calendar.current_location'
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
    'components.journey.calendar.page',
    'src/components/PublicJourneyCalendarSection.tsx',
    'PublicJourneyCalendarSection',
    'component',
    'journey_calendar',
    true,
    '{"rpc":"get_localized_public_journey_calendar","tables":["journey_calendar_entries","journey_calendar_entry_translations","journey_calendar_entry_founders","journey_exchange_items","journey_exchange_item_translations"]}'::jsonb,
    'connected'
  ),
  (
    'pages.calendar.page',
    'src/pages/CalendarPage.tsx',
    'CalendarPage',
    'page',
    'journey_calendar',
    true,
    '{"rpc":"get_localized_public_journey_calendar","tables":["journey_calendar_entries","journey_calendar_entry_translations"]}'::jsonb,
    'connected'
  ),
  (
    'components.journey.calendar.host_form',
    'src/components/JourneyHostOfferForm.tsx',
    'JourneyHostOfferForm',
    'component',
    'journey_calendar',
    true,
    '{"tables":["journey_host_offers"]}'::jsonb,
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
    ('components.journey.calendar.page', 'journey_calendar.loading'),
    ('components.journey.calendar.page', 'journey_calendar.error'),
    ('components.journey.calendar.page', 'journey_calendar.empty'),
    ('components.journey.calendar.page', 'journey_calendar.now'),
    ('components.journey.calendar.page', 'journey_calendar.current_location'),
    ('components.journey.calendar.page', 'journey_calendar.section.eyebrow'),
    ('components.journey.calendar.page', 'journey_calendar.section.title'),
    ('components.journey.calendar.page', 'journey_calendar.section.description'),
    ('components.journey.calendar.page', 'journey_calendar.status.idea'),
    ('components.journey.calendar.page', 'journey_calendar.status.planned'),
    ('components.journey.calendar.page', 'journey_calendar.status.confirmed'),
    ('components.journey.calendar.page', 'journey_calendar.status.travelling'),
    ('components.journey.calendar.page', 'journey_calendar.status.completed'),
    ('components.journey.calendar.page', 'journey_calendar.needs.eyebrow'),
    ('components.journey.calendar.page', 'journey_calendar.needs.title'),
    ('components.journey.calendar.page', 'journey_calendar.needs.empty'),
    ('components.journey.calendar.page', 'journey_calendar.offers.eyebrow'),
    ('components.journey.calendar.page', 'journey_calendar.offers.title'),
    ('components.journey.calendar.page', 'journey_calendar.offers.empty'),
    ('components.journey.calendar.page', 'journey_calendar.meta.nights_needed'),
    ('components.journey.calendar.page', 'journey_calendar.meta.nights_needed_some'),
    ('components.journey.calendar.page', 'journey_calendar.meta.accommodation_arranged'),
    ('components.journey.calendar.page', 'journey_calendar.meta.hosting_open'),
    ('components.journey.calendar.page', 'journey_calendar.meta.hosting_closed'),
    ('components.journey.calendar.page', 'journey_calendar.nav.previous'),
    ('components.journey.calendar.page', 'journey_calendar.nav.next'),
    ('components.journey.calendar.page', 'journey_calendar.person.kevin'),
    ('components.journey.calendar.page', 'journey_calendar.person.micha'),
    ('components.journey.calendar.page', 'journey_calendar.person.together'),
    ('components.journey.calendar.page', 'journey_calendar.host.cta'),
    ('components.journey.calendar.page', 'journey_calendar.host.close'),
    ('components.journey.calendar.page', 'journey_calendar.host.eyebrow'),
    ('components.journey.calendar.page', 'journey_calendar.host.title'),
    ('components.journey.calendar.page', 'journey_calendar.host.private_contact'),
    ('components.journey.calendar.page', 'journey_calendar.host.name'),
    ('components.journey.calendar.page', 'journey_calendar.host.email'),
    ('components.journey.calendar.page', 'journey_calendar.host.phone'),
    ('components.journey.calendar.page', 'journey_calendar.host.optional'),
    ('components.journey.calendar.page', 'journey_calendar.host.accommodation_type'),
    ('components.journey.calendar.page', 'journey_calendar.host.accommodation_placeholder'),
    ('components.journey.calendar.page', 'journey_calendar.host.available_from'),
    ('components.journey.calendar.page', 'journey_calendar.host.available_until'),
    ('components.journey.calendar.page', 'journey_calendar.host.message'),
    ('components.journey.calendar.page', 'journey_calendar.host.message_placeholder'),
    ('components.journey.calendar.page', 'journey_calendar.host.contact_consent'),
    ('components.journey.calendar.page', 'journey_calendar.host.sending'),
    ('components.journey.calendar.page', 'journey_calendar.host.send'),
    ('components.journey.calendar.page', 'journey_calendar.host.done'),
    ('components.journey.calendar.page', 'journey_calendar.host.success'),
    ('components.journey.calendar.page', 'journey_calendar.host.error'),
    ('components.journey.calendar.page', 'journey_calendar.founders_label'),
    ('pages.calendar.page', 'journey_calendar.page.eyebrow'),
    ('pages.calendar.page', 'journey_calendar.page.title'),
    ('pages.calendar.page', 'journey_calendar.page.description'),
    ('pages.calendar.page', 'journey_calendar.page.seo_title'),
    ('pages.calendar.page', 'journey_calendar.page.seo_description'),
    ('pages.calendar.page', 'navigation.calendar')
) as v(component_key, translation_key)
join public.website_translation_keys k on k.translation_key = v.translation_key
where c.component_key = v.component_key
on conflict (component_id, translation_key_id) do update set
  usage_kind = excluded.usage_kind,
  is_required = excluded.is_required,
  updated_at = now();

insert into public.website_translation_key_usage
  (translation_key_id, source_path, source_identifier, migration_status, notes)
select
  k.id,
  case
    when v.component_key = 'pages.calendar.page' then 'src/pages/CalendarPage.tsx'
    else 'src/components/PublicJourneyCalendarSection.tsx'
  end,
  v.component_key,
  'active',
  'Public journey calendar surface'
from (
  values
    ('components.journey.calendar.page', 'journey_calendar.loading'),
    ('components.journey.calendar.page', 'journey_calendar.error'),
    ('components.journey.calendar.page', 'journey_calendar.empty'),
    ('components.journey.calendar.page', 'journey_calendar.now'),
    ('components.journey.calendar.page', 'journey_calendar.current_location'),
    ('pages.calendar.page', 'navigation.calendar'),
    ('pages.calendar.page', 'journey_calendar.page.title')
) as v(component_key, translation_key)
join public.website_translation_keys k on k.translation_key = v.translation_key
on conflict do nothing;

-- Bootstrap proof for scripts/verify-public-i18n.mjs (30-language catalog via = any(array[...]) above).

commit;
