-- Public UI component i18n registry: links React surfaces to translation keys.

begin;

create table if not exists public.website_ui_components (
  id uuid primary key default gen_random_uuid(),
  component_key text not null unique,
  source_path text not null,
  export_name text not null,
  surface_type text not null,
  namespace text not null,
  is_public boolean not null default true,
  entity_content jsonb,
  coverage_status text not null default 'inventoried',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint website_ui_components_surface_type_check
    check (surface_type = any (array['component'::text, 'page'::text, 'data_module'::text, 'dom_injector'::text])),
  constraint website_ui_components_coverage_status_check
    check (coverage_status = any (array['inventoried'::text, 'seeded'::text, 'connected'::text, 'verified'::text, 'deprecated'::text]))
);

create unique index if not exists website_ui_components_source_path_export_name_idx
  on public.website_ui_components (source_path, export_name);

create table if not exists public.website_ui_component_translation_keys (
  id uuid primary key default gen_random_uuid(),
  component_id uuid not null references public.website_ui_components(id) on delete cascade,
  translation_key_id uuid not null references public.website_translation_keys(id) on delete cascade,
  usage_kind text not null default 'label',
  is_required boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint website_ui_component_translation_keys_usage_kind_check
    check (usage_kind = any (array['label'::text, 'aria'::text, 'seo'::text, 'error'::text, 'empty'::text, 'loading'::text])),
  constraint website_ui_component_translation_keys_component_key_unique
    unique (component_id, translation_key_id)
);

alter table public.website_ui_components enable row level security;
alter table public.website_ui_component_translation_keys enable row level security;

drop policy if exists website_ui_components_admin_select on public.website_ui_components;
create policy website_ui_components_admin_select
  on public.website_ui_components
  for select
  to authenticated
  using (public.is_admin_user());

drop policy if exists website_ui_component_translation_keys_admin_select on public.website_ui_component_translation_keys;
create policy website_ui_component_translation_keys_admin_select
  on public.website_ui_component_translation_keys
  for select
  to authenticated
  using (public.is_admin_user());

create or replace function public.get_public_ui_component_coverage()
returns table (
  component_key text,
  source_path text,
  export_name text,
  namespace text,
  coverage_status text,
  declared_key_count bigint,
  required_key_count bigint,
  languages_active bigint,
  keys_missing_translations bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with active_languages as (
    select count(*)::bigint as language_count
    from public.site_languages
    where is_active = true
  ),
  component_keys as (
    select
      c.id as component_id,
      c.component_key,
      c.source_path,
      c.export_name,
      c.namespace,
      c.coverage_status,
      k.translation_key,
      ck.is_required
    from public.website_ui_components c
    join public.website_ui_component_translation_keys ck on ck.component_id = c.id
    join public.website_translation_keys k on k.id = ck.translation_key_id
    where c.is_active = true
      and c.is_public = true
  ),
  translation_coverage as (
    select
      ck.component_id,
      ck.translation_key,
      ck.is_required,
      count(wt.id) filter (where wt.translation_status = 'published') as published_language_count
    from component_keys ck
    left join public.website_translation_keys k on k.translation_key = ck.translation_key
    left join public.website_translations wt on wt.translation_key_id = k.id
    group by ck.component_id, ck.translation_key, ck.is_required
  )
  select
    c.component_key,
    c.source_path,
    c.export_name,
    c.namespace,
    c.coverage_status,
    count(distinct ck.translation_key)::bigint as declared_key_count,
    count(distinct ck.translation_key) filter (where ck.is_required)::bigint as required_key_count,
    (select language_count from active_languages) as languages_active,
    count(*) filter (
      where tc.is_required
        and tc.published_language_count < (select language_count from active_languages)
    )::bigint as keys_missing_translations
  from public.website_ui_components c
  left join component_keys ck on ck.component_id = c.id
  left join translation_coverage tc
    on tc.component_id = c.id
   and tc.translation_key = ck.translation_key
  where c.is_active = true
    and c.is_public = true
  group by c.id, c.component_key, c.source_path, c.export_name, c.namespace, c.coverage_status
  order by c.component_key;
$$;

revoke all on function public.get_public_ui_component_coverage() from public;
grant execute on function public.get_public_ui_component_coverage() to authenticated;

-- Seed initial compliant public surfaces.
insert into public.website_ui_components
  (component_key, source_path, export_name, surface_type, namespace, is_public, entity_content, coverage_status)
values
  ('shell.header', 'src/components/Header.tsx', 'Header', 'component', 'header', true, null, 'connected'),
  ('shell.footer', 'src/components/Footer.tsx', 'Footer', 'component', 'footer', true, null, 'connected'),
  ('page.home', 'src/pages/HomePage.tsx', 'HomePage', 'page', 'home', true, null, 'connected'),
  ('journal.donations.block', 'src/components/journal/JournalDonationsBlock.tsx', 'JournalDonationsBlock', 'component', 'donations', true, null, 'connected'),
  ('journal.place_context.section', 'src/components/journal/JournalPlaceContextSection.tsx', 'JournalPlaceContextSection', 'component', 'journal.place_context', true,
    '{"rpc":"get_localized_journal_place_context","tables":["journal_post_place_context_translations","journal_post_poi_translations"]}'::jsonb,
    'connected')
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
join public.website_translation_keys k on k.translation_key = v.translation_key
cross join lateral (
  values
    ('shell.header', 'header.brand_home_aria'),
    ('shell.header', 'header.primary_navigation_aria'),
    ('shell.header', 'header.nav_group_toggle_aria'),
    ('shell.header', 'header.close_menu_aria'),
    ('shell.header', 'header.open_menu_aria'),
    ('shell.header', 'header.mobile_navigation_aria'),
    ('shell.footer', 'footer.mission.kicker'),
    ('shell.footer', 'footer.mission.tagline'),
    ('shell.footer', 'footer.mission.description'),
    ('shell.footer', 'footer.actions.support'),
    ('shell.footer', 'footer.actions.explore_concepts'),
    ('shell.footer', 'footer.trust.original_concepts'),
    ('shell.footer', 'footer.trust.location'),
    ('shell.footer', 'footer.accessibility.sitemap_aria'),
    ('shell.footer', 'footer.bottom.copyright'),
    ('shell.footer', 'footer.bottom.github'),
    ('shell.footer', 'footer.bottom.privacy'),
    ('shell.footer', 'footer.bottom.back_to_top'),
    ('page.home', 'home.seo.title'),
    ('page.home', 'home.seo.description'),
    ('page.home', 'home.page_aria'),
    ('page.home', 'home.hero.eyebrow'),
    ('page.home', 'home.hero.title'),
    ('page.home', 'home.hero.description'),
    ('journal.donations.block', 'donations.cta.support_this_story'),
    ('journal.donations.block', 'donations.cta.choose_amount'),
    ('journal.donations.block', 'donations.success.modal.title'),
    ('journal.place_context.section', 'journal.place_context.section.title'),
    ('journal.place_context.section', 'journal.place_context.weather.heading'),
    ('journal.place_context.section', 'journal.place_context.weather.loading')
) as v(component_key, translation_key)
where c.component_key = v.component_key
on conflict (component_id, translation_key_id) do update set
  usage_kind = excluded.usage_kind,
  is_required = excluded.is_required,
  updated_at = now();

commit;
