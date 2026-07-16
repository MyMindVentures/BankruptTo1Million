import { supabase } from './supabase';

export type OutreachPublicMedia = {
  storage_bucket: string | null;
  storage_path: string | null;
  external_url: string | null;
  asset_type: string | null;
  caption: string | null;
  sort_order: number;
};

export type OutreachPublicPage = {
  contact: {
    first_name: string;
    last_name: string | null;
    company_name: string;
    website: string | null;
    instagram: string | null;
    linkedin: string | null;
  };
  page: {
    personal_intro: string | null;
    why_them: string | null;
    what_we_offer: string | null;
    what_we_ask: string | null;
    win_win: string | null;
    personal_message: string | null;
    mission_blurb: string | null;
    meeting_url: string | null;
    whatsapp_url: string | null;
  };
  media: OutreachPublicMedia[];
  founder_video: {
    storage_bucket: string | null;
    storage_path: string | null;
    external_url: string | null;
    asset_type: string | null;
    poster_url: string | null;
  } | null;
  language_code: string;
  campaign_id: string;
};

export type OutreachResponseType = 'yes_meet' | 'interested' | 'tell_more' | 'not_now' | 'form_message' | 'meeting_request';

const SESSION_KEY = 'b1m.outreach.session';

export function outreachSessionKey(): string {
  try {
    const existing = localStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const created = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, created);
    return created;
  } catch {
    return crypto.randomUUID();
  }
}

export function outreachStoragePublicUrl(bucket: string | null, path: string | null): string {
  if (!bucket || !path) return '';
  const encodedPath = path.split('/').map(encodeURIComponent).join('/');
  return `${supabase.url}/storage/v1/object/public/${encodeURIComponent(bucket)}/${encodedPath}`;
}

function parseOutreachError(message: string): string {
  if (message.includes('outreach_expired')) return 'outreach_expired';
  if (message.includes('outreach_revoked')) return 'outreach_revoked';
  if (message.includes('outreach_max_visits_reached')) return 'outreach_max_visits_reached';
  if (message.includes('outreach_invalid_link')) return 'outreach_invalid_link';
  return 'outreach_load_failed';
}

function parsePagePayload(payload: unknown): OutreachPublicPage {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('outreach_load_failed');
  }
  const record = payload as Record<string, unknown>;
  const contact = record.contact;
  const page = record.page;
  if (!contact || typeof contact !== 'object' || !page || typeof page !== 'object') {
    throw new Error('outreach_load_failed');
  }
  const contactRecord = contact as Record<string, unknown>;
  const pageRecord = page as Record<string, unknown>;
  if (!contactRecord.first_name || !contactRecord.company_name || !record.language_code || !record.campaign_id) {
    throw new Error('outreach_load_failed');
  }

  const media = Array.isArray(record.media)
    ? record.media.map((item) => {
      if (!item || typeof item !== 'object') throw new Error('outreach_load_failed');
      const mediaItem = item as Record<string, unknown>;
      return {
        storage_bucket: typeof mediaItem.storage_bucket === 'string' ? mediaItem.storage_bucket : null,
        storage_path: typeof mediaItem.storage_path === 'string' ? mediaItem.storage_path : null,
        external_url: typeof mediaItem.external_url === 'string' ? mediaItem.external_url : null,
        asset_type: typeof mediaItem.asset_type === 'string' ? mediaItem.asset_type : null,
        caption: typeof mediaItem.caption === 'string' ? mediaItem.caption : null,
        sort_order: Number(mediaItem.sort_order) || 0,
      };
    })
    : [];

  const founder = record.founder_video;
  const founderVideo = founder && typeof founder === 'object' && !Array.isArray(founder)
    ? {
      storage_bucket: typeof (founder as Record<string, unknown>).storage_bucket === 'string' ? (founder as Record<string, unknown>).storage_bucket as string : null,
      storage_path: typeof (founder as Record<string, unknown>).storage_path === 'string' ? (founder as Record<string, unknown>).storage_path as string : null,
      external_url: typeof (founder as Record<string, unknown>).external_url === 'string' ? (founder as Record<string, unknown>).external_url as string : null,
      asset_type: typeof (founder as Record<string, unknown>).asset_type === 'string' ? (founder as Record<string, unknown>).asset_type as string : null,
      poster_url: typeof (founder as Record<string, unknown>).poster_url === 'string' ? (founder as Record<string, unknown>).poster_url as string : null,
    }
    : null;

  return {
    contact: {
      first_name: String(contactRecord.first_name),
      last_name: typeof contactRecord.last_name === 'string' ? contactRecord.last_name : null,
      company_name: String(contactRecord.company_name),
      website: typeof contactRecord.website === 'string' ? contactRecord.website : null,
      instagram: typeof contactRecord.instagram === 'string' ? contactRecord.instagram : null,
      linkedin: typeof contactRecord.linkedin === 'string' ? contactRecord.linkedin : null,
    },
    page: {
      personal_intro: typeof pageRecord.personal_intro === 'string' ? pageRecord.personal_intro : null,
      why_them: typeof pageRecord.why_them === 'string' ? pageRecord.why_them : null,
      what_we_offer: typeof pageRecord.what_we_offer === 'string' ? pageRecord.what_we_offer : null,
      what_we_ask: typeof pageRecord.what_we_ask === 'string' ? pageRecord.what_we_ask : null,
      win_win: typeof pageRecord.win_win === 'string' ? pageRecord.win_win : null,
      personal_message: typeof pageRecord.personal_message === 'string' ? pageRecord.personal_message : null,
      mission_blurb: typeof pageRecord.mission_blurb === 'string' ? pageRecord.mission_blurb : null,
      meeting_url: typeof pageRecord.meeting_url === 'string' ? pageRecord.meeting_url : null,
      whatsapp_url: typeof pageRecord.whatsapp_url === 'string' ? pageRecord.whatsapp_url : null,
    },
    media,
    founder_video: founderVideo,
    language_code: String(record.language_code),
    campaign_id: String(record.campaign_id),
  };
}

export async function getOutreachPage(slug: string, token: string): Promise<OutreachPublicPage> {
  const response = await supabase.rpc('get_outreach_page_public', {
    p_slug: slug,
    p_raw_token: token,
    p_session_key: outreachSessionKey(),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(parseOutreachError(text));
  }
  const payload = await response.json();
  return parsePagePayload(payload);
}

export async function submitOutreachResponse(
  slug: string,
  token: string,
  responseType: OutreachResponseType,
  payload: Record<string, string> = {},
): Promise<{ ok: boolean; status: string }> {
  const response = await supabase.rpc('submit_outreach_response', {
    p_slug: slug,
    p_raw_token: token,
    p_response_type: responseType,
    p_payload: payload,
    p_session_key: outreachSessionKey(),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(parseOutreachError(text));
  }
  const result = await response.json() as { ok?: boolean; status?: string };
  if (!result.ok) throw new Error('outreach_load_failed');
  return { ok: true, status: result.status || 'opened' };
}

export async function recordOutreachEngagement(
  slug: string,
  token: string,
  eventType: 'video_played' | 'cta_clicked',
  metadata: Record<string, unknown> = {},
): Promise<void> {
  await supabase.rpc('record_outreach_engagement', {
    p_slug: slug,
    p_raw_token: token,
    p_event_type: eventType,
    p_metadata: metadata,
    p_session_key: outreachSessionKey(),
  }).catch(() => undefined);
}
