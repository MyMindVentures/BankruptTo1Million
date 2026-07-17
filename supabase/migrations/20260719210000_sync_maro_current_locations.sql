-- Sync Kevin + Micha current location to Maro (under the highway).
-- Calendar stops + journal live map pins.
-- Note: journal_journey_entries.journal_post_id is UNIQUE, so each current pin needs its own
-- minimal published journal post (cannot attach both pins to the Balcón de Maro post).

begin;

-- 1) Align both calendar Maro stops to the same place
update public.journey_calendar_entries
set
  status = 'travelling',
  city_name = 'Maro',
  location_name = 'Under the highway',
  country_name = 'Spain',
  country_code = 'ES',
  latitude = 36.757095,
  longitude = -3.842513,
  transport_mode = 'Car',
  accommodation_needed = true,
  title = 'Kevin in Maro - sleeping in the car',
  public_summary = 'Kevin arrived in Maro on 15 July 2026 and is sleeping in his car under the highway for a few days while figuring out where to go next.',
  updated_at = now()
where slug = 'kevin-in-maro';

update public.journey_calendar_entries
set
  status = 'travelling',
  city_name = 'Maro',
  location_name = 'Under the highway',
  country_name = 'Spain',
  country_code = 'ES',
  latitude = 36.757095,
  longitude = -3.842513,
  transport_mode = 'Van',
  accommodation_needed = true,
  title = 'Micha in Maro - sleeping in the van',
  public_summary = 'Micha has been in Maro since 14 July 2026 and is sleeping in his van under the highway for a few days while figuring out where to go next.',
  updated_at = now()
where slug = 'micha-in-maro';

update public.journey_calendar_entry_translations t
set
  city_name = 'Maro',
  location_name = 'Under the highway',
  country_name = coalesce(t.country_name, 'Spain'),
  updated_at = now()
where t.calendar_entry_id in (
  'c3463e81-90f6-43eb-879b-a3a5159b891a',
  '852ab30a-05a2-48c4-aeb1-673f4aaf4454'
);

insert into public.journey_calendar_entry_translations
  (calendar_entry_id, language_code, title, public_summary, city_name, location_name, country_name, translation_status, translation_source, translated_at)
values
  (
    'c3463e81-90f6-43eb-879b-a3a5159b891a',
    'en',
    'Kevin in Maro - sleeping in the car',
    'Kevin arrived in Maro on 15 July 2026 and is sleeping in his car under the highway for a few days while figuring out where to go next.',
    'Maro',
    'Under the highway',
    'Spain',
    'published',
    'manual',
    now()
  ),
  (
    '852ab30a-05a2-48c4-aeb1-673f4aaf4454',
    'en',
    'Micha in Maro - sleeping in the van',
    'Micha has been in Maro since 14 July 2026 and is sleeping in his van under the highway for a few days while figuring out where to go next.',
    'Maro',
    'Under the highway',
    'Spain',
    'published',
    'manual',
    now()
  )
on conflict (calendar_entry_id, language_code) do update set
  title = excluded.title,
  public_summary = excluded.public_summary,
  city_name = excluded.city_name,
  location_name = excluded.location_name,
  country_name = excluded.country_name,
  translation_status = 'published',
  translation_source = 'manual',
  translated_at = now(),
  updated_at = now();

-- 2) Clear stale journal current locations (Benejarafe / Motril)
update public.journal_journey_entries
set
  is_current_location = false,
  updated_at = now()
where id in (
  '0a617583-1133-4c85-a48d-55d8d97de35a',
  'a6239359-070f-4b7c-ab4d-c5c375890a2c'
);

-- Soft-fix historical Balcón pin city (keep non-current)
update public.journal_journey_entries
set
  city_name = 'Maro',
  updated_at = now()
where id = '354db6a6-aa45-437f-b32d-ad165c51a94d'
  and city_name is distinct from 'Maro';

-- 3) Minimal published posts required for map pins (1:1 with journey entries)
insert into public.journal_posts (
  id,
  slug,
  status,
  title,
  excerpt,
  body,
  content_format,
  original_language,
  published_at,
  publication_timezone
)
values
  (
    'b1a10001-15e7-4000-8000-000000000015',
    'kevin-maro-under-highway-15-july-2026',
    'published',
    'Kevin in Maro - sleeping in the car under the highway',
    'Kevin arrived in Maro on 15 July 2026 and is sleeping in his car under the highway for a few days while figuring out where to go next.',
    'Kevin arrived in Maro on 15 July 2026. He is sleeping in his car under the highway for a few days and does not yet know where to go next.',
    'markdown',
    'en',
    '2026-07-15T12:00:00+00',
    'Europe/Madrid'
  ),
  (
    'b1a10002-14e7-4000-8000-000000000014',
    'micha-maro-under-highway-14-july-2026',
    'published',
    'Micha in Maro - sleeping in the van under the highway',
    'Micha has been in Maro since 14 July 2026 and is sleeping in his van under the highway for a few days while figuring out where to go next.',
    'Micha has been in Maro since 14 July 2026. He is sleeping in his van under the highway for a few days and does not yet know where to go next.',
    'markdown',
    'en',
    '2026-07-14T12:00:00+00',
    'Europe/Madrid'
  )
on conflict (id) do update set
  slug = excluded.slug,
  title = excluded.title,
  excerpt = excluded.excerpt,
  body = excluded.body,
  status = 'published',
  published_at = coalesce(public.journal_posts.published_at, excluded.published_at),
  updated_at = now();

insert into public.content_person_relations (
  journal_post_id,
  founder_profile_id,
  relationship_role,
  is_primary,
  use_for_avatar,
  display_order
)
select v.journal_post_id, v.founder_profile_id, v.relationship_role, v.is_primary, v.use_for_avatar, v.display_order
from (values
  (
    'b1a10001-15e7-4000-8000-000000000015'::uuid,
    'a81c719c-445d-4c71-a440-f10a3ea7fee1'::uuid,
    'primary_subject',
    true,
    true,
    0
  ),
  (
    'b1a10002-14e7-4000-8000-000000000014'::uuid,
    '59c5fe0d-f9b0-4156-b56b-5a475714e3c5'::uuid,
    'primary_subject',
    true,
    true,
    0
  )
) as v(journal_post_id, founder_profile_id, relationship_role, is_primary, use_for_avatar, display_order)
where not exists (
  select 1
  from public.content_person_relations cpr
  where cpr.journal_post_id = v.journal_post_id
    and cpr.founder_profile_id = v.founder_profile_id
);

-- Map pin avatars come from journal_post_author_links (subject/both)
insert into public.journal_post_author_links (
  journal_post_id,
  journal_author_id,
  author_role,
  author_order
)
values
  (
    'b1a10001-15e7-4000-8000-000000000015',
    '792349cc-5d11-4acd-b367-34a0f439a08b',
    'subject',
    0
  ),
  (
    'b1a10002-14e7-4000-8000-000000000014',
    'f657c340-59a9-402a-bc54-4303b11baf66',
    'subject',
    0
  )
on conflict (journal_post_id, journal_author_id) do update set
  author_role = excluded.author_role,
  author_order = excluded.author_order;

insert into public.journal_journey_entries (
  journal_post_id,
  entry_type,
  occurred_at,
  timezone,
  country_code,
  country_name,
  city_name,
  location_name,
  latitude,
  longitude,
  what_happened,
  journey_person,
  is_milestone,
  show_on_map,
  show_on_timeline,
  is_current_location,
  is_public_location,
  map_label,
  travel_mode,
  metadata
)
values
  (
    'b1a10001-15e7-4000-8000-000000000015',
    'daily_update',
    '2026-07-15T12:00:00+00',
    'Europe/Madrid',
    'ES',
    'Spain',
    'Maro',
    'Under the highway',
    36.757095,
    -3.842513,
    'Kevin arrived in Maro on 15 July 2026. He is sleeping in his car under the highway for a few days and does not yet know where to go next.',
    'kevin',
    false,
    true,
    true,
    true,
    true,
    'Maro - sleeping in car under the highway',
    'car',
    '{"source":"maro_current_location_sync"}'::jsonb
  ),
  (
    'b1a10002-14e7-4000-8000-000000000014',
    'daily_update',
    '2026-07-14T12:00:00+00',
    'Europe/Madrid',
    'ES',
    'Spain',
    'Maro',
    'Under the highway',
    36.757095,
    -3.842513,
    'Micha has been in Maro since 14 July 2026. He is sleeping in his van under the highway for a few days and does not yet know where to go next.',
    'micha',
    false,
    true,
    true,
    true,
    true,
    'Maro - sleeping in van under the highway',
    'van',
    '{"source":"maro_current_location_sync"}'::jsonb
  )
on conflict (journal_post_id) do update set
  occurred_at = excluded.occurred_at,
  country_code = excluded.country_code,
  country_name = excluded.country_name,
  city_name = excluded.city_name,
  location_name = excluded.location_name,
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  what_happened = excluded.what_happened,
  journey_person = excluded.journey_person,
  show_on_map = true,
  is_current_location = true,
  map_label = excluded.map_label,
  travel_mode = excluded.travel_mode,
  metadata = excluded.metadata,
  updated_at = now();

commit;
