-- Issue #48: Supabase-backed issue claiming and profile completion support.
create table if not exists public.github_issue_developers (
  id uuid primary key default gen_random_uuid(),
  github_issue_id bigint not null references public.github_issues(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  github_login text not null,
  contribution_status text not null default 'in_progress' check (contribution_status in ('claimed','in_progress','submitted','in_review','completed','released')),
  is_primary_claimant boolean not null default true,
  claimed_at timestamptz not null default now(),
  submitted_at timestamptz,
  reviewed_at timestamptz,
  completed_at timestamptz,
  released_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists role text;
alter table public.profiles add column if not exists github_profile_url text;
alter table public.profiles add column if not exists github_login text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists primary_disciplines text[] not null default '{}';
alter table public.profiles add column if not exists experience_level text;
alter table public.profiles add column if not exists consent_public_recognition boolean not null default false;
alter table public.profiles add column if not exists accepted_contribution_guidelines boolean not null default false;

create unique index if not exists one_active_primary_claim_per_issue
  on public.github_issue_developers (github_issue_id)
  where is_primary_claimant and contribution_status in ('claimed','in_progress','submitted','in_review');

create or replace function public.claim_github_issue(p_issue_number integer)
returns public.github_issue_developers
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_issue public.github_issues%rowtype;
  v_claim public.github_issue_developers%rowtype;
begin
  select * into v_profile from public.profiles where id = auth.uid();
  if v_profile.id is null then raise exception 'Complete your contributor profile before claiming an issue.'; end if;
  if coalesce(v_profile.display_name,'') = '' or coalesce(v_profile.role,'') = '' or coalesce(v_profile.github_profile_url,'') = ''
    or coalesce(v_profile.github_login,'') = '' or coalesce(v_profile.avatar_url,'') = '' or coalesce(v_profile.bio,'') = ''
    or cardinality(v_profile.primary_disciplines) = 0 or coalesce(v_profile.experience_level,'') = ''
    or not v_profile.consent_public_recognition or not v_profile.accepted_contribution_guidelines then
    raise exception 'Your contributor profile is incomplete.';
  end if;
  select * into v_issue from public.github_issues where issue_number = p_issue_number for update;
  if v_issue.id is null then raise exception 'Issue not found.'; end if;
  if v_issue.state = 'closed' then raise exception 'Closed issues cannot be claimed.'; end if;
  insert into public.github_issue_developers (github_issue_id, profile_id, github_login, contribution_status, is_primary_claimant)
  values (v_issue.id, auth.uid(), v_profile.github_login, 'in_progress', true)
  returning * into v_claim;
  return v_claim;
end;
$$;

alter table public.github_issue_developers enable row level security;
create policy "public can read public claims" on public.github_issue_developers for select using (true);
create policy "contributors can read own claims" on public.github_issue_developers for select using (profile_id = auth.uid());
create policy "contributors create own claims through rpc" on public.github_issue_developers for insert with check (profile_id = auth.uid());
create policy "contributors update own non-admin claim status" on public.github_issue_developers for update using (profile_id = auth.uid()) with check (profile_id = auth.uid() and contribution_status in ('submitted'));
