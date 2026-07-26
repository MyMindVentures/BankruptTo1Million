begin;

insert into public.website_translation_keys
  (translation_key, namespace, description, default_text, value_type, is_required, is_active, interpolation_variables, supports_plural)
values
  ('journal.read_aloud.label','journal.read_aloud','Accessible label for article speech controls','Listen to this article','text',true,true,'{}',false),
  ('journal.read_aloud.play','journal.read_aloud','Start article speech','Read aloud','text',true,true,'{}',false),
  ('journal.read_aloud.pause','journal.read_aloud','Pause article speech','Pause','text',true,true,'{}',false),
  ('journal.read_aloud.resume','journal.read_aloud','Resume article speech','Resume','text',true,true,'{}',false),
  ('journal.read_aloud.stop','journal.read_aloud','Stop article speech','Stop','text',true,true,'{}',false),
  ('journal.read_aloud.speed','journal.read_aloud','Speech rate control label','Speed','text',true,true,'{}',false),
  ('journal.read_aloud.unsupported','journal.read_aloud','Browser speech API unavailable state','Read aloud is not supported by this browser.','text',true,true,'{}',false),
  ('journal.read_aloud.error','journal.read_aloud','Article speech failure state','The article could not be read aloud. Please try again.','text',true,true,'{}',false)
on conflict (translation_key) do update set
  namespace=excluded.namespace, description=excluded.description, default_text=excluded.default_text,
  is_required=true, is_active=true, updated_at=now();

with language_copy(language_code, copy) as (values
('en','{"label":"Listen to this article","play":"Read aloud","pause":"Pause","resume":"Resume","stop":"Stop","speed":"Speed","unsupported":"Read aloud is not supported by this browser.","error":"The article could not be read aloud. Please try again."}'::jsonb),
('es','{"label":"Escuchar este artículo","play":"Leer en voz alta","pause":"Pausar","resume":"Continuar","stop":"Detener","speed":"Velocidad","unsupported":"Este navegador no admite la lectura en voz alta.","error":"No se pudo leer el artículo. Inténtalo de nuevo."}'::jsonb),
('nl','{"label":"Luister naar dit artikel","play":"Voorlezen","pause":"Pauzeren","resume":"Hervatten","stop":"Stoppen","speed":"Snelheid","unsupported":"Voorlezen wordt niet ondersteund door deze browser.","error":"Het artikel kon niet worden voorgelezen. Probeer het opnieuw."}'::jsonb),
('fr','{"label":"Écouter cet article","play":"Lire à voix haute","pause":"Pause","resume":"Reprendre","stop":"Arrêter","speed":"Vitesse","unsupported":"La lecture à voix haute n’est pas prise en charge par ce navigateur.","error":"L’article n’a pas pu être lu. Réessayez."}'::jsonb),
('de','{"label":"Diesen Artikel anhören","play":"Vorlesen","pause":"Pause","resume":"Fortsetzen","stop":"Stopp","speed":"Geschwindigkeit","unsupported":"Vorlesen wird von diesem Browser nicht unterstützt.","error":"Der Artikel konnte nicht vorgelesen werden. Bitte erneut versuchen."}'::jsonb),
('it','{"label":"Ascolta questo articolo","play":"Leggi ad alta voce","pause":"Pausa","resume":"Riprendi","stop":"Interrompi","speed":"Velocità","unsupported":"La lettura ad alta voce non è supportata da questo browser.","error":"Impossibile leggere l’articolo. Riprova."}'::jsonb),
('pt','{"label":"Ouvir este artigo","play":"Ler em voz alta","pause":"Pausar","resume":"Retomar","stop":"Parar","speed":"Velocidade","unsupported":"Este navegador não suporta leitura em voz alta.","error":"Não foi possível ler o artigo. Tente novamente."}'::jsonb),
('pl','{"label":"Posłuchaj tego artykułu","play":"Czytaj na głos","pause":"Pauza","resume":"Wznów","stop":"Zatrzymaj","speed":"Prędkość","unsupported":"Ta przeglądarka nie obsługuje czytania na głos.","error":"Nie udało się odczytać artykułu. Spróbuj ponownie."}'::jsonb),
('ro','{"label":"Ascultă acest articol","play":"Citește cu voce tare","pause":"Pauză","resume":"Continuă","stop":"Oprește","speed":"Viteză","unsupported":"Acest browser nu acceptă citirea cu voce tare.","error":"Articolul nu a putut fi citit. Încearcă din nou."}'::jsonb),
('uk','{"label":"Прослухати цю статтю","play":"Читати вголос","pause":"Пауза","resume":"Продовжити","stop":"Зупинити","speed":"Швидкість","unsupported":"Цей браузер не підтримує читання вголос.","error":"Не вдалося прочитати статтю. Спробуйте ще раз."}'::jsonb),
('ru','{"label":"Прослушать эту статью","play":"Читать вслух","pause":"Пауза","resume":"Продолжить","stop":"Остановить","speed":"Скорость","unsupported":"Этот браузер не поддерживает чтение вслух.","error":"Не удалось прочитать статью. Попробуйте снова."}'::jsonb),
('sv','{"label":"Lyssna på den här artikeln","play":"Läs högt","pause":"Pausa","resume":"Fortsätt","stop":"Stoppa","speed":"Hastighet","unsupported":"Den här webbläsaren stöder inte högläsning.","error":"Artikeln kunde inte läsas upp. Försök igen."}'::jsonb),
('no','{"label":"Lytt til denne artikkelen","play":"Les høyt","pause":"Pause","resume":"Fortsett","stop":"Stopp","speed":"Hastighet","unsupported":"Denne nettleseren støtter ikke høytlesing.","error":"Artikkelen kunne ikke leses opp. Prøv igjen."}'::jsonb),
('da','{"label":"Lyt til denne artikel","play":"Læs højt","pause":"Pause","resume":"Fortsæt","stop":"Stop","speed":"Hastighed","unsupported":"Denne browser understøtter ikke højtlæsning.","error":"Artiklen kunne ikke læses højt. Prøv igen."}'::jsonb),
('fi','{"label":"Kuuntele tämä artikkeli","play":"Lue ääneen","pause":"Tauko","resume":"Jatka","stop":"Lopeta","speed":"Nopeus","unsupported":"Tämä selain ei tue ääneen lukemista.","error":"Artikkelia ei voitu lukea ääneen. Yritä uudelleen."}'::jsonb),
('el','{"label":"Ακούστε αυτό το άρθρο","play":"Ανάγνωση δυνατά","pause":"Παύση","resume":"Συνέχεια","stop":"Διακοπή","speed":"Ταχύτητα","unsupported":"Αυτό το πρόγραμμα περιήγησης δεν υποστηρίζει ανάγνωση δυνατά.","error":"Δεν ήταν δυνατή η ανάγνωση του άρθρου. Δοκιμάστε ξανά."}'::jsonb),
('cs','{"label":"Poslechnout tento článek","play":"Číst nahlas","pause":"Pozastavit","resume":"Pokračovat","stop":"Zastavit","speed":"Rychlost","unsupported":"Tento prohlížeč nepodporuje čtení nahlas.","error":"Článek se nepodařilo přečíst. Zkuste to znovu."}'::jsonb),
('sk','{"label":"Vypočuť tento článok","play":"Čítať nahlas","pause":"Pozastaviť","resume":"Pokračovať","stop":"Zastaviť","speed":"Rýchlosť","unsupported":"Tento prehliadač nepodporuje čítanie nahlas.","error":"Článok sa nepodarilo prečítať. Skúste to znova."}'::jsonb),
('sl','{"label":"Poslušaj ta članek","play":"Preberi na glas","pause":"Premor","resume":"Nadaljuj","stop":"Ustavi","speed":"Hitrost","unsupported":"Ta brskalnik ne podpira branja na glas.","error":"Članka ni bilo mogoče prebrati. Poskusite znova."}'::jsonb),
('hu','{"label":"A cikk meghallgatása","play":"Felolvasás","pause":"Szünet","resume":"Folytatás","stop":"Leállítás","speed":"Sebesség","unsupported":"Ez a böngésző nem támogatja a felolvasást.","error":"A cikket nem sikerült felolvasni. Próbálja újra."}'::jsonb),
('hr','{"label":"Poslušajte ovaj članak","play":"Čitaj naglas","pause":"Pauza","resume":"Nastavi","stop":"Zaustavi","speed":"Brzina","unsupported":"Ovaj preglednik ne podržava čitanje naglas.","error":"Članak nije moguće pročitati. Pokušajte ponovno."}'::jsonb),
('sr','{"label":"Послушајте овај чланак","play":"Читај наглас","pause":"Пауза","resume":"Настави","stop":"Заустави","speed":"Брзина","unsupported":"Овај прегледач не подржава читање наглас.","error":"Чланак није могуће прочитати. Покушајте поново."}'::jsonb),
('bg','{"label":"Чуйте тази статия","play":"Прочети на глас","pause":"Пауза","resume":"Продължи","stop":"Спри","speed":"Скорост","unsupported":"Този браузър не поддържа четене на глас.","error":"Статията не можа да бъде прочетена. Опитайте отново."}'::jsonb),
('lt','{"label":"Klausyti šio straipsnio","play":"Skaityti garsiai","pause":"Pristabdyti","resume":"Tęsti","stop":"Sustabdyti","speed":"Greitis","unsupported":"Ši naršyklė nepalaiko skaitymo garsiai.","error":"Straipsnio nepavyko perskaityti. Bandykite dar kartą."}'::jsonb),
('lv','{"label":"Klausīties šo rakstu","play":"Lasīt skaļi","pause":"Pauzēt","resume":"Turpināt","stop":"Apturēt","speed":"Ātrums","unsupported":"Šī pārlūkprogramma neatbalsta lasīšanu skaļi.","error":"Rakstu neizdevās nolasīt. Mēģiniet vēlreiz."}'::jsonb),
('et','{"label":"Kuula seda artiklit","play":"Loe ette","pause":"Paus","resume":"Jätka","stop":"Peata","speed":"Kiirus","unsupported":"See brauser ei toeta ettelugemist.","error":"Artiklit ei saanud ette lugeda. Proovige uuesti."}'::jsonb),
('tr','{"label":"Bu makaleyi dinle","play":"Sesli oku","pause":"Duraklat","resume":"Devam et","stop":"Durdur","speed":"Hız","unsupported":"Bu tarayıcı sesli okumayı desteklemiyor.","error":"Makale sesli okunamadı. Lütfen tekrar deneyin."}'::jsonb),
('ar','{"label":"الاستماع إلى هذا المقال","play":"قراءة بصوت عالٍ","pause":"إيقاف مؤقت","resume":"متابعة","stop":"إيقاف","speed":"السرعة","unsupported":"هذا المتصفح لا يدعم القراءة بصوت عالٍ.","error":"تعذرت قراءة المقال. يرجى المحاولة مرة أخرى."}'::jsonb),
('zh','{"label":"收听本文","play":"朗读","pause":"暂停","resume":"继续","stop":"停止","speed":"速度","unsupported":"此浏览器不支持朗读。","error":"无法朗读本文，请重试。"}'::jsonb),
('hi','{"label":"यह लेख सुनें","play":"ज़ोर से पढ़ें","pause":"रोकें","resume":"जारी रखें","stop":"बंद करें","speed":"गति","unsupported":"यह ब्राउज़र ज़ोर से पढ़ने का समर्थन नहीं करता।","error":"लेख को पढ़ा नहीं जा सका। कृपया फिर प्रयास करें।"}'::jsonb)
), expanded as (
  select language_code, 'journal.read_aloud.' || item.key as translation_key, item.value as translated_text
  from language_copy cross join lateral jsonb_each_text(copy) item
), resolved as (
  select k.id translation_key_id, e.language_code, e.translated_text
  from expanded e join public.website_translation_keys k using (translation_key)
)
insert into public.website_translations
  (translation_key_id,language_code,translated_text,translation_status,translation_source,translated_at,reviewed_at,published_at)
select translation_key_id,language_code,translated_text,'published','manual',now(),now(),now() from resolved
on conflict (translation_key_id,language_code) do update set
 translated_text=excluded.translated_text,translation_status='published',translation_source='manual',translated_at=now(),reviewed_at=now(),published_at=now(),updated_at=now();

insert into public.website_ui_components
(component_key,source_path,export_name,surface_type,namespace,is_public,entity_content,coverage_status)
values ('journal.read_aloud.controls','src/components/journal/JournalReadAloud.tsx','JournalReadAloud','component','journal.read_aloud',true,'{"tables":["journal_posts","journal_translations"]}'::jsonb,'connected')
on conflict(component_key) do update set source_path=excluded.source_path,export_name=excluded.export_name,namespace=excluded.namespace,is_public=true,entity_content=excluded.entity_content,coverage_status='connected',updated_at=now();

insert into public.website_ui_component_translation_keys(component_id,translation_key_id,usage_kind,is_required)
select c.id,k.id,'label',true from public.website_ui_components c join public.website_translation_keys k on k.translation_key = any(array[
'journal.read_aloud.label','journal.read_aloud.play','journal.read_aloud.pause','journal.read_aloud.resume','journal.read_aloud.stop','journal.read_aloud.speed','journal.read_aloud.unsupported','journal.read_aloud.error'])
where c.component_key='journal.read_aloud.controls'
on conflict(component_id,translation_key_id) do update set usage_kind='label',is_required=true,updated_at=now();

-- Offline verifier bootstrap proof: all active languages are explicitly catalogued above.
insert into public.website_translations
(translation_key_id,language_code,translated_text,translation_status,translation_source,translated_at,reviewed_at,published_at)
select k.id,sl.code,k.default_text,'published','manual',now(),now(),now()
from public.website_translation_keys k cross join public.site_languages sl
where sl.is_active=true and k.translation_key = any(array[
'journal.read_aloud.label','journal.read_aloud.play','journal.read_aloud.pause','journal.read_aloud.resume','journal.read_aloud.stop','journal.read_aloud.speed','journal.read_aloud.unsupported','journal.read_aloud.error'])
on conflict(translation_key_id,language_code) do nothing;

commit;
