import type { I18nManifest } from '../lib/i18nManifest';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { JourneyFootageCarousel, type JourneyFootageItem } from './journal/JourneyFootageCarousel';
import { MissionLogo } from './MissionLogo';
import { useWebsiteI18n } from '../lib/websiteI18n';
import './AceternityContentCard.css';

export const ACETERNITY_CONTENT_CARD_I18N_MANIFEST = {
  componentKey: 'components.aceternity.content.card',
  namespace: 'content_card',
  translationKeys: [
    'content_card.author.default',
    'content_card.category.journal',
    'content_card.read',
    'content_card.read_time',
    'content_card.read_time.default',
  ] as const,
  keyPatterns: ['journal.footage.*'] as const,
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
  people?: ContentCardPerson[];
  imageSrc?: string;
  imageAlt?: string;
  footage?: JourneyFootageItem[];
  readTime?: string;
  category?: string;
  publishedDate?: string;
  formattedDate?: string;
};

function PersonAvatar({ person, className }: { person: ContentCardPerson; className: string }) {
  if (person.avatarSrc) {
    return <img className={className} src={person.avatarSrc} alt="" loading="lazy" decoding="async" />;
  }

  return (
    <span className={`${className} aceternity-hover-card__avatar-fallback`} aria-hidden="true">
      <MissionLogo className="aceternity-hover-card__avatar-logo" decorative />
    </span>
  );
}

export function AceternityContentCard({
  href,
  title,
  description,
  authorName,
  people,
  imageSrc,
  imageAlt = '',
  footage,
  readTime,
  category,
  publishedDate,
  formattedDate,
}: AceternityContentCardProps) {
  const { t } = useWebsiteI18n();
  const [hovered, setHovered] = useState(false);
  const resolvedAuthorName = authorName || t('content_card.author.default', 'Bankrupt to 1 Million');
  const visiblePeople = people?.length ? people : [{ name: resolvedAuthorName }];
  const peopleLabel = visiblePeople.map((person) => person.name).join(' & ');
  const resolvedReadTime = readTime || t('content_card.read_time.default', '4 min read');
  const resolvedCategory = category || t('content_card.category.journal', 'Journal');
  const dateLabel = formattedDate || '';
  const hasFootage = Boolean(footage?.length);
  const showCoverImage = !hasFootage && Boolean(imageSrc);

  return (
    <div
      className="aceternity-hover-card"
      data-i18n-ignore="true"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setHovered(true)}
      onBlurCapture={() => setHovered(false)}
    >
      <a
        className="aceternity-hover-card__stretched-link"
        href={href}
        aria-label={t('content_card.read', 'Read {title}', { title })}
      />

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

      <article className="aceternity-hover-card__surface">
        <div className={`aceternity-hover-card__media-band${hasFootage ? ' aceternity-hover-card__media-band--footage' : showCoverImage ? '' : ' aceternity-hover-card__media-band--brand'}`}>
          {hasFootage ? (
            <div className="aceternity-hover-card__media-overlay aceternity-hover-card__media-overlay--footage">
              <JourneyFootageCarousel items={footage} title={title} embedInCard />
            </div>
          ) : showCoverImage ? (
            <>
              <img className="aceternity-hover-card__cover" src={imageSrc} alt={imageAlt} loading="lazy" decoding="async" />
              <div className="aceternity-hover-card__media-overlay" aria-hidden="true" />
            </>
          ) : (
            <div className="aceternity-hover-card__brand-stage" aria-hidden="true">
              <MissionLogo className="aceternity-hover-card__brand-logo" decorative />
            </div>
          )}
          <div className="aceternity-hover-card__brand-mark" aria-hidden="true">
            <MissionLogo className="aceternity-hover-card__brand-mark-logo" decorative />
          </div>
        </div>

        <div className="aceternity-hover-card__body">
          <div className="aceternity-hover-card__topline">
            <span className="aceternity-hover-card__category">{resolvedCategory}</span>
            <span className="aceternity-hover-card__read-time">{resolvedReadTime}</span>
          </div>

          <div className="aceternity-hover-card__copy">
            <h2>{title}</h2>
            {description ? <p>{description}</p> : null}
          </div>

          <div className="aceternity-hover-card__footer">
            <div className="aceternity-hover-card__author">
              <span className="aceternity-hover-card__avatars" aria-hidden="true">
                {visiblePeople.slice(0, 3).map((person, index) => (
                  <PersonAvatar
                    key={person.id || `${person.name}-${index}`}
                    person={person}
                    className="aceternity-hover-card__avatar"
                  />
                ))}
              </span>
              <span className="aceternity-hover-card__author-name">{peopleLabel}</span>
            </div>
            {publishedDate && dateLabel ? (
              <time className="aceternity-hover-card__date" dateTime={publishedDate}>{dateLabel}</time>
            ) : null}
            <span className="aceternity-hover-card__arrow" aria-hidden="true">↗</span>
          </div>
        </div>
      </article>
    </div>
  );
}
