import { supabase } from './supabase';

export type MissionStatementBlock = {
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

export type MissionStatementPageData = {
  id: string;
  slug: string;
  route_path: string;
  page_name: string;
  language: string;
  blocks: MissionStatementBlock[];
};

export async function getMissionStatement(language: string): Promise<MissionStatementPageData | null> {
  const response = await supabase.rpc('get_localized_website_page', {
    p_slug: 'mission-statement',
    p_language_code: language,
  });
  if (!response.ok) throw new Error('Mission statement request failed.');
  const payload = await response.json() as MissionStatementPageData | null;
  if (!payload || !Array.isArray(payload.blocks)) return null;
  return payload;
}
