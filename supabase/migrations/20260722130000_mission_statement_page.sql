-- Public Mission Statement page for issue #217.
-- The production database migration was applied through Supabase before this file was committed.

begin;

insert into public.website_pages (slug, route_path, page_name, original_language, status, is_public, display_order, metadata)
values ('mission-statement','/mission-statement','Mission Statement','en','published',true,35,jsonb_build_object('issue',217,'document_version','v2.1'))
on conflict (slug) do update set route_path=excluded.route_path,page_name=excluded.page_name,status='published',is_public=true,metadata=excluded.metadata,updated_at=now();

-- Page blocks, translations, UI keys, component registry and localized RPC are seeded by the
-- idempotent production migration named mission_statement_page.
-- Keep this repository marker so future schema history can trace the feature to issue #217.

commit;
