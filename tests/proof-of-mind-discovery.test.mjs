import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const lib = readFileSync(new URL('../src/lib/proofOfMind.ts', import.meta.url), 'utf8');
const page = readFileSync(new URL('../src/pages/ProofOfMindPages.tsx', import.meta.url), 'utf8');
const migration = readFileSync(new URL('../supabase/migrations/20260712170000_proof_of_mind_discovery_leads.sql', import.meta.url), 'utf8');

test('teaser concepts use an active discovery call CTA instead of a disabled teaser button', () => {
  assert.match(page, /Book Discovery Call/);
  assert.match(page, /onDiscovery\(concept\)/);
  assert.doesNotMatch(page, /disabled>Teaser only/);
});

test('discovery form is tied to the selected concept and captures required fields', () => {
  for (const field of ['full_name', 'email', 'company', 'role', 'country', 'interest_message', 'consent_to_contact']) {
    assert.match(page + lib, new RegExp(field));
  }
  assert.match(page, /Discuss \{concept\.title\}/);
  assert.match(lib, /p_concept_id: input\.concept_id/);
});

test('discovery submission uses a Supabase RPC and does not expose full teaser concept data', () => {
  assert.match(lib, /submit_proof_of_mind_discovery_call/);
  assert.match(page, /Protected teaser/);
  const modalSource = page.slice(page.indexOf('function DiscoveryCallModal'), page.indexOf('export function ProofOfMindPage'));
  assert.doesNotMatch(modalSource, /problem_statement|solution_overview|business_model/);
});

test('lead RPC normalizes and reuses leads, upserts concept relation, and prevents duplicates', () => {
  assert.match(migration, /lower\(trim\(p_email\)\)/);
  assert.match(migration, /on conflict \(\(lower\(email\)\)\) do update/);
  assert.match(migration, /public\.leads/);
  assert.match(migration, /source = 'proof_of_mind'/);
  assert.match(migration, /status = 'new'/);
  assert.match(migration, /public\.lead_concepts/);
  assert.match(migration, /primary key \(lead_id, concept_id\)/);
  assert.match(migration, /on conflict \(lead_id, concept_id\) do update/);
  assert.match(migration, /interest_level = 'warm'/);
});

test('raw Supabase errors are not displayed as the only fallback', () => {
  assert.match(page, /The request could not be saved\. Please try again shortly\./);
});


test('discovery success copy references the selected concept instead of a hard-coded venture', () => {
  assert.match(page, /linked to \${concept\.title}/);
  assert.doesNotMatch(page, /linked to Maritex AI/);
});
