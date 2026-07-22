import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migration = await readFile(new URL('../supabase/migrations/20260722220000_proof_of_mind_source_versioning.sql', import.meta.url), 'utf8');
const edge = await readFile(new URL('../supabase/functions/orchestrate-concept-ai-enrichment/index.ts', import.meta.url), 'utf8');

test('concept source versions are immutable history with one active version', () => {
  assert.match(migration, /unique \(concept_id, version_number\)/);
  assert.match(migration, /where is_active/);
  assert.match(migration, /for update/);
  assert.match(migration, /has_active_admin_access\(\)/);
  assert.match(migration, /'idea','hidden','queued'/);
});

test('AI orchestrator authenticates admins and records truthful failure state', () => {
  assert.match(edge, /get_my_admin_access/);
  assert.match(edge, /setState\(conceptId, versionId, "failed"/);
  assert.match(edge, /active_source_version_id/);
  assert.match(edge, /overwrite_mode/);
});
