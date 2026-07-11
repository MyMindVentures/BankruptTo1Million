import { AnimatePresence, motion } from 'motion/react';
import { useState, type ReactNode } from 'react';
import './AceternityContentCard.css';

export type AceternityContentCardProps = {
  href: string;
  title: string;
  description?: string;
  authorName?: string;
  avatarSrc?: string;
  imageSrc?: string;
  imageAlt?: string;
  readTime?: string;
  category?: string;
  publishedDate?: string;
  children?: ReactNode;
};

/**
 * Adaptation of Aceternity UI's Card Hover Effect pattern.
 * Source: https://ui.aceternity.com/components/card-hover-effect
 *
 * The animated hover background, AnimatePresence transition and layered card
 * structure are retained. Project-specific journal data is mapped through props.
 */
export function AceternityContentCard({
  href,
  title,
  description,
  authorName = 'Bankrupt to 1 Million',
  avatarSrc = '/og-image.png',
  imageSrc,
  imageAlt = '',
  readTime = '4 min read',
  category = 'Journal',
  publishedDate,
  children,
}: AceternityContentCardProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <a
      className="aceternity-hover-card"
      href={href}
      aria-label={`Read ${title}`}
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
            <span className="aceternity-hover-card__category">{category}</span>
            <span>{readTime}</span>
          </div>

          <div className="aceternity-hover-card__copy">
            <h2>{title}</h2>
            {description ? <p>{description}</p> : null}
          </div>

          <div className="aceternity-hover-card__footer">
            <div className="aceternity-hover-card__author">
              <img src={avatarSrc} alt="" loading="lazy" />
              <span>{authorName}</span>
            </div>
            {publishedDate ? <time dateTime={publishedDate}>{children}</time> : null}
            <span className="aceternity-hover-card__arrow" aria-hidden="true">↗</span>
          </div>
        </div>
      </article>
    </a>
  );
}
