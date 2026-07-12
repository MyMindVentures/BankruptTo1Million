begin;

create or replace function public.get_proof_of_mind_concepts()
returns table (
  id uuid,
  slug text,
  category text,
  status text,
  title text,
  tagline text,
  short_description text,
  tags text[],
  visibility text,
  is_featured boolean,
  is_fully_openable boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id,
    c.slug,
    coalesce(c.category, 'Uncategorised') as category,
    c.concept_status as status,
    c.title,
    c.tagline,
    c.short_description,
    coalesce(c.tags, '{}'::text[]) as tags,
    c.visibility,
    c.is_featured,
    (c.visibility = 'full') as is_fully_openable
  from public.proof_of_mind_concepts c
  where c.visibility in ('teaser', 'full')
    and c.published_at is not null
  order by c.is_featured desc, c.display_order asc, c.title asc;
$$;

create or replace function public.get_proof_of_mind_concept_by_slug(p_slug text)
returns table (
  id uuid,
  slug text,
  category text,
  status text,
  title text,
  tagline text,
  short_description text,
  tags text[],
  visibility text,
  is_featured boolean,
  is_fully_openable boolean,
  problem text,
  solution text,
  target_audience text,
  key_features jsonb,
  business_model text,
  external_url text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id,
    c.slug,
    coalesce(c.category, 'Uncategorised') as category,
    c.concept_status as status,
    c.title,
    c.tagline,
    c.short_description,
    coalesce(c.tags, '{}'::text[]) as tags,
    c.visibility,
    c.is_featured,
    true as is_fully_openable,
    c.problem_statement as problem,
    c.solution_overview as solution,
    c.target_audience,
    coalesce(c.key_features, '[]'::jsonb) as key_features,
    c.business_model,
    c.external_url
  from public.proof_of_mind_concepts c
  where c.slug = p_slug
    and c.visibility = 'full'
    and c.published_at is not null
  limit 1;
$$;

revoke all on function public.get_proof_of_mind_concepts() from public;
revoke all on function public.get_proof_of_mind_concept_by_slug(text) from public;

grant execute on function public.get_proof_of_mind_concepts() to anon, authenticated;
grant execute on function public.get_proof_of_mind_concept_by_slug(text) to anon, authenticated;

comment on function public.get_proof_of_mind_concepts() is
  'Returns only published teaser and full Proof of Mind concepts for the public archive.';

comment on function public.get_proof_of_mind_concept_by_slug(text) is
  'Returns full concept details only when the concept is published and explicitly marked full.';

commit;
