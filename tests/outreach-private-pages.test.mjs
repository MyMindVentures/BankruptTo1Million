import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  mapResponseToStatus,
  normalizeOutreachStatus,
  parseOutreachOverviewPayload,
  parseOutreachPath,
} from '../src/lib/outreachAdminPayload.ts';

const migration = readFileSync(new URL('../supabase/migrations/20260717100000_private_outreach_pages.sql', import.meta.url), 'utf8');
const adminApi = readFileSync(new URL('../src/lib/outreachAdminApi.ts', import.meta.url), 'utf8');
const publicApi = readFileSync(new URL('../src/lib/outreachPublicApi.ts', import.meta.url), 'utf8');
const adminPage = readFileSync(new URL('../src/pages/OutreachAdminPage.tsx', import.meta.url), 'utf8');
const privatePage = readFileSync(new URL('../src/pages/OutreachPrivatePage.tsx', import.meta.url), 'utf8');
const mainEntry = readFileSync(new URL('../src/main.tsx', import.meta.url), 'utf8');

test('migration stores only token hashes and exposes public/admin outreach RPCs', () => {
  assert.match(migration, /outreach_access_tokens[\s\S]*?token_hash text not null unique/);
  assert.match(migration, /outreach_hash_token/);
  assert.match(migration, /create or replace function public\.get_outreach_page_public/);
  assert.match(migration, /grant execute on function public\.get_outreach_page_public\(text, text, text\) to anon, authenticated/);
  assert.match(migration, /create or replace function public\.admin_get_outreach_overview/);
});

test('admin completion migration fixes partnership import and adds picker RPCs', () => {
  const completion = readFileSync(new URL('../supabase/migrations/20260717120000_outreach_admin_ui_completion.sql', import.meta.url), 'utf8');
  assert.match(completion, /organization_name/);
  assert.match(completion, /admin_list_partnership_contacts_for_outreach/);
  assert.match(completion, /admin_search_media_assets_for_outreach/);
  assert.match(completion, /admin\.outreach\.import\.title/);
});

test('admin outreach api uses RPCs instead of direct table reads', () => {
  assert.match(adminApi, /admin_get_outreach_overview/);
  assert.match(adminApi, /admin_upsert_outreach_campaign/);
  assert.match(adminApi, /admin_generate_outreach_token/);
  assert.match(adminApi, /admin_list_partnership_contacts_for_outreach/);
  assert.match(adminApi, /admin_search_media_assets_for_outreach/);
  assert.match(adminApi, /admin_set_outreach_page_media/);
  assert.match(adminApi, /admin_import_outreach_from_partnership/);
  assert.doesNotMatch(adminApi, /outreach_campaigns\?select=/);
});

test('admin page wires partnership import, media picker and translated copy', () => {
  assert.match(adminPage, /importOutreachFromPartnership/);
  assert.match(adminPage, /listPartnershipContactsForOutreach/);
  assert.match(adminPage, /searchMediaAssetsForOutreach/);
  assert.match(adminPage, /setOutreachPageMedia/);
  assert.match(adminPage, /t\('admin\.outreach\.import\.title'/);
  assert.match(adminPage, /t\('admin\.outreach\.section\.media'/);
  assert.match(adminPage, /t\('admin\.outreach\.save'/);
});

test('public outreach api uses token-gated RPCs', () => {
  assert.match(publicApi, /get_outreach_page_public/);
  assert.match(publicApi, /submit_outreach_response/);
  assert.match(publicApi, /record_outreach_engagement/);
});

test('main router mounts private outreach pages at /o/:slug/:token', () => {
  assert.match(mainEntry, /OutreachPrivatePage/);
  assert.match(mainEntry, /outreachMatch/);
  assert.match(mainEntry, /outreachSlug && outreachToken/);
});

test('admin page distinguishes loading, error and empty-success states', () => {
  assert.match(adminPage, /useState<.*\| null>\(null\)/);
  assert.match(adminPage, /setCounts\(null\)/);
  assert.match(adminPage, /loading \|\| !counts \? '—'/);
});

test('private page uses translated error and loading states', () => {
  assert.match(privatePage, /t\('outreach\.loading'/);
  assert.match(privatePage, /t\(errorCode/);
  assert.match(privatePage, /setLanguage\(payload\.language_code\)/);
});

test('parseOutreachPath extracts slug and token', () => {
  assert.deepEqual(parseOutreachPath('/o/fly-costa-del-sol/abc123'), { slug: 'fly-costa-del-sol', token: 'abc123' });
  assert.equal(parseOutreachPath('/founders/kevin'), null);
});

test('mapResponseToStatus maps CTA choices to campaign statuses', () => {
  assert.equal(mapResponseToStatus('yes_meet'), 'meeting_planned');
  assert.equal(mapResponseToStatus('interested'), 'interested');
  assert.equal(mapResponseToStatus('not_now'), 'declined');
});

test('parseOutreachOverviewPayload validates overview shape', () => {
  const overview = parseOutreachOverviewPayload({
    rows: [{ campaign_id: 'c-1', status: 'ready', first_name: 'David', last_name: null, company_name: 'Fly Costa del Sol', category: 'work', outreach_channel: null, created_at: '2026-07-16T00:00:00Z', sent_at: null, last_opened_at: null, visit_count: 0, last_response_type: null, responsible_email: null }],
    counts: { draft: 0, ready: 1, sent: 0, opened: 0, interested: 0, meeting_planned: 0, accepted: 0, declined: 0, no_response: 0, archived: 0, total: 1 },
  });
  assert.equal(overview.counts.ready, 1);
  assert.equal(overview.rows[0].status, 'ready');
});

test('normalizeOutreachStatus rejects unknown statuses', () => {
  assert.equal(normalizeOutreachStatus('opened'), 'opened');
  assert.equal(normalizeOutreachStatus('unknown'), null);
});
