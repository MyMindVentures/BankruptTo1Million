#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const configPath = path.join(__dirname, 'public-i18n-surfaces.json');
const migrationsDir = path.join(repoRoot, 'supabase', 'migrations');

const args = new Set(process.argv.slice(2));
const skipDb = args.has('--skip-db');
const verbose = args.has('--verbose');

function normalizePath(value) {
  return value.replace(/\\/g, '/');
}

async function loadConfig() {
  return JSON.parse(await readFile(configPath, 'utf8'));
}

async function walkFiles(dir, matcher) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walkFiles(fullPath, matcher));
      continue;
    }
    if (matcher(fullPath)) files.push(fullPath);
  }
  return files;
}

async function resolveSurfaceFiles(config) {
  const exclude = new Set(config.excludePaths.map(normalizePath));
  const files = new Set();

  async function addIfIncluded(relativePath) {
    const normalized = normalizePath(relativePath);
    if (exclude.has(normalized)) return;
    const absolute = path.join(repoRoot, normalized);
    files.add(absolute);
  }

  for (const globLike of config.includeGlobs) {
    const normalizedGlob = normalizePath(globLike);
    if (!normalizedGlob.includes('*')) {
      await addIfIncluded(normalizedGlob);
      continue;
    }

    const wildcardIndex = normalizedGlob.indexOf('*');
    const base = normalizedGlob.slice(0, normalizedGlob.lastIndexOf('/', wildcardIndex));
    const ext = normalizedGlob.endsWith('.tsx') ? '.tsx' : normalizedGlob.endsWith('.ts') ? '.ts' : null;
    const root = path.join(repoRoot, base);
    const collected = await walkFiles(root, (filePath) => (ext ? filePath.endsWith(ext) : true));
    for (const filePath of collected) {
      await addIfIncluded(path.relative(repoRoot, filePath));
    }
  }

  for (const relativePath of config.includePaths ?? []) {
    await addIfIncluded(relativePath);
  }

  return [...files].sort();
}

function extractManifest(source) {
  const match = source.match(/export const ([A-Z0-9_]+_I18N_MANIFEST)\s*=\s*(\{[\s\S]*?\})\s*as const(?:\s*satisfies\s+I18nManifest)?;/);
  if (!match) return null;
  const body = match[2];
  const componentKey = body.match(/componentKey:\s*['"]([^'"]+)['"]/)?.[1];
  const namespace = body.match(/namespace:\s*['"]([^'"]+)['"]/)?.[1];
  let translationKeys = [...body.matchAll(/translationKeys:\s*\[([\s\S]*?)\]\s*as const/g)].flatMap((entry) =>
    [...entry[1].matchAll(/['"]([^'"]+)['"]/g)].map((m) => m[1]),
  );
  if (!translationKeys.length) {
    const ref = body.match(/translationKeys:\s*([A-Z0-9_]+)/)?.[1];
    if (ref) {
      const refMatch = source.match(new RegExp(`export const ${ref}\\s*=\\s*\\[([\\s\\S]*?)\\]\\s*as const`));
      if (refMatch) {
        translationKeys = [...refMatch[1].matchAll(/['"]([^'"]+)['"]/g)].map((m) => m[1]);
      }
    }
  }
  const keyPatterns = [...body.matchAll(/keyPatterns:\s*\[([\s\S]*?)\]\s*as const/g)].flatMap((entry) =>
    [...entry[1].matchAll(/['"]([^'"]+)['"]/g)].map((m) => m[1]),
  );
  return { exportName: match[1], componentKey, namespace, translationKeys, keyPatterns };
}

function manifestCoversKey(manifest, key) {
  if (manifest.translationKeys.includes(key)) return true;
  return manifest.keyPatterns.some((pattern) => {
    if (pattern.endsWith('.*')) return key.startsWith(pattern.slice(0, -1));
    if (pattern.includes('*')) {
      const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
      return new RegExp(`^${escaped}$`).test(key);
    }
    return pattern === key;
  });
}

function extractTranslationKeys(source) {
  const keys = new Set();
  for (const match of source.matchAll(/\bt\(\s*['"]([^'"]+)['"]/g)) keys.add(match[1]);
  for (const match of source.matchAll(/translateText\(\s*['"]([^'"]+)['"]/g)) keys.add(match[1]);
  for (const match of source.matchAll(/translationKey:\s*['"]([^'"]+)['"]/g)) keys.add(match[1]);
  for (const match of source.matchAll(/labelKey:\s*['"]([^'"]+)['"]/g)) keys.add(match[1]);
  for (const match of source.matchAll(/titleKey:\s*['"]([^'"]+)['"]/g)) keys.add(match[1]);
  for (const match of source.matchAll(/key:\s*['"]([^'"]+)['"]/g)) {
    const key = match[1];
    if (key.includes('.')) keys.add(key);
  }
  return [...keys];
}

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

function extractExportFunctions(source, exportNames) {
  if (!exportNames?.length) return source;
  const chunks = [];
  for (const exportName of exportNames) {
    const fnRegex = new RegExp(`export function ${exportName}\\b[\\s\\S]*?(?=\\nexport function |\\nexport const |$)`);
    const match = source.match(fnRegex);
    if (match) chunks.push(match[0]);
  }
  return chunks.length ? chunks.join('\n\n') : source;
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

async function loadMigrationKeyCatalog() {
  const files = await readdir(migrationsDir);
  const keys = new Set();
  for (const file of files.filter((name) => name.endsWith('.sql')).sort()) {
    const sql = await readFile(path.join(migrationsDir, file), 'utf8');
    for (const match of sql.matchAll(/'([a-z][a-z0-9_.-]{2,})'/g)) {
      const key = match[1];
      if (key.includes('.') && !key.startsWith('public.') && !key.includes(' ')) keys.add(key);
    }
  }

  const config = await loadConfig();
  const surfaceFiles = await resolveSurfaceFiles(config);
  for (const absolutePath of surfaceFiles) {
    const source = await readFile(absolutePath, 'utf8');
    for (const match of source.matchAll(/\bt\(\s*['"]([^'"]+)['"]/g)) keys.add(match[1]);
    const manifest = extractManifest(source);
    if (manifest) {
      for (const key of manifest.translationKeys) keys.add(key);
    }
  }

  return keys;
}

async function fetchRegistry() {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  const response = await fetch(`${url}/rest/v1/website_ui_components?select=component_key,source_path`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
  });
  if (!response.ok) throw new Error(`Registry fetch failed: ${response.status} ${await response.text()}`);
  return response.json();
}

export async function verifyPublicI18n() {
  const config = await loadConfig();
  const files = await resolveSurfaceFiles(config);
  const migrationKeys = await loadMigrationKeyCatalog();
  const registry = skipDb ? null : await fetchRegistry().catch(() => null);
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

    for (const key of manifest.translationKeys) {
      if (!migrationKeys.has(key) && !registry) {
        errors.push(`${relativePath}: manifest key "${key}" not found in migration catalog`);
      }
    }

    if (registry) {
      const row = registry.find((entry) => normalizePath(entry.source_path) === relativePath);
      if (!row) {
        errors.push(`${relativePath}: component "${manifest.componentKey}" missing from website_ui_components registry`);
      } else if (row.component_key !== manifest.componentKey) {
        errors.push(`${relativePath}: registry component_key mismatch (${row.component_key} != ${manifest.componentKey})`);
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
