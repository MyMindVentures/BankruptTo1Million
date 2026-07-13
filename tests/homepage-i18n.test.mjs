import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const homePagePath = new URL('../src/pages/HomePage.tsx', import.meta.url);
const siteContentPath = new URL('../src/data/siteContent.ts', import.meta.url);

test('homepage resolves all public copy through explicit translation keys', async () => {
  const source = await readFile(homePagePath, 'utf8');

  const requiredKeys = [
    'home.seo.title',
    'home.seo.description',
    'home.page_aria',
    'home.hero.eyebrow',
    'home.hero.title',
    'home.hero.description',
    'home.hero.primary_cta',
    'home.hero.secondary_cta',
    'home.hero.actions_aria',
    'home.hero.card_aria',
    'home.hero.card_quote',
    'home.hero.card_description',
    'home.story.eyebrow',
    'home.story.title',
    'home.story.description',
    'home.story.body_one',
    'home.story.body_two',
    'home.platform.eyebrow',
    'home.platform.title',
    'home.platform.description',
    'home.platform.features_aria',
    'home.roadmap.eyebrow',
    'home.roadmap.title',
    'home.roadmap.description',
    'home.roadmap.list_aria',
    'home.contribute.eyebrow',
    'home.contribute.title',
    'home.contribute.description',
    'home.contribute.actions_aria',
    'home.contribute.primary_cta',
    'home.contribute.secondary_cta',
  ];

  for (const key of requiredKeys) {
    assert.match(source, new RegExp(key.replaceAll('.', '\\.')));
  }

  assert.doesNotMatch(source, /feature_\$\{index|item_\$\{index/);
  assert.match(source, /document\.title = pageTitle/);
  assert.match(source, /setMetaDescription\(pageDescription\)/);
});

test('homepage collections use stable semantic translation namespaces', async () => {
  const source = await readFile(siteContentPath, 'utf8');

  const requiredNamespaces = [
    'home.platform.features.living_documentary',
    'home.platform.features.founder_journal',
    'home.platform.features.interactive_journey_map',
    'home.platform.features.community_hub',
    'home.platform.features.venture_studio_showcase',
    'home.platform.features.giving_back_platform',
    'home.roadmap.items.foundation',
    'home.roadmap.items.community',
    'home.roadmap.items.storytelling',
    'home.roadmap.items.momentum',
  ];

  for (const key of requiredNamespaces) {
    assert.match(source, new RegExp(key.replaceAll('.', '\\.')));
  }
});
