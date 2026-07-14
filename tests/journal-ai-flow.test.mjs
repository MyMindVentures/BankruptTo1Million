import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const apiSource = await readFile(new URL('../src/lib/journalAdminApi.ts', import.meta.url), 'utf8');
const pageSource = await readFile(new URL('../src/pages/JournalAdminPage.tsx', import.meta.url), 'utf8');

test('journal frontend uses the atomic prepare RPC', () => {
  assert.match(apiSource, /\/rest\/v1\/rpc\/admin_prepare_journal_ai/);
  assert.match(pageSource, /await prepareJournalAi\(/);
  assert.doesNotMatch(pageSource, /saveJournalEventContext/);
  assert.doesNotMatch(pageSource, /saveJournalAiSource/);
});

test('journal frontend uses one canonical authenticated Edge Function', () => {
  assert.match(apiSource, /\/functions\/v1\/generate-journal-ai-post/);
  assert.doesNotMatch(apiSource, /generate-journal-ai-post-browser/);
  assert.match(apiSource, /Authorization: `Bearer \$\{token\(\)\}`/);
  assert.match(apiSource, /apikey: anonKey/);
});

test('success requires published, completed and exactly 15 translations', () => {
  assert.match(apiSource, /status\.generation_status === 'completed'/);
  assert.match(apiSource, /status\.status === 'published'/);
  assert.match(apiSource, /Number\(status\.translation_count\) === 15/);
  assert.doesNotMatch(apiSource, /window\.alert/);
});

test('backend errors remain visible and editor stays open', () => {
  assert.match(apiSource, /status\.last_error \|\| 'AI generation failed\.'/);
  assert.match(pageSource, /The editor remains open and the event can be retried safely/);
  assert.match(pageSource, /role="status" aria-live="polite"/);
});

test('all required progress stages are represented', () => {
  for (const stage of [
    'Saving event…',
    'Uploading media',
    'Preparing AI source…',
    'Generating story…',
    'Translating 15 languages…',
    'Publishing…',
  ]) {
    assert.ok(pageSource.includes(stage), `Missing progress stage: ${stage}`);
  }
});
