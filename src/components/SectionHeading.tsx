import type { I18nManifest } from '../lib/i18nManifest';
import { JournalJourneyMapSection } from './JournalJourneyMapSection';
import { cn } from '../lib/utils';

type SectionHeadingProps = {
  eyebrow: string;
  title: string;
  titleId: string;
  children: string;
  align?: 'start' | 'center';
};

export const SECTION_HEADING_I18N_MANIFEST = {
  componentKey: 'components.section.heading',
  namespace: 'ui',
  translationKeys: [
  ] as const,
} as const satisfies I18nManifest;

export function SectionHeading({ eyebrow, title, titleId, children, align = 'start' }: SectionHeadingProps) {
  return (
    <>
      <div className={cn('section-heading', align === 'center' && 'section-heading--center')}>
        <p className="eyebrow">{eyebrow}</p>
        <h2 id={titleId}>{title}</h2>
        <p>{children}</p>
      </div>
      {titleId === 'timeline-title' ? <JournalJourneyMapSection /> : null}
    </>
  );
}
