import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const source = await readFile(new URL('../src/lib/supportMission.ts', import.meta.url), 'utf8');

function categoryBlock(id) {
  const marker = `id: '${id}'`;
  const start = source.indexOf(marker);
  assert.notEqual(start, -1, `missing category ${id}`);
  const end = source.indexOf('},', start);
  return source.slice(start, end);
}

test('defines all required support categories', () => {
  const required = ['founding-hero', 'technology-ai', 'design-creative', 'business-entrepreneurship', 'mental-wellbeing', 'storytelling-community', 'practical-support', 'financial-resource-support', 'share-the-mission'];
  for (const id of required) assert.match(source, new RegExp(`id: '${id}'`));
});

test('mental wellbeing category includes privacy and medical-care safeguards', () => {
  const block = categoryBlock('mental-wellbeing');
  assert.match(block, /private by default/i);
  assert.match(block, /does not expose health details/i);
  assert.match(source, /do not replace licensed medical care/i);
});

test('opportunities are filtered by category and inactive status', () => {
  assert.match(source, /opportunities\.filter/);
  assert.match(source, /paused/);
  assert.match(source, /archived/);
  assert.match(source, /closed/);
});

test('support offer submission targets private applications and disables public recognition by default', () => {
  assert.match(source, /from\('applications'\)/);
  assert.match(source, /public_recognition_allowed: false/);
  assert.match(source, /consent_to_public_recognition/);
});
