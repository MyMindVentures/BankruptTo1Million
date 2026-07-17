import type { FormEvent } from 'react';
import { useState } from 'react';
import { HandHeart } from 'lucide-react';
import type { I18nManifest } from '../lib/i18nManifest';
import {
  submitJourneyHostOffer,
  type PublicJourneyCalendarEntry,
} from '../lib/journeyCalendar';
import { useWebsiteI18n } from '../lib/websiteI18n';

export const JOURNEY_HOST_OFFER_FORM_I18N_MANIFEST = {
  componentKey: 'components.journey.calendar.host_form',
  namespace: 'journey_calendar',
  translationKeys: [
    'journey_calendar.host.close',
    'journey_calendar.host.eyebrow',
    'journey_calendar.host.title',
    'journey_calendar.host.private_contact',
    'journey_calendar.host.name',
    'journey_calendar.host.email',
    'journey_calendar.host.phone',
    'journey_calendar.host.optional',
    'journey_calendar.host.accommodation_type',
    'journey_calendar.host.accommodation_placeholder',
    'journey_calendar.host.available_from',
    'journey_calendar.host.available_until',
    'journey_calendar.host.message',
    'journey_calendar.host.message_placeholder',
    'journey_calendar.host.contact_consent',
    'journey_calendar.host.sending',
    'journey_calendar.host.send',
    'journey_calendar.host.done',
    'journey_calendar.host.success',
    'journey_calendar.host.error',
  ] as const,
  keyPatterns: ['journey_calendar.host.*'] as const,
} as const satisfies I18nManifest;

type JourneyHostOfferFormProps = {
  entry: PublicJourneyCalendarEntry;
  onClose: () => void;
};

export function JourneyHostOfferForm({ entry, onClose }: JourneyHostOfferFormProps) {
  const { t } = useWebsiteI18n();
  const [form, setForm] = useState({
    host_name: '',
    email: '',
    phone: '',
    city_name: entry.city_name || '',
    country_name: entry.country_name || '',
    accommodation_type: '',
    available_from: entry.accommodation_from || entry.starts_on,
    available_until: entry.accommodation_until || entry.ends_on || entry.starts_on,
    guests_capacity: entry.guests_count || 2,
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
      await submitJourneyHostOffer({
        calendar_entry_id: entry.id,
        host_name: form.host_name,
        email: form.email,
        phone: form.phone,
        city_name: form.city_name,
        country_name: form.country_name,
        accommodation_type: form.accommodation_type,
        available_from: form.available_from,
        available_until: form.available_until,
        guests_capacity: Number(form.guests_capacity),
        message: form.message,
        consent_to_contact: form.consent_to_contact,
      });
      setState('success');
      setMessage(t('journey_calendar.host.success', 'Thank you. Your hosting offer was sent privately to Kevin and Micha.'));
    } catch {
      setState('error');
      setMessage(t('journey_calendar.host.error', 'Your offer could not be sent. Please check the details and try again.'));
    }
  }

  const locationLabel = entry.location_name || entry.city_name || entry.title;

  return (
    <div className="journey-modal" role="dialog" aria-modal="true" aria-labelledby="host-offer-title">
      <div className="journey-modal__panel">
        <button className="journey-modal__close" type="button" onClick={onClose}>
          {t('journey_calendar.host.close', 'Close')}
        </button>
        <p className="eyebrow">{t('journey_calendar.host.eyebrow', 'Offer a place to stay')}</p>
        <h3 id="host-offer-title">
          {t('journey_calendar.host.title', 'Help at {location}', { location: locationLabel })}
        </h3>
        <p>{t('journey_calendar.host.private_contact', 'Your contact details remain private and are only visible to authorized mission admins.')}</p>
        {state === 'success' ? (
          <div className="journey-success">
            <HandHeart />
            <strong>{message}</strong>
            <button className="button" type="button" onClick={onClose}>
              {t('journey_calendar.host.done', 'Done')}
            </button>
          </div>
        ) : (
          <form className="journey-host-form" onSubmit={submit}>
            <div className="journey-form-grid">
              <label>
                {t('journey_calendar.host.name', 'Your name')}
                <input required value={form.host_name} onChange={(e) => setForm({ ...form, host_name: e.target.value })} />
              </label>
              <label>
                {t('journey_calendar.host.email', 'Email')}
                <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </label>
              <label>
                {t('journey_calendar.host.phone', 'Phone')}{' '}
                <small>{t('journey_calendar.host.optional', 'optional')}</small>
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </label>
              <label>
                {t('journey_calendar.host.accommodation_type', 'Accommodation type')}
                <input
                  required
                  placeholder={t('journey_calendar.host.accommodation_placeholder', 'Bed, camper place, guest room…')}
                  value={form.accommodation_type}
                  onChange={(e) => setForm({ ...form, accommodation_type: e.target.value })}
                />
              </label>
              <label>
                {t('journey_calendar.host.available_from', 'Available from')}
                <input required type="date" value={form.available_from} onChange={(e) => setForm({ ...form, available_from: e.target.value })} />
              </label>
              <label>
                {t('journey_calendar.host.available_until', 'Available until')}
                <input required type="date" value={form.available_until} onChange={(e) => setForm({ ...form, available_until: e.target.value })} />
              </label>
            </div>
            <label>
              {t('journey_calendar.host.message', 'Message')}
              <textarea
                required
                rows={4}
                placeholder={t('journey_calendar.host.message_placeholder', 'Tell Kevin and Micha what you can offer and anything useful to know.')}
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
              {t('journey_calendar.host.contact_consent', 'Kevin and Micha may contact me about this hosting offer.')}
            </label>
            {message ? <p className={state === 'error' ? 'journey-error' : 'form-status'}>{message}</p> : null}
            <button className="button" disabled={state === 'saving'} type="submit">
              {state === 'saving'
                ? t('journey_calendar.host.sending', 'Sending privately…')
                : t('journey_calendar.host.send', 'Send hosting offer')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
