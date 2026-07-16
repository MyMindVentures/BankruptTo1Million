#!/usr/bin/env node
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import {
  collectRequiredKeys,
  extractExportFunctions,
  extractManifest,
  extractTranslationFallbacks,
  extractTranslationKeys,
  formatSqlKeyArray,
  inferNamespaceFromKey,
  loadConfig,
  loadSqlKeyCatalog,
  repoRoot,
  resolveSurfaceFiles,
  sqlString,
} from './i18n-script-utils.mjs';
import { readFile } from 'node:fs/promises';

const OUTPUT_PATH = path.join(
  repoRoot,
  'supabase/migrations/20260717160000_public_i18n_keys_bootstrap.sql',
);

function keySort(left, right) {
  return left.localeCompare(right);
}

function buildKeyInsertRow(key, fallback) {
  const namespace = inferNamespaceFromKey(key);
  const defaultText = fallback || key;
  return `  (${sqlString(key)}, ${sqlString(namespace)}, ${sqlString(`Public UI key ${key}`)}, ${sqlString(defaultText)}, 'text', true, true, '{}', false)`;
}

async function collectSurfaceKeyData(config, files) {
  const requiredKeys = new Set();
  const fallbacks = new Map();

  for (const absolutePath of files) {
    const relativePath = path.relative(repoRoot, absolutePath).replace(/\\/g, '/');
    const source = await readFile(absolutePath, 'utf8');
    const manifest = extractManifest(source);
    if (!manifest?.componentKey) continue;

    const publicExports = config.publicExportsOnly?.[relativePath];
    const scanSource = publicExports ? extractExportFunctions(source, publicExports) : source;
    const usedKeys = extractTranslationKeys(publicExports ? scanSource : source);

    for (const fallbackEntry of extractTranslationFallbacks(source).entries()) {
      fallbacks.set(fallbackEntry[0], fallbackEntry[1]);
    }
    for (const fallbackEntry of extractTranslationFallbacks(scanSource).entries()) {
      fallbacks.set(fallbackEntry[0], fallbackEntry[1]);
    }

    for (const key of collectRequiredKeys(manifest, usedKeys)) {
      requiredKeys.add(key);
    }
  }

  return {
    requiredKeys: [...requiredKeys].sort(keySort),
    fallbacks,
  };
}

function buildInsertBlock(missingKeys, fallbacks) {
  if (!missingKeys.length) return '';
  const rows = missingKeys.map((key) => buildKeyInsertRow(key, fallbacks.get(key)));
  return [
    'insert into public.website_translation_keys',
    '  (translation_key, namespace, description, default_text, value_type, is_required, is_active, interpolation_variables, supports_plural)',
    'values',
    `${rows.join(',\n')}`,
    'on conflict (translation_key) do update set',
    '  default_text = excluded.default_text,',
    '  description = excluded.description,',
    '  interpolation_variables = excluded.interpolation_variables,',
    '  is_active = true,',
    '  updated_at = now();',
    '',
  ].join('\n');
}

function buildBootstrapBlock(bootstrapKeys) {
  const arrayLiteral = formatSqlKeyArray(bootstrapKeys);
  return [
    '-- Bootstrap published rows for all active languages (English default_text until translation jobs complete)',
    'insert into public.website_translations',
    '  (translation_key_id, language_code, translated_text, translation_status, translation_source, translated_at, reviewed_at, published_at)',
    'select k.id, sl.code, k.default_text, \'published\', \'manual\', now(), now(), now()',
    'from public.website_translation_keys k',
    'cross join public.site_languages sl',
    `where k.translation_key = any(${arrayLiteral})`,
    '  and sl.is_active = true',
    'on conflict (translation_key_id, language_code) do update set',
    '  translated_text = excluded.translated_text,',
    '  translation_status = \'published\',',
    '  translation_source = \'manual\',',
    '  translated_at = now(),',
    '  reviewed_at = now(),',
    '  published_at = now(),',
    '  updated_at = now();',
    '',
  ].join('\n');
}

function buildEnqueueBlock(bootstrapKeys) {
  const arrayLiteral = formatSqlKeyArray(bootstrapKeys);
  return [
    '-- Enqueue proper localized translations for non-English languages',
    'do $$',
    'declare',
    '  rec record;',
    'begin',
    '  if to_regprocedure(\'private.enqueue_translation_job_expansion(text,uuid,text,jsonb,text)\') is null then',
    '    raise notice \'enqueue_translation_job_expansion unavailable; skipping translation job enqueue\';',
    '    return;',
    '  end if;',
    '',
    '  for rec in',
    '    select id, translation_key, default_text',
    '    from public.website_translation_keys',
    `    where translation_key = any(${arrayLiteral})`,
    '  loop',
    '    perform private.enqueue_translation_job_expansion(',
    '      \'website_key\',',
    '      rec.id,',
    '      \'en\',',
    '      jsonb_build_object(',
    '        \'translation_key\', rec.translation_key,',
    '        \'default_text\', rec.default_text',
    '      ),',
    '      \'public-i18n-registry-v1\'',
    '    );',
    '  end loop;',
    'end $$;',
    '',
  ].join('\n');
}

async function main() {
  const config = await loadConfig();
  const files = await resolveSurfaceFiles(config);
  const sqlKeyCatalog = await loadSqlKeyCatalog({ excludePaths: [OUTPUT_PATH] });
  const { requiredKeys, fallbacks } = await collectSurfaceKeyData(config, files);

  const missingKeys = requiredKeys.filter((key) => !sqlKeyCatalog.has(key));
  const bootstrapKeys = requiredKeys;

  const header = [
    '-- Generated by scripts/generate-public-i18n-keys.mjs',
    `-- Inserts ${missingKeys.length} missing keys and bootstraps ${bootstrapKeys.length} public UI keys across active languages.`,
    '',
    'begin;',
    '',
  ].join('\n');

  const body = [
    buildInsertBlock(missingKeys, fallbacks),
    buildBootstrapBlock(bootstrapKeys),
    buildEnqueueBlock(bootstrapKeys),
    'commit;',
    '',
  ].join('\n');

  await writeFile(OUTPUT_PATH, `${header}${body}`, 'utf8');
  console.log(`Wrote ${OUTPUT_PATH}`);
  console.log(`Missing keys: ${missingKeys.length}; bootstrap keys: ${bootstrapKeys.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
