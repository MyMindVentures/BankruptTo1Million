with catalog(translation_key, language_code, translated_text) as (
  values
    ('navigation.group.explore','bg','Разгледай'),('navigation.group.explore','da','Udforsk'),('navigation.group.explore','el','Εξερεύνηση'),('navigation.group.explore','et','Avasta'),('navigation.group.explore','fi','Tutki'),('navigation.group.explore','hr','Istraži'),('navigation.group.explore','hu','Fedezd fel'),('navigation.group.explore','lt','Naršyk'),('navigation.group.explore','lv','Izpēti'),('navigation.group.explore','no','Utforsk'),('navigation.group.explore','ru','Исследовать'),('navigation.group.explore','sk','Preskúmať'),('navigation.group.explore','sl','Razišči'),('navigation.group.explore','sr','Истражи'),('navigation.group.explore','sv','Utforska'),
    ('navigation.group.community','bg','Общност'),('navigation.group.community','da','Fællesskab'),('navigation.group.community','el','Κοινότητα'),('navigation.group.community','et','Kogukond'),('navigation.group.community','fi','Yhteisö'),('navigation.group.community','hr','Zajednica'),('navigation.group.community','hu','Közösség'),('navigation.group.community','lt','Bendruomenė'),('navigation.group.community','lv','Kopiena'),('navigation.group.community','no','Fellesskap'),('navigation.group.community','ru','Сообщество'),('navigation.group.community','sk','Komunita'),('navigation.group.community','sl','Skupnost'),('navigation.group.community','sr','Заједница'),('navigation.group.community','sv','Gemenskap'),
    ('navigation.group.participate','bg','Участвай'),('navigation.group.participate','da','Deltag'),('navigation.group.participate','el','Συμμετοχή'),('navigation.group.participate','et','Osale'),('navigation.group.participate','fi','Osallistu'),('navigation.group.participate','hr','Sudjeluj'),('navigation.group.participate','hu','Részvétel'),('navigation.group.participate','lt','Dalyvauk'),('navigation.group.participate','lv','Piedalies'),('navigation.group.participate','no','Delta'),('navigation.group.participate','ru','Участвовать'),('navigation.group.participate','sk','Zapojiť sa'),('navigation.group.participate','sl','Sodeluj'),('navigation.group.participate','sr','Учествуј'),('navigation.group.participate','sv','Delta'),
    ('header.nav_group_toggle_aria','bg','Отвори връзките {group}'),('header.nav_group_toggle_aria','da','Åbn {group}-links'),('header.nav_group_toggle_aria','el','Άνοιγμα συνδέσμων {group}'),('header.nav_group_toggle_aria','et','Ava {group} lingid'),('header.nav_group_toggle_aria','fi','Avaa {group}-linkit'),('header.nav_group_toggle_aria','hr','Otvori {group} poveznice'),('header.nav_group_toggle_aria','hu','{group} linkek megnyitása'),('header.nav_group_toggle_aria','lt','Atidaryti {group} nuorodas'),('header.nav_group_toggle_aria','lv','Atvērt {group} saites'),('header.nav_group_toggle_aria','no','Åpne {group}-lenker'),('header.nav_group_toggle_aria','ru','Открыть ссылки {group}'),('header.nav_group_toggle_aria','sk','Otvoriť odkazy {group}'),('header.nav_group_toggle_aria','sl','Odpri povezave {group}'),('header.nav_group_toggle_aria','sr','Отвори {group} везе'),('header.nav_group_toggle_aria','sv','Öppna {group}-länkar')
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
