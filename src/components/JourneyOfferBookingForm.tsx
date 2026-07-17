import type { FormEvent } from 'react';
import { useState } from 'react';
import { HandHeart } from 'lucide-react';
import type { I18nManifest } from '../lib/i18nManifest';
import {
  submitJourneyOfferBooking,
  type JourneyOfferBookingContext,
} from '../lib/journeyOfferBookings';
import { useWebsiteI18n } from '../lib/websiteI18n';

export const JOURNEY_OFFER_BOOKING_FORM_I18N_MANIFEST = {
  componentKey: 'components.journey.calendar.offer_booking_form',
  namespace: 'journey_calendar',
  translationKeys: [
    'journey_calendar.booking.close',
    'journey_calendar.booking.eyebrow',
    'journey_calendar.booking.title',
    'journey_calendar.booking.stop_context',
    'journey_calendar.booking.private_contact',
    'journey_calendar.booking.name',
    'journey_calendar.booking.email',
    'journey_calendar.booking.phone',
    'journey_calendar.booking.optional',
    'journey_calendar.booking.preferred_from',
    'journey_calendar.booking.preferred_until',
    'journey_calendar.booking.group_size',
    'journey_calendar.booking.message',
    'journey_calendar.booking.message_placeholder',
    'journey_calendar.booking.contact_consent',
    'journey_calendar.booking.sending',
    'journey_calendar.booking.send',
    'journey_calendar.booking.done',
    'journey_calendar.booking.success',
    'journey_calendar.booking.error',
    'journey_calendar.booking.unavailable',
  ] as const,
  keyPatterns: ['journey_calendar.booking.*'] as const,
  entityContent: {
    tables: ['journey_offer_bookings', 'journey_exchange_items', 'offers', 'journey_calendar_entries'],
  },
} as const satisfies I18nManifest;

type JourneyOfferBookingFormProps = {
  context: JourneyOfferBookingContext;
  onClose: () => void;
};

export function JourneyOfferBookingForm({ context, onClose }: JourneyOfferBookingFormProps) {
  const { t } = useWebsiteI18n();
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    preferred_from: context.preferredFrom,
    preferred_until: context.preferredUntil,
    group_size: 1,
    message: '',
    consent_to_contact: true,
  });
  const [state, setState] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    setState('saving');
    setMessage('');
    try {
      await submitJourneyOfferBooking({
        exchange_item_id: context.exchangeItemId,
        offer_id: context.offerId,
        calendar_entry_id: context.calendarEntryId,
        full_name: form.full_name,
        email: form.email,
        phone: form.phone,
        preferred_from: form.preferred_from,
        preferred_until: form.preferred_until,
        group_size: Number(form.group_size) || null,
        message: form.message,
        consent_to_contact: form.consent_to_contact,
      });
      setState('success');
      setMessage(
        t(
          'journey_calendar.booking.success',
          'Thank you. Your booking request was sent privately to Kevin and Micha.',
        ),
      );
    } catch {
      setState('error');
      setMessage(
        t(
          'journey_calendar.booking.error',
          'Your booking request could not be sent. Please check the details and try again.',
        ),
      );
    }
  }

  return (
    <div className="journey-modal" role="dialog" aria-modal="true" aria-labelledby="offer-booking-title">
      <div className="journey-modal__panel">
        <button className="journey-modal__close" type="button" onClick={onClose}>
          {t('journey_calendar.booking.close', 'Close')}
        </button>
        <p className="eyebrow">{t('journey_calendar.booking.eyebrow', 'Book this offer')}</p>
        <h3 id="offer-booking-title">
          {t('journey_calendar.booking.title', 'Request {offer}', { offer: context.offerTitle })}
        </h3>
        {context.stopLabel ? (
          <p>
            {t('journey_calendar.booking.stop_context', 'Linked stop: {stop}', {
              stop: context.stopLabel,
            })}
          </p>
        ) : null}
        <p>
          {t(
            'journey_calendar.booking.private_contact',
            'Your contact details remain private and are only visible to authorized mission admins.',
          )}
        </p>
        {state === 'success' ? (
          <div className="journey-success">
            <HandHeart />
            <strong>{message}</strong>
            <button className="button" type="button" onClick={onClose}>
              {t('journey_calendar.booking.done', 'Done')}
            </button>
          </div>
        ) : (
          <form className="journey-host-form" onSubmit={submit}>
            <div className="journey-form-grid">
              <label>
                {t('journey_calendar.booking.name', 'Your name')}
                <input
                  required
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                />
              </label>
              <label>
                {t('journey_calendar.booking.email', 'Email')}
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </label>
              <label>
                {t('journey_calendar.booking.phone', 'Phone')}{' '}
                <small>{t('journey_calendar.booking.optional', 'optional')}</small>
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </label>
              <label>
                {t('journey_calendar.booking.group_size', 'Group size')}
                <input
                  required
                  type="number"
                  min={1}
                  max={50}
                  value={form.group_size}
                  onChange={(e) => setForm({ ...form, group_size: Number(e.target.value) || 1 })}
                />
              </label>
              <label>
                {t('journey_calendar.booking.preferred_from', 'Preferred from')}
                <input
                  required
                  type="date"
                  value={form.preferred_from}
                  onChange={(e) => setForm({ ...form, preferred_from: e.target.value })}
                />
              </label>
              <label>
                {t('journey_calendar.booking.preferred_until', 'Preferred until')}
                <input
                  required
                  type="date"
                  value={form.preferred_until}
                  onChange={(e) => setForm({ ...form, preferred_until: e.target.value })}
                />
              </label>
            </div>
            <label>
              {t('journey_calendar.booking.message', 'Message')}
              <textarea
                required
                rows={4}
                placeholder={t(
                  'journey_calendar.booking.message_placeholder',
                  'Tell Kevin and Micha what you have in mind, timing flexibility, and anything useful to know.',
                )}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
              />
            </label>
            <label className="journey-consent">
              <input
                required
                type="checkbox"
                checked={form.consent_to_contact}
                onChange={(e) => setForm({ ...form, consent_to_contact: e.target.checked })}
              />{' '}
              {t(
                'journey_calendar.booking.contact_consent',
                'Kevin and Micha may contact me about this booking request.',
              )}
            </label>
            {message ? <p className={state === 'error' ? 'journey-error' : 'form-status'}>{message}</p> : null}
            <button className="button" disabled={state === 'saving'} type="submit">
              {state === 'saving'
                ? t('journey_calendar.booking.sending', 'Sending privately…')
                : t('journey_calendar.booking.send', 'Send booking request')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
