import type { I18nManifest } from '../lib/i18nManifest';
import { ArrowRight, Box, Brain, Building2, CalendarDays, CheckCircle, ChevronDown, ChevronUp, Copy, Database, ExternalLink, Factory, Film, Globe2, Handshake, Hotel, Image as ImageIcon, Lightbulb, LockKeyhole, Map, Package, RefreshCw, Search, Share2, ShieldCheck, Sparkles, Store, Target, Users, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { SectionHeading } from '../components/SectionHeading';
import { canOpenProofOfMindConcept, getProofOfMindConceptBySlug, getProofOfMindConcepts, normalizeProofOfMindUrl, submitProofOfMindDiscovery, trackProofOfMindEvent, validateProofOfMindDiscoveryInput } from '../lib/proofOfMind';
import type { ProofOfMindConcept, ProofOfMindConceptDetail } from '../lib/proofOfMind';
import '../styles/proofOfMind.css';
import '../styles/proofOfMindExpandableCards.css';

function ProofOfMindErrorState({ onRetry }: { onRetry: () => void }) {
  return <div className="impact-state impact-state--error" role="alert"><div><strong>Proof of Mind could not be loaded.</strong><br />The public archive request failed.</div><button className="button button--small" type="button" onClick={onRetry}><RefreshCw size={16} aria-hidden="true" /> Try again</button></div>;
}

function ProofOfMindEmptyState() {
  return <div className="impact-state"><strong>The archive is being prepared.</strong><br />The first public concepts will appear here soon.</div>;
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
  const [form, setForm] = useState({ full_name: '', email: '', company: '', role: '', country: '', interest_message: '', consent_to_contact: false, website: '', linkedin: '', interest_type: 'potential customer' });
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault(); const payload = { concept_id: concept.id, ...form };
    try { validateProofOfMindDiscoveryInput(payload); } catch (error) { setState('error'); setMessage(error instanceof Error ? error.message : 'Please complete the required fields.'); return; }
    setState('loading'); setMessage('');
    try { await submitProofOfMindDiscovery(payload); setState('success'); setMessage(`Your request has been linked to ${concept.title}.`); } catch { setState('error'); setMessage('The request could not be saved. Please try again shortly.'); }
  }
  const set = (key: keyof typeof form, value: string | boolean) => setForm((current) => ({ ...current, [key]: value }));
  return <div className="discovery-modal" role="dialog" aria-modal="true" aria-labelledby="discovery-title"><div className="discovery-modal__panel"><button className="discovery-modal__close" type="button" onClick={onClose} aria-label="Close discovery call form"><X size={18} /></button>{state === 'success' ? <div className="impact-state"><CheckCircle /><div><strong>Request received.</strong><br />{message}</div><button className="button button--small" type="button" onClick={onClose}>Close</button></div> : <form className="application-form journal-form discovery-form" onSubmit={submit}><p className="eyebrow">Book Discovery Call</p><h2 id="discovery-title">Discuss {concept.title}</h2><p>Tell us how you could help validate, build, fund or launch this concept.</p><div className="form-grid"><label>Full name<input required value={form.full_name} onChange={(e) => set('full_name', e.target.value)} /></label><label>Email<input required type="email" value={form.email} onChange={(e) => set('email', e.target.value)} /></label></div><div className="form-grid"><label>Company or organisation<input required value={form.company} onChange={(e) => set('company', e.target.value)} /></label><label>Role<input required value={form.role} onChange={(e) => set('role', e.target.value)} /></label></div><label>Country/location<input required value={form.country} onChange={(e) => set('country', e.target.value)} /></label><div className="form-grid"><label>Website <span className="optional-label">optional</span><input type="url" value={form.website} onChange={(e) => set('website', e.target.value)} /></label><label>LinkedIn <span className="optional-label">optional</span><input type="url" value={form.linkedin} onChange={(e) => set('linkedin', e.target.value)} /></label></div><label>Interest type<select value={form.interest_type} onChange={(e) => set('interest_type', e.target.value)}>{interestTypes.map((type) => <option key={type} value={type}>{type}</option>)}</select></label><label>Why does this concept interest you?<textarea required rows={5} value={form.interest_message} onChange={(e) => set('interest_message', e.target.value)} /></label><label><input type="checkbox" required checked={form.consent_to_contact} onChange={(e) => set('consent_to_contact', e.target.checked)} /> I consent to be contacted about this concept.</label><div className={`form-status ${state === 'error' ? 'impact-state--error' : ''}`} role="status">{state === 'loading' ? 'Saving…' : message}</div><div className="hero__actions"><button className="button" disabled={state === 'loading'} type="submit">Submit request</button><button className="button button--ghost" type="button" onClick={onClose}>Cancel</button></div></form>}</div></div>;
}

export const PROOF_OF_MIND_PAGES_I18N_MANIFEST = {
  componentKey: 'pages.proof.of.mind.pages',
  namespace: 'ui',
  translationKeys: [
  ] as const,
} as const satisfies I18nManifest;

export function ProofOfMindPage() {
  const [concepts, setConcepts] = useState<ProofOfMindConcept[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [selectedConcept, setSelectedConcept] = useState<ProofOfMindConcept | null>(null);
  const load = () => { setStatus('loading'); getProofOfMindConcepts().then((rows) => { setConcepts(rows); setStatus('ready'); }).catch(() => setStatus('error')); };
  useEffect(load, []);
  const categories = useMemo(() => ['all', ...Array.from(new Set(concepts.map((concept) => concept.category))).sort()], [concepts]);
  const filtered = useMemo(() => { const needle = query.trim().toLowerCase(); return concepts.filter((concept) => (category === 'all' || concept.category === category) && (!needle || [concept.title, concept.tagline, concept.short_description, concept.innovation_summary, concept.category, concept.concept_status, concept.concept_type, concept.concept_format, concept.delivery_model, concept.primary_market, ...concept.tags].filter(Boolean).join(' ').toLowerCase().includes(needle))); }, [category, concepts, query]);
  const fullCount = concepts.filter(canOpenProofOfMindConcept).length;
  return <main id="top" className="proof-page"><section className="hero proof-hero section-grid" aria-labelledby="proof-title"><div className="hero__content"><p className="eyebrow">PROOF OF MIND</p><h1 id="proof-title">Ideas are easy to dismiss. A body of work is harder to ignore.</h1><p className="hero__lede">A public venture archive built to help developers, venture studios, investors and launch partners discover concepts worth building.</p><div className="proof-search" role="search"><label htmlFor="proof-search"><Search size={16} /> Search concepts</label><input id="proof-search" value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Search by title, market, type or tag" /></div></div><aside className="hero-card proof-hero-card"><Sparkles /><blockquote>Concepts designed to become ventures.</blockquote><p>Every full concept combines founder attribution, commercial scoring, competitors, target audiences, AI opportunities, partner leads and build-ready product detail.</p></aside></section><section className="section proof-stats" aria-label="Proof of Mind statistics"><article><span>{concepts.length}</span><p>Visible concepts</p></article><article><span>{Math.max(categories.length - 1, 0)}</span><p>Categories</p></article><article><span>{fullCount}</span><p>Fully revealed</p></article></section><section className="section" aria-labelledby="proof-archive-title"><SectionHeading eyebrow="Public archive" title="Explore concepts worth building" titleId="proof-archive-title">Find the concepts that match your expertise, capital, audience or distribution network.</SectionHeading><div className="concept-filters">{categories.map((item) => <button key={item} type="button" className={category === item ? 'is-active' : ''} onClick={() => setCategory(item)}>{item === 'all' ? 'All concepts' : item}</button>)}</div>{status === 'loading' ? <div className="proof-skeleton" role="status">Loading concepts…</div> : null}{status === 'error' ? <ProofOfMindErrorState onRetry={load} /> : null}{status === 'ready' && !concepts.length ? <ProofOfMindEmptyState /> : null}{status === 'ready' && concepts.length && !filtered.length ? <div className="impact-state">No concepts match the current filters.</div> : null}<div className="concept-grid">{filtered.map((concept) => <ConceptCard key={concept.id} concept={concept} onDiscovery={setSelectedConcept} />)}</div></section>{selectedConcept ? <DiscoveryCallModal concept={selectedConcept} onClose={() => setSelectedConcept(null)} /> : null}</main>;
}

function DetailBlock({ title, eyebrow, children }: { title: string; eyebrow?: string; children?: ReactNode }) {
  if (!children) return null;
  return <section className="concept-detail-section">{eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}<h2>{title}</h2>{children}</section>;
}

function ShareBar({ concept }: { concept: ProofOfMindConcept }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => { const url = window.location.href; await navigator.clipboard.writeText(url); setCopied(true); void trackProofOfMindEvent(concept.id, 'copy_link', { platform: 'clipboard' }); window.setTimeout(() => setCopied(false), 1800); };
  return <div className="proof-share-bar"><div><strong>{concept.share_headline || `Share ${concept.title}`}</strong><span>Help the right builder, studio or investor discover this concept.</span></div><div><button className="button button--small" type="button" onClick={() => void shareConcept(concept, 'native')}><Share2 size={16} /> Share</button><button className="button button--ghost button--small" type="button" onClick={copy}>{copied ? <CheckCircle size={16} /> : <Copy size={16} />}{copied ? 'Copied' : 'Copy link'}</button></div></div>;
}

export function ProofOfMindDetailPage({ slug }: { slug: string }) {
  const [concept, setConcept] = useState<ProofOfMindConceptDetail | null>(null);
  const [related, setRelated] = useState<ProofOfMindConcept[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const load = () => { setStatus('loading'); Promise.all([getProofOfMindConceptBySlug(slug), getProofOfMindConcepts()]).then(([row, concepts]) => { setConcept(row); setRelated(row ? concepts.filter((item) => item.slug !== row.slug && (item.category === row.category || item.concept_type === row.concept_type || item.tags.some((tag) => row.tags.includes(tag)))).slice(0, 3) : []); setStatus('ready'); if (row) { setProofMeta(row.share_headline || `${row.title} | Proof of Mind`, row.share_description || row.short_description, row.og_image_url || row.cover_image_url); void trackProofOfMindEvent(row.id, 'view', { page: 'detail' }); } }).catch(() => setStatus('error')); };
  useEffect(load, [slug]);
  if (status === 'loading') return <main className="section"><div className="proof-skeleton" role="status">Loading concept detail…</div></main>;
  if (status === 'error') return <main className="section"><ProofOfMindErrorState onRetry={load} /></main>;
  if (!concept) return <main className="section"><div className="impact-state impact-state--error" role="alert"><strong>Concept not found or not public.</strong></div><a className="button" href="/proof-of-mind">Back to Proof of Mind</a></main>;
  const primaryCta = safeLink(concept.detail_cta_url);
  const mediaLinks = [{ label: 'View Demo', url: safeLink(concept.demo_url) }, { label: 'View Pitch Deck', url: safeLink(concept.pitch_deck_url) }, { label: 'Visit Website', url: safeLink(concept.external_url) }].filter((link) => link.url);
  const market = concept.market_profile;
  return <main id="top" className="proof-page proof-detail-page">
    <section className="proof-detail-hero section-grid" aria-labelledby="concept-title"><div className="proof-detail-hero__copy"><p className="eyebrow">Proof of Mind · Fully Public Concept</p><h1 id="concept-title">{concept.title}</h1>{concept.tagline ? <p className="hero__lede">{concept.tagline}</p> : null}{renderText(concept.short_description)}<div className="concept-card__meta"><span>{humanize(concept.concept_type)}</span>{concept.concept_format ? <span>{concept.concept_format}</span> : null}<span>{concept.category}</span><span>{humanize(concept.concept_status)}</span>{concept.primary_market ? <span>{concept.primary_market}</span> : null}</div><div className="proof-score-row"><ScoreBadge label="Concept" value={concept.concept_score} /><ScoreBadge label="Evaluation" value={concept.evaluation?.average_score} /><ScoreBadge label="Viral potential" value={concept.viral_score} /></div>{concept.founder ? <p className="concept-card__founder">Created by {concept.founder.name}{concept.founder.is_original_creator ? ' · original creator' : ''}</p> : null}{concept.viral_hook ? <div className="proof-viral-hook proof-viral-hook--hero"><Sparkles size={18} /><p>{concept.viral_hook}</p></div> : null}<div className="hero__actions">{primaryCta ? <a className="button" href={primaryCta} target="_blank" rel="noreferrer" onClick={() => void trackProofOfMindEvent(concept.id, 'cta_click', { cta: 'primary' })}>{concept.detail_cta_label || 'Become a Launch Partner'} <ExternalLink size={16} /></a> : <a className="button" href="/support">Discuss the Concept</a>}{mediaLinks.map((link) => <a key={link.label} className="button button--ghost" href={link.url!} target="_blank" rel="noreferrer">{link.label}</a>)}</div></div><aside className="proof-detail-hero__visual">{concept.cover_image_url ? <img src={concept.cover_image_url} alt={concept.cover_image_alt || `${concept.title} concept visual`} /> : <div className="concept-card__fallback"><ConceptIcon type={concept.concept_type} /><span>{humanize(concept.concept_type)}</span></div>}<div className="proof-score"><strong>{concept.concept_score ?? '—'}</strong><span>/10 concept score</span></div></aside></section>
    <section className="section proof-detail-signals"><article><Sparkles /><strong>{concept.ai_features.length}</strong><span>AI features</span></article><article><Database /><strong>{concept.external_api_providers.length}</strong><span>API providers</span></article><article><Target /><strong>{concept.lead_pipeline?.target_slots || 0}</strong><span>Partner targets</span></article><article><CalendarDays /><strong>{formatDate(concept.published_at)}</strong><span>Public since</span></article></section>
    <section className="section"><ShareBar concept={concept} /></section>
    <div className="section concept-detail concept-detail--premium">
      <DetailBlock eyebrow="01 · Vision" title="Concept overview"><>{renderText(concept.full_description)}{renderText(concept.vision_statement)}{renderText(concept.innovation_summary)}<div className="concept-card__tags">{[concept.concept_format, concept.delivery_model, concept.primary_market].filter(Boolean).map((item) => <span key={item!}>{item}</span>)}</div></></DetailBlock>
      <DetailBlock eyebrow="02 · Creator" title="Founder"><div className="proof-founder"><h3>{concept.founder?.name || 'Kevin De Vlieger'}</h3><p>{concept.founder?.role || 'Concept Thinker & Vision Partner'}</p><span>Original creator</span>{renderText(concept.founder?.bio)}</div></DetailBlock>
      <DetailBlock eyebrow="03 · Problem" title="Problem and solution"><div className="proof-split"><article><h3>The problem</h3>{renderText(concept.problem_statement)}<DetailList items={concept.problems_solved} ordered /></article><article><h3>The solution</h3>{renderText(concept.solution_overview)}<DetailList items={concept.differentiation_points} /></article></div></DetailBlock>
      <DetailBlock eyebrow="04 · Audience" title="Market & audience profile">{market ? <><p>{typeof market.audience_summary === 'string' ? market.audience_summary : concept.target_audience}</p><div className="proof-market-block"><h3>Primary audience</h3><StructuredItems items={valueList(market.primary_audience)} /></div><div className="proof-market-block"><h3>Secondary audience</h3><StructuredItems items={valueList(market.secondary_audience)} /></div><div className="proof-market-block"><h3>Age groups</h3><StructuredItems items={valueList(market.age_groups)} /></div><div className="proof-market-block"><h3>Customer models</h3><StructuredItems items={valueList(market.customer_types)} /></div><div className="proof-market-block"><h3>Launch regions</h3><StructuredItems items={valueList(market.launch_regions)} /></div><div className="proof-market-columns"><article><h3>Jobs to be done</h3><DetailList items={valueList(market.jobs_to_be_done).filter((x): x is string => typeof x === 'string')} /></article><article><h3>Pain points</h3><DetailList items={valueList(market.pain_points).filter((x): x is string => typeof x === 'string')} /></article><article><h3>Desired outcomes</h3><DetailList items={valueList(market.desired_outcomes).filter((x): x is string => typeof x === 'string')} /></article><article><h3>Trust requirements</h3><DetailList items={valueList(market.trust_requirements).filter((x): x is string => typeof x === 'string')} /></article></div></> : <>{renderText(concept.target_audience)}<DetailList items={concept.target_users} /><DetailList items={concept.key_use_cases} ordered /></>}</DetailBlock>
      <DetailBlock eyebrow="05 · Product" title="Complete feature architecture">{concept.feature_groups.length ? <div className="proof-feature-groups">{concept.feature_groups.map((group) => <article key={group.group_key}><div className="proof-feature-group__head"><div><h3>{group.group_name}</h3>{group.user_role ? <span>{group.user_role}</span> : null}</div><strong>{group.features.length} features</strong></div>{renderText(group.group_description)}<ul>{group.features.map((feature) => <li key={feature.feature_key}><div><strong>{feature.feature_name}</strong><p>{feature.feature_description}</p></div><span>{humanize(feature.release_phase)} · {humanize(feature.priority)}</span></li>)}</ul></article>)}</div> : <DetailList items={concept.key_features} />}</DetailBlock>
      <DetailBlock eyebrow="06 · Intelligence" title="10 embedded AI features"><div className="proof-ai-grid">{concept.ai_features.map((feature, index) => <article key={feature.name}><span className="proof-number">{String(index + 1).padStart(2, '0')}</span><Brain /><h3>{feature.name}</h3>{renderText(feature.purpose)}{feature.user_roles.length ? <div className="proof-mini-chips">{feature.user_roles.map((role) => <span key={role}>{role}</span>)}</div> : null}{feature.safety ? <p className="proof-safety"><LockKeyhole size={15} /> {feature.safety}</p> : null}</article>)}</div></DetailBlock>
      <DetailBlock eyebrow="07 · Ecosystem" title="10 external API providers"><div className="proof-api-grid">{concept.external_api_providers.map((provider, index) => <article key={provider.provider}><span className="proof-number">{String(index + 1).padStart(2, '0')}</span><Database /><h3>{provider.provider}</h3>{provider.category ? <p className="proof-kicker">{provider.category}</p> : null}<DetailList items={provider.use_cases} />{provider.privacy_note ? <p><strong>Privacy:</strong> {provider.privacy_note}</p> : null}<span>{humanize(provider.integration_status)}</span></article>)}</div></DetailBlock>
      <DetailBlock eyebrow="08 · Experience" title="10 core product screens"><div className="proof-mockup-grid">{concept.mockup_screens.map((screen, index) => <article key={screen.screen_key}>{screen.image_url ? <img src={screen.image_url} alt={screen.image_alt || screen.screen_name} loading="lazy" onClick={() => void trackProofOfMindEvent(concept.id, 'mockup_view', { screen: screen.screen_key })} /> : <div className="proof-mockup-placeholder"><ImageIcon /><span>Mockup {String(index + 1).padStart(2, '0')}</span><strong>{screen.screen_name}</strong><small>{screen.image_status === 'brief_ready' ? 'Visual brief ready' : humanize(screen.image_status)}</small></div>}<div className="proof-mockup-copy"><h3>{screen.screen_name}</h3>{renderText(screen.screen_purpose)}{screen.primary_user_role ? <span>{screen.primary_user_role}</span> : null}<DetailList items={screen.main_components} /></div></article>)}</div></DetailBlock>
      <DetailBlock eyebrow="09 · Commercial" title="Commercial evaluation">{concept.evaluation ? <><div className="proof-score-row"><ScoreBadge label="Average" value={concept.evaluation.average_score} /></div><div className="proof-evaluation-list">{concept.evaluation.criteria.map((item) => <article key={item.criterion}><div><h3>{item.criterion}</h3>{item.score !== null ? <strong>{item.score}/10</strong> : null}</div>{renderText(item.assessment)}{item.risks.length ? <><h4>Risks</h4><DetailList items={item.risks} /></> : null}{item.improvement_actions.length ? <><h4>Improvement actions</h4><DetailList items={item.improvement_actions} /></> : null}</article>)}</div></> : null}</DetailBlock>
      <DetailBlock eyebrow="10 · Positioning" title="Competition and differentiation">{concept.competition.summary || concept.competition.comparisons.length ? <>{renderText(concept.competition.summary)}{concept.competition.competitive_advantage ? <div className="proof-advantage"><strong>Why we are different</strong><p>{concept.competition.competitive_advantage}</p></div> : null}<div className="proof-comparison-grid">{concept.competition.comparisons.slice(0, 10).map((item) => <article key={item.name}><h3>{item.name}</h3>{item.product ? <p>{item.product}</p> : null}{item.differences ? <p><strong>Difference:</strong> {item.differences}</p> : null}{item.our_advantage ? <p><strong>Our advantage:</strong> {item.our_advantage}</p> : null}{item.strategic_risk ? <p><strong>Risk:</strong> {item.strategic_risk}</p> : null}</article>)}</div></> : null}</DetailBlock>
      <DetailBlock eyebrow="11 · Business" title="Market, business model and validation"><div className="proof-split"><article><h3>Market opportunity</h3>{renderText(concept.market_opportunity)}<div className="concept-card__tags">{concept.tags.map((tag) => <span key={tag}>{tag}</span>)}</div></article><article><h3>Business model</h3>{renderText(concept.business_model_summary)}{renderText(concept.business_model)}{concept.delivery_model ? <p><strong>Delivery model:</strong> {concept.delivery_model}</p> : null}</article></div><div className="proof-split"><article><h3>Validation</h3>{renderText(concept.validation_summary)}<DetailList items={concept.validation_evidence} /></article><article><h3>Roadmap</h3>{renderText(concept.roadmap_summary)}</article></div></DetailBlock>
      <DetailBlock eyebrow="12 · Opportunity" title="Partner and lead opportunities">{concept.lead_pipeline ? <><p>{concept.lead_pipeline.category_count} categories · {concept.lead_pipeline.identified_leads} identified · {concept.lead_pipeline.target_slots} target slots</p><div className="proof-lead-grid">{concept.lead_pipeline.categories.map((item) => <article key={item.name}><h3>{item.name}</h3>{renderText(item.strategic_goal)}{item.default_outreach_angle ? <p><strong>Angle:</strong> {item.default_outreach_angle}</p> : null}<span>{item.identified_leads} / {item.target_slots} identified</span></article>)}</div></> : null}</DetailBlock>
      <DetailBlock eyebrow="13 · Collaboration" title="Who we want to meet"><DetailList items={concept.collaboration_opportunities} />{primaryCta ? <a className="button" href={primaryCta} target="_blank" rel="noreferrer">{concept.detail_cta_label || 'Explore partnership'} <ExternalLink size={16} /></a> : <a className="button" href="/support">Join the mission</a>}</DetailBlock>
      <section className="concept-detail-section proof-signature"><ShieldCheck /><div><h2>Proof of Mind signature</h2><p>{concept.title} is an original concept by Kevin De Vlieger, published as part of the Bankrupt to 1 Million public venture archive and last updated {formatDate(concept.updated_at)}.</p></div></section>
    </div>
    {related.length ? <section className="section"><SectionHeading eyebrow="Related concepts" title="Explore the surrounding portfolio." titleId="related-proof-title">Discover adjacent ventures from the same founder-controlled archive.</SectionHeading><div className="concept-grid">{related.map((item) => <ConceptCard key={item.id} concept={item} onDiscovery={() => { location.href = '/proof-of-mind#proof-archive-title'; }} />)}</div></section> : null}
    <section className="section proof-final-cta"><p className="eyebrow">Build with Proof of Mind</p><h2>{concept.detail_cta_label || 'Turn this concept into a venture'}</h2><p>We are looking for serious builders, studios, investors, operators and launch partners who recognize the opportunity and can help bring it to market.</p>{primaryCta ? <a className="button" href={primaryCta} target="_blank" rel="noreferrer">{concept.detail_cta_label || 'Start the conversation'} <ArrowRight size={16} /></a> : <a className="button" href="/support">Join the Mission <ArrowRight size={16} /></a>}</section>
  </main>;
}
