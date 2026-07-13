-- Correct the seven public journey chapters so the linked people represent
-- who each chapter is about, not who happened to be stored as an author.

-- Keep canonical journal author avatars synchronized with founder profiles.
update public.journal_authors ja
set avatar_url = fp.avatar_url,
    updated_at = now()
from public.founder_profiles_public fp
where fp.journal_author_id = ja.id
  and fp.avatar_url is not null
  and ja.avatar_url is distinct from fp.avatar_url;

-- Clear only the seven timeline relations before rebuilding them explicitly.
delete from public.journal_post_author_links l
using public.journal_posts p
where l.journal_post_id = p.id
  and p.slug in (
    'micha-in-motril-sinds-april-2026',
    'kevin-verlaat-appartement-santa-pola-26-juni-2026',
    'kevin-naar-motril-27-juni-2026',
    'kevin-vertrekt-uit-motril-naar-benejarafe-5-juli-2026',
    'kevin-drie-nachten-finca-benejarafe-juli-2026',
    'kevin-opnieuw-in-auto-benejarafe-vanaf-9-juli-2026',
    'bankrupt-to-1-million-bedacht-op-10-juli-2026'
  );

-- Micha is the subject of the Motril chapter.
insert into public.journal_post_author_links
  (journal_post_id, journal_author_id, author_order, author_role)
select p.id, a.id, 0, 'subject'
from public.journal_posts p
join public.journal_authors a on a.slug = 'micha'
where p.slug = 'micha-in-motril-sinds-april-2026';

-- Kevin is the subject of the five personal journey chapters.
insert into public.journal_post_author_links
  (journal_post_id, journal_author_id, author_order, author_role)
select p.id, a.id, 0, 'subject'
from public.journal_posts p
join public.journal_authors a on a.slug = 'kevin-de-vlieger'
where p.slug in (
  'kevin-verlaat-appartement-santa-pola-26-juni-2026',
  'kevin-naar-motril-27-juni-2026',
  'kevin-vertrekt-uit-motril-naar-benejarafe-5-juli-2026',
  'kevin-drie-nachten-finca-benejarafe-juli-2026',
  'kevin-opnieuw-in-auto-benejarafe-vanaf-9-juli-2026'
);

-- The mission-origin chapter is about both founders.
insert into public.journal_post_author_links
  (journal_post_id, journal_author_id, author_order, author_role)
select p.id, a.id,
       case when a.slug = 'kevin-de-vlieger' then 0 else 1 end,
       'subject'
from public.journal_posts p
join public.journal_authors a on a.slug in ('kevin-de-vlieger', 'micha')
where p.slug = 'bankrupt-to-1-million-bedacht-op-10-juli-2026';
