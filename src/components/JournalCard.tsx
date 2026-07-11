import { ArrowRight } from 'lucide-react';
import { getPostAuthors, type PublicJournalPost } from '../lib/journal';

export type JournalCardVariant = 'featured' | 'standard' | 'compact';

export type JournalCardProps = {
  post: PublicJournalPost;
  variant?: JournalCardVariant;
  ctaLabel?: string;
  coverVideoUrl?: string;
};

function formatDate(value?: string) {
  return value ? new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(value)) : 'Unpublished';
}

function getTagNames(post: PublicJournalPost) {
  return (post.journal_post_tags || [])
    .map((tag) => tag.journal_tags?.name)
    .filter((name): name is string => Boolean(name))
    .slice(0, 3);
}

export function JournalCard({ post, variant = 'standard', ctaLabel = 'Read story', coverVideoUrl }: JournalCardProps) {
  const authors = getPostAuthors(post);
  const primaryAuthor = authors[0];
  const tags = getTagNames(post);
  const href = `/journal/${post.slug}`;
  const description = post.displaySubtitle || post.displayExcerpt;
  const category = post.journal_categories?.name || 'Journal';
  const readTime = `${post.reading_time_minutes || 4} min read`;
  const publishedLabel = formatDate(post.published_at);
  const hasCoverMedia = Boolean(coverVideoUrl || post.cover_image_url);

  return (
    <article className={`journal-card journal-card--${variant}${hasCoverMedia ? ' journal-card--media' : ' journal-card--no-media'}`}>
      <a className="journal-card__link" href={href} aria-label={`${ctaLabel}: ${post.displayTitle}`}>
        <div className="journal-card__backdrop" aria-hidden="true" />
        <div className="journal-card__media" aria-hidden={!hasCoverMedia}>
          {coverVideoUrl ? (
            <video className="journal-card__asset" src={coverVideoUrl} muted loop playsInline preload="metadata" />
          ) : post.cover_image_url ? (
            <img className="journal-card__asset" src={post.cover_image_url} alt={post.cover_image_alt || ''} loading={variant === 'featured' ? 'eager' : 'lazy'} />
          ) : (
            <div className="journal-card__fallback" aria-hidden="true">
              <span>{category}</span>
              <strong>{post.displayTitle.slice(0, 1)}</strong>
            </div>
          )}
        </div>
        <div className="journal-card__body">
          <div className="journal-card__topline">
            <span className="journal-card__category">{category}</span>
            <span className="journal-card__dot" aria-hidden="true" />
            <time dateTime={post.published_at}>{publishedLabel}</time>
            <span className="journal-card__dot" aria-hidden="true" />
            <span>{readTime}</span>
          </div>

          <div className="journal-card__main">
            <h2>{post.displayTitle}</h2>
            {description ? <p>{description}</p> : null}
          </div>

          <div className="journal-card__footer">
            <div className="journal-card__author">
              <img src={primaryAuthor?.avatar_url || '/og-image.png'} alt="" loading="lazy" />
              <span>
                <strong>{primaryAuthor?.display_name || 'Bankrupt to 1 Million'}</strong>
                {primaryAuthor?.role ? <small>{primaryAuthor.role}</small> : null}
              </span>
            </div>
            <span className="journal-card__cta">
              {ctaLabel}
              <ArrowRight size={17} aria-hidden="true" />
            </span>
          </div>

          {tags.length ? (
            <ul className="journal-card__tags" aria-label="Journal tags">
              {tags.map((tag) => <li key={tag}>{tag}</li>)}
            </ul>
          ) : null}
        </div>
      </a>
    </article>
  );
}
