import { Heart } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { I18nManifest } from '../../lib/i18nManifest';
import { getJournalVenueThankYou, type JournalVenueThankYou } from '../../lib/journalVenueThankYou';
import { useWebsiteI18n } from '../../lib/websiteI18n';
import './JournalVenueThankYouSection.css';

export const JOURNAL_VENUE_THANK_YOU_I18N_MANIFEST = {
  componentKey: 'journal.venue_thank_you.section',
  namespace: 'journal.place_context',
  translationKeys: [
    'journal.place_context.thank_you.eyebrow',
    'journal.place_context.thank_you.heading',
    'journal.place_context.thank_you.aria_label',
  ] as const,
  entityContent: {
    rpc: 'get_localized_journal_venue_thank_you',
    tables: ['journal_post_venue_thank_you_translations'],
  },
} as const satisfies I18nManifest;

type LoadState = 'loading' | 'empty' | 'ready' | 'error';

export function JournalVenueThankYouSection({ slug }: { slug: string }) {
  const { language, t } = useWebsiteI18n();
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [thankYou, setThankYou] = useState<JournalVenueThankYou | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoadState('loading');
    setThankYou(null);

    getJournalVenueThankYou(slug, language)
      .then((payload) => {
        if (cancelled) return;
        if (!payload) {
          setLoadState('empty');
          return;
        }
        setThankYou(payload);
        setLoadState('ready');
      })
      .catch(() => {
        if (!cancelled) setLoadState('error');
      });

    return () => {
      cancelled = true;
    };
  }, [slug, language]);

  if (loadState !== 'ready' || !thankYou) {
    return null;
  }

  return (
    <section
      className="journal-venue-thank-you section"
      aria-label={t('journal.place_context.thank_you.aria_label', 'Thank-you message to the venue team')}
    >
      <div className="journal-venue-thank-you__card">
        <header className="journal-venue-thank-you__header">
          <span className="journal-venue-thank-you__icon" aria-hidden="true">
            <Heart size={24} fill="currentColor" strokeWidth={1.75} />
          </span>
          <div>
            <p className="journal-venue-thank-you__eyebrow">
              {t('journal.place_context.thank_you.eyebrow', 'With gratitude')}
            </p>
            <h2 id="journal-venue-thank-you-title" className="journal-venue-thank-you__heading">
              {t('journal.place_context.thank_you.heading', 'Thank you')}
            </h2>
          </div>
        </header>
        {thankYou.venue_title ? (
          <p className="journal-venue-thank-you__venue">{thankYou.venue_title}</p>
        ) : null}
        <div className="journal-venue-thank-you__message">{thankYou.message}</div>
      </div>
    </section>
  );
}
