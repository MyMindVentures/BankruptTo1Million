import { supabase } from './supabase';

export type ProofOfMindVisibility = 'hidden' | 'teaser' | 'full';

export type ProofOfMindConcept = {
  id: string;
  slug: string;
  category: string;
  status: string;
  title: string;
  tagline: string | null;
  short_description: string | null;
  tags: string[];
  visibility: ProofOfMindVisibility;
  is_featured: boolean;
  is_fully_openable: boolean;
};

export type ProofOfMindConceptDetail = ProofOfMindConcept & {
  problem: string | null;
  solution: string | null;
  target_audience: string | null;
  key_features: string[];
  business_model: string | null;
  external_url: string | null;
};

type RawConcept = Record<string, unknown>;

function readJson<T>(responseOrPromise: Response | Promise<Response>): Promise<T> {
  return Promise.resolve(responseOrPromise).then(async (response) => {
    if (!response.ok) throw new Error(await response.text());
    return response.json() as Promise<T>;
  });
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function requiredText(value: unknown, field: string): string {
  const normalized = text(value);
  if (!normalized) throw new Error(`Proof of Mind concept is missing ${field}.`);
  return normalized;
}

export function normalizeProofOfMindTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((tag): tag is string => typeof tag === 'string' && tag.trim().length > 0).map((tag) => tag.trim()).slice(0, 3);
}

export function normalizeProofOfMindKeyFeatures(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim());
  if (value && typeof value === 'object') return Object.values(value).filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim());
  return [];
}

export function normalizeProofOfMindUrl(value: unknown): string | null {
  const candidate = text(value);
  if (!candidate) return null;
  try {
    const url = new URL(candidate);
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

export function isVisibleProofOfMindConcept(concept: ProofOfMindConcept) {
  return concept.visibility !== 'hidden';
}

export function canOpenProofOfMindConcept(concept: ProofOfMindConcept) {
  return concept.is_fully_openable === true && concept.visibility === 'full';
}

function normalizeConcept(row: RawConcept): ProofOfMindConcept {
  const visibility = (text(row.visibility) || (row.is_fully_openable ? 'full' : 'teaser')) as ProofOfMindVisibility;
  return {
    id: requiredText(row.id, 'id'),
    slug: requiredText(row.slug, 'slug'),
    category: requiredText(row.category, 'category'),
    status: requiredText(row.status, 'status'),
    title: requiredText(row.title, 'title'),
    tagline: text(row.tagline),
    short_description: text(row.short_description),
    tags: normalizeProofOfMindTags(row.tags),
    visibility,
    is_featured: Boolean(row.is_featured),
    is_fully_openable: Boolean(row.is_fully_openable) && visibility === 'full',
  };
}

function normalizeDetail(row: RawConcept): ProofOfMindConceptDetail {
  const concept = normalizeConcept(row);
  return {
    ...concept,
    problem: text(row.problem),
    solution: text(row.solution),
    target_audience: text(row.target_audience),
    key_features: normalizeProofOfMindKeyFeatures(row.key_features),
    business_model: text(row.business_model),
    external_url: normalizeProofOfMindUrl(row.external_url),
  };
}

export async function getProofOfMindConcepts() {
  const rows = await readJson<RawConcept[]>(supabase.rpc('get_proof_of_mind_concepts', {}));
  return rows.map(normalizeConcept).filter(isVisibleProofOfMindConcept).sort((a, b) => Number(b.is_featured) - Number(a.is_featured) || a.title.localeCompare(b.title));
}

export async function getProofOfMindConceptBySlug(slug: string) {
  const normalizedSlug = text(slug);
  if (!normalizedSlug) throw new Error('A concept slug is required.');
  const rows = await readJson<RawConcept[]>(supabase.rpc('get_proof_of_mind_concept_by_slug', { p_slug: normalizedSlug }));
  const row = rows[0];
  if (!row) return null;
  const concept = normalizeDetail(row);
  return canOpenProofOfMindConcept(concept) ? concept : null;
}
