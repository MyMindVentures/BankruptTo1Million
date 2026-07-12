import { ArrowRight, CheckCircle, ExternalLink, Lightbulb, RefreshCw, Search, X } from 'lucide-react';
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

// Replaces the previous disabled Teaser only card state with a working discovery CTA.
function ConceptCard({ concept, onDiscovery }: { concept: ProofOfMindConcept; onDiscovery: (concept: ProofOfMindConcept) => void }) {
  const openable = canOpenProofOfMindConcept(concept);
  return <article className={`concept-card${concept.is_featured ? ' concept-card--featured' : ''}`}>
    <div className="concept-card__meta"><span>{concept.category}</span><span>{concept.status}</span></div>
    <h3>{concept.title}</h3>
    {concept.tagline ? <p className="concept-card__tagline">{concept.tagline}</p> : null}
    {concept.short_description ? <p>{concept.short_description}</p> : null}
    <div className="concept-card__tags">{concept.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
    <div className="concept-card__footer"><span>{concept.is_featured ? 'Featured' : 'Archive concept'}</span><span>{openable ? 'Fully openable' : 'Protected teaser'}</span></div>
    {openable ? <a className="button button--small" href={`/proof-of-mind/${concept.slug}`}>Open full concept <ArrowRight size={16} aria-hidden="true" /></a> : <button className="button button--small" type="button" onClick={() => onDiscovery(concept)}>Book Discovery Call</button>}
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
      setMessage('Thank you. Your discovery call request has been saved and linked to Maritex AI. We will contact you soon.');
    } catch (error) {
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
    return concepts.filter((concept) => (category === 'all' || concept.category === category) && (!needle || [concept.title, concept.tagline, concept.short_description, concept.category, concept.status, ...concept.tags].filter(Boolean).join(' ').toLowerCase().includes(needle)));
  }, [category, concepts, query]);
  const fullCount = concepts.filter(canOpenProofOfMindConcept).length;

  return <main id="top" className="proof-page"><section className="hero proof-hero section-grid" aria-labelledby="proof-title"><div className="hero__content"><p className="eyebrow">PROOF OF MIND</p><h1 id="proof-title">Ideas are easy to dismiss. A body of work is harder to ignore.</h1><p className="hero__lede">A growing archive of ventures, platforms and products conceived from lived experience, observed problems and a relentless drive to build something better.</p><div className="proof-search" role="search"><label htmlFor="proof-search"><Search size={16} aria-hidden="true" /> Search concepts</label><input id="proof-search" value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Search by title, tag or category" /></div></div><aside className="hero-card"><Lightbulb aria-hidden="true"/><blockquote>Founder-controlled visibility.</blockquote><p>Hidden records stay private. Teasers reveal only approved public summaries. Full concepts open only when explicitly marked as public.</p></aside></section><section className="section proof-stats" aria-label="Proof of Mind statistics"><article><span>{concepts.length}</span><p>Visible concepts</p></article><article><span>{Math.max(categories.length - 1, 0)}</span><p>Categories</p></article><article><span>{fullCount}</span><p>Fully revealed concepts</p></article></section><section className="section" aria-labelledby="proof-archive-title"><SectionHeading eyebrow="Public archive" title="Explore selected concepts" titleId="proof-archive-title">Featured concepts appear first. Use search and category filters to find the ideas that match your interests.</SectionHeading><div className="concept-filters" aria-label="Concept filters">{categories.map((item) => <button key={item} type="button" className={category === item ? 'is-active' : ''} onClick={() => setCategory(item)}>{item === 'all' ? 'All concepts' : item}</button>)}</div>{status === 'loading' ? <div className="proof-skeleton" role="status">Loading Proof of Mind concepts…</div> : null}{status === 'error' ? <ProofOfMindErrorState onRetry={load} /> : null}{status === 'ready' && !concepts.length ? <ProofOfMindEmptyState /> : null}{status === 'ready' && concepts.length && !filtered.length ? <div className="impact-state">No visible concepts match the current filters.</div> : null}<div className="concept-grid">{filtered.map((concept) => <ConceptCard key={concept.id} concept={concept} onDiscovery={setSelectedConcept} />)}</div></section>{selectedConcept ? <DiscoveryCallModal concept={selectedConcept} onClose={() => setSelectedConcept(null)} /> : null}</main>;
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
  return <main id="top" className="proof-page"><section className="hero proof-hero section-grid" aria-labelledby="concept-title"><div><p className="eyebrow">{concept.category} · {concept.status}</p><h1 id="concept-title">{concept.title}</h1>{concept.tagline ? <p className="hero__lede">{concept.tagline}</p> : null}<p>{concept.short_description}</p><div className="concept-card__tags">{concept.tags.map((tag) => <span key={tag}>{tag}</span>)}</div></div><aside className="hero-card"><Lightbulb aria-hidden="true"/><blockquote>Fully public concept.</blockquote><p>This page is shown only because the public RPC marks the concept as fully openable.</p>{concept.external_url ? <a className="button button--small" href={concept.external_url} target="_blank" rel="noreferrer">Open external link <ExternalLink size={16} aria-hidden="true" /></a> : null}</aside></section><div className="section concept-detail"><DetailBlock title="Problem">{concept.problem ? <p>{concept.problem}</p> : null}</DetailBlock><DetailBlock title="Solution">{concept.solution ? <p>{concept.solution}</p> : null}</DetailBlock><DetailBlock title="Target audience">{concept.target_audience ? <p>{concept.target_audience}</p> : null}</DetailBlock><DetailBlock title="Key features">{concept.key_features.length ? <ul>{concept.key_features.map((feature) => <li key={feature}>{feature}</li>)}</ul> : null}</DetailBlock><DetailBlock title="Business model">{concept.business_model ? <p>{concept.business_model}</p> : null}</DetailBlock></div></main>;
}
