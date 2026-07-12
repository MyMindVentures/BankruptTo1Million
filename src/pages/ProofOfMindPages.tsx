import { ArrowRight, Box, Building2, CheckCircle, ExternalLink, Factory, Film, Handshake, Hotel, Lightbulb, Map, Package, RefreshCw, Search, Sparkles, Store, Users, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { SectionHeading } from '../components/SectionHeading';
import { canOpenProofOfMindConcept, getProofOfMindConceptBySlug, getProofOfMindConcepts, submitProofOfMindDiscovery, validateProofOfMindDiscoveryInput } from '../lib/proofOfMind';
import type { ProofOfMindConcept, ProofOfMindConceptDetail } from '../lib/proofOfMind';

function ProofOfMindErrorState({ onRetry }: { onRetry: () => void }) {
  return <div className="impact-state impact-state--error" role="alert"><div><strong>Proof of Mind could not be loaded.</strong><br />The public archive request failed.</div><button className="button button--small" type="button" onClick={onRetry}><RefreshCw size={16} aria-hidden="true" /> Try again</button></div>;
}

function ProofOfMindEmptyState() {
  return <div className="impact-state"><strong>The archive is being prepared.</strong><br />A lifetime of ideas is being organised into a public body of work. The first concepts will appear here soon.</div>;
}


function humanize(value?: string | null) { return value ? value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()) : null; }

function ConceptIcon({ type }: { type: ProofOfMindConcept['concept_type'] }) {
  const icons = { app: Sparkles, platform: Building2, physical_product: Package, service: Handshake, leisure_experience: Map, hospitality: Hotel, community: Users, media: Film, infrastructure: Factory, marketplace: Store, hybrid: Box, other: Lightbulb };
  const Icon = icons[type] || Lightbulb;
  return <Icon aria-hidden="true" />;
}

function ConceptVisual({ concept }: { concept: ProofOfMindConcept }) {
  return <div className="concept-card__visual">{concept.cover_image_url ? <img src={concept.cover_image_url} alt={concept.cover_image_alt || `${concept.title} concept visual`} loading="lazy" /> : <div className="concept-card__fallback"><ConceptIcon type={concept.concept_type} /><span>{humanize(concept.concept_type)}</span></div>}</div>;
}

function ConceptCard({ concept, onDiscovery }: { concept: ProofOfMindConcept; onDiscovery: (concept: ProofOfMindConcept) => void }) {
  const openable = canOpenProofOfMindConcept(concept);
  return <article className={`concept-card${concept.is_featured ? ' concept-card--featured' : ''}`}>
    <ConceptVisual concept={concept} />
    <div className="concept-card__meta"><span>{humanize(concept.concept_type)}</span><span>{concept.category}</span><span>{humanize(concept.concept_status)}</span>{concept.concept_format ? <span>{concept.concept_format}</span> : null}</div>
    <div className="concept-card__title-row"><h3>{concept.title}</h3>{concept.concept_score !== null ? <strong>{concept.concept_score}/10</strong> : null}</div>
    {concept.tagline ? <p className="concept-card__tagline">{concept.tagline}</p> : null}
    {concept.short_description ? <p className="concept-card__clamp">{concept.short_description}</p> : null}
    {concept.innovation_summary ? <div className="concept-card__innovation"><span>Why it is innovative</span><p>{concept.innovation_summary}</p></div> : null}
    <div className="concept-card__lists"><div><span>Problems solved</span><ol>{concept.problems_solved.slice(0, 3).map((item) => <li key={item}>{item}</li>)}</ol></div><div><span>Core capabilities</span><ul>{concept.key_features.slice(0, 5).map((item) => <li key={item}>{item}</li>)}</ul></div></div>
    <div className="concept-card__footer"><span>{concept.is_featured ? 'Featured' : 'Portfolio concept'}</span><span>{openable ? 'Full public page' : 'Protected teaser'}</span>{concept.primary_market ? <span>{concept.primary_market}</span> : null}</div>
    {openable ? <a className="button button--small" href={`/proof-of-mind/${concept.slug}`}>View Proof of Mind <ArrowRight size={16} aria-hidden="true" /></a> : <button className="button button--small" type="button" onClick={() => onDiscovery(concept)}>Register interest</button>}
  </article>;
}


const interestTypes = ['potential customer', 'launch partner', 'investor', 'developer/builder', 'sponsor', 'media', 'other'];

function DiscoveryCallModal({ concept, onClose }: { concept: ProofOfMindConcept; onClose: () => void }) {
  const [form, setForm] = useState({ full_name: '', email: '', company: '', role: '', country: '', interest_message: '', consent_to_contact: false, website: '', linkedin: '', interest_type: 'potential customer' });
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault();
    const payload = { concept_id: concept.id, ...form };
    try {
      validateProofOfMindDiscoveryInput(payload);
    } catch (error) {
      setState('error');
      setMessage(error instanceof Error ? error.message : 'Please complete the required fields.');
      return;
    }
    setState('loading');
    setMessage('');
    try {
      await submitProofOfMindDiscovery(payload);
      setState('success');
      setMessage(`Thank you. Your discovery call request has been saved and linked to ${concept.title}. We will contact you soon.`);
    } catch {
      setState('error');
      setMessage('The request could not be saved. Please try again shortly.');
    }
  }
  const set = (key: keyof typeof form, value: string | boolean) => setForm((current) => ({ ...current, [key]: value }));
  return <div className="discovery-modal" role="dialog" aria-modal="true" aria-labelledby="discovery-title">
    <div className="discovery-modal__panel">
      <button className="discovery-modal__close" type="button" onClick={onClose} aria-label="Close discovery call form"><X size={18} /></button>
      {state === 'success' ? <div className="impact-state"><CheckCircle aria-hidden="true" /><div><strong>Request received.</strong><br />{message}</div><button className="button button--small" type="button" onClick={onClose}>Close</button></div> : <form className="application-form journal-form discovery-form" onSubmit={submit}>
        <p className="eyebrow">Book Discovery Call</p>
        <h2 id="discovery-title">Discuss {concept.title}</h2>
        <p>The selected concept is <strong>{concept.title}</strong>. This form records interest only; protected full concept data remains private.</p>
        <div className="form-grid"><label>Full name<input required value={form.full_name} onChange={(e) => set('full_name', e.target.value)} /></label><label>Email<input required type="email" value={form.email} onChange={(e) => set('email', e.target.value)} /></label></div>
        <div className="form-grid"><label>Company or organisation<input required value={form.company} onChange={(e) => set('company', e.target.value)} /></label><label>Role<input required value={form.role} onChange={(e) => set('role', e.target.value)} /></label></div>
        <label>Country/location<input required value={form.country} onChange={(e) => set('country', e.target.value)} /></label>
        <div className="form-grid"><label>Website <span className="optional-label">optional</span><input type="url" value={form.website} onChange={(e) => set('website', e.target.value)} /></label><label>LinkedIn <span className="optional-label">optional</span><input type="url" value={form.linkedin} onChange={(e) => set('linkedin', e.target.value)} /></label></div>
        <label>Interest type <span className="optional-label">optional</span><select value={form.interest_type} onChange={(e) => set('interest_type', e.target.value)}>{interestTypes.map((type) => <option key={type} value={type}>{type}</option>)}</select></label>
        <label>Why does this concept interest you?<textarea required rows={5} value={form.interest_message} onChange={(e) => set('interest_message', e.target.value)} /></label>
        <label><input type="checkbox" required checked={form.consent_to_contact} onChange={(e) => set('consent_to_contact', e.target.checked)} /> I consent to be contacted about this concept.</label>
        <div className={`form-status ${state === 'error' ? 'impact-state--error' : ''}`} role="status">{state === 'loading' ? 'Saving your discovery call request…' : message || 'Your lead will be stored in Supabase and linked to this concept.'}</div>
        <div className="hero__actions"><button className="button" disabled={state === 'loading'} type="submit">Submit discovery request</button><button className="button button--ghost" type="button" onClick={onClose}>Cancel</button></div>
      </form>}
    </div>
  </div>;
}

export function ProofOfMindPage() {
  const [concepts, setConcepts] = useState<ProofOfMindConcept[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [selectedConcept, setSelectedConcept] = useState<ProofOfMindConcept | null>(null);

  const load = () => { setStatus('loading'); getProofOfMindConcepts().then((rows) => { setConcepts(rows); setStatus('ready'); }).catch(() => setStatus('error')); };
  useEffect(load, []);

  const categories = useMemo(() => ['all', ...Array.from(new Set(concepts.map((concept) => concept.category))).sort()], [concepts]);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return concepts.filter((concept) => (category === 'all' || concept.category === category) && (!needle || [concept.title, concept.tagline, concept.short_description, concept.innovation_summary, concept.category, concept.concept_status, concept.concept_type, concept.concept_format, concept.delivery_model, concept.primary_market, ...concept.tags].filter(Boolean).join(' ').toLowerCase().includes(needle)));
  }, [category, concepts, query]);
  const fullCount = concepts.filter(canOpenProofOfMindConcept).length;

  return <main id="top" className="proof-page"><section className="hero proof-hero section-grid" aria-labelledby="proof-title"><div className="hero__content"><p className="eyebrow">PROOF OF MIND</p><h1 id="proof-title">Ideas are easy to dismiss. A body of work is harder to ignore.</h1><p className="hero__lede">A growing portfolio of venture concepts, platforms, products, services, experiences and communities conceived from lived experience, observed problems and a relentless drive to build something better.</p><div className="proof-search" role="search"><label htmlFor="proof-search"><Search size={16} aria-hidden="true" /> Search concepts</label><input id="proof-search" value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Search by title, tag or category" /></div></div><aside className="hero-card"><Lightbulb aria-hidden="true"/><blockquote>Founder-controlled visibility.</blockquote><p>Hidden records stay private. Teasers reveal only approved public summaries. Full concepts open only when explicitly marked as public.</p></aside></section><section className="section proof-stats" aria-label="Proof of Mind statistics"><article><span>{concepts.length}</span><p>Visible concepts</p></article><article><span>{Math.max(categories.length - 1, 0)}</span><p>Categories</p></article><article><span>{fullCount}</span><p>Fully revealed concepts</p></article></section><section className="section" aria-labelledby="proof-archive-title"><SectionHeading eyebrow="Public archive" title="Explore selected concepts" titleId="proof-archive-title">Concepts are ordered from Supabase display order. Use search and category filters to find ventures that match your interests.</SectionHeading><div className="concept-filters" aria-label="Concept filters">{categories.map((item) => <button key={item} type="button" className={category === item ? 'is-active' : ''} onClick={() => setCategory(item)}>{item === 'all' ? 'All concepts' : item}</button>)}</div>{status === 'loading' ? <div className="proof-skeleton" role="status">Loading Proof of Mind concepts…</div> : null}{status === 'error' ? <ProofOfMindErrorState onRetry={load} /> : null}{status === 'ready' && !concepts.length ? <ProofOfMindEmptyState /> : null}{status === 'ready' && concepts.length && !filtered.length ? <div className="impact-state">No visible concepts match the current filters.</div> : null}<div className="concept-grid">{filtered.map((concept) => <ConceptCard key={concept.id} concept={concept} onDiscovery={setSelectedConcept} />)}</div></section>{selectedConcept ? <DiscoveryCallModal concept={selectedConcept} onClose={() => setSelectedConcept(null)} /> : null}</main>;
}

function DetailBlock({ title, children }: { title: string; children?: ReactNode }) {
  if (!children) return null;
  return <section className="concept-detail-section"><h2>{title}</h2>{children}</section>;
}

export function ProofOfMindDetailPage({ slug }: { slug: string }) {
  const [concept, setConcept] = useState<ProofOfMindConceptDetail | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const load = () => { setStatus('loading'); getProofOfMindConceptBySlug(slug).then((row) => { setConcept(row); setStatus('ready'); }).catch(() => setStatus('error')); };
  useEffect(load, [slug]);
  if (status === 'loading') return <main className="section"><div className="proof-skeleton" role="status">Loading concept detail…</div></main>;
  if (status === 'error') return <main className="section"><ProofOfMindErrorState onRetry={load} /></main>;
  if (!concept) return <main className="section"><div className="impact-state impact-state--error" role="alert"><strong>Concept not found or not public.</strong><br />This concept may be a protected teaser or no longer visible.</div></main>;
  return <main id="top" className="proof-page"><section className="hero proof-hero section-grid" aria-labelledby="concept-title"><div><p className="eyebrow">{concept.category} · {concept.concept_status}</p><h1 id="concept-title">{concept.title}</h1>{concept.tagline ? <p className="hero__lede">{concept.tagline}</p> : null}<p>{concept.short_description}</p><div className="concept-card__tags">{concept.tags.map((tag) => <span key={tag}>{tag}</span>)}</div></div><aside className="hero-card"><Lightbulb aria-hidden="true"/><blockquote>Fully public concept.</blockquote><p>This page is shown only because the public detail view returns it as a fully visible concept.</p>{(concept.detail_cta_url || concept.external_url) ? <a className="button button--small" href={concept.detail_cta_url || concept.external_url || '#'} target="_blank" rel="noreferrer">{concept.detail_cta_label || 'Open external link'} <ExternalLink size={16} aria-hidden="true" /></a> : null}</aside></section><div className="section concept-detail"><DetailBlock title="Concept overview">{concept.full_description || concept.innovation_summary || concept.vision_statement ? <><p>{concept.full_description}</p><p>{concept.innovation_summary}</p><p>{concept.vision_statement}</p></> : null}</DetailBlock><DetailBlock title="Problem and solution">{concept.problem_statement || concept.problems_solved.length || concept.solution_overview ? <><p>{concept.problem_statement}</p>{concept.problems_solved.length ? <ul>{concept.problems_solved.map((item) => <li key={item}>{item}</li>)}</ul> : null}<p>{concept.solution_overview}</p></> : null}</DetailBlock><DetailBlock title="Audience and use cases">{concept.target_audience || concept.target_users.length || concept.key_use_cases.length ? <><p>{concept.target_audience}</p>{concept.target_users.length ? <ul>{concept.target_users.map((item) => <li key={item}>{item}</li>)}</ul> : null}{concept.key_use_cases.length ? <ul>{concept.key_use_cases.map((item) => <li key={item}>{item}</li>)}</ul> : null}</> : null}</DetailBlock><DetailBlock title="Core capabilities">{concept.key_features.length ? <ul>{concept.key_features.map((feature) => <li key={feature}>{feature}</li>)}</ul> : null}</DetailBlock><DetailBlock title="Differentiation">{concept.differentiation_points.length || concept.market_opportunity ? <><ul>{concept.differentiation_points.map((item) => <li key={item}>{item}</li>)}</ul><p>{concept.market_opportunity}</p></> : null}</DetailBlock><DetailBlock title="Business and validation">{concept.business_model_summary || concept.business_model || concept.validation_summary || concept.validation_evidence.length ? <><p>{concept.business_model_summary}</p><p>{concept.business_model}</p><p>{concept.validation_summary}</p><ul>{concept.validation_evidence.map((item) => <li key={item}>{item}</li>)}</ul></> : null}</DetailBlock><DetailBlock title="Roadmap and collaboration">{concept.roadmap_summary || concept.collaboration_opportunities.length ? <><p>{concept.roadmap_summary}</p><ul>{concept.collaboration_opportunities.map((item) => <li key={item}>{item}</li>)}</ul></> : null}</DetailBlock><DetailBlock title="Media and links">{concept.gallery_images.length || concept.demo_url || concept.pitch_deck_url || concept.external_url ? <><div className="concept-gallery">{concept.gallery_images.map((image) => <img key={image} src={image} alt={`${concept.title} gallery visual`} loading="lazy" />)}</div><div className="concept-links">{concept.demo_url ? <a href={concept.demo_url} target="_blank" rel="noreferrer">Demo</a> : null}{concept.pitch_deck_url ? <a href={concept.pitch_deck_url} target="_blank" rel="noreferrer">Pitch deck</a> : null}{concept.external_url ? <a href={concept.external_url} target="_blank" rel="noreferrer">External site</a> : null}</div></> : null}</DetailBlock></div></main>;
}
