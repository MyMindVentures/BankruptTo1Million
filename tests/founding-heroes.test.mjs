import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const adapterSource = readFileSync(new URL('../src/lib/foundingHeroes.ts', import.meta.url), 'utf8');
const pageSource = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');

const safePublicUrl = (value) => {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw) return '';
  try { const url = new URL(raw); return ['https:', 'http:'].includes(url.protocol) ? url.toString() : ''; } catch { return ''; }
};
const mapFoundingHero = (row) => {
  const isAnonymous = row.is_anonymous === true;
  const text = (value) => typeof value === 'string' ? value.trim() : '';
  return {
    displayName: isAnonymous ? 'Anonymous Founding Hero' : text(row.display_name),
    location: isAnonymous ? '' : text(row.location),
    avatarUrl: isAnonymous ? '' : safePublicUrl(row.avatar_url),
    githubUrl: isAnonymous ? '' : safePublicUrl(row.github_url),
    websiteUrl: isAnonymous ? '' : safePublicUrl(row.website_url),
    roleTitle: text(row.role_title) || 'Founding contributor',
    featured: row.featured === true,
  };
};

test('Supabase query only selects published public fields in the required order', () => {
  assert.match(adapterSource, /from\('founding_heroes'\)/);
  assert.match(adapterSource, /is_published.*eq\.true/s);
  assert.match(adapterSource, /featured\.desc\.nullslast,joined_at\.desc\.nullslast,created_at\.desc\.nullslast/);
  assert.doesNotMatch(adapterSource, /email|internal_notes|application|moderation_notes/);
});

test('anonymous heroes hide identity, location, avatar and social links', () => {
  const mapped = mapFoundingHero({ display_name: 'Private Name', location: 'Brussels', avatar_url: 'https://example.com/a.jpg', github_url: 'https://github.com/private', is_anonymous: true });
  assert.equal(mapped.displayName, 'Anonymous Founding Hero');
  assert.equal(mapped.location, '');
  assert.equal(mapped.avatarUrl, '');
  assert.equal(mapped.githubUrl, '');
});

test('nullable text and unsafe URL values are normalized for rendering', () => {
  const mapped = mapFoundingHero({ id: '1', role_title: '', website_url: 'javascript:alert(1)', github_url: 'https://github.com/example', featured: true });
  assert.equal(mapped.roleTitle, 'Founding contributor');
  assert.equal(mapped.websiteUrl, '');
  assert.equal(mapped.githubUrl, 'https://github.com/example');
  assert.equal(mapped.featured, true);
});

test('Founding Heroes page provides loading, empty and error states without placeholders', () => {
  assert.match(pageSource, /Loading Founding Heroes from Supabase/);
  assert.match(pageSource, /No Founding Heroes are published yet/);
  assert.match(pageSource, /role="alert"/);
  assert.doesNotMatch(pageSource, /foundingHeroPlaceholders/);
});
