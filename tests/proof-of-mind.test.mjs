import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const lib = readFileSync(new URL('../src/lib/proofOfMind.ts', import.meta.url), 'utf8');
const page = readFileSync(new URL('../src/pages/ProofOfMindPages.tsx', import.meta.url), 'utf8');
const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
const nav = readFileSync(new URL('../src/data/siteContent.ts', import.meta.url), 'utf8');

test('Proof of Mind routes and navigation are registered', () => {
  assert.match(app, /path === '\/proof-of-mind'/);
  assert.match(app, /path\.startsWith\('\/proof-of-mind\/'\)/);
  assert.match(nav, /Proof of Mind/);
});

test('public data is fetched only through Proof of Mind public views', () => {
  assert.match(lib, /from\('proof_of_mind_public_teasers'\)/);
  assert.match(lib, /from\('proof_of_mind_public_details'\)/);
  assert.doesNotMatch(lib, /from\('proof_of_mind_concepts'\)/);
});

test('hidden and teaser concepts are protected from public detail exposure', () => {
  assert.match(lib, /visibility !== 'hidden'/);
  assert.match(lib, /has_public_detail === true && concept\.visibility === 'full'/);
  assert.match(page, /Protected teaser/);
  assert.match(page, /Concept not found or not public/);
});

test('overview includes required hero, stats, filters, loading, empty and error states', () => {
  assert.match(page, /PROOF OF MIND/);
  assert.match(page, /Ideas are easy to dismiss\. A body of work is harder to ignore\./);
  assert.match(page, /Visible concepts/);
  assert.match(page, /Search concepts/);
  assert.match(page, /Loading Proof of Mind concepts/);
  assert.match(page, /The archive is being prepared\./);
  assert.match(page, /Proof of Mind could not be loaded\./);
});

test('detail page renders required full concept fields', () => {
  for (const label of ['Concept overview', 'Problem and solution', 'Audience and use cases', 'Core capabilities', 'Differentiation', 'Business and validation', 'Roadmap and collaboration', 'Media and links']) assert.match(page, new RegExp(label));
  assert.match(lib, /normalizeProofOfMindKeyFeatures/);
  assert.match(lib, /normalizeProofOfMindUrl/);
});
