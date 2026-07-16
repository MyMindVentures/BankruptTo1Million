import type { I18nManifest } from '../lib/i18nManifest';
import { AnimatePresence, motion } from 'motion/react';
import { useState, type ReactNode } from 'react';
import { useWebsiteI18n } from '../lib/websiteI18n';
import './AceternityContentCard.css';

export const ACETERNITY_CONTENT_CARD_I18N_MANIFEST = {
  componentKey: 'components.aceternity.content.card',
  namespace: 'ui',
  translationKeys: [] as const,
  keyPatterns: ['content_card.*'] as const,
} as const satisfies I18nManifest;

export type ContentCardPerson = {
  id?: string;
  name: string;
  avatarSrc?: string;
};

export type AceternityContentCardProps = {
  href: string;
  title: string;
  description?: string;
  authorName?: string;
  avatarSrc?: string;
  people?: ContentCardPerson[];
  imageSrc?: string;
  imageAlt?: string;
  readTime?: string;
  category?: string;
  publishedDate?: string;
  children?: ReactNode;
};

export function AceternityContentCard({
  href,
  title,
  description,
  authorName,
  avatarSrc = '/og-image.png',
  people,
  imageSrc,
  imageAlt = '',
  readTime,
  category,
  publishedDate,
  children,
}: AceternityContentCardProps) {
  const { t } = useWebsiteI18n();
  const [hovered, setHovered] = useState(false);
  const resolvedAuthorName = authorName || t('content_card.author.default', 'Bankrupt to 1 Million');
  const visiblePeople = people?.length ? people : [{ name: resolvedAuthorName, avatarSrc }];
  const peopleLabel = visiblePeople.map((person) => person.name).join(' & ');

  return (
    <a
      className="aceternity-hover-card"
      href={href}
      aria-label={t('content_card.read', 'Read {title}', { title })}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
    >
      <AnimatePresence>
        {hovered ? (
          <motion.span
            className="aceternity-hover-card__background"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          />
        ) : null}
      </AnimatePresence>

      <article className={`aceternity-hover-card__surface${imageSrc ? '' : ' aceternity-hover-card__surface--text-only'}`}>
        {imageSrc ? (
          <div className="aceternity-hover-card__media">
            <img src={imageSrc} alt={imageAlt} loading="lazy" />
            <div className="aceternity-hover-card__media-overlay" />
          </div>
        ) : null}

        <div className="aceternity-hover-card__body">
          <div className="aceternity-hover-card__topline">
            <span className="aceternity-hover-card__category">{category || t('content_card.category.journal', 'Journal')}</span>
            <span>{readTime || t('content_card.read_time.default', '4 min read')}</span>
          </div>

          <div className="aceternity-hover-card__copy">
            <h2>{title}</h2>
            {description ? <p>{description}</p> : null}
          </div>

          <div className="aceternity-hover-card__footer">
            <div className="aceternity-hover-card__author">
              <span className="aceternity-hover-card__avatars" aria-hidden="true">
                {visiblePeople.slice(0, 3).map((person, index) => (
                  <img
                    key={person.id || `${person.name}-${index}`}
                    src={person.avatarSrc || '/og-image.png'}
                    alt=""
                    loading="lazy"
                  />
                ))}
              </span>
              <span>{peopleLabel}</span>
            </div>
            {publishedDate ? <time dateTime={publishedDate}>{children}</time> : null}
            <span className="aceternity-hover-card__arrow" aria-hidden="true">↗</span>
          </div>
        </div>
      </article>
    </a>
  );
}
