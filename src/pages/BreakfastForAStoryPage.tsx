import { Camera, Globe2, HeartHandshake, Newspaper } from 'lucide-react';
import type { I18nManifest } from '../lib/i18nManifest';
import { useWebsiteI18n } from '../lib/websiteI18n';
import './BreakfastForAStoryPage.css';

export const BREAKFAST_FOR_A_STORY_PAGE_I18N_MANIFEST = {
  componentKey: 'pages.breakfast.for.a.story',
  namespace: 'breakfast_for_story',
  translationKeys: [
    'breakfast_for_story.eyebrow',
    'breakfast_for_story.title',
    'breakfast_for_story.introduction',
    'breakfast_for_story.question',
    'breakfast_for_story.exchange',
    'breakfast_for_story.no_charity',
    'breakfast_for_story.value.photos',
    'breakfast_for_story.value.story',
    'breakfast_for_story.value.visibility',
    'breakfast_for_story.values_aria',
    'breakfast_for_story.closing',
    'breakfast_for_story.website_label',
  ] as const,
} as const satisfies I18nManifest;

export function BreakfastForAStoryPage() {
  const { t } = useWebsiteI18n();

  return (
    <main id="top" className="breakfast-story-page">
      <section className="breakfast-story-card" aria-labelledby="breakfast-story-title">
        <div className="breakfast-story-icon" aria-hidden="true">
          <HeartHandshake size={36} />
        </div>

        <p className="eyebrow">
          {t('breakfast_for_story.eyebrow', 'A simple exchange')}
        </p>

        <h1 id="breakfast-story-title">
          {t('breakfast_for_story.title', 'Breakfast for a Story')}
        </h1>

        <p className="breakfast-story-lead">
          {t(
            'breakfast_for_story.introduction',
            'We are Kevin and Micha, rebuilding our lives from rock bottom while documenting every honest step of the journey.',
          )}
        </p>

        <div className="breakfast-story-question">
          {t(
            'breakfast_for_story.question',
            'Would you be willing to offer us a simple breakfast?',
          )}
        </div>

        <p>
          {t(
            'breakfast_for_story.exchange',
            'In return, we will create beautiful photos, write an authentic Journal story about your place, and share it through our website and social channels.',
          )}
        </p>

        <p className="breakfast-story-note">
          {t(
            'breakfast_for_story.no_charity',
            'We are not asking for charity. We want to create something valuable in return.',
          )}
        </p>

        <div
          className="breakfast-story-values"
          aria-label={t('breakfast_for_story.values_aria', 'What we give in return')}
        >
          <div>
            <Camera aria-hidden="true" size={24} />
            <span>{t('breakfast_for_story.value.photos', 'Beautiful, authentic photos')}</span>
          </div>
          <div>
            <Newspaper aria-hidden="true" size={24} />
            <span>{t('breakfast_for_story.value.story', 'An honest Journal story')}</span>
          </div>
          <div>
            <Globe2 aria-hidden="true" size={24} />
            <span>{t('breakfast_for_story.value.visibility', 'Visibility on our website and social media')}</span>
          </div>
        </div>

        <p className="breakfast-story-closing">
          {t(
            'breakfast_for_story.closing',
            'One breakfast can become a meaningful story that keeps travelling long after we leave.',
          )}
        </p>

        <a className="breakfast-story-website" href="https://www.bankruptto1million.com">
          <Globe2 aria-hidden="true" size={18} />
          <span>{t('breakfast_for_story.website_label', 'bankruptto1million.com')}</span>
        </a>
      </section>
    </main>
  );
}
