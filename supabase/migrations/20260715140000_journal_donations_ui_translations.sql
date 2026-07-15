begin;

insert into public.website_translation_keys
  (translation_key, namespace, description, default_text, value_type, is_required, is_active, interpolation_variables, supports_plural)
values
  ('donations.cta.continue_to_payment', 'donations', 'Continue to payment CTA', 'Continue to payment', 'text', true, true, '{}', false),
  ('donations.loading.options', 'donations', 'Loading donation options', 'Loading support options…', 'text', true, true, '{}', false),
  ('donations.submitting', 'donations', 'Submitting donation intent', 'Starting your support…', 'text', true, true, '{}', false),
  ('donations.success.recorded', 'donations', 'Donation intent recorded', 'Thank you. Your support has been recorded.', 'text', true, true, '{}', false),
  ('donations.success.wise_transfer', 'donations', 'Wise transfer next step', 'Continue to Wise to complete your transfer. We will confirm once it arrives.', 'text', true, true, '{}', false),
  ('donations.thanks.title', 'donations', 'Supporter thanks heading', 'Supporter thanks', 'text', true, true, '{}', false),
  ('donations.form.choose_provider', 'donations', 'Choose payment provider label', 'Choose payment method', 'text', true, true, '{}', false),
  ('donations.checkout.hosted_pending', 'donations', 'Hosted checkout pending setup', 'Card checkout will open here once payment processing is fully connected. Your support request has been saved.', 'text', true, true, '{}', false)
on conflict (translation_key) do update set
  default_text = excluded.default_text,
  description = excluded.description,
  is_active = true,
  updated_at = now();

with catalog(translation_key, language_code, translated_text) as (
  values
    ('donations.cta.continue_to_payment','en','Continue to payment'),('donations.cta.continue_to_payment','nl','Doorgaan naar betaling'),('donations.cta.continue_to_payment','fr','Continuer vers le paiement'),('donations.cta.continue_to_payment','de','Weiter zur Zahlung'),('donations.cta.continue_to_payment','es','Continuar al pago'),('donations.cta.continue_to_payment','pt','Continuar para pagamento'),('donations.cta.continue_to_payment','it','Continua al pagamento'),('donations.cta.continue_to_payment','pl','Przejdź do płatności'),('donations.cta.continue_to_payment','cs','Pokračovat k platbě'),('donations.cta.continue_to_payment','tr','Ödemeye devam et'),('donations.cta.continue_to_payment','ar','متابعة إلى الدفع'),('donations.cta.continue_to_payment','hi','भुगतान पर जारी रखें'),('donations.cta.continue_to_payment','zh','继续付款'),('donations.cta.continue_to_payment','ja','支払いに進む'),('donations.cta.continue_to_payment','ko','결제로 계속'),
    ('donations.loading.options','en','Loading support options…'),('donations.loading.options','nl','Steunopties laden…'),('donations.loading.options','fr','Chargement des options de soutien…'),('donations.loading.options','de','Unterstützungsoptionen werden geladen…'),('donations.loading.options','es','Cargando opciones de apoyo…'),('donations.loading.options','pt','A carregar opções de apoio…'),('donations.loading.options','it','Caricamento opzioni di supporto…'),('donations.loading.options','pl','Ładowanie opcji wsparcia…'),('donations.loading.options','cs','Načítání možností podpory…'),('donations.loading.options','tr','Destek seçenekleri yükleniyor…'),('donations.loading.options','ar','جارٍ تحميل خيارات الدعم…'),('donations.loading.options','hi','सहायता विकल्प लोड हो रहे हैं…'),('donations.loading.options','zh','正在加载支持选项…'),('donations.loading.options','ja','支援オプションを読み込み中…'),('donations.loading.options','ko','지원 옵션 로드 중…'),
    ('donations.submitting','en','Starting your support…'),('donations.submitting','nl','Je steun starten…'),('donations.submitting','fr','Démarrage de votre soutien…'),('donations.submitting','de','Ihre Unterstützung wird gestartet…'),('donations.submitting','es','Iniciando tu apoyo…'),('donations.submitting','pt','A iniciar o seu apoio…'),('donations.submitting','it','Avvio del tuo supporto…'),('donations.submitting','pl','Rozpoczynanie wsparcia…'),('donations.submitting','cs','Spouštění vaší podpory…'),('donations.submitting','tr','Desteğiniz başlatılıyor…'),('donations.submitting','ar','جارٍ بدء دعمك…'),('donations.submitting','hi','आपका समर्थन शुरू हो रहा है…'),('donations.submitting','zh','正在开始您的支持…'),('donations.submitting','ja','支援を開始しています…'),('donations.submitting','ko','후원을 시작하는 중…'),
    ('donations.success.recorded','en','Thank you. Your support has been recorded.'),('donations.success.recorded','nl','Bedankt. Je steun is geregistreerd.'),('donations.success.recorded','fr','Merci. Votre soutien a été enregistré.'),('donations.success.recorded','de','Danke. Ihre Unterstützung wurde erfasst.'),('donations.success.recorded','es','Gracias. Tu apoyo ha sido registrado.'),('donations.success.recorded','pt','Obrigado. O seu apoio foi registado.'),('donations.success.recorded','it','Grazie. Il tuo supporto è stato registrato.'),('donations.success.recorded','pl','Dziękujemy. Twoje wsparcie zostało zapisane.'),('donations.success.recorded','cs','Děkujeme. Vaše podpora byla zaznamenána.'),('donations.success.recorded','tr','Teşekkürler. Desteğiniz kaydedildi.'),('donations.success.recorded','ar','شكرًا لك. تم تسجيل دعمك.'),('donations.success.recorded','hi','धन्यवाद। आपका समर्थन दर्ज कर लिया गया है।'),('donations.success.recorded','zh','谢谢。您的支持已记录。'),('donations.success.recorded','ja','ありがとうございます。ご支援が記録されました。'),('donations.success.recorded','ko','감사합니다. 후원이 기록되었습니다.'),
    ('donations.success.wise_transfer','en','Continue to Wise to complete your transfer. We will confirm once it arrives.'),('donations.success.wise_transfer','nl','Ga verder naar Wise om je overboeking te voltooien. We bevestigen zodra deze binnen is.'),('donations.success.wise_transfer','fr','Continuez vers Wise pour finaliser votre virement. Nous confirmerons à réception.'),('donations.success.wise_transfer','de','Weiter zu Wise, um die Überweisung abzuschließen. Wir bestätigen nach Eingang.'),('donations.success.wise_transfer','es','Continúa a Wise para completar la transferencia. Confirmaremos cuando llegue.'),('donations.success.wise_transfer','pt','Continue para a Wise para concluir a transferência. Confirmaremos quando chegar.'),('donations.success.wise_transfer','it','Continua su Wise per completare il bonifico. Confermeremo all’arrivo.'),('donations.success.wise_transfer','pl','Przejdź do Wise, aby dokończyć przelew. Potwierdzimy po otrzymaniu.'),('donations.success.wise_transfer','cs','Pokračujte na Wise a dokončete převod. Potvrdíme po připsání.'),('donations.success.wise_transfer','tr','Transferi tamamlamak için Wise’a devam edin. Geldiğinde onaylayacağız.'),('donations.success.wise_transfer','ar','تابع إلى Wise لإكمال التحويل. سنؤكد عند وصوله.'),('donations.success.wise_transfer','hi','ट्रांसफर पूरा करने के लिए Wise पर जारी रखें। आने पर हम पुष्टि करेंगे।'),('donations.success.wise_transfer','zh','继续前往 Wise 完成转账。到账后我们会确认。'),('donations.success.wise_transfer','ja','Wiseで送金を完了してください。着金後に確認します。'),('donations.success.wise_transfer','ko','Wise로 이동해 이체를 완료하세요. 도착하면 확인합니다.'),
    ('donations.thanks.title','en','Supporter thanks'),('donations.thanks.title','nl','Dank aan supporters'),('donations.thanks.title','fr','Remerciements aux supporters'),('donations.thanks.title','de','Dank an Unterstützer'),('donations.thanks.title','es','Agradecimientos a supporters'),('donations.thanks.title','pt','Agradecimentos aos apoiantes'),('donations.thanks.title','it','Ringraziamenti ai sostenitori'),('donations.thanks.title','pl','Podziękowania dla wspierających'),('donations.thanks.title','cs','Poděkování podporovatelům'),('donations.thanks.title','tr','Destekçi teşekkürleri'),('donations.thanks.title','ar','شكر الداعمين'),('donations.thanks.title','hi','समर्थकों का धन्यवाद'),('donations.thanks.title','zh','支持者感谢'),('donations.thanks.title','ja','支援者への感謝'),('donations.thanks.title','ko','후원자 감사'),
    ('donations.form.choose_provider','en','Choose payment method'),('donations.form.choose_provider','nl','Kies betaalmethode'),('donations.form.choose_provider','fr','Choisissez le mode de paiement'),('donations.form.choose_provider','de','Zahlungsmethode wählen'),('donations.form.choose_provider','es','Elige método de pago'),('donations.form.choose_provider','pt','Escolha o método de pagamento'),('donations.form.choose_provider','it','Scegli metodo di pagamento'),('donations.form.choose_provider','pl','Wybierz metodę płatności'),('donations.form.choose_provider','cs','Vyberte způsob platby'),('donations.form.choose_provider','tr','Ödeme yöntemi seçin'),('donations.form.choose_provider','ar','اختر طريقة الدفع'),('donations.form.choose_provider','hi','भुगतान विधि चुनें'),('donations.form.choose_provider','zh','选择支付方式'),('donations.form.choose_provider','ja','支払い方法を選択'),('donations.form.choose_provider','ko','결제 수단 선택'),
    ('donations.checkout.hosted_pending','en','Card checkout will open here once payment processing is fully connected. Your support request has been saved.'),('donations.checkout.hosted_pending','nl','Kaartbetaling opent hier zodra betalingsverwerking volledig is gekoppeld. Je steunverzoek is opgeslagen.'),('donations.checkout.hosted_pending','fr','Le paiement par carte s’ouvrira ici une fois le traitement des paiements entièrement connecté. Votre demande de soutien a été enregistrée.'),('donations.checkout.hosted_pending','de','Die Kartenzahlung öffnet sich hier, sobald die Zahlungsabwicklung vollständig verbunden ist. Ihre Unterstützungsanfrage wurde gespeichert.'),('donations.checkout.hosted_pending','es','El pago con tarjeta se abrirá aquí cuando el procesamiento de pagos esté totalmente conectado. Tu solicitud de apoyo se ha guardado.'),('donations.checkout.hosted_pending','pt','O pagamento com cartão abrirá aqui quando o processamento de pagamentos estiver totalmente ligado. O seu pedido de apoio foi guardado.'),('donations.checkout.hosted_pending','it','Il pagamento con carta si aprirà qui quando l’elaborazione pagamenti sarà completamente collegata. La tua richiesta di supporto è stata salvata.'),('donations.checkout.hosted_pending','pl','Płatność kartą otworzy się tutaj po pełnym podłączeniu przetwarzania płatności. Twoja prośba o wsparcie została zapisana.'),('donations.checkout.hosted_pending','cs','Platba kartou se zde otevře po plném připojení zpracování plateb. Vaše žádost o podporu byla uložena.'),('donations.checkout.hosted_pending','tr','Ödeme işleme tamamen bağlandığında kart ödemesi burada açılacak. Destek talebiniz kaydedildi.'),('donations.checkout.hosted_pending','ar','سيفتح الدفع بالبطاقة هنا بمجرد ربط معالجة الدفع بالكامل. تم حفظ طلب دعمك.'),('donations.checkout.hosted_pending','hi','भुगतान प्रसंस्करण पूरी तरह जुड़ने पर कार्ड चेकआउट यहाँ खुलेगा। आपका समर्थन अनुरोध सहेजा गया है।'),('donations.checkout.hosted_pending','zh','支付处理完全连接后，银行卡结账将在此处打开。您的支持请求已保存。'),('donations.checkout.hosted_pending','ja','決済処理が完全に接続されると、ここでカード決済が開きます。支援リクエストは保存されました。'),('donations.checkout.hosted_pending','ko','결제 처리가 완전히 연결되면 여기에서 카드 결제가 열립니다. 후원 요청이 저장되었습니다.')
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
select k.id, 'supabase/migrations/20260715140000_journal_donations_ui_translations.sql', k.translation_key, 'seeded', 'Journal donations UI translation keys'
from public.website_translation_keys k
where k.translation_key in (
  'donations.cta.continue_to_payment',
  'donations.loading.options',
  'donations.submitting',
  'donations.success.recorded',
  'donations.success.wise_transfer',
  'donations.thanks.title',
  'donations.form.choose_provider',
  'donations.checkout.hosted_pending'
)
on conflict (translation_key_id, source_path, source_identifier) do update set
  migration_status = excluded.migration_status,
  notes = excluded.notes,
  updated_at = now();

commit;
