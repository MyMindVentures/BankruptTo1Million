import type { I18nManifest } from '../../lib/i18nManifest';
import { useEffect, useMemo, useState } from 'react';
import { AceternityContentCard } from '../AceternityContentCard';
import type { JourneyFootageItem } from './JourneyFootageCarousel';
import type { PublicJournalPost } from '../../lib/journal';
import { getJournalPostFootage, type JournalFootageItem } from '../../lib/journalFootage';
import { formatJournalPeople, getJournalDisplayPeople } from '../../lib/journalPeople';
import { useWebsiteI18n } from '../../lib/websiteI18n';

export const JOURNAL_POST_CARD_I18N_MANIFEST = {
  componentKey: 'components.journal.post.card',
  namespace: 'content_card',
  translationKeys: [
    'content_card.category.journal',
    'content_card.read_time',
  ] as const,
  keyPatterns: ['journal.footage.*'] as const,
  entityContent: {
    tables: ['journal_posts', 'journal_translations', 'journal_categories', 'journal_category_translations', 'journal_post_media', 'media_assets'],
  },
} as const satisfies I18nManifest;

export type JournalPostCardProps = {
  post: PublicJournalPost;
  href?: string;
  categoryLabel?: string;
  readTimeLabel?: string;
};

function mapFootageItems(items: JournalFootageItem[]): JourneyFootageItem[] {
  return items.map((item) => ({
    id: item.id,
    url: item.url,
    asset_type: item.asset_type,
    mime_type: item.mime_type,
    thumbnail_url: item.thumbnail_url,
    caption: item.caption,
    alt_text: item.alt_text,
    display_order: item.display_order,
  }));
}

export function JournalPostCard({ post, href, categoryLabel, readTimeLabel }: JournalPostCardProps) {
  const { t, formatDate } = useWebsiteI18n();
  const people = getJournalDisplayPeople(post);
  const publishedAt = post.published_at;
  const [footage, setFootage] = useState<JourneyFootageItem[]>([]);

  const altLabels = useMemo(() => ({
    image: t('journal.footage.alt.image', 'Event photo {number}'),
    video: t('journal.footage.alt.video', 'Event video {number}'),
  }), [t]);

  useEffect(() => {
    let cancelled = false;
    setFootage([]);

    getJournalPostFootage(post.id, altLabels)
      .then((items) => {
        if (cancelled || !items.length) return;
        setFootage(mapFootageItems(items));
      })
      .catch(() => {
        if (!cancelled) setFootage([]);
      });

    return () => { cancelled = true; };
  }, [altLabels, post.id]);

  return (
    <AceternityContentCard
      href={href || `/journal/${post.slug}`}
      title={post.displayTitle}
      description={post.displayExcerpt || post.displaySubtitle}
      authorName={formatJournalPeople(people)}
      people={people.map((person) => ({
        id: person.id,
        name: person.display_name,
        avatarSrc: person.avatar_url,
      }))}
      imageSrc={post.cover_image_url || undefined}
      imageAlt={post.cover_image_alt || post.displayTitle}
      footage={footage}
      readTime={readTimeLabel || t('content_card.read_time', '{minutes} min read', {
        minutes: post.reading_time_minutes || 4,
      })}
      category={categoryLabel || post.journal_categories?.name || t('content_card.category.journal', 'Journal')}
      publishedDate={publishedAt}
      formattedDate={publishedAt ? formatDate(publishedAt) : undefined}
    />
  );
}
