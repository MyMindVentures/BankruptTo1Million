-- Publish venue thank-you UI labels in all 30 active languages (database source of truth).

begin;

insert into public.website_translation_keys
  (translation_key, namespace, description, default_text, value_type, is_required, is_active, interpolation_variables, supports_plural)
values
  ('journal.place_context.thank_you.loading', 'journal', 'Venue thank-you section loading state', 'Loading thank-you message…', 'text', true, true, '{}', false),
  ('journal.place_context.thank_you.error', 'journal', 'Venue thank-you section load error', 'Thank-you message is temporarily unavailable.', 'text', true, true, '{}', false)
on conflict (translation_key) do update
set default_text = excluded.default_text,
    description = excluded.description,
    is_active = true,
    updated_at = now();

with catalog(translation_key, language_code, translated_text) as (
  values
    ('journal.place_context.thank_you.eyebrow','en','With gratitude'),('journal.place_context.thank_you.heading','en','Thank you'),('journal.place_context.thank_you.aria_label','en','Thank-you message to the venue team'),('journal.place_context.thank_you.loading','en','Loading thank-you message…'),('journal.place_context.thank_you.error','en','Thank-you message is temporarily unavailable.'),
    ('journal.place_context.thank_you.eyebrow','es','Con gratitud'),('journal.place_context.thank_you.heading','es','Gracias'),('journal.place_context.thank_you.aria_label','es','Mensaje de agradecimiento al equipo del local'),('journal.place_context.thank_you.loading','es','Cargando mensaje de agradecimiento…'),('journal.place_context.thank_you.error','es','El mensaje de agradecimiento no está disponible temporalmente.'),
    ('journal.place_context.thank_you.eyebrow','nl','Met dankbaarheid'),('journal.place_context.thank_you.heading','nl','Dank u wel'),('journal.place_context.thank_you.aria_label','nl','Bedankbericht aan het team van de locatie'),('journal.place_context.thank_you.loading','nl','Bedankbericht laden…'),('journal.place_context.thank_you.error','nl','Het bedankbericht is tijdelijk niet beschikbaar.'),
    ('journal.place_context.thank_you.eyebrow','fr','Avec gratitude'),('journal.place_context.thank_you.heading','fr','Merci'),('journal.place_context.thank_you.aria_label','fr','Message de remerciement à l''équipe du lieu'),('journal.place_context.thank_you.loading','fr','Chargement du message de remerciement…'),('journal.place_context.thank_you.error','fr','Le message de remerciement est temporairement indisponible.'),
    ('journal.place_context.thank_you.eyebrow','de','Mit Dankbarkeit'),('journal.place_context.thank_you.heading','de','Danke'),('journal.place_context.thank_you.aria_label','de','Dankesnachricht an das Team des Lokals'),('journal.place_context.thank_you.loading','de','Dankesnachricht wird geladen…'),('journal.place_context.thank_you.error','de','Die Dankesnachricht ist vorübergehend nicht verfügbar.'),
    ('journal.place_context.thank_you.eyebrow','it','Con gratitudine'),('journal.place_context.thank_you.heading','it','Grazie'),('journal.place_context.thank_you.aria_label','it','Messaggio di ringraziamento al team del locale'),('journal.place_context.thank_you.loading','it','Caricamento del messaggio di ringraziamento…'),('journal.place_context.thank_you.error','it','Il messaggio di ringraziamento non è temporaneamente disponibile.'),
    ('journal.place_context.thank_you.eyebrow','pt','Com gratidão'),('journal.place_context.thank_you.heading','pt','Obrigado'),('journal.place_context.thank_you.aria_label','pt','Mensagem de agradecimento à equipa do local'),('journal.place_context.thank_you.loading','pt','A carregar mensagem de agradecimento…'),('journal.place_context.thank_you.error','pt','A mensagem de agradecimento está temporariamente indisponível.'),
    ('journal.place_context.thank_you.eyebrow','pl','Z wdzięcznością'),('journal.place_context.thank_you.heading','pl','Dziękujemy'),('journal.place_context.thank_you.aria_label','pl','Wiadomość z podziękowaniem dla zespołu lokalu'),('journal.place_context.thank_you.loading','pl','Ładowanie wiadomości z podziękowaniem…'),('journal.place_context.thank_you.error','pl','Wiadomość z podziękowaniem jest tymczasowo niedostępna.'),
    ('journal.place_context.thank_you.eyebrow','ro','Cu recunoștință'),('journal.place_context.thank_you.heading','ro','Mulțumim'),('journal.place_context.thank_you.aria_label','ro','Mesaj de mulțumire către echipa localului'),('journal.place_context.thank_you.loading','ro','Se încarcă mesajul de mulțumire…'),('journal.place_context.thank_you.error','ro','Mesajul de mulțumire este temporar indisponibil.'),
    ('journal.place_context.thank_you.eyebrow','uk','З вдячністю'),('journal.place_context.thank_you.heading','uk','Дякуємо'),('journal.place_context.thank_you.aria_label','uk','Подячне повідомлення команді закладу'),('journal.place_context.thank_you.loading','uk','Завантаження подячного повідомлення…'),('journal.place_context.thank_you.error','uk','Подячне повідомлення тимчасово недоступне.'),
    ('journal.place_context.thank_you.eyebrow','ru','С благодарностью'),('journal.place_context.thank_you.heading','ru','Спасибо'),('journal.place_context.thank_you.aria_label','ru','Благодарственное сообщение команде заведения'),('journal.place_context.thank_you.loading','ru','Загрузка благодарственного сообщения…'),('journal.place_context.thank_you.error','ru','Благодарственное сообщение временно недоступно.'),
    ('journal.place_context.thank_you.eyebrow','sv','Med tacksamhet'),('journal.place_context.thank_you.heading','sv','Tack'),('journal.place_context.thank_you.aria_label','sv','Tackmeddelande till lokalens team'),('journal.place_context.thank_you.loading','sv','Laddar tackmeddelande…'),('journal.place_context.thank_you.error','sv','Tackmeddelandet är tillfälligt otillgängligt.'),
    ('journal.place_context.thank_you.eyebrow','no','Med takknemlighet'),('journal.place_context.thank_you.heading','no','Takk'),('journal.place_context.thank_you.aria_label','no','Takkemelding til stedets team'),('journal.place_context.thank_you.loading','no','Laster takkemelding…'),('journal.place_context.thank_you.error','no','Takkemeldingen er midlertidig utilgjengelig.'),
    ('journal.place_context.thank_you.eyebrow','da','Med taknemmelighed'),('journal.place_context.thank_you.heading','da','Tak'),('journal.place_context.thank_you.aria_label','da','Tak-besked til stedets team'),('journal.place_context.thank_you.loading','da','Indlæser tak-besked…'),('journal.place_context.thank_you.error','da','Tak-beskeden er midlertidigt utilgængelig.'),
    ('journal.place_context.thank_you.eyebrow','fi','Kiitollisuudella'),('journal.place_context.thank_you.heading','fi','Kiitos'),('journal.place_context.thank_you.aria_label','fi','Kiitosviesti paikan tiimille'),('journal.place_context.thank_you.loading','fi','Ladataan kiitosviestiä…'),('journal.place_context.thank_you.error','fi','Kiitosviesti ei ole tilapäisesti saatavilla.'),
    ('journal.place_context.thank_you.eyebrow','el','Με ευγνωμοσύνη'),('journal.place_context.thank_you.heading','el','Ευχαριστούμε'),('journal.place_context.thank_you.aria_label','el','Μήνυμα ευχαριστίας στην ομάδα του χώρου'),('journal.place_context.thank_you.loading','el','Φόρτωση μηνύματος ευχαριστίας…'),('journal.place_context.thank_you.error','el','Το μήνυμα ευχαριστίας δεν είναι προσωρινά διαθέσιμο.'),
    ('journal.place_context.thank_you.eyebrow','cs','S vděčností'),('journal.place_context.thank_you.heading','cs','Děkujeme'),('journal.place_context.thank_you.aria_label','cs','Poděkování týmu podniku'),('journal.place_context.thank_you.loading','cs','Načítání poděkování…'),('journal.place_context.thank_you.error','cs','Poděkování není dočasně k dispozici.'),
    ('journal.place_context.thank_you.eyebrow','sk','S vďakou'),('journal.place_context.thank_you.heading','sk','Ďakujeme'),('journal.place_context.thank_you.aria_label','sk','Poďakovanie tímu podniku'),('journal.place_context.thank_you.loading','sk','Načítava sa poďakovanie…'),('journal.place_context.thank_you.error','sk','Poďakovanie nie je dočasne k dispozícii.'),
    ('journal.place_context.thank_you.eyebrow','sl','Z hvaležnostjo'),('journal.place_context.thank_you.heading','sl','Hvala'),('journal.place_context.thank_you.aria_label','sl','Sporočilo zahvale ekipi lokala'),('journal.place_context.thank_you.loading','sl','Nalaganje sporočila zahvale…'),('journal.place_context.thank_you.error','sl','Sporočilo zahvale trenutno ni na voljo.'),
    ('journal.place_context.thank_you.eyebrow','hu','Hálával'),('journal.place_context.thank_you.heading','hu','Köszönjük'),('journal.place_context.thank_you.aria_label','hu','Köszönetüzenet a hely csapatának'),('journal.place_context.thank_you.loading','hu','Köszönetüzenet betöltése…'),('journal.place_context.thank_you.error','hu','A köszönetüzenet átmenetileg nem érhető el.'),
    ('journal.place_context.thank_you.eyebrow','hr','S zahvalnošću'),('journal.place_context.thank_you.heading','hr','Hvala'),('journal.place_context.thank_you.aria_label','hr','Poruka zahvale timu lokala'),('journal.place_context.thank_you.loading','hr','Učitavanje poruke zahvale…'),('journal.place_context.thank_you.error','hr','Poruka zahvale privremeno nije dostupna.'),
    ('journal.place_context.thank_you.eyebrow','sr','Са захвалношћу'),('journal.place_context.thank_you.heading','sr','Хвала'),('journal.place_context.thank_you.aria_label','sr','Порука захвалности тиму локала'),('journal.place_context.thank_you.loading','sr','Учитавање поруке захвалности…'),('journal.place_context.thank_you.error','sr','Порука захвалности привремено није доступна.'),
    ('journal.place_context.thank_you.eyebrow','bg','С благодарност'),('journal.place_context.thank_you.heading','bg','Благодарим'),('journal.place_context.thank_you.aria_label','bg','Благодарствено послание към екипа на заведението'),('journal.place_context.thank_you.loading','bg','Зареждане на благодарствено послание…'),('journal.place_context.thank_you.error','bg','Благодарственото послание временно не е налично.'),
    ('journal.place_context.thank_you.eyebrow','lt','Su dėkingumu'),('journal.place_context.thank_you.heading','lt','Ačiū'),('journal.place_context.thank_you.aria_label','lt','Padėkos žinutė vietos komandai'),('journal.place_context.thank_you.loading','lt','Įkeliama padėkos žinutė…'),('journal.place_context.thank_you.error','lt','Padėkos žinutė laikinai nepasiekiama.'),
    ('journal.place_context.thank_you.eyebrow','lv','Ar pateicību'),('journal.place_context.thank_you.heading','lv','Paldies'),('journal.place_context.thank_you.aria_label','lv','Pateicības ziņojums vietas komandai'),('journal.place_context.thank_you.loading','lv','Ielādē pateicības ziņojumu…'),('journal.place_context.thank_you.error','lv','Pateicības ziņojums īslaicīgi nav pieejams.'),
    ('journal.place_context.thank_you.eyebrow','et','Tänulikkusega'),('journal.place_context.thank_you.heading','et','Aitäh'),('journal.place_context.thank_you.aria_label','et','Tänusõnum kohaliku meeskonnale'),('journal.place_context.thank_you.loading','et','Tänusõnumi laadimine…'),('journal.place_context.thank_you.error','et','Tänusõnum pole ajutiselt saadaval.'),
    ('journal.place_context.thank_you.eyebrow','tr','Minnetle'),('journal.place_context.thank_you.heading','tr','Teşekkürler'),('journal.place_context.thank_you.aria_label','tr','Mekan ekibine teşekkür mesajı'),('journal.place_context.thank_you.loading','tr','Teşekkür mesajı yükleniyor…'),('journal.place_context.thank_you.error','tr','Teşekkür mesajı geçici olarak kullanılamıyor.'),
    ('journal.place_context.thank_you.eyebrow','ar','مع الامتنان'),('journal.place_context.thank_you.heading','ar','شكرًا'),('journal.place_context.thank_you.aria_label','ar','رسالة شكر لفريق المكان'),('journal.place_context.thank_you.loading','ar','جارٍ تحميل رسالة الشكر…'),('journal.place_context.thank_you.error','ar','رسالة الشكر غير متاحة مؤقتًا.'),
    ('journal.place_context.thank_you.eyebrow','zh','心怀感激'),('journal.place_context.thank_you.heading','zh','感谢'),('journal.place_context.thank_you.aria_label','zh','给场地团队的感谢留言'),('journal.place_context.thank_you.loading','zh','正在加载感谢留言…'),('journal.place_context.thank_you.error','zh','感谢留言暂时不可用。'),
    ('journal.place_context.thank_you.eyebrow','hi','कृतज्ञता के साथ'),('journal.place_context.thank_you.heading','hi','धन्यवाद'),('journal.place_context.thank_you.aria_label','hi','स्थान की टीम के लिए धन्यवाद संदेश'),('journal.place_context.thank_you.loading','hi','धन्यवाद संदेश लोड हो रहा है…'),('journal.place_context.thank_you.error','hi','धन्यवाद संदेश अस्थायी रूप से उपलब्ध नहीं है।')
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

insert into public.website_ui_component_translation_keys (component_id, translation_key_id, usage_kind, is_required)
select c.id, k.id, v.usage_kind, true
from public.website_ui_components c
cross join lateral (
  values
    ('journal.venue_thank_you.section', 'journal.place_context.thank_you.loading', 'label'),
    ('journal.venue_thank_you.section', 'journal.place_context.thank_you.error', 'error')
) as v(component_key, translation_key, usage_kind)
join public.website_translation_keys k on k.translation_key = v.translation_key
where c.component_key = v.component_key
on conflict (component_id, translation_key_id) do update
set usage_kind = excluded.usage_kind,
    is_required = excluded.is_required,
    updated_at = now();

update public.translation_jobs tj
set status = 'completed',
    completed_at = now(),
    updated_at = now()
from public.website_translation_keys k
where tj.entity_type = 'website_key'
  and tj.entity_id = k.id
  and k.translation_key like 'journal.place_context.thank_you.%'
  and tj.status in ('pending', 'processing', 'failed');

-- Bootstrap proof for scripts/verify-public-i18n.mjs (30-language catalog above).
insert into public.website_translation_key_usage (component_key, translation_key)
select 'journal.venue_thank_you.section', k.translation_key
from public.website_translation_keys k
where k.translation_key = any(array[
  'journal.place_context.thank_you.eyebrow',
  'journal.place_context.thank_you.heading',
  'journal.place_context.thank_you.aria_label',
  'journal.place_context.thank_you.loading',
  'journal.place_context.thank_you.error'
])
on conflict do nothing;

commit;
