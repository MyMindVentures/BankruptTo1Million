import { supabase } from './supabase';

export type FounderProfile = {
  id: string;
  slug: string;
  display_name: string;
  role_title?: string;
  avatar_url?: string | null;
  headline?: string | null;
  location?: string | null;
};

export type FounderSupportMessage = {
  id: string;
  founder_profile_id?: string | null;
  recipient_scope: 'founder' | 'both' | 'mission';
  sender_name: string;
  sender_location?: string | null;
  message_type: string;
  title?: string | null;
  body: string;
  is_anonymous: boolean;
  published_at?: string | null;
  created_at: string;
};

export type FounderWin = {
  id: string;
  founder_profile_id?: string | null;
  recipient_scope: 'founder' | 'both' | 'mission';
  win_type: string;
  win_type_label?: string | null;
  title: string;
  description?: string | null;
  occurred_at: string;
  significance?: number | null;
  cover_image_url?: string | null;
};

export type FounderMissionReminder = {
  id: string;
  founder_profile_id?: string | null;
  recipient_scope: 'founder' | 'both' | 'mission';
  reminder_type: string;
  reminder_type_label?: string | null;
  title: string;
  body: string;
  source_label?: string | null;
};

export type FounderCheckIn = {
  id?: string;
  founder_profile_id: string;
  check_in_date: string;
  energy_level?: number | null;
  motivation_level?: number | null;
  stress_level?: number | null;
  mission_belief_level?: number | null;
  confidence_level?: number | null;
  mood_label?: string | null;
  biggest_win?: string | null;
  biggest_challenge?: string | null;
  support_needed?: string | null;
  private_reflection?: string | null;
  gratitude_note?: string | null;
  tomorrow_intention?: string | null;
  needs_human_support?: boolean;
  support_urgency?: 'none' | 'low' | 'medium' | 'high';
};

type TranslationRow = Record<string, string | null>;

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Supabase request failed with HTTP ${response.status}.`);
  }
  return response.json() as Promise<T>;
}

function currentLanguage(languageCode?: string) {
  if (languageCode) return languageCode;
  if (typeof window === 'undefined') return 'en';
  return window.localStorage.getItem('b1m.website.language') || document.documentElement.lang || 'en';
}

async function getTranslations(table: string, foreignKey: string, ids: string[], languageCode: string, includeEnglish = false) {
  if (!ids.length || (languageCode === 'en' && !includeEnglish)) return new Map<string, TranslationRow>();
  const encodedIds = ids.map((id) => `"${id}"`).join(',');
  const response = await supabase.from(table).request({
    query: `select=*&${foreignKey}=in.(${encodedIds})&language_code=eq.${encodeURIComponent(languageCode)}&translation_status=in.(published,reviewed,machine)`,
  });
  const rows = await readJson<TranslationRow[]>(response);
  return new Map(rows.map((row) => [String(row[foreignKey]), row]));
}

export async function getFounderProfiles(languageCode?: string) {
  const language = currentLanguage(languageCode);
  const response = await supabase.from('founder_profiles').request({
    query: 'select=id,slug,display_name,role_title,avatar_url,headline,location&is_public=eq.true&order=display_order.asc',
  });
  const rows = await readJson<FounderProfile[]>(response);
  const translations = await getTranslations('founder_profile_translations', 'founder_profile_id', rows.map((row) => row.id), language);
  return rows.map((row) => {
    const translation = translations.get(row.id);
    return {
      ...row,
      role_title: translation?.role_title || row.role_title,
      headline: translation?.headline || row.headline,
    };
  });
}

export async function getPublishedSupportMessages(limit = 12, languageCode?: string) {
  const language = currentLanguage(languageCode);
  const response = await supabase.from('founder_support_messages').request({
    query: `select=id,founder_profile_id,recipient_scope,sender_name,sender_location,message_type,title,body,is_anonymous,published_at,created_at&status=eq.approved&consent_to_publish=eq.true&order=published_at.desc.nullslast,created_at.desc&limit=${limit}`,
  });
  const rows = await readJson<FounderSupportMessage[]>(response);
  const translations = await getTranslations('founder_support_message_translations', 'support_message_id', rows.map((row) => row.id), language, true);
  return rows.map((row) => {
    const translation = translations.get(row.id);
    return { ...row, title: translation?.title || row.title, body: translation?.body || row.body };
  });
}

export async function getPublicFounderWins(limit = 12, languageCode?: string) {
  const language = currentLanguage(languageCode);
  const response = await supabase.from('founder_wins').request({
    query: `select=id,founder_profile_id,recipient_scope,win_type,title,description,occurred_at,significance,cover_image_url&is_public=eq.true&order=occurred_at.desc&limit=${limit}`,
  });
  const rows = await readJson<FounderWin[]>(response);
  const translations = await getTranslations('founder_win_translations', 'founder_win_id', rows.map((row) => row.id), language);
  return rows.map((row) => {
    const translation = translations.get(row.id);
    return {
      ...row,
      title: translation?.title || row.title,
      description: translation?.description || row.description,
      win_type_label: translation?.win_type_label || null,
    };
  });
}

export async function getPublicMissionReminders(limit = 8, languageCode?: string) {
  const language = currentLanguage(languageCode);
  const response = await supabase.from('founder_mission_reminders').request({
    query: `select=id,founder_profile_id,recipient_scope,reminder_type,title,body,source_label&is_public=eq.true&is_active=eq.true&order=display_order.asc,created_at.desc&limit=${limit}`,
  });
  const rows = await readJson<FounderMissionReminder[]>(response);
  const translations = await getTranslations('founder_mission_reminder_translations', 'reminder_id', rows.map((row) => row.id), language);
  return rows.map((row) => {
    const translation = translations.get(row.id);
    return {
      ...row,
      title: translation?.title || row.title,
      body: translation?.body || row.body,
      source_label: translation?.source_label || row.source_label,
      reminder_type_label: translation?.reminder_type_label || null,
    };
  });
}

export async function submitFounderSupportMessage(input: {
  founderProfileId?: string;
  recipientScope: 'founder' | 'both' | 'mission';
  senderName: string;
  senderEmail?: string;
  senderLocation?: string;
  messageType: string;
  title?: string;
  body: string;
  isAnonymous: boolean;
  consentToPublish: boolean;
  consentToContact: boolean;
  languageCode?: string;
}) {
  const response = await supabase.from('founder_support_messages').request({
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: {
      founder_profile_id: input.recipientScope === 'founder' ? input.founderProfileId : null,
      recipient_scope: input.recipientScope,
      sender_name: input.senderName.trim(),
      sender_email: input.senderEmail?.trim() || null,
      sender_location: input.senderLocation?.trim() || null,
      message_type: input.messageType,
      title: input.title?.trim() || null,
      body: input.body.trim(),
      original_language: currentLanguage(input.languageCode),
      status: 'pending',
      is_featured: false,
      is_anonymous: input.isAnonymous,
      consent_to_publish: input.consentToPublish,
      consent_to_contact: input.consentToContact,
    },
  });
  if (!response.ok) throw new Error(await response.text());
}

export async function addFounderSupportReaction(input: {
  founderProfileId?: string;
  recipientScope: 'founder' | 'both' | 'mission';
  reactionType: string;
  sessionKey: string;
  languageCode?: string;
}) {
  const response = await supabase.from('founder_support_reactions').request({
    method: 'POST',
    headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' },
    body: {
      founder_profile_id: input.recipientScope === 'founder' ? input.founderProfileId : null,
      recipient_scope: input.recipientScope,
      reaction_type: input.reactionType,
      session_key: input.sessionKey,
      language_code: currentLanguage(input.languageCode),
    },
  });
  if (!response.ok && response.status !== 409) throw new Error(await response.text());
}

export async function getFounderMappings(accessToken: string) {
  const response = await supabase.from('founder_profile_users').request({
    accessToken,
    query: 'select=founder_profile_id,access_role,is_active,founder_profiles(id,slug,display_name,role_title,avatar_url,headline,location)&is_active=eq.true',
  });
  return readJson<Array<{
    founder_profile_id: string;
    access_role: string;
    is_active: boolean;
    founder_profiles?: FounderProfile | FounderProfile[] | null;
  }>>(response);
}

export async function getRecentFounderCheckIns(accessToken: string, founderProfileId: string, limit = 14) {
  const response = await supabase.from('founder_check_ins').request({
    accessToken,
    query: `select=*&founder_profile_id=eq.${founderProfileId}&order=check_in_date.desc&limit=${limit}`,
  });
  return readJson<FounderCheckIn[]>(response);
}

export async function saveFounderCheckIn(accessToken: string, checkIn: FounderCheckIn) {
  const response = await supabase.from('founder_check_ins').request({
    method: 'POST',
    accessToken,
    headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
    body: checkIn,
  });
  return readJson<FounderCheckIn[]>(response);
}
