begin;

-- Fix partnership import mapping to real partnership_contacts columns
create or replace function public.admin_import_outreach_from_partnership(p_partnership_contact_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_row public.partnership_contacts%rowtype;
  v_full text;
  v_first text;
  v_last text;
  v_company text;
begin
  perform public.outreach_assert_admin();

  select * into v_row
  from public.partnership_contacts pc
  where pc.id = p_partnership_contact_id;

  if not found then
    raise exception 'Partnership contact not found.' using errcode = '22023';
  end if;

  v_full := nullif(trim(coalesce(v_row.full_name, '')), '');
  v_first := coalesce(nullif(split_part(v_full, ' ', 1), ''), 'Contact');
  v_last := nullif(trim(substring(v_full from position(' ' in v_full) + 1)), '');
  v_company := coalesce(nullif(trim(coalesce(v_row.organization_name, '')), ''), 'Partner');

  return jsonb_build_object(
    'contact', jsonb_build_object(
      'first_name', v_first,
      'last_name', v_last,
      'company_name', v_company,
      'job_title', v_row.job_title,
      'email', v_row.email,
      'phone', v_row.phone,
      'website', v_row.website_url,
      'linkedin', v_row.linkedin_url,
      'instagram', v_row.instagram_url,
      'location', v_row.country,
      'language_code', coalesce(nullif(trim(coalesce(v_row.preferred_language, '')), ''), 'en'),
      'partnership_contact_id', p_partnership_contact_id
    ),
    'page', jsonb_build_object(
      'why_them', coalesce(v_row.outreach_angle, v_row.why_relevant),
      'personal_intro', v_row.personalized_value_proposition
    ),
    'campaign', jsonb_build_object(
      'category', 'collaboration',
      'status', 'draft'
    )
  );
end;
$$;

revoke all on function public.admin_import_outreach_from_partnership(uuid) from public;
grant execute on function public.admin_import_outreach_from_partnership(uuid) to authenticated;

create or replace function public.admin_list_partnership_contacts_for_outreach(
  p_query text default null,
  p_limit integer default 50
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_q text := '%' || lower(trim(coalesce(p_query, ''))) || '%';
  v_rows jsonb;
begin
  perform public.outreach_assert_admin();

  select coalesce(jsonb_agg(to_jsonb(filtered)), '[]'::jsonb)
  into v_rows
  from (
    select
      pc.id,
      pc.full_name,
      pc.organization_name,
      pc.email,
      pc.country,
      pc.outreach_angle
    from public.partnership_contacts pc
    where coalesce(p_query, '') = ''
      or lower(concat_ws(' ', pc.full_name, pc.organization_name, pc.email, pc.country, pc.outreach_angle)) like v_q
    order by pc.updated_at desc nulls last, pc.created_at desc
    limit greatest(1, least(coalesce(p_limit, 50), 200))
  ) filtered;

  return coalesce(v_rows, '[]'::jsonb);
end;
$$;

revoke all on function public.admin_list_partnership_contacts_for_outreach(text, integer) from public;
grant execute on function public.admin_list_partnership_contacts_for_outreach(text, integer) to authenticated;

create or replace function public.admin_search_media_assets_for_outreach(
  p_query text default null,
  p_limit integer default 40
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_q text := '%' || lower(trim(coalesce(p_query, ''))) || '%';
  v_rows jsonb;
begin
  perform public.outreach_assert_admin();

  select coalesce(jsonb_agg(to_jsonb(filtered)), '[]'::jsonb)
  into v_rows
  from (
    select
      ma.id,
      ma.title,
      ma.asset_type,
      ma.storage_bucket,
      ma.storage_path,
      ma.external_url,
      ma.thumbnail_url,
      ma.status
    from public.media_assets ma
    where coalesce(p_query, '') = ''
      or lower(concat_ws(' ', ma.title, ma.caption, ma.description, ma.asset_type, ma.status)) like v_q
    order by ma.updated_at desc nulls last, ma.created_at desc
    limit greatest(1, least(coalesce(p_limit, 40), 100))
  ) filtered;

  return coalesce(v_rows, '[]'::jsonb);
end;
$$;

revoke all on function public.admin_search_media_assets_for_outreach(text, integer) from public;
grant execute on function public.admin_search_media_assets_for_outreach(text, integer) to authenticated;

-- Enrich outreach detail media with asset metadata
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
    'responses', v_responses
  );
end;
$$;

revoke all on function public.admin_get_outreach_detail(uuid) from public;
grant execute on function public.admin_get_outreach_detail(uuid) to authenticated;

insert into public.website_translation_keys
  (translation_key, namespace, description, default_text, value_type, is_required, is_active, interpolation_variables, supports_plural)
values
  ('admin.outreach.refresh', 'admin', 'Refresh outreach list', 'Refresh', 'text', true, true, '{}', false),
  ('admin.outreach.filter.active', 'admin', 'Active KPI filter label', 'Active filter', 'text', true, true, '{}', false),
  ('admin.outreach.filter.click', 'admin', 'Inactive KPI filter hint', 'Click to filter', 'text', true, true, '{}', false),
  ('admin.outreach.search.placeholder', 'admin', 'Outreach search placeholder', 'Search contact, company or status...', 'text', true, true, '{}', false),
  ('admin.outreach.filter.all_statuses', 'admin', 'All statuses filter option', 'All statuses', 'text', true, true, '{}', false),
  ('admin.outreach.stats.total', 'admin', 'Total outreach count', '{count} total', 'text', true, true, '{"count"}', false),
  ('admin.outreach.stats.shown', 'admin', 'Shown outreach count', '{count} shown', 'text', true, true, '{"count"}', false),
  ('admin.outreach.loading', 'admin', 'Loading outreach records', 'Loading outreach records…', 'text', true, true, '{}', false),
  ('admin.outreach.empty', 'admin', 'Empty outreach filter state', 'No outreach records match this filter.', 'text', true, true, '{}', false),
  ('admin.outreach.card.visits', 'admin', 'Visit count on outreach card', '{count} visits', 'text', true, true, '{"count"}', false),
  ('admin.outreach.editor.title', 'admin', 'Outreach editor fallback title', 'Outreach editor', 'text', true, true, '{}', false),
  ('admin.outreach.close', 'admin', 'Close outreach editor', 'Close', 'text', true, true, '{}', false),
  ('admin.outreach.section.contact', 'admin', 'Contact section heading', 'Contact', 'text', true, true, '{}', false),
  ('admin.outreach.section.campaign', 'admin', 'Campaign section heading', 'Campaign', 'text', true, true, '{}', false),
  ('admin.outreach.section.page_content', 'admin', 'Page content section heading', 'Page content', 'text', true, true, '{}', false),
  ('admin.outreach.section.media', 'admin', 'Page media section heading', 'Page media', 'text', true, true, '{}', false),
  ('admin.outreach.section.messages', 'admin', 'Generated messages section heading', 'Generated messages', 'text', true, true, '{}', false),
  ('admin.outreach.section.responses', 'admin', 'Responses section heading', 'Responses', 'text', true, true, '{}', false),
  ('admin.outreach.section.events', 'admin', 'Recent events section heading', 'Recent events', 'text', true, true, '{}', false),
  ('admin.outreach.field.first_name', 'admin', 'First name field', 'First name', 'text', true, true, '{}', false),
  ('admin.outreach.field.last_name', 'admin', 'Last name field', 'Last name', 'text', true, true, '{}', false),
  ('admin.outreach.field.company', 'admin', 'Company field', 'Company', 'text', true, true, '{}', false),
  ('admin.outreach.field.job_title', 'admin', 'Job title field', 'Job title', 'text', true, true, '{}', false),
  ('admin.outreach.field.email', 'admin', 'Email field', 'Email', 'text', true, true, '{}', false),
  ('admin.outreach.field.phone', 'admin', 'Phone field', 'Phone', 'text', true, true, '{}', false),
  ('admin.outreach.field.whatsapp', 'admin', 'WhatsApp field', 'WhatsApp', 'text', true, true, '{}', false),
  ('admin.outreach.field.website', 'admin', 'Website field', 'Website', 'text', true, true, '{}', false),
  ('admin.outreach.field.language', 'admin', 'Language field', 'Language', 'text', true, true, '{}', false),
  ('admin.outreach.field.category', 'admin', 'Category field', 'Category', 'text', true, true, '{}', false),
  ('admin.outreach.field.responsible_email', 'admin', 'Responsible email field', 'Responsible email', 'text', true, true, '{}', false),
  ('admin.outreach.field.internal_notes', 'admin', 'Internal notes field', 'Internal notes', 'text', true, true, '{}', false),
  ('admin.outreach.field.slug', 'admin', 'Slug field', 'Slug', 'text', true, true, '{}', false),
  ('admin.outreach.field.personal_intro', 'admin', 'Personal intro field', 'Personal intro', 'text', true, true, '{}', false),
  ('admin.outreach.field.why_them', 'admin', 'Why them field', 'Why them', 'text', true, true, '{}', false),
  ('admin.outreach.field.what_we_offer', 'admin', 'What we offer field', 'What we offer', 'text', true, true, '{}', false),
  ('admin.outreach.field.what_we_ask', 'admin', 'What we ask field', 'What we ask', 'text', true, true, '{}', false),
  ('admin.outreach.field.win_win', 'admin', 'Win-win field', 'Win-win', 'text', true, true, '{}', false),
  ('admin.outreach.field.personal_message', 'admin', 'Personal message field', 'Personal message', 'text', true, true, '{}', false),
  ('admin.outreach.field.mission_blurb', 'admin', 'Mission blurb field', 'Mission blurb', 'text', true, true, '{}', false),
  ('admin.outreach.field.meeting_url', 'admin', 'Meeting URL field', 'Meeting URL', 'text', true, true, '{}', false),
  ('admin.outreach.field.founder_video', 'admin', 'Founder video field', 'Founder video', 'text', true, true, '{}', false),
  ('admin.outreach.field.media_caption', 'admin', 'Media caption field', 'Caption', 'text', true, true, '{}', false),
  ('admin.outreach.save', 'admin', 'Save outreach button', 'Save outreach', 'text', true, true, '{}', false),
  ('admin.outreach.mark_ready', 'admin', 'Mark ready button', 'Mark ready', 'text', true, true, '{}', false),
  ('admin.outreach.regenerate_link', 'admin', 'Regenerate link button', 'Regenerate link', 'text', true, true, '{}', false),
  ('admin.outreach.revoke_link', 'admin', 'Revoke link button', 'Revoke link', 'text', true, true, '{}', false),
  ('admin.outreach.copied', 'admin', 'Copied link confirmation', 'Copied', 'text', true, true, '{}', false),
  ('admin.outreach.message.email', 'admin', 'Email message label', 'Email', 'text', true, true, '{}', false),
  ('admin.outreach.message.whatsapp', 'admin', 'WhatsApp message label', 'WhatsApp', 'text', true, true, '{}', false),
  ('admin.outreach.message.instagram', 'admin', 'Instagram message label', 'Instagram', 'text', true, true, '{}', false),
  ('admin.outreach.message.linkedin', 'admin', 'LinkedIn message label', 'LinkedIn', 'text', true, true, '{}', false),
  ('admin.outreach.message.open_mailto', 'admin', 'Open mailto link', 'Open mailto', 'text', true, true, '{}', false),
  ('admin.outreach.message.open_whatsapp', 'admin', 'Open WhatsApp link', 'Open WhatsApp', 'text', true, true, '{}', false),
  ('admin.outreach.error.load', 'admin', 'Outreach list load error', 'Outreach data could not be loaded.', 'text', true, true, '{}', false),
  ('admin.outreach.error.detail', 'admin', 'Outreach detail load error', 'Outreach detail could not be loaded.', 'text', true, true, '{}', false),
  ('admin.outreach.error.save_id', 'admin', 'Missing campaign id after save', 'Saved outreach campaign id missing.', 'text', true, true, '{}', false),
  ('admin.outreach.error.save', 'admin', 'Outreach save error', 'Outreach could not be saved.', 'text', true, true, '{}', false),
  ('admin.outreach.error.link', 'admin', 'Link generation error', 'Secure link could not be generated.', 'text', true, true, '{}', false),
  ('admin.outreach.error.mark_sent', 'admin', 'Mark sent error', 'Outreach could not be marked as sent.', 'text', true, true, '{}', false),
  ('admin.outreach.error.status', 'admin', 'Status update error', 'Status update failed.', 'text', true, true, '{}', false),
  ('admin.outreach.error.revoke', 'admin', 'Token revoke error', 'Token revoke failed.', 'text', true, true, '{}', false),
  ('admin.outreach.import.title', 'admin', 'Import from partnership title', 'Import from partnership', 'text', true, true, '{}', false),
  ('admin.outreach.import.placeholder', 'admin', 'Partnership search placeholder', 'Search partnership contacts...', 'text', true, true, '{}', false),
  ('admin.outreach.import.button', 'admin', 'Import partnership contact button', 'Import contact', 'text', true, true, '{}', false),
  ('admin.outreach.import.loading', 'admin', 'Loading partnership contacts', 'Loading partnership contacts…', 'text', true, true, '{}', false),
  ('admin.outreach.import.empty', 'admin', 'No partnership contacts found', 'No partnership contacts found.', 'text', true, true, '{}', false),
  ('admin.outreach.import.error', 'admin', 'Partnership import error', 'Partnership import failed.', 'text', true, true, '{}', false),
  ('admin.outreach.media.add', 'admin', 'Add media button', 'Add media', 'text', true, true, '{}', false),
  ('admin.outreach.media.search_placeholder', 'admin', 'Media search placeholder', 'Search media assets...', 'text', true, true, '{}', false),
  ('admin.outreach.media.save', 'admin', 'Save media button', 'Save media', 'text', true, true, '{}', false),
  ('admin.outreach.media.empty', 'admin', 'No media linked state', 'No media linked yet.', 'text', true, true, '{}', false),
  ('admin.outreach.media.error', 'admin', 'Media save error', 'Media could not be saved.', 'text', true, true, '{}', false),
  ('admin.outreach.media.remove', 'admin', 'Remove media button', 'Remove', 'text', true, true, '{}', false),
  ('admin.outreach.media.requires_save', 'admin', 'Save outreach before media hint', 'Save the outreach page before linking media.', 'text', true, true, '{}', false),
  ('admin.outreach.status.draft', 'admin', 'Draft status label', 'Draft', 'text', true, true, '{}', false),
  ('admin.outreach.status.ready', 'admin', 'Ready status label', 'Ready', 'text', true, true, '{}', false),
  ('admin.outreach.status.sent', 'admin', 'Sent status label', 'Sent', 'text', true, true, '{}', false),
  ('admin.outreach.status.opened', 'admin', 'Opened status label', 'Opened', 'text', true, true, '{}', false),
  ('admin.outreach.status.interested', 'admin', 'Interested status label', 'Interested', 'text', true, true, '{}', false),
  ('admin.outreach.status.meeting_planned', 'admin', 'Meeting planned status label', 'Meeting planned', 'text', true, true, '{}', false),
  ('admin.outreach.status.accepted', 'admin', 'Accepted status label', 'Accepted', 'text', true, true, '{}', false),
  ('admin.outreach.status.declined', 'admin', 'Declined status label', 'Declined', 'text', true, true, '{}', false),
  ('admin.outreach.status.no_response', 'admin', 'No response status label', 'No response', 'text', true, true, '{}', false),
  ('admin.outreach.status.archived', 'admin', 'Archived status label', 'Archived', 'text', true, true, '{}', false),
  ('admin.outreach.category.work', 'admin', 'Work category label', 'Work', 'text', true, true, '{}', false),
  ('admin.outreach.category.collaboration', 'admin', 'Collaboration category label', 'Collaboration', 'text', true, true, '{}', false),
  ('admin.outreach.category.hosting', 'admin', 'Hosting category label', 'Hosting', 'text', true, true, '{}', false),
  ('admin.outreach.category.sponsoring', 'admin', 'Sponsoring category label', 'Sponsoring', 'text', true, true, '{}', false),
  ('admin.outreach.category.investment', 'admin', 'Investment category label', 'Investment', 'text', true, true, '{}', false),
  ('admin.outreach.category.technical_support', 'admin', 'Technical support category label', 'Technical support', 'text', true, true, '{}', false)
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
      where translation_key like 'admin.outreach.%'
        and translation_key not in (
          'admin.outreach.title',
          'admin.outreach.description',
          'admin.outreach.create',
          'admin.outreach.generate_link',
          'admin.outreach.copy_link',
          'admin.outreach.mark_sent'
        )
    loop
      perform private.enqueue_translation_job_expansion(
        'website_key',
        rec.id,
        'en',
        jsonb_build_object('translation_key', rec.translation_key, 'default_text', rec.default_text),
        'outreach-admin-ui-v1'
      );
    end loop;
  end if;
end $$;

commit;
