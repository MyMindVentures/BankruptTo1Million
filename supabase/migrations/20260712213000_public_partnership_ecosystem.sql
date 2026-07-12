create table if not exists public.partnership_contact_concepts (
  contact_id uuid not null references public.partnership_contacts(id) on delete cascade,
  concept_id uuid not null references public.proof_of_mind_concepts(id) on delete cascade,
  relevance_score numeric check (relevance_score is null or relevance_score between 0 and 10),
  priority text not null default 'medium' check (priority in ('low','medium','high','critical')),
  relationship_status text not null default 'target' check (relationship_status in ('target','researching','ready_for_outreach','contacted','in_conversation','proposal','partnered','declined','inactive')),
  why_this_partner text,
  concept_value_proposition text,
  desired_collaboration text,
  is_public boolean not null default true,
  display_order integer not null default 0 check (display_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (contact_id, concept_id)
);

create index if not exists partnership_contact_concepts_concept_idx
  on public.partnership_contact_concepts(concept_id, priority, relevance_score desc);

alter table public.partnership_contact_concepts enable row level security;

create policy "Public can view public concept partnership targets"
on public.partnership_contact_concepts for select
to anon, authenticated
using (is_public = true);

create policy "Admins manage concept partnership targets"
on public.partnership_contact_concepts for all
to authenticated
using (exists (
  select 1 from public.admin_allowlist a
  where lower(a.email) = lower(auth.jwt()->>'email') and a.is_active = true
))
with check (exists (
  select 1 from public.admin_allowlist a
  where lower(a.email) = lower(auth.jwt()->>'email') and a.is_active = true
));

create trigger set_partnership_contact_concepts_updated_at
before update on public.partnership_contact_concepts
for each row execute function public.set_partnership_updated_at();

-- Seed the currently researched Rewire targets into the direct concept mapping.
insert into public.partnership_contact_concepts (
  contact_id,
  concept_id,
  relevance_score,
  priority,
  relationship_status,
  why_this_partner,
  concept_value_proposition,
  desired_collaboration,
  is_public,
  display_order
)
select distinct on (pcc.contact_id)
  pcc.contact_id,
  pcatc.concept_id,
  pcc.relevance_score,
  pcc.priority,
  case pc.contact_status
    when 'partnered' then 'partnered'
    when 'contacted' then 'contacted'
    when 'replied' then 'in_conversation'
    when 'meeting_booked' then 'in_conversation'
    when 'qualified' then 'proposal'
    when 'ready_for_outreach' then 'ready_for_outreach'
    when 'verified' then 'ready_for_outreach'
    else 'researching'
  end,
  coalesce(pcc.category_specific_fit, pc.why_relevant),
  pc.personalized_value_proposition,
  pc.outreach_angle,
  true,
  row_number() over (
    partition by pcatc.concept_id
    order by
      case pcc.priority when 'critical' then 1 when 'high' then 2 when 'medium' then 3 else 4 end,
      pcc.relevance_score desc nulls last,
      coalesce(pc.organization_name, pc.channel_name, pc.full_name)
  )
from public.partnership_contact_categories pcc
join public.partnership_contacts pc on pc.id = pcc.contact_id
join public.partnership_category_concepts pcatc on pcatc.category_id = pcc.category_id
where pcatc.concept_id = '6234535d-7762-4ec1-9689-6cbc6ff58bd7'::uuid
on conflict (contact_id, concept_id) do update set
  relevance_score = excluded.relevance_score,
  priority = excluded.priority,
  relationship_status = excluded.relationship_status,
  why_this_partner = excluded.why_this_partner,
  concept_value_proposition = excluded.concept_value_proposition,
  desired_collaboration = excluded.desired_collaboration,
  is_public = excluded.is_public,
  display_order = excluded.display_order,
  updated_at = now();

create or replace function public.get_public_concept_partnership_ecosystem(
  requested_slug text,
  per_category_limit integer default 20
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
with selected_concept as (
  select id, slug, title
  from public.proof_of_mind_concepts
  where slug = requested_slug
    and visibility = 'full'
  limit 1
), ranked_contacts as (
  select
    cat.id as category_id,
    cat.category_key,
    cat.category_name,
    cat.description as category_description,
    cat.strategic_goal,
    pcatc.partnership_objective,
    pcatc.desired_partner_profile,
    pcatc.priority as category_priority,
    pcatc.target_count,
    contact.id as contact_id,
    coalesce(contact.channel_name, contact.organization_name, contact.full_name) as partner_name,
    contact.full_name,
    contact.organization_name,
    contact.channel_name,
    contact.job_title,
    contact.contact_type,
    contact.website_url,
    contact.youtube_url,
    contact.linkedin_url,
    contact.instagram_url,
    contact.x_url,
    contact.country,
    contact.why_relevant,
    contact.personalized_value_proposition,
    contact.outreach_angle,
    link.relevance_score,
    link.priority,
    link.relationship_status,
    link.why_this_partner,
    link.concept_value_proposition,
    link.desired_collaboration,
    row_number() over (
      partition by cat.id
      order by
        case link.priority when 'critical' then 1 when 'high' then 2 when 'medium' then 3 else 4 end,
        link.relevance_score desc nulls last,
        link.display_order,
        coalesce(contact.channel_name, contact.organization_name, contact.full_name)
    ) as category_rank
  from selected_concept concept
  join public.partnership_category_concepts pcatc on pcatc.concept_id = concept.id and pcatc.status = 'active'
  join public.partnership_categories cat on cat.id = pcatc.category_id and cat.is_active = true
  join public.partnership_contact_categories contact_category on contact_category.category_id = cat.id
  join public.partnership_contacts contact on contact.id = contact_category.contact_id
  join public.partnership_contact_concepts link on link.contact_id = contact.id and link.concept_id = concept.id and link.is_public = true
), category_totals as (
  select category_id, count(distinct contact_id)::integer as identified_count
  from ranked_contacts
  group by category_id
), categories as (
  select
    rc.category_id,
    rc.category_key,
    rc.category_name,
    rc.category_description,
    rc.strategic_goal,
    rc.partnership_objective,
    rc.desired_partner_profile,
    rc.category_priority,
    rc.target_count,
    totals.identified_count,
    jsonb_agg(
      jsonb_build_object(
        'id', rc.contact_id,
        'name', rc.partner_name,
        'full_name', rc.full_name,
        'organization_name', rc.organization_name,
        'channel_name', rc.channel_name,
        'job_title', rc.job_title,
        'contact_type', rc.contact_type,
        'country', rc.country,
        'website_url', rc.website_url,
        'youtube_url', rc.youtube_url,
        'linkedin_url', rc.linkedin_url,
        'instagram_url', rc.instagram_url,
        'x_url', rc.x_url,
        'relevance_score', rc.relevance_score,
        'priority', rc.priority,
        'relationship_status', rc.relationship_status,
        'why_this_partner', coalesce(rc.why_this_partner, rc.why_relevant),
        'value_proposition', coalesce(rc.concept_value_proposition, rc.personalized_value_proposition),
        'desired_collaboration', coalesce(rc.desired_collaboration, rc.outreach_angle)
      ) order by rc.category_rank
    ) filter (where rc.category_rank <= greatest(1, least(coalesce(per_category_limit, 20), 20))) as partners
  from ranked_contacts rc
  join category_totals totals on totals.category_id = rc.category_id
  group by rc.category_id, rc.category_key, rc.category_name, rc.category_description,
           rc.strategic_goal, rc.partnership_objective, rc.desired_partner_profile,
           rc.category_priority, rc.target_count, totals.identified_count
)
select coalesce(jsonb_build_object(
  'concept_id', concept.id,
  'concept_slug', concept.slug,
  'concept_title', concept.title,
  'category_count', (select count(*) from categories),
  'identified_partners', (select count(*) from public.partnership_contact_concepts link where link.concept_id = concept.id and link.is_public = true),
  'target_partners', (select coalesce(sum(coalesce(target_count, 20)), 0) from public.partnership_category_concepts where concept_id = concept.id and status = 'active'),
  'categories', coalesce((
    select jsonb_agg(to_jsonb(categories) order by
      case category_priority when 'critical' then 1 when 'high' then 2 when 'medium' then 3 else 4 end,
      category_name
    ) from categories
  ), '[]'::jsonb)
), '{}'::jsonb)
from selected_concept concept;
$$;

revoke all on function public.get_public_concept_partnership_ecosystem(text, integer) from public;
grant execute on function public.get_public_concept_partnership_ecosystem(text, integer) to anon, authenticated;

comment on function public.get_public_concept_partnership_ecosystem(text, integer)
is 'Returns public-safe partnership targets grouped by category for a full Proof of Mind concept, capped at 20 partners per category.';
