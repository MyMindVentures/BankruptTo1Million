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

export type ProofOfMindDiscoveryInput = {
  concept_id: string;
  full_name: string;
  email: string;
  company: string;
  role: string;
  country: string;
  interest_message: string;
  consent_to_contact: boolean;
  website?: string;
  linkedin?: string;
  interest_type?: string;
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
    category: text(row.category) || 'Uncategorised',
    status: requiredText(row.status ?? row.concept_status, 'status'),
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
    problem: text(row.problem ?? row.problem_statement),
    solution: text(row.solution ?? row.solution_overview),
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
  const rows = await readJson<RawConcept[]>(supabase.rpc('get_proof_of_mind_concept_by_slug', {
    requested_slug: normalizedSlug,
    requested_language: null,
  }));
  const row = rows[0];
  if (!row) return null;
  const concept = normalizeDetail(row);
  return canOpenProofOfMindConcept(concept) ? concept : null;
}


export function validateProofOfMindDiscoveryInput(input: ProofOfMindDiscoveryInput) {
  if (!text(input.concept_id)) throw new Error('A selected concept is required.');
  if (!text(input.full_name)) throw new Error('Full name is required.');
  const email = text(input.email)?.toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('A valid email address is required.');
  if (!text(input.company)) throw new Error('Company or organisation is required.');
  if (!text(input.role)) throw new Error('Role is required.');
  if (!text(input.country)) throw new Error('Country or location is required.');
  if (!text(input.interest_message)) throw new Error('Please tell us why this concept interests you.');
  if (input.consent_to_contact !== true) throw new Error('Consent to be contacted is required.');
}

export async function submitProofOfMindDiscovery(input: ProofOfMindDiscoveryInput) {
  validateProofOfMindDiscoveryInput(input);
  await readJson(supabase.rpc('submit_proof_of_mind_discovery_call', {
    p_concept_id: input.concept_id,
    p_full_name: input.full_name.trim(),
    p_email: input.email.trim().toLowerCase(),
    p_company: input.company.trim(),
    p_role: input.role.trim(),
    p_country: input.country.trim(),
    p_interest_message: input.interest_message.trim(),
    p_consent_to_contact: input.consent_to_contact,
    p_website: text(input.website),
    p_linkedin: text(input.linkedin),
    p_interest_type: text(input.interest_type) || 'other',
  }));
}
