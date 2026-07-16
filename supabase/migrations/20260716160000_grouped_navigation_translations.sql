insert into public.website_translation_keys
  (translation_key, namespace, description, default_text, value_type, is_required, is_active, interpolation_variables, supports_plural)
values
  ('navigation.group.explore', 'navigation', 'Grouped navigation label for explore links', 'Explore', 'text', true, true, '{}', false),
  ('navigation.group.community', 'navigation', 'Grouped navigation label for community links', 'Community', 'text', true, true, '{}', false),
  ('navigation.group.participate', 'navigation', 'Grouped navigation label for participate links', 'Participate', 'text', true, true, '{}', false),
  ('header.nav_group_toggle_aria', 'header', 'Accessible label for opening a navigation group dropdown', 'Open {group} links', 'text', true, true, '{"group"}', false)
on conflict (translation_key) do update
set default_text = excluded.default_text,
    description = excluded.description,
    interpolation_variables = excluded.interpolation_variables,
    is_active = true,
    updated_at = now();

with catalog(translation_key, language_code, translated_text) as (
  values
    ('navigation.group.explore','en','Explore'),('navigation.group.explore','nl','Ontdekken'),('navigation.group.explore','fr','Explorer'),('navigation.group.explore','de','Entdecken'),('navigation.group.explore','es','Explorar'),('navigation.group.explore','pt','Explorar'),('navigation.group.explore','it','Esplora'),('navigation.group.explore','pl','Odkrywaj'),('navigation.group.explore','cs','Prozkoumat'),('navigation.group.explore','tr','Keşfet'),('navigation.group.explore','ar','استكشف'),('navigation.group.explore','hi','खोजें'),('navigation.group.explore','zh','探索'),('navigation.group.explore','ja','探索'),('navigation.group.explore','ko','탐색'),
    ('navigation.group.community','en','Community'),('navigation.group.community','nl','Community'),('navigation.group.community','fr','Communauté'),('navigation.group.community','de','Community'),('navigation.group.community','es','Comunidad'),('navigation.group.community','pt','Comunidade'),('navigation.group.community','it','Community'),('navigation.group.community','pl','Społeczność'),('navigation.group.community','cs','Komunita'),('navigation.group.community','tr','Topluluk'),('navigation.group.community','ar','المجتمع'),('navigation.group.community','hi','समुदाय'),('navigation.group.community','zh','社区'),('navigation.group.community','ja','コミュニティ'),('navigation.group.community','ko','커뮤니티'),
    ('navigation.group.participate','en','Participate'),('navigation.group.participate','nl','Deelnemen'),('navigation.group.participate','fr','Participer'),('navigation.group.participate','de','Mitmachen'),('navigation.group.participate','es','Participar'),('navigation.group.participate','pt','Participar'),('navigation.group.participate','it','Partecipa'),('navigation.group.participate','pl','Weź udział'),('navigation.group.participate','cs','Zapojit se'),('navigation.group.participate','tr','Katıl'),('navigation.group.participate','ar','شارك'),('navigation.group.participate','hi','भाग लें'),('navigation.group.participate','zh','参与'),('navigation.group.participate','ja','参加'),('navigation.group.participate','ko','참여'),
    ('header.nav_group_toggle_aria','en','Open {group} links'),('header.nav_group_toggle_aria','nl','Open {group}-links'),('header.nav_group_toggle_aria','fr','Ouvrir les liens {group}'),('header.nav_group_toggle_aria','de','{group}-Links öffnen'),('header.nav_group_toggle_aria','es','Abrir enlaces de {group}'),('header.nav_group_toggle_aria','pt','Abrir links de {group}'),('header.nav_group_toggle_aria','it','Apri i link {group}'),('header.nav_group_toggle_aria','pl','Otwórz linki {group}'),('header.nav_group_toggle_aria','cs','Otevřít odkazy {group}'),('header.nav_group_toggle_aria','tr','{group} bağlantılarını aç'),('header.nav_group_toggle_aria','ar','افتح روابط {group}'),('header.nav_group_toggle_aria','hi','{group} लिंक खोलें'),('header.nav_group_toggle_aria','zh','打开{group}链接'),('header.nav_group_toggle_aria','ja','{group}リンクを開く'),('header.nav_group_toggle_aria','ko','{group} 링크 열기')
), resolved as (
  select k.id as translation_key_id, c.language_code, c.translated_text
  from catalog c
  join public.website_translation_keys k on k.translation_key = c.translation_key
)
insert into public.website_translations
  (translation_key_id, language_code, translated_text, translation_status, translation_source, translated_at, reviewed_at, published_at)
select translation_key_id, language_code, translated_text, 'published', 'manual', now(), now(), now()
from resolved
on conflict (translation_key_id, language_code) do update
set translated_text = excluded.translated_text,
    translation_status = 'published',
    translation_source = 'manual',
    translated_at = now(),
    reviewed_at = now(),
    published_at = now(),
    updated_at = now();
