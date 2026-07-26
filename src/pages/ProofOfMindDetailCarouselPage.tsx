import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Database, RefreshCw, Share2, Sparkles, Target, Users } from 'lucide-react';
import { ProofMockupCarousel } from '../components/ProofMockupCarousel';
import { getProofOfMindConceptBySlug, trackProofOfMindEvent } from '../lib/proofOfMind';
import type { ProofOfMindConceptDetail } from '../lib/proofOfMind';
import '../styles/proofOfMind.css';
import '../styles/proofMockupCarousel.css';

function formatDate(value?: string | null) {
  return value ? new Intl.DateTimeFormat('en', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(value)) : 'Not published';
}

function humanize(value?: string | null) {
  return value ? value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()) : null;
}

export function ProofOfMindDetailCarouselPage({ slug }: { slug: string }) {
  const [concept, setConcept] = useState<ProofOfMindConceptDetail | null>(null);
  const [state, setState] = useState<'loading' | 'success' | 'error'>('loading');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    setState('loading');
    getProofOfMindConceptBySlug(slug)
      .then((data) => {
        if (!active) return;
        setConcept(data);
        setState('success');
        if (data) void trackProofOfMindEvent(data.id, 'detail_view', { slug, source: 'carousel_detail_page' });
      })
      .catch(() => { if (active) setState('error'); });
    return () => { active = false; };
  }, [slug, retry]);

  if (state === 'loading') {
    return <main className="proof-page"><section className="section"><div className="container impact-state"><RefreshCw className="spin" /><strong>Loading concept…</strong></div></section></main>;
  }

  if (state === 'error') {
    return <main className="proof-page"><section className="section"><div className="container impact-state impact-state--error"><strong>Proof of Mind could not be loaded.</strong><button className="button button--small" type="button" onClick={() => setRetry((value) => value + 1)}>Try again</button></div></section></main>;
  }

  if (!concept) {
    return <main className="proof-page"><section className="section"><div className="container impact-state"><strong>Concept not found or not public.</strong><a className="button button--small" href="/proof-of-mind">Back to Proof of Mind</a></div></section></main>;
  }

  return (
    <main className="proof-page">
      <section className="section proof-detail-hero">
        <div className="container split-grid">
          <div className="proof-detail-hero__copy">
            <a className="proof-promo-back" href="/proof-of-mind"><ArrowLeft size={17} /> Back to all concepts</a>
            <p className="eyebrow">{humanize(concept.concept_type)} · {concept.category}</p>
            <h1>{concept.title}</h1>
            {concept.tagline ? <p className="lead">{concept.tagline}</p> : null}
            {concept.short_description ? <p>{concept.short_description}</p> : null}
            <div className="proof-card-actions">
              {concept.mega_promo_text ? <a className="button" href={`/proof-of-mind/${concept.slug}/promo`}>Imagine this <Sparkles size={16} /></a> : null}
              <button className="button button--ghost" type="button" onClick={() => navigator.share?.({ title: concept.title, url: window.location.href })}>Share concept <Share2 size={16} /></button>
            </div>
          </div>
          <div className="proof-detail-hero__visual">
            {concept.cover_image_url ? <img src={concept.cover_image_url} alt={concept.cover_image_alt || `${concept.title} cover`} /> : null}
            <div className="proof-score"><strong>{concept.concept_score ?? '—'}</strong><span>Concept score / 10</span></div>
          </div>
        </div>
      </section>

      <section className="container proof-detail-signals">
        <article><Target /><strong>{concept.primary_market || concept.target_audience || 'Market being validated'}</strong><span>Primary market</span></article>
        <article><Users /><strong>{concept.founder?.name || 'Founder-led'}</strong><span>Founder</span></article>
        <article><Database /><strong>{concept.key_features.length}</strong><span>Core capabilities</span></article>
        <article><ArrowRight /><strong>{formatDate(concept.published_at)}</strong><span>Published</span></article>
      </section>

      <section className="section">
        <div className="container concept-detail">
          {concept.mockup_screens.length ? (
            <section className="concept-detail-section">
              <p className="eyebrow">Product preview</p>
              <h2>Mockups and visual direction</h2>
              <ProofMockupCarousel screens={concept.mockup_screens} />
            </section>
          ) : null}

          <section className="concept-detail-section">
            <p className="eyebrow">Concept overview</p>
            <h2>{concept.title}</h2>
            {concept.vision_statement || concept.full_description ? <p>{concept.vision_statement || concept.full_description}</p> : null}
          </section>
        </div>
      </section>
    </main>
  );
}
