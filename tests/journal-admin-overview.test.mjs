import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseJournalOverviewPayload } from '../src/lib/journalAdminPayload.ts';

const migration = readFileSync(new URL('../supabase/migrations/20260717170000_journal_admin_overview.sql', import.meta.url), 'utf8');
const authMigration = readFileSync(new URL('../supabase/migrations/20260717180000_fix_admin_dashboard_auth.sql', import.meta.url), 'utf8');
const adminApi = readFileSync(new URL('../src/lib/journalAdminApi.ts', import.meta.url), 'utf8');
const adminPage = readFileSync(new URL('../src/pages/JournalAdminPage.tsx', import.meta.url), 'utf8');

test('dashboard auth migration aligns overview RPCs with allowlist access', () => {
  assert.match(authMigration, /create or replace function public\.get_admin_dashboard_overview/);
  assert.match(authMigration, /has_active_admin_access\(\)/);
  assert.doesNotMatch(authMigration, /require_media_manager/);
});

test('migration defines admin_get_journal_overview with status counts', () => {
  assert.match(migration, /create or replace function public\.admin_get_journal_overview/);
  assert.match(migration, /has_active_admin_access\(\)/);
  assert.match(migration, /'all', count\(\*\)/);
  assert.match(migration, /grant execute on function public\.admin_get_journal_overview/);
});

test('journal admin api uses overview RPC instead of direct table reads', () => {
  assert.match(adminApi, /admin_get_journal_overview/);
  assert.match(adminApi, /getJournalOverview/);
  assert.doesNotMatch(adminApi, /journal_posts\?select=/);
});

test('journal admin page uses backend counts and loading guard', () => {
  assert.match(adminPage, /getJournalOverview/);
  assert.match(adminPage, /loading \|\| !counts \? '—'/);
  assert.doesNotMatch(adminPage, /listJournalPosts/);
  assert.doesNotMatch(adminPage, /posts\.filter\(\(post\) => post\.status/);
});

test('parseJournalOverviewPayload validates rows and counts', () => {
  const parsed = parseJournalOverviewPayload({
    rows: [{
      id: '11111111-1111-1111-1111-111111111111',
      title: 'Test post',
      slug: 'test-post',
      status: 'published',
      body: 'Body',
      content_format: 'markdown',
      original_language: 'en',
      is_featured: false,
      is_vision_feature: false,
      created_at: '2026-07-16T10:00:00Z',
      updated_at: '2026-07-16T10:00:00Z',
    }],
    counts: { all: 50, draft: 14, scheduled: 0, published: 36, archived: 0 },
  });

  assert.equal(parsed.rows.length, 1);
  assert.equal(parsed.rows[0].slug, 'test-post');
  assert.deepEqual(parsed.counts, { all: 50, draft: 14, scheduled: 0, published: 36, archived: 0 });
});

test('parseJournalOverviewPayload rejects invalid counts', () => {
  assert.throws(
    () => parseJournalOverviewPayload({ rows: [], counts: { all: -1 } }),
    /invalid status counts/i,
  );
});
