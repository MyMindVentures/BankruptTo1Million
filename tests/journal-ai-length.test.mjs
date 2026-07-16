import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const edgeFunction = await readFile(
  new URL('../supabase/functions/generate-journal-ai-post/index.ts', import.meta.url),
  'utf8',
);
const migration = await readFile(
  new URL('../supabase/migrations/20260714182000_expand_journal_ai_body_length.sql', import.meta.url),
  'utf8',
);

test('journal AI no longer truncates bodies to 500 characters', () => {
  assert.doesNotMatch(edgeFunction, /slice\(0,\s*497\)/);
  assert.doesNotMatch(edgeFunction, /padEnd\(500/);
  assert.doesNotMatch(edgeFunction, /exactly 500 characters/i);
});

test('journal AI targets complete 2500 to 3500 character articles', () => {
  assert.match(edgeFunction, /preferred_min: 2400/);
  assert.match(edgeFunction, /preferred_max: 3400/);
  assert.match(edgeFunction, /default_body_characters/);
  assert.match(edgeFunction, /markdown_headings/);
});

test('database status validation accepts complete article lengths', () => {
  assert.match(migration, /char_length\(trim\(t\.body\)\) between 1800 and 4500/);
  assert.doesNotMatch(migration, /char_length\(body\)\s*=\s*500/);
});

test('prepare RPC only removes empty invalid translations', () => {
  assert.match(migration, /nullif\(trim\(body\), ''\) is null/);
  assert.doesNotMatch(migration, /char_length\(body\) <> 500/);
});

test('journal AI loads active languages from site_languages', () => {
  assert.match(edgeFunction, /fetchActiveLanguages/);
  assert.match(edgeFunction, /\.from\("site_languages"\)/);
  assert.doesNotMatch(edgeFunction, /"ja","ko"\]/);
  assert.doesNotMatch(edgeFunction, /Expected 15 translations/);
});

test('journal AI generates translations in configurable language batches', () => {
  assert.match(edgeFunction, /chunkLanguages/);
  assert.match(edgeFunction, /batch_size/);
  assert.match(edgeFunction, /upsert_journal_ai_translation_batch/);
  assert.match(edgeFunction, /generateBatchTranslations/);
  assert.match(edgeFunction, /for \(let batchIndex = 0; batchIndex < batches\.length; batchIndex \+= 1\)/);
  assert.doesNotMatch(edgeFunction, /translations object for \$\{langs\.join\(", "\)\}/);
});
