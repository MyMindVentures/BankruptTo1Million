import type { I18nManifest } from '../../lib/i18nManifest';
import { Heart, X } from 'lucide-react';
import { useEffect, useId, useRef } from 'react';
import { formatDonationAmount } from '../../lib/donations';
import { useWebsiteI18n } from '../../lib/websiteI18n';
import './DonationThankYouModal.css';

type DonationThankYouModalProps = {
  open: boolean;
  amountMinorUnits: number;
  currency: string;
  thanksMessageKey?: string | null;
  onClose: () => void;
};

const BODY_FALLBACK =
  'Your contribution of {amount} helps keep this story moving forward. We are deeply grateful for your support.';

export const DONATION_THANK_YOU_MODAL_I18N_MANIFEST = {
  componentKey: 'components.journal.donation.thank.you.modal',
  namespace: 'donations.cta',
  translationKeys: [
    'donations.cta.support_this_story',
    'donations.success.modal.close',
    'donations.success.modal.close_label',
    'donations.success.modal.title',
  ] as const,
  keyPatterns: [
    'donations.cta.*',
    'donations.success.modal.*',
  ] as const,
} as const satisfies I18nManifest;

export function DonationThankYouModal({
  open,
  amountMinorUnits,
  currency,
  thanksMessageKey,
  onClose,
}: DonationThankYouModalProps) {
  const { language, t } = useWebsiteI18n();
  const titleId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const formattedAmount = formatDonationAmount(amountMinorUnits, currency, language);
  const bodyKey = thanksMessageKey || 'donations.success.modal.body';

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }

    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="donation-thank-you-modal" role="presentation" onClick={onClose}>
      <div
        className="donation-thank-you-modal__panel story-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          ref={closeButtonRef}
          className="donation-thank-you-modal__close"
          type="button"
          onClick={onClose}
          aria-label={t('donations.success.modal.close_label', 'Close thank-you message')}
        >
          <X size={18} aria-hidden="true" />
        </button>

        <div className="donation-thank-you-modal__badge" aria-hidden="true">
          <Heart size={28} />
        </div>

        <p className="eyebrow">{t('donations.cta.support_this_story', 'Support this story')}</p>
        <h2 id={titleId} className="donation-thank-you-modal__title">
          {t('donations.success.modal.title', 'Thank you for your support')}
        </h2>

        <p className="donation-thank-you-modal__amount" aria-label={formattedAmount}>
          {formattedAmount}
        </p>

        <p className="donation-thank-you-modal__body">
          {t(bodyKey, BODY_FALLBACK, { amount: formattedAmount })}
        </p>

        <button className="button donation-thank-you-modal__cta" type="button" onClick={onClose}>
          {t('donations.success.modal.close', 'Close')}
        </button>
      </div>
    </div>
  );
}
