-- Journal people model: one post can have multiple related people.
-- Reuses the existing journal_post_authors junction table to avoid duplicate sources of truth.

alter table public.journal_post_authors
  drop constraint if exists journal_post_authors_role_check;

alter table public.journal_post_authors
  add constraint journal_post_authors_role_check
  check (role in ('author', 'subject', 'both', 'editor', 'contributor'));

create index if not exists journal_post_authors_post_role_order_idx
  on public.journal_post_authors (journal_post_id, role, author_order);

create index if not exists journal_post_authors_profile_role_idx
  on public.journal_post_authors (profile_id, role);

comment on table public.journal_post_authors is
  'Many-to-many relation between journal posts and people. Role defines whether a person authored the post, is featured in it, or both.';

comment on column public.journal_post_authors.role is
  'author = wrote the post; subject = post is about this person; both = author and subject; editor/contributor = supporting editorial roles.';

-- Preserve legacy single-author data in the canonical junction table.
insert into public.journal_post_authors (journal_post_id, profile_id, author_order, role)
select p.id, p.author_profile_id, 0, 'author'
from public.journal_posts p
where p.author_profile_id is not null
on conflict (journal_post_id, profile_id) do update
set role = case
  when public.journal_post_authors.role = 'subject' then 'both'
  else public.journal_post_authors.role
end;

-- Backfill obvious subject relations from current editorial content.
-- This fixes existing Micha/Kevin journey chapters without hard-coding UUIDs.
with founder_profiles as (
  select id, lower(coalesce(slug, '')) as slug, lower(coalesce(display_name, full_name, '')) as name
  from public.profiles
  where lower(coalesce(slug, '')) in ('kevin-de-vlieger', 'kevin', 'micha')
     or lower(coalesce(display_name, full_name, '')) in ('kevin de vlieger', 'kevin', 'micha')
), matched as (
  select distinct
    p.id as journal_post_id,
    fp.id as profile_id,
    case when jpa.profile_id is null then 'subject'
         when jpa.role = 'author' then 'both'
         else jpa.role end as resolved_role
  from public.journal_posts p
  join founder_profiles fp on (
    (fp.slug in ('micha') or fp.name = 'micha')
      and lower(coalesce(p.slug, '') || ' ' || coalesce(p.title, '') || ' ' || coalesce(p.excerpt, '')) like '%micha%'
  ) or (
    (fp.slug in ('kevin-de-vlieger', 'kevin') or fp.name in ('kevin de vlieger', 'kevin'))
      and lower(coalesce(p.slug, '') || ' ' || coalesce(p.title, '') || ' ' || coalesce(p.excerpt, '')) like '%kevin%'
  )
  left join public.journal_post_authors jpa
    on jpa.journal_post_id = p.id and jpa.profile_id = fp.id
)
insert into public.journal_post_authors (journal_post_id, profile_id, author_order, role)
select journal_post_id, profile_id,
       row_number() over (partition by journal_post_id order by profile_id) - 1,
       resolved_role
from matched
on conflict (journal_post_id, profile_id) do update
set role = excluded.role;

-- Public read model with explicit semantics for frontend and API clients.
create or replace view public.public_journal_post_people
with (security_invoker = true)
as
select
  jpa.journal_post_id,
  jpa.profile_id,
  jpa.role as relation_role,
  jpa.author_order as display_order,
  p.slug,
  coalesce(p.display_name, p.full_name, 'Community member') as display_name,
  p.full_name,
  p.avatar_url,
  p.bio,
  p.location,
  coalesce(p.is_founder, false) as is_founder,
  coalesce(p.is_public, false) as is_public
from public.journal_post_authors jpa
join public.profiles p on p.id = jpa.profile_id
join public.journal_posts jp on jp.id = jpa.journal_post_id
where jp.status = 'published'
  and jp.published_at is not null
  and jp.published_at <= now()
  and coalesce(p.is_public, false) = true;

grant select on public.public_journal_post_people to anon, authenticated;
