import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Circle, LoaderCircle, MinusCircle } from 'lucide-react';
import { getJournalPublicationStatus, type JournalPublicationStatus, type PublicationStep } from '../lib/journalAdminApi';
import { useWebsiteI18n } from '../lib/websiteI18n';

type Props = {
  postId: string;
  active: boolean;
  onStatus?: (status: JournalPublicationStatus) => void;
};

function stepLabel(step: PublicationStep, t: ReturnType<typeof useWebsiteI18n>['t']) {
  if (step.step_key.startsWith('translate_batch_')) {
    const languages = Array.isArray(step.detail.languages)
      ? step.detail.languages.map(String).join(', ')
      : '';
    const batchIndex = Number(step.detail.batch_index ?? step.step_key.replace('translate_batch_', ''));
    const batchCount = Number(step.detail.batch_count ?? 0);
    return t(
      'journal.admin.pipeline.translate_batch',
      'Translating {languages} (batch {current}/{total})',
      { languages, current: batchIndex, total: batchCount || batchIndex },
    );
  }

  const fallbacks: Record<string, string> = {
    upload: 'Upload saved',
    story_english: 'Generate English story',
    place_english: 'Generate place info (English)',
    area_english: 'Generate area info (English)',
    thank_you_english: 'Generate thank-you (English)',
    finalize: 'Finalize and publish',
  };

  return t(step.label_key, fallbacks[step.step_key] ?? step.step_key);
}

function statusLabel(status: PublicationStep['status'], t: ReturnType<typeof useWebsiteI18n>['t']) {
  switch (status) {
    case 'running':
      return t('journal.admin.pipeline.status.running', 'Running');
    case 'completed':
      return t('journal.admin.pipeline.status.completed', 'Completed');
    case 'failed':
      return t('journal.admin.pipeline.status.failed', 'Failed');
    case 'skipped':
      return t('journal.admin.pipeline.status.skipped', 'Skipped');
    default:
      return t('journal.admin.pipeline.status.pending', 'Pending');
  }
}

function StepIcon({ status }: { status: PublicationStep['status'] }) {
  if (status === 'running') return <LoaderCircle className="spin" size={16} />;
  if (status === 'completed') return <CheckCircle2 size={16} />;
  if (status === 'failed') return <AlertCircle size={16} />;
  if (status === 'skipped') return <MinusCircle size={16} />;
  return <Circle size={16} />;
}

export function JournalPublicationProgressPanel({ postId, active, onStatus }: Props) {
  const { t } = useWebsiteI18n();
  const [status, setStatus] = useState<JournalPublicationStatus | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!postId || !active) return undefined;

    let cancelled = false;

    async function poll() {
      try {
        const next = await getJournalPublicationStatus(postId);
        if (cancelled) return;
        setStatus(next);
        setLoadError(null);
        onStatus?.(next);
      } catch (reason) {
        if (cancelled) return;
        setLoadError(reason instanceof Error ? reason.message : 'Could not load publication progress.');
      }
    }

    void poll();
    const timer = window.setInterval(() => {
      void poll();
    }, 1000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [postId, active, onStatus]);

  if (!active) return null;

  const steps = status?.steps ?? [];
  const runStatus = status?.run?.status;

  return (
    <section className="journal-publication-progress" aria-live="polite">
      <div className="journal-publication-progress-heading">
        <p>{t('journal.admin.pipeline.heading', 'Publication pipeline')}</p>
        <span>
          {runStatus === 'completed'
            ? t('journal.admin.pipeline.run_completed', 'All steps completed')
            : t('journal.admin.pipeline.run_in_progress', 'Working through staged publication…')}
        </span>
      </div>

      {loadError && <div className="journal-publication-progress-error">{loadError}</div>}

      <ol className="journal-publication-progress-steps">
        {steps.map((step) => (
          <li key={step.step_key} className={`journal-publication-step is-${step.status}`}>
            <StepIcon status={step.status} />
            <div>
              <strong>{stepLabel(step, t)}</strong>
              <span>{statusLabel(step.status, t)}</span>
              {step.last_error && <small>{step.last_error}</small>}
            </div>
          </li>
        ))}
      </ol>

      {status && (
        <div className="journal-publication-progress-counts">
          <span>
            {t('journal.admin.pipeline.story_count', 'Story translations: {current}/{expected}', {
              current: status.story.translation_count,
              expected: status.story.expected_translation_count,
            })}
          </span>
          {!status.place_context.skipped && (
            <span>
              {t('journal.admin.pipeline.place_count', 'Place context: {current}/{expected}', {
                current: status.place_context.translation_count,
                expected: status.place_context.expected_translation_count,
              })}
            </span>
          )}
        </div>
      )}
    </section>
  );
}
