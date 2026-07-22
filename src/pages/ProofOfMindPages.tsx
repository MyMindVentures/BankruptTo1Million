import { ArrowRight, Box, Brain, Building2, CalendarDays, CheckCircle, ChevronDown, ChevronUp, Database, ExternalLink, Factory, Film, Handshake, Hotel, Image as ImageIcon, Lightbulb, LockKeyhole, Map, Package, RefreshCw, Search, Share2, ShieldCheck, Sparkles, Store, Target, Users, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { SectionHeading } from '../components/SectionHeading';
import { useWebsiteI18n } from '../lib/websiteI18n';
import { canOpenProofOfMindConcept, getProofOfMindConceptBySlug, getProofOfMindConcepts, normalizeProofOfMindUrl, submitProofOfMindDiscovery, trackProofOfMindEvent, validateProofOfMindDiscoveryInput } from '../lib/proofOfMind';
import type { ProofOfMindConcept, ProofOfMindConceptDetail } from '../lib/proofOfMind';
import '../styles/proofOfMind.css';
import '../styles/proofOfMindExpandableCards.css';

function ProofOfMindErrorState({ onRetry }: { onRetry: () => void }) {
  const { t } = useWebsiteI18n();
  return <div className="impact-state impact-state--error" role="alert"><div><strong>{t('proof_of_mind.error.title', 'Proof of Mind could not be loaded.')}</strong><br />{t('proof_of_mind.error.description', 'The public archive request failed.')}</div><button className="button button--small" type="button" onClick={onRetry}><RefreshCw size={16} aria-hidden="true" /> {t('proof_of_mind.error.retry', 'Try again')}</button></div>;
}

function ProofOfMindEmptyState() {
  const { t } = useWebsiteI18n();
  return <div className="impact-state"><strong>{t('proof_of_mind.empty.title', 'The archive is being prepared.')}</strong><br />{t('proof_of_mind.empty.description', 'The first public concepts will appear here soon.')}</div>;
}

function setProofMeta(title: string, description?: string | null, image?: string | null) {
  document.title = title;
  const upsert = (name: string, content: string, property = false) => {
    let el = document.head.querySelector(property ? `meta[property="${name}"]` : `meta[name="${name}"]`) as HTMLMetaElement | null;
    if (!el) { el = document.createElement('meta'); el.setAttribute(property ? 'property' : 'name', name); document.head.appendChild(el); }
    el.content = content;
  };
  const summary = description || 'A public Proof of Mind venture concept from Bankrupt to 1 Million.';
  upsert('description', summary);
  upsert('og:title', title, true);
  upsert('og:description', summary, true);
  upsert('og:type', 'website', true);
  if (image) upsert('og:image', image, true);
}

function formatDate(value?: string | null) { return value ? new Intl.DateTimeFormat('en', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(value)) : 'Not published'; }
function renderText(value?: string | null) { return value ? <p>{value}</p> : null; }
function humanize(value?: string | null) { return value ? value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()) : null; }
function safeLink(url?: string | null) { return normalizeProofOfMindUrl(url); }
function leadSummary(concept: ProofOfMindConcept) { return concept.lead_pipeline ? `${concept.lead_pipeline.category_count} partner categories · ${concept.lead_pipeline.target_slots} target slots` : null; }
function valueList(value: unknown): unknown[] { return Array.isArray(value) ? value : []; }
function itemTitle(value: unknown) { if (typeof value === 'string') return value; if (!value || typeof value !== 'object') return null; const row = value as Record<string, unknown>; return String(row.segment || row.name || row.type || row.range || row.region || row.role || row.title || ''); }
function itemDetail(value: unknown) { if (!value || typeof value !== 'object' || Array.isArray(value)) return null; const row = value as Record<string, unknown>; return [row.need, row.reason, row.fit, row.model, row.buyer, row.design_need, row.core_action, row.motivation].filter((item) => typeof item === 'string').join(' · ') || null; }

function ScoreBadge({ label, value }: { label: string; value: number | null | undefined }) {
  return value === null || value === undefined ? null : <div className="proof-score-chip"><strong>{value.toFixed(value % 1 ? 1 : 0)}/10</strong><span>{label}</span></div>;
}

function DetailList({ items, limit, ordered = false }: { items: string[]; limit?: number; ordered?: boolean }) {
  const shown = items.slice(0, limit ?? items.length);
  if (!shown.length) return null;
  const Tag = ordered ? 'ol' : 'ul';
  return <Tag>{shown.map((item) => <li key={item}>{item}</li>)}</Tag>;
}

function StructuredItems({ items }: { items: unknown[] }) {
  if (!items.length) return null;
  return <div className="proof-structured-grid">{items.map((item, index) => {
    const title = itemTitle(item);
    const detail = itemDetail(item);
    return <article key={`${title}-${index}`}><strong>{title || `Item ${index + 1}`}</strong>{detail ? <p>{detail}</p> : null}</article>;
  })}</div>;
}

function ConceptIcon({ type }: { type: ProofOfMindConcept['concept_type'] }) {
  const icons = { app: Sparkles, platform: Building2, physical_product: Package, service: Handshake, leisure_experience: Map, hospitality: Hotel, community: Users, media: Film, infrastructure: Factory, marketplace: Store, hybrid: Box, other: Lightbulb };
  const Icon = icons[type] || Lightbulb;
  return <Icon aria-hidden="true" />;
}

function ConceptVisual({ concept }: { concept: ProofOfMindConcept }) {
  return <div className="concept-card__visual">{concept.cover_image_url ? <img src={concept.cover_image_url} alt={concept.cover_image_alt || `${concept.title} concept visual`} loading="lazy" /> : <div className="concept-card__fallback"><ConceptIcon type={concept.concept_type} /><span>{humanize(concept.concept_type)}</span></div>}</div>;
}

function FounderWordVideo({ concept }: { concept: ProofOfMindConcept }) {
  const { t } = useWebsiteI18n();
  const video = concept.founder_video;
  if (!video) return null;
  const founderName = concept.founder?.name || t('proof_of_mind.card.founder_fallback', 'the founder');
  return <section className="concept-card__founder-video" aria-label={t('proof_of_mind.card.founder_video_aria', 'A word from the founder of {title}', { title: concept.title })}>
    <div className="concept-card__founder-video-heading"><span>{t('proof_of_mind.card.founder_word', 'Word of the Founder')}</span><strong>{founderName}</strong></div>
    <video controls playsInline preload="metadata" poster={video.poster_url || undefined} aria-label={video.alt_text || video.title || t('proof_of_mind.card.founder_video_aria', 'A word from the founder of {title}', { title: concept.title })} onPlay={() => void trackProofOfMindEvent(concept.id, 'founder_video_play', { source: 'concept_card' })}>
      <source src={video.url} type={video.mime_type || undefined} />
      {video.captions_url ? <track kind="captions" src={video.captions_url} srcLang={video.language_code || concept.original_language || 'en'} label={t('proof_of_mind.card.captions', 'Captions')} default /> : null}
    </video>
    {video.caption || video.description ? <p>{video.caption || video.description}</p> : null}
  </section>;
}

async function shareConcept(concept: ProofOfMindConcept, platform = 'native') {
  const url = `${window.location.origin}/proof-of-mind/${concept.slug}`;
  const title = concept.share_headline || `${concept.title} — Proof of Mind`;
  const text = concept.share_description || concept.short_description || concept.tagline || title;
  try {
    if (navigator.share) await navigator.share({ title, text, url });
    else await navigator.clipboard.writeText(url);
    void trackProofOfMindEvent(concept.id, 'share', { platform });
    return true;
  } catch { return false; }
}

function ConceptCard({ concept, onDiscovery }: { concept: ProofOfMindConcept; onDiscovery: (concept: ProofOfMindConcept) => void }) {
  const openable = canOpenProofOfMindConcept(concept);
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const copy = async () => { const ok = await shareConcept(concept, 'card'); if (ok) { setCopied(true); window.setTimeout(() => setCopied(false), 1800); } };
  return <article className={`concept-card proof-premium-card ${expanded ? 'concept-card--expanded' : 'concept-card--compact'}${concept.is_featured ? ' concept-card--featured' : ''}`}>
    <ConceptVisual concept={concept} />
    <div className="concept-card__meta"><span>{humanize(concept.concept_type)}</span><span>{concept.category}</span><span>{humanize(concept.concept_status)}</span></div>
    <div className="concept-card__title-row"><h3>{concept.title}</h3>{concept.concept_score !== null ? <strong>{concept.concept_score}/10</strong> : null}</div>
    {concept.tagline ? <p className="concept-card__tagline">{concept.tagline}</p> : null}
    {concept.short_description ? <p className="concept-card__clamp">{concept.short_description}</p> : null}
    <FounderWordVideo concept={concept} />
    <div className="concept-card__compact-signals"><span>{openable ? 'Full public concept' : 'Protected teaser'}</span>{concept.primary_market ? <span>{concept.primary_market}</span> : null}{concept.key_features.length ? <span>{concept.key_features.length} core capabilities</span> : null}</div>
    {expanded ? <>
      {concept.founder ? <p className="concept-card__founder">Created by {concept.founder.name}{concept.founder.is_original_creator ? ' · original creator' : ''}</p> : null}
      <div className="proof-score-row"><ScoreBadge label="Concept" value={concept.concept_score} /><ScoreBadge label="Evaluation" value={concept.evaluation?.average_score} /></div>
      {concept.evaluation?.strongest_criteria.length ? <div className="proof-mini-chips">{concept.evaluation.strongest_criteria.slice(0, 3).map((item) => <span key={item.criterion}>{item.criterion}{item.score !== null ? ` · ${item.score}/10` : ''}</span>)}</div> : null}
      {concept.viral_hook ? <div className="proof-viral-hook"><Sparkles size={16} /><p>{concept.viral_hook}</p></div> : null}
      {concept.competition.competitive_advantage || concept.innovation_summary ? <div className="concept-card__innovation"><span>Why this wins</span><p>{concept.competition.competitive_advantage || concept.innovation_summary}</p></div> : null}
      <div className="concept-card__lists"><div><span>Problems solved</span><ol>{concept.problems_solved.slice(0, 3).map((item) => <li key={item}>{item}</li>)}</ol></div><div><span>Core capabilities</span><ul>{concept.key_features.slice(0, 4).map((item) => <li key={item}>{item}</li>)}</ul></div></div>
      <div className="concept-card__footer">{concept.viral_score !== null ? <span>Viral {concept.viral_score}/10</span> : null}{concept.competition.count ? <span>{concept.competition.count} competitors</span> : null}{leadSummary(concept) ? <span>{leadSummary(concept)}</span> : null}</div>
    </> : null}
    <button className="proof-card-toggle" type="button" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>{expanded ? <><ChevronUp size={16} /> Show less</> : <><ChevronDown size={16} /> Show more</>}</button>
    <div className="proof-card-actions">{openable ? <a className="button button--small" href={`/proof-of-mind/${concept.slug}`} onClick={() => void trackProofOfMindEvent(concept.id, 'detail_open', { source: 'teaser_card' })}>View full concept <ArrowRight size={16} /></a> : <button className="button button--small" type="button" onClick={() => onDiscovery(concept)}>Register interest</button>}<button className="button button--ghost button--small" type="button" onClick={copy}>{copied ? <CheckCircle size={16} /> : <Share2 size={16} />}{copied ? 'Shared' : 'Share'}</button></div>
  </article>;
}

const interestTypes = ['potential customer', 'launch partner', 'investor', 'developer/builder', 'sponsor', 'media', 'other'];

function DiscoveryCallModal({ concept, onClose }: { concept: ProofOfMindConcept; onClose: () => void }) {
  const { t } = useWebsiteI18n();
  const [form, setForm] = useState({ full_name: '', email: '', company: '', role: '', country: '', interest_message: '', consent_to_contact: false, website: '', linkedin: '', interest_type: 'potential customer' });
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault(); const payload = { concept_id: concept.id, ...form };
    try { validateProofOfMindDiscoveryInput(payload); } catch (error) { setState('error'); setMessage(error instanceof Error ? error.message : t('proof_of_mind.discovery.validation', 'Please complete the required fields.')); return; }
    setState('loading'); setMessage('');
    try { await submitProofOfMindDiscovery(payload); setState('success'); setMessage(t('proof_of_mind.discovery.success_message', 'Your request has been linked to {title}.', { title: concept.title })); } catch { setState('error'); setMessage(t('proof_of_mind.discovery.error', 'The request could not be saved. Please try again shortly.')); }
  }
  const set = (key: keyof typeof form, value: string | boolean) => setForm((current) => ({ ...current, [key]: value }));
  return <div className="discovery-modal" role="dialog" aria-modal="true" aria-labelledby="discovery-title"><div className="discovery-modal__panel"><button className="discovery-modal__close" type="button" onClick={onClose} aria-label={t('proof_of_mind.discovery.close_aria', 'Close discovery call form')}><X size={18} /></button>{state === 'success' ? <div className="impact-state"><CheckCircle /><div><strong>{t('proof_of_mind.discovery.received', 'Request received.')}</strong><br />{message}</div><button className="button button--small" type="button" onClick={onClose}>{t('proof_of_mind.discovery.close', 'Close')}</button></div> : <form className="application-form journal-form discovery-form" onSubmit={submit}><p className="eyebrow">{t('proof_of_mind.discovery.eyebrow', 'Discovery call')}</p><h2 id="discovery-title">{t('proof_of_mind.discovery.title', 'Register interest in {title}', { title: concept.title })}</h2><input value={form.full_name} onChange={(event) => set('full_name', event.target.value)} placeholder={t('proof_of_mind.discovery.full_name', 'Full name')} required /><input type="email" value={form.email} onChange={(event) => set('email', event.target.value)} placeholder={t('proof_of_mind.discovery.email', 'Email')} required /><input value={form.company} onChange={(event) => set('company', event.target.value)} placeholder={t('proof_of_mind.discovery.company', 'Company')} /><input value={form.role} onChange={(event) => set('role', event.target.value)} placeholder={t('proof_of_mind.discovery.role', 'Role')} /><input value={form.country} onChange={(event) => set('country', event.target.value)} placeholder={t('proof_of_mind.discovery.country', 'Country')} /><select value={form.interest_type} onChange={(event) => set('interest_type', event.target.value)}>{interestTypes.map((type) => <option key={type} value={type}>{humanize(type)}</option>)}</select><textarea value={form.interest_message} onChange={(event) => set('interest_message', event.target.value)} placeholder={t('proof_of_mind.discovery.message', 'Tell us why this concept matters to you')} required /><label><input type="checkbox" checked={form.consent_to_contact} onChange={(event) => set('consent_to_contact', event.target.checked)} required /> {t('proof_of_mind.discovery.consent', 'I consent to being contacted about this concept.')}</label>{message ? <p role="alert">{message}</p> : null}<button className="button" type="submit" disabled={state === 'loading'}>{state === 'loading' ? t('proof_of_mind.discovery.sending', 'Sending…') : t('proof_of_mind.discovery.submit', 'Send request')}</button></form>}</div></div>;
}

function useConcepts() {
  const [concepts, setConcepts] = useState<ProofOfMindConcept[]>([]);
  const [state, setState] = useState<'loading' | 'success' | 'error'>('loading');
  const load = async () => { setState('loading'); try { setConcepts(await getProofOfMindConcepts()); setState('success'); } catch { setState('error'); } };
  useEffect(() => { void load(); }, []);
  return { concepts, state, retry: load };
}

const publicCategoryOrder = [
  'AI & Digital Products',
  'Business & Commerce',
  'Mobility, Maritime & Infrastructure',
  'Leisure, Travel & Hospitality',
  'Living, Community & Wellbeing',
  'Media, Education & Creativity',
  'Other Concepts',
] as const;

type PublicCategory = typeof publicCategoryOrder[number];
type ConceptCategoryFilter = 'All' | PublicCategory;
type ConceptSort = 'updated_desc' | 'updated_asc' | 'title_asc' | 'title_desc';

function getPublicCategory(concept: ProofOfMindConcept): PublicCategory {
  const haystack = [concept.category, concept.concept_type, concept.title, ...concept.tags].filter(Boolean).join(' ').toLowerCase();
  if (/maritime|marine|ship|fleet|mobility|transport|infrastructure|logistics|aviation|vehicle|energy|construction/.test(haystack)) return 'Mobility, Maritime & Infrastructure';
  if (/hospitality|travel|tourism|hotel|leisure|water sport|watersport|experience|resort|beach|event/.test(haystack)) return 'Leisure, Travel & Hospitality';
  if (/community|living|wellbeing|wellness|health|housing|nature|neuro|social impact/.test(haystack)) return 'Living, Community & Wellbeing';
  if (/media|education|learning|creative|creator|film|music|publishing|story|content/.test(haystack)) return 'Media, Education & Creativity';
  if (/commerce|marketplace|retail|business|sales|venture|finance|investment|operations/.test(haystack)) return 'Business & Commerce';
  if (/ai|software|digital|app|platform|saas|automation|data|technology|tech/.test(haystack)) return 'AI & Digital Products';
  return 'Other Concepts';
}

function conceptUpdateTime(concept: ProofOfMindConcept) {
  const value = concept.updated_at || concept.published_at;
  const timestamp = value ? new Date(value).getTime() : 0;
  return Number.isFinite(timestamp) ? timestamp : 0;
}

export function ProofOfMindPage() {
  const { t } = useWebsiteI18n();
  const { concepts, state, retry } = useConcepts();
  const [selectedCategory, setSelectedCategory] = useState<ConceptCategoryFilter>('All');
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState<ConceptSort>('updated_desc');
  const [discoveryConcept, setDiscoveryConcept] = useState<ProofOfMindConcept | null>(null);
  useEffect(() => { setProofMeta('Proof of Mind — Bankrupt to 1 Million', 'A public archive of venture concepts, evaluations, competition research and collaboration opportunities.'); }, []);

  const categoryCounts = useMemo(() => {
    const counts = new Map<ConceptCategoryFilter, number>([['All', concepts.length]]);
    concepts.forEach((concept) => {
      const category = getPublicCategory(concept);
      counts.set(category, (counts.get(category) || 0) + 1);
    });
    return counts;
  }, [concepts]);

  const categories = useMemo<ConceptCategoryFilter[]>(() => ['All', ...publicCategoryOrder.filter((category) => (categoryCounts.get(category) || 0) > 0)], [categoryCounts]);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return concepts
      .filter((concept) => {
        const groupedCategory = getPublicCategory(concept);
        if (selectedCategory !== 'All' && groupedCategory !== selectedCategory) return false;
        if (!normalizedQuery) return true;
        const searchable = [concept.title, concept.tagline, concept.short_description, groupedCategory, concept.category, ...concept.tags].filter(Boolean).join(' ').toLowerCase();
        return searchable.includes(normalizedQuery);
      })
      .sort((a, b) => {
        if (sortBy === 'title_asc') return a.title.localeCompare(b.title);
        if (sortBy === 'title_desc') return b.title.localeCompare(a.title);
        const difference = conceptUpdateTime(a) - conceptUpdateTime(b);
        return sortBy === 'updated_asc' ? difference : -difference;
      });
  }, [concepts, query, selectedCategory, sortBy]);

  return <main className="proof-page"><section className="section"><div className="container"><SectionHeading eyebrow={t('proof_of_mind.eyebrow', 'Proof of Mind')} title={t('proof_of_mind.title', 'Ideas made tangible')} description={t('proof_of_mind.description', 'Explore public venture concepts, scores, research and collaboration opportunities.')} />{state === 'loading' ? <div className="impact-state">{t('proof_of_mind.loading', 'Loading concepts…')}</div> : state === 'error' ? <ProofOfMindErrorState onRetry={retry} /> : concepts.length === 0 ? <ProofOfMindEmptyState /> : <><div className="proof-toolbar"><label><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('proof_of_mind.search', 'Search concepts')} /></label><select value={sortBy} onChange={(event) => setSortBy(event.target.value as ConceptSort)}><option value="updated_desc">Newest first</option><option value="updated_asc">Oldest first</option><option value="title_asc">Title A–Z</option><option value="title_desc">Title Z–A</option></select></div><div className="proof-category-row">{categories.map((category) => <button key={category} type="button" className={selectedCategory === category ? 'is-active' : ''} onClick={() => setSelectedCategory(category)}>{category} <span>{categoryCounts.get(category) || 0}</span></button>)}</div><div className="proof-grid">{filtered.map((concept) => <ConceptCard key={concept.id} concept={concept} onDiscovery={setDiscoveryConcept} />)}</div>{filtered.length === 0 ? <div className="impact-state">{t('proof_of_mind.no_results', 'No concepts match these filters.')}</div> : null}</>}</div></section>{discoveryConcept ? <DiscoveryCallModal concept={discoveryConcept} onClose={() => setDiscoveryConcept(null)} /> : null}</main>;
}

export function ProofOfMindDetailPage({ slug }: { slug: string }) {
  const [concept, setConcept] = useState<ProofOfMindConceptDetail | null>(null);
  const [state, setState] = useState<'loading' | 'success' | 'error'>('loading');
  useEffect(() => { let active = true; void getProofOfMindConceptBySlug(slug).then((value) => { if (active) { setConcept(value); setState('success'); if (value) setProofMeta(`${value.title} — Proof of Mind`, value.short_description || value.tagline, value.cover_image_url); } }).catch(() => { if (active) setState('error'); }); return () => { active = false; }; }, [slug]);
  if (state === 'loading') return <main className="proof-page"><div className="container"><div className="impact-state">Loading concept…</div></div></main>;
  if (state === 'error' || !concept) return <main className="proof-page"><div className="container"><div className="impact-state impact-state--error">Concept not found.</div></div></main>;
  return <main className="proof-page"><section className="section"><div className="container proof-detail"><a className="button button--ghost button--small" href="/proof-of-mind">← Back to archive</a><div className="proof-detail__hero"><ConceptVisual concept={concept} /><div><p className="eyebrow">{humanize(concept.concept_type)} · {concept.category}</p><h1>{concept.title}</h1>{concept.tagline ? <p className="lead">{concept.tagline}</p> : null}<div className="proof-score-row"><ScoreBadge label="Concept" value={concept.concept_score} /><ScoreBadge label="Evaluation" value={concept.evaluation?.average_score} /></div></div></div><section><h2>Overview</h2>{renderText(concept.short_description)}{renderText(concept.full_description)}</section><section><h2>Problems solved</h2><DetailList items={concept.problems_solved} ordered /></section><section><h2>Core capabilities</h2><DetailList items={concept.key_features} /></section><section><h2>Competition and advantage</h2>{renderText(concept.competition.competitive_advantage || concept.innovation_summary)}</section><section><h2>Structured research</h2><StructuredItems items={valueList(concept.target_audience)} /></section><footer className="proof-detail__footer"><span>Published {formatDate(concept.published_at)}</span>{safeLink(concept.external_url) ? <a href={safeLink(concept.external_url) || '#'} target="_blank" rel="noreferrer">External source <ExternalLink size={16} /></a> : null}</footer></div></section></main>;
}
