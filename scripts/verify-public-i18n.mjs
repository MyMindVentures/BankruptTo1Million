#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import {
  extractExportFunctions,
  extractManifest,
  extractTranslationKeys,
  isValidTranslationKey,
  loadBootstrapKeySet,
  loadConfig,
  loadLocalEnv,
  loadSqlKeyCatalog,
  manifestCoversKey,
  normalizePath,
  repoRoot,
  resolveSurfaceFiles,
} from './i18n-script-utils.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const args = new Set(process.argv.slice(2));
export const verifyOptions = {
  skipDb: args.has('--skip-db'),
  requireDb: args.has('--require-db'),
  verbose: args.has('--verbose'),
};

function isBrandLiteral(value, brandAllowlist) {
  const trimmed = value.trim();
  if (!trimmed) return true;
  if (brandAllowlist.some((brand) => trimmed === brand || trimmed.includes(brand))) return true;
  if (/^https?:\/\//.test(trimmed)) return true;
  if (/^\/[\w\-/.#?=&%]*$/.test(trimmed)) return true;
  if (/^[#][\w-]+$/.test(trimmed)) return true;
  if (/^\d+$/.test(trimmed)) return true;
  if (/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(trimmed)) return true;
  if (/^[a-z0-9._-]+$/i.test(trimmed) && !/[aeiou]/i.test(trimmed)) return true;
  if (trimmed.length <= 2) return true;
  if (/^[—\-–|/\\:;,.\s]+$/.test(trimmed)) return true;
  if (/^\{[^}]+\}$/.test(trimmed)) return true;
  if (/^\$\{/.test(trimmed)) return true;
  if (/^#[0-9a-f]{3,8}$/i.test(trimmed)) return true;
  if (/^(xs|sm|md|lg|xl|\d+(px|rem|em|%)?)$/i.test(trimmed)) return true;
  return false;
}

function findHardcodedUi(source, brandAllowlist, isDataModule) {
  const violations = [];
  const manifestStart = source.indexOf('_I18N_MANIFEST');
  const manifestEnd = manifestStart >= 0 ? source.indexOf('} as const satisfies I18nManifest;', manifestStart) : -1;
  const lines = source.split('\n');
  let ignoredDepth = 0;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const lineNo = index + 1;
    const lineStart = lines.slice(0, index).join('\n').length;

    if (manifestStart >= 0 && manifestEnd >= 0 && lineStart >= manifestStart && lineStart <= manifestEnd + 40) {
      continue;
    }

    if (line.includes('data-i18n-ignore="true"')) ignoredDepth += 1;
    if (ignoredDepth > 0) {
      if (line.includes('</') && !line.includes('<')) ignoredDepth = Math.max(0, ignoredDepth - 1);
      continue;
    }

    if (/^\s*(\/\/|\/\*|\*|import |export type |export interface |type |interface )/.test(line)) continue;
    if (/\bt\(/.test(line) || /translateText\(/.test(line)) continue;
    if (/^\s*'[^']+'\s*,?\s*$/.test(line)) {
      const prev = lines[index - 1] ?? '';
      if (/\bt\(/.test(prev) || /'[a-z][a-z0-9_.-]+'\s*,?\s*$/.test(prev) || /,\s*$/.test(prev) || /\(\s*$/.test(prev)) continue;
    }
    if (/translationKey:/.test(line) || /labelKey:/.test(line) || /titleKey:/.test(line)) continue;
    if (/translationKeys:/.test(line) || /keyPatterns:/.test(line) || /componentKey:/.test(line)) continue;
    if (/^\s*(label|title|description|phase|summary|cta):\s*['"]/.test(line)) continue;
    if (/className=|href=|src=|id=|htmlFor=|type=|role=|size=|viewBox=|xmlns=|rel=|target=|method=|name=|value=|key=|decoding=|loading=|fetchPriority=|strokeWidth=|fill=|stroke=|d=|variant=|slot=|asChild=/.test(line)) {
      if (!/aria-label=|aria-description=|title=|placeholder=|alt=/.test(line)) continue;
    }

    if (isDataModule) continue;

    for (const match of line.matchAll(/aria-label=\{?['"]([^'"{][^'"]*)['"]\}?/g)) {
      if (!isBrandLiteral(match[1], brandAllowlist) && !/^[a-z][a-z0-9_.-]+$/.test(match[1])) {
        violations.push({ lineNo, snippet: line.trim(), reason: `hardcoded aria-label: ${match[1]}` });
      }
    }
    for (const match of line.matchAll(/(?:title|placeholder|alt)=\{?['"]([^'"{][^'"]*)['"]\}?/g)) {
      if (!isBrandLiteral(match[1], brandAllowlist) && !/^[a-z][a-z0-9_.-]+$/.test(match[1])) {
        violations.push({ lineNo, snippet: line.trim(), reason: `hardcoded accessibility/copy literal: ${match[1]}` });
      }
    }
    for (const match of line.matchAll(/>\s*([A-Za-z][^<{]*?[A-Za-z])\s*</g)) {
      const text = match[1].trim();
      if (!isBrandLiteral(text, brandAllowlist)) {
        violations.push({ lineNo, snippet: line.trim(), reason: `hardcoded JSX text: ${text}` });
      }
    }
    for (const match of line.matchAll(/^\s*['"]([^'"]{3,})['"],?\s*$/g)) {
      const text = match[1];
      if (/\.(css|tsx?|mjs|json|png|jpg|svg|webp)$/.test(text)) continue;
      if (/^[a-z][a-z0-9_.-]+$/.test(text) && text.includes('.')) continue;
      if (/^[a-z0-9-]+$/.test(text) && text.includes('-') && !/\s/.test(text)) continue;
      if (!isBrandLiteral(text, brandAllowlist) && /[A-Za-z]{3,}/.test(text)) {
        violations.push({ lineNo, snippet: line.trim(), reason: `hardcoded string literal: ${text}` });
      }
    }
  }

  return violations;
}

function isKeyBootstrapped(key, bootstrapSet) {
  if (bootstrapSet.has(key)) return true;
  for (const entry of bootstrapSet) {
    if (entry.endsWith('%') && key.startsWith(entry.slice(0, -1))) return true;
    if (entry.endsWith('.*') && key.startsWith(entry.slice(0, -2))) return true;
  }
  return false;
}

async function fetchRegistry() {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  const response = await fetch(`${url}/rest/v1/rpc/get_public_ui_component_registry`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: '{}',
  });
  if (!response.ok) throw new Error(`Registry fetch failed: ${response.status} ${await response.text()}`);
  return response.json();
}

async function fetchActiveLanguageCount() {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  const response = await fetch(`${url}/rest/v1/site_languages?select=code&is_active=eq.true`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Prefer: 'count=exact',
    },
  });
  if (!response.ok) throw new Error(`Language fetch failed: ${response.status} ${await response.text()}`);
  const rows = await response.json();
  return rows.length;
}

async function fetchPublishedTranslationCounts(keys) {
  const url = process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anonKey || !keys.length) return new Map();

  const counts = new Map();
  const batchSize = 50;

  for (let index = 0; index < keys.length; index += batchSize) {
    const batch = keys.slice(index, index + batchSize);
    const encodedKeys = batch.map((key) => encodeURIComponent(key)).join(',');
    const response = await fetch(
      `${url}/rest/v1/website_translation_keys?select=translation_key,website_translations(language_code,translation_status)&translation_key=in.(${encodedKeys})`,
      {
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
        },
      },
    );
    if (!response.ok) {
      throw new Error(`Translation coverage fetch failed: ${response.status} ${await response.text()}`);
    }

    const rows = await response.json();
    for (const row of rows) {
      const published = (row.website_translations || []).filter((entry) => entry.translation_status === 'published').length;
      counts.set(row.translation_key, published);
    }
  }

  return counts;
}

function collectRequiredKeys(manifest, usedKeys) {
  const keys = new Set();
  for (const key of manifest.translationKeys) {
    if (isValidTranslationKey(key) && !key.endsWith('.ui_scan')) keys.add(key);
  }
  for (const key of usedKeys) {
    if (isValidTranslationKey(key) && manifestCoversKey(manifest, key)) keys.add(key);
  }
  return [...keys];
}

export async function verifyPublicI18n(options = verifyOptions) {
  loadLocalEnv();
  const config = await loadConfig();
  const files = await resolveSurfaceFiles(config);
  const sqlKeyCatalog = await loadSqlKeyCatalog();
  const bootstrapSet = await loadBootstrapKeySet();
  const skipDb = options.skipDb ?? verifyOptions.skipDb;
  const requireDb = options.requireDb ?? verifyOptions.requireDb;
  const verbose = options.verbose ?? verifyOptions.verbose;

  if (requireDb && (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_ANON_KEY)) {
    return ['Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY for --require-db verification.'];
  }

  const registry = skipDb ? null : await fetchRegistry().catch((error) => {
    if (requireDb) throw error;
    return null;
  });

  let activeLanguageCount = null;
  let publishedCounts = null;
  if (!skipDb) {
    activeLanguageCount = await fetchActiveLanguageCount().catch((error) => {
      if (requireDb) throw error;
      return null;
    });
    publishedCounts = new Map();
  }

  const allRequiredKeys = new Set();
  const errors = [];

  for (const absolutePath of files) {
    const relativePath = normalizePath(path.relative(repoRoot, absolutePath));
    const source = await readFile(absolutePath, 'utf8');
    const isDataModule = config.dataModulePaths.map(normalizePath).includes(relativePath);
    const manifest = extractManifest(source);
    const publicExports = config.publicExportsOnly?.[relativePath];
    const scanSource = publicExports ? extractExportFunctions(source, publicExports) : source;

    if (!manifest?.componentKey) {
      errors.push(`${relativePath}: missing export const *_I18N_MANIFEST`);
      continue;
    }

    const usedKeys = extractTranslationKeys(publicExports ? scanSource : source);
    for (const key of usedKeys) {
      if (!manifestCoversKey(manifest, key)) {
        errors.push(`${relativePath}: t()/translation key "${key}" not declared in ${manifest.exportName}`);
      }
    }

    const hardcoded = findHardcodedUi(scanSource, config.brandAllowlist, isDataModule);
    if (isDataModule) {
      for (const key of usedKeys) {
        if (!manifestCoversKey(manifest, key)) {
          errors.push(`${relativePath}: data translation key "${key}" not declared in manifest`);
        }
      }
    } else if (hardcoded.length) {
      for (const violation of hardcoded.slice(0, 5)) {
        errors.push(`${relativePath}:${violation.lineNo} ${violation.reason}`);
      }
      if (hardcoded.length > 5) {
        errors.push(`${relativePath}: ${hardcoded.length - 5} additional hardcoded UI violations`);
      }
    }

    const requiredKeys = collectRequiredKeys(manifest, usedKeys);
    for (const key of requiredKeys) allRequiredKeys.add(key);

    for (const key of requiredKeys) {
      if (!sqlKeyCatalog.has(key)) {
        errors.push(`${relativePath}: translation key "${key}" missing from SQL migration catalog`);
      } else if (skipDb && !isKeyBootstrapped(key, bootstrapSet)) {
        errors.push(`${relativePath}: translation key "${key}" missing 30-language bootstrap proof in migrations`);
      }
    }

    if (registry) {
      const row = registry.find((entry) => normalizePath(entry.source_path) === relativePath);
      if (!row) {
        errors.push(`${relativePath}: component "${manifest.componentKey}" missing from website_ui_components registry`);
      } else if (row.component_key !== manifest.componentKey) {
        errors.push(`${relativePath}: registry component_key mismatch (${row.component_key} != ${manifest.componentKey})`);
      }
    } else if (requireDb) {
      errors.push(`${relativePath}: registry sync required but Supabase registry fetch failed`);
    }
  }

  if (!skipDb && activeLanguageCount && allRequiredKeys.size) {
    const coverage = await fetchPublishedTranslationCounts([...allRequiredKeys]).catch((error) => {
      if (requireDb) throw error;
      return null;
    });
    if (coverage) {
      for (const key of allRequiredKeys) {
        const published = coverage.get(key) ?? 0;
        if (published < activeLanguageCount) {
          errors.push(`translation key "${key}" has ${published}/${activeLanguageCount} published translations`);
        }
      }
    }
  }

  if (verbose && errors.length) {
    for (const error of errors) console.error(error);
  }

  return errors;
}

async function main() {
  const errors = await verifyPublicI18n();
  if (errors.length) {
    console.error(`Public i18n verification failed with ${errors.length} issue(s):`);
    for (const error of errors.slice(0, 50)) console.error(`- ${error}`);
    if (errors.length > 50) console.error(`- ...and ${errors.length - 50} more`);
    process.exitCode = 1;
    return;
  }
  console.log('Public i18n verification passed.');
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isMain) {
  await main();
}
