import { supabase } from './supabase';

export type DonationCheckoutMode = 'hosted_checkout' | 'payment_link' | 'manual_instructions';

export type DonationProvider = {
  slug: string;
  checkout_mode: DonationCheckoutMode;
  display_order: number;
  config: Record<string, unknown>;
};

export type DonationAmountPreset = {
  id: string;
  amount_minor_units: number;
  currency: string;
  display_order: number;
  is_custom_allowed: boolean;
};

export type DonationPublicConfig = {
  enabled: boolean;
  default_currency: string;
  min_amount_minor_units: number;
  max_amount_minor_units: number;
  wise_payment_link: string | null;
  providers: DonationProvider[];
  presets: DonationAmountPreset[];
};

export type DonationPublicStats = {
  enabled: boolean;
  donation_count?: number;
  total_amount_minor_units?: number;
  currency?: string;
};

export type DonationSupporterThanks = {
  donation_id: string;
  display_name: string | null;
  message: string | null;
  completed_at: string | null;
};

export type DonationIntentResult = {
  donation_id: string;
  provider_slug: string;
  checkout_mode: DonationCheckoutMode;
  status: string;
  amount_minor_units: number;
  currency: string;
};

export type DonationPublicStatus = {
  donation_id: string;
  status: string;
  amount_minor_units: number;
  currency: string;
  provider_slug: string;
  journal_post_id: string;
  completed_at: string | null;
  thanks_message_key: string | null;
};

export type PublicDonationLedgerEntry = {
  donation_id: string;
  amount_minor_units: number;
  currency: string;
  display_name: string | null;
  completed_at: string | null;
};

export type PublicDonationLedger = {
  enabled: boolean;
  donation_count?: number;
  total_amount_minor_units?: number;
  currency?: string;
  entries?: PublicDonationLedgerEntry[];
};

export type PendingDonationRef = {
  donation_id: string;
  journal_post_id: string;
  created_at: string;
};

export type CreateDonationIntentInput = {
  journal_post_id: string;
  provider_slug: string;
  amount_minor_units: number;
  donor_email: string;
  currency?: string;
  donor_display_name?: string;
  is_anonymous?: boolean;
  consent_to_public_thanks?: boolean;
  supporter_message?: string;
  language_code: string;
  session_key?: string;
};

const DONATION_ERROR_KEYS = new Set([
  'donations.error.disabled',
  'donations.error.invalid_amount',
  'donations.error.invalid_post',
  'donations.error.invalid_provider',
  'donations.error.invalid_email',
  'donations.error.invalid_language',
  'donations.error.not_found',
]);

const SESSION_KEY_STORAGE = 'b1m.journal-donations.session';
const PENDING_DONATION_STORAGE = 'b1m.journal-donations.pending';

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const text = await response.text();
    throw new Error(parseDonationRpcError(text));
  }
  return response.json() as Promise<T>;
}

export function parseDonationRpcError(raw: string): string {
  try {
    const payload = JSON.parse(raw) as { message?: string; error?: string };
    const message = payload.message || payload.error || raw;
    for (const key of DONATION_ERROR_KEYS) {
      if (message.includes(key)) return key;
    }
    return message;
  } catch {
    for (const key of DONATION_ERROR_KEYS) {
      if (raw.includes(key)) return key;
    }
    return raw;
  }
}

export function donationSessionKey() {
  const existing = localStorage.getItem(SESSION_KEY_STORAGE);
  if (existing) return existing;
  const value = crypto.randomUUID();
  localStorage.setItem(SESSION_KEY_STORAGE, value);
  return value;
}

export function readPendingDonation(): PendingDonationRef | null {
  try {
    const raw = sessionStorage.getItem(PENDING_DONATION_STORAGE);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingDonationRef;
    if (!parsed?.donation_id || !parsed?.journal_post_id) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function persistPendingDonation(ref: PendingDonationRef) {
  sessionStorage.setItem(PENDING_DONATION_STORAGE, JSON.stringify(ref));
}

export function clearPendingDonation() {
  sessionStorage.removeItem(PENDING_DONATION_STORAGE);
}

export function readDonationIdFromUrl(search = window.location.search) {
  const params = new URLSearchParams(search);
  const donationId = params.get('donation');
  return donationId && /^[0-9a-f-]{36}$/i.test(donationId) ? donationId : null;
}

export function stripDonationQueryParam() {
  const params = new URLSearchParams(window.location.search);
  if (!params.has('donation')) return;
  params.delete('donation');
  const next = `${window.location.pathname}${params.toString() ? `?${params}` : ''}${window.location.hash}`;
  window.history.replaceState(null, '', next);
}

export function formatDonationAmount(amountMinorUnits: number, currency: string, locale: string) {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amountMinorUnits / 100);
}

export async function getDonationPublicConfig(language: string): Promise<DonationPublicConfig> {
  return readJson<DonationPublicConfig>(await supabase.rpc('get_donation_public_config', { p_language: language }));
}

export async function getJournalDonationPublicStats(journalPostId: string): Promise<DonationPublicStats> {
  return readJson<DonationPublicStats>(
    await supabase.rpc('get_journal_donation_public_stats', { p_journal_post_id: journalPostId }),
  );
}

export async function getJournalDonationSupporterThanks(
  journalPostId: string,
  language: string,
): Promise<DonationSupporterThanks[]> {
  const rows = await readJson<DonationSupporterThanks[]>(
    await supabase.rpc('get_journal_donation_supporter_thanks', {
      p_journal_post_id: journalPostId,
      p_language: language,
    }),
  );
  return Array.isArray(rows) ? rows : [];
}

export async function getPublicDonationLedger(language: string): Promise<PublicDonationLedger> {
  return readJson<PublicDonationLedger>(
    await supabase.rpc('get_public_donation_ledger', { p_language: language }),
  );
}

export async function getDonationPublicStatus(
  donationId: string,
  sessionKey = donationSessionKey(),
): Promise<DonationPublicStatus> {
  return readJson<DonationPublicStatus>(
    await supabase.rpc('get_donation_public_status', {
      p_donation_id: donationId,
      p_session_key: sessionKey,
    }),
  );
}

export async function createDonationIntent(input: CreateDonationIntentInput): Promise<DonationIntentResult> {
  return readJson<DonationIntentResult>(
    await supabase.rpc('create_donation_intent', {
      p_journal_post_id: input.journal_post_id,
      p_provider_slug: input.provider_slug,
      p_amount_minor_units: input.amount_minor_units,
      p_donor_email: input.donor_email.trim().toLowerCase(),
      p_currency: input.currency || null,
      p_donor_display_name: input.donor_display_name?.trim() || null,
      p_is_anonymous: input.is_anonymous ?? false,
      p_consent_to_public_thanks: input.consent_to_public_thanks ?? false,
      p_supporter_message: input.supporter_message?.trim() || null,
      p_language_code: input.language_code,
      p_session_key: input.session_key || donationSessionKey(),
    }),
  );
}
