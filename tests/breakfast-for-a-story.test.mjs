import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const page = readFileSync('src/pages/BreakfastForAStoryPage.tsx', 'utf8');
const routes = readFileSync('src/lib/publicRoutes.tsx', 'utf8');
const migration = readFileSync(
  'supabase/migrations/20260722111500_complete_breakfast_for_story_i18n.sql',
  'utf8',
);

test('Breakfast for a Story is mounted as a public route', () => {
  assert.match(routes, /'\/breakfast-for-a-story': \(\) => <BreakfastForAStoryPage \/>/);
});

test('Breakfast for a Story declares every translated UI key', () => {
  const calls = [...page.matchAll(/t\(\s*'([^']+)'/g)].map((match) => match[1]);
  const manifestBlock = page.match(/translationKeys:\s*\[([\s\S]*?)\]\s*as const/)?.[1] ?? '';

  assert.ok(calls.length > 0);
  for (const key of calls) {
    assert.match(manifestBlock, new RegExp(`'${key.replaceAll('.', '\\.')}'`));
  }
});

test('Breakfast for a Story is registry-backed with active-language translations', () => {
  assert.match(migration, /k\.translation_key = any\(array\[/);
  assert.match(migration, /cross join public\.site_languages sl/);
  assert.match(migration, /sl\.is_active = true/);
  assert.match(migration, /'pages\.breakfast\.for\.a\.story'/);
  assert.match(migration, /insert into public\.website_ui_component_translation_keys/);
  assert.match(migration, /'breakfast_for_story\.values_aria'/);
});
