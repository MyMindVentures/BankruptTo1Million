begin;

insert into public.website_translation_keys
  (translation_key, namespace, description, default_text, value_type, is_required, is_active, interpolation_variables, supports_plural)
values
  ('donations.thanks.intro', 'donations', 'Supporter thanks section introduction', 'A huge thank you for supporting our mission. These messages come from people who chose to share their gratitude publicly with this story.', 'text', true, true, '{}', false),
  ('donations.thanks.anonymous_label', 'donations', 'Label for a public thank-you without a display name', 'A generous supporter', 'text', true, true, '{}', false)
on conflict (translation_key) do update set
  default_text = excluded.default_text,
  description = excluded.description,
  is_active = true,
  updated_at = now();

update public.website_translation_keys
set
  default_text = 'Thank you for standing with us',
  description = 'Supporter thanks section heading',
  updated_at = now()
where translation_key = 'donations.thanks.title';

with catalog(translation_key, language_code, translated_text) as (
  values
    ('donations.thanks.title','en','Thank you for standing with us'),('donations.thanks.title','nl','Super bedankt om onze missie te steunen'),('donations.thanks.title','fr','Merci de soutenir notre mission'),('donations.thanks.title','de','Danke, dass Sie unsere Mission unterstützen'),('donations.thanks.title','es','Gracias por apoyar nuestra misión'),('donations.thanks.title','pt','Obrigado por apoiar a nossa missão'),('donations.thanks.title','it','Grazie per sostenere la nostra missione'),('donations.thanks.title','pl','Dziękujemy za wspieranie naszej misji'),('donations.thanks.title','cs','Děkujeme za podporu naší mise'),('donations.thanks.title','tr','Misyonumuzu desteklediğiniz için teşekkürler'),('donations.thanks.title','ar','شكرًا لدعمكم مهمتنا'),('donations.thanks.title','hi','हमारे मिशन का समर्थन करने के लिए धन्यवाद'),('donations.thanks.title','zh','感谢您支持我们的使命'),('donations.thanks.title','ja','私たちのミッションを支えてくださりありがとうございます'),('donations.thanks.title','ko','우리 미션을 지원해 주셔서 감사합니다'),
    ('donations.thanks.intro','en','A huge thank you for supporting our mission. These messages come from people who chose to share their gratitude publicly with this story.'),('donations.thanks.intro','nl','Enorm bedankt dat je onze missie steunt. Deze berichten komen van mensen die hun waardering publiek willen delen bij dit verhaal.'),('donations.thanks.intro','fr','Un immense merci de soutenir notre mission. Ces messages viennent de personnes qui ont choisi de partager publiquement leur gratitude avec cette histoire.'),('donations.thanks.intro','de','Ein herzliches Dankeschön für die Unterstützung unserer Mission. Diese Nachrichten stammen von Menschen, die ihre Wertschätzung öffentlich mit dieser Geschichte teilen wollten.'),('donations.thanks.intro','es','Muchísimas gracias por apoyar nuestra misión. Estos mensajes provienen de personas que eligieron compartir públicamente su gratitud con esta historia.'),('donations.thanks.intro','pt','Muito obrigado por apoiar a nossa missão. Estas mensagens vêm de pessoas que escolheram partilhar publicamente a sua gratidão com esta história.'),('donations.thanks.intro','it','Grazie di cuore per sostenere la nostra missione. Questi messaggi provengono da persone che hanno scelto di condividere pubblicamente la propria gratitudine con questa storia.'),('donations.thanks.intro','pl','Ogromne dzięki za wspieranie naszej misji. Te wiadomości pochodzą od osób, które zdecydowały się publicznie podzielić wdzięcznością przy tej historii.'),('donations.thanks.intro','cs','Obrovské díky za podporu naší mise. Tyto zprávy pocházejí od lidí, kteří se rozhodli veřejně sdílet svou vděčnost u tohoto příběhu.'),('donations.thanks.intro','tr','Misyonumuzu desteklediğiniz için çok teşekkürler. Bu mesajlar, minnettarlıklarını bu hikâyeyle herkese açık paylaşmayı seçen kişilerden geliyor.'),('donations.thanks.intro','ar','شكرًا جزيلًا لدعمكم مهمتنا. هذه الرسائل من أشخاص اختاروا مشاركة امتنانهم علنًا مع هذه القصة.'),('donations.thanks.intro','hi','हमारे मिशन का समर्थन करने के लिए बहुत-बहुत धन्यवाद। ये संदेश उन लोगों से हैं जिन्होंने इस कहानी के साथ अपनी कृतज्ञता सार्वजनिक रूप से साझा करने का चुनाव किया।'),('donations.thanks.intro','zh','非常感谢您支持我们的使命。这些留言来自选择在此故事下公开分享感激之情的支持者。'),('donations.thanks.intro','ja','私たちのミッションを支えてくださり、心から感謝します。これらのメッセージは、この物語で感謝の気持ちを公開共有することを選んだ方々からのものです。'),('donations.thanks.intro','ko','우리 미션을 지원해 주셔서 진심으로 감사합니다. 이 메시지는 이 이야기와 함께 감사를 공개적으로 나누기로 선택한 분들의 것입니다.'),
    ('donations.thanks.anonymous_label','en','A generous supporter'),('donations.thanks.anonymous_label','nl','Een gulle supporter'),('donations.thanks.anonymous_label','fr','Un généreux supporter'),('donations.thanks.anonymous_label','de','Ein großzügiger Unterstützer'),('donations.thanks.anonymous_label','es','Un generoso supporter'),('donations.thanks.anonymous_label','pt','Um apoiante generoso'),('donations.thanks.anonymous_label','it','Un generoso sostenitore'),('donations.thanks.anonymous_label','pl','Hojny wspierający'),('donations.thanks.anonymous_label','cs','Štědrý podporovatel'),('donations.thanks.anonymous_label','tr','Cömert bir destekçi'),('donations.thanks.anonymous_label','ar','داعم كريم'),('donations.thanks.anonymous_label','hi','एक उदार समर्थक'),('donations.thanks.anonymous_label','zh','一位慷慨的支持者'),('donations.thanks.anonymous_label','ja','気前の良い支援者'),('donations.thanks.anonymous_label','ko','관대한 후원자')
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
select k.id, 'supabase/migrations/20260715170000_journal_donations_thanks_translations.sql', k.translation_key, 'seeded', 'Journal donations supporter thanks copy'
from public.website_translation_keys k
where k.translation_key in (
  'donations.thanks.title',
  'donations.thanks.intro',
  'donations.thanks.anonymous_label'
)
on conflict (translation_key_id, source_path, source_identifier) do update set
  migration_status = excluded.migration_status,
  notes = excluded.notes,
  updated_at = now();

commit;
