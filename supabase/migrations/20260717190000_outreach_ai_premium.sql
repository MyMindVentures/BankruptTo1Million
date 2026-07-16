begin;

-- ---------------------------------------------------------------------------
-- AI columns on outreach_campaigns
-- ---------------------------------------------------------------------------

alter table public.outreach_campaigns
  add column if not exists ai_brief text,
  add column if not exists ai_generation_status text not null default 'not_requested'
    check (ai_generation_status in ('not_requested', 'generating', 'completed', 'failed')),
  add column if not exists ai_generated_at timestamptz,
  add column if not exists ai_generation_error text;

-- ---------------------------------------------------------------------------
-- outreach_ai_sources (private brief + generated payload audit)
-- ---------------------------------------------------------------------------

create table if not exists public.outreach_ai_sources (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null unique references public.outreach_campaigns(id) on delete cascade,
  brief text not null default '',
  context_snapshot jsonb not null default '{}'::jsonb,
  generated_payload jsonb,
  generation_status text not null default 'not_requested'
    check (generation_status in ('not_requested', 'generating', 'completed', 'failed')),
  last_error text,
  updated_at timestamptz not null default now()
);

create index if not exists outreach_ai_sources_campaign_idx on public.outreach_ai_sources(campaign_id);

alter table public.outreach_ai_sources enable row level security;

drop trigger if exists set_outreach_ai_sources_updated_at on public.outreach_ai_sources;
create trigger set_outreach_ai_sources_updated_at before update on public.outreach_ai_sources
for each row execute function public.set_outreach_updated_at();

-- ---------------------------------------------------------------------------
-- AI context loader for Edge Function
-- ---------------------------------------------------------------------------

create or replace function public.get_outreach_ai_generation_context(p_campaign_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_contact public.outreach_contacts%rowtype;
  v_campaign public.outreach_campaigns%rowtype;
  v_page public.outreach_pages%rowtype;
  v_source public.outreach_ai_sources%rowtype;
  v_partnership jsonb;
  v_language text;
begin
  select * into v_campaign from public.outreach_campaigns where id = p_campaign_id;
  if v_campaign.id is null then
    raise exception 'Outreach campaign not found.' using errcode = '22023';
  end if;

  select * into v_contact from public.outreach_contacts where id = v_campaign.contact_id;
  select * into v_page from public.outreach_pages where campaign_id = p_campaign_id;

  if v_contact.id is null then
    raise exception 'Outreach contact not found.' using errcode = '22023';
  end if;

  select * into v_source from public.outreach_ai_sources where campaign_id = p_campaign_id;

  if v_contact.partnership_contact_id is not null then
    select to_jsonb(pc.*) into v_partnership
    from public.partnership_contacts pc
    where pc.id = v_contact.partnership_contact_id;
  end if;

  v_language := coalesce(
    nullif(trim(coalesce(v_page.original_language, '')), ''),
    nullif(trim(coalesce(v_contact.language_code, '')), ''),
    'en'
  );

  return jsonb_build_object(
    'campaign_id', p_campaign_id,
    'language_code', v_language,
    'contact', jsonb_build_object(
      'first_name', v_contact.first_name,
      'last_name', v_contact.last_name,
      'company_name', v_contact.company_name,
      'job_title', v_contact.job_title,
      'email', v_contact.email,
      'location', v_contact.location,
      'website', v_contact.website,
      'language_code', v_contact.language_code
    ),
    'campaign', jsonb_build_object(
      'category', v_campaign.category,
      'status', v_campaign.status,
      'internal_notes', v_campaign.internal_notes,
      'ai_brief', coalesce(v_source.brief, v_campaign.ai_brief)
    ),
    'page', jsonb_build_object(
      'slug', v_page.slug,
      'personal_intro', v_page.personal_intro,
      'why_them', v_page.why_them,
      'what_we_offer', v_page.what_we_offer,
      'what_we_ask', v_page.what_we_ask,
      'win_win', v_page.win_win,
      'personal_message', v_page.personal_message,
      'mission_blurb', v_page.mission_blurb,
      'original_language', v_page.original_language
    ),
    'partnership', coalesce(v_partnership, '{}'::jsonb),
    'brief', coalesce(nullif(trim(coalesce(v_source.brief, v_campaign.ai_brief, '')), ''), '')
  );
end;
$$;

revoke all on function public.get_outreach_ai_generation_context(uuid) from public;
grant execute on function public.get_outreach_ai_generation_context(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- admin_prepare_outreach_ai
-- ---------------------------------------------------------------------------

create or replace function public.admin_prepare_outreach_ai(
  p_campaign_id uuid,
  p_brief text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_brief text := trim(coalesce(p_brief, ''));
begin
  perform public.outreach_assert_admin();

  if not exists (select 1 from public.outreach_campaigns where id = p_campaign_id) then
    raise exception 'Outreach campaign not found.' using errcode = '22023';
  end if;

  update public.outreach_campaigns
  set ai_brief = nullif(v_brief, ''),
      ai_generation_status = 'not_requested',
      ai_generation_error = null,
      updated_at = now()
  where id = p_campaign_id;

  insert into public.outreach_ai_sources(campaign_id, brief, generation_status, last_error, context_snapshot)
  values (p_campaign_id, coalesce(v_brief, ''), 'not_requested', null, '{}'::jsonb)
  on conflict (campaign_id) do update set
    brief = excluded.brief,
    generation_status = 'not_requested',
    last_error = null,
    updated_at = now();

  return jsonb_build_object('ok', true, 'campaign_id', p_campaign_id);
end;
$$;

revoke all on function public.admin_prepare_outreach_ai(uuid, text) from public;
grant execute on function public.admin_prepare_outreach_ai(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- admin_get_outreach_ai_status
-- ---------------------------------------------------------------------------

create or replace function public.admin_get_outreach_ai_status(p_campaign_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_campaign public.outreach_campaigns%rowtype;
  v_source public.outreach_ai_sources%rowtype;
  v_page public.outreach_pages%rowtype;
begin
  perform public.outreach_assert_admin();

  select * into v_campaign from public.outreach_campaigns where id = p_campaign_id;
  if v_campaign.id is null then raise exception 'Outreach campaign not found.' using errcode = '22023'; end if;

  select * into v_source from public.outreach_ai_sources where campaign_id = p_campaign_id;
  select * into v_page from public.outreach_pages where campaign_id = p_campaign_id;

  return jsonb_build_object(
    'campaign_id', p_campaign_id,
    'ai_generation_status', coalesce(v_source.generation_status, v_campaign.ai_generation_status, 'not_requested'),
    'ai_generated_at', v_campaign.ai_generated_at,
    'ai_generation_error', coalesce(v_source.last_error, v_campaign.ai_generation_error),
    'brief', coalesce(v_source.brief, v_campaign.ai_brief, ''),
    'generated_payload', coalesce(v_source.generated_payload, '{}'::jsonb),
    'page', jsonb_build_object(
      'personal_intro', v_page.personal_intro,
      'why_them', v_page.why_them,
      'what_we_offer', v_page.what_we_offer,
      'what_we_ask', v_page.what_we_ask,
      'win_win', v_page.win_win,
      'personal_message', v_page.personal_message,
      'mission_blurb', v_page.mission_blurb,
      'original_language', v_page.original_language
    )
  );
end;
$$;

revoke all on function public.admin_get_outreach_ai_status(uuid) from public;
grant execute on function public.admin_get_outreach_ai_status(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Extend admin_upsert_outreach_campaign to persist ai_brief
-- ---------------------------------------------------------------------------

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
      contact_id, category, status, outreach_channel, responsible_email, internal_notes, ai_brief
    ) values (
      v_contact_id,
      coalesce(nullif(trim(coalesce(p_payload #>> '{campaign,category}', '')), ''), 'collaboration'),
      coalesce(nullif(trim(coalesce(p_payload #>> '{campaign,status}', '')), ''), 'draft'),
      nullif(trim(coalesce(p_payload #>> '{campaign,outreach_channel}', '')), ''),
      coalesce(nullif(trim(coalesce(p_payload #>> '{campaign,responsible_email}', '')), ''), v_admin),
      nullif(trim(coalesce(p_payload #>> '{campaign,internal_notes}', '')), ''),
      nullif(trim(coalesce(p_payload #>> '{campaign,ai_brief}', '')), '')
    ) returning id into v_campaign_id;
  else
    update public.outreach_campaigns set
      category = coalesce(nullif(trim(coalesce(p_payload #>> '{campaign,category}', '')), ''), category),
      status = coalesce(nullif(trim(coalesce(p_payload #>> '{campaign,status}', '')), ''), status),
      outreach_channel = nullif(trim(coalesce(p_payload #>> '{campaign,outreach_channel}', '')), ''),
      responsible_email = coalesce(nullif(trim(coalesce(p_payload #>> '{campaign,responsible_email}', '')), ''), responsible_email),
      internal_notes = nullif(trim(coalesce(p_payload #>> '{campaign,internal_notes}', '')), ''),
      ai_brief = coalesce(nullif(trim(coalesce(p_payload #>> '{campaign,ai_brief}', '')), ''), ai_brief),
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

  if nullif(trim(coalesce(p_payload #>> '{campaign,ai_brief}', '')), '') is not null then
    insert into public.outreach_ai_sources(campaign_id, brief)
    values (v_campaign_id, trim(p_payload #>> '{campaign,ai_brief}'))
    on conflict (campaign_id) do update set
      brief = excluded.brief,
      updated_at = now();
  end if;

  return public.admin_get_outreach_detail(v_campaign_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- Extend admin_get_outreach_detail with ai_source
-- ---------------------------------------------------------------------------

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
  v_ai_source jsonb;
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

  select to_jsonb(s.*) into v_ai_source from public.outreach_ai_sources s where s.campaign_id = p_campaign_id;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', opm.id,
      'media_asset_id', opm.media_asset_id,
      'sort_order', opm.sort_order,
      'caption', opm.caption,
      'title', ma.title,
      'asset_type', ma.asset_type,
      'storage_bucket', ma.storage_bucket,
      'storage_path', ma.storage_path,
      'external_url', ma.external_url,
      'thumbnail_url', ma.thumbnail_url
    ) order by opm.sort_order
  ), '[]'::jsonb)
  into v_media
  from public.outreach_page_media opm
  join public.outreach_pages pg on pg.id = opm.page_id
  left join public.media_assets ma on ma.id = opm.media_asset_id
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
    'responses', v_responses,
    'ai_source', v_ai_source
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Translation keys for premium editor + AI
-- ---------------------------------------------------------------------------

insert into public.website_translation_keys
  (translation_key, namespace, description, default_text, value_type, is_required, is_active, interpolation_variables, supports_plural)
values
  ('admin.outreach.tab.contact', 'admin', 'Contact tab label', 'Contact', 'text', true, true, '{}', false),
  ('admin.outreach.tab.campaign', 'admin', 'Campaign tab label', 'Campaign', 'text', true, true, '{}', false),
  ('admin.outreach.tab.page', 'admin', 'Page tab label', 'Page', 'text', true, true, '{}', false),
  ('admin.outreach.tab.media', 'admin', 'Media tab label', 'Media', 'text', true, true, '{}', false),
  ('admin.outreach.tab.send', 'admin', 'Send tab label', 'Send', 'text', true, true, '{}', false),
  ('admin.outreach.field.instagram', 'admin', 'Instagram field', 'Instagram', 'text', true, true, '{}', false),
  ('admin.outreach.field.linkedin', 'admin', 'LinkedIn field', 'LinkedIn', 'text', true, true, '{}', false),
  ('admin.outreach.field.location', 'admin', 'Location field', 'Location', 'text', true, true, '{}', false),
  ('admin.outreach.field.outreach_channel', 'admin', 'Outreach channel field', 'Outreach channel', 'text', true, true, '{}', false),
  ('admin.outreach.field.status', 'admin', 'Status field', 'Status', 'text', true, true, '{}', false),
  ('admin.outreach.field.whatsapp_override', 'admin', 'WhatsApp override field', 'WhatsApp override', 'text', true, true, '{}', false),
  ('admin.outreach.field.original_language', 'admin', 'Original language field', 'Page language', 'text', true, true, '{}', false),
  ('admin.outreach.field.expires_at', 'admin', 'Expires at field', 'Page expires', 'text', true, true, '{}', false),
  ('admin.outreach.field.max_visits', 'admin', 'Max visits field', 'Max visits', 'text', true, true, '{}', false),
  ('admin.outreach.field.ai_brief', 'admin', 'AI brief field', 'Private AI brief', 'text', true, true, '{}', false),
  ('admin.outreach.ai.brief_hint', 'admin', 'AI brief hint', 'Write quick private notes. AI uses these plus contact data to draft page copy.', 'text', true, true, '{}', false),
  ('admin.outreach.ai.generate', 'admin', 'Generate AI copy button', 'Generate page copy', 'text', true, true, '{}', false),
  ('admin.outreach.ai.generating', 'admin', 'AI generating state', 'Generating page copy…', 'text', true, true, '{}', false),
  ('admin.outreach.ai.completed', 'admin', 'AI completed state', 'AI copy ready for review', 'text', true, true, '{}', false),
  ('admin.outreach.ai.failed', 'admin', 'AI failed state', 'AI generation failed.', 'text', true, true, '{}', false),
  ('admin.outreach.ai.apply', 'admin', 'Apply AI copy button', 'Apply AI copy to form', 'text', true, true, '{}', false),
  ('admin.outreach.ai.requires_brief', 'admin', 'AI brief required', 'Add a private AI brief before generating.', 'text', true, true, '{}', false),
  ('admin.outreach.ai.requires_save', 'admin', 'Save before AI', 'Save the outreach campaign before generating AI copy.', 'text', true, true, '{}', false),
  ('admin.outreach.readiness.title', 'admin', 'Readiness checklist title', 'Readiness', 'text', true, true, '{}', false),
  ('admin.outreach.readiness.contact', 'admin', 'Contact readiness', 'Contact details', 'text', true, true, '{}', false),
  ('admin.outreach.readiness.page', 'admin', 'Page readiness', 'Page copy', 'text', true, true, '{}', false),
  ('admin.outreach.readiness.slug', 'admin', 'Slug readiness', 'Slug set', 'text', true, true, '{}', false),
  ('admin.outreach.validation.required_contact', 'admin', 'Required contact validation', 'First name and company are required.', 'text', true, true, '{}', false),
  ('admin.outreach.validation.ready_warning', 'admin', 'Ready warning', 'Add personal intro and why them before marking ready.', 'text', true, true, '{}', false),
  ('admin.outreach.sidebar.language', 'admin', 'Sidebar language label', 'Copy language', 'text', true, true, '{}', false),
  ('admin.outreach.sidebar.expires', 'admin', 'Sidebar expiry label', 'Page expires', 'text', true, true, '{}', false),
  ('admin.outreach.sidebar.open_page', 'admin', 'Open private page link', 'Open private page', 'text', true, true, '{}', false),
  ('admin.outreach.channel.email', 'admin', 'Email channel', 'Email', 'text', true, true, '{}', false),
  ('admin.outreach.channel.whatsapp', 'admin', 'WhatsApp channel', 'WhatsApp', 'text', true, true, '{}', false),
  ('admin.outreach.channel.instagram', 'admin', 'Instagram channel', 'Instagram', 'text', true, true, '{}', false),
  ('admin.outreach.channel.linkedin', 'admin', 'LinkedIn channel', 'LinkedIn', 'text', true, true, '{}', false),
  ('admin.outreach.channel.manual', 'admin', 'Manual channel', 'Manual', 'text', true, true, '{}', false),
  ('admin.outreach.meta.visits', 'admin', 'Visit count meta', '{count} visits', 'text', true, true, '{"count"}', false),
  ('admin.outreach.meta.sent_at', 'admin', 'Sent at meta', 'Sent {date}', 'text', true, true, '{"date"}', false),
  ('admin.outreach.meta.last_opened', 'admin', 'Last opened meta', 'Last opened {date}', 'text', true, true, '{"date"}', false),
  ('admin.outreach.error.session', 'admin', 'Invalid admin session', 'No valid admin session.', 'text', true, true, '{}', false),
  ('admin.outreach.media.move_up', 'admin', 'Move media up', 'Move up', 'text', true, true, '{}', false),
  ('admin.outreach.media.move_down', 'admin', 'Move media down', 'Move down', 'text', true, true, '{}', false)
on conflict (translation_key) do update set
  default_text = excluded.default_text,
  description = excluded.description,
  is_active = true,
  updated_at = now();

insert into public.website_translations
  (translation_key_id, language_code, translated_text, translation_status, translation_source, translated_at, reviewed_at, published_at)
select k.id, 'en', k.default_text, 'published', 'manual', now(), now(), now()
from public.website_translation_keys k
where k.translation_key like 'admin.outreach.%'
  and k.translation_key in (
    'admin.outreach.tab.contact', 'admin.outreach.tab.campaign', 'admin.outreach.tab.page', 'admin.outreach.tab.media', 'admin.outreach.tab.send',
    'admin.outreach.field.instagram', 'admin.outreach.field.linkedin', 'admin.outreach.field.location',
    'admin.outreach.field.outreach_channel', 'admin.outreach.field.status', 'admin.outreach.field.whatsapp_override',
    'admin.outreach.field.original_language', 'admin.outreach.field.expires_at', 'admin.outreach.field.max_visits',
    'admin.outreach.field.ai_brief', 'admin.outreach.ai.brief_hint', 'admin.outreach.ai.generate', 'admin.outreach.ai.generating',
    'admin.outreach.ai.completed', 'admin.outreach.ai.failed', 'admin.outreach.ai.apply', 'admin.outreach.ai.requires_brief',
    'admin.outreach.ai.requires_save', 'admin.outreach.readiness.title', 'admin.outreach.readiness.contact',
    'admin.outreach.readiness.page', 'admin.outreach.readiness.slug', 'admin.outreach.validation.required_contact',
    'admin.outreach.validation.ready_warning', 'admin.outreach.sidebar.language', 'admin.outreach.sidebar.expires',
    'admin.outreach.sidebar.open_page', 'admin.outreach.channel.email', 'admin.outreach.channel.whatsapp',
    'admin.outreach.channel.instagram', 'admin.outreach.channel.linkedin', 'admin.outreach.channel.manual',
    'admin.outreach.meta.visits', 'admin.outreach.meta.sent_at', 'admin.outreach.meta.last_opened',
    'admin.outreach.error.session', 'admin.outreach.media.move_up', 'admin.outreach.media.move_down'
  )
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
      where translation_key in (
        'admin.outreach.tab.contact', 'admin.outreach.tab.campaign', 'admin.outreach.tab.page', 'admin.outreach.tab.media', 'admin.outreach.tab.send',
        'admin.outreach.field.instagram', 'admin.outreach.field.linkedin', 'admin.outreach.field.location',
        'admin.outreach.field.outreach_channel', 'admin.outreach.field.status', 'admin.outreach.field.whatsapp_override',
        'admin.outreach.field.original_language', 'admin.outreach.field.expires_at', 'admin.outreach.field.max_visits',
        'admin.outreach.field.ai_brief', 'admin.outreach.ai.brief_hint', 'admin.outreach.ai.generate', 'admin.outreach.ai.generating',
        'admin.outreach.ai.completed', 'admin.outreach.ai.failed', 'admin.outreach.ai.apply', 'admin.outreach.ai.requires_brief',
        'admin.outreach.ai.requires_save', 'admin.outreach.readiness.title', 'admin.outreach.readiness.contact',
        'admin.outreach.readiness.page', 'admin.outreach.readiness.slug', 'admin.outreach.validation.required_contact',
        'admin.outreach.validation.ready_warning', 'admin.outreach.sidebar.language', 'admin.outreach.sidebar.expires',
        'admin.outreach.sidebar.open_page', 'admin.outreach.channel.email', 'admin.outreach.channel.whatsapp',
        'admin.outreach.channel.instagram', 'admin.outreach.channel.linkedin', 'admin.outreach.channel.manual',
        'admin.outreach.meta.visits', 'admin.outreach.meta.sent_at', 'admin.outreach.meta.last_opened',
        'admin.outreach.error.session', 'admin.outreach.media.move_up', 'admin.outreach.media.move_down'
      )
    loop
      perform private.enqueue_translation_job_expansion(
        'website_key',
        rec.id,
        'en',
        jsonb_build_object('translation_key', rec.translation_key, 'default_text', rec.default_text),
        'outreach-ai-premium-v1'
      );
    end loop;
  end if;
end $$;

commit;
