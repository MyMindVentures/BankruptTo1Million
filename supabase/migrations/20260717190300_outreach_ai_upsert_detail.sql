begin;
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
commit;
