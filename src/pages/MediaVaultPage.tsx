import { Camera, ChevronLeft, ChevronRight, FileText, Filter, MapPin, Search, Video, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { getPublicMediaAssets } from '../lib/mediaVault';
import type { MediaVaultKind, PublicMediaAsset } from '../lib/mediaVault';

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

function MediaKindIcon({ kind }: { kind: MediaVaultKind }) {
  if (kind === 'video') return <Video size={14} aria-hidden="true" />;
  if (kind === 'document') return <FileText size={14} aria-hidden="true" />;
  return <Camera size={14} aria-hidden="true" />;
}

export function MediaVaultPage() {
  const [items, setItems] = useState<PublicMediaAsset[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [kind, setKind] = useState<'all' | MediaVaultKind>('all');
  const [sort, setSort] = useState<'newest' | 'oldest' | 'title'>('newest');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getPublicMediaAssets()
      .then((assets) => {
        if (!active) return;
        setItems(assets);
        setStatus('ready');
      })
      .catch((caught: unknown) => {
        if (!active) return;
        setError(caught instanceof Error ? caught.message : 'Media Vault could not be loaded.');
        setStatus('error');
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedId(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedId]);

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

  const selectedIndex = selectedId ? filtered.findIndex((item) => item.id === selectedId) : -1;
  const selected = selectedIndex >= 0 ? filtered[selectedIndex] : null;
  const featured = items.find((item) => item.featured) || items[0] || null;
  const move = (direction: -1 | 1) => {
    if (!filtered.length || selectedIndex < 0) return;
    setSelectedId(filtered[(selectedIndex + direction + filtered.length) % filtered.length].id);
  };

  const photos = items.filter((item) => item.kind === 'photo').length;
  const videos = items.filter((item) => item.kind === 'video').length;
  const documents = items.filter((item) => item.kind === 'document').length;

  return <main className="media-vault" id="top">
    <section className="media-vault__hero" aria-labelledby="media-vault-title">
      <div>
        <p className="eyebrow">The visual archive</p>
        <h1 id="media-vault-title">Media Vault</h1>
        <p>The people, places, setbacks and breakthroughs behind the journey from rock bottom to one million.</p>
        <div className="media-vault__stats" aria-label="Media statistics">
          <span><strong>{photos}</strong> Photos</span>
          <span><strong>{videos}</strong> Videos</span>
          <span><strong>{documents}</strong> Documents</span>
        </div>
      </div>
      {featured ? <button className="media-feature" type="button" onClick={() => setSelectedId(featured.id)} aria-label={`Open featured media: ${featured.title}`}>
        <img src={featured.imageUrl} alt={featured.altText} />
        <span className="media-feature__shade" />
        <span className="media-feature__content">
          <small>Featured media</small>
          <strong>{featured.title}</strong>
          {featured.location ? <span><MapPin size={14} aria-hidden="true" /> {featured.location}</span> : null}
        </span>
      </button> : <div className="media-feature media-feature--empty" aria-hidden="true" />}
    </section>

    <section className="media-explorer" aria-labelledby="media-explorer-title">
      <div className="media-explorer__heading">
        <div><p className="eyebrow">Explore the archive</p><h2 id="media-explorer-title">Every moment tells part of the story.</h2></div>
        <p>{filtered.length} of {items.length} public assets</p>
      </div>

      {status === 'loading' ? <div className="media-state" role="status">Loading published media from Supabase…</div> : null}
      {status === 'error' ? <div className="media-state media-state--error" role="alert"><strong>Media could not be loaded.</strong><span>{error}</span></div> : null}

      {status === 'ready' ? <>
        <div className="media-toolbar">
          <label className="media-search"><Search size={18} aria-hidden="true" /><span className="sr-only">Search media</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search titles, tags or descriptions..." /></label>
          <label className="media-select"><Filter size={17} aria-hidden="true" /><span className="sr-only">Filter media type</span><select value={kind} onChange={(event) => setKind(event.target.value as 'all' | MediaVaultKind)}><option value="all">All media</option><option value="photo">Photos</option><option value="video">Videos</option><option value="document">Documents</option></select></label>
          <label className="media-select"><span className="sr-only">Sort media</span><select value={sort} onChange={(event) => setSort(event.target.value as 'newest' | 'oldest' | 'title')}><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="title">Title A–Z</option></select></label>
        </div>
        <div className="media-category-strip" aria-label="Media categories">{categories.map((item) => <button key={item} type="button" data-active={category === item} onClick={() => setCategory(item)}>{item}</button>)}</div>

        {filtered.length ? <div className="media-grid" role="list">{filtered.map((item, index) => <button className={`media-card ${index % 4 === 0 ? 'media-card--wide' : ''}`} key={item.id} type="button" onClick={() => setSelectedId(item.id)} role="listitem">
          {item.imageUrl ? <img src={item.imageUrl} alt={item.altText} loading="lazy" onError={(event) => { event.currentTarget.hidden = true; }} /> : null}
          <span className="media-card__shade" />
          <span className="media-card__type"><MediaKindIcon kind={item.kind} /> {item.kind === 'video' ? formatDuration(item.durationSeconds) || 'Video' : item.kind === 'document' ? 'Document' : 'Photo'}</span>
          <span className="media-card__content"><small>{item.category}</small><strong>{item.title}</strong>{item.location ? <span><MapPin size={13} aria-hidden="true" /> {item.location}</span> : null}</span>
        </button>)}</div> : <div className="media-empty"><h3>No public media found.</h3><p>Try clearing one or more filters.</p><button className="button button--ghost" type="button" onClick={() => { setQuery(''); setCategory('All'); setKind('all'); }}>Clear filters</button></div>}
      </> : null}
    </section>

    {selected ? <div className="media-viewer" role="dialog" aria-modal="true" aria-label={selected.title} onClick={() => setSelectedId(null)}>
      <button className="media-viewer__close" type="button" onClick={() => setSelectedId(null)} aria-label="Close media viewer"><X aria-hidden="true" /></button>
      <button className="media-viewer__nav media-viewer__nav--previous" type="button" onClick={(event) => { event.stopPropagation(); move(-1); }} aria-label="Previous media"><ChevronLeft aria-hidden="true" /></button>
      <div className="media-viewer__panel" onClick={(event) => event.stopPropagation()}>
        <div className="media-viewer__visual">
          {selected.kind === 'video' ? <video src={selected.mediaUrl} poster={selected.thumbnailUrl || undefined} controls preload="metadata" /> : selected.kind === 'document' ? <a className="media-document-link" href={selected.mediaUrl} target="_blank" rel="noreferrer"><FileText size={42} aria-hidden="true" /><span>Open document</span></a> : <img src={selected.mediaUrl} alt={selected.altText} />}
        </div>
        <div className="media-viewer__details"><p className="eyebrow">{selected.category}</p><h2>{selected.title}</h2>{selected.description ? <p>{selected.description}</p> : null}<dl>{selected.location ? <div><dt>Location</dt><dd>{selected.location}</dd></div> : null}<div><dt>Published</dt><dd>{formatDate(selected.capturedAt)}</dd></div><div><dt>Type</dt><dd>{selected.kind}{selected.durationSeconds ? ` · ${formatDuration(selected.durationSeconds)}` : ''}</dd></div>{selected.width && selected.height ? <div><dt>Dimensions</dt><dd>{selected.width} × {selected.height}</dd></div> : null}</dl><div className="media-viewer__tags">{selected.tags.map((tag) => <span key={tag}>{tag}</span>)}</div></div>
      </div>
      <button className="media-viewer__nav media-viewer__nav--next" type="button" onClick={(event) => { event.stopPropagation(); move(1); }} aria-label="Next media"><ChevronRight aria-hidden="true" /></button>
    </div> : null}
  </main>;
}
