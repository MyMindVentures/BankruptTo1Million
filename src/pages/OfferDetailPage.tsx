import type { I18nManifest } from '../lib/i18nManifest';
import { ArrowLeft, Camera, Check, Clock3, MapPin, Play, ShieldCheck, Sparkles, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { getPublicOfferBySlug } from '../lib/offers';
import type { OfferMediaItem, PublicOffer } from '../lib/offers';
import { useWebsiteI18n } from '../lib/websiteI18n';

function founderLabel(offer: PublicOffer): string {
  return offer.founders.map((founder) => founder.displayName).join(' & ') || 'Kevin & Micha';
}

function MediaCard({ item, onOpen }: { item: OfferMediaItem; onOpen: () => void }) {
  const preview = item.thumbnailUrl || (item.kind === 'image' ? item.url : '');
  return <button className="offer-footage-card" type="button" onClick={onOpen} aria-label={`Open ${item.title || item.kind}`}>
    {preview ? <img src={preview} alt={item.altText} loading="lazy" /> : <span className="offer-footage-card__placeholder">{item.kind === 'video' ? <Play size={34} /> : <Camera size={34} />}</span>}
    <span className="offer-footage-card__shade" />
    <span className="offer-footage-card__type">{item.kind === 'video' ? <><Play size={14} /> Video</> : <><Camera size={14} /> Photo</>}</span>
    <span className="offer-footage-card__caption">{item.caption || item.title}</span>
  </button>;
}

export const OFFER_DETAIL_PAGE_I18N_MANIFEST = {
  componentKey: 'pages.offer.detail.page',
  namespace: 'offers.detail',
  translationKeys: [
    'offers.detail.close_media',
    'offers.detail.personal_story',
  ] as const,
  entityContent: {
    tables: ['offers', 'offer_translations'],
  },
} as const satisfies I18nManifest;

export function OfferDetailPage({ slug }: { slug: string }) {
  const { t } = useWebsiteI18n();
  const [offer, setOffer] = useState<PublicOffer | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'missing'>('loading');
  const [selected, setSelected] = useState<OfferMediaItem | null>(null);

  useEffect(() => {
    let active = true;
    getPublicOfferBySlug(slug)
      .then((item) => {
        if (!active) return;
        setOffer(item);
        setStatus(item ? 'ready' : 'missing');
        if (item?.seoTitle) document.title = item.seoTitle;
      })
      .catch(() => { if (active) setStatus('error'); });
    return () => { active = false; };
  }, [slug]);

  useEffect(() => {
    if (!selected) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setSelected(null); };
    window.addEventListener('keydown', close);
    return () => { document.body.style.overflow = previous; window.removeEventListener('keydown', close); };
  }, [selected]);

  const footageCount = useMemo(() => offer?.collections.reduce((total, collection) => total + collection.items.length, 0) || 0, [offer]);

  if (status === 'loading') return <main className="offer-detail"><div className="offers-state">Loading this offer…</div></main>;
  if (status === 'error') return <main className="offer-detail"><div className="offers-state offers-state--error">This offer could not be loaded.</div></main>;
  if (status === 'missing' || !offer) return <main className="offer-detail"><div className="offers-state"><h1>Offer not found</h1><a href="/offers">Return to all offers</a></div></main>;

  return <main className="offer-detail">
    <section className="offer-detail__hero">
      {offer.cardImageUrl ? <img src={offer.cardImageUrl} alt="" className="offer-detail__hero-image" /> : null}
      <span className="offer-detail__hero-shade" />
      <div className="offer-detail__hero-content">
        <a className="offer-detail__back" href="/offers"><ArrowLeft size={17} /> All offers</a>
        <p className="eyebrow">{offer.category.replaceAll('_', ' ')} · by {founderLabel(offer)}</p>
        <h1>{offer.title}</h1>
        <p className="offer-detail__tagline">{offer.tagline || offer.shortDescription}</p>
        <div className="offer-detail__hero-meta">
          {offer.durationMinutes ? <span><Clock3 size={17} /> {offer.durationMinutes} minutes</span> : null}
          {offer.locationText ? <span><MapPin size={17} /> {offer.locationText}</span> : null}
          <span><Camera size={17} /> {footageCount} media items</span>
        </div>
      </div>
    </section>

    <section className="offer-detail__founders">
      {offer.founders.map((founder) => <a href={`/founders/${founder.slug}`} className="offer-founder-chip" key={founder.id}>
        {founder.avatarUrl ? <img src={founder.avatarUrl} alt={founder.displayName} /> : <span>{founder.displayName.slice(0, 1)}</span>}
        <div><small>{founder.founderRole.replaceAll('_', ' ')}</small><strong>{founder.displayName}</strong><p>{founder.roleTitle}</p></div>
      </a>)}
    </section>

    <section className="offer-detail__content-grid">
      <article className="offer-detail__story">
        <p className="eyebrow">The offer</p>
        <h2>A real skill, shared personally.</h2>
        <p>{offer.fullDescription || offer.shortDescription}</p>
        {offer.personalStory ? <><h3>{t('offers.detail.personal_story', 'Why this matters to us')}</h3><p>{offer.personalStory}</p></> : null}
      </article>

      <aside className="offer-detail__facts">
        <div><Sparkles size={19} /><span><small>Exchange</small><strong>{offer.exchangeType.replaceAll('_', ' ')}</strong></span></div>
        {offer.availabilityText ? <div><Clock3 size={19} /><span><small>Availability</small><strong>{offer.availabilityText}</strong></span></div> : null}
        {offer.locationText ? <div><MapPin size={19} /><span><small>Location</small><strong>{offer.locationText}</strong></span></div> : null}
        {offer.suitableFor.length ? <div><Users size={19} /><span><small>Suitable for</small><strong>{offer.suitableFor.slice(0, 2).join(', ')}</strong></span></div> : null}
      </aside>
    </section>

    {offer.highlights.length || offer.whatIsIncluded.length ? <section className="offer-detail__lists">
      {offer.highlights.length ? <div><p className="eyebrow">Highlights</p><h2>What makes this special</h2><ul>{offer.highlights.map((item) => <li key={item}><Check size={17} /> {item}</li>)}</ul></div> : null}
      {offer.whatIsIncluded.length ? <div><p className="eyebrow">Included</p><h2>What you can expect</h2><ul>{offer.whatIsIncluded.map((item) => <li key={item}><Check size={17} /> {item}</li>)}</ul></div> : null}
    </section> : null}

    {offer.requirements.length ? <section className="offer-detail__requirements">
      <ShieldCheck size={28} />
      <div><p className="eyebrow">Good to know</p><h2>Conditions and safety</h2><ul>{offer.requirements.map((item) => <li key={item}>{item}</li>)}</ul></div>
    </section> : null}

    <section className="offer-detail__footage" aria-labelledby="offer-footage-title">
      <div className="offer-detail__section-heading"><div><p className="eyebrow">Proof through footage</p><h2 id="offer-footage-title">Moments from earlier times we offered this.</h2></div><p>{offer.collections.length} collections · {footageCount} items</p></div>
      {offer.collections.length ? offer.collections.map((collection) => <article className="offer-collection" key={collection.id}>
        <header><div><h3>{collection.title}</h3><p>{collection.description}</p></div><div>{collection.location ? <span><MapPin size={14} /> {collection.location}</span> : null}{collection.occurredOn ? <span>{new Date(collection.occurredOn).toLocaleDateString()}</span> : null}</div></header>
        <div className="offer-footage-grid">{collection.items.map((item) => <MediaCard key={item.id} item={item} onOpen={() => setSelected(item)} />)}</div>
      </article>) : <div className="offer-footage-empty"><Camera size={30} /><h3>Footage collection coming next.</h3><p>The page is ready. Photos and videos from previous experiences can now be linked from the Media Vault.</p></div>}
    </section>

    <section className="offer-detail__cta">
      <p className="eyebrow">Interested?</p><h2>Let’s turn this offer into a shared moment.</h2><p>Reach out with your location, timing and what you have in mind. We will see what is realistically possible within the journey.</p>
      <div><a className="button button--primary" href="/#contact">{offer.ctaLabel}</a><a className="button button--ghost" href="/offers">{offer.secondaryCtaLabel}</a></div>
    </section>

    {selected ? <div className="offer-media-viewer" role="dialog" aria-modal="true" onClick={() => setSelected(null)}>
      <button type="button" onClick={() => setSelected(null)} aria-label={t('offers.detail.close_media', 'Close media')}>×</button>
      <div onClick={(event) => event.stopPropagation()}>{selected.kind === 'video' ? <video src={selected.url} controls autoPlay /> : <img src={selected.url} alt={selected.altText} />}<p>{selected.caption || selected.description}</p></div>
    </div> : null}
  </main>;
}
