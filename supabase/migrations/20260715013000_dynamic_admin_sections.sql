-- Issue #180: make the generic Admin sections fully Supabase-driven.

create table if not exists public.admin_sections (
  id uuid primary key default gen_random_uuid(),
  section_key text not null unique,
  route text not null unique check (route like '/admin/%'),
  title_key text not null,
  title_fallback text not null,
  description_key text not null,
  description_fallback text not null,
  source_table text not null,
  primary_key text not null default 'id',
  title_field text not null,
  subtitle_field text,
  status_field text,
  date_field text,
  image_field text,
  link_field text,
  variant text not null default 'table' check (variant in ('table','cards','media','timeline','settings','audit')),
  order_field text not null,
  order_direction text not null default 'desc' check (order_direction in ('asc','desc')),
  default_limit integer not null default 100 check (default_limit between 1 and 500),
  required_roles text[] not null default array['admin']::text[],
  is_enabled boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_section_fields (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.admin_sections(id) on delete cascade,
  field_name text not null,
  label_key text not null,
  label_fallback text not null,
  display_order integer not null default 0,
  show_in_list boolean not null default true,
  show_in_editor boolean not null default true,
  is_readonly boolean not null default false,
  is_required boolean not null default false,
  input_type text not null default 'text' check (input_type in ('text','textarea','boolean','number','datetime','date','url','email','select','json')),
  options jsonb not null default '[]'::jsonb check (jsonb_typeof(options) = 'array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(section_id, field_name)
);

create index if not exists admin_sections_route_enabled_idx on public.admin_sections(route) where is_enabled;
create index if not exists admin_section_fields_section_order_idx on public.admin_section_fields(section_id, display_order);

alter table public.admin_sections enable row level security;
alter table public.admin_section_fields enable row level security;

create or replace function public.has_active_admin_access()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.admin_allowlist a
    where lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      and a.is_active = true
  );
$$;

revoke all on function public.has_active_admin_access() from public;
grant execute on function public.has_active_admin_access() to authenticated;

drop policy if exists "active admins read admin sections" on public.admin_sections;
create policy "active admins read admin sections"
on public.admin_sections for select to authenticated
using (public.has_active_admin_access());

drop policy if exists "active admins manage admin sections" on public.admin_sections;
create policy "active admins manage admin sections"
on public.admin_sections for all to authenticated
using (public.has_active_admin_access())
with check (public.has_active_admin_access());

drop policy if exists "active admins read admin section fields" on public.admin_section_fields;
create policy "active admins read admin section fields"
on public.admin_section_fields for select to authenticated
using (public.has_active_admin_access());

drop policy if exists "active admins manage admin section fields" on public.admin_section_fields;
create policy "active admins manage admin section fields"
on public.admin_section_fields for all to authenticated
using (public.has_active_admin_access())
with check (public.has_active_admin_access());

create or replace function public.get_admin_section_definition(p_route text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  v_result jsonb;
begin
  if not public.has_active_admin_access() then
    raise exception 'Active administrator access is required.' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'key', s.section_key,
    'route', s.route,
    'titleKey', s.title_key,
    'titleFallback', s.title_fallback,
    'descriptionKey', s.description_key,
    'descriptionFallback', s.description_fallback,
    'sourceTable', s.source_table,
    'primaryKey', s.primary_key,
    'titleField', s.title_field,
    'subtitleField', s.subtitle_field,
    'statusField', s.status_field,
    'dateField', s.date_field,
    'imageField', s.image_field,
    'linkField', s.link_field,
    'variant', s.variant,
    'orderField', s.order_field,
    'orderDirection', s.order_direction,
    'defaultLimit', s.default_limit,
    'requiredRoles', s.required_roles,
    'fields', coalesce((
      select jsonb_agg(jsonb_build_object(
        'name', f.field_name,
        'labelKey', f.label_key,
        'labelFallback', f.label_fallback,
        'displayOrder', f.display_order,
        'showInList', f.show_in_list,
        'showInEditor', f.show_in_editor,
        'readOnly', f.is_readonly,
        'required', f.is_required,
        'inputType', f.input_type,
        'options', f.options
      ) order by f.display_order)
      from public.admin_section_fields f
      where f.section_id = s.id
    ), '[]'::jsonb)
  ) into v_result
  from public.admin_sections s
  where s.route = p_route and s.is_enabled = true;

  if v_result is null then
    raise exception 'No enabled Admin section metadata found for route %.', p_route using errcode = 'P0002';
  end if;

  return v_result;
end;
$$;

revoke all on function public.get_admin_section_definition(text) from public;
grant execute on function public.get_admin_section_definition(text) to authenticated;

-- Upsert the section records that were formerly hardcoded in AdminSectionPage.tsx.
insert into public.admin_sections
(section_key, route, title_key, title_fallback, description_key, description_fallback, source_table, primary_key, title_field, subtitle_field, status_field, date_field, image_field, link_field, variant, order_field, order_direction, display_order)
values
('journey','/admin/journey','admin.journey.title','Journey','admin.journey.description','Manage map points, timeline entries and lived experiences.','journal_journey_entries','id','location_name','what_happened','entry_type','occurred_at',null,null,'timeline','occurred_at','desc',20),
('break_the_circle','/admin/break-the-circle','admin.break_the_circle.title','Break the Circle','admin.break_the_circle.description','Manage featured campaign stories and calls to action.','break_the_circle_posts','id','cta_label','cta_url','is_featured','updated_at',null,'cta_url','cards','featured_order','asc',30),
('media_vault','/admin/media','admin.media.title','Media Vault','admin.media.description','Review assets, metadata, publication status and visibility.','media_assets','id','title','description','status','created_at','thumbnail_url','external_url','media','created_at','desc',40),
('people','/admin/people','admin.people.title','People & Hosts','admin.people.description','Manage hosts, contacts, consent and public profiles.','journey_people','id','display_name','short_bio','person_type','updated_at','avatar_url',null,'cards','updated_at','desc',50),
('proof_of_mind','/admin/proof-of-mind','admin.proof_of_mind.title','Proof of Mind','admin.proof_of_mind.description','Manage concepts, visibility, scores and publication state.','proof_of_mind_concepts','id','title','tagline','concept_status','updated_at',null,null,'cards','updated_at','desc',60),
('leads','/admin/leads','admin.leads.title','Leads & Pipeline','admin.leads.description','Track people, companies, interest and outreach status.','leads','id','full_name','company_name','status','updated_at',null,null,'table','updated_at','desc',70),
('applications','/admin/applications','admin.applications.title','Applications','admin.applications.description','Review applicants, motivation and availability.','applications','id','full_name','motivation','status','created_at',null,null,'cards','created_at','desc',80),
('founding_heroes','/admin/founding-heroes','admin.founding_heroes.title','Founding Heroes','admin.founding_heroes.description','Manage public recognition for contributors and supporters.','founding_heroes','id','display_name','short_bio','recognition_level','joined_at','avatar_url',null,'cards','updated_at','desc',90),
('comments','/admin/journal/comments','admin.comments.title','Comments','admin.comments.description','Moderate visitor comments and pinned conversations.','journal_comments','id','display_name','body','status','created_at',null,null,'cards','created_at','desc',100),
('issues','/admin/issues','admin.issues.title','GitHub Issues','admin.issues.description','Follow delivery status, difficulty and implementation evidence.','github_issues','id','display_title','repository_full_name','state','github_updated_at',null,'issue_url','table','github_updated_at','desc',110),
('users','/admin/users','admin.users.title','Users & Roles','admin.users.description','Manage the admin allowlist and role access.','admin_allowlist','email','full_name','email','role','updated_at',null,null,'table','updated_at','desc',120),
('settings','/admin/settings','admin.settings.title','Site Settings','admin.settings.description','Configure mission-control system settings.','admin_system_settings','key','label','description','category','updated_at',null,null,'settings','category','asc',130),
('audit','/admin/audit','admin.audit.title','Audit Log','admin.audit.description','Trace all recent administrative and content changes.','admin_audit_log','id','action','table_name',null,'occurred_at',null,null,'audit','occurred_at','desc',140)
on conflict (route) do update set
  section_key = excluded.section_key,
  title_key = excluded.title_key,
  title_fallback = excluded.title_fallback,
  description_key = excluded.description_key,
  description_fallback = excluded.description_fallback,
  source_table = excluded.source_table,
  primary_key = excluded.primary_key,
  title_field = excluded.title_field,
  subtitle_field = excluded.subtitle_field,
  status_field = excluded.status_field,
  date_field = excluded.date_field,
  image_field = excluded.image_field,
  link_field = excluded.link_field,
  variant = excluded.variant,
  order_field = excluded.order_field,
  order_direction = excluded.order_direction,
  display_order = excluded.display_order,
  updated_at = now();

-- Field metadata is seeded as data, not compiled into the frontend.
with field_seed(route, field_name, label_fallback, display_order, show_in_list, show_in_editor, is_readonly, input_type, options) as (
values
('/admin/journey','location_name','Location',10,true,true,false,'text','[]'::jsonb),('/admin/journey','city_name','City',20,true,true,false,'text','[]'),('/admin/journey','entry_type','Entry type',30,true,true,false,'text','[]'),('/admin/journey','occurred_at','Occurred at',40,true,true,false,'datetime','[]'),('/admin/journey','what_happened','What happened',50,false,true,false,'textarea','[]'),('/admin/journey','show_on_map','Show on map',60,true,true,false,'boolean','[]'),('/admin/journey','show_on_timeline','Show on timeline',70,true,true,false,'boolean','[]'),
('/admin/break-the-circle','cta_label','CTA label',10,true,true,false,'text','[]'),('/admin/break-the-circle','cta_url','CTA URL',20,true,true,false,'url','[]'),('/admin/break-the-circle','is_featured','Featured',30,true,true,false,'boolean','[]'),('/admin/break-the-circle','featured_order','Featured order',40,true,true,false,'number','[]'),
('/admin/media','title','Title',10,true,true,false,'text','[]'),('/admin/media','asset_type','Asset type',20,true,true,false,'text','[]'),('/admin/media','description','Description',30,false,true,false,'textarea','[]'),('/admin/media','thumbnail_url','Thumbnail URL',40,false,true,false,'url','[]'),('/admin/media','external_url','External URL',50,false,true,false,'url','[]'),('/admin/media','status','Status',60,true,true,false,'select','["ready","uploading","processing","failed","archived"]'),('/admin/media','visibility','Visibility',70,true,true,false,'text','[]'),('/admin/media','show_in_media_vault','Show in Media Vault',80,true,true,false,'boolean','[]'),('/admin/media','created_at','Created at',90,false,false,true,'datetime','[]'),
('/admin/people','display_name','Display name',10,true,true,false,'text','[]'),('/admin/people','full_name','Full name',20,false,true,false,'text','[]'),('/admin/people','person_type','Person type',30,true,true,false,'text','[]'),('/admin/people','role_title','Role title',40,true,true,false,'text','[]'),('/admin/people','short_bio','Short bio',50,false,true,false,'textarea','[]'),('/admin/people','location','Location',60,true,true,false,'text','[]'),('/admin/people','email','Email',70,false,true,false,'email','[]'),('/admin/people','consent_to_publish','Consent to publish',80,false,true,false,'boolean','[]'),('/admin/people','is_public','Public',90,true,true,false,'boolean','[]'),('/admin/people','avatar_url','Avatar URL',100,false,true,false,'url','[]'),
('/admin/proof-of-mind','title','Title',10,true,true,false,'text','[]'),('/admin/proof-of-mind','category','Category',20,true,true,false,'text','[]'),('/admin/proof-of-mind','concept_status','Concept status',30,true,true,false,'select','["idea","concept","validation","building","launched","archived"]'),('/admin/proof-of-mind','visibility','Visibility',40,true,true,false,'text','[]'),('/admin/proof-of-mind','concept_score','Concept score',50,true,true,false,'number','[]'),('/admin/proof-of-mind','is_featured','Featured',60,true,true,false,'boolean','[]'),('/admin/proof-of-mind','tagline','Tagline',70,false,true,false,'textarea','[]'),('/admin/proof-of-mind','slug','Slug',80,false,true,false,'text','[]'),('/admin/proof-of-mind','published_at','Published at',90,false,true,false,'datetime','[]'),
('/admin/leads','full_name','Full name',10,true,true,false,'text','[]'),('/admin/leads','company_name','Company',20,true,true,false,'text','[]'),('/admin/leads','role','Role',30,true,true,false,'text','[]'),('/admin/leads','lead_type','Lead type',40,true,true,false,'text','[]'),('/admin/leads','status','Status',50,true,true,false,'select','["new","contacted","qualified","proposal","won","lost"]'),('/admin/leads','interest','Interest',60,false,true,false,'textarea','[]'),('/admin/leads','country','Country',70,true,true,false,'text','[]'),('/admin/leads','email','Email',80,false,true,false,'email','[]'),
('/admin/applications','full_name','Full name',10,true,true,false,'text','[]'),('/admin/applications','email','Email',20,true,true,false,'email','[]'),('/admin/applications','location','Location',30,true,true,false,'text','[]'),('/admin/applications','availability','Availability',40,true,true,false,'text','[]'),('/admin/applications','status','Status',50,true,true,false,'select','["new","reviewing","interview","accepted","rejected"]'),('/admin/applications','motivation','Motivation',60,false,true,false,'textarea','[]'),('/admin/applications','experience_summary','Experience summary',70,false,true,false,'textarea','[]'),('/admin/applications','created_at','Created at',80,false,false,true,'datetime','[]'),
('/admin/founding-heroes','display_name','Display name',10,true,true,false,'text','[]'),('/admin/founding-heroes','role_title','Role title',20,true,true,false,'text','[]'),('/admin/founding-heroes','recognition_level','Recognition level',30,true,true,false,'text','[]'),('/admin/founding-heroes','is_published','Published',40,true,true,false,'boolean','[]'),('/admin/founding-heroes','featured','Featured',50,true,true,false,'boolean','[]'),('/admin/founding-heroes','short_bio','Short bio',60,false,true,false,'textarea','[]'),('/admin/founding-heroes','location','Location',70,false,true,false,'text','[]'),('/admin/founding-heroes','avatar_url','Avatar URL',80,false,true,false,'url','[]'),
('/admin/journal/comments','display_name','Display name',10,true,true,false,'text','[]'),('/admin/journal/comments','email','Email',20,true,true,false,'email','[]'),('/admin/journal/comments','status','Status',30,true,true,false,'select','["pending","approved","rejected","spam"]'),('/admin/journal/comments','is_pinned','Pinned',40,true,true,false,'boolean','[]'),('/admin/journal/comments','body','Comment',50,false,true,false,'textarea','[]'),('/admin/journal/comments','created_at','Created at',60,true,false,true,'datetime','[]'),
('/admin/issues','issue_number','Issue',10,true,false,true,'number','[]'),('/admin/issues','display_title','Title',20,true,false,true,'text','[]'),('/admin/issues','repository_full_name','Repository',30,true,false,true,'text','[]'),('/admin/issues','state','State',40,true,false,true,'text','[]'),('/admin/issues','discipline','Discipline',50,true,false,true,'text','[]'),('/admin/issues','difficulty','Difficulty',60,true,false,true,'text','[]'),('/admin/issues','delivery_status','Delivery status',70,true,false,true,'text','[]'),('/admin/issues','issue_url','Issue URL',80,false,false,true,'url','[]'),
('/admin/users','full_name','Full name',10,true,true,false,'text','[]'),('/admin/users','email','Email',20,true,false,true,'email','[]'),('/admin/users','role','Role',30,true,true,false,'select','["admin","editor","media_manager"]'),('/admin/users','is_active','Active',40,true,true,false,'boolean','[]'),('/admin/users','updated_at','Updated at',50,true,false,true,'datetime','[]'),
('/admin/settings','label','Label',10,true,true,false,'text','[]'),('/admin/settings','category','Category',20,true,true,false,'text','[]'),('/admin/settings','value','Value',30,true,true,false,'json','[]'),('/admin/settings','is_secret','Secret',40,true,true,false,'boolean','[]'),('/admin/settings','updated_at','Updated at',50,true,false,true,'datetime','[]'),
('/admin/audit','occurred_at','Occurred at',10,true,false,true,'datetime','[]'),('/admin/audit','actor_email','Actor',20,true,false,true,'email','[]'),('/admin/audit','action','Action',30,true,false,true,'text','[]'),('/admin/audit','table_name','Table',40,true,false,true,'text','[]'),('/admin/audit','record_id','Record',50,true,false,true,'text','[]')
)
insert into public.admin_section_fields(section_id, field_name, label_key, label_fallback, display_order, show_in_list, show_in_editor, is_readonly, input_type, options)
select s.id, f.field_name, 'admin.field.' || replace(f.field_name, '_', '.'), f.label_fallback, f.display_order, f.show_in_list, f.show_in_editor, f.is_readonly, f.input_type, f.options
from field_seed f
join public.admin_sections s on s.route = f.route
on conflict(section_id, field_name) do update set
 label_key=excluded.label_key, label_fallback=excluded.label_fallback, display_order=excluded.display_order,
 show_in_list=excluded.show_in_list, show_in_editor=excluded.show_in_editor,
 is_readonly=excluded.is_readonly, input_type=excluded.input_type, options=excluded.options, updated_at=now();
