import type { I18nManifest } from '../../lib/i18nManifest';
import { ExternalLink, X } from 'lucide-react';
import { useWebsiteI18n } from '../../lib/websiteI18n';
import { poiTypeKey, type JournalPlaceContextPoi } from '../../lib/journalPlaceContext';

export const JOURNAL_POI_MAP_DETAIL_CARD_I18N_MANIFEST = {
  componentKey: 'journal.poi.map.detail.card',
  namespace: 'journal.place_context',
  translationKeys: [
    'journal.place_context.map.card.close_label',
    'journal.place_context.map.card.order',
    'journal.place_context.map.open_in_maps',
    'journal.place_context.poi_type.culture',
    'journal.place_context.poi_type.food',
    'journal.place_context.poi_type.landmark',
    'journal.place_context.poi_type.museum',
    'journal.place_context.poi_type.nature',
    'journal.place_context.poi_type.other',
  ] as const,
  keyPatterns: [
    'journal.place_context.map.card.*',
    'journal.place_context.poi_type.*',
  ] as const,
} as const satisfies I18nManifest;

type CardPosition = { x: number; y: number };

export function JournalPoiMapDetailCard({
  poi,
  position,
  pinned,
  onClose,
  onCardEnter,
  onCardLeave,
}: {
  poi: JournalPlaceContextPoi;
  position: CardPosition;
  pinned: boolean;
  onClose: () => void;
  onCardEnter: () => void;
  onCardLeave: () => void;
}) {
  const { t } = useWebsiteI18n();
  const typeLabel = t(poiTypeKey(poi.poi_type), poi.poi_type);
  const orderLabel = t('journal.place_context.map.card.order', 'Stop {order}', { order: poi.display_order });

  return (
    <div
      className={`journal-poi-map__detail-card${pinned ? ' is-pinned' : ''}`}
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
      role={pinned ? 'dialog' : 'tooltip'}
      aria-label={poi.title}
      onMouseEnter={onCardEnter}
      onMouseLeave={onCardLeave}
    >
      {pinned ? (
        <button
          type="button"
          className="journal-poi-map__detail-close"
          onClick={onClose}
          aria-label={t('journal.place_context.map.card.close_label', 'Close point of interest details')}
        >
          <X size={16} aria-hidden="true" />
        </button>
      ) : null}
      <p className="journal-poi-map__detail-meta">
        <span className="journal-poi-map__detail-order">{orderLabel}</span>
        <span className="journal-poi-map__detail-type">{typeLabel}</span>
      </p>
      <h5 className="journal-poi-map__detail-title">{poi.title}</h5>
      <p className="journal-poi-map__detail-description">{poi.description}</p>
      {poi.google_maps_url ? (
        <a
          className="journal-poi-map__detail-link"
          href={poi.google_maps_url}
          target="_blank"
          rel="noopener noreferrer"
        >
          <span>{t('journal.place_context.map.open_in_maps', 'Open in Google Maps')}</span>
          <ExternalLink size={14} aria-hidden="true" />
        </a>
      ) : null}
    </div>
  );
}
