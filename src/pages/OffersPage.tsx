import type { I18nManifest } from '../lib/i18nManifest';
import { ArrowRight, Camera, Clock3, Compass, MapPin, Search, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { getPublicOffers } from '../lib/offers';
import type { PublicOffer } from '../lib/offers';

function founderLabel(offer: PublicOffer): string {
  const names = offer.founders.map((founder) => founder.displayName);
  if (names.length === 2) return `${names[0]} & ${names[1]}`;
  return names[0] || 'Kevin & Micha';
}

export const OFFERS_PAGE_I18N_MANIFEST = {
  componentKey: 'pages.offers.page',
  namespace: 'ui',
  translationKeys: [
  ] as const,
} as const satisfies I18nManifest;

export function OffersPage() {
  const [offers, setOffers] = useState<PublicOffer[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [query, setQuery] = useState('');
  const [founder, setFounder] = useState('all');
  const [category, setCategory] = useState('all');

  useEffect(() => {
    let active = true;
    getPublicOffers()
      .then((items) => { if (active) { setOffers(items); setStatus('ready'); } })
      .catch(() => { if (active) setStatus('error'); });
    return () => { active = false; };
  }, []);

  const categories = useMemo(() => ['all', ...Array.from(new Set(offers.map((offer) => offer.category)))], [offers]);
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return offers.filter((offer) => {
      const founderMatch = founder === 'all' || offer.founders.some((item) => item.slug === founder);
      const categoryMatch = category === 'all' || offer.category === category;
      const textMatch = !normalized || [offer.title, offer.tagline, offer.shortDescription, offer.category, ...offer.founders.map((item) => item.displayName)].join(' ').toLowerCase().includes(normalized);
      return founderMatch && categoryMatch && textMatch;
    });
  }, [category, founder, offers, query]);

  return <main className="offers-page">
    <section className="offers-hero">
      <div className="offers-hero__content">
        <p className="eyebrow">What we can offer</p>
        <h1>Real skills. Shared experiences. Honest exchange.</h1>
        <p>Kevin and Micha each bring different strengths. Some offers are personal, others are stronger together. Every card opens a complete page with the story, details and footage from earlier moments.</p>
        <div className="offers-hero__stats">
          <span><strong>{offers.length}</strong> active offers</span>
          <span><Camera size={16} /> Real footage collections</span>
          <span><Users size={16} /> Kevin, Micha or both</span>
        </div>
      </div>
    </section>

    <section className="offers-explorer" aria-labelledby="offers-title">
      <div className="offers-explorer__heading">
        <div><p className="eyebrow">Explore their skills</p><h2 id="offers-title">Choose an offer and see the proof behind it.</h2></div>
        <p>{filtered.length} offers shown</p>
      </div>

      <div className="offers-toolbar">
        <label className="offers-search"><Search size={18} /><span className="sr-only">Search offers</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search skills or experiences..." /></label>
        <select value={founder} onChange={(event) => setFounder(event.target.value)} aria-label="Filter by founder">
          <option value="all">Kevin & Micha</option>
          <option value="kevin-de-vlieger">Kevin</option>
          <option value="micha">Micha</option>
        </select>
        <select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Filter by category">
          {categories.map((item) => <option key={item} value={item}>{item === 'all' ? 'All categories' : item.replaceAll('_', ' ')}</option>)}
        </select>
      </div>

      {status === 'loading' ? <div className="offers-state">Loading offers from Supabase…</div> : null}
      {status === 'error' ? <div className="offers-state offers-state--error">The offers could not be loaded right now.</div> : null}

      {status === 'ready' ? <div className="offers-grid">
        {filtered.map((offer) => <article className="offer-card" key={offer.id}>
          <a href={`/offers/${offer.slug}`} className="offer-card__media" aria-label={`Open ${offer.title}`}>
            {offer.cardImageUrl ? <img src={offer.cardImageUrl} alt="" loading="lazy" /> : <span className="offer-card__placeholder"><Compass size={42} /></span>}
            <span className="offer-card__shade" />
            <span className="offer-card__category">{offer.category.replaceAll('_', ' ')}</span>
            {offer.isFeatured ? <span className="offer-card__featured">Featured</span> : null}
          </a>
          <div className="offer-card__body">
            <div className="offer-card__founders">
              <div className="offer-card__avatars">{offer.founders.map((item) => item.avatarUrl ? <img key={item.id} src={item.avatarUrl} alt={item.displayName} /> : <span key={item.id}>{item.displayName.slice(0, 1)}</span>)}</div>
              <span>Offered by {founderLabel(offer)}</span>
            </div>
            <h3><a href={`/offers/${offer.slug}`}>{offer.title}</a></h3>
            <p>{offer.shortDescription}</p>
            <div className="offer-card__meta">
              {offer.durationMinutes ? <span><Clock3 size={15} /> {offer.durationMinutes} min</span> : null}
              {offer.locationText ? <span><MapPin size={15} /> {offer.locationText}</span> : null}
            </div>
            <a className="offer-card__link" href={`/offers/${offer.slug}`}>View offer <ArrowRight size={17} /></a>
          </div>
        </article>)}
      </div> : null}

      {status === 'ready' && !filtered.length ? <div className="offers-state">No offers match these filters.</div> : null}
    </section>
  </main>;
}
