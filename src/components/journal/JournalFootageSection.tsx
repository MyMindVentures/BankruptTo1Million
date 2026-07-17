import type { I18nManifest } from '../../lib/i18nManifest';
import { ChevronLeft, ChevronRight, Play, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getJournalPostFootage,
  isVideoFootage,
  type JournalFootageItem,
  wrapFootageIndex,
} from '../../lib/journalFootage';
import { useWebsiteI18n } from '../../lib/websiteI18n';

type LoadState = 'loading' | 'empty' | 'ready' | 'error';

function FootageThumbnail({ item }: { item: JournalFootageItem }) {
  const isVideo = isVideoFootage(item);

  return (
    <>
      {item.thumbnail_url
        ? <img src={item.thumbnail_url} alt="" loading="lazy" decoding="async" />
        : isVideo
          ? <video
            src={item.url}
            muted
            playsInline
            preload="auto"
            aria-hidden="true"
            tabIndex={-1}
            onLoadedMetadata={(event) => {
              const video = event.currentTarget;
              if (video.duration > 0.1) video.currentTime = 0.1;
            }}
          />
          : item.url
            ? <img src={item.url} alt="" loading="lazy" decoding="async" />
            : <span className="journal-footage__placeholder" aria-hidden="true" />}
      {isVideo ? <span className="journal-footage__play" aria-hidden="true"><Play size={22} /></span> : null}
      {item.caption ? <span className="journal-footage__caption">{item.caption}</span> : null}
    </>
  );
}

export const JOURNAL_FOOTAGE_SECTION_I18N_MANIFEST = {
  componentKey: 'components.journal.journal.footage.section',
  namespace: 'journal.footage.alt',
  translationKeys: [
    'journal.footage.alt.image',
    'journal.footage.alt.video',
    'journal.footage.close',
    'journal.footage.counter',
    'journal.footage.error',
    'journal.footage.eyebrow',
    'journal.footage.next',
    'journal.footage.open',
    'journal.footage.previous',
    'journal.footage.title',
  ] as const,
  keyPatterns: [
    'journal.footage.alt.*',
    'journal.footage.*',
  ] as const,
} as const satisfies I18nManifest;

export function JournalFootageSection({ postId }: { postId: string }) {
  const { t } = useWebsiteI18n();
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [error, setError] = useState('');
  const [items, setItems] = useState<JournalFootageItem[]>([]);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  const altLabels = useMemo(() => ({
    image: t('journal.footage.alt.image', 'Event photo {number}'),
    video: t('journal.footage.alt.video', 'Event video {number}'),
  }), [t]);

  useEffect(() => {
    if (!postId) return undefined;

    let cancelled = false;
    setLoadState('loading');
    setError('');
    setItems([]);
    setViewerIndex(null);

    getJournalPostFootage(postId, altLabels)
      .then((footage) => {
        if (cancelled) return;
        if (!footage.length) {
          setLoadState('empty');
          return;
        }
        setItems(footage);
        setLoadState('ready');
      })
      .catch((caught: unknown) => {
        if (cancelled) return;
        setError(caught instanceof Error ? caught.message : t('journal.footage.error', 'Footage could not be loaded.'));
        setLoadState('error');
      });

    return () => { cancelled = true; };
  }, [altLabels, postId, t]);

  const openViewer = useCallback((index: number) => {
    setViewerIndex(index);
  }, []);

  const closeViewer = useCallback(() => {
    setViewerIndex(null);
  }, []);

  const moveViewer = useCallback((direction: -1 | 1) => {
    setViewerIndex((current) => {
      if (current == null || items.length < 2) return current;
      return wrapFootageIndex(current, items.length, direction);
    });
  }, [items.length]);

  const activeItem = viewerIndex != null ? items[viewerIndex] : null;

  useEffect(() => {
    if (viewerIndex == null) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeViewer();
      if (event.key === 'ArrowLeft') moveViewer(-1);
      if (event.key === 'ArrowRight') moveViewer(1);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [closeViewer, moveViewer, viewerIndex]);

  useEffect(() => {
    if (viewerIndex != null && viewerIndex >= items.length) setViewerIndex(null);
  }, [items.length, viewerIndex]);

  if (loadState === 'loading') return null;

  if (loadState === 'error') {
    return (
      <section className="journal-footage" role="alert">
        <div className="journal-footage__heading">
          <p className="eyebrow">{t('journal.footage.eyebrow', 'Footage from the journey')}</p>
          <h2 id="journal-footage-title">{t('journal.footage.title', 'See the moment as it happened.')}</h2>
        </div>
        <p className="journal-footage__state journal-footage__state--error">{error || t('journal.footage.error', 'Footage could not be loaded.')}</p>
      </section>
    );
  }

  if (loadState === 'empty' || !items.length) return null;

  return (
    <>
      <section className="journal-footage" aria-labelledby="journal-footage-title">
        <div className="journal-footage__heading">
          <p className="eyebrow">{t('journal.footage.eyebrow', 'Footage from the journey')}</p>
          <h2 id="journal-footage-title">{t('journal.footage.title', 'See the moment as it happened.')}</h2>
        </div>
        <div className="journal-footage__grid">
          {items.map((item, index) => (
            <button
              key={item.id}
              type="button"
              className={`journal-footage__item journal-footage__item--${item.asset_type}`}
              onClick={() => openViewer(index)}
              aria-label={t('journal.footage.open', 'Open footage {number}', { number: index + 1 })}
            >
              <FootageThumbnail item={item} />
            </button>
          ))}
        </div>
      </section>

      {activeItem ? (
        <div
          className="media-viewer journal-footage-viewer"
          role="dialog"
          aria-modal="true"
          aria-label={activeItem.alt_text}
          onClick={closeViewer}
        >
          <button
            className="media-viewer__close"
            type="button"
            onClick={closeViewer}
            aria-label={t('journal.footage.close', 'Close viewer')}
          >
            <X aria-hidden="true" />
          </button>
          {items.length > 1 ? (
            <button
              className="media-viewer__nav media-viewer__nav--previous"
              type="button"
              onClick={(event) => { event.stopPropagation(); moveViewer(-1); }}
              aria-label={t('journal.footage.previous', 'Previous')}
            >
              <ChevronLeft aria-hidden="true" />
            </button>
          ) : null}
          <div className="media-viewer__panel journal-footage-viewer__panel" onClick={(event) => event.stopPropagation()}>
            <div className="media-viewer__visual">
              {isVideoFootage(activeItem)
                ? <video key={activeItem.id} src={activeItem.url} poster={activeItem.thumbnail_url || undefined} controls autoPlay playsInline preload="metadata" aria-label={activeItem.alt_text} />
                : <img key={activeItem.id} src={activeItem.url} alt={activeItem.alt_text} />}
            </div>
            {items.length > 1 ? (
              <p className="journal-footage-viewer__counter" aria-live="polite">
                {t('journal.footage.counter', '{current} of {total}', {
                  current: (viewerIndex ?? 0) + 1,
                  total: items.length,
                })}
              </p>
            ) : null}
            {activeItem.caption ? <p className="journal-footage-viewer__caption">{activeItem.caption}</p> : null}
          </div>
          {items.length > 1 ? (
            <button
              className="media-viewer__nav media-viewer__nav--next"
              type="button"
              onClick={(event) => { event.stopPropagation(); moveViewer(1); }}
              aria-label={t('journal.footage.next', 'Next')}
            >
              <ChevronRight aria-hidden="true" />
            </button>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
