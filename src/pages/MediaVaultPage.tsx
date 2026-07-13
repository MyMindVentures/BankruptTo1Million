import { CalendarDays, Camera, ChevronLeft, ChevronRight, Clock3, Filter, Grid3X3, MapPin, Maximize2, Pause, Play, Search, SlidersHorizontal, Video, X } from 'lucide-react';
import { useMemo, useState } from 'react';

export type MediaKind = 'photo' | 'video';

type MediaItem = {
  id: string;
  title: string;
  description: string;
  kind: MediaKind;
  category: string;
  location: string;
  capturedAt: string;
  duration?: string;
  imageUrl: string;
  videoUrl?: string;
  tags: string[];
  featured?: boolean;
};

const mediaItems: MediaItem[] = [
  {
    id: 'benejarafe-start',
    title: 'A new chapter in Benejarafe',
    description: 'A quiet Mediterranean morning, a laptop and the decision to keep building despite uncertainty.',
    kind: 'photo',
    category: 'Journey',
    location: 'Benejarafe, Málaga',
    capturedAt: '2026-07-13',
    imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1800&q=85',
    tags: ['journey', 'mediterranean', 'build in public'],
    featured: true,
  },
  {
    id: 'road-work-session',
    title: 'Building from the road',
    description: 'The mission is not being built from a polished office. It is being built wherever there is power, focus and connection.',
    kind: 'photo',
    category: 'Behind the Scenes',
    location: 'Costa del Sol, Spain',
    capturedAt: '2026-07-12',
    imageUrl: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1600&q=85',
    tags: ['laptop', 'work', 'behind the scenes'],
  },
  {
    id: 'mission-film',
    title: 'Why we build in public',
    description: 'A short visual manifesto about rebuilding honestly, finding the right people and turning struggle into momentum.',
    kind: 'video',
    category: 'Mission',
    location: 'Alicante, Spain',
    capturedAt: '2026-07-10',
    duration: '01:42',
    imageUrl: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1600&q=85',
    videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
    tags: ['mission', 'documentary', 'founders'],
  },
  {
    id: 'host-table',
    title: 'A place at the table',
    description: 'Hosts are not background characters. They become part of the journey, the story and the community around it.',
    kind: 'photo',
    category: 'Hosts',
    location: 'Andalusia, Spain',
    capturedAt: '2026-07-09',
    imageUrl: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1600&q=85',
    tags: ['hosts', 'community', 'gratitude'],
  },
  {
    id: 'coastal-road',
    title: 'The road between ideas',
    description: 'Every route, stop and conversation becomes part of the public record of the rebuild.',
    kind: 'video',
    category: 'Road & Travel',
    location: 'Costa Blanca, Spain',
    capturedAt: '2026-07-08',
    duration: '00:58',
    imageUrl: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=85',
    videoUrl: 'https://www.w3schools.com/html/movie.mp4',
    tags: ['road', 'travel', 'journey'],
  },
  {
    id: 'proof-of-mind',
    title: 'Proof of Mind in progress',
    description: 'Concepts stop living in scattered notes and start becoming visible, structured opportunities.',
    kind: 'photo',
    category: 'Proof of Mind',
    location: 'Online',
    capturedAt: '2026-07-07',
    imageUrl: 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1600&q=85',
    tags: ['concepts', 'ventures', 'progress'],
  },
  {
    id: 'golden-hour',
    title: 'Golden hour reset',
    description: 'A pause between difficult decisions, captured as part of the honest rhythm behind the mission.',
    kind: 'photo',
    category: 'Daily Life',
    location: 'Mediterranean Coast',
    capturedAt: '2026-07-06',
    imageUrl: 'https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?auto=format&fit=crop&w=1600&q=85',
    tags: ['daily life', 'sunset', 'reset'],
  },
  {
    id: 'founder-conversation',
    title: 'Founder conversation',
    description: 'Kevin and Micha discussing what to build next, what to stop doing and where the mission needs help.',
    kind: 'video',
    category: 'Kevin & Micha',
    location: 'Spain',
    capturedAt: '2026-07-05',
    duration: '03:14',
    imageUrl: 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=1600&q=85',
    videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
    tags: ['kevin', 'micha', 'founders'],
  },
];

const formatDate = (value: string) => new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${value}T12:00:00`));

export function MediaVaultPage() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [kind, setKind] = useState<'all' | MediaKind>('all');
  const [sort, setSort] = useState<'newest' | 'oldest' | 'title'>('newest');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const categories = useMemo(() => ['All', ...Array.from(new Set(mediaItems.map((item) => item.category)))], []);
  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return mediaItems
      .filter((item) => category === 'All' || item.category === category)
      .filter((item) => kind === 'all' || item.kind === kind)
      .filter((item) => !normalizedQuery || [item.title, item.description, item.location, item.category, ...item.tags].join(' ').toLowerCase().includes(normalizedQuery))
      .sort((a, b) => {
        if (sort === 'title') return a.title.localeCompare(b.title);
        return sort === 'newest' ? b.capturedAt.localeCompare(a.capturedAt) : a.capturedAt.localeCompare(b.capturedAt);
      });
  }, [category, kind, query, sort]);

  const selectedIndex = selectedId ? filteredItems.findIndex((item) => item.id === selectedId) : -1;
  const selected = selectedIndex >= 0 ? filteredItems[selectedIndex] : null;
  const featured = mediaItems.find((item) => item.featured) || mediaItems[0];
  const photoCount = mediaItems.filter((item) => item.kind === 'photo').length;
  const videoCount = mediaItems.filter((item) => item.kind === 'video').length;
  const locationCount = new Set(mediaItems.map((item) => item.location)).size;

  function openItem(id: string) {
    setSelectedId(id);
    setIsPlaying(false);
    document.body.style.overflow = 'hidden';
  }

  function closeViewer() {
    setSelectedId(null);
    setIsPlaying(false);
    document.body.style.overflow = '';
  }

  function moveViewer(direction: -1 | 1) {
    if (!filteredItems.length || selectedIndex < 0) return;
    const nextIndex = (selectedIndex + direction + filteredItems.length) % filteredItems.length;
    setSelectedId(filteredItems[nextIndex].id);
    setIsPlaying(false);
  }

  return (
    <main className="media-vault" id="top">
      <section className="media-vault__hero" aria-labelledby="media-vault-title">
        <div className="media-vault__hero-copy">
          <p className="eyebrow">The visual archive</p>
          <h1 id="media-vault-title">Media Vault</h1>
          <p className="media-vault__lede">The people, places, setbacks and breakthroughs behind the journey from rock bottom to one million.</p>
          <div className="media-vault__stats" aria-label="Media vault statistics">
            <span><strong>{photoCount}</strong> Photos</span>
            <span><strong>{videoCount}</strong> Videos</span>
            <span><strong>{locationCount}</strong> Locations</span>
          </div>
        </div>
        <button className="media-feature" type="button" onClick={() => openItem(featured.id)} aria-label={`Open featured media: ${featured.title}`}>
          <img src={featured.imageUrl} alt="Mediterranean coastline at sunrise" />
          <span className="media-feature__shade" />
          <span className="media-feature__badge">Featured story</span>
          <span className="media-feature__content">
            <span>{featured.category}</span>
            <strong>{featured.title}</strong>
            <small><MapPin size={14} aria-hidden="true" /> {featured.location}</small>
          </span>
          <span className="media-feature__action"><Maximize2 size={18} aria-hidden="true" /> View story</span>
        </button>
      </section>

      <section className="media-explorer" aria-labelledby="media-explorer-title">
        <div className="media-explorer__heading">
          <div>
            <p className="eyebrow">Explore the archive</p>
            <h2 id="media-explorer-title">Every moment tells part of the story.</h2>
          </div>
          <p>{filteredItems.length} of {mediaItems.length} moments</p>
        </div>

        <div className="media-toolbar">
          <label className="media-search">
            <Search size={19} aria-hidden="true" />
            <span className="sr-only">Search media</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search people, places or moments..." />
          </label>
          <label className="media-select">
            <Filter size={17} aria-hidden="true" />
            <span className="sr-only">Filter by media type</span>
            <select value={kind} onChange={(event) => setKind(event.target.value as 'all' | MediaKind)}>
              <option value="all">All media</option>
              <option value="photo">Photos</option>
              <option value="video">Videos</option>
            </select>
          </label>
          <label className="media-select">
            <SlidersHorizontal size={17} aria-hidden="true" />
            <span className="sr-only">Sort media</span>
            <select value={sort} onChange={(event) => setSort(event.target.value as 'newest' | 'oldest' | 'title')}>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="title">Title A–Z</option>
            </select>
          </label>
        </div>

        <div className="media-category-strip" aria-label="Media categories">
          {categories.map((item) => (
            <button key={item} type="button" data-active={category === item} onClick={() => setCategory(item)}>{item}</button>
          ))}
        </div>

        {filteredItems.length ? (
          <div className="media-grid" role="list">
            {filteredItems.map((item, index) => (
              <button className={`media-card media-card--${index % 5 === 0 ? 'wide' : index % 7 === 0 ? 'tall' : 'standard'}`} type="button" key={item.id} onClick={() => openItem(item.id)} role="listitem">
                <img src={item.imageUrl} alt={item.title} loading="lazy" />
                <span className="media-card__shade" />
                <span className="media-card__type">{item.kind === 'video' ? <Video size={15} aria-hidden="true" /> : <Camera size={15} aria-hidden="true" />}{item.kind === 'video' ? item.duration : 'Photo'}</span>
                <span className="media-card__content">
                  <span>{item.category}</span>
                  <strong>{item.title}</strong>
                  <small><MapPin size={13} aria-hidden="true" /> {item.location}</small>
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="media-empty">
            <Grid3X3 size={34} aria-hidden="true" />
            <h3>No moments found.</h3>
            <p>Try clearing one or more filters.</p>
            <button className="button button--ghost" type="button" onClick={() => { setQuery(''); setCategory('All'); setKind('all'); }}>Clear filters</button>
          </div>
        )}
      </section>

      {selected ? (
        <div className="media-viewer" role="dialog" aria-modal="true" aria-label={selected.title} onClick={closeViewer}>
          <button className="media-viewer__close" type="button" onClick={closeViewer} aria-label="Close media viewer"><X aria-hidden="true" /></button>
          <button className="media-viewer__nav media-viewer__nav--previous" type="button" onClick={(event) => { event.stopPropagation(); moveViewer(-1); }} aria-label="Previous media"><ChevronLeft aria-hidden="true" /></button>
          <div className="media-viewer__panel" onClick={(event) => event.stopPropagation()}>
            <div className="media-viewer__visual">
              {selected.kind === 'video' && isPlaying && selected.videoUrl ? (
                <video src={selected.videoUrl} poster={selected.imageUrl} controls autoPlay onPause={() => setIsPlaying(false)} />
              ) : (
                <img src={selected.imageUrl} alt={selected.title} />
              )}
              {selected.kind === 'video' && !isPlaying ? (
                <button className="media-viewer__play" type="button" onClick={() => setIsPlaying(true)}><Play fill="currentColor" aria-hidden="true" /> <span>Play film</span></button>
              ) : null}
              {selected.kind === 'video' && isPlaying ? <span className="media-viewer__playing"><Pause size={14} aria-hidden="true" /> Now playing</span> : null}
            </div>
            <div className="media-viewer__details">
              <p className="eyebrow">{selected.category}</p>
              <h2>{selected.title}</h2>
              <p>{selected.description}</p>
              <dl>
                <div><dt><CalendarDays size={16} aria-hidden="true" /> Captured</dt><dd>{formatDate(selected.capturedAt)}</dd></div>
                <div><dt><MapPin size={16} aria-hidden="true" /> Location</dt><dd>{selected.location}</dd></div>
                <div><dt>{selected.kind === 'video' ? <Clock3 size={16} aria-hidden="true" /> : <Camera size={16} aria-hidden="true" />} Type</dt><dd>{selected.kind === 'video' ? `Video · ${selected.duration}` : 'Photography'}</dd></div>
              </dl>
              <div className="media-viewer__tags">{selected.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
              <p className="media-viewer__counter">{selectedIndex + 1} / {filteredItems.length}</p>
            </div>
          </div>
          <button className="media-viewer__nav media-viewer__nav--next" type="button" onClick={(event) => { event.stopPropagation(); moveViewer(1); }} aria-label="Next media"><ChevronRight aria-hidden="true" /></button>
        </div>
      ) : null}
    </main>
  );
}
