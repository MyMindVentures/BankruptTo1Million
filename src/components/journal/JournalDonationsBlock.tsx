import { Clock3, Coins, Heart, LoaderCircle, Mail, MessageSquareText, ShieldCheck, Sparkles, UserRound, Users } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  clearPendingDonation,
  createDonationIntent,
  donationSessionKey,
  formatDonationAmount,
  getDonationPublicConfig,
  getDonationPublicStatus,
  getJournalDonationPublicStats,
  getJournalDonationSupporterThanks,
  persistPendingDonation,
  readDonationIdFromUrl,
  readPendingDonation,
  stripDonationQueryParam,
  type DonationAmountPreset,
  type DonationProvider,
  type DonationPublicConfig,
  type DonationPublicStats,
  type DonationPublicStatus,
  type DonationSupporterThanks,
} from '../../lib/donations';
import type { PublicJournalPost } from '../../lib/journal';
import { useWebsiteI18n } from '../../lib/websiteI18n';
import { DonationProviderIcon } from './DonationProviderIcon';
import { DonationThankYouModal } from './DonationThankYouModal';
import './JournalDonationsBlock.css';

type LoadState = 'loading' | 'disabled' | 'ready' | 'error';
type SubmitState = 'ready' | 'submitting' | 'pending' | 'error';

type DonationForm = {
  donor_email: string;
  donor_display_name: string;
  supporter_message: string;
  is_anonymous: boolean;
  consent_to_public_thanks: boolean;
};

const PENDING_STATUSES = new Set(['initiated', 'pending', 'awaiting_transfer']);
const POLL_INTERVAL_MS = 4000;
const POLL_MAX_ATTEMPTS = 30;

function providerLabelKey(slug: string) {
  return `donations.provider.${slug}` as const;
}

const PROVIDER_LABEL_FALLBACKS: Record<string, string> = {
  stripe: 'Card payment',
  paypal: 'PayPal',
  wise: 'Wise transfer',
  manual: 'Manual transfer',
};

export const JOURNAL_DONATION_TRANSLATION_KEYS = [
  'donations.cta.support_this_story',
  'donations.cta.choose_amount',
  'donations.cta.custom_amount',
  'donations.cta.continue_to_payment',
  'donations.form.choose_provider',
  'donations.form.your_details',
  'donations.form.privacy_preferences',
  'donations.form.email_label',
  'donations.form.display_name_label',
  'donations.form.message_label',
  'donations.form.anonymous_label',
  'donations.form.public_thanks_consent',
  'donations.provider.stripe',
  'donations.provider.paypal',
  'donations.provider.wise',
  'donations.provider.manual',
  'donations.stats.supporters',
  'donations.thanks.title',
  'donations.thanks.intro',
  'donations.thanks.anonymous_label',
  'donations.loading.options',
  'donations.submitting',
  'donations.success.wise_transfer',
  'donations.checkout.hosted_pending',
  'donations.success.modal.title',
  'donations.success.modal.body',
  'donations.success.modal.close',
  'donations.success.modal.close_label',
  'donations.success.modal.pending',
  'donations.error.disabled',
  'donations.error.invalid_amount',
  'donations.error.invalid_post',
  'donations.error.invalid_provider',
  'donations.error.invalid_email',
  'donations.error.not_found',
] as const;

function resolveCustomPreset(presets: DonationAmountPreset[]) {
  return presets.find((preset) => preset.is_custom_allowed) || null;
}

function resolveFixedPresets(presets: DonationAmountPreset[]) {
  return presets.filter((preset) => !preset.is_custom_allowed);
}

async function refreshDonationSummaries(postId: string, language: string) {
  const [nextStats, nextThanks] = await Promise.all([
    getJournalDonationPublicStats(postId),
    getJournalDonationSupporterThanks(postId, language),
  ]);
  return { nextStats, nextThanks };
}

export function JournalDonationsBlock({ post }: { post: PublicJournalPost }) {
  const { language, t, formatDate, isLoading: isI18nLoading } = useWebsiteI18n();
  const [config, setConfig] = useState<DonationPublicConfig | null>(null);
  const [stats, setStats] = useState<DonationPublicStats | null>(null);
  const [thanks, setThanks] = useState<DonationSupporterThanks[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [submitState, setSubmitState] = useState<SubmitState>('ready');
  const [errorKey, setErrorKey] = useState('');
  const [pendingNoticeKey, setPendingNoticeKey] = useState('donations.success.modal.pending');
  const [trackedDonationId, setTrackedDonationId] = useState<string | null>(null);
  const [thankYouStatus, setThankYouStatus] = useState<DonationPublicStatus | null>(null);
  const [showThankYouModal, setShowThankYouModal] = useState(false);
  const [selectedPresetId, setSelectedPresetId] = useState('');
  const [customAmount, setCustomAmount] = useState('');
  const [providerSlug, setProviderSlug] = useState('');
  const [form, setForm] = useState<DonationForm>({
    donor_email: '',
    donor_display_name: '',
    supporter_message: '',
    is_anonymous: false,
    consent_to_public_thanks: false,
  });

  const fixedPresets = useMemo(() => resolveFixedPresets(config?.presets || []), [config?.presets]);
  const customPreset = useMemo(() => resolveCustomPreset(config?.presets || []), [config?.presets]);
  const currency = config?.default_currency || 'EUR';

  const openThankYouModal = useCallback(async (status: DonationPublicStatus) => {
    setThankYouStatus(status);
    setShowThankYouModal(true);
    setSubmitState('ready');
    setTrackedDonationId(null);
    clearPendingDonation();
    stripDonationQueryParam();
    const { nextStats, nextThanks } = await refreshDonationSummaries(post.id, language);
    setStats(nextStats);
    setThanks(nextThanks);
  }, [language, post.id]);

  const inspectDonationStatus = useCallback(async (donationId: string) => {
    const status = await getDonationPublicStatus(donationId, donationSessionKey());
    if (status.journal_post_id !== post.id) return null;

    if (status.status === 'succeeded') {
      await openThankYouModal(status);
      return status;
    }

    if (PENDING_STATUSES.has(status.status)) {
      setTrackedDonationId(donationId);
      setSubmitState('pending');
      return status;
    }

    return status;
  }, [openThankYouModal, post.id]);

  useEffect(() => {
    let cancelled = false;
    setLoadState('loading');
    setErrorKey('');
    Promise.all([
      getDonationPublicConfig(language),
      getJournalDonationPublicStats(post.id),
      getJournalDonationSupporterThanks(post.id, language),
    ])
      .then(([nextConfig, nextStats, nextThanks]) => {
        if (cancelled) return;
        setConfig(nextConfig);
        setStats(nextStats);
        setThanks(nextThanks);
        if (!nextConfig.enabled || nextStats.enabled === false) {
          setLoadState('disabled');
          return;
        }
        const firstPreset = resolveFixedPresets(nextConfig.presets)[0];
        const firstProvider = nextConfig.providers[0];
        setSelectedPresetId(firstPreset?.id || '');
        setProviderSlug(firstProvider?.slug || '');
        setLoadState('ready');
      })
      .catch(() => {
        if (cancelled) return;
        setLoadState('error');
        setErrorKey('donations.error.disabled');
      });
    return () => {
      cancelled = true;
    };
  }, [language, post.id]);

  useEffect(() => {
    if (loadState !== 'ready' || showThankYouModal) return;

    const urlDonationId = readDonationIdFromUrl();
    const pending = readPendingDonation();
    const donationId = urlDonationId || (pending?.journal_post_id === post.id ? pending.donation_id : null);
    if (!donationId) return;

    inspectDonationStatus(donationId).catch(() => {
      if (urlDonationId) stripDonationQueryParam();
    });
  }, [inspectDonationStatus, loadState, post.id, showThankYouModal]);

  useEffect(() => {
    if (!trackedDonationId || showThankYouModal || submitState !== 'pending') return;

    let attempts = 0;
    let cancelled = false;

    const poll = window.setInterval(() => {
      attempts += 1;
      getDonationPublicStatus(trackedDonationId, donationSessionKey())
        .then(async (status) => {
          if (cancelled || status.journal_post_id !== post.id) return;
          if (status.status === 'succeeded') {
            window.clearInterval(poll);
            await openThankYouModal(status);
          } else if (attempts >= POLL_MAX_ATTEMPTS) {
            window.clearInterval(poll);
          }
        })
        .catch(() => {
          if (attempts >= POLL_MAX_ATTEMPTS) window.clearInterval(poll);
        });
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(poll);
    };
  }, [openThankYouModal, post.id, showThankYouModal, submitState, trackedDonationId]);

  function translateError(key: string) {
    if (key.startsWith('donations.error.')) {
      return t(key, key);
    }
    return t('donations.error.disabled', 'Donations are not available right now.');
  }

  function selectedAmountMinorUnits() {
    const preset = config?.presets.find((row: DonationAmountPreset) => row.id === selectedPresetId);
    if (preset?.is_custom_allowed) {
      const major = Number.parseFloat(customAmount.replace(',', '.'));
      if (!Number.isFinite(major) || major <= 0) return null;
      return Math.round(major * 100);
    }
    return preset?.amount_minor_units ?? null;
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!config || !providerSlug) return;
    const amountMinorUnits = selectedAmountMinorUnits();
    if (amountMinorUnits == null) {
      setSubmitState('error');
      setErrorKey('donations.error.invalid_amount');
      return;
    }
    setSubmitState('submitting');
    setErrorKey('');
    try {
      const intent = await createDonationIntent({
        journal_post_id: post.id,
        provider_slug: providerSlug,
        amount_minor_units: amountMinorUnits,
        donor_email: form.donor_email,
        currency,
        donor_display_name: form.donor_display_name,
        is_anonymous: form.is_anonymous,
        consent_to_public_thanks: form.consent_to_public_thanks,
        supporter_message: form.supporter_message,
        language_code: language,
      });

      persistPendingDonation({
        donation_id: intent.donation_id,
        journal_post_id: post.id,
        created_at: new Date().toISOString(),
      });
      setTrackedDonationId(intent.donation_id);

      if (intent.checkout_mode === 'payment_link' && config.wise_payment_link) {
        setPendingNoticeKey('donations.success.wise_transfer');
        window.open(config.wise_payment_link, '_blank', 'noopener,noreferrer');
      } else if (intent.checkout_mode === 'hosted_checkout') {
        setPendingNoticeKey('donations.checkout.hosted_pending');
      } else {
        setPendingNoticeKey('donations.success.modal.pending');
      }

      setSubmitState('pending');
    } catch (submitError) {
      const message = (submitError as Error).message;
      setErrorKey(message.startsWith('donations.error.') ? message : 'donations.error.disabled');
      setSubmitState('error');
    }
  }

  if (isI18nLoading || loadState === 'loading') {
    return (
      <section className="section journal-donations" aria-labelledby="journal-donations-title" data-i18n-ignore="true">
        <div className="impact-state">{t('donations.loading.options', 'Loading support options…')}</div>
      </section>
    );
  }

  if (loadState === 'disabled') {
    return null;
  }

  if (loadState === 'error') {
    return (
      <section className="section journal-donations" aria-labelledby="journal-donations-title" data-i18n-ignore="true">
        <div className="impact-state impact-state--error">{translateError(errorKey)}</div>
      </section>
    );
  }

  const amountMinorUnits = selectedAmountMinorUnits();
  const showCustomAmount = config?.presets.some((preset: DonationAmountPreset) => preset.id === selectedPresetId && preset.is_custom_allowed);
  const selectedProviderLabel = providerSlug
    ? t(providerLabelKey(providerSlug), PROVIDER_LABEL_FALLBACKS[providerSlug] || providerSlug)
    : '';

  const pendingFallbacks: Record<string, string> = {
    'donations.success.wise_transfer': 'Continue to Wise to complete your transfer. We will confirm once it arrives.',
    'donations.checkout.hosted_pending':
      'Card checkout will open here once payment processing is fully connected. Your support request has been saved.',
    'donations.success.modal.pending':
      'We are confirming your payment. Your thank-you message will appear here once it is complete.',
  };

  return (
    <section className="section journal-donations" aria-labelledby="journal-donations-title" data-i18n-ignore="true">
      <DonationThankYouModal
        open={showThankYouModal && !!thankYouStatus}
        amountMinorUnits={thankYouStatus?.amount_minor_units || 0}
        currency={thankYouStatus?.currency || currency}
        thanksMessageKey={thankYouStatus?.thanks_message_key}
        onClose={() => setShowThankYouModal(false)}
      />

      <div className="story-panel journal-donations__panel">
        <header className="journal-donations__header">
          <div className="journal-donations__icon-badge" aria-hidden="true">
            <Heart size={22} />
          </div>
          <div className="journal-donations__intro">
            <p className="eyebrow">{t('donations.cta.support_this_story', 'Support this story')}</p>
            <h2 id="journal-donations-title">{t('donations.cta.support_this_story', 'Support this story')}</h2>
            {typeof stats?.donation_count === 'number' && stats.donation_count > 0 ? (
              <p className="journal-donations__stats">
                <span className="journal-donations__stats-pill">
                  <Users size={14} aria-hidden="true" />
                  {t('donations.stats.supporters', '{count} supporters', { count: stats.donation_count })}
                </span>
                {typeof stats.total_amount_minor_units === 'number' && stats.total_amount_minor_units > 0 ? (
                  <span className="journal-donations__total-pill">
                    <Sparkles size={14} aria-hidden="true" />
                    {formatDonationAmount(stats.total_amount_minor_units, stats.currency || currency, language)}
                  </span>
                ) : null}
              </p>
            ) : null}
          </div>
        </header>

        {thanks.length ? (
          <div className="journal-donations__thanks">
            <div className="journal-donations__thanks-header">
              <p className="journal-donations__thanks-eyebrow">{t('donations.cta.support_this_story', 'Support this story')}</p>
              <h3>
                <MessageSquareText size={18} aria-hidden="true" />
                {t('donations.thanks.title', 'Thank you for standing with us')}
              </h3>
              <p className="journal-donations__thanks-intro">
                {t(
                  'donations.thanks.intro',
                  'A huge thank you for supporting our mission. These messages come from people who chose to share their gratitude publicly with this story.',
                )}
              </p>
            </div>
            <ul className="journal-donations__thanks-list">
              {thanks.map((entry) => (
                <li key={entry.donation_id} className="journal-donations__thanks-item">
                  <div className="journal-donations__thanks-item-head">
                    <strong>
                      {entry.display_name || t('donations.thanks.anonymous_label', 'A generous supporter')}
                    </strong>
                    {entry.completed_at ? (
                      <time dateTime={entry.completed_at}>{formatDate(entry.completed_at)}</time>
                    ) : null}
                  </div>
                  {entry.message ? <blockquote className="journal-donations__thanks-quote">{entry.message}</blockquote> : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {submitState === 'pending' ? (
          <div className="journal-donations__pending" role="status">
            <Clock3 size={22} aria-hidden="true" />
            <p>{t(pendingNoticeKey, pendingFallbacks[pendingNoticeKey] || pendingNoticeKey)}</p>
            <p className="journal-donations__pending-subcopy">
              {t('donations.success.modal.pending', pendingFallbacks['donations.success.modal.pending'])}
            </p>
          </div>
        ) : (
          <form className="journal-donations__form" onSubmit={submit}>
            <div className="journal-donations__step">
              <h3 className="journal-donations__step-title">
                <Coins size={18} aria-hidden="true" />
                {t('donations.cta.choose_amount', 'Choose an amount')}
              </h3>
              <div className="journal-donations__presets" role="group" aria-label={t('donations.cta.choose_amount', 'Choose an amount')}>
                {fixedPresets.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    className={`journal-donations__amount ${selectedPresetId === preset.id ? 'is-active' : ''}`}
                    aria-pressed={selectedPresetId === preset.id}
                    onClick={() => setSelectedPresetId(preset.id)}
                  >
                    <span className="journal-donations__amount-value">
                      {formatDonationAmount(preset.amount_minor_units, preset.currency, language)}
                    </span>
                  </button>
                ))}
                {customPreset ? (
                  <button
                    type="button"
                    className={`journal-donations__amount ${selectedPresetId === customPreset.id ? 'is-active' : ''}`}
                    aria-pressed={selectedPresetId === customPreset.id}
                    onClick={() => setSelectedPresetId(customPreset.id)}
                  >
                    <span className="journal-donations__amount-label">{t('donations.cta.custom_amount', 'Other amount')}</span>
                    <span className="journal-donations__amount-value">+</span>
                  </button>
                ) : null}
              </div>

              {showCustomAmount ? (
                <label className="journal-donations__custom-field">
                  {t('donations.cta.custom_amount', 'Other amount')}
                  <input
                    inputMode="decimal"
                    min={config ? config.min_amount_minor_units / 100 : 1}
                    max={config ? config.max_amount_minor_units / 100 : undefined}
                    value={customAmount}
                    onChange={(event) => setCustomAmount(event.target.value)}
                    placeholder={formatDonationAmount(config?.min_amount_minor_units || 100, currency, language)}
                  />
                </label>
              ) : null}
            </div>

            <div className="journal-donations__step">
              <h3 className="journal-donations__step-title">
                <Sparkles size={18} aria-hidden="true" />
                {t('donations.form.choose_provider', 'Choose payment method')}
              </h3>
              <fieldset className="journal-donations__providers">
                <legend>{t('donations.form.choose_provider', 'Choose payment method')}</legend>
                {(config?.providers || []).map((provider: DonationProvider) => (
                  <label
                    key={provider.slug}
                    className={`journal-donations__provider-card journal-donations__provider-card--${provider.slug} ${providerSlug === provider.slug ? 'is-active' : ''}`}
                  >
                    <input
                      type="radio"
                      name="donation-provider"
                      value={provider.slug}
                      checked={providerSlug === provider.slug}
                      onChange={() => setProviderSlug(provider.slug)}
                    />
                    <DonationProviderIcon slug={provider.slug} />
                    <span className="journal-donations__provider-name">
                      {t(providerLabelKey(provider.slug), PROVIDER_LABEL_FALLBACKS[provider.slug] || provider.slug)}
                    </span>
                  </label>
                ))}
              </fieldset>
            </div>

            <div className="journal-donations__step journal-donations__step--details">
              <h3 className="journal-donations__step-title">
                <UserRound size={18} aria-hidden="true" />
                {t('donations.form.your_details', 'Your details')}
              </h3>

              <div className="journal-donations__details">
                <div className="journal-donations__details-grid">
                  <label className="journal-donations__field">
                    <span className="journal-donations__field-label">{t('donations.form.email_label', 'Email address')}</span>
                    <span className="journal-donations__field-control">
                      <Mail className="journal-donations__field-icon" size={16} aria-hidden="true" />
                      <input
                        type="email"
                        required
                        autoComplete="email"
                        value={form.donor_email}
                        onChange={(event) => setForm({ ...form, donor_email: event.target.value })}
                      />
                    </span>
                  </label>

                  <label className={`journal-donations__field ${form.is_anonymous ? 'is-disabled' : ''}`}>
                    <span className="journal-donations__field-label">{t('donations.form.display_name_label', 'Display name (optional)')}</span>
                    <span className="journal-donations__field-control">
                      <UserRound className="journal-donations__field-icon" size={16} aria-hidden="true" />
                      <input
                        autoComplete="name"
                        value={form.donor_display_name}
                        onChange={(event) => setForm({ ...form, donor_display_name: event.target.value })}
                        disabled={form.is_anonymous}
                      />
                    </span>
                  </label>
                </div>

                <label className="journal-donations__field journal-donations__field--full">
                  <span className="journal-donations__field-label">{t('donations.form.message_label', 'Leave a message (optional)')}</span>
                  <span className="journal-donations__field-control journal-donations__field-control--textarea">
                    <MessageSquareText className="journal-donations__field-icon" size={16} aria-hidden="true" />
                    <textarea
                      rows={4}
                      value={form.supporter_message}
                      onChange={(event) => setForm({ ...form, supporter_message: event.target.value })}
                    />
                  </span>
                </label>

                <div className="journal-donations__privacy">
                  <p className="journal-donations__privacy-title">
                    <ShieldCheck size={16} aria-hidden="true" />
                    {t('donations.form.privacy_preferences', 'Privacy preferences')}
                  </p>

                  <div className="journal-donations__privacy-options">
                    <label className={`journal-donations__toggle ${form.is_anonymous ? 'is-active' : ''}`}>
                      <input
                        type="checkbox"
                        checked={form.is_anonymous}
                        onChange={(event) => {
                          const is_anonymous = event.target.checked;
                          setForm({
                            ...form,
                            is_anonymous,
                            consent_to_public_thanks: is_anonymous ? false : form.consent_to_public_thanks,
                          });
                        }}
                      />
                      <span className="journal-donations__toggle-indicator" aria-hidden="true" />
                      <span className="journal-donations__toggle-copy">{t('donations.form.anonymous_label', 'Keep my support anonymous')}</span>
                    </label>

                    <label
                      className={`journal-donations__toggle ${form.consent_to_public_thanks ? 'is-active' : ''} ${form.is_anonymous ? 'is-disabled' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={form.consent_to_public_thanks}
                        disabled={form.is_anonymous}
                        onChange={(event) => setForm({ ...form, consent_to_public_thanks: event.target.checked })}
                      />
                      <span className="journal-donations__toggle-indicator" aria-hidden="true" />
                      <span className="journal-donations__toggle-copy">
                        {t('donations.form.public_thanks_consent', 'You may show my name and message with this story')}
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className={`form-status ${submitState === 'error' ? 'impact-state--error' : ''}`} role="status">
              {submitState === 'submitting'
                ? t('donations.submitting', 'Starting your support…')
                : submitState === 'error'
                  ? translateError(errorKey)
                  : null}
            </div>

            <div className="journal-donations__summary">
              <div>
                <p className="journal-donations__summary-label">{t('donations.cta.continue_to_payment', 'Continue to payment')}</p>
                {selectedProviderLabel ? <p className="journal-donations__provider-name">{selectedProviderLabel}</p> : null}
              </div>
              <p className="journal-donations__summary-amount" aria-live="polite">
                {amountMinorUnits ? formatDonationAmount(amountMinorUnits, currency, language) : '—'}
              </p>
            </div>

            <button
              className="button journal-donations__submit"
              type="submit"
              disabled={submitState === 'submitting' || amountMinorUnits == null || !providerSlug}
            >
              {submitState === 'submitting' ? <LoaderCircle aria-hidden="true" size={18} className="spin" /> : <Heart aria-hidden="true" size={18} />}
              {t('donations.cta.continue_to_payment', 'Continue to payment')}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
