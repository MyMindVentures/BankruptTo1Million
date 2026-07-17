import { Camera, ChevronLeft, ChevronRight, MapPin, Play } from 'lucide-react';
import { useRef } from 'react';
import type { OfferMediaCollection, OfferMediaItem } from '../lib/offers';

type OfferMediaCarouselProps = {
  collection: OfferMediaCollection;
  onOpen: (item: OfferMediaItem) => void;
};

function MediaCard({ item, onOpen }: { item: OfferMediaItem; onOpen: () => void }) {
  const preview = item.thumbnailUrl || (item.kind === 'image' ? item.url : '');

  return (
    <button
      className="offer-footage-card"
      type="button"
      onClick={onOpen}
      aria-label={`Open ${item.title || item.kind}`}
    >
      {preview ? (
        <img src={preview} alt={item.altText} loading="lazy" />
      ) : (
        <span className="offer-footage-card__placeholder">
          {item.kind === 'video' ? <Play size={34} /> : <Camera size={34} />}
        </span>
      )}
      <span className="offer-footage-card__shade" />
      <span className="offer-footage-card__type">
        {item.kind === 'video' ? <><Play size={14} /> Video</> : <><Camera size={14} /> Photo</>}
      </span>
      <span className="offer-footage-card__caption">{item.caption || item.title}</span>
    </button>
  );
}

export function OfferMediaCarousel({ collection, onOpen }: OfferMediaCarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null);

  function scroll(direction: -1 | 1) {
    const track = trackRef.current;
    if (!track) return;
    track.scrollBy({ left: direction * Math.max(track.clientWidth * 0.82, 280), behavior: 'smooth' });
  }

  const showControls = collection.items.length > 1;

  return (
    <article className="offer-collection">
      <header>
        <div>
          <h3>{collection.title}</h3>
          {collection.description ? <p>{collection.description}</p> : null}
        </div>
        <div>
          {collection.location ? <span><MapPin size={14} /> {collection.location}</span> : null}
          {collection.occurredOn ? <span>{new Date(collection.occurredOn).toLocaleDateString()}</span> : null}
        </div>
      </header>

      <div className="offer-carousel">
        {showControls ? (
          <button className="offer-carousel__control offer-carousel__control--previous" type="button" onClick={() => scroll(-1)} aria-label="Previous media">
            <ChevronLeft size={22} />
          </button>
        ) : null}

        <div className="offer-carousel__track" ref={trackRef} tabIndex={0} aria-label={`${collection.title} media carousel`}>
          {collection.items.map((item) => (
            <div className="offer-carousel__slide" key={item.id}>
              <MediaCard item={item} onOpen={() => onOpen(item)} />
            </div>
          ))}
        </div>

        {showControls ? (
          <button className="offer-carousel__control offer-carousel__control--next" type="button" onClick={() => scroll(1)} aria-label="Next media">
            <ChevronRight size={22} />
          </button>
        ) : null}
      </div>
    </article>
  );
}
