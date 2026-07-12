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

test('public data is fetched only through Proof of Mind RPC functions', () => {
  assert.match(lib, /supabase\.rpc\('get_proof_of_mind_concepts'/);
  assert.match(lib, /supabase\.rpc\('get_proof_of_mind_concept_by_slug'/);
  assert.doesNotMatch(lib, /from\('proof_of_mind_concepts'\)/);
});

test('hidden and teaser concepts are protected from public detail exposure', () => {
  assert.match(lib, /visibility !== 'hidden'/);
  assert.match(lib, /is_fully_openable === true && concept\.visibility === 'full'/);
  assert.match(page, /Teaser only/);
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
  for (const label of ['Problem', 'Solution', 'Target audience', 'Key features', 'Business model']) assert.match(page, new RegExp(label));
  assert.match(lib, /normalizeProofOfMindKeyFeatures/);
  assert.match(lib, /normalizeProofOfMindUrl/);
});
