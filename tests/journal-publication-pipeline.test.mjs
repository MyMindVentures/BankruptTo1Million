import test from 'node:test';
import assert from 'node:assert/strict';
import {
  JOURNAL_PUBLICATION_PIPELINE_STEP_ORDER,
  parseJournalPublicationStatus,
} from '../src/lib/journalPublicationStatus.ts';

test('parseJournalPublicationStatus maps run, steps, and counts', () => {
  const parsed = parseJournalPublicationStatus({
    run: {
      id: 'run-1',
      status: 'processing',
      current_step_key: 'story_english',
      started_at: '2026-07-18T10:00:00.000Z',
      completed_at: null,
      last_error: null,
      metadata: { has_location: true },
    },
    steps: [
      {
        step_key: 'upload',
        label_key: 'journal.admin.pipeline.upload',
        display_order: 1,
        status: 'completed',
        started_at: null,
        completed_at: '2026-07-18T10:00:01.000Z',
        last_error: null,
        detail: {},
      },
      {
        step_key: 'translate_batch_2',
        label_key: 'journal.admin.pipeline.translate_batch',
        display_order: 8,
        status: 'pending',
        started_at: null,
        completed_at: null,
        last_error: null,
        detail: { batch_index: 2, batch_count: 10, languages: ['nl', 'fr', 'de'] },
      },
    ],
    story: { translation_count: 4, expected_translation_count: 30 },
    place_context: {
      generation_status: 'processing',
      translation_count: 1,
      expected_translation_count: 30,
      skipped: false,
    },
  });

  assert.equal(parsed.run?.status, 'processing');
  assert.equal(parsed.steps.length, 2);
  assert.equal(parsed.steps[1].step_key, 'translate_batch_2');
  assert.deepEqual(parsed.steps[1].detail.languages, ['nl', 'fr', 'de']);
  assert.equal(parsed.story.translation_count, 4);
  assert.equal(parsed.place_context.generation_status, 'processing');
});

test('publication pipeline step order keeps translate batches before finalize', () => {
  const uploadIndex = JOURNAL_PUBLICATION_PIPELINE_STEP_ORDER.indexOf('upload');
  const storyIndex = JOURNAL_PUBLICATION_PIPELINE_STEP_ORDER.indexOf('story_english');
  const translateIndex = JOURNAL_PUBLICATION_PIPELINE_STEP_ORDER.indexOf('translate_batch');
  const finalizeIndex = JOURNAL_PUBLICATION_PIPELINE_STEP_ORDER.indexOf('finalize');

  assert.ok(uploadIndex < storyIndex);
  assert.ok(storyIndex < translateIndex);
  assert.ok(translateIndex < finalizeIndex);
});

test('journal admin page uses staged publishJournalPost orchestrator', async () => {
  const { readFileSync } = await import('node:fs');
  const adminPage = readFileSync(new URL('../src/pages/JournalAdminPage.tsx', import.meta.url), 'utf8');
  const adminApi = readFileSync(new URL('../src/lib/journalAdminApi.ts', import.meta.url), 'utf8');

  assert.match(adminPage, /publishJournalPost/);
  assert.match(adminPage, /JournalPublicationProgressPanel/);
  assert.doesNotMatch(adminPage, /generateJournalVenueThankYou/);
  assert.match(adminApi, /finalizeJournalPublication/);
  assert.match(adminApi, /admin_start_journal_publication/);
});
