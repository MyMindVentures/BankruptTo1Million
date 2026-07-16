import { getAdminSession } from './adminApi';
import { parseOutreachOverviewPayload, type OutreachCategory, type OutreachChannel, type OutreachStatus } from './outreachAdminPayload';

export type OutreachOverviewRow = {
  campaign_id: string;
  first_name: string;
  last_name: string | null;
  company_name: string;
  category: OutreachCategory;
  outreach_channel: OutreachChannel | null;
  status: OutreachStatus;
  created_at: string;
  sent_at: string | null;
  last_opened_at: string | null;
  visit_count: number;
  last_response_type: string | null;
  responsible_email: string | null;
};

export type OutreachDetail = {
  contact: Record<string, unknown>;
  campaign: Record<string, unknown>;
  page: Record<string, unknown> | null;
  token: Record<string, unknown> | null;
  media: Record<string, unknown>[];
  events: Record<string, unknown>[];
  messages: Record<string, unknown>[];
  responses: Record<string, unknown>[];
};

export type OutreachUpsertPayload = {
  contact: Record<string, unknown>;
  campaign: Record<string, unknown>;
  page: Record<string, unknown>;
};

export type OutreachTokenResult = {
  token_id: string;
  raw_token: string;
  url: string;
  expires_at: string;
};

export type OutreachMessagesResult = {
  magic_link: string;
  email: { subject: string; body: string; mailto_url: string | null };
  whatsapp: { body: string; wa_me_url: string | null };
  instagram: { body: string };
  linkedin: { body: string };
};

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '');
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

function headers() {
  const token = getAdminSession()?.access_token;
  if (!supabaseUrl || !anonKey || !token) throw new Error('Geen geldige adminsessie.');
  return { apikey: anonKey, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
}

async function parse<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null) as { message?: string; details?: string; hint?: string } | T | null;
  if (!response.ok) {
    const errorPayload = payload as { message?: string; details?: string; hint?: string } | null;
    throw new Error(errorPayload?.message || errorPayload?.details || errorPayload?.hint || `Supabase request failed (${response.status})`);
  }
  return payload as T;
}

export async function getOutreachOverview(input?: { status?: OutreachStatus | null; query?: string }) {
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/admin_get_outreach_overview`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      p_status: input?.status ?? null,
      p_query: input?.query ?? null,
      p_limit: 200,
      p_offset: 0,
    }),
    cache: 'no-store',
  });
  const payload = await parse<unknown>(response);
  const overview = parseOutreachOverviewPayload(payload);
  return {
    rows: overview.rows as OutreachOverviewRow[],
    counts: overview.counts,
  };
}

export async function getOutreachDetail(campaignId: string): Promise<OutreachDetail> {
  return parse(await fetch(`${supabaseUrl}/rest/v1/rpc/admin_get_outreach_detail`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ p_campaign_id: campaignId }),
    cache: 'no-store',
  }));
}

export async function upsertOutreachCampaign(payload: OutreachUpsertPayload): Promise<OutreachDetail> {
  return parse(await fetch(`${supabaseUrl}/rest/v1/rpc/admin_upsert_outreach_campaign`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ p_payload: payload }),
    cache: 'no-store',
  }));
}

export async function generateOutreachToken(campaignId: string, maxVisits?: number | null): Promise<OutreachTokenResult> {
  return parse(await fetch(`${supabaseUrl}/rest/v1/rpc/admin_generate_outreach_token`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ p_campaign_id: campaignId, p_max_visits: maxVisits ?? null }),
    cache: 'no-store',
  }));
}

export async function revokeOutreachToken(tokenId: string): Promise<void> {
  await parse(await fetch(`${supabaseUrl}/rest/v1/rpc/admin_revoke_outreach_token`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ p_token_id: tokenId }),
    cache: 'no-store',
  }));
}

export async function regenerateOutreachToken(campaignId: string, maxVisits?: number | null): Promise<OutreachTokenResult> {
  return parse(await fetch(`${supabaseUrl}/rest/v1/rpc/admin_regenerate_outreach_token`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ p_campaign_id: campaignId, p_max_visits: maxVisits ?? null }),
    cache: 'no-store',
  }));
}

export async function recordOutreachSent(campaignId: string, channel: OutreachChannel, messageBody?: string): Promise<void> {
  await parse(await fetch(`${supabaseUrl}/rest/v1/rpc/admin_record_outreach_sent`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ p_campaign_id: campaignId, p_channel: channel, p_message_body: messageBody ?? null }),
    cache: 'no-store',
  }));
}

export async function updateOutreachStatus(campaignId: string, status: OutreachStatus): Promise<void> {
  await parse(await fetch(`${supabaseUrl}/rest/v1/rpc/admin_update_outreach_status`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ p_campaign_id: campaignId, p_status: status }),
    cache: 'no-store',
  }));
}

export async function generateOutreachMessages(campaignId: string, rawToken?: string | null): Promise<OutreachMessagesResult> {
  return parse(await fetch(`${supabaseUrl}/rest/v1/rpc/admin_generate_outreach_messages`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ p_campaign_id: campaignId, p_raw_token: rawToken ?? null }),
    cache: 'no-store',
  }));
}

export async function importOutreachFromPartnership(partnershipContactId: string): Promise<OutreachUpsertPayload> {
  return parse(await fetch(`${supabaseUrl}/rest/v1/rpc/admin_import_outreach_from_partnership`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ p_partnership_contact_id: partnershipContactId }),
    cache: 'no-store',
  }));
}

export type PartnershipContactRow = {
  id: string;
  full_name: string | null;
  organization_name: string | null;
  email: string | null;
  country: string | null;
  outreach_angle: string | null;
};

export type OutreachMediaAssetRow = {
  id: string;
  title: string | null;
  asset_type: string | null;
  storage_bucket: string | null;
  storage_path: string | null;
  external_url: string | null;
  thumbnail_url: string | null;
  status: string | null;
};

export type OutreachPageMediaItem = {
  media_asset_id: string;
  sort_order: number;
  caption: string;
  title?: string | null;
  asset_type?: string | null;
  storage_bucket?: string | null;
  storage_path?: string | null;
  external_url?: string | null;
  thumbnail_url?: string | null;
};

export async function listPartnershipContactsForOutreach(query?: string): Promise<PartnershipContactRow[]> {
  const payload = await parse<unknown>(await fetch(`${supabaseUrl}/rest/v1/rpc/admin_list_partnership_contacts_for_outreach`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ p_query: query ?? null, p_limit: 50 }),
    cache: 'no-store',
  }));
  return Array.isArray(payload) ? payload as PartnershipContactRow[] : [];
}

export async function searchMediaAssetsForOutreach(query?: string): Promise<OutreachMediaAssetRow[]> {
  const payload = await parse<unknown>(await fetch(`${supabaseUrl}/rest/v1/rpc/admin_search_media_assets_for_outreach`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ p_query: query ?? null, p_limit: 40 }),
    cache: 'no-store',
  }));
  return Array.isArray(payload) ? payload as OutreachMediaAssetRow[] : [];
}

export async function setOutreachPageMedia(pageId: string, media: OutreachPageMediaItem[]): Promise<void> {
  await parse(await fetch(`${supabaseUrl}/rest/v1/rpc/admin_set_outreach_page_media`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      p_page_id: pageId,
      p_media: media.map((item, index) => ({
        media_asset_id: item.media_asset_id,
        sort_order: item.sort_order ?? index,
        caption: item.caption ?? '',
      })),
    }),
    cache: 'no-store',
  }));
}
