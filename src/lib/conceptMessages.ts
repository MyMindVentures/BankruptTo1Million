import { supabase } from './supabase';

export type ProofOfMindConceptMessage = {
  id: string;
  concept_id: string;
  message_type: string;
  title: string;
  excerpt: string | null;
  personal_intro: string | null;
  why_i_created_it: string | null;
  lived_experience: string | null;
  vision_for_impact: string | null;
  founder_video_title: string | null;
  founder_video_description: string | null;
  video_transcript: string | null;
  video_status: string;
  video_url: string | null;
  video_thumbnail_url: string | null;
  cta_label: string | null;
  cta_url: string | null;
};

type RawRow = Record<string, unknown>;

const supportedLanguages = new Set(['en', 'nl', 'fr', 'de', 'es', 'it', 'pt', 'pl', 'tr', 'ar', 'hi', 'zh', 'ja', 'ko', 'sv']);

function preferredLanguage() {
  if (typeof navigator === 'undefined') return 'en';
  const code = navigator.language.toLowerCase().split('-')[0];
  return supportedLanguages.has(code) ? code : 'en';
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function firstObject(value: unknown): RawRow | null {
  if (Array.isArray(value)) return value[0] && typeof value[0] === 'object' ? value[0] as RawRow : null;
  return value && typeof value === 'object' ? value as RawRow : null;
}

async function readJson<T>(responseOrPromise: Response | Promise<Response>): Promise<T> {
  const response = await responseOrPromise;
  if (!response.ok) throw new Error(await response.text());
  return response.json() as Promise<T>;
}

function publicStorageUrl(bucket: string | null, path: string | null) {
  if (!bucket || !path) return null;
  const base = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  return base ? `${base}/storage/v1/object/public/${encodeURIComponent(bucket)}/${path.split('/').map(encodeURIComponent).join('/')}` : null;
}

function normalize(row: RawRow, language: string): ProofOfMindConceptMessage {
  const post = firstObject(row.journal_posts) || {};
  const media = firstObject(row.media_assets) || {};
  const translations = Array.isArray(row.journal_concept_message_translations) ? row.journal_concept_message_translations as RawRow[] : [];
  const postTranslations = Array.isArray(post.journal_translations) ? post.journal_translations as RawRow[] : [];
  const translation = translations.find((item) => text(item.language_code) === language) || null;
  const postTranslation = postTranslations.find((item) => text(item.language_code) === language) || null;
  const localized = language === 'en' ? null : translation;
  const localizedPost = language === 'en' ? null : postTranslation;
  const externalUrl = text(media.external_url);
  const videoUrl = externalUrl || publicStorageUrl(text(media.storage_bucket), text(media.storage_path));

  return {
    id: String(row.id),
    concept_id: String(row.concept_id),
    message_type: text(row.message_type) || 'founder_message',
    title: text(localizedPost?.title) || text(post.title) || text(localized?.founder_video_title) || text(row.founder_video_title) || 'A personal message from the founder',
    excerpt: text(localizedPost?.excerpt) || text(post.excerpt),
    personal_intro: text(localized?.personal_intro) || text(row.personal_intro),
    why_i_created_it: text(localized?.why_i_created_it) || text(row.why_i_created_it),
    lived_experience: text(localized?.lived_experience) || text(row.lived_experience),
    vision_for_impact: text(localized?.vision_for_impact) || text(row.vision_for_impact),
    founder_video_title: text(localized?.founder_video_title) || text(row.founder_video_title),
    founder_video_description: text(localized?.founder_video_description) || text(row.founder_video_description),
    video_transcript: text(localized?.video_transcript) || text(row.video_transcript),
    video_status: text(row.video_status) || 'planned',
    video_url: videoUrl,
    video_thumbnail_url: text(media.thumbnail_url),
    cta_label: text(localized?.cta_label) || text(row.cta_label),
    cta_url: text(row.cta_url),
  };
}

export async function getPublishedConceptMessages() {
  const language = preferredLanguage();
  const query = `select=id,concept_id,message_type,personal_intro,why_i_created_it,lived_experience,vision_for_impact,founder_video_title,founder_video_description,video_transcript,video_status,cta_label,cta_url,journal_posts!inner(id,title,excerpt,status,published_at,journal_translations(language_code,title,excerpt,translation_status)),media_assets(id,external_url,storage_bucket,storage_path,thumbnail_url),journal_concept_message_translations(language_code,personal_intro,why_i_created_it,lived_experience,vision_for_impact,founder_video_title,founder_video_description,video_transcript,cta_label,translation_status)&order=display_order.asc,created_at.desc`;
  const rows = await readJson<RawRow[]>(supabase.from('journal_concept_messages').request({ query }));
  return rows.map((row) => normalize(row, language));
}
