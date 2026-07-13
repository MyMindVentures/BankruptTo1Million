import { JournalJourneyExperience } from './JournalJourneyExperience';
import { cn } from '../lib/utils';

type SectionHeadingProps = {
  eyebrow: string;
  title: string;
  titleId: string;
  children: string;
  align?: 'start' | 'center';
};

export function SectionHeading({ eyebrow, title, titleId, children, align = 'start' }: SectionHeadingProps) {
  return (
    <>
      <div className={cn('section-heading', align === 'center' && 'section-heading--center')}>
        <p className="eyebrow">{eyebrow}</p>
        <h2 id={titleId}>{title}</h2>
        <p>{children}</p>
      </div>
      {titleId === 'timeline-title' ? <JournalJourneyExperience /> : null}
    </>
  );
}
