import { AnimatePresence, motion } from 'motion/react';
import { useState, type ReactNode } from 'react';
import './AceternityContentCard.css';

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
  authorName = 'Bankrupt to 1 Million',
  avatarSrc = '/og-image.png',
  people,
  imageSrc,
  imageAlt = '',
  readTime = '4 min read',
  category = 'Journal',
  publishedDate,
  children,
}: AceternityContentCardProps) {
  const [hovered, setHovered] = useState(false);
  const visiblePeople = people?.length ? people : [{ name: authorName, avatarSrc }];
  const peopleLabel = visiblePeople.map((person) => person.name).join(' & ');

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
