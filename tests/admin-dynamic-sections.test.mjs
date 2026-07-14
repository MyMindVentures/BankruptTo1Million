import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const page = readFileSync(new URL('../src/pages/AdminSectionPage.tsx', import.meta.url), 'utf8');
const api = readFileSync(new URL('../src/lib/adminApi.ts', import.meta.url), 'utf8');
const dashboard = readFileSync(new URL('../src/pages/AdminDashboardPage.tsx', import.meta.url), 'utf8');
const metadataMigration = readFileSync(new URL('../supabase/migrations/20260715013000_dynamic_admin_sections.sql', import.meta.url), 'utf8');
const dashboardMigration = readFileSync(new URL('../supabase/migrations/20260715014500_dynamic_admin_dashboard.sql', import.meta.url), 'utf8');

const routes = [
  '/admin/journey', '/admin/break-the-circle', '/admin/media', '/admin/people', '/admin/proof-of-mind',
  '/admin/leads', '/admin/applications', '/admin/founding-heroes', '/admin/journal/comments',
  '/admin/issues', '/admin/users', '/admin/settings', '/admin/audit',
];

test('generic admin page contains no hardcoded section config map', () => {
  assert.doesNotMatch(page, /const configs\s*:/);
  assert.match(page, /getAdminSectionDefinition\(path/);
  assert.match(page, /getAdminSectionRows\(nextDefinition/);
});

test('all generic admin routes are seeded in Supabase metadata', () => {
  for (const route of routes) assert.match(metadataMigration, new RegExp(route.replaceAll('/', '\\/')));
});

test('metadata includes fields, types, filters, rendering and ordering', () => {
  assert.match(metadataMigration, /create table if not exists public\.admin_sections/);
  assert.match(metadataMigration, /create table if not exists public\.admin_section_fields/);
  assert.match(metadataMigration, /input_type text not null/);
  assert.match(metadataMigration, /options jsonb not null/);
  assert.match(metadataMigration, /variant text not null/);
  assert.match(metadataMigration, /order_field text not null/);
});

test('metadata RPC is restricted to active administrators', () => {
  assert.match(metadataMigration, /if not public\.has_active_admin_access\(\)/);
  assert.match(metadataMigration, /grant execute on function public\.get_admin_section_definition\(text\) to authenticated/);
  assert.match(metadataMigration, /enable row level security/);
});

test('proof of mind no longer orders by unverified display_order', () => {
  assert.doesNotMatch(page, /proof_of_mind_concepts/);
  assert.match(metadataMigration, /'proof_of_mind_concepts'.*'updated_at','desc'/s);
});

test('PostgREST diagnostics preserve code, details and hint', () => {
  assert.match(api, /error\.code/);
  assert.match(api, /error\.details/);
  assert.match(api, /error\.hint/);
});

test('dashboard queries are independently observable', () => {
  assert.match(api, /Object\.entries\(sources\)/);
  assert.match(api, /errors: Object\.fromEntries/);
  assert.match(dashboard, /Promise\.allSettled/);
  assert.match(dashboard, /data\?\.errors\.tasks/);
});

test('dashboard KPIs and quick actions come from Supabase', () => {
  assert.match(dashboardMigration, /create table if not exists public\.admin_dashboard_kpis/);
  assert.match(dashboard, /getAdminDashboardKpis/);
  assert.match(dashboard, /data\?\.modules/);
  assert.doesNotMatch(dashboard, /\['Journal posts'/);
});

test('editor preserves typed values and only submits editable metadata fields', () => {
  assert.match(page, /coerceValue/);
  assert.match(page, /field\.inputType === 'number'/);
  assert.match(page, /JSON\.parse/);
  assert.match(api, /field\.showInEditor && !field\.readOnly/);
});
