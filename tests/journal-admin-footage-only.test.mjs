import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { canUploadFootageOnly } from '../src/lib/journalAdminPayload.ts';

const footageRpcMigration = readFileSync(
  new URL('../supabase/migrations/20260718230000_admin_get_journal_footage.sql', import.meta.url),
  'utf8',
);
const translationsMigration = readFileSync(
  new URL('../supabase/migrations/20260718230100_journal_admin_footage_upload_ui_translations.sql', import.meta.url),
  'utf8',
);
const adminApi = readFileSync(new URL('../src/lib/journalAdminApi.ts', import.meta.url), 'utf8');
const adminPage = readFileSync(new URL('../src/pages/JournalAdminPage.tsx', import.meta.url), 'utf8');
const eventCapture = readFileSync(new URL('../src/components/JournalEventCapture.tsx', import.meta.url), 'utf8');

test('migration defines admin_get_journal_footage with admin guard and grants', () => {
  assert.match(footageRpcMigration, /create or replace function public\.admin_get_journal_footage/);
  assert.match(footageRpcMigration, /is_admin_user\(\)/);
  assert.match(footageRpcMigration, /grant execute on function public\.admin_get_journal_footage/);
  assert.match(footageRpcMigration, /journal_post_media jpm/);
});

test('translations migration seeds footage-only admin keys for all active languages', () => {
  assert.match(translationsMigration, /journal\.admin\.upload_footage_button/);
  assert.match(translationsMigration, /journal\.admin\.upload_footage_success/);
  assert.match(translationsMigration, /journal\.admin\.upload_footage_empty/);
  assert.match(translationsMigration, /journal\.admin\.existing_footage_heading/);
  assert.match(translationsMigration, /= any\(array\[/);
});

test('journal admin api exposes footage-only helpers', () => {
  assert.match(adminApi, /getAdminJournalFootage/);
  assert.match(adminApi, /appendJournalFootage/);
  assert.match(adminApi, /admin_get_journal_footage/);
  assert.match(adminApi, /canUploadFootageOnly/);
});

test('canUploadFootageOnly requires published edit with pending files', () => {
  assert.equal(canUploadFootageOnly('post-id', 'published', 1), true);
  assert.equal(canUploadFootageOnly('post-id', 'published', 0), false);
  assert.equal(canUploadFootageOnly('post-id', 'draft', 2), false);
  assert.equal(canUploadFootageOnly(null, 'published', 2), false);
});

test('journal admin page splits footage-only upload from regeneration', () => {
  assert.match(adminPage, /submitFootageOnly/);
  assert.match(adminPage, /submitRegenerate/);
  assert.match(adminPage, /appendJournalFootage/);
  assert.match(adminPage, /getAdminJournalFootage/);
  assert.match(adminPage, /upload-footage-only/);
  assert.match(adminPage, /journal\.admin\.upload_footage_button/);

  const footageOnlyBlock = adminPage.slice(
    adminPage.indexOf('async function submitFootageOnly'),
    adminPage.indexOf('async function submitRegenerate'),
  );
  assert.doesNotMatch(footageOnlyBlock, /prepareJournalAi/);
  assert.doesNotMatch(footageOnlyBlock, /publishJournalPost/);
  assert.doesNotMatch(footageOnlyBlock, /updateJournalPost/);
});

test('journal event capture shows existing linked footage', () => {
  assert.match(eventCapture, /existingFootage/);
  assert.match(eventCapture, /existingFootageHeading/);
  assert.match(eventCapture, /footage-queue--existing/);
});
