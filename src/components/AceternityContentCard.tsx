import type { ReactNode } from 'react';

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
 * Imported from Aceternity UI's "Content Card" / "Author Card" block.
 * Source: https://ui.aceternity.com/blocks/cards/content-card
 *
 * The original block is a full-card link with a background image, an author/read-time
 * row pinned to the top, and article title/description pinned to the bottom. The
 * hover overlay transition and responsive fixed-height editorial card shape are
 * preserved here, with only project data props and Bankrupt to 1 Million tokens.
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
  return (
    <a
      className={`aceternity-content-card group${imageSrc ? '' : ' aceternity-content-card--text-only'}`}
      href={href}
      aria-label={`Read ${title}`}
    >
      {imageSrc ? <img src={imageSrc} alt={imageAlt} className="aceternity-content-card__image" loading="lazy" /> : null}
      <div className="aceternity-content-card__overlay" />
      <div className="aceternity-content-card__inner">
        <div className="aceternity-content-card__author">
          <img src={avatarSrc} alt="" className="aceternity-content-card__avatar" loading="lazy" />
          <div>
            <p>{authorName}</p>
            <span>{readTime}</span>
          </div>
        </div>
        <div className="aceternity-content-card__content">
          <div className="aceternity-content-card__meta">
            <span>{category}</span>
            {publishedDate ? <time dateTime={publishedDate}>{children}</time> : null}
          </div>
          <h2>{title}</h2>
          {description ? <p>{description}</p> : null}
        </div>
      </div>
    </a>
  );
}
