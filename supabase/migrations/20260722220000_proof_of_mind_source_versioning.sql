-- Issue #227: make the Proof of Mind source editor a complete, secured backend workflow.
begin;

alter table public.proof_of_mind_concepts
  add column if not exists source_text text,
  add column if not exists source_version_number integer not null default 0 check (source_version_number >= 0),
  add column if not exists active_source_version_id uuid,
  add column if not exists ai_orchestration_status text not null default 'not_started'
    check (ai_orchestration_status in ('not_started','queued','running','completed','failed')),
  add column if not exists ai_orchestration_error text,
  add column if not exists ai_orchestrated_at timestamptz;

create table if not exists public.proof_of_mind_concept_versions (
  id uuid primary key default gen_random_uuid(),
  concept_id uuid not null references public.proof_of_mind_concepts(id) on delete cascade,
  version_number integer not null check (version_number > 0),
  title text,
  source_text text not null check (length(trim(source_text)) > 0),
  source_language text not null references public.site_languages(code),
  change_summary text,
  is_active boolean not null default false,
  ai_orchestration_status text not null default 'queued'
    check (ai_orchestration_status in ('queued','running','completed','failed')),
  ai_orchestration_error text,
  ai_orchestrated_at timestamptz,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (concept_id, version_number)
);

create unique index if not exists proof_of_mind_concept_versions_one_active_idx
  on public.proof_of_mind_concept_versions(concept_id) where is_active;
create index if not exists proof_of_mind_concept_versions_history_idx
  on public.proof_of_mind_concept_versions(concept_id, version_number desc);

do $$ begin
  alter table public.proof_of_mind_concepts
    add constraint proof_of_mind_concepts_active_source_version_fk
    foreign key (active_source_version_id) references public.proof_of_mind_concept_versions(id) on delete set null;
exception when duplicate_object then null; end $$;

alter table public.proof_of_mind_concept_versions enable row level security;
drop policy if exists "active admins read concept versions" on public.proof_of_mind_concept_versions;
create policy "active admins read concept versions" on public.proof_of_mind_concept_versions
  for select to authenticated using (public.has_active_admin_access());
drop policy if exists "active admins manage concept versions" on public.proof_of_mind_concept_versions;
create policy "active admins manage concept versions" on public.proof_of_mind_concept_versions
  for all to authenticated using (public.has_active_admin_access()) with check (public.has_active_admin_access());

create or replace function private.proof_of_mind_slug(p_title text)
returns text language sql immutable strict set search_path = '' as $$
  select trim(both '-' from regexp_replace(lower(p_title), '[^a-z0-9]+', '-', 'g'))
$$;

create or replace function public.save_concept_source_version(
  p_concept_id uuid, p_source_text text, p_title text default null,
  p_source_language text default null, p_change_summary text default null
) returns uuid language plpgsql security definer set search_path = public, private, auth as $$
declare v_number integer; v_version_id uuid; v_language text; v_title text;
begin
  if not public.has_active_admin_access() then raise exception 'Active administrator access is required.' using errcode='42501'; end if;
  if p_concept_id is null or nullif(trim(p_source_text), '') is null then raise exception 'Concept and source text are required.' using errcode='22023'; end if;
  select source_version_number + 1, coalesce(nullif(trim(p_source_language),''), original_language, 'en'),
         coalesce(nullif(trim(p_title),''), title)
    into v_number, v_language, v_title from public.proof_of_mind_concepts where id=p_concept_id for update;
  if not found then raise exception 'Concept not found.' using errcode='P0002'; end if;
  if not exists(select 1 from public.site_languages where code=v_language and is_active) then raise exception 'Unsupported source language: %', v_language using errcode='22023'; end if;
  update public.proof_of_mind_concept_versions set is_active=false where concept_id=p_concept_id and is_active;
  insert into public.proof_of_mind_concept_versions(concept_id,version_number,title,source_text,source_language,change_summary,is_active)
    values(p_concept_id,v_number,v_title,trim(p_source_text),v_language,nullif(trim(p_change_summary),''),true) returning id into v_version_id;
  update public.proof_of_mind_concepts set title=v_title, source_text=trim(p_source_text), original_language=v_language,
    source_version_number=v_number, active_source_version_id=v_version_id, ai_orchestration_status='queued',
    ai_orchestration_error=null, updated_at=now() where id=p_concept_id;
  return v_version_id;
end $$;

create or replace function public.create_concept_from_source_text(p_source_text text, p_title text, p_original_language text default 'en')
returns uuid language plpgsql security definer set search_path = public, private, auth as $$
declare v_id uuid; v_slug text; v_base text; v_suffix integer := 1;
begin
  if not public.has_active_admin_access() then raise exception 'Active administrator access is required.' using errcode='42501'; end if;
  if nullif(trim(p_title),'') is null or nullif(trim(p_source_text),'') is null then raise exception 'Title and source text are required.' using errcode='22023'; end if;
  v_base := private.proof_of_mind_slug(p_title); if v_base='' then v_base := 'concept'; end if; v_slug := v_base;
  while exists(select 1 from public.proof_of_mind_concepts where slug=v_slug) loop v_suffix:=v_suffix+1; v_slug:=v_base||'-'||v_suffix; end loop;
  insert into public.proof_of_mind_concepts(title,slug,source_text,original_language,concept_status,visibility,ai_orchestration_status)
    values(trim(p_title),v_slug,trim(p_source_text),p_original_language,'idea','hidden','queued') returning id into v_id;
  perform public.save_concept_source_version(v_id,p_source_text,p_title,p_original_language,'Initial source version');
  return v_id;
end $$;

revoke all on function public.save_concept_source_version(uuid,text,text,text,text) from public;
revoke all on function public.create_concept_from_source_text(text,text,text) from public;
grant execute on function public.save_concept_source_version(uuid,text,text,text,text) to authenticated;
grant execute on function public.create_concept_from_source_text(text,text,text) to authenticated;

commit;
