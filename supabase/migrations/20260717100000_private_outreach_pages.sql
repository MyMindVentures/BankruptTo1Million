-- Private Outreach Pages: schema, token security, public + admin RPCs.

begin;

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.outreach_contacts (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text,
  company_name text not null,
  job_title text,
  email text,
  phone text,
  whatsapp text,
  website text,
  instagram text,
  linkedin text,
  location text,
  language_code text not null default 'en' references public.site_languages(code),
  partnership_contact_id uuid references public.partnership_contacts(id) on delete set null,
  lead_id uuid references public.leads(id) on delete set null,
  created_by_email text,
  assigned_to_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.outreach_campaigns (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.outreach_contacts(id) on delete cascade,
  category text not null default 'collaboration' check (category in ('work','collaboration','hosting','sponsoring','investment','technical_support')),
  status text not null default 'draft' check (status in ('draft','ready','sent','opened','interested','meeting_planned','accepted','declined','no_response','archived')),
  outreach_channel text check (outreach_channel is null or outreach_channel in ('email','whatsapp','instagram','linkedin','manual')),
  responsible_email text,
  internal_notes text,
  sent_at timestamptz,
  last_opened_at timestamptz,
  visit_count integer not null default 0 check (visit_count >= 0),
  last_response_type text check (last_response_type is null or last_response_type in ('yes_meet','interested','tell_more','not_now','form_message','meeting_request')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists outreach_campaigns_contact_idx on public.outreach_campaigns(contact_id);
create index if not exists outreach_campaigns_status_idx on public.outreach_campaigns(status, updated_at desc);

create table if not exists public.outreach_pages (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null unique references public.outreach_campaigns(id) on delete cascade,
  slug text not null unique,
  personal_intro text,
  why_them text,
  what_we_offer text,
  what_we_ask text,
  win_win text,
  personal_message text,
  mission_blurb text,
  meeting_url text,
  whatsapp_override text,
  founder_video_media_id uuid references public.media_assets(id) on delete set null,
  expires_at timestamptz,
  original_language text not null default 'en' references public.site_languages(code),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists outreach_pages_slug_idx on public.outreach_pages(slug);

create table if not exists public.outreach_page_media (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.outreach_pages(id) on delete cascade,
  media_asset_id uuid not null references public.media_assets(id) on delete cascade,
  sort_order integer not null default 0 check (sort_order >= 0),
  caption text,
  created_at timestamptz not null default now(),
  unique (page_id, media_asset_id)
);

create table if not exists public.outreach_access_tokens (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.outreach_campaigns(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  max_visits integer check (max_visits is null or max_visits > 0),
  visit_count integer not null default 0 check (visit_count >= 0),
  last_accessed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists outreach_access_tokens_campaign_idx on public.outreach_access_tokens(campaign_id, created_at desc);

create table if not exists public.outreach_events (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.outreach_campaigns(id) on delete cascade,
  event_type text not null check (event_type in ('link_generated','message_sent','page_opened','video_played','cta_clicked','form_submitted','meeting_requested','token_revoked','token_regenerated')),
  metadata jsonb not null default '{}'::jsonb,
  session_key text,
  occurred_at timestamptz not null default now()
);

create index if not exists outreach_events_campaign_occurred_idx on public.outreach_events(campaign_id, occurred_at desc);

create table if not exists public.outreach_messages (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.outreach_campaigns(id) on delete cascade,
  channel text not null check (channel in ('email','whatsapp','instagram','linkedin','manual')),
  direction text not null default 'outbound' check (direction in ('outbound','inbound')),
  subject text,
  body text not null,
  generated_by_email text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.outreach_responses (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.outreach_campaigns(id) on delete cascade,
  response_type text not null check (response_type in ('yes_meet','interested','tell_more','not_now','form_message','meeting_request')),
  message text,
  visitor_name text,
  visitor_email text,
  visitor_phone text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists outreach_responses_campaign_idx on public.outreach_responses(campaign_id, created_at desc);

-- updated_at triggers
create or replace function public.set_outreach_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_outreach_contacts_updated_at on public.outreach_contacts;
create trigger set_outreach_contacts_updated_at before update on public.outreach_contacts
for each row execute function public.set_outreach_updated_at();

drop trigger if exists set_outreach_campaigns_updated_at on public.outreach_campaigns;
create trigger set_outreach_campaigns_updated_at before update on public.outreach_campaigns
for each row execute function public.set_outreach_updated_at();

drop trigger if exists set_outreach_pages_updated_at on public.outreach_pages;
create trigger set_outreach_pages_updated_at before update on public.outreach_pages
for each row execute function public.set_outreach_updated_at();

-- RLS: RPC-only access
alter table public.outreach_contacts enable row level security;
alter table public.outreach_campaigns enable row level security;
alter table public.outreach_pages enable row level security;
alter table public.outreach_page_media enable row level security;
alter table public.outreach_access_tokens enable row level security;
alter table public.outreach_events enable row level security;
alter table public.outreach_messages enable row level security;
alter table public.outreach_responses enable row level security;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.outreach_slugify(p_value text)
returns text
language sql
immutable
as $$
  select trim(both '-' from regexp_replace(lower(regexp_replace(coalesce(p_value, ''), '[^a-zA-Z0-9]+', '-', 'g')), '-{2,}', '-', 'g'));
$$;

create or replace function public.outreach_hash_token(p_raw_token text)
returns text
language sql
immutable
as $$
  select encode(extensions.digest(trim(coalesce(p_raw_token, '')), 'sha256'), 'hex');
$$;

create or replace function public.outreach_generate_raw_token()
returns text
language sql
volatile
as $$
  select replace(replace(encode(gen_random_bytes(32), 'base64'), '+', '-'), '/', '_');
$$;

create or replace function public.outreach_map_response_status(p_response_type text)
returns text
language sql
immutable
as $$
  select case p_response_type
    when 'yes_meet' then 'meeting_planned'
    when 'interested' then 'interested'
    when 'tell_more' then 'interested'
    when 'not_now' then 'declined'
    when 'form_message' then 'interested'
    when 'meeting_request' then 'meeting_planned'
    else null
  end;
$$;

create or replace function public.outreach_assert_admin()
returns text
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
  if not public.has_active_admin_access() then
    raise exception 'Active administrator access is required.' using errcode = '42501';
  end if;
  return v_email;
end;
$$;

revoke all on function public.outreach_assert_admin() from public;
grant execute on function public.outreach_assert_admin() to authenticated;

create or replace function public.outreach_validate_token(p_slug text, p_raw_token text)
returns table (
  token_id uuid,
  campaign_id uuid,
  page_id uuid,
  expires_at timestamptz,
  revoked_at timestamptz,
  max_visits integer,
  visit_count integer,
  allow_visit boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hash text := public.outreach_hash_token(p_raw_token);
  v_found boolean := false;
begin
  if nullif(trim(coalesce(p_slug, '')), '') is null or nullif(trim(coalesce(p_raw_token, '')), '') is null then
    raise exception 'outreach_invalid_link' using errcode = '22023';
  end if;

  return query
  select
    t.id,
    t.campaign_id,
    p.id,
    t.expires_at,
    t.revoked_at,
    t.max_visits,
    t.visit_count,
    (
      t.revoked_at is null
      and t.expires_at > now()
      and (t.max_visits is null or t.visit_count < t.max_visits)
    ) as allow_visit
  from public.outreach_pages p
  join public.outreach_access_tokens t on t.campaign_id = p.campaign_id
  where p.slug = trim(p_slug)
    and t.token_hash = v_hash
  order by t.created_at desc
  limit 1;

  get diagnostics v_found = row_count;
  if not v_found then
    raise exception 'outreach_invalid_link' using errcode = '22023';
  end if;
end;
$$;

revoke all on function public.outreach_validate_token(text, text) from public;

create or replace function public.outreach_build_public_url(p_slug text, p_raw_token text)
returns text
language sql
immutable
as $$
  select 'https://www.bankruptto1million.com/o/' || trim(p_slug) || '/' || trim(p_raw_token);
$$;

-- ---------------------------------------------------------------------------
-- Public RPCs
-- ---------------------------------------------------------------------------

create or replace function public.get_outreach_page_public(
  p_slug text,
  p_raw_token text,
  p_session_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token record;
  v_contact public.outreach_contacts%rowtype;
  v_campaign public.outreach_campaigns%rowtype;
  v_page public.outreach_pages%rowtype;
  v_media jsonb;
  v_founder_video jsonb;
  v_whatsapp text;
begin
  select * into v_token
  from public.outreach_validate_token(p_slug, p_raw_token);

  if v_token.revoked_at is not null then
    raise exception 'outreach_revoked' using errcode = '22023';
  end if;
  if v_token.expires_at <= now() then
    raise exception 'outreach_expired' using errcode = '22023';
  end if;
  if v_token.max_visits is not null and v_token.visit_count >= v_token.max_visits then
    raise exception 'outreach_max_visits_reached' using errcode = '22023';
  end if;

  select * into v_campaign from public.outreach_campaigns where id = v_token.campaign_id;
  select * into v_contact from public.outreach_contacts where id = v_campaign.contact_id;
  select * into v_page from public.outreach_pages where id = v_token.page_id;

  update public.outreach_access_tokens
  set visit_count = visit_count + 1,
      last_accessed_at = now()
  where id = v_token.token_id;

  update public.outreach_campaigns
  set visit_count = visit_count + 1,
      last_opened_at = now(),
      status = case when status = 'sent' then 'opened' else status end,
      updated_at = now()
  where id = v_token.campaign_id;

  insert into public.outreach_events(campaign_id, event_type, metadata, session_key)
  values (
    v_token.campaign_id,
    'page_opened',
    jsonb_build_object('slug', trim(p_slug), 'visit_count', v_token.visit_count + 1),
    nullif(trim(coalesce(p_session_key, '')), '')
  );

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'storage_bucket', ma.storage_bucket,
      'storage_path', ma.storage_path,
      'external_url', ma.external_url,
      'asset_type', ma.asset_type,
      'caption', opm.caption,
      'sort_order', opm.sort_order
    ) order by opm.sort_order asc
  ), '[]'::jsonb)
  into v_media
  from public.outreach_page_media opm
  join public.media_assets ma on ma.id = opm.media_asset_id
  where opm.page_id = v_page.id;

  if v_page.founder_video_media_id is not null then
    select jsonb_build_object(
      'storage_bucket', ma.storage_bucket,
      'storage_path', ma.storage_path,
      'external_url', ma.external_url,
      'asset_type', ma.asset_type,
      'poster_url', ma.thumbnail_url
    )
    into v_founder_video
    from public.media_assets ma
    where ma.id = v_page.founder_video_media_id;
  end if;

  v_whatsapp := coalesce(nullif(trim(v_page.whatsapp_override), ''), nullif(trim(v_contact.whatsapp), ''), nullif(trim(v_contact.phone), ''));

  return jsonb_build_object(
    'contact', jsonb_build_object(
      'first_name', v_contact.first_name,
      'last_name', v_contact.last_name,
      'company_name', v_contact.company_name,
      'website', v_contact.website,
      'instagram', v_contact.instagram,
      'linkedin', v_contact.linkedin
    ),
    'page', jsonb_build_object(
      'personal_intro', v_page.personal_intro,
      'why_them', v_page.why_them,
      'what_we_offer', v_page.what_we_offer,
      'what_we_ask', v_page.what_we_ask,
      'win_win', v_page.win_win,
      'personal_message', v_page.personal_message,
      'mission_blurb', v_page.mission_blurb,
      'meeting_url', v_page.meeting_url,
      'whatsapp_url', case when v_whatsapp is not null then 'https://wa.me/' || regexp_replace(v_whatsapp, '[^0-9]', '', 'g') else null end
    ),
    'media', coalesce(v_media, '[]'::jsonb),
    'founder_video', v_founder_video,
    'language_code', coalesce(v_page.original_language, v_contact.language_code, 'en'),
    'campaign_id', v_token.campaign_id
  );
end;
$$;

revoke all on function public.get_outreach_page_public(text, text, text) from public;
grant execute on function public.get_outreach_page_public(text, text, text) to anon, authenticated;

create or replace function public.submit_outreach_response(
  p_slug text,
  p_raw_token text,
  p_response_type text,
  p_payload jsonb default '{}'::jsonb,
  p_session_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token record;
  v_status text;
  v_message text := nullif(trim(coalesce(p_payload ->> 'message', '')), '');
  v_name text := nullif(trim(coalesce(p_payload ->> 'visitor_name', '')), '');
  v_email text := nullif(trim(coalesce(p_payload ->> 'visitor_email', '')), '');
  v_phone text := nullif(trim(coalesce(p_payload ->> 'visitor_phone', '')), '');
begin
  if p_response_type not in ('yes_meet','interested','tell_more','not_now','form_message','meeting_request') then
    raise exception 'Unsupported outreach response type.' using errcode = '22023';
  end if;

  select * into v_token from public.outreach_validate_token(p_slug, p_raw_token);

  if v_token.revoked_at is not null then raise exception 'outreach_revoked' using errcode = '22023'; end if;
  if v_token.expires_at <= now() then raise exception 'outreach_expired' using errcode = '22023'; end if;

  insert into public.outreach_responses(campaign_id, response_type, message, visitor_name, visitor_email, visitor_phone, metadata)
  values (
    v_token.campaign_id,
    p_response_type,
    v_message,
    v_name,
    v_email,
    v_phone,
    coalesce(p_payload, '{}'::jsonb)
  );

  insert into public.outreach_events(campaign_id, event_type, metadata, session_key)
  values (
    v_token.campaign_id,
    case when p_response_type = 'form_message' then 'form_submitted' when p_response_type = 'meeting_request' then 'meeting_requested' else 'cta_clicked' end,
    jsonb_build_object('response_type', p_response_type),
    nullif(trim(coalesce(p_session_key, '')), '')
  );

  v_status := public.outreach_map_response_status(p_response_type);

  if v_status is not null then
    update public.outreach_campaigns
    set status = v_status,
        last_response_type = p_response_type,
        updated_at = now()
    where id = v_token.campaign_id;
  end if;

  return jsonb_build_object('ok', true, 'status', coalesce(v_status, 'opened'));
end;
$$;

revoke all on function public.submit_outreach_response(text, text, text, jsonb, text) from public;
grant execute on function public.submit_outreach_response(text, text, text, jsonb, text) to anon, authenticated;

create or replace function public.record_outreach_engagement(
  p_slug text,
  p_raw_token text,
  p_event_type text,
  p_metadata jsonb default '{}'::jsonb,
  p_session_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token record;
begin
  if p_event_type not in ('video_played','cta_clicked') then
    raise exception 'Unsupported outreach engagement event.' using errcode = '22023';
  end if;

  select * into v_token from public.outreach_validate_token(p_slug, p_raw_token);
  if v_token.revoked_at is not null then raise exception 'outreach_revoked' using errcode = '22023'; end if;
  if v_token.expires_at <= now() then raise exception 'outreach_expired' using errcode = '22023'; end if;

  insert into public.outreach_events(campaign_id, event_type, metadata, session_key)
  values (v_token.campaign_id, p_event_type, coalesce(p_metadata, '{}'::jsonb), nullif(trim(coalesce(p_session_key, '')), ''));

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.record_outreach_engagement(text, text, text, jsonb, text) from public;
grant execute on function public.record_outreach_engagement(text, text, text, jsonb, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Admin RPCs
-- ---------------------------------------------------------------------------

create or replace function public.admin_get_outreach_overview(
  p_status text default null,
  p_query text default null,
  p_limit integer default 100,
  p_offset integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_rows jsonb;
  v_counts jsonb;
  v_q text := '%' || lower(trim(coalesce(p_query, ''))) || '%';
begin
  perform public.outreach_assert_admin();

  with filtered as (
    select
      cam.id as campaign_id,
      c.first_name,
      c.last_name,
      c.company_name,
      cam.category,
      cam.outreach_channel,
      cam.status,
      cam.created_at,
      cam.sent_at,
      cam.last_opened_at,
      cam.visit_count,
      cam.last_response_type,
      cam.responsible_email
    from public.outreach_campaigns cam
    join public.outreach_contacts c on c.id = cam.contact_id
    where (p_status is null or cam.status = p_status)
      and (
        coalesce(p_query, '') = ''
        or lower(concat_ws(' ', c.first_name, c.last_name, c.company_name, cam.responsible_email, cam.status, cam.category)) like v_q
      )
    order by cam.updated_at desc
    limit greatest(1, least(coalesce(p_limit, 100), 500))
    offset greatest(coalesce(p_offset, 0), 0)
  )
  select coalesce(jsonb_agg(to_jsonb(filtered)), '[]'::jsonb) into v_rows from filtered;

  select jsonb_build_object(
    'draft', count(*) filter (where status = 'draft'),
    'ready', count(*) filter (where status = 'ready'),
    'sent', count(*) filter (where status = 'sent'),
    'opened', count(*) filter (where status = 'opened'),
    'interested', count(*) filter (where status = 'interested'),
    'meeting_planned', count(*) filter (where status = 'meeting_planned'),
    'accepted', count(*) filter (where status = 'accepted'),
    'declined', count(*) filter (where status = 'declined'),
    'no_response', count(*) filter (where status = 'no_response'),
    'archived', count(*) filter (where status = 'archived'),
    'total', count(*)
  )
  into v_counts
  from public.outreach_campaigns;

  return jsonb_build_object('rows', coalesce(v_rows, '[]'::jsonb), 'counts', coalesce(v_counts, '{}'::jsonb));
end;
$$;

revoke all on function public.admin_get_outreach_overview(text, text, integer, integer) from public;
grant execute on function public.admin_get_outreach_overview(text, text, integer, integer) to authenticated;

create or replace function public.admin_get_outreach_detail(p_campaign_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_contact jsonb;
  v_campaign jsonb;
  v_page jsonb;
  v_token jsonb;
  v_media jsonb;
  v_events jsonb;
  v_messages jsonb;
  v_responses jsonb;
begin
  perform public.outreach_assert_admin();

  select to_jsonb(c.*) into v_contact
  from public.outreach_contacts c
  join public.outreach_campaigns cam on cam.contact_id = c.id
  where cam.id = p_campaign_id;

  if v_contact is null then raise exception 'Outreach campaign not found.' using errcode = '22023'; end if;

  select to_jsonb(cam.*) into v_campaign from public.outreach_campaigns cam where cam.id = p_campaign_id;
  select to_jsonb(pg.*) into v_page from public.outreach_pages pg where pg.campaign_id = p_campaign_id;

  select to_jsonb(t.*) - 'token_hash' into v_token
  from public.outreach_access_tokens t
  where t.campaign_id = p_campaign_id and t.revoked_at is null
  order by t.created_at desc
  limit 1;

  select coalesce(jsonb_agg(to_jsonb(opm.*) order by opm.sort_order), '[]'::jsonb)
  into v_media
  from public.outreach_page_media opm
  join public.outreach_pages pg on pg.id = opm.page_id
  where pg.campaign_id = p_campaign_id;

  select coalesce(jsonb_agg(to_jsonb(e.*) order by e.occurred_at desc), '[]'::jsonb)
  into v_events
  from (
    select * from public.outreach_events where campaign_id = p_campaign_id order by occurred_at desc limit 50
  ) e;

  select coalesce(jsonb_agg(to_jsonb(m.*) order by m.created_at desc), '[]'::jsonb)
  into v_messages
  from (
    select * from public.outreach_messages where campaign_id = p_campaign_id order by created_at desc limit 20
  ) m;

  select coalesce(jsonb_agg(to_jsonb(r.*) order by r.created_at desc), '[]'::jsonb)
  into v_responses
  from (
    select * from public.outreach_responses where campaign_id = p_campaign_id order by created_at desc limit 20
  ) r;

  return jsonb_build_object(
    'contact', v_contact,
    'campaign', v_campaign,
    'page', v_page,
    'token', v_token,
    'media', v_media,
    'events', v_events,
    'messages', v_messages,
    'responses', v_responses
  );
end;
$$;

revoke all on function public.admin_get_outreach_detail(uuid) from public;
grant execute on function public.admin_get_outreach_detail(uuid) to authenticated;

create or replace function public.admin_upsert_outreach_campaign(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_admin text := public.outreach_assert_admin();
  v_contact_id uuid := nullif(p_payload #>> '{contact,id}', '')::uuid;
  v_campaign_id uuid := nullif(p_payload #>> '{campaign,id}', '')::uuid;
  v_page_id uuid := nullif(p_payload #>> '{page,id}', '')::uuid;
  v_slug text;
  v_company text := trim(coalesce(p_payload #>> '{contact,company_name}', ''));
begin
  if v_company = '' then raise exception 'Company name is required.'; end if;
  if nullif(trim(coalesce(p_payload #>> '{contact,first_name}', '')), '') is null then raise exception 'First name is required.'; end if;

  if v_contact_id is null then
    insert into public.outreach_contacts(
      first_name, last_name, company_name, job_title, email, phone, whatsapp, website, instagram, linkedin, location,
      language_code, partnership_contact_id, lead_id, created_by_email, assigned_to_email
    ) values (
      trim(p_payload #>> '{contact,first_name}'),
      nullif(trim(coalesce(p_payload #>> '{contact,last_name}', '')), ''),
      v_company,
      nullif(trim(coalesce(p_payload #>> '{contact,job_title}', '')), ''),
      nullif(trim(coalesce(p_payload #>> '{contact,email}', '')), ''),
      nullif(trim(coalesce(p_payload #>> '{contact,phone}', '')), ''),
      nullif(trim(coalesce(p_payload #>> '{contact,whatsapp}', '')), ''),
      nullif(trim(coalesce(p_payload #>> '{contact,website}', '')), ''),
      nullif(trim(coalesce(p_payload #>> '{contact,instagram}', '')), ''),
      nullif(trim(coalesce(p_payload #>> '{contact,linkedin}', '')), ''),
      nullif(trim(coalesce(p_payload #>> '{contact,location}', '')), ''),
      coalesce(nullif(trim(coalesce(p_payload #>> '{contact,language_code}', '')), ''), 'en'),
      nullif(p_payload #>> '{contact,partnership_contact_id}', '')::uuid,
      nullif(p_payload #>> '{contact,lead_id}', '')::uuid,
      coalesce(nullif(trim(coalesce(p_payload #>> '{contact,created_by_email}', '')), ''), v_admin),
      nullif(trim(coalesce(p_payload #>> '{contact,assigned_to_email}', '')), '')
    ) returning id into v_contact_id;
  else
    update public.outreach_contacts set
      first_name = trim(p_payload #>> '{contact,first_name}'),
      last_name = nullif(trim(coalesce(p_payload #>> '{contact,last_name}', '')), ''),
      company_name = v_company,
      job_title = nullif(trim(coalesce(p_payload #>> '{contact,job_title}', '')), ''),
      email = nullif(trim(coalesce(p_payload #>> '{contact,email}', '')), ''),
      phone = nullif(trim(coalesce(p_payload #>> '{contact,phone}', '')), ''),
      whatsapp = nullif(trim(coalesce(p_payload #>> '{contact,whatsapp}', '')), ''),
      website = nullif(trim(coalesce(p_payload #>> '{contact,website}', '')), ''),
      instagram = nullif(trim(coalesce(p_payload #>> '{contact,instagram}', '')), ''),
      linkedin = nullif(trim(coalesce(p_payload #>> '{contact,linkedin}', '')), ''),
      location = nullif(trim(coalesce(p_payload #>> '{contact,location}', '')), ''),
      language_code = coalesce(nullif(trim(coalesce(p_payload #>> '{contact,language_code}', '')), ''), language_code),
      partnership_contact_id = nullif(p_payload #>> '{contact,partnership_contact_id}', '')::uuid,
      lead_id = nullif(p_payload #>> '{contact,lead_id}', '')::uuid,
      assigned_to_email = nullif(trim(coalesce(p_payload #>> '{contact,assigned_to_email}', '')), ''),
      updated_at = now()
    where id = v_contact_id;
  end if;

  if v_campaign_id is null then
    insert into public.outreach_campaigns(
      contact_id, category, status, outreach_channel, responsible_email, internal_notes
    ) values (
      v_contact_id,
      coalesce(nullif(trim(coalesce(p_payload #>> '{campaign,category}', '')), ''), 'collaboration'),
      coalesce(nullif(trim(coalesce(p_payload #>> '{campaign,status}', '')), ''), 'draft'),
      nullif(trim(coalesce(p_payload #>> '{campaign,outreach_channel}', '')), ''),
      coalesce(nullif(trim(coalesce(p_payload #>> '{campaign,responsible_email}', '')), ''), v_admin),
      nullif(trim(coalesce(p_payload #>> '{campaign,internal_notes}', '')), '')
    ) returning id into v_campaign_id;
  else
    update public.outreach_campaigns set
      category = coalesce(nullif(trim(coalesce(p_payload #>> '{campaign,category}', '')), ''), category),
      status = coalesce(nullif(trim(coalesce(p_payload #>> '{campaign,status}', '')), ''), status),
      outreach_channel = nullif(trim(coalesce(p_payload #>> '{campaign,outreach_channel}', '')), ''),
      responsible_email = coalesce(nullif(trim(coalesce(p_payload #>> '{campaign,responsible_email}', '')), ''), responsible_email),
      internal_notes = nullif(trim(coalesce(p_payload #>> '{campaign,internal_notes}', '')), ''),
      updated_at = now()
    where id = v_campaign_id;
  end if;

  v_slug := coalesce(
    nullif(trim(coalesce(p_payload #>> '{page,slug}', '')), ''),
    public.outreach_slugify(v_company)
  );
  if v_slug = '' then v_slug := 'outreach-' || left(replace(v_campaign_id::text, '-', ''), 8); end if;

  if v_page_id is null then
    insert into public.outreach_pages(
      campaign_id, slug, personal_intro, why_them, what_we_offer, what_we_ask, win_win, personal_message, mission_blurb,
      meeting_url, whatsapp_override, founder_video_media_id, expires_at, original_language
    ) values (
      v_campaign_id,
      v_slug,
      nullif(trim(coalesce(p_payload #>> '{page,personal_intro}', '')), ''),
      nullif(trim(coalesce(p_payload #>> '{page,why_them}', '')), ''),
      nullif(trim(coalesce(p_payload #>> '{page,what_we_offer}', '')), ''),
      nullif(trim(coalesce(p_payload #>> '{page,what_we_ask}', '')), ''),
      nullif(trim(coalesce(p_payload #>> '{page,win_win}', '')), ''),
      nullif(trim(coalesce(p_payload #>> '{page,personal_message}', '')), ''),
      nullif(trim(coalesce(p_payload #>> '{page,mission_blurb}', '')), ''),
      nullif(trim(coalesce(p_payload #>> '{page,meeting_url}', '')), ''),
      nullif(trim(coalesce(p_payload #>> '{page,whatsapp_override}', '')), ''),
      nullif(p_payload #>> '{page,founder_video_media_id}', '')::uuid,
      coalesce(nullif(p_payload #>> '{page,expires_at}', '')::timestamptz, now() + interval '90 days'),
      coalesce(nullif(trim(coalesce(p_payload #>> '{page,original_language}', p_payload #>> '{contact,language_code}')), ''), 'en')
    ) returning id into v_page_id;
  else
    update public.outreach_pages set
      slug = v_slug,
      personal_intro = nullif(trim(coalesce(p_payload #>> '{page,personal_intro}', '')), ''),
      why_them = nullif(trim(coalesce(p_payload #>> '{page,why_them}', '')), ''),
      what_we_offer = nullif(trim(coalesce(p_payload #>> '{page,what_we_offer}', '')), ''),
      what_we_ask = nullif(trim(coalesce(p_payload #>> '{page,what_we_ask}', '')), ''),
      win_win = nullif(trim(coalesce(p_payload #>> '{page,win_win}', '')), ''),
      personal_message = nullif(trim(coalesce(p_payload #>> '{page,personal_message}', '')), ''),
      mission_blurb = nullif(trim(coalesce(p_payload #>> '{page,mission_blurb}', '')), ''),
      meeting_url = nullif(trim(coalesce(p_payload #>> '{page,meeting_url}', '')), ''),
      whatsapp_override = nullif(trim(coalesce(p_payload #>> '{page,whatsapp_override}', '')), ''),
      founder_video_media_id = nullif(p_payload #>> '{page,founder_video_media_id}', '')::uuid,
      expires_at = coalesce(nullif(p_payload #>> '{page,expires_at}', '')::timestamptz, expires_at),
      original_language = coalesce(nullif(trim(coalesce(p_payload #>> '{page,original_language}', '')), ''), original_language),
      updated_at = now()
    where id = v_page_id;
  end if;

  return public.admin_get_outreach_detail(v_campaign_id);
end;
$$;

revoke all on function public.admin_upsert_outreach_campaign(jsonb) from public;
grant execute on function public.admin_upsert_outreach_campaign(jsonb) to authenticated;

create or replace function public.admin_set_outreach_page_media(p_page_id uuid, p_media jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_item jsonb;
begin
  perform public.outreach_assert_admin();
  if p_page_id is null then raise exception 'Page id is required.'; end if;

  delete from public.outreach_page_media where page_id = p_page_id;

  if p_media is not null and jsonb_typeof(p_media) = 'array' then
    for v_item in select value from jsonb_array_elements(p_media)
    loop
      insert into public.outreach_page_media(page_id, media_asset_id, sort_order, caption)
      values (
        p_page_id,
        nullif(v_item ->> 'media_asset_id', '')::uuid,
        coalesce(nullif(v_item ->> 'sort_order', '')::integer, 0),
        nullif(trim(coalesce(v_item ->> 'caption', '')), '')
      );
    end loop;
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.admin_set_outreach_page_media(uuid, jsonb) from public;
grant execute on function public.admin_set_outreach_page_media(uuid, jsonb) to authenticated;

create or replace function public.admin_generate_outreach_token(p_campaign_id uuid, p_max_visits integer default null)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_admin text := public.outreach_assert_admin();
  v_raw text := public.outreach_generate_raw_token();
  v_hash text := public.outreach_hash_token(v_raw);
  v_slug text;
  v_expires timestamptz;
  v_token_id uuid;
begin
  select pg.slug, pg.expires_at into v_slug, v_expires
  from public.outreach_pages pg where pg.campaign_id = p_campaign_id;

  if v_slug is null then raise exception 'Outreach page not found for campaign.'; end if;

  update public.outreach_access_tokens
  set revoked_at = now()
  where campaign_id = p_campaign_id and revoked_at is null;

  insert into public.outreach_access_tokens(campaign_id, token_hash, expires_at, max_visits)
  values (p_campaign_id, v_hash, coalesce(v_expires, now() + interval '90 days'), p_max_visits)
  returning id into v_token_id;

  insert into public.outreach_events(campaign_id, event_type, metadata)
  values (p_campaign_id, 'link_generated', jsonb_build_object('token_id', v_token_id, 'generated_by', v_admin));

  return jsonb_build_object(
    'token_id', v_token_id,
    'raw_token', v_raw,
    'url', public.outreach_build_public_url(v_slug, v_raw),
    'expires_at', coalesce(v_expires, now() + interval '90 days')
  );
end;
$$;

revoke all on function public.admin_generate_outreach_token(uuid, integer) from public;
grant execute on function public.admin_generate_outreach_token(uuid, integer) to authenticated;

create or replace function public.admin_revoke_outreach_token(p_token_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_campaign_id uuid;
begin
  perform public.outreach_assert_admin();

  update public.outreach_access_tokens
  set revoked_at = now()
  where id = p_token_id and revoked_at is null
  returning campaign_id into v_campaign_id;

  if v_campaign_id is null then raise exception 'Active outreach token not found.'; end if;

  insert into public.outreach_events(campaign_id, event_type, metadata)
  values (v_campaign_id, 'token_revoked', jsonb_build_object('token_id', p_token_id));

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.admin_revoke_outreach_token(uuid) from public;
grant execute on function public.admin_revoke_outreach_token(uuid) to authenticated;

create or replace function public.admin_regenerate_outreach_token(p_campaign_id uuid, p_max_visits integer default null)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  perform public.outreach_assert_admin();
  insert into public.outreach_events(campaign_id, event_type)
  values (p_campaign_id, 'token_regenerated');
  return public.admin_generate_outreach_token(p_campaign_id, p_max_visits);
end;
$$;

revoke all on function public.admin_regenerate_outreach_token(uuid, integer) from public;
grant execute on function public.admin_regenerate_outreach_token(uuid, integer) to authenticated;

create or replace function public.admin_record_outreach_sent(
  p_campaign_id uuid,
  p_channel text,
  p_message_body text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_admin text := public.outreach_assert_admin();
begin
  if p_channel not in ('email','whatsapp','instagram','linkedin','manual') then
    raise exception 'Unsupported outreach channel.';
  end if;

  update public.outreach_campaigns
  set status = 'sent',
      outreach_channel = p_channel,
      sent_at = now(),
      updated_at = now()
  where id = p_campaign_id;

  if nullif(trim(coalesce(p_message_body, '')), '') is not null then
    insert into public.outreach_messages(campaign_id, channel, body, generated_by_email, sent_at)
    values (p_campaign_id, p_channel, trim(p_message_body), v_admin, now());
  end if;

  insert into public.outreach_events(campaign_id, event_type, metadata)
  values (p_campaign_id, 'message_sent', jsonb_build_object('channel', p_channel));

  return jsonb_build_object('ok', true, 'status', 'sent');
end;
$$;

revoke all on function public.admin_record_outreach_sent(uuid, text, text) from public;
grant execute on function public.admin_record_outreach_sent(uuid, text, text) to authenticated;

create or replace function public.admin_update_outreach_status(p_campaign_id uuid, p_status text)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  perform public.outreach_assert_admin();
  if p_status not in ('draft','ready','sent','opened','interested','meeting_planned','accepted','declined','no_response','archived') then
    raise exception 'Unsupported outreach status.';
  end if;
  update public.outreach_campaigns set status = p_status, updated_at = now() where id = p_campaign_id;
  return jsonb_build_object('ok', true, 'status', p_status);
end;
$$;

revoke all on function public.admin_update_outreach_status(uuid, text) from public;
grant execute on function public.admin_update_outreach_status(uuid, text) to authenticated;

create or replace function public.admin_generate_outreach_messages(p_campaign_id uuid, p_raw_token text default null)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_contact public.outreach_contacts%rowtype;
  v_page public.outreach_pages%rowtype;
  v_url text;
  v_name text;
  v_subject text;
  v_body text;
  v_wa text;
begin
  perform public.outreach_assert_admin();

  select c.* into v_contact
  from public.outreach_campaigns cam
  join public.outreach_contacts c on c.id = cam.contact_id
  where cam.id = p_campaign_id;

  select pg.* into v_page
  from public.outreach_pages pg
  where pg.campaign_id = p_campaign_id;

  if v_page.id is null then raise exception 'Outreach page not found.'; end if;

  v_url := case
    when nullif(trim(coalesce(p_raw_token, '')), '') is not null
      then public.outreach_build_public_url(v_page.slug, p_raw_token)
    else '[generate token to get magic link]'
  end;
  v_name := trim(concat_ws(' ', v_contact.first_name, v_contact.last_name));
  v_subject := 'A personal page from Bankrupt to 1 Million for ' || coalesce(v_contact.company_name, v_name);
  v_body := 'Hi ' || coalesce(v_contact.first_name, 'there') || E',\n\nWe created a private page especially for you and ' || v_contact.company_name || '.' || E'\n\n';
  if v_page.personal_message is not null then v_body := v_body || v_page.personal_message || E'\n\n'; end if;
  v_body := v_body || 'Open your private page: ' || v_url || E'\n\nKevin & Micha — Bankrupt to 1 Million';

  v_wa := coalesce(nullif(trim(v_page.whatsapp_override), ''), nullif(trim(v_contact.whatsapp), ''), nullif(trim(v_contact.phone), ''));

  return jsonb_build_object(
    'magic_link', v_url,
    'email', jsonb_build_object(
      'subject', v_subject,
      'body', v_body,
      'mailto_url', case when v_contact.email is not null then 'mailto:' || v_contact.email || '?subject=' || replace(v_subject, ' ', '%20') || '&body=' || replace(v_body, E'\n', '%0A') else null end
    ),
    'whatsapp', jsonb_build_object(
      'body', v_body,
      'wa_me_url', case when v_wa is not null then 'https://wa.me/' || regexp_replace(v_wa, '[^0-9]', '', 'g') || '?text=' || replace(v_body, ' ', '%20') else null end
    ),
    'instagram', jsonb_build_object('body', v_body),
    'linkedin', jsonb_build_object('body', v_body)
  );
end;
$$;

revoke all on function public.admin_generate_outreach_messages(uuid, text) from public;
grant execute on function public.admin_generate_outreach_messages(uuid, text) to authenticated;

create or replace function public.admin_import_outreach_from_partnership(p_partnership_contact_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_row jsonb;
  v_first text;
  v_last text;
  v_company text;
begin
  perform public.outreach_assert_admin();

  select to_jsonb(pc.*) into v_row
  from public.partnership_contacts pc
  where pc.id = p_partnership_contact_id;

  if v_row is null then raise exception 'Partnership contact not found.'; end if;

  v_company := coalesce(nullif(trim(coalesce(v_row ->> 'organization', v_row ->> 'company_name', v_row ->> 'company')), ''), 'Partner');
  v_first := coalesce(nullif(trim(coalesce(v_row ->> 'first_name', v_row ->> 'contact_name', v_row ->> 'name')), ''), 'Contact');
  v_last := nullif(trim(coalesce(v_row ->> 'last_name', '')), '');

  return jsonb_build_object(
    'contact', jsonb_build_object(
      'first_name', v_first,
      'last_name', v_last,
      'company_name', v_company,
      'job_title', coalesce(v_row ->> 'role', v_row ->> 'job_title'),
      'email', v_row ->> 'email',
      'phone', v_row ->> 'phone',
      'website', v_row ->> 'website',
      'linkedin', v_row ->> 'linkedin',
      'location', coalesce(v_row ->> 'country', v_row ->> 'location'),
      'language_code', coalesce(v_row ->> 'language_code', 'en'),
      'partnership_contact_id', p_partnership_contact_id
    ),
    'page', jsonb_build_object(
      'why_them', v_row ->> 'outreach_angle',
      'personal_intro', v_row ->> 'why_this_partner'
    )
  );
end;
$$;

revoke all on function public.admin_import_outreach_from_partnership(uuid) from public;
grant execute on function public.admin_import_outreach_from_partnership(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Admin module seed (if table exists)
-- ---------------------------------------------------------------------------

do $$
begin
  if to_regclass('public.admin_modules') is not null then
    insert into public.admin_modules(key, label, route, icon, group_key, display_order, required_roles, is_enabled)
    values ('outreach', 'Outreach', '/admin/outreach', 'messagesquaretext', 'operations', 45, array['admin','editor'], true)
    on conflict (key) do update set
      label = excluded.label,
      route = excluded.route,
      icon = excluded.icon,
      group_key = excluded.group_key,
      display_order = excluded.display_order,
      is_enabled = true,
      updated_at = now();
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- UI translation keys (English + enqueue jobs for remaining languages)
-- ---------------------------------------------------------------------------

insert into public.website_translation_keys
  (translation_key, namespace, description, default_text, value_type, is_required, is_active, interpolation_variables, supports_plural)
values
  ('outreach.private_notice', 'outreach', 'Private page greeting', 'Hi {first_name}, this private page was created especially for you and the {company} team.', 'text', true, true, '{"first_name","company"}', false),
  ('outreach.section.why_them', 'outreach', 'Why them section title', 'Why we are reaching out to you', 'text', true, true, '{}', false),
  ('outreach.section.what_we_offer', 'outreach', 'What we offer section title', 'What we can offer', 'text', true, true, '{}', false),
  ('outreach.section.what_we_ask', 'outreach', 'What we ask section title', 'What we are asking', 'text', true, true, '{}', false),
  ('outreach.section.win_win', 'outreach', 'Win-win section title', 'A win-win collaboration', 'text', true, true, '{}', false),
  ('outreach.section.mission', 'outreach', 'Mission section title', 'The Bankrupt to 1 Million mission', 'text', true, true, '{}', false),
  ('outreach.cta.yes_meet', 'outreach', 'Yes lets meet CTA', 'Yes, let''s meet', 'text', true, true, '{}', false),
  ('outreach.cta.interested', 'outreach', 'Interested CTA', 'I may be interested', 'text', true, true, '{}', false),
  ('outreach.cta.tell_more', 'outreach', 'Tell me more CTA', 'Tell me more', 'text', true, true, '{}', false),
  ('outreach.cta.not_now', 'outreach', 'Not right now CTA', 'Not right now', 'text', true, true, '{}', false),
  ('outreach.cta.schedule_meeting', 'outreach', 'Schedule meeting CTA', 'Schedule a conversation', 'text', true, true, '{}', false),
  ('outreach.cta.whatsapp', 'outreach', 'WhatsApp CTA', 'Chat on WhatsApp', 'text', true, true, '{}', false),
  ('outreach.form.title', 'outreach', 'Response form title', 'Send us a message', 'text', true, true, '{}', false),
  ('outreach.form.message', 'outreach', 'Response form message label', 'Your message', 'text', true, true, '{}', false),
  ('outreach.form.name', 'outreach', 'Response form name label', 'Your name', 'text', true, true, '{}', false),
  ('outreach.form.email', 'outreach', 'Response form email label', 'Email', 'text', true, true, '{}', false),
  ('outreach.form.phone', 'outreach', 'Response form phone label', 'Phone', 'text', true, true, '{}', false),
  ('outreach.form.submit', 'outreach', 'Response form submit', 'Send response', 'text', true, true, '{}', false),
  ('outreach.form.sending', 'outreach', 'Response form sending', 'Sending your response…', 'text', true, true, '{}', false),
  ('outreach.form.success', 'outreach', 'Response form success', 'Thank you. We received your response.', 'text', true, true, '{}', false),
  ('outreach.error.invalid_link', 'outreach', 'Invalid link error', 'This private link is not valid.', 'text', true, true, '{}', false),
  ('outreach.error.expired', 'outreach', 'Expired link error', 'This private link has expired.', 'text', true, true, '{}', false),
  ('outreach.error.revoked', 'outreach', 'Revoked link error', 'This private link is no longer active.', 'text', true, true, '{}', false),
  ('outreach.error.max_visits', 'outreach', 'Max visits error', 'This private link has reached its visit limit.', 'text', true, true, '{}', false),
  ('outreach.error.load_failed', 'outreach', 'Load failed error', 'We could not load this private page.', 'text', true, true, '{}', false),
  ('outreach.loading', 'outreach', 'Loading private page', 'Loading your private page…', 'text', true, true, '{}', false),
  ('admin.outreach.title', 'admin', 'Outreach admin title', 'Outreach', 'text', true, true, '{}', false),
  ('admin.outreach.description', 'admin', 'Outreach admin description', 'Create and track personalized private outreach pages.', 'text', true, true, '{}', false),
  ('admin.outreach.create', 'admin', 'Create outreach button', 'New outreach', 'text', true, true, '{}', false),
  ('admin.outreach.generate_link', 'admin', 'Generate link button', 'Generate secure link', 'text', true, true, '{}', false),
  ('admin.outreach.copy_link', 'admin', 'Copy link button', 'Copy magic link', 'text', true, true, '{}', false),
  ('admin.outreach.mark_sent', 'admin', 'Mark sent button', 'Mark as sent', 'text', true, true, '{}', false)
on conflict (translation_key) do update set
  default_text = excluded.default_text,
  description = excluded.description,
  is_active = true,
  updated_at = now();

insert into public.website_translations
  (translation_key_id, language_code, translated_text, translation_status, translation_source, translated_at, reviewed_at, published_at)
select k.id, 'en', k.default_text, 'published', 'manual', now(), now(), now()
from public.website_translation_keys k
where k.translation_key like 'outreach.%' or k.translation_key like 'admin.outreach.%'
on conflict (translation_key_id, language_code) do update set
  translated_text = excluded.translated_text,
  translation_status = 'published',
  updated_at = now();

do $$
declare
  rec record;
begin
  if to_regprocedure('private.enqueue_translation_job_expansion(text,uuid,text,jsonb,text)') is not null then
    for rec in
      select id, translation_key, default_text
      from public.website_translation_keys
      where translation_key like 'outreach.%' or translation_key like 'admin.outreach.%'
    loop
      perform private.enqueue_translation_job_expansion(
        'website_key',
        rec.id,
        'en',
        jsonb_build_object('translation_key', rec.translation_key, 'default_text', rec.default_text),
        'outreach-pages-v1'
      );
    end loop;
  end if;
end $$;

commit;
