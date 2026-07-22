import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const page = readFileSync('src/pages/KevinGoalsRoadmapPage.tsx', 'utf8');
const data = readFileSync('src/lib/kevinGoalsRoadmap.ts', 'utf8');
const migration = readFileSync('supabase/migrations/20260722190000_kevin_goals_roadmap.sql', 'utf8');

test('Kevin goals page loads localized entity content from Supabase', () => {
  assert.match(data, /get_localized_website_page/);
  assert.match(data, /p_language_code: language/);
  assert.match(page, /\[language\]/);
  assert.doesNotMatch(page, /const goals\s*=\s*\[/);
});

test('Kevin goals page has truthful loading, error, and empty states', () => {
  assert.match(page, /'loading' \| 'ready' \| 'empty' \| 'error'/);
  assert.match(page, /kevin_goals_roadmap\.states\.loading/);
  assert.match(page, /kevin_goals_roadmap\.states\.error/);
  assert.match(page, /kevin_goals_roadmap\.states\.empty/);
});

test('Kevin goals page is registry-backed and bootstraps active languages', () => {
  assert.match(page, /KEVIN_GOALS_ROADMAP_PAGE_I18N_MANIFEST/);
  assert.match(migration, /website_ui_components/);
  assert.match(migration, /website_ui_component_translation_keys/);
  assert.match(migration, /cross join public\.site_languages sl/i);
  assert.match(migration, /sl\.is_active=true/i);
});
