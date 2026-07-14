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
  assert.match(edgeFunction, /approximately 2500 to 3500 characters/);
  assert.match(edgeFunction, /MIN_BODY_CHARACTERS = 1800/);
  assert.match(edgeFunction, /MAX_BODY_CHARACTERS = 4500/);
  assert.match(edgeFunction, /never cut off a heading, word, sentence or conclusion/);
});

test('database status validation accepts complete article lengths', () => {
  assert.match(migration, /char_length\(trim\(t\.body\)\) between 1800 and 4500/);
  assert.doesNotMatch(migration, /char_length\(body\)\s*=\s*500/);
});

test('prepare RPC only removes empty invalid translations', () => {
  assert.match(migration, /nullif\(trim\(body\), ''\) is null/);
  assert.doesNotMatch(migration, /char_length\(body\) <> 500/);
});
