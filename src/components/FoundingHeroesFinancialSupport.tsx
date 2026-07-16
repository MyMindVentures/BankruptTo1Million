import type { I18nManifest } from '../lib/i18nManifest';
import { ChevronLeft, ChevronRight, Coins, Heart, Sparkles, Users } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import {
  formatDonationAmount,
  getPublicDonationLedger,
  type PublicDonationLedger,
  type PublicDonationLedgerEntry,
} from '../lib/donations';
import { useWebsiteI18n } from '../lib/websiteI18n';
import './FoundingHeroesFinancialSupport.css';

type LoadState = 'loading' | 'disabled' | 'ready' | 'empty' | 'error';

function supporterLabel(entry: PublicDonationLedgerEntry, t: ReturnType<typeof useWebsiteI18n>['t']) {
  return entry.display_name || t('founding_heroes.financial.anonymous_supporter', 'Anonymous supporter');
}

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

type DonationCardsCarouselProps = {
  entries: PublicDonationLedgerEntry[];
  currency: string;
  language: string;
};

function DonationCardsCarousel({ entries, currency, language }: DonationCardsCarouselProps) {
  const { t, formatDate } = useWebsiteI18n();
  const trackRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Array<HTMLElement | null>>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  const syncActiveIndex = useCallback(() => {
    const track = trackRef.current;
    if (!track || !entries.length) return;

    const trackLeft = track.getBoundingClientRect().left;
    let closestIndex = 0;
    let closestDistance = Number.POSITIVE_INFINITY;

    cardRefs.current.forEach((card, index) => {
      if (!card) return;
      const distance = Math.abs(card.getBoundingClientRect().left - trackLeft);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });

    setActiveIndex(closestIndex);
  }, [entries.length]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    syncActiveIndex();
    track.addEventListener('scroll', syncActiveIndex, { passive: true });
    return () => track.removeEventListener('scroll', syncActiveIndex);
  }, [entries, syncActiveIndex]);

  useEffect(() => {
    setActiveIndex(0);
    const track = trackRef.current;
    if (track) track.scrollTo({ left: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  }, [entries, language]);

  const scrollToIndex = useCallback((index: number) => {
    const card = cardRefs.current[index];
    const track = trackRef.current;
    if (!card || !track) return;

    const offset = card.offsetLeft - track.offsetLeft;
    track.scrollTo({
      left: offset,
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    });
    setActiveIndex(index);
  }, []);

  const goPrevious = () => scrollToIndex(Math.max(0, activeIndex - 1));
  const goNext = () => scrollToIndex(Math.min(entries.length - 1, activeIndex + 1));

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (entries.length < 2) return;
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      goPrevious();
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      goNext();
    }
  };

  const hasMultiple = entries.length > 1;

  return (
    <div
      className="founding-financial-support__carousel"
      role="region"
      aria-label={t('founding_heroes.financial.carousel_label', 'Financial support contributions')}
      tabIndex={hasMultiple ? 0 : undefined}
      onKeyDown={onKeyDown}
    >
      {hasMultiple ? (
        <p className="founding-financial-support__scroll-hint">
          {t('founding_heroes.financial.scroll_hint', 'Swipe or use the arrows to explore earlier contributions')}
        </p>
      ) : null}

      <div className="founding-financial-support__track" ref={trackRef}>
        {entries.map((entry, index) => (
          <article
            key={entry.donation_id}
            ref={(node) => {
              cardRefs.current[index] = node;
            }}
            className={`founding-financial-support__card${index === 0 ? ' founding-financial-support__card--latest' : ''}`}
            aria-current={index === activeIndex ? 'true' : undefined}
          >
            {index === 0 ? (
              <span className="founding-financial-support__card-badge">
                <Sparkles size={12} aria-hidden="true" />
                {t('founding_heroes.financial.latest_badge', 'Latest support')}
              </span>
            ) : null}
            <p className="founding-financial-support__card-amount">
              {formatDonationAmount(entry.amount_minor_units, entry.currency || currency, language)}
            </p>
            <p className="founding-financial-support__card-supporter">
              <Heart size={14} aria-hidden="true" />
              {supporterLabel(entry, t)}
            </p>
            {entry.completed_at ? (
              <time dateTime={entry.completed_at}>{formatDate(entry.completed_at)}</time>
            ) : (
              <span aria-hidden="true">—</span>
            )}
          </article>
        ))}
      </div>

      {hasMultiple ? (
        <div className="founding-financial-support__controls">
          <div className="founding-financial-support__nav">
            <button
              type="button"
              className="founding-financial-support__nav-button"
              onClick={goPrevious}
              disabled={activeIndex === 0}
              aria-label={t('founding_heroes.financial.previous', 'Previous contribution')}
            >
              <ChevronLeft size={18} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="founding-financial-support__nav-button"
              onClick={goNext}
              disabled={activeIndex >= entries.length - 1}
              aria-label={t('founding_heroes.financial.next', 'Next contribution')}
            >
              <ChevronRight size={18} aria-hidden="true" />
            </button>
          </div>

          <p className="founding-financial-support__position" aria-live="polite">
            {t('founding_heroes.financial.slide_position', 'Contribution {current} of {total}', {
              current: activeIndex + 1,
              total: entries.length,
            })}
          </p>

          <div className="founding-financial-support__dots" aria-label={t('founding_heroes.financial.carousel_label', 'Financial support contributions')}>
            {entries.map((entry, index) => (
              <button
                key={entry.donation_id}
                type="button"
                className={`founding-financial-support__dot${index === activeIndex ? ' is-active' : ''}`}
                onClick={() => scrollToIndex(index)}
                aria-label={t('founding_heroes.financial.slide_position', 'Contribution {current} of {total}', {
                  current: index + 1,
                  total: entries.length,
                })}
                aria-current={index === activeIndex ? 'true' : undefined}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function FinancialSupportHeading() {
  const { t } = useWebsiteI18n();

  return (
    <div className="section-heading">
      <p className="eyebrow">{t('founding_heroes.financial.eyebrow', 'Financial support')}</p>
      <h2 id="financial-support-title">{t('founding_heroes.financial.title', 'Every contribution that helped us move')}</h2>
      <p>{t('founding_heroes.financial.lede', 'A transparent record of financial support received for the mission.')}</p>
    </div>
  );
}

export const FOUNDING_HEROES_FINANCIAL_SUPPORT_I18N_MANIFEST = {
  componentKey: 'components.founding.heroes.financial.support',
  namespace: 'founding_heroes.financial',
  translationKeys: [
    'founding_heroes.financial.anonymous_supporter',
    'founding_heroes.financial.aria_label',
    'founding_heroes.financial.carousel_label',
    'founding_heroes.financial.empty',
    'founding_heroes.financial.error',
    'founding_heroes.financial.eyebrow',
    'founding_heroes.financial.latest_badge',
    'founding_heroes.financial.lede',
    'founding_heroes.financial.loading',
    'founding_heroes.financial.next',
    'founding_heroes.financial.previous',
    'founding_heroes.financial.scroll_hint',
    'founding_heroes.financial.slide_position',
    'founding_heroes.financial.supporter_count',
    'founding_heroes.financial.title',
    'founding_heroes.financial.total_collected',
  ] as const,
  keyPatterns: [
    'founding_heroes.financial.*',
  ] as const,
} as const satisfies I18nManifest;

export function FoundingHeroesFinancialSupport() {
  const { language, t } = useWebsiteI18n();
  const [ledger, setLedger] = useState<PublicDonationLedger | null>(null);
  const [loadState, setLoadState] = useState<LoadState>('loading');

  useEffect(() => {
    let cancelled = false;
    setLoadState('loading');

    getPublicDonationLedger(language)
      .then((nextLedger) => {
        if (cancelled) return;
        setLedger(nextLedger);
        if (!nextLedger.enabled) {
          setLoadState('disabled');
          return;
        }
        const nextEntries = nextLedger.entries || [];
        setLoadState(nextEntries.length ? 'ready' : 'empty');
      })
      .catch(() => {
        if (cancelled) return;
        setLedger(null);
        setLoadState('error');
      });

    return () => {
      cancelled = true;
    };
  }, [language]);

  if (loadState === 'disabled') {
    return null;
  }

  const entries = ledger?.entries || [];
  const currency = ledger?.currency || 'EUR';
  const totalAmount =
    typeof ledger?.total_amount_minor_units === 'number'
      ? formatDonationAmount(ledger.total_amount_minor_units, currency, language)
      : null;

  return (
    <div className="founding-financial-support">
      <FinancialSupportHeading />

      {loadState === 'loading' ? (
        <div className="impact-state" role="status" aria-live="polite">
          {t('founding_heroes.financial.loading', 'Loading financial support…')}
        </div>
      ) : null}

      {loadState === 'error' ? (
        <div className="impact-state impact-state--error" role="alert">
          {t('founding_heroes.financial.error', 'Financial support is temporarily unavailable.')}
        </div>
      ) : null}

      {loadState === 'empty' ? (
        <div className="impact-state" role="status">
          {t('founding_heroes.financial.empty', 'No financial support has been recorded yet.')}
        </div>
      ) : null}

      {loadState === 'ready' ? (
      <div className="founding-financial-support__panel">
        <div className="founding-financial-support__panel-header">
          <div className="founding-financial-support__icon-badge" aria-hidden="true">
            <Coins size={22} />
          </div>
          <div
            className="founding-financial-support__summary"
            aria-label={t('founding_heroes.financial.aria_label', 'Financial support received')}
          >
            {totalAmount ? (
              <p className="founding-financial-support__total">
                <Coins size={18} aria-hidden="true" />
                {t('founding_heroes.financial.total_collected', 'Total collected: {amount}', { amount: totalAmount })}
              </p>
            ) : null}
            {typeof ledger?.donation_count === 'number' ? (
              <p className="founding-financial-support__count">
                <Users size={16} aria-hidden="true" />
                {t('founding_heroes.financial.supporter_count', '{count} contributions', { count: ledger.donation_count })}
              </p>
            ) : null}
          </div>
        </div>

        <DonationCardsCarousel entries={entries} currency={currency} language={language} />
      </div>
      ) : null}
    </div>
  );
}
