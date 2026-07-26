import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const migration = readFileSync(new URL('../supabase/migrations/20260726170000_admin_media_asset_editor.sql', import.meta.url), 'utf8');
const api = readFileSync(new URL('../src/lib/offerMediaAdminApi.ts', import.meta.url), 'utf8');
const page = readFileSync(new URL('../src/pages/AdminMediaVaultOffersPage.tsx', import.meta.url), 'utf8');
const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

test('editor imports resolve to declared API exports and installed runtime dependencies', () => {
  for (const name of ['deleteMediaAsset', 'getMediaAssetEditor', 'saveMediaAssetEditor']) {
    assert.match(page, new RegExp(`\\b${name}\\b`));
    assert.match(api, new RegExp(`export async function ${name}\\b`));
  }
  for (const dependency of ['lucide-react', 'react', 'react-dom']) {
    assert.equal(typeof packageJson.dependencies[dependency], 'string', `${dependency} must be a runtime dependency`);
  }
  assert.match(page, /import type \{ I18nManifest \}/);
});

test('media editor keeps technical type separate and saves through one atomic RPC', () => {
  assert.match(migration, /create table if not exists public\.media_usage_types/);
  assert.match(migration, /primary key \(media_asset_id, usage_type_key\)/);
  assert.doesNotMatch(migration.match(/create or replace function public\.admin_save_media_asset_editor[\s\S]+?end \$\$/)?.[0] || '', /asset_type\s*=/);
  assert.match(api, /admin_save_media_asset_editor/);
  assert.match(page, /saveMediaAssetEditor\(assetId, form\)/);
});

test('mockup usage requires and atomically writes its specialized relation', () => {
  assert.match(migration, /Mockup screen usage requires a linked Proof of Mind screen/);
  assert.match(migration, /insert into public\.proof_of_mind_mockup_screens/);
  assert.match(migration, /screen_name,screen_key,screen_purpose,primary_user_role,image_alt,image_status,display_order/);
  assert.match(page, /wantsMockup/);
});

test('all media foreign-key applications participate in protected deletion', () => {
  assert.match(migration, /pg_constraint/);
  assert.match(migration, /admin_media_asset_other_applications/);
  assert.match(migration, /Media asset is still in use\. Unlink these applications first/);
  assert.match(page, /record\.applications/);
});

test('browser payload excludes read-only file information', () => {
  assert.match(page, /readonlyAssetFields/);
  for (const field of ['storage_bucket', 'storage_path', 'original_filename', 'mime_type', 'file_size_bytes', 'provider']) {
    assert.doesNotMatch(api.match(/export type MediaAssetEditorPayload[\s\S]+?\n};/)?.[0] || '', new RegExp(`${field}:`));
  }
});
