-- Founding Heroes public financial support ledger: site-wide RPC and i18n seeds.

begin;

create or replace function public.get_public_donation_ledger(p_language text default 'en')
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_default_currency text := coalesce(public.get_donation_system_setting('donations.default_currency', '"EUR"'::jsonb)#>>'{}', 'EUR');
  v_count integer := 0;
  v_total bigint := 0;
  v_entries jsonb := '[]'::jsonb;
begin
  if not public.donations_are_globally_enabled() then
    return jsonb_build_object('enabled', false);
  end if;

  select
    count(*)::integer,
    coalesce(sum(d.amount_minor_units), 0)::bigint
  into v_count, v_total
  from public.donations d
  where d.status = 'succeeded';

  select coalesce(jsonb_agg(jsonb_build_object(
    'donation_id', d.id,
    'amount_minor_units', d.amount_minor_units,
    'currency', d.currency,
    'display_name', case
      when d.is_anonymous = false
        and d.consent_to_public_thanks = true
        and d.moderation_status = 'approved'
        and nullif(btrim(d.donor_display_name), '') is not null
      then d.donor_display_name
      else null
    end,
    'completed_at', d.completed_at
  ) order by d.completed_at desc nulls last, d.initiated_at desc), '[]'::jsonb)
  into v_entries
  from public.donations d
  where d.status = 'succeeded';

  return jsonb_build_object(
    'enabled', true,
    'donation_count', v_count,
    'total_amount_minor_units', v_total,
    'currency', v_default_currency,
    'entries', v_entries
  );
end;
$$;

revoke all on function public.get_public_donation_ledger(text) from public;
grant execute on function public.get_public_donation_ledger(text) to anon, authenticated;

insert into public.website_translation_keys
  (translation_key, namespace, description, default_text, value_type, is_required, is_active, interpolation_variables, supports_plural)
values
  ('founding_heroes.financial.eyebrow', 'founding_heroes', 'Financial support section eyebrow', 'Financial support', 'text', true, true, '{}', false),
  ('founding_heroes.financial.title', 'founding_heroes', 'Financial support section title', 'Every contribution that helped us move', 'text', true, true, '{}', false),
  ('founding_heroes.financial.lede', 'founding_heroes', 'Financial support section lede', 'A transparent record of financial support received for the mission.', 'text', true, true, '{}', false),
  ('founding_heroes.financial.total_collected', 'founding_heroes', 'Total collected summary', 'Total collected: {amount}', 'text', true, true, '{amount}', false),
  ('founding_heroes.financial.supporter_count', 'founding_heroes', 'Contribution count summary', '{count} contributions', 'text', true, true, '{count}', false),
  ('founding_heroes.financial.anonymous_supporter', 'founding_heroes', 'Anonymous supporter label in ledger', 'Anonymous supporter', 'text', true, true, '{}', false),
  ('founding_heroes.financial.column_supporter', 'founding_heroes', 'Ledger column header for supporter', 'Supporter', 'text', true, true, '{}', false),
  ('founding_heroes.financial.column_amount', 'founding_heroes', 'Ledger column header for amount', 'Amount', 'text', true, true, '{}', false),
  ('founding_heroes.financial.column_date', 'founding_heroes', 'Ledger column header for date', 'Date', 'text', true, true, '{}', false),
  ('founding_heroes.financial.loading', 'founding_heroes', 'Financial support loading state', 'Loading financial support…', 'text', true, true, '{}', false),
  ('founding_heroes.financial.error', 'founding_heroes', 'Financial support error state', 'Financial support is temporarily unavailable.', 'text', true, true, '{}', false),
  ('founding_heroes.financial.empty', 'founding_heroes', 'Financial support empty state', 'No financial support has been recorded yet.', 'text', true, true, '{}', false),
  ('founding_heroes.financial.aria_label', 'founding_heroes', 'Financial support section aria label', 'Financial support received', 'text', true, true, '{}', false)
on conflict (translation_key) do update set
  default_text = excluded.default_text,
  description = excluded.description,
  interpolation_variables = excluded.interpolation_variables,
  is_active = true,
  updated_at = now();

with catalog(translation_key, language_code, translated_text) as (
  values
    ('founding_heroes.financial.eyebrow','en','Financial support'),('founding_heroes.financial.eyebrow','nl','Financiële steun'),('founding_heroes.financial.eyebrow','fr','Soutien financier'),('founding_heroes.financial.eyebrow','de','Finanzielle Unterstützung'),('founding_heroes.financial.eyebrow','es','Apoyo financiero'),('founding_heroes.financial.eyebrow','pt','Apoio financeiro'),('founding_heroes.financial.eyebrow','it','Supporto finanziario'),('founding_heroes.financial.eyebrow','pl','Wsparcie finansowe'),('founding_heroes.financial.eyebrow','cs','Finanční podpora'),('founding_heroes.financial.eyebrow','tr','Mali destek'),('founding_heroes.financial.eyebrow','ar','الدعم المالي'),('founding_heroes.financial.eyebrow','hi','वित्तीय सहायता'),('founding_heroes.financial.eyebrow','zh','财务支持'),('founding_heroes.financial.eyebrow','ja','資金支援'),('founding_heroes.financial.eyebrow','ko','재정 지원'),
    ('founding_heroes.financial.title','en','Every contribution that helped us move'),('founding_heroes.financial.title','nl','Elke bijdrage die ons vooruit hielp'),('founding_heroes.financial.title','fr','Chaque contribution qui nous a fait avancer'),('founding_heroes.financial.title','de','Jeder Beitrag, der uns vorangebracht hat'),('founding_heroes.financial.title','es','Cada contribución que nos ayudó a avanzar'),('founding_heroes.financial.title','pt','Cada contribuição que nos ajudou a avançar'),('founding_heroes.financial.title','it','Ogni contributo che ci ha fatto avanzare'),('founding_heroes.financial.title','pl','Każdy wkład, który pomógł nam iść dalej'),('founding_heroes.financial.title','cs','Každý příspěvek, který nás posunul dál'),('founding_heroes.financial.title','tr','Bizi ilerleten her katkı'),('founding_heroes.financial.title','ar','كل مساهمة ساعدتنا على المضي قدمًا'),('founding_heroes.financial.title','hi','हर योगदान जिसने हमें आगे बढ़ाया'),('founding_heroes.financial.title','zh','每一份推动我们前进的支持'),('founding_heroes.financial.title','ja','前進を支えてくれたすべての支援'),('founding_heroes.financial.title','ko','우리를 앞으로 이끈 모든 기여'),
    ('founding_heroes.financial.lede','en','A transparent record of financial support received for the mission.'),('founding_heroes.financial.lede','nl','Een transparant overzicht van ontvangen financiële steun voor de missie.'),('founding_heroes.financial.lede','fr','Un registre transparent du soutien financier reçu pour la mission.'),('founding_heroes.financial.lede','de','Ein transparenter Überblick über die finanzielle Unterstützung für die Mission.'),('founding_heroes.financial.lede','es','Un registro transparente del apoyo financiero recibido para la misión.'),('founding_heroes.financial.lede','pt','Um registo transparente do apoio financeiro recebido para a missão.'),('founding_heroes.financial.lede','it','Un registro trasparente del supporto finanziario ricevuto per la missione.'),('founding_heroes.financial.lede','pl','Przejrzysty zapis wsparcia finansowego otrzymanego na rzecz misji.'),('founding_heroes.financial.lede','cs','Transparentní přehled finanční podpory přijaté pro misi.'),('founding_heroes.financial.lede','tr','Misyon için alınan mali desteğin şeffaf kaydı.'),('founding_heroes.financial.lede','ar','سجل شفاف للدعم المالي المستلم للمهمة.'),('founding_heroes.financial.lede','hi','मिशन के लिए प्राप्त वित्तीय सहायता का पारदर्शी रिकॉर्ड।'),('founding_heroes.financial.lede','zh','为使命收到的财务支持的透明记录。'),('founding_heroes.financial.lede','ja','ミッションのために受け取った資金支援の透明な記録。'),('founding_heroes.financial.lede','ko','미션을 위해 받은 재정 지원의 투명한 기록.'),
    ('founding_heroes.financial.total_collected','en','Total collected: {amount}'),('founding_heroes.financial.total_collected','nl','Totaal verzameld: {amount}'),('founding_heroes.financial.total_collected','fr','Total collecté : {amount}'),('founding_heroes.financial.total_collected','de','Insgesamt gesammelt: {amount}'),('founding_heroes.financial.total_collected','es','Total recaudado: {amount}'),('founding_heroes.financial.total_collected','pt','Total angariado: {amount}'),('founding_heroes.financial.total_collected','it','Totale raccolto: {amount}'),('founding_heroes.financial.total_collected','pl','Łącznie zebrano: {amount}'),('founding_heroes.financial.total_collected','cs','Celkem vybráno: {amount}'),('founding_heroes.financial.total_collected','tr','Toplam toplanan: {amount}'),('founding_heroes.financial.total_collected','ar','إجمالي ما تم جمعه: {amount}'),('founding_heroes.financial.total_collected','hi','कुल एकत्रित: {amount}'),('founding_heroes.financial.total_collected','zh','累计筹集：{amount}'),('founding_heroes.financial.total_collected','ja','累計支援額：{amount}'),('founding_heroes.financial.total_collected','ko','총 모금액: {amount}'),
    ('founding_heroes.financial.supporter_count','en','{count} contributions'),('founding_heroes.financial.supporter_count','nl','{count} bijdragen'),('founding_heroes.financial.supporter_count','fr','{count} contributions'),('founding_heroes.financial.supporter_count','de','{count} Beiträge'),('founding_heroes.financial.supporter_count','es','{count} contribuciones'),('founding_heroes.financial.supporter_count','pt','{count} contribuições'),('founding_heroes.financial.supporter_count','it','{count} contributi'),('founding_heroes.financial.supporter_count','pl','{count} wpłat'),('founding_heroes.financial.supporter_count','cs','{count} příspěvků'),('founding_heroes.financial.supporter_count','tr','{count} katkı'),('founding_heroes.financial.supporter_count','ar','{count} مساهمات'),('founding_heroes.financial.supporter_count','hi','{count} योगदान'),('founding_heroes.financial.supporter_count','zh','{count} 笔支持'),('founding_heroes.financial.supporter_count','ja','{count} 件の支援'),('founding_heroes.financial.supporter_count','ko','{count}건의 기여'),
    ('founding_heroes.financial.anonymous_supporter','en','Anonymous supporter'),('founding_heroes.financial.anonymous_supporter','nl','Anonieme supporter'),('founding_heroes.financial.anonymous_supporter','fr','Supporter anonyme'),('founding_heroes.financial.anonymous_supporter','de','Anonymer Unterstützer'),('founding_heroes.financial.anonymous_supporter','es','Colaborador anónimo'),('founding_heroes.financial.anonymous_supporter','pt','Apoiante anónimo'),('founding_heroes.financial.anonymous_supporter','it','Sostenitore anonimo'),('founding_heroes.financial.anonymous_supporter','pl','Anonimowy wspierający'),('founding_heroes.financial.anonymous_supporter','cs','Anonymní podporovatel'),('founding_heroes.financial.anonymous_supporter','tr','Anonim destekçi'),('founding_heroes.financial.anonymous_supporter','ar','داعم مجهول'),('founding_heroes.financial.anonymous_supporter','hi','अज्ञात समर्थक'),('founding_heroes.financial.anonymous_supporter','zh','匿名支持者'),('founding_heroes.financial.anonymous_supporter','ja','匿名の支援者'),('founding_heroes.financial.anonymous_supporter','ko','익명 후원자'),
    ('founding_heroes.financial.column_supporter','en','Supporter'),('founding_heroes.financial.column_supporter','nl','Supporter'),('founding_heroes.financial.column_supporter','fr','Supporter'),('founding_heroes.financial.column_supporter','de','Unterstützer'),('founding_heroes.financial.column_supporter','es','Colaborador'),('founding_heroes.financial.column_supporter','pt','Apoiante'),('founding_heroes.financial.column_supporter','it','Sostenitore'),('founding_heroes.financial.column_supporter','pl','Wspierający'),('founding_heroes.financial.column_supporter','cs','Podporovatel'),('founding_heroes.financial.column_supporter','tr','Destekçi'),('founding_heroes.financial.column_supporter','ar','الداعم'),('founding_heroes.financial.column_supporter','hi','समर्थक'),('founding_heroes.financial.column_supporter','zh','支持者'),('founding_heroes.financial.column_supporter','ja','支援者'),('founding_heroes.financial.column_supporter','ko','후원자'),
    ('founding_heroes.financial.column_amount','en','Amount'),('founding_heroes.financial.column_amount','nl','Bedrag'),('founding_heroes.financial.column_amount','fr','Montant'),('founding_heroes.financial.column_amount','de','Betrag'),('founding_heroes.financial.column_amount','es','Importe'),('founding_heroes.financial.column_amount','pt','Montante'),('founding_heroes.financial.column_amount','it','Importo'),('founding_heroes.financial.column_amount','pl','Kwota'),('founding_heroes.financial.column_amount','cs','Částka'),('founding_heroes.financial.column_amount','tr','Tutar'),('founding_heroes.financial.column_amount','ar','المبلغ'),('founding_heroes.financial.column_amount','hi','राशि'),('founding_heroes.financial.column_amount','zh','金额'),('founding_heroes.financial.column_amount','ja','金額'),('founding_heroes.financial.column_amount','ko','금액'),
    ('founding_heroes.financial.column_date','en','Date'),('founding_heroes.financial.column_date','nl','Datum'),('founding_heroes.financial.column_date','fr','Date'),('founding_heroes.financial.column_date','de','Datum'),('founding_heroes.financial.column_date','es','Fecha'),('founding_heroes.financial.column_date','pt','Data'),('founding_heroes.financial.column_date','it','Data'),('founding_heroes.financial.column_date','pl','Data'),('founding_heroes.financial.column_date','cs','Datum'),('founding_heroes.financial.column_date','tr','Tarih'),('founding_heroes.financial.column_date','ar','التاريخ'),('founding_heroes.financial.column_date','hi','तारीख'),('founding_heroes.financial.column_date','zh','日期'),('founding_heroes.financial.column_date','ja','日付'),('founding_heroes.financial.column_date','ko','날짜'),
    ('founding_heroes.financial.loading','en','Loading financial support…'),('founding_heroes.financial.loading','nl','Financiële steun laden…'),('founding_heroes.financial.loading','fr','Chargement du soutien financier…'),('founding_heroes.financial.loading','de','Finanzielle Unterstützung wird geladen…'),('founding_heroes.financial.loading','es','Cargando apoyo financiero…'),('founding_heroes.financial.loading','pt','A carregar apoio financeiro…'),('founding_heroes.financial.loading','it','Caricamento del supporto finanziario…'),('founding_heroes.financial.loading','pl','Ładowanie wsparcia finansowego…'),('founding_heroes.financial.loading','cs','Načítání finanční podpory…'),('founding_heroes.financial.loading','tr','Mali destek yükleniyor…'),('founding_heroes.financial.loading','ar','جارٍ تحميل الدعم المالي…'),('founding_heroes.financial.loading','hi','वित्तीय सहायता लोड हो रही है…'),('founding_heroes.financial.loading','zh','正在加载财务支持…'),('founding_heroes.financial.loading','ja','資金支援を読み込み中…'),('founding_heroes.financial.loading','ko','재정 지원 로드 중…'),
    ('founding_heroes.financial.error','en','Financial support is temporarily unavailable.'),('founding_heroes.financial.error','nl','Financiële steun is tijdelijk niet beschikbaar.'),('founding_heroes.financial.error','fr','Le soutien financier est temporairement indisponible.'),('founding_heroes.financial.error','de','Finanzielle Unterstützung ist vorübergehend nicht verfügbar.'),('founding_heroes.financial.error','es','El apoyo financiero no está disponible temporalmente.'),('founding_heroes.financial.error','pt','O apoio financeiro está temporariamente indisponível.'),('founding_heroes.financial.error','it','Il supporto finanziario non è temporaneamente disponibile.'),('founding_heroes.financial.error','pl','Wsparcie finansowe jest tymczasowo niedostępne.'),('founding_heroes.financial.error','cs','Finanční podpora je dočasně nedostupná.'),('founding_heroes.financial.error','tr','Mali destek geçici olarak kullanılamıyor.'),('founding_heroes.financial.error','ar','الدعم المالي غير متاح مؤقتًا.'),('founding_heroes.financial.error','hi','वित्तीय सहायता अस्थायी रूप से उपलब्ध नहीं है।'),('founding_heroes.financial.error','zh','财务支持暂时不可用。'),('founding_heroes.financial.error','ja','資金支援は一時的に利用できません。'),('founding_heroes.financial.error','ko','재정 지원을 일시적으로 사용할 수 없습니다.'),
    ('founding_heroes.financial.empty','en','No financial support has been recorded yet.'),('founding_heroes.financial.empty','nl','Er is nog geen financiële steun geregistreerd.'),('founding_heroes.financial.empty','fr','Aucun soutien financier n’a encore été enregistré.'),('founding_heroes.financial.empty','de','Es wurde noch keine finanzielle Unterstützung erfasst.'),('founding_heroes.financial.empty','es','Aún no se ha registrado apoyo financiero.'),('founding_heroes.financial.empty','pt','Ainda não foi registado apoio financeiro.'),('founding_heroes.financial.empty','it','Non è ancora stato registrato alcun supporto finanziario.'),('founding_heroes.financial.empty','pl','Nie zarejestrowano jeszcze wsparcia finansowego.'),('founding_heroes.financial.empty','cs','Zatím nebyla zaznamenána žádná finanční podpora.'),('founding_heroes.financial.empty','tr','Henüz kaydedilmiş mali destek yok.'),('founding_heroes.financial.empty','ar','لم يُسجَّل أي دعم مالي بعد.'),('founding_heroes.financial.empty','hi','अभी तक कोई वित्तीय सहायता दर्ज नहीं की गई है।'),('founding_heroes.financial.empty','zh','尚未记录任何财务支持。'),('founding_heroes.financial.empty','ja','まだ資金支援は記録されていません。'),('founding_heroes.financial.empty','ko','아직 기록된 재정 지원이 없습니다.'),
    ('founding_heroes.financial.aria_label','en','Financial support received'),('founding_heroes.financial.aria_label','nl','Ontvangen financiële steun'),('founding_heroes.financial.aria_label','fr','Soutien financier reçu'),('founding_heroes.financial.aria_label','de','Erhaltene finanzielle Unterstützung'),('founding_heroes.financial.aria_label','es','Apoyo financiero recibido'),('founding_heroes.financial.aria_label','pt','Apoio financeiro recebido'),('founding_heroes.financial.aria_label','it','Supporto finanziario ricevuto'),('founding_heroes.financial.aria_label','pl','Otrzymane wsparcie finansowe'),('founding_heroes.financial.aria_label','cs','Přijatá finanční podpora'),('founding_heroes.financial.aria_label','tr','Alınan mali destek'),('founding_heroes.financial.aria_label','ar','الدعم المالي المستلم'),('founding_heroes.financial.aria_label','hi','प्राप्त वित्तीय सहायता'),('founding_heroes.financial.aria_label','zh','已收到的财务支持'),('founding_heroes.financial.aria_label','ja','受け取った資金支援'),('founding_heroes.financial.aria_label','ko','받은 재정 지원')
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
select k.id, 'supabase/migrations/20260715180000_founding_heroes_financial_ledger.sql', k.translation_key, 'seeded', 'Founding Heroes financial support ledger translation keys'
from public.website_translation_keys k
where k.translation_key like 'founding_heroes.financial.%'
on conflict (translation_key_id, source_path, source_identifier) do update set
  migration_status = excluded.migration_status,
  notes = excluded.notes,
  updated_at = now();

commit;
