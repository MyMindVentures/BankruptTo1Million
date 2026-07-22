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
  assert.match(page, /Loading concepts…/);
  assert.match(page, /The archive is being prepared\./);
  assert.match(page, /Proof of Mind could not be loaded\./);
});

test('detail page renders required full concept fields', () => {
  for (const label of ['Concept overview', 'Problem and solution', 'Market & audience profile', 'Core capabilities', 'Competition and differentiation', 'Market, business model and validation', 'Roadmap', 'Who we want to meet', 'View Demo']) assert.match(page, new RegExp(label));
  assert.match(lib, /normalizeProofOfMindKeyFeatures/);
  assert.match(lib, /normalizeProofOfMindUrl/);
});

test('Proof of Mind renders founder, evaluation, competition and aggregate lead fields', () => {
  for (const field of ['ProofOfMindFounder', 'ProofOfMindEvaluationSummary', 'ProofOfMindCompetitorComparison', 'ProofOfMindLeadPipelineSummary']) assert.match(lib, new RegExp(field));
  for (const label of ['Created by', 'label="Evaluation"', 'Commercial evaluation', 'Competition and differentiation', 'Why we are different', 'Partner and lead opportunities', 'target slots']) assert.match(page, new RegExp(label));
  assert.match(lib, /lead_pipeline_summary/);
  assert.match(lib, /competition_comparisons/);
  assert.match(page, /concept\.lead_pipeline\.categories/);
  assert.doesNotMatch(page, /email_address|phone|contact_notes/);
});

test('concept cards expose a playable word of the founder video', () => {
  assert.match(lib, /ProofOfMindFounderVideo/);
  assert.match(lib, /founder_video/);
  assert.match(lib, /storage\/v1\/object\/public/);
  assert.match(page, /Word of the Founder/);
  assert.match(page, /<video controls playsInline preload="metadata"/);
  assert.match(page, /founder_video_play/);
  assert.match(page, /concept\.founder_video/);
});
