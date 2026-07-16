#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyPublicI18n } from './verify-public-i18n.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

function toComponentKey(relativePath) {
  const base = relativePath.replace(/^src\//, '').replace(/\.tsx?$/, '');
  return base
    .replace(/\//g, '.')
    .replace(/([a-z0-9])([A-Z])/g, '$1.$2')
    .toLowerCase()
    .replace(/\.+/g, '.');
}

function toExportName(relativePath) {
  return path.basename(relativePath).replace(/\.tsx?$/, '');
}

function toManifestConst(exportName) {
  return `${exportName.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toUpperCase()}_I18N_MANIFEST`;
}

function extractKeys(source) {
  const keys = new Set();
  for (const match of source.matchAll(/\bt\(\s*['"]([^'"]+)['"]/g)) keys.add(match[1]);
  for (const match of source.matchAll(/translateText\(\s*['"]([^'"]+)['"]/g)) keys.add(match[1]);
  for (const match of source.matchAll(/translationKey:\s*['"]([^'"]+)['"]/g)) keys.add(match[1]);
  for (const match of source.matchAll(/labelKey:\s*['"]([^'"]+)['"]/g)) keys.add(match[1]);
  for (const match of source.matchAll(/titleKey:\s*['"]([^'"]+)['"]/g)) keys.add(match[1]);
  for (const match of source.matchAll(/\bkey:\s*['"]([^'"]+)['"]/g)) {
    if (match[1].includes('.')) keys.add(match[1]);
  }
  return [...keys].sort();
}

function inferNamespace(keys) {
  if (!keys.length) return 'ui';
  const first = keys[0];
  const parts = first.split('.');
  return parts.length > 1 ? parts.slice(0, -1).join('.') : parts[0];
}

function inferPatterns(keys) {
  const prefixes = new Set();
  for (const key of keys) {
    const parts = key.split('.');
    if (parts.length >= 3) prefixes.add(`${parts.slice(0, -1).join('.')}.*`);
  }
  return [...prefixes];
}

function buildManifestBlock(exportName, componentKey, namespace, keys, patterns, surfaceType) {
  const constName = toManifestConst(exportName);
  const lines = [
    `export const ${constName} = {`,
    `  componentKey: '${componentKey}',`,
    `  namespace: '${namespace}',`,
    `  translationKeys: [`,
    ...keys.map((key) => `    '${key}',`),
    `  ] as const,`,
  ];
  if (patterns.length) {
    lines.push(`  keyPatterns: [`);
    lines.push(...patterns.map((pattern) => `    '${pattern}',`));
    lines.push(`  ] as const,`);
  }
  if (surfaceType === 'dom_injector') {
    lines.push(`  entityContent: { tables: [] },`);
  }
  lines.push(`} as const satisfies I18nManifest;`);
  return lines.join('\n');
}

function importPathFor(relativePath) {
  const depth = relativePath.split('/').length - 2;
  return `${'../'.repeat(Math.max(depth, 1))}lib/i18nManifest`;
}

async function main() {
  const errors = await verifyPublicI18n();
  const missing = errors.filter((entry) => entry.includes('missing export const *_I18N_MANIFEST'));
  for (const error of missing) {
    const relativePath = error.split(':')[0];
    const absolutePath = path.join(repoRoot, relativePath);
    const source = await readFile(absolutePath, 'utf8');
    if (source.includes('_I18N_MANIFEST')) continue;

    const exportName = toExportName(relativePath);
    const componentKey = toComponentKey(relativePath);
    const keys = extractKeys(source);
    const namespace = inferNamespace(keys);
    const patterns = inferPatterns(keys);
    const surfaceType = relativePath.includes('src/lib/') ? 'dom_injector' : 'component';
    const manifest = buildManifestBlock(exportName, componentKey, namespace, keys, patterns, surfaceType);

    let next = source;
    const importLine = `import type { I18nManifest } from '${importPathFor(relativePath)}';\n`;
    if (!next.includes('I18nManifest')) {
      const imports = [...next.matchAll(/^import .+;\n/gm)];
      if (imports.length) {
        const last = imports.at(-1);
        next = `${next.slice(0, last.index + last[0].length)}${importLine}${next.slice(last.index + last[0].length)}`;
      } else {
        next = `${importLine}${next}`;
      }
    }

    const insertMatch = next.match(/^export (?:function|const|async function|class|type) /m);
    const insertIndex = insertMatch?.index ?? 0;
    next = `${next.slice(0, insertIndex)}${manifest}\n\n${next.slice(insertIndex)}`;
    await writeFile(absolutePath, next, 'utf8');
    console.log(`Added manifest to ${relativePath} (${keys.length} keys)`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
