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
