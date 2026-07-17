import type { I18nManifest } from '../lib/i18nManifest';
import { ArrowRight, Camera, Clock3, Compass, MapPin, Search, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { getPublicOffers } from '../lib/offers';
import type { PublicOffer } from '../lib/offers';
import {
  resolveOfferBookingContextFromOfferId,
  type JourneyOfferBookingContext,
} from '../lib/journeyOfferBookings';
import { useWebsiteI18n } from '../lib/websiteI18n';
import { JourneyOfferBookingForm } from '../components/JourneyOfferBookingForm';
import '../components/JournalJourneyExperience.css';

function founderLabel(offer: PublicOffer, fallback: string): string {
  const names = offer.founders.map((founder) => founder.displayName);
  if (names.length === 2) return `${names[0]} & ${names[1]}`;
  return names[0] || fallback;
}

export const OFFERS_PAGE_I18N_MANIFEST = {
  componentKey: 'pages.offers.page',
  namespace: 'offers',
  translationKeys: [
    'offers.page.hero.eyebrow',
    'offers.page.hero.title',
    'offers.page.hero.description',
    'offers.page.hero.active_offers',
    'offers.page.hero.footage',
    'offers.page.hero.founders',
    'offers.page.explorer.eyebrow',
    'offers.page.explorer.title',
    'offers.page.explorer.shown_count',
    'offers.page.search.label',
    'offers.page.search.placeholder',
    'offers.page.filter.founder',
    'offers.page.filter.category',
    'offers.page.filter.all_founders',
    'offers.page.filter.founder_kevin',
    'offers.page.filter.founder_micha',
    'offers.page.filter.all_categories',
    'offers.page.loading',
    'offers.page.error',
    'offers.page.featured',
    'offers.page.offered_by',
    'offers.page.view_offer',
    'offers.page.book',
    'offers.page.empty_filters',
    'offers.page.open_offer_aria',
  ] as const,
} as const satisfies I18nManifest;

export function OffersPage() {
  const { t, formatNumber } = useWebsiteI18n();
  const [offers, setOffers] = useState<PublicOffer[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [query, setQuery] = useState('');
  const [founder, setFounder] = useState('all');
  const [category, setCategory] = useState('all');
  const [bookingContext, setBookingContext] = useState<JourneyOfferBookingContext | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const foundersFallback = t('offers.page.filter.all_founders', 'Kevin & Micha');

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

  async function openBooking(offer: PublicOffer) {
    setBookingError(null);
    try {
      const context = await resolveOfferBookingContextFromOfferId(offer.id);
      if (!context) {
        setBookingError(t('journey_calendar.booking.unavailable', 'This offer is not available to book right now.'));
        return;
      }
      setBookingContext(context);
    } catch {
      setBookingError(t('journey_calendar.booking.unavailable', 'This offer is not available to book right now.'));
    }
  }

  return <main className="offers-page">
    <section className="offers-hero">
      <div className="offers-hero__content">
        <p className="eyebrow">{t('offers.page.hero.eyebrow', 'What we can offer')}</p>
        <h1>{t('offers.page.hero.title', 'Real skills. Shared experiences. Honest exchange.')}</h1>
        <p>{t('offers.page.hero.description', 'Kevin and Micha each bring different strengths. Some offers are personal, others are stronger together. Every card opens a complete page with the story, details and footage from earlier moments.')}</p>
        <div className="offers-hero__stats">
          <span><strong>{formatNumber(offers.length)}</strong> {t('offers.page.hero.active_offers', 'active offers')}</span>
          <span><Camera size={16} /> {t('offers.page.hero.footage', 'Real footage collections')}</span>
          <span><Users size={16} /> {t('offers.page.hero.founders', 'Kevin, Micha or both')}</span>
        </div>
      </div>
    </section>

    <section className="offers-explorer" aria-labelledby="offers-title">
      <div className="offers-explorer__heading">
        <div><p className="eyebrow">{t('offers.page.explorer.eyebrow', 'Explore their skills')}</p><h2 id="offers-title">{t('offers.page.explorer.title', 'Choose an offer and see the proof behind it.')}</h2></div>
        <p>{t('offers.page.explorer.shown_count', '{count} offers shown', { count: formatNumber(filtered.length) })}</p>
      </div>

      <div className="offers-toolbar">
        <label className="offers-search"><Search size={18} /><span className="sr-only">{t('offers.page.search.label', 'Search offers')}</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('offers.page.search.placeholder', 'Search skills or experiences...')} /></label>
        <select value={founder} onChange={(event) => setFounder(event.target.value)} aria-label={t('offers.page.filter.founder', 'Filter by founder')}>
          <option value="all">{t('offers.page.filter.all_founders', 'Kevin & Micha')}</option>
          <option value="kevin-de-vlieger">{t('offers.page.filter.founder_kevin', 'Kevin')}</option>
          <option value="micha">{t('offers.page.filter.founder_micha', 'Micha')}</option>
        </select>
        <select value={category} onChange={(event) => setCategory(event.target.value)} aria-label={t('offers.page.filter.category', 'Filter by category')}>
          {categories.map((item) => <option key={item} value={item}>{item === 'all' ? t('offers.page.filter.all_categories', 'All categories') : item.replaceAll('_', ' ')}</option>)}
        </select>
      </div>

      {status === 'loading' ? <div className="offers-state">{t('offers.page.loading', 'Loading offers from Supabase…')}</div> : null}
      {status === 'error' ? <div className="offers-state offers-state--error">{t('offers.page.error', 'The offers could not be loaded right now.')}</div> : null}

      {status === 'ready' ? <div className="offers-grid">
        {filtered.map((offer) => <article className="offer-card" key={offer.id}>
          <a href={`/offers/${offer.slug}`} className="offer-card__media" aria-label={t('offers.page.open_offer_aria', 'Open {title}', { title: offer.title })}>
            {offer.cardImageUrl ? <img src={offer.cardImageUrl} alt="" loading="lazy" /> : <span className="offer-card__placeholder"><Compass size={42} /></span>}
            <span className="offer-card__shade" />
            <span className="offer-card__category">{offer.category.replaceAll('_', ' ')}</span>
            {offer.isFeatured ? <span className="offer-card__featured">{t('offers.page.featured', 'Featured')}</span> : null}
          </a>
          <div className="offer-card__body">
            <div className="offer-card__founders">
              <div className="offer-card__avatars">{offer.founders.map((item) => item.avatarUrl ? <img key={item.id} src={item.avatarUrl} alt={item.displayName} /> : <span key={item.id}>{item.displayName.slice(0, 1)}</span>)}</div>
              <span>{t('offers.page.offered_by', 'Offered by {founders}', { founders: founderLabel(offer, foundersFallback) })}</span>
            </div>
            <h3><a href={`/offers/${offer.slug}`}>{offer.title}</a></h3>
            <p>{offer.shortDescription}</p>
            <div className="offer-card__meta">
              {offer.durationMinutes ? <span><Clock3 size={15} /> {offer.durationMinutes} min</span> : null}
              {offer.locationText ? <span><MapPin size={15} /> {offer.locationText}</span> : null}
            </div>
            <div className="offer-card__actions">
              <a className="offer-card__link" href={`/offers/${offer.slug}`}>{t('offers.page.view_offer', 'View offer')} <ArrowRight size={17} /></a>
              <button className="button button--primary" type="button" onClick={() => void openBooking(offer)}>
                {t('offers.page.book', 'Book')}
              </button>
            </div>
          </div>
        </article>)}
      </div> : null}

      {status === 'ready' && !filtered.length ? <div className="offers-state">{t('offers.page.empty_filters', 'No offers match these filters.')}</div> : null}
      {bookingError ? <div className="offers-state offers-state--error">{bookingError}</div> : null}
    </section>
    {bookingContext ? (
      <JourneyOfferBookingForm context={bookingContext} onClose={() => setBookingContext(null)} />
    ) : null}
  </main>;
}
