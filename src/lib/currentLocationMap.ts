import type { PremiumJourneyPoint } from '../components/PremiumJourneyMap';
import { supabase } from './supabase';

async function readJson<T>(responseOrPromise: Response | Promise<Response>): Promise<T> {
  const response = await responseOrPromise;
  if (!response.ok) throw new Error(await response.text());
  return response.json() as Promise<T>;
}

/**
 * Live journal map pins flagged as current location (Kevin / Micha).
 * Source: public_journal_map_points — same feed as the journal map.
 */
export async function getCurrentLocationMapPoints(): Promise<PremiumJourneyPoint[]> {
  return readJson<PremiumJourneyPoint[]>(
    supabase.from('public_journal_map_points').request({
      query: 'select=*&is_current_location=eq.true&order=occurred_at.desc,journey_entry_id.asc',
    }),
  );
}
