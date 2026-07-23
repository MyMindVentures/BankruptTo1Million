import { supabase } from './supabase';

export type ProofOfMindVisibility = 'hidden' | 'teaser' | 'full';
export type ConceptType = 'app' | 'platform' | 'physical_product' | 'service' | 'leisure_experience' | 'hospitality' | 'community' | 'media' | 'infrastructure' | 'marketplace' | 'hybrid' | 'other';

export type ProofOfMindFounder = { name: string; role: string | null; is_original_creator: boolean; bio: string | null; };
export type ProofOfMindFounderVideo = { title: string | null; description: string | null; caption: string | null; alt_text: string | null; url: string; poster_url: string | null; captions_url: string | null; mime_type: string | null; duration_seconds: number | null; language_code: string | null; };
export type ProofOfMindEvaluationCriterion = { criterion: string; score: number | null; assessment: string | null; risks: string[]; improvement_actions: string[]; };
export type ProofOfMindEvaluationSummary = { average_score: number | null; strongest_criteria: ProofOfMindEvaluationCriterion[]; criteria: ProofOfMindEvaluationCriterion[]; };
export type ProofOfMindCompetitorComparison = { name: string; product: string | null; similarities: string | null; differences: string | null; our_advantage: string | null; competitor_advantage: string | null; strategic_risk: string | null; };
export type ProofOfMindCompetitionSummary = { count: number; summary: string | null; competitive_advantage: string | null; comparisons: ProofOfMindCompetitorComparison[]; };
export type ProofOfMindLeadCategory = { name: string; strategic_goal: string | null; default_outreach_angle: string | null; identified_leads: number; target_slots: number; outreach_progress: string | null; };
export type ProofOfMindLeadPipelineSummary = { category_count: number; target_slots: number; identified_leads: number; categories: ProofOfMindLeadCategory[]; };
export type ProofOfMindAiFeature = { name: string; purpose: string | null; user_roles: string[]; inputs: string[]; outputs: string[]; safety: string | null; priority: string | null; };
export type ProofOfMindApiProvider = { provider: string; category: string | null; use_cases: string[]; data_received: string[]; privacy_note: string | null; integration_status: string | null; };
export type ProofOfMindFeature = { feature_key: string; feature_name: string; feature_description: string | null; user_role: string | null; priority: string | null; release_phase: string | null; display_order: number; };
export type ProofOfMindFeatureGroup = { group_key: string; group_name: string; group_description: string | null; user_role: string | null; display_order: number; features: ProofOfMindFeature[]; };
export type ProofOfMindMockupScreen = { screen_key: string; screen_name: string; screen_purpose: string | null; primary_user_role: string | null; main_components: string[]; interaction_notes: string | null; visual_direction: string | null; image_url: string | null; image_alt: string | null; image_status: string | null; display_order: number; };
export type ProofOfMindMarketProfile = Record<string, unknown> & { audience_summary?: string | null; primary_audience?: unknown[]; secondary_audience?: unknown[]; age_groups?: unknown[]; geographic_focus?: unknown[]; launch_regions?: unknown[]; supported_languages?: unknown[]; customer_types?: unknown[]; jobs_to_be_done?: unknown[]; pain_points?: unknown[]; desired_outcomes?: unknown[]; acquisition_channels?: unknown[]; partnership_channels?: unknown[]; trust_requirements?: unknown[]; };

export type ProofOfMindConcept = {
  id: string;
  slug: string;
  title: string;
  tagline: string | null;
  short_description: string | null;
  innovation_summary: string | null;
  mega_promo_text: string | null;
  concept_score: number | null;
  problems_solved: string[];
  key_features: string[];
  concept_type: ConceptType;
  concept_format: string | null;
  delivery_model: string | null;
  primary_market: string | null;
  physical_location_required: boolean | null;
  category: string;
  tags: string[];
  concept_status: string;
  visibility: ProofOfMindVisibility;
  is_featured: boolean;
  display_order: number;
  cover_image_url: string | null;
  cover_image_alt: string | null;
  original_language: string | null;
  published_at: string | null;
  updated_at: string | null;
  has_public_detail: boolean;
  founder: ProofOfMindFounder | null;
  founder_video: ProofOfMindFounderVideo | null;
  evaluation: ProofOfMindEvaluationSummary | null;
  competition: ProofOfMindCompetitionSummary;
  lead_pipeline: ProofOfMindLeadPipelineSummary | null;
  viral_hook: string | null;
  share_headline: string | null;
  share_description: string | null;
  og_image_url: string | null;
  viral_score: number | null;
  share_cta_label: string | null;
  share_cta_url: string | null;
};

export type ProofOfMindConceptDetail = ProofOfMindConcept & {
  full_description: string | null;
  vision_statement: string | null;
  problem_statement: string | null;
  solution_overview: string | null;
  target_audience: string | null;
  target_users: string[];
  key_use_cases: string[];
  differentiation_points: string[];
  market_opportunity: string | null;
  business_model_summary: string | null;
  business_model: string | null;
  validation_summary: string | null;
  validation_evidence: string[];
  roadmap_summary: string | null;
  collaboration_opportunities: string[];
  gallery_images: string[];
  demo_url: string | null;
  pitch_deck_url: string | null;
  external_url: string | null;
  detail_cta_label: string | null;
  detail_cta_url: string | null;
  ai_features: ProofOfMindAiFeature[];
  external_api_providers: ProofOfMindApiProvider[];
  feature_groups: ProofOfMindFeatureGroup[];
  mockup_screens: ProofOfMindMockupScreen[];
  market_profile: ProofOfMindMarketProfile | null;
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

type RawConcept = Record<string, unknown>;

function readJson<T>(responseOrPromise: Response | Promise<Response>): Promise<T> {
  return Promise.resolve(responseOrPromise).then(async (response) => {
    if (!response.ok) throw new Error(await response.text());
    return response.json() as Promise<T>;
  });
}

function text(value: unknown): string | null { return typeof value === 'string' && value.trim() ? value.trim() : null; }
function requiredText(value: unknown, field: string): string { const normalized = text(value); if (!normalized) throw new Error(`Proof of Mind concept is missing ${field}.`); return normalized; }
function integer(value: unknown, fallback = 0) { const parsed = typeof value === 'number' ? value : Number(value); return Number.isFinite(parsed) ? parsed : fallback; }
function score(value: unknown) { const parsed = Number(value); return Number.isFinite(parsed) ? Math.max(0, Math.min(10, parsed)) : null; }
function bool(value: unknown): boolean | null { if (typeof value === 'boolean') return value; if (value === null || value === undefined) return null; return Boolean(value); }
function arrayValue(value: unknown): unknown[] { return Array.isArray(value) ? value : value && typeof value === 'object' ? Object.values(value) : []; }
function list(value: unknown, limit?: number): string[] { const normalized = arrayValue(value).filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim()); return typeof limit === 'number' ? normalized.slice(0, limit) : normalized; }
function objectValue(value: unknown): RawConcept | null { return value && typeof value === 'object' && !Array.isArray(value) ? value as RawConcept : null; }

export function normalizeProofOfMindTags(value: unknown): string[] { return list(value, 5); }
export function normalizeProofOfMindKeyFeatures(value: unknown): string[] { return list(value); }
export function normalizeProofOfMindUrl(value: unknown): string | null { const candidate = text(value); if (!candidate) return null; try { const url = new URL(candidate); return ['http:', 'https:'].includes(url.protocol) ? url.toString() : null; } catch { return null; } }

function normalizeFounder(value: unknown): ProofOfMindFounder | null {
  const row = Array.isArray(value) ? value[0] : value;
  if (!row || typeof row !== 'object') return null;
  const data = row as RawConcept;
  const name = text(data.name ?? data.founder_name ?? data.full_name);
  return name ? { name, role: text(data.role ?? data.founder_role), is_original_creator: Boolean(data.is_original_creator), bio: text(data.bio ?? data.founder_bio) } : null;
}

function publicStorageUrl(bucket: unknown, path: unknown): string | null {
  const normalizedBucket = text(bucket);
  const normalizedPath = text(path);
  if (!normalizedBucket || !normalizedPath) return null;
  return `${supabase.url}/storage/v1/object/public/${encodeURIComponent(normalizedBucket)}/${normalizedPath.split('/').map(encodeURIComponent).join('/')}`;
}

function normalizeFounderVideo(value: unknown): ProofOfMindFounderVideo | null {
  const row = objectValue(value);
  if (!row) return null;
  const url = normalizeProofOfMindUrl(row.external_url) || publicStorageUrl(row.storage_bucket, row.storage_path);
  if (!url) return null;
  return { title: text(row.title), description: text(row.description), caption: text(row.caption), alt_text: text(row.alt_text), url, poster_url: normalizeProofOfMindUrl(row.thumbnail_url), captions_url: normalizeProofOfMindUrl(row.captions_url), mime_type: text(row.mime_type), duration_seconds: row.duration_seconds === null || row.duration_seconds === undefined ? null : integer(row.duration_seconds), language_code: text(row.language_code) };
}

function normalizeEvaluationCriterion(value: unknown): ProofOfMindEvaluationCriterion | null {
  const row = objectValue(value); if (!row) return null;
  const criterion = text(row.criterion ?? row.criteria_name ?? row.name ?? row.title); if (!criterion) return null;
  return { criterion, score: score(row.score ?? row.rating), assessment: text(row.assessment ?? row.summary), risks: list(row.risks), improvement_actions: list(row.improvement_actions ?? row.actions) };
}

function normalizeEvaluation(value: unknown, row: RawConcept): ProofOfMindEvaluationSummary | null {
  const source = objectValue(value) ?? row;
  const criteria = arrayValue(source.criteria ?? value).map(normalizeEvaluationCriterion).filter((item): item is ProofOfMindEvaluationCriterion => Boolean(item));
  const strongest = arrayValue(source.strongest_criteria).map(normalizeEvaluationCriterion).filter((item): item is ProofOfMindEvaluationCriterion => Boolean(item));
  const average = score(source.average_score ?? source.evaluation_average_score ?? row.evaluation_average_score);
  if (average === null && !criteria.length && !strongest.length) return null;
  return { average_score: average, strongest_criteria: (strongest.length ? strongest : criteria.filter((item) => item.score !== null).sort((a, b) => (b.score ?? 0) - (a.score ?? 0))).slice(0, 3), criteria };
}

function normalizeCompetition(value: unknown, row: RawConcept): ProofOfMindCompetitionSummary {
  const source = objectValue(value) ?? row;
  const comparisons = arrayValue(source.comparisons ?? row.competition_comparisons).map((item) => {
    const data = objectValue(item); if (!data) return null;
    const name = text(data.competitor_name ?? data.name ?? data.product);
    return name ? { name, product: text(data.product), similarities: text(data.similarities), differences: text(data.differences), our_advantage: text(data.our_advantage), competitor_advantage: text(data.competitor_advantage), strategic_risk: text(data.strategic_risk) } : null;
  }).filter((item): item is ProofOfMindCompetitorComparison => Boolean(item));
  return { count: integer(source.count ?? source.competitor_count ?? comparisons.length, comparisons.length), summary: text(source.summary ?? row.competition_summary), competitive_advantage: text(source.competitive_advantage ?? row.competitive_advantage ?? row.differentiation_summary), comparisons };
}

function normalizeLeadPipeline(value: unknown): ProofOfMindLeadPipelineSummary | null {
  const source = objectValue(value); if (!source) return null;
  const categories = arrayValue(source.categories).map((item) => { const data = objectValue(item); if (!data) return null; const name = text(data.category_name ?? data.name); return name ? { name, strategic_goal: text(data.strategic_goal), default_outreach_angle: text(data.default_outreach_angle), identified_leads: integer(data.identified_leads), target_slots: integer(data.target_slots, 5), outreach_progress: text(data.outreach_progress) } : null; }).filter((item): item is ProofOfMindLeadCategory => Boolean(item));
  const category_count = integer(source.category_count, categories.length);
  const target_slots = integer(source.target_slots ?? source.total_target_slots, category_count ? category_count * 5 : categories.reduce((sum, item) => sum + item.target_slots, 0));
  return !category_count && !target_slots && !categories.length ? null : { category_count, target_slots, identified_leads: integer(source.identified_leads), categories };
}

function normalizeAiFeatures(value: unknown): ProofOfMindAiFeature[] {
  return arrayValue(value).map((item) => { const row = objectValue(item); const name = row && text(row.name); return name ? { name, purpose: text(row.purpose), user_roles: list(row.user_roles), inputs: list(row.inputs), outputs: list(row.outputs), safety: text(row.safety), priority: text(row.priority) } : null; }).filter((item): item is ProofOfMindAiFeature => Boolean(item));
}

function normalizeApiProviders(value: unknown): ProofOfMindApiProvider[] {
  return arrayValue(value).map((item) => { const row = objectValue(item); const provider = row && text(row.provider); return provider ? { provider, category: text(row.category), use_cases: list(row.use_cases), data_received: list(row.data_received), privacy_note: text(row.privacy_note), integration_status: text(row.integration_status) } : null; }).filter((item): item is ProofOfMindApiProvider => Boolean(item));
}

function normalizeFeatureGroups(value: unknown): ProofOfMindFeatureGroup[] {
  return arrayValue(value).map((item) => { const row = objectValue(item); const group_name = row && text(row.group_name); const group_key = row && text(row.group_key); if (!row || !group_name || !group_key) return null; const features = arrayValue(row.features).map((feature) => { const data = objectValue(feature); const feature_key = data && text(data.feature_key); const feature_name = data && text(data.feature_name); return data && feature_key && feature_name ? { feature_key, feature_name, feature_description: text(data.feature_description), user_role: text(data.user_role), priority: text(data.priority), release_phase: text(data.release_phase), display_order: integer(data.display_order) } : null; }).filter((feature): feature is ProofOfMindFeature => Boolean(feature)); return { group_key, group_name, group_description: text(row.group_description), user_role: text(row.user_role), display_order: integer(row.display_order), features }; }).filter((item): item is ProofOfMindFeatureGroup => Boolean(item));
}

function normalizeMockupScreens(value: unknown): ProofOfMindMockupScreen[] {
  return arrayValue(value).map((item) => { const row = objectValue(item); const screen_name = row && text(row.screen_name); const screen_key = row && text(row.screen_key); return screen_name && screen_key ? { screen_key, screen_name, screen_purpose: text(row.screen_purpose), primary_user_role: text(row.primary_user_role), main_components: list(row.main_components), interaction_notes: text(row.interaction_notes), visual_direction: text(row.visual_direction), image_url: normalizeProofOfMindUrl(row.image_url), image_alt: text(row.image_alt), image_status: text(row.image_status), display_order: integer(row.display_order) } : null; }).filter((item): item is ProofOfMindMockupScreen => Boolean(item));
}

function conceptType(value: unknown): ConceptType { const candidate = text(value) || 'other'; const allowed = ['app', 'platform', 'physical_product', 'service', 'leisure_experience', 'hospitality', 'community', 'media', 'infrastructure', 'marketplace', 'hybrid', 'other']; return (allowed.includes(candidate) ? candidate : 'other') as ConceptType; }
export function isVisibleProofOfMindConcept(concept: ProofOfMindConcept) { return concept.visibility !== 'hidden'; }
export function canOpenProofOfMindConcept(concept: ProofOfMindConcept) { return concept.has_public_detail === true && concept.visibility === 'full'; }

function normalizeConcept(row: RawConcept): ProofOfMindConcept {
  const visibility = (text(row.visibility) || 'teaser') as ProofOfMindVisibility;
  return {
    id: requiredText(row.id, 'id'), slug: requiredText(row.slug, 'slug'), title: requiredText(row.title, 'title'), tagline: text(row.tagline), short_description: text(row.short_description), innovation_summary: text(row.innovation_summary), mega_promo_text: text(row.mega_promo_text), concept_score: score(row.concept_score),
    problems_solved: list(row.problems_solved, 3), key_features: normalizeProofOfMindKeyFeatures(row.key_features).slice(0, 5), concept_type: conceptType(row.concept_type), concept_format: text(row.concept_format), delivery_model: text(row.delivery_model), primary_market: text(row.primary_market), physical_location_required: bool(row.physical_location_required),
    category: text(row.category) || 'Uncategorised', tags: normalizeProofOfMindTags(row.tags), concept_status: requiredText(row.concept_status ?? row.status, 'concept_status'), visibility, is_featured: Boolean(row.is_featured), display_order: integer(row.display_order, 999), cover_image_url: normalizeProofOfMindUrl(row.cover_image_url), cover_image_alt: text(row.cover_image_alt), original_language: text(row.original_language), published_at: text(row.published_at), updated_at: text(row.updated_at), has_public_detail: visibility === 'full',
    founder: normalizeFounder(row.founder ?? row.founders ?? row.proof_of_mind_concept_founders), founder_video: normalizeFounderVideo(row.founder_video), evaluation: normalizeEvaluation(row.evaluation ?? row.evaluation_summary, row), competition: normalizeCompetition(row.competition ?? row.competition_summary_data, row), lead_pipeline: normalizeLeadPipeline(row.lead_pipeline ?? row.lead_pipeline_summary),
    viral_hook: text(row.viral_hook), share_headline: text(row.share_headline), share_description: text(row.share_description), og_image_url: normalizeProofOfMindUrl(row.og_image_url), viral_score: score(row.viral_score), share_cta_label: text(row.share_cta_label), share_cta_url: text(row.share_cta_url),
  };
}

function normalizeDetail(row: RawConcept): ProofOfMindConceptDetail {
  return { ...normalizeConcept(row), full_description: text(row.full_description), vision_statement: text(row.vision_statement), problem_statement: text(row.problem_statement), solution_overview: text(row.solution_overview), target_audience: text(row.target_audience), target_users: list(row.target_users), key_use_cases: list(row.key_use_cases), differentiation_points: list(row.differentiation_points), market_opportunity: text(row.market_opportunity), business_model_summary: text(row.business_model_summary), business_model: text(row.business_model), validation_summary: text(row.validation_summary), validation_evidence: list(row.validation_evidence), roadmap_summary: text(row.roadmap_summary), collaboration_opportunities: list(row.collaboration_opportunities), gallery_images: list(row.gallery_images).map(normalizeProofOfMindUrl).filter((url): url is string => Boolean(url)), demo_url: normalizeProofOfMindUrl(row.demo_url), pitch_deck_url: normalizeProofOfMindUrl(row.pitch_deck_url), external_url: normalizeProofOfMindUrl(row.external_url), detail_cta_label: text(row.detail_cta_label), detail_cta_url: normalizeProofOfMindUrl(row.detail_cta_url), ai_features: normalizeAiFeatures(row.ai_features), external_api_providers: normalizeApiProviders(row.external_api_providers), feature_groups: normalizeFeatureGroups(row.feature_groups), mockup_screens: normalizeMockupScreens(row.mockup_screens), market_profile: objectValue(row.market_profile) as ProofOfMindMarketProfile | null };
}

function mergeEnrichment(rows: RawConcept[], enrichment: RawConcept[]) {
  const byId = new Map(enrichment.map((row) => [text(row.concept_id), row]));
  return rows.map((row) => ({ ...row, ...(byId.get(text(row.id)) || {}) }));
}

export async function getProofOfMindConcepts() {
  const query = 'select=id,slug,title,tagline,short_description,innovation_summary,mega_promo_text,concept_score,evaluation_average_score,problems_solved,key_features,concept_type,concept_format,delivery_model,primary_market,physical_location_required,category,tags,concept_status,visibility,is_featured,display_order,cover_image_url,cover_image_alt,original_language,published_at,updated_at,competition_summary,competition_comparisons,competitive_advantage,founder,founders,evaluation_summary,competition_summary_data,lead_pipeline_summary,founder_video&order=display_order.asc,updated_at.desc';
  const [rows, enrichment] = await Promise.all([
    readJson<RawConcept[]>(supabase.from('proof_of_mind_public_teasers').request({ query })),
    readJson<RawConcept[]>(supabase.from('proof_of_mind_public_enrichment').request({ query: 'select=concept_id,viral_hook,share_headline,share_description,og_image_url,viral_score,share_cta_label,share_cta_url' })),
  ]);
  return mergeEnrichment(rows, enrichment).map(normalizeConcept).filter(isVisibleProofOfMindConcept);
}

export async function getProofOfMindConceptBySlug(slug: string) {
  const normalizedSlug = text(slug); if (!normalizedSlug) throw new Error('A concept slug is required.');
  const rows = await readJson<RawConcept[]>(supabase.from('proof_of_mind_public_details').request({ query: `slug=eq.${encodeURIComponent(normalizedSlug)}&visibility=eq.full&limit=1` }));
  const row = rows[0]; if (!row) return null;
  const enrichment = await readJson<RawConcept[]>(supabase.from('proof_of_mind_public_enrichment').request({ query: `concept_id=eq.${encodeURIComponent(requiredText(row.id, 'id'))}&limit=1` }));
  const concept = normalizeDetail({ ...row, ...(enrichment[0] || {}) });
  return canOpenProofOfMindConcept(concept) ? concept : null;
}

export async function trackProofOfMindEvent(conceptId: string, eventType: string, metadata: Record<string, unknown> = {}) {
  try {
    await readJson(supabase.from('proof_of_mind_engagement_events').request({ method: 'POST', body: { concept_id: conceptId, event_type: eventType, platform: metadata.platform || null, referrer: typeof document !== 'undefined' ? document.referrer || null : null, language_code: typeof navigator !== 'undefined' ? navigator.language : null, metadata }, headers: { Prefer: 'return=minimal' } }));
  } catch { /* Analytics must never block the public experience. */ }
}

export function validateProofOfMindDiscoveryInput(input: ProofOfMindDiscoveryInput) {
  if (!text(input.concept_id)) throw new Error('A selected concept is required.');
  if (!text(input.full_name)) throw new Error('Full name is required.');
  const email = text(input.email)?.toLowerCase(); if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('A valid email address is required.');
  if (!text(input.company)) throw new Error('Company or organisation is required.');
  if (!text(input.role)) throw new Error('Role is required.');
  if (!text(input.country)) throw new Error('Country or location is required.');
  if (!text(input.interest_message)) throw new Error('Please tell us why this concept interests you.');
  if (input.consent_to_contact !== true) throw new Error('Consent to be contacted is required.');
}

export async function submitProofOfMindDiscovery(input: ProofOfMindDiscoveryInput) {
  validateProofOfMindDiscoveryInput(input);
  await readJson(supabase.rpc('submit_proof_of_mind_discovery_call', { p_concept_id: input.concept_id, p_full_name: input.full_name.trim(), p_email: input.email.trim().toLowerCase(), p_company: input.company.trim(), p_role: input.role.trim(), p_country: input.country.trim(), p_interest_message: input.interest_message.trim(), p_consent_to_contact: input.consent_to_contact, p_website: text(input.website), p_linkedin: text(input.linkedin), p_interest_type: text(input.interest_type) || 'other' }));
  void trackProofOfMindEvent(input.concept_id, 'lead_submit', { interest_type: input.interest_type || 'other' });
}
