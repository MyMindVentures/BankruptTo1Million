begin;

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

commit;
