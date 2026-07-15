begin;

insert into public.website_translation_keys
  (translation_key, namespace, description, default_text, value_type, is_required, is_active, interpolation_variables, supports_plural)
values
  ('founding_heroes.financial.latest_badge', 'founding_heroes', 'Latest support badge on first donation card', 'Latest support', 'text', true, true, '{}', false),
  ('founding_heroes.financial.carousel_label', 'founding_heroes', 'Carousel region aria label', 'Financial support contributions', 'text', true, true, '{}', false),
  ('founding_heroes.financial.scroll_hint', 'founding_heroes', 'Hint to scroll carousel for earlier contributions', 'Swipe or use the arrows to explore earlier contributions', 'text', true, true, '{}', false),
  ('founding_heroes.financial.previous', 'founding_heroes', 'Previous contribution carousel button', 'Previous contribution', 'text', true, true, '{}', false),
  ('founding_heroes.financial.next', 'founding_heroes', 'Next contribution carousel button', 'Next contribution', 'text', true, true, '{}', false),
  ('founding_heroes.financial.slide_position', 'founding_heroes', 'Carousel position indicator', 'Contribution {current} of {total}', 'text', true, true, '{current,total}', false)
on conflict (translation_key) do update set
  default_text = excluded.default_text,
  description = excluded.description,
  interpolation_variables = excluded.interpolation_variables,
  is_active = true,
  updated_at = now();

with catalog(translation_key, language_code, translated_text) as (
  values
    ('founding_heroes.financial.latest_badge','en','Latest support'),('founding_heroes.financial.latest_badge','nl','Laatste steun'),('founding_heroes.financial.latest_badge','fr','Dernier soutien'),('founding_heroes.financial.latest_badge','de','Neueste Unterstützung'),('founding_heroes.financial.latest_badge','es','Último apoyo'),('founding_heroes.financial.latest_badge','pt','Último apoio'),('founding_heroes.financial.latest_badge','it','Ultimo supporto'),('founding_heroes.financial.latest_badge','pl','Ostatnie wsparcie'),('founding_heroes.financial.latest_badge','cs','Nejnovější podpora'),('founding_heroes.financial.latest_badge','tr','Son destek'),('founding_heroes.financial.latest_badge','ar','أحدث دعم'),('founding_heroes.financial.latest_badge','hi','नवीनतम सहायता'),('founding_heroes.financial.latest_badge','zh','最新支持'),('founding_heroes.financial.latest_badge','ja','最新の支援'),('founding_heroes.financial.latest_badge','ko','최신 후원'),
    ('founding_heroes.financial.carousel_label','en','Financial support contributions'),('founding_heroes.financial.carousel_label','nl','Financiële bijdragen'),('founding_heroes.financial.carousel_label','fr','Contributions de soutien financier'),('founding_heroes.financial.carousel_label','de','Finanzielle Beiträge'),('founding_heroes.financial.carousel_label','es','Contribuciones de apoyo financiero'),('founding_heroes.financial.carousel_label','pt','Contribuições de apoio financeiro'),('founding_heroes.financial.carousel_label','it','Contributi di supporto finanziario'),('founding_heroes.financial.carousel_label','pl','Wpłaty wsparcia finansowego'),('founding_heroes.financial.carousel_label','cs','Finanční příspěvky'),('founding_heroes.financial.carousel_label','tr','Mali destek katkıları'),('founding_heroes.financial.carousel_label','ar','مساهمات الدعم المالي'),('founding_heroes.financial.carousel_label','hi','वित्तीय सहायता योगदान'),('founding_heroes.financial.carousel_label','zh','财务支持贡献'),('founding_heroes.financial.carousel_label','ja','資金支援の寄付'),('founding_heroes.financial.carousel_label','ko','재정 지원 기여'),
    ('founding_heroes.financial.scroll_hint','en','Swipe or use the arrows to explore earlier contributions'),('founding_heroes.financial.scroll_hint','nl','Veeg of gebruik de pijlen om eerdere bijdragen te bekijken'),('founding_heroes.financial.scroll_hint','fr','Faites glisser ou utilisez les flèches pour voir les contributions précédentes'),('founding_heroes.financial.scroll_hint','de','Wischen oder Pfeile nutzen, um frühere Beiträge zu sehen'),('founding_heroes.financial.scroll_hint','es','Desliza o usa las flechas para ver contribuciones anteriores'),('founding_heroes.financial.scroll_hint','pt','Deslize ou use as setas para ver contribuições anteriores'),('founding_heroes.financial.scroll_hint','it','Scorri o usa le frecce per vedere i contributi precedenti'),('founding_heroes.financial.scroll_hint','pl','Przesuń lub użyj strzałek, aby zobaczyć wcześniejsze wpłaty'),('founding_heroes.financial.scroll_hint','cs','Přejeďte nebo použijte šipky pro starší příspěvky'),('founding_heroes.financial.scroll_hint','tr','Önceki katkıları görmek için kaydırın veya okları kullanın'),('founding_heroes.financial.scroll_hint','ar','اسحب أو استخدم الأسهم لاستكشاف المساهمات السابقة'),('founding_heroes.financial.scroll_hint','hi','पिछले योगदान देखने के लिए स्वाइप करें या तीर का उपयोग करें'),('founding_heroes.financial.scroll_hint','zh','滑动或使用箭头查看更早的支持'),('founding_heroes.financial.scroll_hint','ja','スワイプまたは矢印で以前の支援を見る'),('founding_heroes.financial.scroll_hint','ko','스와이프하거나 화살표로 이전 기여 보기'),
    ('founding_heroes.financial.previous','en','Previous contribution'),('founding_heroes.financial.previous','nl','Vorige bijdrage'),('founding_heroes.financial.previous','fr','Contribution précédente'),('founding_heroes.financial.previous','de','Vorheriger Beitrag'),('founding_heroes.financial.previous','es','Contribución anterior'),('founding_heroes.financial.previous','pt','Contribuição anterior'),('founding_heroes.financial.previous','it','Contributo precedente'),('founding_heroes.financial.previous','pl','Poprzednia wpłata'),('founding_heroes.financial.previous','cs','Předchozí příspěvek'),('founding_heroes.financial.previous','tr','Önceki katkı'),('founding_heroes.financial.previous','ar','المساهمة السابقة'),('founding_heroes.financial.previous','hi','पिछला योगदान'),('founding_heroes.financial.previous','zh','上一笔支持'),('founding_heroes.financial.previous','ja','前の支援'),('founding_heroes.financial.previous','ko','이전 기여'),
    ('founding_heroes.financial.next','en','Next contribution'),('founding_heroes.financial.next','nl','Volgende bijdrage'),('founding_heroes.financial.next','fr','Contribution suivante'),('founding_heroes.financial.next','de','Nächster Beitrag'),('founding_heroes.financial.next','es','Contribución siguiente'),('founding_heroes.financial.next','pt','Contribuição seguinte'),('founding_heroes.financial.next','it','Contributo successivo'),('founding_heroes.financial.next','pl','Następna wpłata'),('founding_heroes.financial.next','cs','Další příspěvek'),('founding_heroes.financial.next','tr','Sonraki katkı'),('founding_heroes.financial.next','ar','المساهمة التالية'),('founding_heroes.financial.next','hi','अगला योगदान'),('founding_heroes.financial.next','zh','下一笔支持'),('founding_heroes.financial.next','ja','次の支援'),('founding_heroes.financial.next','ko','다음 기여'),
    ('founding_heroes.financial.slide_position','en','Contribution {current} of {total}'),('founding_heroes.financial.slide_position','nl','Bijdrage {current} van {total}'),('founding_heroes.financial.slide_position','fr','Contribution {current} sur {total}'),('founding_heroes.financial.slide_position','de','Beitrag {current} von {total}'),('founding_heroes.financial.slide_position','es','Contribución {current} de {total}'),('founding_heroes.financial.slide_position','pt','Contribuição {current} de {total}'),('founding_heroes.financial.slide_position','it','Contributo {current} di {total}'),('founding_heroes.financial.slide_position','pl','Wpłata {current} z {total}'),('founding_heroes.financial.slide_position','cs','Příspěvek {current} z {total}'),('founding_heroes.financial.slide_position','tr','Katkı {current} / {total}'),('founding_heroes.financial.slide_position','ar','المساهمة {current} من {total}'),('founding_heroes.financial.slide_position','hi','योगदान {current} / {total}'),('founding_heroes.financial.slide_position','zh','第 {current} 笔，共 {total} 笔'),('founding_heroes.financial.slide_position','ja','支援 {current} / {total}'),('founding_heroes.financial.slide_position','ko','기여 {current} / {total}')
), resolved as (
  select k.id as translation_key_id, c.language_code, c.translated_text
  from catalog c
  join public.website_translation_keys k on k.translation_key = c.translation_key
)
insert into public.website_translations
  (translation_key_id, language_code, translated_text, translation_status, translation_source, translated_at, reviewed_at, published_at)
select translation_key_id, language_code, translated_text, 'published', 'manual', now(), now(), now()
from resolved
on conflict (translation_key_id, language_code) do update set
  translated_text = excluded.translated_text,
  translation_status = 'published',
  translation_source = 'manual',
  translated_at = now(),
  reviewed_at = now(),
  published_at = now(),
  updated_at = now();

insert into public.website_translation_key_usage (translation_key_id, source_path, source_identifier, migration_status, notes)
select k.id, 'supabase/migrations/20260715190000_founding_heroes_financial_carousel_translations.sql', k.translation_key, 'seeded', 'Founding Heroes financial carousel translation keys'
from public.website_translation_keys k
where k.translation_key in (
  'founding_heroes.financial.latest_badge',
  'founding_heroes.financial.carousel_label',
  'founding_heroes.financial.scroll_hint',
  'founding_heroes.financial.previous',
  'founding_heroes.financial.next',
  'founding_heroes.financial.slide_position'
)
on conflict (translation_key_id, source_path, source_identifier) do update set
  migration_status = excluded.migration_status,
  notes = excluded.notes,
  updated_at = now();

commit;
