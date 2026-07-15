begin;

-- ---------------------------------------------------------------------------
-- Public donation status RPC (session-scoped)
-- ---------------------------------------------------------------------------

create or replace function public.get_donation_public_status(
  p_donation_id uuid,
  p_session_key text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_donation public.donations%rowtype;
  v_session_key text := nullif(trim(coalesce(p_session_key, '')), '');
  v_thanks_message_key text;
begin
  if p_donation_id is null then
    raise exception 'donations.error.not_found' using errcode = 'P0001';
  end if;

  if v_session_key is null then
    raise exception 'donations.error.not_found' using errcode = 'P0001';
  end if;

  select * into v_donation
  from public.donations d
  where d.id = p_donation_id;

  if not found then
    raise exception 'donations.error.not_found' using errcode = 'P0001';
  end if;

  if coalesce(v_donation.session_key, '') <> v_session_key then
    raise exception 'donations.error.not_found' using errcode = 'P0001';
  end if;

  select s.thanks_message_key
  into v_thanks_message_key
  from public.journal_post_donation_settings s
  where s.journal_post_id = v_donation.journal_post_id
    and s.is_enabled = true;

  return jsonb_build_object(
    'donation_id', v_donation.id,
    'status', v_donation.status,
    'amount_minor_units', v_donation.amount_minor_units,
    'currency', v_donation.currency,
    'provider_slug', v_donation.provider_slug,
    'journal_post_id', v_donation.journal_post_id,
    'completed_at', v_donation.completed_at,
    'thanks_message_key', v_thanks_message_key
  );
end;
$$;

revoke all on function public.get_donation_public_status(uuid, text) from public;
grant execute on function public.get_donation_public_status(uuid, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Translation keys
-- ---------------------------------------------------------------------------

insert into public.website_translation_keys
  (translation_key, namespace, description, default_text, value_type, is_required, is_active, interpolation_variables, supports_plural)
values
  ('donations.error.not_found', 'donations', 'Donation status lookup not found or unauthorized', 'We could not find that support record.', 'text', true, true, '{}', false),
  ('donations.success.modal.title', 'donations', 'Payment-confirmed thank-you modal title', 'Thank you for your support', 'text', true, true, '{}', false),
  ('donations.success.modal.body', 'donations', 'Payment-confirmed thank-you modal body', 'Your contribution helps keep this story moving forward. We are deeply grateful for your support.', 'text', true, true, '{"amount"}', false),
  ('donations.success.modal.close', 'donations', 'Payment-confirmed thank-you modal close button', 'Close', 'text', true, true, '{}', false),
  ('donations.success.modal.close_label', 'donations', 'Payment-confirmed thank-you modal close aria-label', 'Close thank-you message', 'text', true, true, '{}', false),
  ('donations.success.modal.pending', 'donations', 'Donation pending confirmation message', 'We are confirming your payment. Your thank-you message will appear here once it is complete.', 'text', true, true, '{}', false)
on conflict (translation_key) do update set
  default_text = excluded.default_text,
  description = excluded.description,
  is_active = true,
  updated_at = now();

with catalog(translation_key, language_code, translated_text) as (
  values
    ('donations.error.not_found','en','We could not find that support record.'),('donations.error.not_found','nl','We konden dat steunrecord niet vinden.'),('donations.error.not_found','fr','Nous n''avons pas trouvé cet enregistrement de soutien.'),('donations.error.not_found','de','Dieser Unterstützungseintrag wurde nicht gefunden.'),('donations.error.not_found','es','No pudimos encontrar ese registro de apoyo.'),('donations.error.not_found','pt','Não foi possível encontrar esse registo de apoio.'),('donations.error.not_found','it','Non abbiamo trovato quel record di supporto.'),('donations.error.not_found','pl','Nie znaleźliśmy tego wpisu wsparcia.'),('donations.error.not_found','cs','Tento záznam podpory se nepodařilo najít.'),('donations.error.not_found','tr','Bu destek kaydı bulunamadı.'),('donations.error.not_found','ar','تعذر العثور على سجل الدعم هذا.'),('donations.error.not_found','hi','हमें वह समर्थन रिकॉर्ड नहीं मिला।'),('donations.error.not_found','zh','找不到该支持记录。'),('donations.error.not_found','ja','その支援記録が見つかりませんでした。'),('donations.error.not_found','ko','해당 후원 기록을 찾을 수 없습니다.'),
    ('donations.success.modal.title','en','Thank you for your support'),('donations.success.modal.title','nl','Bedankt voor je steun'),('donations.success.modal.title','fr','Merci pour votre soutien'),('donations.success.modal.title','de','Danke für Ihre Unterstützung'),('donations.success.modal.title','es','Gracias por tu apoyo'),('donations.success.modal.title','pt','Obrigado pelo seu apoio'),('donations.success.modal.title','it','Grazie per il tuo supporto'),('donations.success.modal.title','pl','Dziękujemy za wsparcie'),('donations.success.modal.title','cs','Děkujeme za vaši podporu'),('donations.success.modal.title','tr','Desteğiniz için teşekkürler'),('donations.success.modal.title','ar','شكرًا لدعمك'),('donations.success.modal.title','hi','आपके समर्थन के लिए धन्यवाद'),('donations.success.modal.title','zh','感谢您的支持'),('donations.success.modal.title','ja','ご支援ありがとうございます'),('donations.success.modal.title','ko','후원해 주셔서 감사합니다'),
    ('donations.success.modal.body','en','Your contribution of {amount} helps keep this story moving forward. We are deeply grateful for your support.'),('donations.success.modal.body','nl','Je bijdrage van {amount} helpt dit verhaal verder te brengen. We zijn je zeer dankbaar.'),('donations.success.modal.body','fr','Votre contribution de {amount} aide cette histoire à avancer. Nous vous sommes profondément reconnaissants.'),('donations.success.modal.body','de','Ihr Beitrag von {amount} hilft, diese Geschichte voranzubringen. Wir sind Ihnen sehr dankbar.'),('donations.success.modal.body','es','Tu aportación de {amount} ayuda a que esta historia siga avanzando. Estamos muy agradecidos.'),('donations.success.modal.body','pt','A sua contribuição de {amount} ajuda esta história a seguir em frente. Estamos profundamente gratos.'),('donations.success.modal.body','it','Il tuo contributo di {amount} aiuta questa storia ad andare avanti. Ti siamo profondamente grati.'),('donations.success.modal.body','pl','Twój wkład {amount} pomaga tej historii iść dalej. Jesteśmy bardzo wdzięczni.'),('donations.success.modal.body','cs','Váš příspěvek {amount} pomáhá tomuto příběhu pokračovat. Jsme vám hluboce vděční.'),('donations.success.modal.body','tr','{amount} tutarındaki katkınız bu hikayenin ilerlemesine yardımcı oluyor. Minnettarız.'),('donations.success.modal.body','ar','مساهمتك البالغة {amount} تساعد هذا القصة على المضي قدمًا. نحن ممتنون جدًا.'),('donations.success.modal.body','hi','आपका {amount} का योगदान इस कहानी को आगे बढ़ाने में मदद करता है। हम आभारी हैं।'),('donations.success.modal.body','zh','您 {amount} 的贡献帮助这个故事继续前进。我们深表感谢。'),('donations.success.modal.body','ja','{amount} のご支援がこの物語を前に進めます。心より感謝いたします。'),('donations.success.modal.body','ko','{amount} 후원이 이 이야기를 앞으로 나아가게 합니다. 진심으로 감사드립니다.'),
    ('donations.success.modal.close','en','Close'),('donations.success.modal.close','nl','Sluiten'),('donations.success.modal.close','fr','Fermer'),('donations.success.modal.close','de','Schließen'),('donations.success.modal.close','es','Cerrar'),('donations.success.modal.close','pt','Fechar'),('donations.success.modal.close','it','Chiudi'),('donations.success.modal.close','pl','Zamknij'),('donations.success.modal.close','cs','Zavřít'),('donations.success.modal.close','tr','Kapat'),('donations.success.modal.close','ar','إغلاق'),('donations.success.modal.close','hi','बंद करें'),('donations.success.modal.close','zh','关闭'),('donations.success.modal.close','ja','閉じる'),('donations.success.modal.close','ko','닫기'),
    ('donations.success.modal.close_label','en','Close thank-you message'),('donations.success.modal.close_label','nl','Bedankbericht sluiten'),('donations.success.modal.close_label','fr','Fermer le message de remerciement'),('donations.success.modal.close_label','de','Dankesnachricht schließen'),('donations.success.modal.close_label','es','Cerrar mensaje de agradecimiento'),('donations.success.modal.close_label','pt','Fechar mensagem de agradecimento'),('donations.success.modal.close_label','it','Chiudi messaggio di ringraziamento'),('donations.success.modal.close_label','pl','Zamknij wiadomość podziękowania'),('donations.success.modal.close_label','cs','Zavřít poděkování'),('donations.success.modal.close_label','tr','Teşekkür mesajını kapat'),('donations.success.modal.close_label','ar','إغلاق رسالة الشكر'),('donations.success.modal.close_label','hi','धन्यवाद संदेश बंद करें'),('donations.success.modal.close_label','zh','关闭感谢消息'),('donations.success.modal.close_label','ja','お礼メッセージを閉じる'),('donations.success.modal.close_label','ko','감사 메시지 닫기'),
    ('donations.success.modal.pending','en','We are confirming your payment. Your thank-you message will appear here once it is complete.'),('donations.success.modal.pending','nl','We bevestigen je betaling. Je bedankbericht verschijnt hier zodra die rond is.'),('donations.success.modal.pending','fr','Nous confirmons votre paiement. Votre message de remerciement apparaîtra ici une fois terminé.'),('donations.success.modal.pending','de','Wir bestätigen Ihre Zahlung. Ihre Dankesnachricht erscheint hier, sobald sie abgeschlossen ist.'),('donations.success.modal.pending','es','Estamos confirmando tu pago. Tu mensaje de agradecimiento aparecerá aquí cuando esté completo.'),('donations.success.modal.pending','pt','Estamos a confirmar o seu pagamento. A sua mensagem de agradecimento aparecerá aqui quando estiver concluída.'),('donations.success.modal.pending','it','Stiamo confermando il tuo pagamento. Il messaggio di ringraziamento apparirà qui al completamento.'),('donations.success.modal.pending','pl','Potwierdzamy Twoją płatność. Wiadomość podziękowania pojawi się tutaj po zakończeniu.'),('donations.success.modal.pending','cs','Potvrzujeme vaši platbu. Poděkování se zde zobrazí po dokončení.'),('donations.success.modal.pending','tr','Ödemenizi onaylıyoruz. Teşekkür mesajınız tamamlandığında burada görünecek.'),('donations.success.modal.pending','ar','نؤكد دفعتك. ستظهر رسالة الشكر هنا عند اكتمالها.'),('donations.success.modal.pending','hi','हम आपका भुगतान पुष्टि कर रहे हैं। पूरा होने पर धन्यवाद संदेश यहाँ दिखेगा।'),('donations.success.modal.pending','zh','我们正在确认您的付款。完成后感谢消息将显示在此处。'),('donations.success.modal.pending','ja','お支払いを確認しています。完了するとお礼メッセージがここに表示されます。'),('donations.success.modal.pending','ko','결제를 확인하는 중입니다. 완료되면 감사 메시지가 여기에 표시됩니다.')
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
select k.id, 'supabase/migrations/20260715160000_donation_thank_you_modal.sql', k.translation_key, 'seeded', 'Donation thank-you modal translation keys'
from public.website_translation_keys k
where k.translation_key in (
  'donations.error.not_found',
  'donations.success.modal.title',
  'donations.success.modal.body',
  'donations.success.modal.close',
  'donations.success.modal.close_label',
  'donations.success.modal.pending'
)
on conflict (translation_key_id, source_path, source_identifier) do update set
  migration_status = excluded.migration_status,
  notes = excluded.notes,
  updated_at = now();

-- Default per-post thank-you copy key for posts that already accept donations
insert into public.journal_post_donation_settings (journal_post_id, is_enabled, thanks_message_key)
select p.id, true, 'donations.success.modal.body'
from public.journal_posts p
where p.status = 'published'
  and p.published_at is not null
  and p.published_at <= now()
  and not exists (
    select 1 from public.journal_post_donation_settings s where s.journal_post_id = p.id
  )
on conflict (journal_post_id) do update set
  thanks_message_key = coalesce(public.journal_post_donation_settings.thanks_message_key, excluded.thanks_message_key),
  updated_at = now();

commit;
