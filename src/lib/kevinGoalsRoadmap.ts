import { supabase } from './supabase';

export type KevinGoalsRoadmapBlock = {
  id: string;
  block_key: string;
  block_type: string;
  display_order: number;
  eyebrow?: string | null;
  title?: string | null;
  subtitle?: string | null;
  body?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
};

export type KevinGoalsRoadmapData = {
  id: string;
  slug: string;
  route_path: string;
  page_name: string;
  language: string;
  blocks: KevinGoalsRoadmapBlock[];
};

export async function getKevinGoalsRoadmap(language: string): Promise<KevinGoalsRoadmapData | null> {
  const response = await supabase.rpc('get_localized_website_page', {
    p_slug: 'kevin-goals-roadmap',
    p_language_code: language,
  });
  if (!response.ok) throw new Error('Kevin goals roadmap request failed.');
  const payload = await response.json() as KevinGoalsRoadmapData | null;
  if (!payload || !Array.isArray(payload.blocks)) return null;
  return payload;
}
