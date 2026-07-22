-- Database-backed, localized Kevin goals and roadmap page for issue #224.

begin;

insert into public.website_pages (slug, route_path, page_name, original_language, status, is_public, display_order, metadata)
values ('kevin-goals-roadmap', '/kevin-goals-roadmap', 'Kevin''s Goals & Roadmap', 'en', 'published', true, 36, jsonb_build_object('issue', 224))
on conflict (slug) do update set route_path=excluded.route_path, page_name=excluded.page_name, status='published', is_public=true, metadata=excluded.metadata, updated_at=now();

with p as (select id from public.website_pages where slug='kevin-goals-roadmap')
insert into public.website_page_blocks (website_page_id, block_key, block_type, display_order, is_active, settings)
select p.id, v.block_key, v.block_type, v.display_order, true, '{}'::jsonb
from p cross join (values
  ('hero','hero',10), ('mission','content',20), ('roadmap','content',30),
  ('goal-01','content',41), ('goal-02','content',42), ('goal-03','content',43),
  ('goal-04','content',44), ('goal-05','content',45), ('goal-06','content',46),
  ('goal-07','content',47), ('goal-08','content',48), ('goal-09','content',49),
  ('principle','content',60)
) v(block_key,block_type,display_order)
on conflict (website_page_id,block_key) do update set block_type=excluded.block_type, display_order=excluded.display_order, is_active=true, updated_at=now();

with content(block_key, eyebrow, title, subtitle, body, seo_title, seo_description) as (values
  ('hero','Personal North Star','Kevin''s Goals & Roadmap','Create a life where time, talent, passions and business reinforce each other—building meaningful ventures without constantly fighting financial survival.','Explore the roadmap','Kevin''s Goals & Roadmap | Bankrupt to 1 Million','The mission behind it'),
  ('mission','My mission','From survival loops to lasting momentum','The goal is not simply to work harder. It is to build leverage, protect mental energy and create a direction that combines freedom, confidence, relationships, technology, adventure and shared success.',E'Freedom\nClarity\nLeverage\nRelationships\nAdventure\nShared success',null,null),
  ('roadmap','The roadmap','Nine priorities. One direction.',E'09 priorities\n01 direction','Move from survival mode to a life built around momentum, freedom and meaningful creation.',null,'Each priority turns the bigger vision into a practical focus for daily decisions, partnerships and future ventures.'),
  ('goal-01','Momentum','Gain momentum',null,'Stop running in circles around startup funding. Build the right support structure with developers, venture studios, investors and strategic partners so progress can compound.',null,null),
  ('goal-02','Freedom','Work with freedom',null,'Create a way of working that functions anywhere, anytime and on any device, supported by systems that do not depend on constant personal attention.',null,null),
  ('goal-03','Clarity','Protect my mind',null,'Use my brain to improve and create concepts instead of exhausting it through survival loops, overload and continuously searching for a way out.',null,null),
  ('goal-04','People','Build long-term relationships',null,'Grow durable relationships with convinced investors, clients, developers, venture studios, founders and partners who believe in building together.',null,null),
  ('goal-05','Direction','Be proud of my daily direction',null,'Feel confident about my way of thinking, the products I create and where I invest my time, knowing I am on the right business and financial track.',null,null),
  ('goal-06','Alignment','Align work, interests and adventure',null,'Let entrepreneurship, technology, AI, aviation, photography, travel, problem-solving and community building strengthen each other instead of living in separate worlds.',null,null),
  ('goal-07','Leverage','Catch the AI train',null,'Become an AI-first entrepreneur by embracing the digital world, automations and intelligent systems that multiply creativity, output and opportunity.',null,null),
  ('goal-08','Compounding','Plant seeds that compound',null,'Build businesses, software, content, relationships, knowledge and a trusted brand that continue to grow beyond a single day of work.',null,null),
  ('goal-09','Together','Gain success together',null,'Create opportunities with people who believe in the mission, turning ideas into products, products into ventures and ventures into shared impact.',null,null),
  ('principle','Guiding principle','Build systems instead of stress.',null,E'Build leverage instead of only working harder.\nBuild relationships instead of transactions.\nPlant seeds every day and let compound growth do the rest.',null,null)
)
insert into public.website_page_block_translations
  (website_page_block_id, language_code, eyebrow, title, subtitle, body, seo_title, seo_description, translation_status, translation_source, translated_at, reviewed_at, published_at)
select b.id, sl.code, c.eyebrow, c.title, c.subtitle, c.body, c.seo_title, c.seo_description, 'published',
  case when sl.code='en' then 'manual' else 'bootstrap' end, now(), now(), now()
from public.website_pages p
join public.website_page_blocks b on b.website_page_id=p.id
join content c on c.block_key=b.block_key
cross join public.site_languages sl
where p.slug='kevin-goals-roadmap' and sl.is_active=true
on conflict (website_page_block_id,language_code) do update set eyebrow=excluded.eyebrow, title=excluded.title, subtitle=excluded.subtitle, body=excluded.body, seo_title=excluded.seo_title, seo_description=excluded.seo_description, translation_status=excluded.translation_status, updated_at=now();

insert into public.website_translation_keys
  (translation_key, namespace, description, default_text, value_type, is_required, is_active, interpolation_variables, supports_plural)
values
  ('kevin_goals_roadmap.states.loading','kevin_goals_roadmap','Roadmap loading state','Loading goals and roadmap…','text',true,true,'{}',false),
  ('kevin_goals_roadmap.states.error','kevin_goals_roadmap','Roadmap error state','The goals and roadmap are temporarily unavailable.','text',true,true,'{}',false),
  ('kevin_goals_roadmap.states.empty','kevin_goals_roadmap','Roadmap empty state','No published goals and roadmap are available.','text',true,true,'{}',false),
  ('navigation.kevin_goals_roadmap','navigation','Roadmap navigation label','Kevin''s Goals & Roadmap','text',true,true,'{}',false)
on conflict (translation_key) do update set namespace=excluded.namespace, description=excluded.description, default_text=excluded.default_text, is_active=true, updated_at=now();

insert into public.website_translations
  (translation_key_id, language_code, translated_text, translation_status, translation_source, translated_at, reviewed_at, published_at)
select k.id, sl.code, k.default_text, 'published', case when sl.code='en' then 'manual' else 'bootstrap' end, now(), now(), now()
from public.website_translation_keys k cross join public.site_languages sl
where sl.is_active=true and k.translation_key = any(array[
  'kevin_goals_roadmap.states.loading','kevin_goals_roadmap.states.error',
  'kevin_goals_roadmap.states.empty','navigation.kevin_goals_roadmap'
])
on conflict (translation_key_id,language_code) do nothing;

insert into public.website_ui_components
  (component_key,source_path,export_name,surface_type,namespace,is_public,entity_content,coverage_status)
values ('pages.kevin_goals_roadmap','src/pages/KevinGoalsRoadmapPage.tsx','KevinGoalsRoadmapPage','page','kevin_goals_roadmap',true,
  jsonb_build_object('rpc','get_localized_website_page','tables',jsonb_build_array('website_pages','website_page_blocks','website_page_block_translations')),'connected')
on conflict (component_key) do update set source_path=excluded.source_path, export_name=excluded.export_name, entity_content=excluded.entity_content, coverage_status=excluded.coverage_status, updated_at=now();

insert into public.website_ui_component_translation_keys (component_id,translation_key_id,usage_kind,is_required)
select c.id,k.id,case when k.translation_key like '%.error' then 'error' when k.translation_key like '%.empty' then 'empty' else 'loading' end,true
from public.website_ui_components c cross join public.website_translation_keys k
where c.component_key='pages.kevin_goals_roadmap' and k.translation_key = any(array[
  'kevin_goals_roadmap.states.loading','kevin_goals_roadmap.states.error','kevin_goals_roadmap.states.empty'
])
on conflict (component_id,translation_key_id) do update set usage_kind=excluded.usage_kind,is_required=true,updated_at=now();

commit;
