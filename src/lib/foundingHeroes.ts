import { supabase } from './supabase';

export type FoundingHeroRow = {
  id: string;
  display_name?: string | null;
  role_title?: string | null;
  short_bio?: string | null;
  location?: string | null;
  avatar_url?: string | null;
  website_url?: string | null;
  github_url?: string | null;
  linkedin_url?: string | null;
  support_message?: string | null;
  recognition_level?: string | null;
  is_anonymous?: boolean | null;
  featured?: boolean | null;
  joined_at?: string | null;
  created_at?: string | null;
};

export type PublicFoundingHero = Required<Pick<FoundingHeroRow, 'id'>> & {
  displayName: string;
  roleTitle: string;
  shortBio: string;
  location: string;
  avatarUrl: string;
  websiteUrl: string;
  githubUrl: string;
  linkedinUrl: string;
  supportMessage: string;
  recognitionLevel: string;
  isAnonymous: boolean;
  featured: boolean;
  joinedAt: string;
};

export const FOUNDING_HERO_PUBLIC_SELECT = [
  'id',
  'display_name',
  'role_title',
  'short_bio',
  'location',
  'avatar_url',
  'website_url',
  'github_url',
  'linkedin_url',
  'support_message',
  'recognition_level',
  'is_anonymous',
  'featured',
  'joined_at',
  'created_at',
].join(',');

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function safePublicUrl(value: unknown): string {
  const raw = text(value);
  if (!raw) return '';
  try {
    const url = new URL(raw);
    return ['https:', 'http:'].includes(url.protocol) ? url.toString() : '';
  } catch {
    return '';
  }
}

export function mapFoundingHero(row: FoundingHeroRow): PublicFoundingHero {
  const isAnonymous = row.is_anonymous === true;
  return {
    id: String(row.id),
    displayName: isAnonymous ? 'Anonymous Founding Hero' : text(row.display_name),
    roleTitle: text(row.role_title) || 'Founding contributor',
    shortBio: text(row.short_bio),
    location: isAnonymous ? '' : text(row.location),
    avatarUrl: isAnonymous ? '' : safePublicUrl(row.avatar_url),
    websiteUrl: isAnonymous ? '' : safePublicUrl(row.website_url),
    githubUrl: isAnonymous ? '' : safePublicUrl(row.github_url),
    linkedinUrl: isAnonymous ? '' : safePublicUrl(row.linkedin_url),
    supportMessage: text(row.support_message),
    recognitionLevel: text(row.recognition_level),
    isAnonymous,
    featured: row.featured === true,
    joinedAt: text(row.joined_at),
  };
}

export async function getPublishedFoundingHeroes(): Promise<PublicFoundingHero[]> {
  const query = new URLSearchParams({
    select: FOUNDING_HERO_PUBLIC_SELECT,
    is_published: 'eq.true',
    order: 'featured.desc.nullslast,joined_at.desc.nullslast,created_at.desc.nullslast',
  }).toString();
  const response = await supabase.from('founding_heroes').request({ query });
  if (!response.ok) throw new Error('The Founding Heroes wall is temporarily unavailable. Please try again shortly.');
  const rows = await response.json() as FoundingHeroRow[];
  return rows.map(mapFoundingHero);
}
