import { Camera, ChevronLeft, ChevronRight, Filter, MapPin, Play, Search, Video, X } from 'lucide-react';
import { useMemo, useState } from 'react';

type MediaKind = 'photo' | 'video';
type MediaItem = {
  id: string;
  title: string;
  description: string;
  kind: MediaKind;
  category: string;
  location: string;
  capturedAt: string;
  imageUrl: string;
  videoUrl?: string;
  duration?: string;
  tags: string[];
};

const items: MediaItem[] = [
  { id:'benejarafe', title:'A new chapter in Benejarafe', description:'A Mediterranean morning, a laptop and the decision to keep building despite uncertainty.', kind:'photo', category:'Journey', location:'Benejarafe, Málaga', capturedAt:'2026-07-13', imageUrl:'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1800&q=85', tags:['journey','mediterranean','build in public'] },
  { id:'road-work', title:'Building from the road', description:'The mission is built wherever there is power, focus and connection.', kind:'photo', category:'Behind the Scenes', location:'Costa del Sol, Spain', capturedAt:'2026-07-12', imageUrl:'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1600&q=85', tags:['laptop','work'] },
  { id:'mission-film', title:'Why we build in public', description:'A short visual manifesto about rebuilding honestly and turning struggle into momentum.', kind:'video', category:'Mission', location:'Alicante, Spain', capturedAt:'2026-07-10', imageUrl:'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1600&q=85', videoUrl:'https://www.w3schools.com/html/mov_bbb.mp4', duration:'01:42', tags:['mission','documentary'] },
  { id:'host-table', title:'A place at the table', description:'Hosts become part of the journey, the story and the community around it.', kind:'photo', category:'Hosts', location:'Andalusia, Spain', capturedAt:'2026-07-09', imageUrl:'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1600&q=85', tags:['hosts','community'] },
  { id:'coastal-road', title:'The road between ideas', description:'Every route, stop and conversation becomes part of the public record.', kind:'video', category:'Road & Travel', location:'Costa Blanca, Spain', capturedAt:'2026-07-08', imageUrl:'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=85', videoUrl:'https://www.w3schools.com/html/movie.mp4', duration:'00:58', tags:['road','travel'] },
  { id:'proof-of-mind', title:'Proof of Mind in progress', description:'Concepts stop living in scattered notes and become visible opportunities.', kind:'photo', category:'Proof of Mind', location:'Online', capturedAt:'2026-07-07', imageUrl:'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1600&q=85', tags:['concepts','ventures'] },
];

export function MediaVaultPage() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [kind, setKind] = useState<'all' | MediaKind>('all');
  const [sort, setSort] = useState<'newest' | 'oldest' | 'title'>('newest');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const categories = useMemo(() => ['All', ...Array.from(new Set(items.map((item) => item.category)))], []);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => category === 'All' || item.category === category)
      .filter((item) => kind === 'all' || item.kind === kind)
      .filter((item) => !q || [item.title,item.description,item.location,item.category,...item.tags].join(' ').toLowerCase().includes(q))
      .sort((a,b) => sort === 'title' ? a.title.localeCompare(b.title) : sort === 'newest' ? b.capturedAt.localeCompare(a.capturedAt) : a.capturedAt.localeCompare(b.capturedAt));
  }, [category, kind, query, sort]);

  const selectedIndex = selectedId ? filtered.findIndex((item) => item.id === selectedId) : -1;
  const selected = selectedIndex >= 0 ? filtered[selectedIndex] : null;
  const move = (direction: -1 | 1) => {
    if (!filtered.length || selectedIndex < 0) return;
    setSelectedId(filtered[(selectedIndex + direction + filtered.length) % filtered.length].id);
  };

  return <main className="media-vault" id="top">
    <section className="media-vault__hero">
      <div><p className="eyebrow">The visual archive</p><h1>Media Vault</h1><p>The people, places, setbacks and breakthroughs behind the journey from rock bottom to one million.</p><div className="media-vault__stats"><span><strong>{items.filter(i=>i.kind==='photo').length}</strong> Photos</span><span><strong>{items.filter(i=>i.kind==='video').length}</strong> Videos</span><span><strong>{new Set(items.map(i=>i.location)).size}</strong> Locations</span></div></div>
      <button className="media-feature" type="button" onClick={()=>setSelectedId(items[0].id)}><img src={items[0].imageUrl} alt={items[0].title}/><span className="media-feature__shade"/><span className="media-feature__content"><small>Featured story</small><strong>{items[0].title}</strong><span><MapPin size={14}/> {items[0].location}</span></span></button>
    </section>

    <section className="media-explorer">
      <div className="media-explorer__heading"><div><p className="eyebrow">Explore the archive</p><h2>Every moment tells part of the story.</h2></div><p>{filtered.length} of {items.length} moments</p></div>
      <div className="media-toolbar">
        <label className="media-search"><Search size={18}/><span className="sr-only">Search media</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search people, places or moments..."/></label>
        <label className="media-select"><Filter size={17}/><span className="sr-only">Filter type</span><select value={kind} onChange={e=>setKind(e.target.value as 'all'|MediaKind)}><option value="all">All media</option><option value="photo">Photos</option><option value="video">Videos</option></select></label>
        <label className="media-select"><span className="sr-only">Sort media</span><select value={sort} onChange={e=>setSort(e.target.value as 'newest'|'oldest'|'title')}><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="title">Title A–Z</option></select></label>
      </div>
      <div className="media-category-strip">{categories.map(item=><button key={item} type="button" data-active={category===item} onClick={()=>setCategory(item)}>{item}</button>)}</div>
      {filtered.length ? <div className="media-grid">{filtered.map((item,index)=><button className={`media-card ${index%4===0?'media-card--wide':''}`} key={item.id} type="button" onClick={()=>setSelectedId(item.id)}><img src={item.imageUrl} alt={item.title} loading="lazy"/><span className="media-card__shade"/><span className="media-card__type">{item.kind==='video'?<Video size={14}/>:<Camera size={14}/>} {item.kind==='video'?item.duration:'Photo'}</span><span className="media-card__content"><small>{item.category}</small><strong>{item.title}</strong><span><MapPin size={13}/> {item.location}</span></span></button>)}</div> : <div className="media-empty"><h3>No moments found.</h3><p>Try clearing one or more filters.</p><button className="button button--ghost" type="button" onClick={()=>{setQuery('');setCategory('All');setKind('all')}}>Clear filters</button></div>}
    </section>

    {selected ? <div className="media-viewer" role="dialog" aria-modal="true" aria-label={selected.title} onClick={()=>setSelectedId(null)}>
      <button className="media-viewer__close" type="button" onClick={()=>setSelectedId(null)} aria-label="Close"><X/></button>
      <button className="media-viewer__nav media-viewer__nav--previous" type="button" onClick={e=>{e.stopPropagation();move(-1)}} aria-label="Previous"><ChevronLeft/></button>
      <div className="media-viewer__panel" onClick={e=>e.stopPropagation()}><div className="media-viewer__visual">{selected.kind==='video'&&selected.videoUrl?<video src={selected.videoUrl} poster={selected.imageUrl} controls/>:<img src={selected.imageUrl} alt={selected.title}/>} {selected.kind==='video'?<span className="media-viewer__play"><Play size={16}/> Video</span>:null}</div><div className="media-viewer__details"><p className="eyebrow">{selected.category}</p><h2>{selected.title}</h2><p>{selected.description}</p><dl><div><dt>Location</dt><dd>{selected.location}</dd></div><div><dt>Date</dt><dd>{selected.capturedAt}</dd></div><div><dt>Type</dt><dd>{selected.kind}{selected.duration?` · ${selected.duration}`:''}</dd></div></dl><div className="media-viewer__tags">{selected.tags.map(tag=><span key={tag}>{tag}</span>)}</div></div></div>
      <button className="media-viewer__nav media-viewer__nav--next" type="button" onClick={e=>{e.stopPropagation();move(1)}} aria-label="Next"><ChevronRight/></button>
    </div>:null}
  </main>;
}
