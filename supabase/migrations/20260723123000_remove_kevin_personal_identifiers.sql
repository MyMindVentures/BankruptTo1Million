begin;

update public.profiles
set
  full_name = 'Kevin',
  display_name = 'Kevin',
  slug = case when slug = 'kevin-de-vlieger' then 'kevin' else slug end
where lower(coalesce(full_name, '')) = 'kevin de vlieger'
   or lower(coalesce(display_name, '')) = 'kevin de vlieger'
   or lower(coalesce(slug, '')) = 'kevin-de-vlieger';

update public.website_translation_keys
set default_text = replace(default_text, 'Kevin De Vlieger', 'Kevin')
where default_text like '%Kevin De Vlieger%';

update public.website_translations
set translated_text = replace(translated_text, 'Kevin De Vlieger', 'Kevin')
where translated_text like '%Kevin De Vlieger%';

commit;
