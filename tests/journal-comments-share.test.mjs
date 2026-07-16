import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const journalLib = readFileSync(new URL('../src/lib/journal.ts', import.meta.url), 'utf8');
const journalPage = readFileSync(new URL('../src/pages/JournalPages.tsx', import.meta.url), 'utf8');
const shareActions = readFileSync(new URL('../src/components/ShareActions.tsx', import.meta.url), 'utf8');
const breakPage = readFileSync(new URL('../src/pages/BreakTheCirclePages.tsx', import.meta.url), 'utf8');

describe('journal comments and sharing implementation', () => {
  it('public comment queries expose approved comment fields without email', () => {
    const publicSelect = journalLib.match(/const commentSelect = '([^']+)'/)?.[1] ?? '';
    assert.match(publicSelect, /display_name/);
    assert.match(publicSelect, /body/);
    assert.doesNotMatch(publicSelect, /email/);
    assert.match(journalLib, /status=eq\.approved/);
  });

  it('submitted comments are normalized as pending moderation records', () => {
    assert.match(journalLib, /status: 'pending' as const/);
    assert.match(journalLib, /display_name=input\.display_name\.trim\(\)/);
    assert.match(journalLib, /body=input\.body\.trim\(\)/);
  });

  it('share block supports native, copy link and fallback social platforms', () => {
    assert.match(journalPage, /<ShareActions[\s\S]*entityType="journal_post"/);
    assert.match(journalPage, /onShare=\{\(platform\) => void recordJournalShare\(post\.id, platform\)\}/);
    for (const platform of ['native', 'copy_link', 'x', 'facebook', 'linkedin', 'whatsapp', 'telegram', 'email']) {
      assert.match(journalLib + shareActions, new RegExp(platform));
    }
    assert.match(shareActions, /navigator\.share/);
    assert.match(shareActions, /navigator\.clipboard\.writeText/);
  });

  it('break the circle stories use their canonical public route for sharing', () => {
    assert.match(breakPage, /<ShareBlock post=\{post\} basePath="\/break-the-circle"\/>/);
  });
});
