import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
const header = readFileSync(new URL('../src/components/Header.tsx', import.meta.url), 'utf8');
const siteContent = readFileSync(new URL('../src/data/siteContent.ts', import.meta.url), 'utf8');
const page = readFileSync(new URL('../src/pages/BreakTheCirclePages.tsx', import.meta.url), 'utf8');
const server = readFileSync(new URL('../server.mjs', import.meta.url), 'utf8');

test('public navigation exposes the canonical Break the Circle link only', () => {
  assert.match(siteContent, /label: 'Break the Circle', href: '\/break-the-circle'/);
  assert.doesNotMatch(siteContent, /href: '\/admin\/break-the-circle'/);
});

test('desktop and mobile navigation render navItems hrefs', () => {
  assert.match(header, /navItems\.map/);
  assert.match(header, /<a key=\{item\.href\} href=\{item\.href\}>/);
  assert.match(header, /<a key=\{item\.href\} href=\{item\.href\} onClick=\{closeMobileMenu\}>/);
});

test('canonical /break-the-circle routes render the public page and articles', () => {
  assert.match(app, /path === '\/break-the-circle'[\s\S]*?<BreakTheCirclePage \/>/);
  assert.match(app, /path\.startsWith\('\/break-the-circle\/'\)[\s\S]*?<BreakTheCircleArticlePage slug=\{decodeURIComponent\(path\.split\('\/'\)\[2\]/);
});

test('legacy Break the Circle route still resolves without conflicting with admin routes', () => {
  const legacyIndex = app.indexOf("path === '/help-us-break-the-circle'");
  const adminIndex = app.indexOf("path === '/admin/break-the-circle'");
  assert.notEqual(legacyIndex, -1);
  assert.notEqual(adminIndex, -1);
  assert.match(app, /path\.startsWith\('\/admin\/break-the-circle\/'\)/);
});

test('Break the Circle internal article and not-found links use the canonical route', () => {
  assert.match(page, /href=\{`\/break-the-circle\/\$\{post\.slug\}`\}/);
  assert.match(page, /href="\/break-the-circle">Back to collection/);
});

test('production server falls back to index.html for direct route refreshes', () => {
  assert.match(server, /if \(existsSync\(indexFile\)\) \{\s*sendFile\(response, indexFile\);\s*return;\s*\}/);
});
