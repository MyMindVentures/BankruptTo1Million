import { Camera, ChevronLeft, ChevronRight, MapPin, Play } from 'lucide-react';
import { useRef } from 'react';
import type { OfferMediaCollection, OfferMediaItem } from '../lib/offers';
import type { I18nManifest } from '../lib/i18nManifest';
import { useWebsiteI18n } from '../lib/websiteI18n';
import './OfferMediaCarousel.css';

export const OFFER_MEDIA_CAROUSEL_I18N_MANIFEST = {
  componentKey: 'offers.media.carousel',
  namespace: 'offers.media',
  translationKeys: [
    'offers.media.kind.video',
    'offers.media.kind.photo',
    'offers.media.kind.image',
    'offers.media.controls.previous',
    'offers.media.controls.next',
    'offers.media.aria.open',
    'offers.media.aria.carousel',
  ] as const,
} as const satisfies I18nManifest;

type OfferMediaCarouselProps = {
// ...existing code...
function MediaCard({ item, onOpen }: { item: OfferMediaItem; onOpen: () => void }) {
  const { t } = useWebsiteI18n();
  const preview = item.thumbnailUrl || (item.kind === 'image' ? item.url : '');

  return (
    <button
      className="offer-footage-card"
      type="button"
      onClick={onOpen}
      aria-label={t('offers.media.aria.open', 'Open {kind}', { kind: item.title || t(`offers.media.kind.${item.kind}`, item.kind) })}
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
        {item.kind === 'video' ? <><Play size={14} /> {t('offers.media.kind.video', 'Video')}</> : <><Camera size={14} /> {t('offers.media.kind.photo', 'Photo')}</>}
      </span>
      <span className="offer-footage-card__caption">{item.caption || item.title}</span>
    </button>
  );
}

export function OfferMediaCarousel({ collection, onOpen }: OfferMediaCarouselProps) {
  const { t, formatDate } = useWebsiteI18n();
  const trackRef = useRef<HTMLDivElement>(null);
// ...existing code...
      <header>
        <div>
          <h3>{collection.title}</h3>
          {collection.description ? <p>{collection.description}</p> : null}
        </div>
        <div>
          {collection.location ? <span><MapPin size={14} /> {collection.location}</span> : null}
          {collection.occurredOn ? <span>{formatDate(collection.occurredOn)}</span> : null}
        </div>
      </header>

      <div className="offer-carousel">
        {showControls ? (
          <button className="offer-carousel__control offer-carousel__control--previous" type="button" onClick={() => scroll(-1)} aria-label={t('offers.media.controls.previous', 'Previous media')}>
            <ChevronLeft size={22} />
          </button>
        ) : null}

        <div className="offer-carousel__track" ref={trackRef} tabIndex={0} aria-label={t('offers.media.aria.carousel', '{title} media carousel', { title: collection.title })}>
          {collection.items.map((item) => (
            <div className="offer-carousel__slide" key={item.id}>
              <MediaCard item={item} onOpen={() => onOpen(item)} />
            </div>
          ))}
        </div>

        {showControls ? (
          <button className="offer-carousel__control offer-carousel__control--next" type="button" onClick={() => scroll(1)} aria-label={t('offers.media.controls.next', 'Next media')}>
            <ChevronRight size={22} />
          </button>
        ) : null}
      </div>
    </article>
  );
}
