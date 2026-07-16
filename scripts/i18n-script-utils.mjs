#!/usr/bin/env node
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const repoRoot = path.resolve(__dirname, '..');

const TRANSLATION_KEY_RE = /^[a-z0-9]+([._-][a-z0-9]+)*$/;

export function normalizePath(value) {
  return value.replace(/\\/g, '/');
}

export function isValidTranslationKey(key) {
  return TRANSLATION_KEY_RE.test(key);
}

export function manifestCoversKey(manifest, key) {
  if (manifest.translationKeys.includes(key)) return true;
  if (!manifest.keyPatterns?.length) return false;
  return manifest.keyPatterns.some((pattern) => {
    if (pattern.endsWith('.*')) {
      return key.startsWith(pattern.slice(0, -1));
    }
    if (pattern.includes('*')) {
      const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
      return new RegExp(`^${escaped}$`).test(key);
    }
    return pattern === key;
  });
}

export function loadLocalEnv() {
  const envPath = path.join(repoRoot, '.env.local');
  let content;
  try {
    content = readFileSync(envPath, 'utf8');
  } catch {
    return;
  }

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separator = trimmed.indexOf('=');
    if (separator <= 0) continue;
    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

export async function loadConfig() {
  const configPath = path.join(__dirname, 'public-i18n-surfaces.json');
  return JSON.parse(await readFile(configPath, 'utf8'));
}

function globToRegex(globPattern) {
  const normalized = normalizePath(globPattern);
  let regex = '';
  for (let index = 0; index < normalized.length; index += 1) {
    const char = normalized[index];
    if (char === '*' && normalized[index + 1] === '*') {
      if (normalized[index + 2] === '/') {
        regex += '(?:.*/)?';
        index += 2;
      } else {
        regex += '.*';
        index += 1;
      }
    } else if (char === '*') {
      regex += '[^/]*';
    } else {
      regex += char.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
    }
  }
  return new RegExp(`^${regex}$`);
}

function walkFiles(directory, files = []) {
  let entries;
  try {
    entries = readdirSync(directory, { withFileTypes: true });
  } catch {
    return files;
  }

  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      walkFiles(absolutePath, files);
    } else if (entry.isFile()) {
      files.push(absolutePath);
    }
  }
  return files;
}

export async function resolveSurfaceFiles(config) {
  const includeGlobs = (config.includeGlobs || []).map(globToRegex);
  const includePaths = new Set((config.includePaths || []).map(normalizePath));
  const excludePaths = new Set((config.excludePaths || []).map(normalizePath));
  const srcRoot = path.join(repoRoot, 'src');
  const candidates = walkFiles(srcRoot);

  const appPath = path.join(repoRoot, 'src/App.tsx');
  if (statSync(appPath).isFile()) {
    candidates.push(appPath);
  }

  const matched = new Set();
  for (const absolutePath of candidates) {
    const relativePath = normalizePath(path.relative(repoRoot, absolutePath));
    if (excludePaths.has(relativePath)) continue;
    if (includePaths.has(relativePath)) {
      matched.add(absolutePath);
      continue;
    }
    if (includeGlobs.some((pattern) => pattern.test(relativePath))) {
      matched.add(absolutePath);
    }
  }

  return [...matched].sort();
}

function parseQuotedStrings(block) {
  const values = [];
  if (!block) return values;
  for (const match of block.matchAll(/'([^']+)'/g)) {
    values.push(match[1]);
  }
  return values;
}

function resolveConstStringArray(source, identifier) {
  const arrayMatch = source.match(
    new RegExp(`export const ${identifier}\\s*=\\s*\\[([\\s\\S]*?)\\]\\s*as const`),
  );
  return parseQuotedStrings(arrayMatch?.[1]);
}

export function extractManifest(source) {
  const match = source.match(
    /export const (\w+_I18N_MANIFEST)\s*=\s*\{([\s\S]*?)\}\s*as const satisfies I18nManifest;/,
  );
  if (!match) return null;

  const exportName = match[1];
  const body = match[2];
  const componentKey = body.match(/componentKey:\s*'([^']+)'/)?.[1] ?? null;
  const namespace = body.match(/namespace:\s*'([^']+)'/)?.[1] ?? null;

  let translationKeys = [];
  const inlineTranslationKeys = body.match(/translationKeys:\s*\[([\s\S]*?)\](?:\s*as const)?,?/);
  const referencedTranslationKeys = body.match(/translationKeys:\s*(\w+)/);
  if (inlineTranslationKeys) {
    translationKeys = parseQuotedStrings(inlineTranslationKeys[1]);
  } else if (referencedTranslationKeys) {
    translationKeys = resolveConstStringArray(source, referencedTranslationKeys[1]);
  }

  let keyPatterns = [];
  const inlineKeyPatterns = body.match(/keyPatterns:\s*\[([\s\S]*?)\](?:\s*as const)?,?/);
  const referencedKeyPatterns = body.match(/keyPatterns:\s*(\w+)/);
  if (inlineKeyPatterns) {
    keyPatterns = parseQuotedStrings(inlineKeyPatterns[1]);
  } else if (referencedKeyPatterns) {
    keyPatterns = resolveConstStringArray(source, referencedKeyPatterns[1]);
  }

  let entityContent = null;
  const entityContentMatch = body.match(/entityContent:\s*(\{[\s\S]*?\}),?\s*(?:keyPatterns:|translationKeys:|\})/);
  if (entityContentMatch) {
    try {
      entityContent = Function(`"use strict"; return (${entityContentMatch[1]});`)();
    } catch {
      entityContent = null;
    }
  }

  return {
    exportName,
    componentKey,
    namespace,
    translationKeys,
    keyPatterns,
    entityContent,
  };
}

export function extractTranslationKeys(source) {
  const keys = new Set();
  for (const match of source.matchAll(/\bt\(\s*['"]([^'"]+)['"]/g)) keys.add(match[1]);
  for (const match of source.matchAll(/translateText\(\s*['"]([^'"]+)['"]/g)) keys.add(match[1]);
  for (const match of source.matchAll(/translationKey:\s*['"]([^'"]+)['"]/g)) keys.add(match[1]);
  for (const match of source.matchAll(/labelKey:\s*['"]([^'"]+)['"]/g)) keys.add(match[1]);
  for (const match of source.matchAll(/titleKey:\s*['"]([^'"]+)['"]/g)) keys.add(match[1]);
  for (const match of source.matchAll(/\bkey:\s*['"]([^'"]+)['"]/g)) {
    if (match[1].includes('.')) keys.add(match[1]);
  }
  return [...keys];
}

function findExportStart(source, exportName) {
  const patterns = [
    new RegExp(`export\\s+(?:async\\s+)?function\\s+${exportName}\\b`),
    new RegExp(`export\\s+const\\s+${exportName}\\b`),
  ];
  for (const pattern of patterns) {
    const match = source.match(pattern);
    if (match) return match.index;
  }
  return -1;
}

function sliceBalancedBlock(source, openIndex) {
  let index = openIndex;
  while (index < source.length && source[index] !== '{' && !source.slice(index).startsWith('=>')) {
    index += 1;
  }
  if (index >= source.length) return source.slice(openIndex);

  if (source.slice(index).startsWith('=>')) {
    index += 2;
    while (index < source.length && /\s/.test(source[index])) index += 1;
    if (source[index] === '{') {
      return sliceBalancedBlock(source, index);
    }
    let end = index;
    while (end < source.length && source[end] !== ';' && source[end] !== '\n') end += 1;
    return source.slice(openIndex, end + 1);
  }

  let depth = 0;
  for (let cursor = index; cursor < source.length; cursor += 1) {
    const char = source[cursor];
    if (char === '{') depth += 1;
    else if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return source.slice(openIndex, cursor + 1);
      }
    }
  }

  return source.slice(openIndex);
}

export function extractExportFunctions(source, exportNames) {
  const blocks = [];
  for (const exportName of exportNames) {
    const start = findExportStart(source, exportName);
    if (start < 0) continue;
    blocks.push(sliceBalancedBlock(source, start));
  }
  return blocks.join('\n\n');
}

function parseSqlStringList(block) {
  const keys = new Set();
  for (const match of block.matchAll(/'([^']+)'/g)) {
    const key = match[1];
    if (isValidTranslationKey(key)) keys.add(key);
  }
  return keys;
}

async function listMigrationSqlFiles() {
  const migrationsDir = path.join(repoRoot, 'supabase/migrations');
  const entries = await readdir(migrationsDir);
  return entries
    .filter((entry) => entry.endsWith('.sql'))
    .map((entry) => path.join(migrationsDir, entry));
}

export async function loadSqlKeyCatalog(options = {}) {
  const excludePaths = new Set((options.excludePaths || []).map((entry) => path.resolve(entry)));
  const catalog = new Set();
  const files = await listMigrationSqlFiles();

  for (const filePath of files) {
    if (excludePaths.has(path.resolve(filePath))) continue;
    const source = await readFile(filePath, 'utf8');
    const insertPattern = /insert\s+into\s+public\.website_translation_keys[\s\S]*?values\s*([\s\S]*?)(?:on\s+conflict\s*\(|;\s*$)/gi;
    for (const match of source.matchAll(insertPattern)) {
      for (const key of parseSqlStringList(match[1])) {
        catalog.add(key);
      }
    }
  }

  return catalog;
}

export async function loadBootstrapKeySet() {
  const bootstrap = new Set();
  const files = await listMigrationSqlFiles();

  for (const filePath of files) {
    const source = await readFile(filePath, 'utf8');
    for (const match of source.matchAll(/=\s*any\s*\(\s*array\[([\s\S]*?)\]\s*\)/gi)) {
      for (const key of parseSqlStringList(match[1])) {
        bootstrap.add(key);
      }
    }
    for (const match of source.matchAll(/translation_key\s+in\s*\(([\s\S]*?)\)/gi)) {
      for (const key of parseSqlStringList(match[1])) {
        bootstrap.add(key);
      }
    }
  }

  return bootstrap;
}

export function collectRequiredKeys(manifest, usedKeys) {
  const keys = new Set();
  for (const key of manifest.translationKeys) {
    if (isValidTranslationKey(key) && !key.endsWith('.ui_scan')) keys.add(key);
  }
  for (const key of usedKeys) {
    if (isValidTranslationKey(key) && manifestCoversKey(manifest, key)) keys.add(key);
  }
  return [...keys];
}

export function inferNamespaceFromKey(key) {
  const dot = key.indexOf('.');
  return dot >= 0 ? key.slice(0, dot) : key;
}

export function extractTranslationFallbacks(source) {
  const fallbacks = new Map();
  for (const match of source.matchAll(/\bt\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]*)['"]/g)) {
    fallbacks.set(match[1], match[2]);
  }
  for (const match of source.matchAll(/translateText\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]*)['"]/g)) {
    fallbacks.set(match[1], match[2]);
  }
  return fallbacks;
}

export function sqlString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

export function formatSqlKeyArray(keys) {
  return `array[${keys.map((key) => sqlString(key)).join(', ')}]`;
}

export function manifestExportName(exportName) {
  return exportName
    .replace(/_I18N_MANIFEST$/, '')
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join('');
}

export function inferSurfaceType(relativePath, config) {
  const normalized = normalizePath(relativePath);
  if ((config.dataModulePaths || []).map(normalizePath).includes(normalized)) return 'data_module';
  if ((config.domInjectorPaths || []).map(normalizePath).includes(normalized)) return 'dom_injector';
  if (normalized === 'src/App.tsx' || normalized.startsWith('src/pages/')) return 'page';
  return 'component';
}

export function entityContentToSql(entityContent) {
  if (!entityContent) return 'null';
  return `${sqlString(JSON.stringify(entityContent))}::jsonb`;
}
