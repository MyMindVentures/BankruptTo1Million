import { getAdminSession } from './adminApi';

export type FounderSupportMessage = {
  id: string;
  founder_profile_id: string | null;
  recipient_scope: string;
  sender_name: string;
  sender_email: string | null;
  sender_location: string | null;
  sender_relationship: string | null;
  message_type: string;
  title: string | null;
  body: string;
  status: 'pending' | 'approved' | 'rejected' | 'spam';
  is_featured: boolean;
  is_anonymous: boolean;
  consent_to_publish: boolean;
  consent_to_contact: boolean;
  moderation_notes: string | null;
  moderated_at: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  original_language: string | null;
};

export type FounderSupportCounts = Record<FounderSupportMessage['status'], number> & { total: number };
export type FounderSupportInbox = { messages: FounderSupportMessage[]; counts: FounderSupportCounts };

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

function normalizeStatus(value: unknown): FounderSupportMessage['status'] | null {
  const status = String(value ?? '').trim().toLowerCase();
  return status === 'pending' || status === 'approved' || status === 'rejected' || status === 'spam' ? status : null;
}

function deriveCounts(messages: FounderSupportMessage[]): FounderSupportCounts {
  const counts: FounderSupportCounts = { pending: 0, approved: 0, rejected: 0, spam: 0, total: messages.length };
  for (const message of messages) {
    const status = normalizeStatus(message.status);
    if (status) counts[status] += 1;
  }
  return counts;
}

export async function getFounderSupportInbox(): Promise<FounderSupportInbox> {
  const payload = await parse<{ messages: FounderSupportMessage[]; counts?: Record<string, unknown> }>(await fetch(`${supabaseUrl}/rest/v1/rpc/admin_get_founder_support_inbox`, {
    method: 'POST', headers: headers(), body: '{}', cache: 'no-store',
  }));

  if (!payload || !Array.isArray(payload.messages)) {
    throw new Error('Support inbox returned an invalid payload.');
  }

  const messages = payload.messages.map((message) => {
    const normalizedStatus = normalizeStatus(message.status);
    return normalizedStatus ? { ...message, status: normalizedStatus } : message;
  });

  return { messages, counts: deriveCounts(messages) };
}

export async function moderateFounderSupportMessage(input: {
  id: string;
  status: FounderSupportMessage['status'];
  isFeatured: boolean;
  moderationNotes: string;
}): Promise<FounderSupportMessage> {
  return parse(await fetch(`${supabaseUrl}/rest/v1/rpc/admin_moderate_founder_support_message`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      p_message_id: input.id,
      p_status: input.status,
      p_is_featured: input.isFeatured,
      p_moderation_notes: input.moderationNotes || null,
    }),
  }));
}
