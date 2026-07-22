import type { I18nManifest } from '../lib/i18nManifest';
import { ArrowRight, Box, Brain, Building2, CalendarDays, CheckCircle, ChevronDown, ChevronUp, Copy, Database, ExternalLink, Factory, Film, Handshake, Hotel, Image as ImageIcon, Lightbulb, LockKeyhole, Map, Package, RefreshCw, Search, Share2, ShieldCheck, Sparkles, Store, Target, Users, X } from 'lucide-react';
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
  return <div className="discovery-modal" role="dialog" aria-modal="true" aria-labelledby="discovery-title"><div className="discovery-modal__panel"><button className="discovery-modal__close" type="button" onClick={onClose} aria-label={t('proof_of_mind.discovery.close_aria', 'Close discovery call form')}><X size={18} /></button>{state === 'success' ? <div className="impact-state"><CheckCircle /><div><strong>{t('proof_of_mind.discovery.received', 'Request received.')}</strong><br />{message}</div><button className="button button--small" type="button" onClick={onClose}>{t('proof_of_mind.discovery.close', 'Close')}</button></div> : <form className="application-form journal-form discovery-form" onSubmit={submit}><p className="eyebrow">{t('proof_of_mind.discovery.eyebrow', 'Book Discovery Call')}</p><h2 id="discovery-title">{t('proof_of_mind.discovery.title', 'Discuss {title}', { title: concept.title })}</h2><p>{t('proof_of_mind.discovery.description', 'Tell us how you could help validate, build, fund or launch this concept.')}</p><div className="form-grid"><label>{t('proof_of_mind.discovery.full_name', 'Full name')}<input required value={form.full_name} onChange={(e) => set('full_name', e.target.value)} /></label><label>{t('proof_of_mind.discovery.email', 'Email')}<input required type="email" value={form.email} onChange={(e) => set('email', e.target.value)} /></label></div><div className="form-grid"><label>{t('proof_of_mind.discovery.company', 'Company or organisation')}<input required value={form.company} onChange={(e) => set('company', e.target.value)} /></label><label>{t('proof_of_mind.discovery.role', 'Role')}<input required value={form.role} onChange={(e) => set('role', e.target.value)} /></label></div><label>{t('proof_of_mind.discovery.country', 'Country/location')}<input required value={form.country} onChange={(e) => set('country', e.target.value)} /></label><div className="form-grid"><label>{t('proof_of_mind.discovery.website', 'Website')} <span className="optional-label">{t('proof_of_mind.discovery.optional', 'optional')}</span><input type="url" value={form.website} onChange={(e) => set('website', e.target.value)} /></label><label>{t('proof_of_mind.discovery.linkedin', 'LinkedIn')} <span className="optional-label">{t('proof_of_mind.discovery.optional', 'optional')}</span><input type="url" value={form.linkedin} onChange={(e) => set('linkedin', e.target.value)} /></label></div><label>{t('proof_of_mind.discovery.interest_type', 'How would you like to participate?')}<select value={form.interest_type} onChange={(e) => set('interest_type', e.target.value)}>{interestTypes.map((type) => <option value={type} key={type}>{humanize(type)}</option>)}</select></label><label>{t('proof_of_mind.discovery.message', 'Why does this concept interest you?')}<textarea required rows={5} value={form.interest_message} onChange={(e) => set('interest_message', e.target.value)} /></label><label className="consent-row"><input required type="checkbox" checked={form.consent_to_contact} onChange={(e) => set('consent_to_contact', e.target.checked)} /><span>{t('proof_of_mind.discovery.consent', 'I consent to being contacted about this concept.')}</span></label>{message ? <p className="form-message form-message--error" role="alert">{message}</p> : null}<button className="button" type="submit" disabled={state === 'loading'}>{state === 'loading' ? t('proof_of_mind.discovery.sending', 'Sending…') : t('proof_of_mind.discovery.submit', 'Request a conversation')}</button></form>}</div></div>;
}

function useConcepts() {
  const [concepts, setConcepts] = useState<ProofOfMindConcept[]>([]);
  const [state, setState] = useState<'loading' | 'success' | 'error'>('loading');
  const [retry, setRetry] = useState(0);
  useEffect(() => { let active = true; setState('loading'); getProofOfMindConcepts().then((data) => { if (active) { setConcepts(data); setState('success'); } }).catch(() => { if (active) setState('error'); }); return () => { active = false; }; }, [retry]);
  return { concepts, state, retry: () => setRetry((value) => value + 1) };
}

export function ProofOfMindPage() {
  const { t } = useWebsiteI18n();
  const { concepts, state, retry } = useConcepts();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [query, setQuery] = useState('');
  const [discoveryConcept, setDiscoveryConcept] = useState<ProofOfMindConcept | null>(null);
  useEffect(() => { setProofMeta('Proof of Mind — Bankrupt to 1 Million', 'A public archive of venture concepts, evaluations, competition research and collaboration opportunities.'); }, []);
  const categories = useMemo(() => ['All', ...Array.from(new Set(concepts.map((concept) => concept.category)))], [concepts]);
  const filtered = useMemo(() => concepts.filter((concept) => (selectedCategory === 'All' || concept.category === selectedCategory) && [concept.title, concept.tagline, concept.short_description, concept.category, ...concept.tags].filter(Boolean).join(' ').toLowerCase().includes(query.trim().toLowerCase())), [concepts, selectedCategory, query]);
  return <main className="proof-page">
    <section className="section proof-hero"><div className="container split-grid"><div><p className="eyebrow">PROOF OF MIND</p><h1>{t('proof_of_mind.hero.title', 'Ideas are easy to dismiss. A body of work is harder to ignore.')}</h1><p className="lead">{t('proof_of_mind.hero.description', 'Explore the concepts Kevin and Micha are developing, the evidence behind them and the people we want to build with.')}</p><div className="proof-search"><label htmlFor="proof-search"><Search size={16} /> {t('proof_of_mind.search.label', 'Search concepts')}</label><input id="proof-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('proof_of_mind.search.placeholder', 'Search by title, category or tag')} /></div></div><div className="proof-hero-card premium-card"><Brain size={38} /><h2>{t('proof_of_mind.hero.card_title', 'From private thought to public proof')}</h2><p>{t('proof_of_mind.hero.card_description', 'Every concept is connected to its founder, evaluation, market logic, competition research and opportunities for collaboration.')}</p></div></div></section>
    <section className="container proof-stats"><article><span>{concepts.length}</span><p>{t('proof_of_mind.stats.visible', 'Visible concepts')}</p></article><article><span>{concepts.filter((concept) => concept.visibility === 'full').length}</span><p>{t('proof_of_mind.stats.full', 'Full public concepts')}</p></article><article><span>{concepts.filter((concept) => concept.founder_video).length}</span><p>{t('proof_of_mind.stats.founder_videos', 'Founder videos')}</p></article></section>
    <section className="section"><div className="container"><SectionHeading eyebrow={t('proof_of_mind.archive.eyebrow', 'PUBLIC ARCHIVE')} title={t('proof_of_mind.archive.title', 'Proof of Mind concepts')} description={t('proof_of_mind.archive.description', 'Open the public concepts, share them and register your interest in helping one move forward.')} />
      <div className="concept-filters" aria-label={t('proof_of_mind.filters.aria', 'Filter concepts')}>{categories.map((category) => <button className={selectedCategory === category ? 'is-active' : ''} type="button" key={category} onClick={() => setSelectedCategory(category)}>{category}</button>)}</div>
      {state === 'loading' ? <div className="impact-state"><RefreshCw className="spin" /><strong>{t('proof_of_mind.loading', 'Loading concepts…')}</strong></div> : null}
      {state === 'error' ? <ProofOfMindErrorState onRetry={retry} /> : null}
      {state === 'success' && !concepts.length ? <ProofOfMindEmptyState /> : null}
      {state === 'success' && concepts.length && !filtered.length ? <div className="impact-state"><strong>{t('proof_of_mind.no_results.title', 'No concepts match your search.')}</strong><br />{t('proof_of_mind.no_results.description', 'Try another keyword or category.')}</div> : null}
      {state === 'success' && filtered.length ? <div className="concept-grid">{filtered.map((concept) => <ConceptCard concept={concept} onDiscovery={setDiscoveryConcept} key={concept.id} />)}</div> : null}
    </div></section>
    {discoveryConcept ? <DiscoveryCallModal concept={discoveryConcept} onClose={() => setDiscoveryConcept(null)} /> : null}
  </main>;
}

function DetailSection({ title, children, id }: { title: string; children: ReactNode; id?: string }) { return <section className="concept-detail-section" id={id}><h2>{title}</h2>{children}</section>; }

export function ProofOfMindDetailPage({ slug, manifest }: { slug: string; manifest?: I18nManifest }) {
  const { t } = useWebsiteI18n();
  const [concept, setConcept] = useState<ProofOfMindConceptDetail | null>(null);
  const [state, setState] = useState<'loading' | 'success' | 'error'>('loading');
  const [retry, setRetry] = useState(0);
  const [discoveryOpen, setDiscoveryOpen] = useState(false);
  useEffect(() => { let active = true; setState('loading'); getProofOfMindConceptBySlug(slug).then((data) => { if (!active) return; setConcept(data); setState('success'); if (data) { setProofMeta(`${data.title} — Proof of Mind`, data.share_description || data.short_description, data.og_image_url || data.cover_image_url); void trackProofOfMindEvent(data.id, 'detail_view', { slug }); } }).catch(() => { if (active) setState('error'); }); return () => { active = false; }; }, [slug, retry]);
  if (state === 'loading') return <main className="proof-page"><section className="section"><div className="container impact-state"><RefreshCw className="spin" /><strong>Loading concept…</strong></div></section></main>;
  if (state === 'error') return <main className="proof-page"><section className="section"><div className="container"><ProofOfMindErrorState onRetry={() => setRetry((value) => value + 1)} /></div></section></main>;
  if (!concept) return <main className="proof-page"><section className="section"><div className="container impact-state"><LockKeyhole /><div><strong>Concept not found or not public</strong><br />This concept may be hidden, available only as a teaser, or unpublished.</div><a className="button button--small" href="/proof-of-mind">Back to Proof of Mind</a></div></section></main>;
  const demoUrl = safeLink(concept.demo_url || concept.external_url);
  const pitchUrl = safeLink(concept.pitch_deck_url);
  return <main className="proof-page">
    <section className="section proof-detail-hero"><div className="container split-grid"><div className="proof-detail-hero__copy"><p className="eyebrow">{humanize(concept.concept_type)} · {concept.category}</p><h1>{concept.title}</h1>{concept.tagline ? <p className="lead">{concept.tagline}</p> : null}<p>{concept.short_description}</p><div className="proof-card-actions">{demoUrl ? <a className="button" href={demoUrl} target="_blank" rel="noreferrer">View Demo <ExternalLink size={16} /></a> : null}<button className="button button--ghost" type="button" onClick={() => setDiscoveryOpen(true)}>Book Discovery Call</button></div></div><div className="proof-detail-hero__visual">{concept.cover_image_url ? <img src={concept.cover_image_url} alt={concept.cover_image_alt || `${concept.title} cover`} /> : <div className="concept-card__fallback"><ConceptIcon type={concept.concept_type} /><span>{humanize(concept.concept_type)}</span></div>}<div className="proof-score"><strong>{concept.concept_score ?? '—'}</strong><span>Concept score / 10</span></div></div></div></section>
    <section className="container proof-detail-signals"><article><Target /><strong>{concept.primary_market || concept.target_audience || 'Market being validated'}</strong><span>Primary market</span></article><article><CalendarDays /><strong>{formatDate(concept.published_at)}</strong><span>Published</span></article><article><Users /><strong>{concept.founder?.name || 'Founder-led'}</strong><span>Founder</span></article><article><Database /><strong>{concept.key_features.length}</strong><span>Core capabilities</span></article></section>
    {concept.founder_video ? <section className="container proof-detail-founder-video"><FounderWordVideo concept={concept} /></section> : null}
    <section className="section"><div className="container concept-detail">
      <div className="proof-share-bar"><div><strong>{concept.share_headline || `Share ${concept.title}`}</strong><span>{concept.share_description || 'Help this concept reach the right builder, partner or investor.'}</span></div><div><button className="button button--small" type="button" onClick={() => void shareConcept(concept, 'detail')}>{concept.share_cta_label || 'Share concept'} <Share2 size={16} /></button>{concept.share_cta_url ? <a className="button button--ghost button--small" href={concept.share_cta_url}>Take action <ArrowRight size={16} /></a> : null}</div></div>
      <DetailSection title="Concept overview"><div className="proof-split"><article><h3>Vision</h3>{renderText(concept.vision_statement || concept.full_description)}</article><article><h3>Innovation</h3>{renderText(concept.innovation_summary)}</article></div>{concept.founder ? <div className="proof-founder"><span>{concept.founder.is_original_creator ? 'Original creator' : 'Founder'}</span><h3>{concept.founder.name}</h3>{concept.founder.role ? <p>{concept.founder.role}</p> : null}{renderText(concept.founder.bio)}</div> : null}</DetailSection>
      <DetailSection title="Problem and solution"><div className="proof-split"><article><h3>Problem</h3>{renderText(concept.problem_statement)}</article><article><h3>Solution</h3>{renderText(concept.solution_overview)}</article></div><div className="concept-card__lists"><div><span>Problems solved</span><DetailList items={concept.problems_solved} ordered /></div><div><span>Key use cases</span><DetailList items={concept.key_use_cases} /></div></div></DetailSection>
      <DetailSection title="Market & audience profile"><div className="proof-market-columns"><article><h3>Target users</h3><DetailList items={concept.target_users} /></article><article><h3>Differentiation</h3><DetailList items={concept.differentiation_points} /></article></div>{concept.market_profile ? <><div className="proof-market-block"><h3>Primary audiences</h3><StructuredItems items={valueList(concept.market_profile.primary_audience)} /></div><div className="proof-market-block"><h3>Jobs, pains and outcomes</h3><StructuredItems items={[...valueList(concept.market_profile.jobs_to_be_done), ...valueList(concept.market_profile.pain_points), ...valueList(concept.market_profile.desired_outcomes)]} /></div></> : null}</DetailSection>
      <DetailSection title="Core capabilities">{concept.feature_groups.length ? <div className="proof-feature-groups">{concept.feature_groups.map((group) => <article key={group.group_key}><div className="proof-feature-group__head"><div><h3>{group.group_name}</h3>{renderText(group.group_description)}</div>{group.user_role ? <span>{group.user_role}</span> : null}</div><ul>{group.features.map((feature) => <li key={feature.feature_key}><div><strong>{feature.feature_name}</strong>{renderText(feature.feature_description)}</div><span>{[feature.priority, feature.release_phase].filter(Boolean).join(' · ')}</span></li>)}</ul></article>)}</div> : <DetailList items={concept.key_features} />}</DetailSection>
      {concept.ai_features.length ? <DetailSection title="AI features"><div className="proof-ai-grid">{concept.ai_features.map((feature, index) => <article key={`${feature.name}-${index}`}><Brain /><span className="proof-number">{String(index + 1).padStart(2, '0')}</span><h3>{feature.name}</h3>{renderText(feature.purpose)}<DetailList items={feature.outputs} limit={3} />{feature.safety ? <p className="proof-safety"><ShieldCheck size={14} /> {feature.safety}</p> : null}</article>)}</div></DetailSection> : null}
      {concept.external_api_providers.length ? <DetailSection title="External API and data providers"><div className="proof-api-grid">{concept.external_api_providers.map((provider) => <article key={provider.provider}><Database /><h3>{provider.provider}</h3>{provider.category ? <p className="proof-kicker">{provider.category}</p> : null}<DetailList items={provider.use_cases} />{renderText(provider.privacy_note)}</article>)}</div></DetailSection> : null}
      {concept.mockup_screens.length ? <DetailSection title="Mockups and visual direction"><div className="proof-mockup-grid">{concept.mockup_screens.map((screen) => <article key={screen.screen_key}>{screen.image_url ? <img src={screen.image_url} alt={screen.image_alt || screen.screen_name} /> : <div className="proof-mockup-placeholder"><ImageIcon /><strong>{screen.screen_name}</strong><small>{screen.image_status || 'Visual pending'}</small></div>}<div className="proof-mockup-copy"><span>{screen.primary_user_role}</span><h3>{screen.screen_name}</h3>{renderText(screen.screen_purpose)}<DetailList items={screen.main_components} limit={5} /></div></article>)}</div></DetailSection> : null}
      <DetailSection title="Competition and differentiation"><div className="proof-advantage"><strong>Why we are different</strong>{renderText(concept.competition.competitive_advantage || concept.innovation_summary)}</div>{concept.competition.comparisons.length ? <div className="proof-comparison-grid">{concept.competition.comparisons.map((competitor) => <article key={competitor.name}><h3>{competitor.name}</h3>{competitor.product ? <p className="proof-kicker">{competitor.product}</p> : null}{renderText(competitor.differences)}{competitor.our_advantage ? <p><strong>Our edge:</strong> {competitor.our_advantage}</p> : null}{competitor.strategic_risk ? <p><strong>Risk:</strong> {competitor.strategic_risk}</p> : null}</article>)}</div> : renderText(concept.competition.summary || concept.competition_summary)}</DetailSection>
      {concept.evaluation ? <DetailSection title="Commercial evaluation"><div className="proof-score-row"><ScoreBadge label="Average" value={concept.evaluation.average_score} /><ScoreBadge label="Concept" value={concept.concept_score} /></div><div className="proof-evaluation-list">{concept.evaluation.criteria.map((criterion) => <article key={criterion.criterion}><div><h3>{criterion.criterion}</h3><strong>{criterion.score !== null ? `${criterion.score}/10` : '—'}</strong></div>{renderText(criterion.assessment)}{criterion.risks.length ? <><h4>Risks</h4><DetailList items={criterion.risks} /></> : null}{criterion.improvement_actions.length ? <><h4>Improvement actions</h4><DetailList items={criterion.improvement_actions} /></> : null}</article>)}</div></DetailSection> : null}
      <DetailSection title="Market, business model and validation"><div className="proof-split"><article><h3>Market opportunity</h3>{renderText(concept.market_opportunity)}</article><article><h3>Business model</h3>{renderText(concept.business_model_summary || concept.business_model)}</article></div><h3>Validation</h3>{renderText(concept.validation_summary)}<DetailList items={concept.validation_evidence} /></DetailSection>
      <DetailSection title="Roadmap">{renderText(concept.roadmap_summary)}</DetailSection>
      {concept.lead_pipeline ? <DetailSection title="Partner and lead opportunities"><p>{concept.lead_pipeline.category_count} partner categories · {concept.lead_pipeline.target_slots} target slots · {concept.lead_pipeline.identified_leads} identified leads.</p>{concept.lead_pipeline.categories.length ? <div className="proof-lead-grid">{concept.lead_pipeline.categories.map((category) => <article key={category.name}><h3>{category.name}</h3>{renderText(category.strategic_goal)}{renderText(category.default_outreach_angle)}<p className="proof-kicker">{category.identified_leads}/{category.target_slots} identified</p></article>)}</div> : null}</DetailSection> : null}
      <DetailSection title="Who we want to meet"><DetailList items={concept.collaboration_opportunities} />{pitchUrl ? <a className="button button--ghost" href={pitchUrl} target="_blank" rel="noreferrer">View pitch deck <ExternalLink size={16} /></a> : null}</DetailSection>
      <section className="concept-detail-section proof-signature"><Sparkles /><div><strong>Proof of Mind</strong><p>This concept is documented publicly to attract constructive feedback, partners and the people who can help turn it into tangible progress.</p></div></section>
      <section className="concept-detail-section proof-final-cta"><h2>Could you help move {concept.title} forward?</h2><p>We are looking for builders, launch partners, customers, investors, sponsors and media collaborators who see the potential.</p><button className="button" type="button" onClick={() => setDiscoveryOpen(true)}>Book Discovery Call <ArrowRight size={16} /></button></section>
    </div></section>
    {discoveryOpen ? <DiscoveryCallModal concept={concept} onClose={() => setDiscoveryOpen(false)} /> : null}
  </main>;
}
