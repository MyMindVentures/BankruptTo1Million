import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const page = readFileSync(new URL('../src/pages/AdminSectionPage.tsx', import.meta.url), 'utf8');
const api = readFileSync(new URL('../src/lib/adminApi.ts', import.meta.url), 'utf8');
const dashboard = readFileSync(new URL('../src/pages/AdminDashboardPage.tsx', import.meta.url), 'utf8');
const metadataMigration = readFileSync(new URL('../supabase/migrations/20260715013000_dynamic_admin_sections.sql', import.meta.url), 'utf8');
const dashboardMigration = readFileSync(new URL('../supabase/migrations/20260715014500_dynamic_admin_dashboard.sql', import.meta.url), 'utf8');
const mediaPreviewMigration = readFileSync(new URL('../supabase/migrations/20260719121000_admin_media_storage_preview_fields.sql', import.meta.url), 'utf8');
const mediaGroupsMigration = readFileSync(new URL('../supabase/migrations/20260719122000_admin_list_media_vault_groups.sql', import.meta.url), 'utf8');
const mediaEventMigration = readFileSync(new URL('../supabase/migrations/20260719123000_admin_media_vault_event_timestamp.sql', import.meta.url), 'utf8');
const mediaCategoryMigration = readFileSync(new URL('../supabase/migrations/20260719124000_admin_media_vault_category_filters.sql', import.meta.url), 'utf8');
const mediaVaultPage = readFileSync(new URL('../src/pages/AdminMediaVaultPage.tsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/styles/adminSections.css', import.meta.url), 'utf8');

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

test('media vault previews resolve storage URLs when thumbnail_url is missing', () => {
  assert.match(page, /resolvePublicMediaUrl/);
  assert.match(page, /resolveMediaPreview/);
  assert.match(page, /storage_bucket/);
  assert.match(page, /storage_path/);
  assert.match(mediaPreviewMigration, /storage_bucket/);
  assert.match(mediaPreviewMigration, /storage_path/);
  assert.match(mediaPreviewMigration, /route = '\/admin\/media'/);
});

test('media vault video previews use muted metadata video when thumbnail_url is missing', () => {
  assert.match(mediaVaultPage, /resolveMediaPreview/);
  assert.match(mediaVaultPage, /MediaPreviewFrame/);
  assert.match(mediaVaultPage, /kind: 'video'/);
  assert.match(mediaVaultPage, /preload="metadata"/);
  assert.match(mediaVaultPage, /playsInline/);
  assert.match(mediaVaultPage, /muted/);
  assert.match(mediaVaultPage, /admin-media-preview-video/);
  assert.match(page, /kind: 'video'/);
  assert.match(page, /preload="metadata"/);
  assert.match(css, /admin-media-preview-video/);
});

test('media vault is grouped by journal post via dedicated page and RPC', () => {
  assert.match(dashboard, /path === '\/admin\/media' \? <AdminMediaVaultPage/);
  assert.match(dashboard, /AdminMediaVaultPage/);
  assert.match(api, /listAdminMediaVaultGroups/);
  assert.match(api, /admin_list_media_vault_groups/);
  assert.match(mediaGroupsMigration, /create or replace function public\.admin_list_media_vault_groups/);
  assert.match(mediaGroupsMigration, /grant execute on function public\.admin_list_media_vault_groups\(\) to authenticated/);
  assert.match(mediaGroupsMigration, /is_admin_user\(\)/);
  assert.match(mediaVaultPage, /listAdminMediaVaultGroups/);
  assert.match(mediaVaultPage, /getAdminJournalFootage/);
  assert.doesNotMatch(mediaVaultPage, /const posts\s*=\s*\[/);
});

test('media vault shows journal event timestamp in Europe/Madrid 24h format', () => {
  assert.match(mediaEventMigration, /occurred_at/);
  assert.match(mediaEventMigration, /event_timezone/);
  assert.match(mediaEventMigration, /Europe\/Madrid/);
  assert.match(mediaEventMigration, /journal_journey_entries/);
  assert.match(api, /occurred_at: string \| null/);
  assert.match(api, /event_timezone: string \| null/);
  assert.match(mediaVaultPage, /formatEventDateTime/);
  assert.match(mediaVaultPage, /hour12: false/);
  assert.match(mediaVaultPage, /Europe\/Madrid/);
  assert.match(mediaVaultPage, /admin\.media\.event_at/);
});

test('media vault has category filter chips with counters', () => {
  assert.match(mediaCategoryMigration, /'categories'/);
  assert.match(mediaCategoryMigration, /journal_unlinked/);
  assert.match(mediaCategoryMigration, /founders/);
  assert.match(mediaCategoryMigration, /journey-events/);
  assert.match(api, /AdminMediaVaultCategoryGroup/);
  assert.match(api, /categories: AdminMediaVaultCategoryGroup/);
  assert.match(mediaVaultPage, /admin-media-filter-chips/);
  assert.match(mediaVaultPage, /admin\.media\.filter\./);
  assert.match(mediaVaultPage, /setFilter/);
  assert.doesNotMatch(mediaVaultPage, /unlinked\.assets/);
  assert.doesNotMatch(mediaVaultPage, /const categories\s*=\s*\[/);
});

const mediaDeleteMigration = readFileSync(new URL('../supabase/migrations/20260719125000_admin_delete_journal_footage.sql', import.meta.url), 'utf8');
const deleteFootageEdge = readFileSync(new URL('../supabase/functions/delete-journal-footage/index.ts', import.meta.url), 'utf8');
const journalAdminApi = readFileSync(new URL('../src/lib/journalAdminApi.ts', import.meta.url), 'utf8');

test('media vault asset cards show capture timestamp and sort newest first', () => {
  const mediaCapturedMigration = readFileSync(new URL('../supabase/migrations/20260719126000_media_assets_captured_at.sql', import.meta.url), 'utf8');
  assert.match(mediaCapturedMigration, /add column if not exists captured_at/);
  assert.match(mediaCapturedMigration, /ma\.captured_at/);
  assert.match(mediaCapturedMigration, /order by ma\.captured_at desc nulls last/);
  assert.match(mediaCapturedMigration, /'captured_at', c\.captured_at/);
  assert.match(api, /captured_at: string \| null/);
  assert.match(journalAdminApi, /captured_at: string \| null/);
  assert.match(mediaVaultPage, /formatAssetCaptureLine/);
  assert.match(mediaVaultPage, /admin\.media\.captured_at/);
  assert.match(mediaVaultPage, /admin\.media\.uploaded_at/);
  assert.match(mediaVaultPage, /admin-media-vault-captured/);
  assert.match(css, /admin-media-vault-captured/);
});

test('journal footage upload and backfill extract capture timestamps from media files', () => {
  const uploadEdge = readFileSync(new URL('../supabase/functions/upload-journal-footage/index.ts', import.meta.url), 'utf8');
  const backfillEdge = readFileSync(new URL('../supabase/functions/backfill-media-captured-at/index.ts', import.meta.url), 'utf8');
  const sharedParser = readFileSync(new URL('../supabase/functions/_shared/mediaCapturedAt.ts', import.meta.url), 'utf8');
  assert.match(sharedParser, /extractCapturedAtIso/);
  assert.match(sharedParser, /DateTimeOriginal/);
  assert.match(sharedParser, /exifr/);
  assert.match(uploadEdge, /extractCapturedAtIso/);
  assert.match(uploadEdge, /captured_at: capturedAt/);
  assert.match(backfillEdge, /extractCapturedAtIso/);
  assert.match(backfillEdge, /captured_at: capturedAt/);
});

test('media vault post groups support upload and hard-delete footage', () => {
  assert.match(mediaDeleteMigration, /create or replace function public\.admin_delete_journal_footage/);
  assert.match(mediaDeleteMigration, /create or replace function public\.admin_finalize_journal_footage_delete/);
  assert.match(mediaDeleteMigration, /is_admin_user\(\)/);
  assert.match(mediaDeleteMigration, /media_asset_is_unused/);
  assert.match(mediaDeleteMigration, /grant execute on function public\.admin_delete_journal_footage/);
  assert.match(mediaDeleteMigration, /grant execute on function public\.admin_finalize_journal_footage_delete/);

  assert.match(deleteFootageEdge, /admin_delete_journal_footage/);
  assert.match(deleteFootageEdge, /admin_finalize_journal_footage_delete/);
  assert.match(deleteFootageEdge, /\.remove\(/);
  assert.match(deleteFootageEdge, /get_my_admin_access/);

  assert.match(journalAdminApi, /export function journalEventDefaults/);
  assert.match(journalAdminApi, /export async function deleteJournalFootage/);
  assert.match(journalAdminApi, /delete-journal-footage/);

  assert.match(mediaVaultPage, /appendJournalFootage/);
  assert.match(mediaVaultPage, /deleteJournalFootage/);
  assert.match(mediaVaultPage, /journalEventDefaults/);
  assert.match(mediaVaultPage, /getJournalEventContext/);
  assert.match(mediaVaultPage, /admin\.media\.add_media/);
  assert.match(mediaVaultPage, /admin\.media\.delete_confirm/);
  assert.match(mediaVaultPage, /open\.kind === 'post'/);
  assert.match(mediaVaultPage, /handleUploadFiles/);
  assert.match(mediaVaultPage, /handleDeleteAsset/);
  assert.match(mediaVaultPage, /if \(!open \|\| open\.kind !== 'post'/);
});
