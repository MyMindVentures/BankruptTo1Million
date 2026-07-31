import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const page = readFileSync(new URL('../src/pages/AdminAiHierarchyPage.tsx', import.meta.url), 'utf8');
const api = readFileSync(new URL('../src/lib/adminHierarchyApi.ts', import.meta.url), 'utf8');
const migration = readFileSync(new URL('../supabase/migrations/20260731180000_admin_ai_hierarchy_read.sql', import.meta.url), 'utf8');
const dashboard = readFileSync(new URL('../src/pages/AdminDashboardPage.tsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/styles/adminAiHierarchy.css', import.meta.url), 'utf8');

test('AI hierarchy uses a read-only admin RPC with safe selected fields', () => {
  assert.match(api, /getAdminAiHierarchy/);
  assert.match(api, /admin_get_ai_hierarchy/);
  assert.match(migration, /has_active_admin_access/);
  assert.match(migration, /reports_to_agent_id/);
  assert.match(migration, /ai_teams/);
  assert.match(migration, /grant execute on function public\\.admin_get_ai_hierarchy\\(\\) to authenticated/);
  assert.doesNotMatch(migration, /insert into public\\.ai_agents|update public\\.ai_agents|delete from public\\.ai_agents/);
});

test('admin hierarchy page handles loading, error, empty and graph diagnostics', () => {
  assert.match(page, /useState.*loading|loading/);
  assert.match(page, /error/);
  assert.match(page, /empty|No AI agents/);
  assert.match(page, /cycle|orphan/i);
  assert.match(page, /mermaid/);
  assert.match(page, /I18N_MANIFEST/);
});

test('admin route renders the live hierarchy section', () => {
  assert.match(dashboard, /AdminAiHierarchyPage/);
  assert.match(dashboard, /path === '\/admin\/ai-hierarchy'/);
  assert.match(css, /admin-ai-hierarchy/);
});

test('hierarchy supports bounded zoom and dynamic team visibility controls', () => {
  assert.match(page, /MIN_ZOOM/);
  assert.match(page, /MAX_ZOOM/);
  assert.match(page, /Zoom in/);
  assert.match(page, /Zoom out/);
  assert.match(page, /Expand all/);
  assert.match(page, /Collapse all/);
  assert.match(page, /hidden/);
  assert.match(page, /expandedTeams/);
});

test('hierarchy source does not expose private agent configuration fields', () => {
  assert.doesNotMatch(migration, /system_prompt|api_key|token|secret|credentials|approval_rules|responsibilities/);
});
