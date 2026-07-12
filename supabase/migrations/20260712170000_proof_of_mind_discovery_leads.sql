begin;

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  full_name text,
  company text,
  role text,
  country text,
  interest text,
  website text,
  linkedin text,
  source text not null default 'proof_of_mind',
  status text not null default 'new',
  consent_to_contact boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.leads add column if not exists email text;
alter table public.leads add column if not exists full_name text;
alter table public.leads add column if not exists company text;
alter table public.leads add column if not exists role text;
alter table public.leads add column if not exists country text;
alter table public.leads add column if not exists interest text;
alter table public.leads add column if not exists website text;
alter table public.leads add column if not exists linkedin text;
alter table public.leads add column if not exists source text not null default 'proof_of_mind';
alter table public.leads add column if not exists status text not null default 'new';
alter table public.leads add column if not exists consent_to_contact boolean not null default false;
alter table public.leads add column if not exists created_at timestamptz not null default now();
alter table public.leads add column if not exists updated_at timestamptz not null default now();

create unique index if not exists leads_lower_email_unique on public.leads (lower(email));

create table if not exists public.lead_concepts (
  lead_id uuid not null references public.leads(id) on delete cascade,
  concept_id uuid not null references public.proof_of_mind_concepts(id) on delete cascade,
  interest_level text not null default 'warm',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (lead_id, concept_id)
);

alter table public.lead_concepts add column if not exists interest_level text not null default 'warm';
alter table public.lead_concepts add column if not exists notes text;
alter table public.lead_concepts add column if not exists created_at timestamptz not null default now();
alter table public.lead_concepts add column if not exists updated_at timestamptz not null default now();

alter table public.leads enable row level security;
alter table public.lead_concepts enable row level security;

create or replace function public.submit_proof_of_mind_discovery_call(
  p_concept_id uuid,
  p_full_name text,
  p_email text,
  p_company text,
  p_role text,
  p_country text,
  p_interest_message text,
  p_consent_to_contact boolean,
  p_website text default null,
  p_linkedin text default null,
  p_interest_type text default 'other'
)
returns table (lead_id uuid, concept_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lead_id uuid;
  v_email text := lower(trim(p_email));
begin
  if p_concept_id is null or not exists (select 1 from public.proof_of_mind_concepts c where c.id = p_concept_id and c.visibility in ('teaser', 'full') and c.published_at is not null) then
    raise exception 'A valid public concept is required.';
  end if;
  if nullif(trim(coalesce(p_full_name, '')), '') is null then raise exception 'Full name is required.'; end if;
  if v_email is null or v_email !~ '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$' then raise exception 'A valid email address is required.'; end if;
  if nullif(trim(coalesce(p_company, '')), '') is null then raise exception 'Company or organisation is required.'; end if;
  if nullif(trim(coalesce(p_role, '')), '') is null then raise exception 'Role is required.'; end if;
  if nullif(trim(coalesce(p_country, '')), '') is null then raise exception 'Country or location is required.'; end if;
  if nullif(trim(coalesce(p_interest_message, '')), '') is null then raise exception 'Please tell us why this concept interests you.'; end if;
  if p_consent_to_contact is distinct from true then raise exception 'Consent to be contacted is required.'; end if;

  insert into public.leads (email, full_name, company, role, country, interest, website, linkedin, source, status, consent_to_contact, updated_at)
  values (v_email, trim(p_full_name), trim(p_company), trim(p_role), trim(p_country), trim(coalesce(p_interest_type, 'other')), nullif(trim(coalesce(p_website, '')), ''), nullif(trim(coalesce(p_linkedin, '')), ''), 'proof_of_mind', 'new', true, now())
  on conflict ((lower(email))) do update set
    full_name = excluded.full_name,
    company = excluded.company,
    role = excluded.role,
    country = excluded.country,
    interest = excluded.interest,
    website = excluded.website,
    linkedin = excluded.linkedin,
    source = 'proof_of_mind',
    status = 'new',
    consent_to_contact = true,
    updated_at = now()
  returning id into v_lead_id;

  insert into public.lead_concepts (lead_id, concept_id, interest_level, notes, updated_at)
  values (v_lead_id, p_concept_id, 'warm', trim(p_interest_message), now())
  on conflict (lead_id, concept_id) do update set interest_level = 'warm', notes = excluded.notes, updated_at = now();

  return query select v_lead_id, p_concept_id;
end;
$$;

revoke all on function public.submit_proof_of_mind_discovery_call(uuid, text, text, text, text, text, text, boolean, text, text, text) from public;
grant execute on function public.submit_proof_of_mind_discovery_call(uuid, text, text, text, text, text, text, boolean, text, text, text) to anon, authenticated;

comment on function public.submit_proof_of_mind_discovery_call(uuid, text, text, text, text, text, text, boolean, text, text, text) is
  'Creates or reuses a Proof of Mind lead and upserts the selected concept relation without exposing protected concept fields.';

commit;
