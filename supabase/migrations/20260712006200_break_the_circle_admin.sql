insert into public.journal_categories (name,slug,description,display_order,is_public)
values ('Help Us Break The Circle','help-us-break-the-circle','Stories about trapped potential and the people, partners and environments that can help break the cycle.',10,true)
on conflict (slug) do update set name=excluded.name, description=excluded.description, is_public=excluded.is_public;

create table if not exists public.break_the_circle_posts (
  id uuid primary key default gen_random_uuid(),
  journal_post_id uuid not null unique references public.journal_posts(id) on delete cascade,
  cta_label text,
  cta_url text,
  featured_order integer not null default 0 check (featured_order >= 0),
  is_featured boolean not null default false,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cta_pair check ((cta_label is null and cta_url is null) or (cta_label is not null and cta_url is not null))
);

alter table public.break_the_circle_posts enable row level security;

drop policy if exists "public reads published break the circle metadata" on public.break_the_circle_posts;
create policy "public reads published break the circle metadata" on public.break_the_circle_posts for select using (
  exists (select 1 from public.journal_posts p where p.id = journal_post_id and p.status = 'published' and p.published_at is not null and p.published_at <= now())
);

drop policy if exists "admins manage break the circle metadata" on public.break_the_circle_posts;
create policy "admins manage break the circle metadata" on public.break_the_circle_posts for all to authenticated using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin') with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "admins manage journal posts" on public.journal_posts;
create policy "admins manage journal posts" on public.journal_posts for all to authenticated using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin') with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
drop policy if exists "admins manage journal post tags" on public.journal_post_tags;
create policy "admins manage journal post tags" on public.journal_post_tags for all to authenticated using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin') with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
drop policy if exists "admins read journal authors" on public.journal_authors;
create policy "admins read journal authors" on public.journal_authors for select to authenticated using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
drop policy if exists "admins manage journal author links" on public.journal_post_author_links;
create policy "admins manage journal author links" on public.journal_post_author_links for all to authenticated using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin') with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create or replace function public.upsert_break_the_circle_post(p_post_id uuid, p_post jsonb, p_meta jsonb, p_author_ids uuid[] default '{}', p_tag_ids uuid[] default '{}', p_category_slug text default 'help-us-break-the-circle') returns table(id uuid)
language plpgsql security invoker as $$
declare v_category_id uuid; v_post_id uuid; v_author_id uuid; v_tag_id uuid;
begin
  if (auth.jwt() -> 'app_metadata' ->> 'role') <> 'admin' then raise exception 'Administrator access is required.'; end if;
  select c.id into v_category_id from public.journal_categories c where c.slug = p_category_slug;
  if v_category_id is null then raise exception 'Break the Circle category is missing.'; end if;
  if p_post_id is null then
    insert into public.journal_posts (slug,status,title,subtitle,excerpt,body,content_format,cover_image_url,cover_image_alt,original_language,category_id,is_featured,published_at,scheduled_for,reading_time_minutes,seo_title,seo_description,og_image_url)
    values (p_post->>'slug', p_post->>'status', p_post->>'title', nullif(p_post->>'subtitle',''), nullif(p_post->>'excerpt',''), nullif(p_post->>'body',''), coalesce(p_post->>'content_format','markdown'), nullif(p_post->>'cover_image_url',''), nullif(p_post->>'cover_image_alt',''), coalesce(p_post->>'original_language','en'), v_category_id, coalesce((p_post->>'is_featured')::boolean,false), nullif(p_post->>'published_at','')::timestamptz, nullif(p_post->>'scheduled_for','')::timestamptz, nullif(p_post->>'reading_time_minutes','')::integer, nullif(p_post->>'seo_title',''), nullif(p_post->>'seo_description',''), nullif(p_post->>'og_image_url','')) returning journal_posts.id into v_post_id;
    insert into public.break_the_circle_posts (journal_post_id,cta_label,cta_url,is_featured,featured_order,created_by,updated_by) values (v_post_id, nullif(p_meta->>'cta_label',''), nullif(p_meta->>'cta_url',''), coalesce((p_meta->>'is_featured')::boolean,false), coalesce((p_meta->>'featured_order')::integer,0), auth.uid(), auth.uid());
  else
    v_post_id := p_post_id;
    update public.journal_posts set slug=p_post->>'slug', status=p_post->>'status', title=p_post->>'title', subtitle=nullif(p_post->>'subtitle',''), excerpt=nullif(p_post->>'excerpt',''), body=nullif(p_post->>'body',''), content_format=coalesce(p_post->>'content_format','markdown'), cover_image_url=nullif(p_post->>'cover_image_url',''), cover_image_alt=nullif(p_post->>'cover_image_alt',''), original_language=coalesce(p_post->>'original_language','en'), category_id=v_category_id, is_featured=coalesce((p_post->>'is_featured')::boolean,false), published_at=nullif(p_post->>'published_at','')::timestamptz, scheduled_for=nullif(p_post->>'scheduled_for','')::timestamptz, reading_time_minutes=nullif(p_post->>'reading_time_minutes','')::integer, seo_title=nullif(p_post->>'seo_title',''), seo_description=nullif(p_post->>'seo_description',''), og_image_url=nullif(p_post->>'og_image_url',''), updated_at=now() where journal_posts.id=v_post_id;
    update public.break_the_circle_posts set cta_label=nullif(p_meta->>'cta_label',''), cta_url=nullif(p_meta->>'cta_url',''), is_featured=coalesce((p_meta->>'is_featured')::boolean,false), featured_order=coalesce((p_meta->>'featured_order')::integer,0), updated_by=auth.uid(), updated_at=now() where journal_post_id=v_post_id;
  end if;
  delete from public.journal_post_tags where journal_post_id=v_post_id;
  foreach v_tag_id in array p_tag_ids loop insert into public.journal_post_tags (journal_post_id, tag_id) values (v_post_id, v_tag_id) on conflict do nothing; end loop;
  delete from public.journal_post_author_links where journal_post_id=v_post_id;
  foreach v_author_id in array p_author_ids loop insert into public.journal_post_author_links (journal_post_id, journal_author_id, author_order, author_role) values (v_post_id, v_author_id, 0, 'author') on conflict do nothing; end loop;
  return query select v_post_id;
end; $$;
