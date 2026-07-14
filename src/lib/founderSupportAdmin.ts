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

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '');
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

function headers() {
  const token = getAdminSession()?.access_token;
  if (!supabaseUrl || !anonKey || !token) throw new Error('Geen geldige adminsessie.');
  return { apikey: anonKey, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

async function parse<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null) as { message?: string } | T | null;
  if (!response.ok) throw new Error((payload as { message?: string } | null)?.message || `Supabase request failed (${response.status})`);
  return payload as T;
}

export async function listFounderSupportMessages(): Promise<FounderSupportMessage[]> {
  const select = 'id,founder_profile_id,recipient_scope,sender_name,sender_email,sender_location,sender_relationship,message_type,title,body,status,is_featured,is_anonymous,consent_to_publish,consent_to_contact,moderation_notes,moderated_at,published_at,created_at,updated_at,original_language';
  return parse(await fetch(`${supabaseUrl}/rest/v1/founder_support_messages?select=${encodeURIComponent(select)}&order=created_at.desc&limit=250`, { headers: headers() }));
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
