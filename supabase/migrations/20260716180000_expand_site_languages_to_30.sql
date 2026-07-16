begin;

-- Expand active site languages from 15 to 30 (deactivate ja/ko).
insert into public.site_languages (code, english_name, native_name, is_rtl, is_active, display_order)
values
  ('ro', 'Romanian', 'Română', false, true, 90),
  ('uk', 'Ukrainian', 'Українська', false, true, 100),
  ('ru', 'Russian', 'Русский', false, true, 110),
  ('sv', 'Swedish', 'Svenska', false, true, 120),
  ('no', 'Norwegian', 'Norsk', false, true, 130),
  ('da', 'Danish', 'Dansk', false, true, 140),
  ('fi', 'Finnish', 'Suomi', false, true, 150),
  ('el', 'Greek', 'Ελληνικά', false, true, 160),
  ('sk', 'Slovak', 'Slovenčina', false, true, 180),
  ('sl', 'Slovenian', 'Slovenščina', false, true, 190),
  ('hu', 'Hungarian', 'Magyar', false, true, 200),
  ('hr', 'Croatian', 'Hrvatski', false, true, 210),
  ('sr', 'Serbian', 'Српски', false, true, 220),
  ('bg', 'Bulgarian', 'Български', false, true, 230),
  ('lt', 'Lithuanian', 'Lietuvių', false, true, 240),
  ('lv', 'Latvian', 'Latviešu', false, true, 250),
  ('et', 'Estonian', 'Eesti', false, true, 260)
on conflict (code) do update set
  english_name = excluded.english_name,
  native_name = excluded.native_name,
  is_rtl = excluded.is_rtl,
  is_active = true,
  display_order = excluded.display_order;

update public.site_languages as sl
set
  english_name = v.english_name,
  native_name = v.native_name,
  is_rtl = v.is_rtl,
  is_active = v.is_active,
  display_order = v.display_order
from (
  values
    ('en', 'English', 'English', false, true, 10),
    ('es', 'Spanish', 'Español', false, true, 20),
    ('nl', 'Dutch', 'Nederlands', false, true, 30),
    ('fr', 'French', 'Français', false, true, 40),
    ('de', 'German', 'Deutsch', false, true, 50),
    ('it', 'Italian', 'Italiano', false, true, 60),
    ('pt', 'Portuguese', 'Português', false, true, 70),
    ('pl', 'Polish', 'Polski', false, true, 80),
    ('ro', 'Romanian', 'Română', false, true, 90),
    ('uk', 'Ukrainian', 'Українська', false, true, 100),
    ('ru', 'Russian', 'Русский', false, true, 110),
    ('sv', 'Swedish', 'Svenska', false, true, 120),
    ('no', 'Norwegian', 'Norsk', false, true, 130),
    ('da', 'Danish', 'Dansk', false, true, 140),
    ('fi', 'Finnish', 'Suomi', false, true, 150),
    ('el', 'Greek', 'Ελληνικά', false, true, 160),
    ('cs', 'Czech', 'Čeština', false, true, 170),
    ('sk', 'Slovak', 'Slovenčina', false, true, 180),
    ('sl', 'Slovenian', 'Slovenščina', false, true, 190),
    ('hu', 'Hungarian', 'Magyar', false, true, 200),
    ('hr', 'Croatian', 'Hrvatski', false, true, 210),
    ('sr', 'Serbian', 'Српски', false, true, 220),
    ('bg', 'Bulgarian', 'Български', false, true, 230),
    ('lt', 'Lithuanian', 'Lietuvių', false, true, 240),
    ('lv', 'Latvian', 'Latviešu', false, true, 250),
    ('et', 'Estonian', 'Eesti', false, true, 260),
    ('tr', 'Turkish', 'Türkçe', false, true, 270),
    ('ar', 'Arabic', 'العربية', true, true, 280),
    ('zh', 'Chinese', '中文', false, true, 290),
    ('hi', 'Hindi', 'हिन्दी', false, true, 300),
    ('ja', 'Japanese', '日本語', false, false, 910),
    ('ko', 'Korean', '한국어', false, false, 920)
) as v(code, english_name, native_name, is_rtl, is_active, display_order)
where sl.code = v.code;

insert into public.website_translation_keys
  (translation_key, namespace, description, default_text, value_type, is_required, is_active, interpolation_variables, supports_plural)
values
  ('journal.admin.page_subtitle', 'journal', 'Journal admin page subtitle', 'Capture an event on location and publish an AI-polished story in {count} languages.', 'text', true, true, '{count}', false),
  ('journal.admin.translating_progress', 'journal', 'Journal admin translating progress', 'Translating {count} languages… ({current}/{count})', 'text', true, true, '{current,count}', false),
  ('journal.admin.publish_success', 'journal', 'Journal admin publish success', 'Published successfully in {count} languages.', 'text', true, true, '{count}', false),
  ('journal.admin.publish_button_create', 'journal', 'Journal admin publish button create', 'Generate and publish in {count} languages', 'text', true, true, '{count}', false),
  ('journal.admin.publish_button_update', 'journal', 'Journal admin publish button update', 'Regenerate and update public story', 'text', true, true, '{}', false),
  ('journal.admin.ai_output_notice', 'journal', 'Journal admin AI output notice', 'OpenRouter generates the public title, subtitle, excerpt, full story and SEO copy in English plus {count} translations.', 'text', true, true, '{count}', false)
on conflict (translation_key) do update set
  default_text = excluded.default_text,
  description = excluded.description,
  interpolation_variables = excluded.interpolation_variables,
  is_active = true,
  updated_at = now();

create or replace function private.enqueue_translation_job_expansion(
  p_entity_type text,
  p_entity_id uuid,
  p_source_language text,
  p_payload jsonb,
  p_token text
)
returns uuid
language plpgsql
security definer
set search_path to 'public', 'private', 'extensions'
as $function$
declare
  v_job_id uuid;
  v_version text;
  v_url text;
  v_secret text;
  v_enabled boolean;
  v_target_languages text[];
begin
  if coalesce(p_source_language, 'en') <> 'en' then
    return null;
  end if;

  select coalesce(array_agg(code order by display_order), '{}')
    into v_target_languages
  from public.site_languages
  where is_active = true
    and code <> 'en';

  if coalesce(array_length(v_target_languages, 1), 0) = 0 then
    return null;
  end if;

  v_version := private.translation_source_version(p_payload) || ':' || coalesce(p_token, 'lang-expansion');

  insert into public.translation_jobs(entity_type, entity_id, source_language, source_version, target_languages, status)
  values (p_entity_type, p_entity_id, 'en', v_version, v_target_languages, 'pending')
  on conflict (entity_type, entity_id, source_version) do update
    set target_languages = excluded.target_languages,
        status = 'pending',
        updated_at = now()
  returning id into v_job_id;

  select enabled, edge_function_url, webhook_secret
    into v_enabled, v_url, v_secret
  from private.translation_settings
  where id = true;

  if v_enabled and v_url is not null then
    perform net.http_post(
      url := v_url,
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-translation-secret', v_secret),
      body := jsonb_build_object('job_id', v_job_id)
    );
  end if;

  return v_job_id;
end;
$function$;

create or replace function private.enqueue_language_expansion_backfill(p_token text default 'lang-expansion-20260716180000')
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'private'
as $function$
declare
  v_website integer := 0;
  v_journal integer := 0;
  v_concepts integer := 0;
  v_founder_profiles integer := 0;
  v_timeline integer := 0;
  v_calendar integer := 0;
  v_exchange integer := 0;
  v_offers integer := 0;
  v_updates integer := 0;
  v_founder_posts integer := 0;
  v_founder_messages integer := 0;
  v_founder_wins integer := 0;
  v_mission_reminders integer := 0;
  v_support_messages integer := 0;
  rec record;
begin
  for rec in
    select id
    from public.website_translation_keys
    where is_active = true
  loop
    perform private.enqueue_translation_job_expansion(
      'website_key',
      rec.id,
      'en',
      (
        select jsonb_build_object(
          'default_text', k.default_text,
          'value_type', k.value_type,
          'description', k.description,
          'interpolation_variables', k.interpolation_variables,
          'supports_plural', k.supports_plural
        )
        from public.website_translation_keys k
        where k.id = rec.id
      ),
      p_token
    );
    v_website := v_website + 1;
  end loop;

  for rec in
    select id, coalesce(original_language, 'en') as source_language,
      jsonb_build_object(
        'title', title,
        'subtitle', subtitle,
        'excerpt', excerpt,
        'body', body,
        'seo_title', seo_title,
        'seo_description', seo_description
      ) as payload
    from public.journal_posts
    where nullif(btrim(coalesce(body, '')), '') is not null
  loop
    if rec.source_language = 'en' then
      perform private.enqueue_translation_job_expansion('journal_post', rec.id, 'en', rec.payload, p_token);
      v_journal := v_journal + 1;
    end if;
  end loop;

  for rec in select id, coalesce(original_language, 'en') as source_language from public.proof_of_mind_concepts loop
    if rec.source_language = 'en' then
      perform private.enqueue_translation_job_expansion(
        'proof_of_mind_concept',
        rec.id,
        'en',
        (
          select jsonb_build_object(
            'title', c.title,
            'tagline', c.tagline,
            'short_description', c.short_description,
            'full_description', c.full_description,
            'innovation_summary', c.innovation_summary,
            'problem_statement', c.problem_statement,
            'problems_solved', c.problems_solved,
            'solution_overview', c.solution_overview,
            'vision_statement', c.vision_statement,
            'target_audience', c.target_audience,
            'target_users', c.target_users,
            'key_features', c.key_features,
            'key_use_cases', c.key_use_cases,
            'differentiation_points', c.differentiation_points,
            'market_opportunity', c.market_opportunity,
            'business_model', c.business_model,
            'business_model_summary', c.business_model_summary,
            'validation_summary', c.validation_summary,
            'validation_evidence', c.validation_evidence,
            'roadmap_summary', c.roadmap_summary,
            'collaboration_opportunities', c.collaboration_opportunities,
            'detail_cta_label', c.detail_cta_label
          )
          from public.proof_of_mind_concepts c
          where c.id = rec.id
        ),
        p_token
      );
      v_concepts := v_concepts + 1;
    end if;
  end loop;

  for rec in select id, coalesce(original_language, 'en') as source_language from public.founder_profiles loop
    if rec.source_language = 'en' then
      perform private.enqueue_translation_job_expansion(
        'founder_profile',
        rec.id,
        'en',
        (
          select jsonb_build_object(
            'headline', fp.headline,
            'role_title', fp.role_title,
            'short_bio', fp.short_bio,
            'full_bio', fp.full_bio,
            'personal_mission', fp.personal_mission,
            'founder_story', fp.founder_story,
            'contact_cta_label', fp.contact_cta_label,
            'partnership_cta_label', fp.partnership_cta_label
          )
          from public.founder_profiles fp
          where fp.id = rec.id
        ),
        p_token
      );
      v_founder_profiles := v_founder_profiles + 1;
    end if;
  end loop;

  for rec in select id, coalesce(original_language, 'en') as source_language from public.founder_timeline_events loop
    if rec.source_language = 'en' then
      perform private.enqueue_translation_job_expansion(
        'founder_timeline_event',
        rec.id,
        'en',
        (
          select jsonb_build_object(
            'title', e.title,
            'subtitle', e.subtitle,
            'description', e.description,
            'location_name', e.location_name,
            'host_thank_you', e.host_thank_you
          )
          from public.founder_timeline_events e
          where e.id = rec.id
        ),
        p_token
      );
      v_timeline := v_timeline + 1;
    end if;
  end loop;

  for rec in select id from public.journey_calendar_entries loop
    perform private.enqueue_translation_job_expansion(
      'journey_calendar_entry',
      rec.id,
      'en',
        (
          select jsonb_build_object(
            'title', e.title,
            'country_name', e.country_name,
            'region_name', e.region_name,
            'city_name', e.city_name,
            'location_name', e.location_name,
            'public_summary', e.public_summary,
            'purpose', e.purpose,
            'host_request_message', e.host_request_message
          )
          from public.journey_calendar_entries e
          where e.id = rec.id
        ),
        p_token
      );
      v_calendar := v_calendar + 1;
    end if;
  end loop;

  for rec in select id, coalesce(original_language, 'en') as source_language from public.journey_exchange_items loop
    if rec.source_language = 'en' then
      perform private.enqueue_translation_job_expansion(
        'journey_exchange_item',
        rec.id,
        'en',
        (
          select jsonb_build_object(
            'title', e.title,
            'description', e.description,
            'tagline', e.tagline,
            'full_description', e.full_description,
            'highlights', e.highlights,
            'what_is_included', e.what_is_included,
            'suitable_for', e.suitable_for,
            'requirements', e.requirements,
            'availability_text', e.availability_text,
            'location_text', e.location_text,
            'cta_label', e.cta_label,
            'secondary_cta_label', e.secondary_cta_label,
            'seo_title', e.seo_title,
            'seo_description', e.seo_description
          )
          from public.journey_exchange_items e
          where e.id = rec.id
        ),
        p_token
      );
      v_exchange := v_exchange + 1;
    end if;
  end loop;

  for rec in select id, coalesce(original_language, 'en') as source_language from public.offers loop
    if rec.source_language = 'en' then
      perform private.enqueue_translation_job_expansion(
        'offer',
        rec.id,
        'en',
        (
          select jsonb_build_object(
            'title', o.title,
            'tagline', o.tagline,
            'short_description', o.short_description,
            'full_description', o.full_description,
            'personal_story', o.personal_story,
            'highlights', o.highlights,
            'what_is_included', o.what_is_included,
            'suitable_for', o.suitable_for,
            'requirements', o.requirements,
            'availability_text', o.availability_text,
            'location_text', o.location_text,
            'cta_label', o.cta_label,
            'secondary_cta_label', o.secondary_cta_label,
            'seo_title', o.seo_title,
            'seo_description', o.seo_description
          )
          from public.offers o
          where o.id = rec.id
        ),
        p_token
      );
      v_offers := v_offers + 1;
    end if;
  end loop;

  for rec in select id, coalesce(original_language, 'en') as source_language from public.platform_updates loop
    if rec.source_language = 'en' then
      perform private.enqueue_translation_job_expansion(
        'platform_update',
        rec.id,
        'en',
        (
          select jsonb_build_object(
            'title', u.title,
            'short_description', u.short_description,
            'motivation', u.motivation,
            'positive_impact', u.positive_impact,
            'release_notes', u.release_notes
          )
          from public.platform_updates u
          where u.id = rec.id
        ),
        p_token
      );
      v_updates := v_updates + 1;
    end if;
  end loop;

  for rec in select id, coalesce(original_language, 'en') as source_language from public.founder_posts loop
    if rec.source_language = 'en' then
      perform private.enqueue_translation_job_expansion(
        'founder_post',
        rec.id,
        'en',
        (
          select jsonb_build_object(
            'personal_intro', p.personal_intro,
            'why_i_created_it', p.why_i_created_it,
            'lived_experience', p.lived_experience,
            'vision_for_impact', p.vision_for_impact,
            'founder_video_title', p.founder_video_title,
            'founder_video_description', p.founder_video_description,
            'video_transcript', p.video_transcript,
            'cta_label', p.cta_label,
            'personal_problem', p.personal_problem,
            'solution_i_envisioned', p.solution_i_envisioned,
            'who_it_is_for', p.who_it_is_for,
            'why_it_matters', p.why_it_matters,
            'concept_thinker_insight', p.concept_thinker_insight,
            'vision_partner_angle', p.vision_partner_angle,
            'adhd_strength_connection', p.adhd_strength_connection
          )
          from public.founder_posts p
          where p.id = rec.id
        ),
        p_token
      );
      v_founder_posts := v_founder_posts + 1;
    end if;
  end loop;

  for rec in select id, coalesce(original_language, 'en') as source_language from public.founder_messages loop
    if rec.source_language = 'en' then
      perform private.enqueue_translation_job_expansion(
        'founder_message',
        rec.id,
        'en',
        (
          select jsonb_build_object(
            'title', m.title,
            'eyebrow', m.eyebrow,
            'body', m.body,
            'founder_role', m.founder_role,
            'founder_statement', m.founder_statement,
            'cta_label', m.cta_label
          )
          from public.founder_messages m
          where m.id = rec.id
        ),
        p_token
      );
      v_founder_messages := v_founder_messages + 1;
    end if;
  end loop;

  for rec in select id, coalesce(original_language, 'en') as source_language from public.founder_wins loop
    if rec.source_language = 'en' then
      perform private.enqueue_translation_job_expansion(
        'founder_win',
        rec.id,
        'en',
        (
          select jsonb_build_object(
            'title', w.title,
            'description', w.description
          )
          from public.founder_wins w
          where w.id = rec.id
        ),
        p_token
      );
      v_founder_wins := v_founder_wins + 1;
    end if;
  end loop;

  for rec in select id, coalesce(original_language, 'en') as source_language from public.founder_mission_reminders loop
    if rec.source_language = 'en' then
      perform private.enqueue_translation_job_expansion(
        'founder_mission_reminder',
        rec.id,
        'en',
        (
          select jsonb_build_object(
            'title', r.title,
            'body', r.body,
            'source_label', r.source_label
          )
          from public.founder_mission_reminders r
          where r.id = rec.id
        ),
        p_token
      );
      v_mission_reminders := v_mission_reminders + 1;
    end if;
  end loop;

  for rec in select id, coalesce(original_language, 'en') as source_language from public.founder_support_messages loop
    if rec.source_language = 'en' then
      perform private.enqueue_translation_job_expansion(
        'founder_support_message',
        rec.id,
        'en',
        (
          select jsonb_build_object(
            'title', s.title,
            'body', s.body
          )
          from public.founder_support_messages s
          where s.id = rec.id
        ),
        p_token
      );
      v_support_messages := v_support_messages + 1;
    end if;
  end loop;

  return jsonb_build_object(
    'token', p_token,
    'website_key', v_website,
    'journal_post', v_journal,
    'proof_of_mind_concept', v_concepts,
    'founder_profile', v_founder_profiles,
    'founder_timeline_event', v_timeline,
    'journey_calendar_entry', v_calendar,
    'journey_exchange_item', v_exchange,
    'offer', v_offers,
    'platform_update', v_updates,
    'founder_post', v_founder_posts,
    'founder_message', v_founder_messages,
    'founder_win', v_founder_wins,
    'founder_mission_reminder', v_mission_reminders,
    'founder_support_message', v_support_messages
  );
end;
$function$;

create or replace function public.get_active_language_count()
returns integer
language sql
stable
set search_path to 'public'
as $function$
  select count(*)::integer
  from public.site_languages
  where is_active = true;
$function$;

drop function if exists public.admin_get_journal_ai_status(uuid);

create or replace function public.admin_get_journal_ai_status(post_id uuid)
returns table(
  status text,
  generation_status text,
  last_error text,
  published_at timestamp with time zone,
  ai_generated_at timestamp with time zone,
  translation_count bigint,
  expected_translation_count bigint
)
language sql
security definer
set search_path to 'public', 'auth', 'pg_catalog', 'pg_temp'
as $function$
  with expected as (
    select count(*)::bigint as total
    from public.site_languages
    where is_active = true
  )
  select
    p.status,
    coalesce(s.generation_status, p.ai_generation_status, 'not_requested') as generation_status,
    coalesce(
      s.last_error,
      case when p.ai_generation_status = 'failed' then 'Journal AI generation failed.' end
    ) as last_error,
    p.published_at,
    p.ai_generated_at,
    (
      select count(*)
      from public.journal_translations t
      where t.journal_post_id = p.id
        and t.translation_status = 'published'
        and nullif(trim(t.title), '') is not null
        and nullif(trim(t.body), '') is not null
        and char_length(trim(t.body)) between
          case t.language_code
            when 'zh' then 700
            when 'ja' then 750
            when 'ko' then 900
            when 'ar' then 1200
            when 'hi' then 1300
            when 'tr' then 1700
            else 1800
          end
          and
          case t.language_code
            when 'zh' then 2200
            when 'ja' then 2300
            when 'ko' then 2700
            when 'ar' then 3600
            when 'hi' then 3800
            when 'tr' then 4300
            else 4500
          end
    ) as translation_count,
    expected.total as expected_translation_count
  from public.journal_posts p
  cross join expected
  left join public.journal_ai_sources s on s.journal_post_id = p.id
  where p.id = post_id
    and public.is_admin_user();
$function$;

select private.enqueue_language_expansion_backfill('lang-expansion-20260716180000');

commit;
