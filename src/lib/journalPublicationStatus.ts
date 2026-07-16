export type PublicationStepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

export type PublicationStep = {
  step_key: string;
  label_key: string;
  display_order: number;
  status: PublicationStepStatus;
  started_at: string | null;
  completed_at: string | null;
  last_error: string | null;
  detail: Record<string, unknown>;
};

export type JournalPublicationStatus = {
  run: {
    id: string;
    status: string;
    current_step_key: string | null;
    started_at: string;
    completed_at: string | null;
    last_error: string | null;
    metadata: Record<string, unknown>;
  } | null;
  steps: PublicationStep[];
  story: {
    translation_count: number;
    expected_translation_count: number;
  };
  place_context: {
    generation_status: string;
    translation_count: number;
    expected_translation_count: number;
    skipped: boolean;
  };
};

export const JOURNAL_PUBLICATION_PIPELINE_STEP_ORDER = [
  'upload',
  'story_english',
  'place_english',
  'area_english',
  'thank_you_english',
  'translate_batch',
  'finalize',
] as const;

export function parseJournalPublicationStatus(payload: unknown): JournalPublicationStatus {
  const row = (payload ?? {}) as Record<string, unknown>;
  const run = row.run as Record<string, unknown> | null;
  const steps = Array.isArray(row.steps) ? row.steps : [];

  return {
    run: run ? {
      id: String(run.id ?? ''),
      status: String(run.status ?? 'pending'),
      current_step_key: run.current_step_key == null ? null : String(run.current_step_key),
      started_at: String(run.started_at ?? ''),
      completed_at: run.completed_at == null ? null : String(run.completed_at),
      last_error: run.last_error == null ? null : String(run.last_error),
      metadata: (run.metadata as Record<string, unknown>) ?? {},
    } : null,
    steps: steps.map((step) => {
      const item = step as Record<string, unknown>;
      return {
        step_key: String(item.step_key ?? ''),
        label_key: String(item.label_key ?? ''),
        display_order: Number(item.display_order ?? 0),
        status: String(item.status ?? 'pending') as PublicationStepStatus,
        started_at: item.started_at == null ? null : String(item.started_at),
        completed_at: item.completed_at == null ? null : String(item.completed_at),
        last_error: item.last_error == null ? null : String(item.last_error),
        detail: (item.detail as Record<string, unknown>) ?? {},
      };
    }),
    story: {
      translation_count: Number((row.story as Record<string, unknown> | undefined)?.translation_count ?? 0),
      expected_translation_count: Number((row.story as Record<string, unknown> | undefined)?.expected_translation_count ?? 0),
    },
    place_context: {
      generation_status: String((row.place_context as Record<string, unknown> | undefined)?.generation_status ?? 'not_requested'),
      translation_count: Number((row.place_context as Record<string, unknown> | undefined)?.translation_count ?? 0),
      expected_translation_count: Number((row.place_context as Record<string, unknown> | undefined)?.expected_translation_count ?? 0),
      skipped: Boolean((row.place_context as Record<string, unknown> | undefined)?.skipped),
    },
  };
}
