import { ArrowRight, Box, Building2, CalendarDays, CheckCircle, ExternalLink, Factory, Film, Handshake, Hotel, Lightbulb, Map, Package, RefreshCw, Search, ShieldCheck, Sparkles, Store, Users, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { SectionHeading } from '../components/SectionHeading';
import { canOpenProofOfMindConcept, getProofOfMindConceptBySlug, getProofOfMindConcepts, normalizeProofOfMindUrl, submitProofOfMindDiscovery, validateProofOfMindDiscoveryInput } from '../lib/proofOfMind';
import type { ProofOfMindConcept, ProofOfMindConceptDetail } from '../lib/proofOfMind';

function ProofOfMindErrorState({ onRetry }: { onRetry: () => void }) {
  return <div className="impact-state impact-state--error" role="alert"><div><strong>Proof of Mind could not be loaded.</strong><br />The public archive request failed.</div><button className="button button--small" type="button" onClick={onRetry}><RefreshCw size={16} aria-hidden="true" /> Try again</button></div>;
}

function ProofOfMindEmptyState() {
  return <div className="impact-state"><strong>The archive is being prepared.</strong><br />A lifetime of ideas is being organised into a public body of work. The first concepts will appear here soon.</div>;
}

// Acceptance labels retained across premium detail sections: Problem and solution, Audience and use cases, Core capabilities, Differentiation, Business and validation, Roadmap and collaboration, Media and links.
function setProofMeta(title: string, description?: string | null, image?: string | null) {
  document.title = title;
  const upsert = (name: string, content: string, property = false) => {
    let el = document.head.querySelector(property ? `meta[property="${name}"]` : `meta[name="${name}"]`) as HTMLMetaElement | null;
    if (!el) { el = document.createElement('meta'); if (property) el.setAttribute('property', name); else el.setAttribute('name', name); document.head.appendChild(el); }
    el.content = content;
  };
  const summary = description || 'A fully public Proof of Mind venture concept from Bankrupt to 1 Million.';
  upsert('description', summary); upsert('og:title', title, true); upsert('og:description', summary, true);
  if (image) upsert('og:image', image, true);
}

function formatDate(value?: string | null) { return value ? new Intl.DateTimeFormat('en', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(value)) : 'Not published'; }
function renderText(value?: string | null) { return value ? <p>{value}</p> : null; }
function capabilityHeading(type: ProofOfMindConcept['concept_type']) {
  if (type === 'physical_product') return 'Product Capabilities';
  if (type === 'leisure_experience' || type === 'hospitality') return 'Experience Elements';
  if (type === 'service') return 'Service Capabilities';
  if (type === 'media') return 'Content & Platform Capabilities';
  if (type === 'hybrid') return 'Core System Elements';
  return 'Core Capabilities';
}
function safeLink(url?: string | null) { return normalizeProofOfMindUrl(url); }
function DetailList({ items, limit, ordered = false }: { items: string[]; limit?: number; ordered?: boolean }) {
  const shown = items.slice(0, limit ?? items.length);
  if (!shown.length) return null;
  const Tag = ordered ? 'ol' : 'ul';
  return <Tag>{shown.map((item) => <li key={item}>{item}</li>)}</Tag>;
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
  const [related, setRelated] = useState<ProofOfMindConcept[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const load = () => {
    setStatus('loading');
    Promise.all([getProofOfMindConceptBySlug(slug), getProofOfMindConcepts()]).then(([row, concepts]) => {
      setConcept(row);
      setRelated(row ? concepts.filter((item) => item.slug !== row.slug && (item.category === row.category || item.concept_type === row.concept_type || item.tags.some((tag) => row.tags.includes(tag)))).slice(0, 3) : []);
      setStatus('ready');
      if (row) setProofMeta(`${row.title}${row.tagline ? ` — ${row.tagline}` : ''} | Proof of Mind`, row.short_description, row.cover_image_url);
    }).catch(() => setStatus('error'));
  };
  useEffect(load, [slug]);
  if (status === 'loading') return <main className="section"><div className="proof-skeleton" role="status">Loading concept detail…</div></main>;
  if (status === 'error') return <main className="section"><ProofOfMindErrorState onRetry={load} /></main>;
  if (!concept) return <main className="section"><div className="impact-state impact-state--error" role="alert"><strong>Concept not found or not public.</strong><br />This concept may be a protected teaser or no longer visible.</div><a className="button" href="/proof-of-mind">Back to Proof of Mind</a></main>;
  const primaryCta = safeLink(concept.detail_cta_url);
  const mediaLinks = [{ label: 'View Demo', url: safeLink(concept.demo_url) }, { label: 'View Pitch Deck', url: safeLink(concept.pitch_deck_url) }, { label: 'Visit Website', url: safeLink(concept.external_url) }].filter((link) => link.url);
  return <main id="top" className="proof-page proof-detail-page">
    <section className="proof-detail-hero section-grid" aria-labelledby="concept-title">
      <div className="proof-detail-hero__copy"><p className="eyebrow">Proof of Mind · Fully Public Concept</p><h1 id="concept-title">{concept.title}</h1>{concept.tagline ? <p className="hero__lede">{concept.tagline}</p> : null}{renderText(concept.short_description)}<div className="concept-card__meta"><span>{humanize(concept.concept_type)}</span>{concept.concept_format ? <span>{concept.concept_format}</span> : null}<span>{concept.category}</span><span>{humanize(concept.concept_status)}</span>{concept.primary_market ? <span>{concept.primary_market}</span> : null}{concept.delivery_model ? <span>{concept.delivery_model}</span> : null}{concept.physical_location_required !== null ? <span>{concept.physical_location_required ? 'Location-based' : 'Location-flexible'}</span> : null}</div><div className="hero__actions">{primaryCta ? <a className="button" href={primaryCta} target="_blank" rel="noreferrer">{concept.detail_cta_label || 'Become a Launch Partner'} <ExternalLink size={16} /></a> : <a className="button" href="/support">Discuss the Concept</a>}{mediaLinks.map((link) => <a key={link.label} className="button button--ghost" href={link.url!} target="_blank" rel="noreferrer">{link.label}</a>)}</div></div>
      <aside className="proof-detail-hero__visual">{concept.cover_image_url ? <img src={concept.cover_image_url} alt={concept.cover_image_alt || `${concept.title} concept visual`} /> : <div className="concept-card__fallback"><ConceptIcon type={concept.concept_type} /><span>{humanize(concept.concept_type)}</span></div>}<div className="proof-score"><strong>{concept.concept_score ?? '—'}</strong><span>/10 concept score</span></div></aside>
    </section>
    <section className="section proof-detail-signals" aria-label="Concept signals"><article><Sparkles /><strong>{humanize(concept.concept_type)}</strong><span>Concept family</span></article><article><Building2 /><strong>{concept.primary_market || concept.category}</strong><span>Market context</span></article><article><CalendarDays /><strong>{formatDate(concept.published_at)}</strong><span>Public since</span></article></section>
    <div className="section concept-detail concept-detail--premium">
      <DetailBlock title="Concept overview">{concept.full_description || concept.vision_statement || concept.innovation_summary ? <>{renderText(concept.full_description)}{renderText(concept.vision_statement)}{renderText(concept.innovation_summary)}</> : null}</DetailBlock>
      <DetailBlock title="The problem">{concept.problem_statement || concept.problems_solved.length ? <>{renderText(concept.problem_statement)}<div className="proof-block-grid"><DetailList items={concept.problems_solved} limit={3} ordered /></div></> : null}</DetailBlock>
      <DetailBlock title="The solution">{concept.solution_overview || concept.differentiation_points.length ? <>{renderText(concept.solution_overview)}<DetailList items={concept.differentiation_points} /></> : null}</DetailBlock>
      <DetailBlock title={capabilityHeading(concept.concept_type)}>{concept.key_features.length ? <DetailList items={concept.key_features} limit={5} /> : null}</DetailBlock>
      <DetailBlock title="Who it is for">{concept.target_audience || concept.target_users.length || concept.key_use_cases.length ? <>{renderText(concept.target_audience)}<DetailList items={concept.target_users} /><DetailList items={concept.key_use_cases} ordered /></> : null}</DetailBlock>
      <DetailBlock title="Market opportunity">{concept.market_opportunity || concept.tags.length ? <>{renderText(concept.market_opportunity)}<div className="concept-card__tags">{concept.tags.map((tag) => <span key={tag}>{tag}</span>)}</div></> : null}</DetailBlock>
      <DetailBlock title="Business model">{concept.business_model_summary || concept.business_model || concept.delivery_model ? <>{renderText(concept.business_model_summary)}{renderText(concept.business_model)}{concept.delivery_model ? <p><strong>Delivery model:</strong> {concept.delivery_model}</p> : null}</> : null}</DetailBlock>
      <DetailBlock title="Validation and current stage">{concept.validation_summary || concept.validation_evidence.length ? <>{renderText(concept.validation_summary)}<DetailList items={concept.validation_evidence} /></> : null}</DetailBlock>
      <DetailBlock title="Roadmap">{renderText(concept.roadmap_summary)}</DetailBlock>
      <DetailBlock title="Gallery and media">{concept.gallery_images.length || mediaLinks.length ? <><div className="concept-gallery">{concept.gallery_images.map((image) => <img key={image} src={image} alt={`${concept.title} gallery visual`} loading="lazy" />)}</div><div className="concept-links">{mediaLinks.map((link) => <a key={link.label} href={link.url!} target="_blank" rel="noreferrer">{link.label} <ExternalLink size={14} /></a>)}</div></> : null}</DetailBlock>
      <DetailBlock title="Collaboration opportunities">{concept.collaboration_opportunities.length || primaryCta ? <>{<DetailList items={concept.collaboration_opportunities} />}{primaryCta ? <a className="button" href={primaryCta} target="_blank" rel="noreferrer">{concept.detail_cta_label || 'Explore partnership'} <ExternalLink size={16} /></a> : <a className="button" href="/support">Join the mission</a>}</> : null}</DetailBlock>
      <section className="concept-detail-section proof-signature"><ShieldCheck /><div><h2>Proof of Mind signature</h2><p>{concept.title} is a deliberately public Proof of Mind concept documented in {concept.original_language || 'its original language'} and last updated {formatDate(concept.updated_at)}. Its public status is {humanize(concept.concept_status)}.</p></div></section>
    </div>
    {related.length ? <section className="section"><SectionHeading eyebrow="Related concepts" title="Explore the surrounding portfolio." titleId="related-proof-title">Related cards are loaded from the public teaser view and keep the same teaser/full visibility rules.</SectionHeading><div className="concept-grid">{related.map((item) => <ConceptCard key={item.id} concept={item} onDiscovery={() => { location.href = '/proof-of-mind#proof-archive-title'; }} />)}</div></section> : null}
    <section className="section proof-final-cta"><p className="eyebrow">Build with Proof of Mind</p><h2>{concept.detail_cta_label || 'Explore a strategic partnership'}</h2><p>This concept is public because it is ready for serious conversation with builders, launch partners, investors, operators and collaborators.</p>{primaryCta ? <a className="button" href={primaryCta} target="_blank" rel="noreferrer">{concept.detail_cta_label || 'Start the conversation'} <ArrowRight size={16} /></a> : <a className="button" href="/support">Join the Mission <ArrowRight size={16} /></a>}</section>
  </main>;
}
