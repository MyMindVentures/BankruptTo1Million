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
const adminEditor = readFileSync(new URL('../src/components/outreach/OutreachAdminEditor.tsx', import.meta.url), 'utf8');
const aiMigration = readFileSync(new URL('../supabase/migrations/20260717190000_outreach_ai_premium.sql', import.meta.url), 'utf8');
const edgeFunction = readFileSync(new URL('../supabase/functions/generate-outreach-ai-content/index.ts', import.meta.url), 'utf8');
const privatePage = readFileSync(new URL('../src/pages/OutreachPrivatePage.tsx', import.meta.url), 'utf8');
const publicRoutes = readFileSync(new URL('../src/lib/publicRoutes.tsx', import.meta.url), 'utf8');

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
  assert.match(adminApi, /prepareOutreachAi/);
  assert.match(adminApi, /getOutreachAiStatus/);
  assert.match(adminApi, /generateOutreachAiContent/);
  assert.doesNotMatch(adminApi, /outreach_campaigns\?select=/);
});

test('admin page wires partnership import and premium editor', () => {
  assert.match(adminPage, /importOutreachFromPartnership/);
  assert.match(adminPage, /listPartnershipContactsForOutreach/);
  assert.match(adminPage, /OutreachAdminEditor/);
  assert.match(adminPage, /t\('admin\.outreach\.import\.title'/);
});

test('premium outreach editor exposes tabs, AI brief and all DB fields', () => {
  assert.match(adminEditor, /outreach-editor-premium/);
  assert.match(adminEditor, /outreach-editor-tabs/);
  assert.match(adminEditor, /admin\.outreach\.tab\.contact/);
  assert.match(adminEditor, /admin\.outreach\.field\.instagram/);
  assert.match(adminEditor, /admin\.outreach\.field\.expires_at/);
  assert.match(adminEditor, /admin\.outreach\.field\.ai_brief/);
  assert.match(adminEditor, /generateOutreachAiContent/);
  assert.match(adminEditor, /admin\.outreach\.field\.max_visits/);
  assert.match(adminEditor, /outreach-publish-sidebar/);
});

test('outreach AI migration adds status columns and admin AI RPCs', () => {
  assert.match(aiMigration, /ai_generation_status/);
  assert.match(aiMigration, /outreach_ai_sources/);
  assert.match(aiMigration, /admin_prepare_outreach_ai/);
  assert.match(aiMigration, /admin_get_outreach_ai_status/);
  assert.match(aiMigration, /admin\.outreach\.tab\.page/);
});

test('outreach AI edge function generates single-language page copy', () => {
  assert.match(edgeFunction, /generate-outreach-ai-content/);
  assert.match(edgeFunction, /get_outreach_ai_generation_context/);
  assert.match(edgeFunction, /get_ai_edge_function_runtime_config/);
  assert.match(edgeFunction, /start_ai_edge_function_run/);
  assert.match(edgeFunction, /finish_ai_edge_function_run/);
  assert.match(edgeFunction, /openrouter\.ai/);
  assert.match(edgeFunction, /personal_intro/);
  assert.doesNotMatch(edgeFunction, /openai\/gpt-4o-mini/);
});

test('outreach AI control plane migration registers runtime config', () => {
  const controlPlane = readFileSync(
    new URL('../supabase/migrations/20260717210000_outreach_ai_edge_function_control_plane.sql', import.meta.url),
    'utf8',
  );
  assert.match(controlPlane, /generate-outreach-ai-content/);
  assert.match(controlPlane, /ai_edge_function_configs/);
  assert.match(controlPlane, /enable_run_logging/);
  assert.match(controlPlane, /runtime_config_implemented/);
});

test('public outreach api uses token-gated RPCs', () => {
  assert.match(publicApi, /get_outreach_page_public/);
  assert.match(publicApi, /submit_outreach_response/);
  assert.match(publicApi, /record_outreach_engagement/);
});

test('public router mounts private outreach pages at /o/:slug/:token', () => {
  assert.match(publicRoutes, /OutreachPrivatePage/);
  assert.match(publicRoutes, /const outreachMatch = path\.match/);
  assert.match(publicRoutes, /kind: 'outreach'/);
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
