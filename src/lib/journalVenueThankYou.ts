import { supabase } from './supabase';

export type JournalVenueThankYou = {
  message: string;
  venue_title: string | null;
  active_language: string;
};

export async function getJournalVenueThankYou(
  slug: string,
  language: string,
): Promise<JournalVenueThankYou | null> {
  const response = await supabase.rpc('get_localized_journal_venue_thank_you', {
    p_slug: slug,
    p_language_code: language,
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Could not load journal venue thank-you message.');
  }
  const payload = await response.json();
  if (!payload || typeof payload !== 'object') return null;
  const record = payload as Partial<JournalVenueThankYou>;
  if (!record.message?.trim()) return null;
  return {
    message: record.message.trim(),
    venue_title: record.venue_title?.trim() || null,
    active_language: record.active_language || language,
  };
}
