import type { I18nManifest } from '../lib/i18nManifest';
import { Camera, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, FileText, Filter, MapPin, Pause, Play, RefreshCw, Search, Video, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getPublicMediaAssets } from '../lib/mediaVault';
import type { MediaVaultKind, PublicMediaAsset } from '../lib/mediaVault';
import { useWebsiteI18n } from '../lib/websiteI18n';

const CAROUSEL_LIMIT = 10;
const CAROUSEL_INTERVAL_MS = 6000;

function formatDuration(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds)) return '';
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60);
  return `${minutes}:${String(remainder).padStart(2, '0')}`;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

function MediaKindIcon({ kind, size = 14 }: { kind: MediaVaultKind; size?: number }) {
  if (kind === 'video') return <Video size={size} aria-hidden="true" />;
  if (kind === 'document') return <FileText size={size} aria-hidden="true" />;
  return <Camera size={size} aria-hidden="true" />;
}

function MediaPlaceholder({ kind }: { kind: MediaVaultKind }) {
  return <span className="media-placeholder" aria-hidden="true"><MediaKindIcon kind={kind} size={34} /></span>;
}

export const MEDIA_VAULT_PAGE_I18N_MANIFEST = {
  componentKey: 'pages.media.vault.page',
  namespace: 'media_vault',
  translationKeys: [
    'media_vault.carousel.aria',
    'media_vault.carousel.choose_slide',
    'media_vault.carousel.latest_upload',
    'media_vault.carousel.next',
    'media_vault.carousel.open',
    'media_vault.carousel.pause',
    'media_vault.carousel.play',
    'media_vault.carousel.previous',
    'media_vault.carousel.show_slide',
    'media_vault.categories.aria',
    'media_vault.empty.clear',
    'media_vault.empty.featured',
    'media_vault.empty.featured_note',
    'media_vault.empty.filters',
    'media_vault.empty.none',
    'media_vault.error.retry',
    'media_vault.error.title',
    'media_vault.explorer.count',
    'media_vault.explorer.eyebrow',
    'media_vault.explorer.title',
    'media_vault.filter.all',
    'media_vault.filter.type',
    'media_vault.intro.description',
    'media_vault.intro.eyebrow',
    'media_vault.intro.title',
    'media_vault.kind.document',
    'media_vault.kind.photo',
    'media_vault.kind.video',
    'media_vault.loading',
    'media_vault.search.label',
    'media_vault.search.placeholder',
    'media_vault.sort.label',
    'media_vault.sort.newest',
    'media_vault.sort.oldest',
    'media_vault.sort.title',
    'media_vault.stats.aria',
    'media_vault.stats.documents',
    'media_vault.stats.photos',
    'media_vault.stats.videos',
    'media_vault.viewer.close',
    'media_vault.viewer.dimensions',
    'media_vault.viewer.hide_details',
    'media_vault.viewer.location',
    'media_vault.viewer.next',
    'media_vault.viewer.open_document',
    'media_vault.viewer.previous',
    'media_vault.viewer.published',
    'media_vault.viewer.show_details',
    'media_vault.viewer.type',
  ] as const,
  entityContent: {
    tables: ['media_assets'],
  },
} as const satisfies I18nManifest;

export function MediaVaultPage() {
  const { t, formatNumber } = useWebsiteI18n();
  const [items, setItems] = useState<PublicMediaAsset[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [kind, setKind] = useState<'all' | MediaVaultKind>('all');
  const [sort, setSort] = useState<'newest' | 'oldest' | 'title'>('newest');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [metadataOpen, setMetadataOpen] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [carouselPlaying, setCarouselPlaying] = useState(true);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    let active = true;
    setStatus('loading');
    setError('');

    getPublicMediaAssets()
      .then((assets) => {
        if (!active) return;
        setItems(assets);
        setCarouselIndex(0);
        setStatus('ready');
      })
      .catch((caught: unknown) => {
        if (!active) return;
        setError(caught instanceof Error ? caught.message : 'Media Vault could not be loaded.');
        setStatus('error');
      });

    return () => { active = false; };
  }, [reloadKey]);

  const carouselItems = useMemo(() => items.slice(0, CAROUSEL_LIMIT), [items]);
  const carouselIds = useMemo(() => new Set(carouselItems.map((item) => item.id)), [carouselItems]);
  const activeCarouselItem = carouselItems[carouselIndex] || null;

  const changeCarousel = useCallback((direction: -1 | 1) => {
    if (carouselItems.length < 2) return;
    setCarouselIndex((current) => (current + direction + carouselItems.length) % carouselItems.length);
  }, [carouselItems.length]);

  useEffect(() => {
    if (!carouselPlaying || carouselItems.length < 2 || selectedId) return;
    const timer = window.setInterval(() => changeCarousel(1), CAROUSEL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [carouselItems.length, carouselPlaying, changeCarousel, selectedId]);

  const categories = useMemo(() => ['All', ...Array.from(new Set(items.map((item) => item.category)))], [items]);
  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return [...items]
      .filter((item) => category === 'All' || item.category === category)
      .filter((item) => kind === 'all' || item.kind === kind)
      .filter((item) => !normalizedQuery || [item.title, item.description, item.caption, item.location, item.category, ...item.tags].join(' ').toLowerCase().includes(normalizedQuery))
      .sort((a, b) => sort === 'title'
        ? a.title.localeCompare(b.title)
        : sort === 'newest'
          ? b.capturedAt.localeCompare(a.capturedAt)
          : a.capturedAt.localeCompare(b.capturedAt));
  }, [category, items, kind, query, sort]);

  const explorerItems = useMemo(() => filtered.filter((item) => !carouselIds.has(item.id)), [carouselIds, filtered]);
  const selectedIndex = selectedId ? items.findIndex((item) => item.id === selectedId) : -1;
  const selected = selectedIndex >= 0 ? items[selectedIndex] : null;

  const openMedia = (id: string) => {
    setMetadataOpen(false);
    setSelectedId(id);
  };

  const move = useCallback((direction: -1 | 1) => {
    if (items.length < 2 || selectedIndex < 0) return;
    setMetadataOpen(false);
    setSelectedId(items[(selectedIndex + direction + items.length) % items.length].id);
  }, [items, selectedIndex]);

  useEffect(() => {
    if (!selectedId) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedId(null);
      if (event.key === 'ArrowLeft') move(-1);
      if (event.key === 'ArrowRight') move(1);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [move, selectedId]);

  useEffect(() => {
    if (selectedId && !selected) setSelectedId(null);
  }, [selected, selectedId]);

  const photos = items.filter((item) => item.kind === 'photo').length;
  const videos = items.filter((item) => item.kind === 'video').length;
  const documents = items.filter((item) => item.kind === 'document').length;

  return <main className="media-vault" id="top">
    <section className="media-vault__intro" aria-labelledby="media-vault-title">
      <p className="eyebrow">{t('media_vault.intro.eyebrow', 'The visual archive')}</p>
      <h1 id="media-vault-title">{t('media_vault.intro.title', 'Media Vault')}</h1>
      <p>{t('media_vault.intro.description', 'The people, places, setbacks and breakthroughs behind the journey from rock bottom to one million.')}</p>
      <div className="media-vault__stats" aria-label={t('media_vault.stats.aria', 'Media statistics')}>
        <span><strong>{formatNumber(photos)}</strong> {t('media_vault.stats.photos', 'Photos')}</span>
        <span><strong>{formatNumber(videos)}</strong> {t('media_vault.stats.videos', 'Videos')}</span>
        <span><strong>{formatNumber(documents)}</strong> {t('media_vault.stats.documents', 'Documents')}</span>
      </div>
    </section>

    {status === 'ready' && activeCarouselItem ? <section className="media-carousel" aria-label={t('media_vault.carousel.aria', 'Latest uploaded media')}>
      <div
        className="media-carousel__stage"
        onTouchStart={(event) => { touchStartX.current = event.touches[0]?.clientX ?? null; }}
        onTouchEnd={(event) => {
          if (touchStartX.current === null) return;
          const endX = event.changedTouches[0]?.clientX ?? touchStartX.current;
          const distance = endX - touchStartX.current;
          touchStartX.current = null;
          if (Math.abs(distance) < 45) return;
          changeCarousel(distance > 0 ? -1 : 1);
        }}
      >
        <button className="media-carousel__slide" type="button" onClick={() => openMedia(activeCarouselItem.id)} aria-label={t('media_vault.carousel.open', 'Open media: {title}', { title: activeCarouselItem.title })}>
          {activeCarouselItem.imageUrl ? <img src={activeCarouselItem.imageUrl} alt={activeCarouselItem.altText} /> : <MediaPlaceholder kind={activeCarouselItem.kind} />}
          <span className="media-carousel__shade" />
          <span className="media-carousel__content" aria-live="polite">
            <small>{t('media_vault.carousel.latest_upload', 'Latest upload {current} / {total}', { current: formatNumber(carouselIndex + 1), total: formatNumber(carouselItems.length) })}</small>
            <strong>{activeCarouselItem.title}</strong>
            {activeCarouselItem.caption || activeCarouselItem.description ? <span className="media-carousel__caption">{activeCarouselItem.caption || activeCarouselItem.description}</span> : null}
            <span className="media-carousel__meta">
              <span><MediaKindIcon kind={activeCarouselItem.kind} /> {activeCarouselItem.kind}</span>
              {activeCarouselItem.location ? <span><MapPin size={14} aria-hidden="true" /> {activeCarouselItem.location}</span> : null}
              <span>{formatDate(activeCarouselItem.capturedAt)}</span>
            </span>
          </span>
        </button>

        {carouselItems.length > 1 ? <>
          <button className="media-carousel__arrow media-carousel__arrow--previous" type="button" onClick={() => changeCarousel(-1)} aria-label={t('media_vault.carousel.previous', 'Previous latest media')}><ChevronLeft /></button>
          <button className="media-carousel__arrow media-carousel__arrow--next" type="button" onClick={() => changeCarousel(1)} aria-label={t('media_vault.carousel.next', 'Next latest media')}><ChevronRight /></button>
          <button className="media-carousel__playback" type="button" onClick={() => setCarouselPlaying((playing) => !playing)} aria-label={carouselPlaying ? t('media_vault.carousel.pause', 'Pause carousel') : t('media_vault.carousel.play', 'Play carousel')}>{carouselPlaying ? <Pause size={16} /> : <Play size={16} />}</button>
          <div className="media-carousel__dots" aria-label={t('media_vault.carousel.choose_slide', 'Choose carousel slide')}>{carouselItems.map((item, index) => <button key={item.id} type="button" data-active={index === carouselIndex} onClick={() => setCarouselIndex(index)} aria-label={t('media_vault.carousel.show_slide', 'Show slide {index}: {title}', { index: formatNumber(index + 1), title: item.title })} />)}</div>
        </> : null}
      </div>
    </section> : null}

    <section className="media-explorer" aria-labelledby="media-explorer-title">
      <div className="media-explorer__heading">
        <div><p className="eyebrow">{t('media_vault.explorer.eyebrow', 'Explore the archive')}</p><h2 id="media-explorer-title">{t('media_vault.explorer.title', 'Every moment tells part of the story.')}</h2></div>
        <p>{t('media_vault.explorer.count', '{shown} of {total} public assets', { shown: formatNumber(filtered.length), total: formatNumber(items.length) })}</p>
      </div>

      {status === 'loading' ? <div className="media-state" role="status"><RefreshCw className="media-state__spinner" size={24} aria-hidden="true" /><span>{t('media_vault.loading', 'Loading published media from Supabase…')}</span></div> : null}
      {status === 'error' ? <div className="media-state media-state--error" role="alert"><strong>{t('media_vault.error.title', 'Media could not be loaded.')}</strong><span>{error}</span><button className="button button--ghost" type="button" onClick={() => setReloadKey((value) => value + 1)}><RefreshCw size={16} aria-hidden="true" /> {t('media_vault.error.retry', 'Try again')}</button></div> : null}

      {status === 'ready' ? <>
        <div className="media-toolbar">
          <label className="media-search"><Search size={18} aria-hidden="true" /><span className="sr-only">{t('media_vault.search.label', 'Search media')}</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('media_vault.search.placeholder', 'Search titles, tags or descriptions...')} /></label>
          <label className="media-select"><Filter size={17} aria-hidden="true" /><span className="sr-only">{t('media_vault.filter.type', 'Filter media type')}</span><select value={kind} onChange={(event) => setKind(event.target.value as 'all' | MediaVaultKind)}><option value="all">{t('media_vault.filter.all', 'All media')}</option><option value="photo">{t('media_vault.stats.photos', 'Photos')}</option><option value="video">{t('media_vault.stats.videos', 'Videos')}</option><option value="document">{t('media_vault.stats.documents', 'Documents')}</option></select></label>
          <label className="media-select"><span className="sr-only">{t('media_vault.sort.label', 'Sort media')}</span><select value={sort} onChange={(event) => setSort(event.target.value as 'newest' | 'oldest' | 'title')}><option value="newest">{t('media_vault.sort.newest', 'Newest first')}</option><option value="oldest">{t('media_vault.sort.oldest', 'Oldest first')}</option><option value="title">{t('media_vault.sort.title', 'Title A–Z')}</option></select></label>
        </div>
        <div className="media-category-strip" aria-label={t('media_vault.categories.aria', 'Media categories')}>{categories.map((item) => <button key={item} type="button" data-active={category === item} onClick={() => setCategory(item)}>{item}</button>)}</div>

        {explorerItems.length ? <div className="media-grid">{explorerItems.map((item, index) => <button className={`media-card ${index % 4 === 0 ? 'media-card--wide' : ''}`} key={item.id} type="button" onClick={() => openMedia(item.id)}>
          {item.imageUrl ? <img src={item.imageUrl} alt={item.altText} loading="lazy" onError={(event) => { event.currentTarget.hidden = true; }} /> : <MediaPlaceholder kind={item.kind} />}
          <span className="media-card__shade" />
          <span className="media-card__type"><MediaKindIcon kind={item.kind} /> {item.kind === 'video' ? formatDuration(item.durationSeconds) || t('media_vault.kind.video', 'Video') : item.kind === 'document' ? t('media_vault.kind.document', 'Document') : t('media_vault.kind.photo', 'Photo')}</span>
          <span className="media-card__content"><small>{item.category}</small><strong>{item.title}</strong>{item.location ? <span><MapPin size={13} aria-hidden="true" /> {item.location}</span> : null}</span>
        </button>)}</div> : filtered.length ? <div className="media-empty"><h3>{t('media_vault.empty.featured', 'All matching media is featured above.')}</h3><p>{t('media_vault.empty.featured_note', 'Newer uploads remain in the carousel and are not duplicated in the grid.')}</p></div> : <div className="media-empty"><h3>{t('media_vault.empty.none', 'No public media found.')}</h3><p>{t('media_vault.empty.filters', 'Try clearing one or more filters.')}</p><button className="button button--ghost" type="button" onClick={() => { setQuery(''); setCategory('All'); setKind('all'); }}>{t('media_vault.empty.clear', 'Clear filters')}</button></div>}
      </> : null}
    </section>

    {selected ? <div className="media-viewer" role="dialog" aria-modal="true" aria-label={selected.title} onClick={() => setSelectedId(null)}>
      <button className="media-viewer__close" type="button" onClick={() => setSelectedId(null)} aria-label={t('media_vault.viewer.close', 'Close media viewer')}><X aria-hidden="true" /></button>
      {items.length > 1 ? <button className="media-viewer__nav media-viewer__nav--previous" type="button" onClick={(event) => { event.stopPropagation(); move(-1); }} aria-label={t('media_vault.viewer.previous', 'Previous media')}><ChevronLeft aria-hidden="true" /></button> : null}
      <div className="media-viewer__panel" data-metadata-open={metadataOpen} onClick={(event) => event.stopPropagation()}>
        <div className="media-viewer__visual">
          {selected.kind === 'video' ? <video src={selected.mediaUrl} poster={selected.thumbnailUrl || undefined} controls preload="metadata" playsInline /> : selected.kind === 'document' ? <a className="media-document-link" href={selected.mediaUrl} target="_blank" rel="noreferrer"><FileText size={42} aria-hidden="true" /><span>{t('media_vault.viewer.open_document', 'Open document')}</span></a> : <img src={selected.mediaUrl} alt={selected.altText} />}
        </div>
        <button className="media-viewer__metadata-toggle" type="button" aria-expanded={metadataOpen} aria-controls="media-viewer-metadata" onClick={() => setMetadataOpen((value) => !value)}>
          <span>{metadataOpen ? t('media_vault.viewer.hide_details', 'Hide details') : t('media_vault.viewer.show_details', 'Show details')}</span>
          {metadataOpen ? <ChevronDown size={18} aria-hidden="true" /> : <ChevronUp size={18} aria-hidden="true" />}
        </button>
        <div className="media-viewer__details" id="media-viewer-metadata">
          <p className="eyebrow">{selected.category}</p><h2>{selected.title}</h2>
          {selected.description ? <p>{selected.description}</p> : null}
          {selected.caption ? <p className="media-viewer__caption">{selected.caption}</p> : null}
          <dl>{selected.location ? <div><dt>{t('media_vault.viewer.location', 'Location')}</dt><dd>{selected.location}</dd></div> : null}<div><dt>{t('media_vault.viewer.published', 'Published')}</dt><dd>{formatDate(selected.capturedAt)}</dd></div><div><dt>{t('media_vault.viewer.type', 'Type')}</dt><dd>{selected.kind}{selected.durationSeconds ? ` · ${formatDuration(selected.durationSeconds)}` : ''}</dd></div>{selected.width && selected.height ? <div><dt>{t('media_vault.viewer.dimensions', 'Dimensions')}</dt><dd>{selected.width} × {selected.height}</dd></div> : null}</dl>
          {selected.tags.length ? <div className="media-viewer__tags">{selected.tags.map((tag) => <span key={tag}>{tag}</span>)}</div> : null}
        </div>
      </div>
      {items.length > 1 ? <button className="media-viewer__nav media-viewer__nav--next" type="button" onClick={(event) => { event.stopPropagation(); move(1); }} aria-label={t('media_vault.viewer.next', 'Next media')}><ChevronRight aria-hidden="true" /></button> : null}
    </div> : null}
  </main>;
}
