import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { journalSpeechText, selectJournalVoice, splitJournalSpeechText } from '../src/lib/journalReadAloud.ts';

const component = readFileSync(new URL('../src/components/journal/JournalReadAloud.tsx', import.meta.url), 'utf8');
const page = readFileSync(new URL('../src/pages/JournalPages.tsx', import.meta.url), 'utf8');
const migration = readFileSync(new URL('../supabase/migrations/20260726150000_journal_read_aloud.sql', import.meta.url), 'utf8');

test('speech text contains localized editorial content without markdown controls', () => {
  assert.equal(
    journalSpeechText('A title', 'A subtitle', '### First\nRead **this** [source](https://example.com).\n- Last point'),
    'A title. A subtitle. First Read this source. Last point',
  );
});

test('speech text decodes stored newlines and common HTML entities', () => {
  assert.equal(journalSpeechText('Title', undefined, 'First\\nSecond &amp; third&nbsp;line.'), 'Title. First Second & third line.');
});

test('long and non-space-delimited articles are split into safe utterance chunks', () => {
  const chunks = splitJournalSpeechText(`${'A'.repeat(250)}. A short sentence.`, 100);
  assert.deepEqual(chunks.map((chunk) => chunk.length), [100, 100, 69]);
  assert.equal(chunks.join(' ').replace(/\s/g, ''), `${'A'.repeat(250)}.Ashortsentence.`);
  assert.deepEqual(splitJournalSpeechText('', 100), []);
});

test('voice selection prefers an exact locale and then its language family', () => {
  const voices = [{ lang: 'es-MX', name: 'Spanish' }, { lang: 'en-US', name: 'English' }];
  assert.equal(selectJournalVoice(voices, 'es-MX')?.name, 'Spanish');
  assert.equal(selectJournalVoice(voices, 'es-ES')?.name, 'Spanish');
  assert.equal(selectJournalVoice(voices, 'ar'), null);
});

test('read-aloud controls implement play, pause, resume, stop and cleanup', () => {
  assert.match(component, /new SpeechSynthesisUtterance\(chunk\)/);
  assert.match(component, /splitJournalSpeechText\(text\)/);
  assert.match(component, /speechSynthesis\.pause\(\)/);
  assert.match(component, /speechSynthesis\.resume\(\)/);
  assert.match(component, /speechSynthesis\.cancel\(\)/);
  assert.match(component, /utterance\.lang = language/);
  assert.match(page, /<JournalReadAloud[\s\S]*?language=\{post\.activeLanguage\}/);
});

test('read-aloud UI is registry-backed with explicit 30-language catalog rows', () => {
  assert.match(component, /JOURNAL_READ_ALOUD_I18N_MANIFEST/);
  assert.match(migration, /journal\.read_aloud\.controls/);
  const languages = [...migration.matchAll(/^\('([a-z]{2})','\{/gm)].map((match) => match[1]);
  assert.equal(languages.length, 30);
  assert.equal(new Set(languages).size, 30);
});
