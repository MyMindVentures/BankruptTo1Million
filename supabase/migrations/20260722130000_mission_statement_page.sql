-- Public Mission Statement page for issue #217.
-- Canonical repository migration. Idempotent and safe to re-run.

begin;

insert into public.website_pages (slug, route_path, page_name, original_language, status, is_public, display_order, metadata)
values ('mission-statement','/mission-statement','Mission Statement','en','published',true,35,jsonb_build_object('issue',217,'document_version','v2.1'))
on conflict (slug) do update set route_path=excluded.route_path,page_name=excluded.page_name,status='published',is_public=true,metadata=excluded.metadata,updated_at=now();

with p as (select id from public.website_pages where slug='mission-statement')
insert into public.website_page_blocks (website_page_id,block_key,block_type,display_order,is_active,settings)
select p.id,v.block_key,v.block_type,v.display_order,true,'{}'::jsonb from p cross join (values
('hero','hero',10),('core-message','content',20),('mission-body','content',30),('strategic-priorities','content',40),('red-thread','content',50),('closing','content',60)
) v(block_key,block_type,display_order)
on conflict (website_page_id,block_key) do update set block_type=excluded.block_type,display_order=excluded.display_order,is_active=true,updated_at=now();

create or replace function public.get_localized_website_page(p_slug text,p_language_code text default 'en') returns jsonb language sql stable security invoker set search_path='public','pg_catalog','pg_temp' as $$
select jsonb_build_object('id',p.id,'slug',p.slug,'route_path',p.route_path,'page_name',p.page_name,'language',coalesce(nullif(p_language_code,''),'en'),'blocks',coalesce(jsonb_agg(jsonb_build_object('id',b.id,'block_key',b.block_key,'block_type',b.block_type,'display_order',b.display_order,'eyebrow',coalesce(t.eyebrow,en.eyebrow),'title',coalesce(t.title,en.title),'subtitle',coalesce(t.subtitle,en.subtitle),'body',coalesce(t.body,en.body),'seo_title',coalesce(t.seo_title,en.seo_title),'seo_description',coalesce(t.seo_description,en.seo_description)) order by b.display_order) filter(where b.id is not null),'[]'::jsonb))
from public.website_pages p
left join public.website_page_blocks b on b.website_page_id=p.id and b.is_active=true
left join public.website_page_block_translations t on t.website_page_block_id=b.id and t.language_code=coalesce(nullif(p_language_code,''),'en') and t.translation_status='published'
left join public.website_page_block_translations en on en.website_page_block_id=b.id and en.language_code='en' and en.translation_status='published'
where p.slug=p_slug and p.status='published' and p.is_public=true
group by p.id;
$$;

revoke all on function public.get_localized_website_page(text,text) from public;
grant execute on function public.get_localized_website_page(text,text) to anon,authenticated,service_role;
grant select on public.website_pages, public.website_page_blocks, public.website_page_block_translations to anon,authenticated;

commit;
