import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseFounderSupportInboxPayload, normalizeSupportStatus } from '../src/lib/founderSupportAdminInbox.ts';

const adminLib = readFileSync(new URL('../src/lib/founderSupportAdmin.ts', import.meta.url), 'utf8');
const adminPage = readFileSync(new URL('../src/pages/FounderSupportAdminPage.tsx', import.meta.url), 'utf8');
const migration = readFileSync(new URL('../supabase/migrations/20260716190000_founder_support_admin_inbox_rpc.sql', import.meta.url), 'utf8');

test('support inbox loader uses the admin RPC instead of direct table REST', () => {
  assert.match(adminLib, /admin_get_founder_support_inbox/);
  assert.doesNotMatch(adminLib, /founder_support_messages\?select=\*/);
  assert.match(adminLib, /parseFounderSupportInboxPayload/);
});

test('migration syncs inbox RPC and restricts execution to authenticated users', () => {
  assert.match(migration, /create or replace function public\.admin_get_founder_support_inbox\(\)/);
  assert.match(migration, /security definer/);
  assert.match(migration, /grant execute on function public\.admin_get_founder_support_inbox\(\) to authenticated/);
});

test('admin page distinguishes loading, error and empty-success states', () => {
  assert.match(adminPage, /useState<FounderSupportCounts \| null>\(null\)/);
  assert.match(adminPage, /setCounts\(null\)/);
  assert.match(adminPage, /loading \|\| !counts \? '—'/);
  assert.match(adminPage, /counts\.total === 0/);
  assert.match(adminPage, /initialStatusFilter/);
});

test('parseFounderSupportInboxPayload maps a valid RPC payload', () => {
  const inbox = parseFounderSupportInboxPayload({
    messages: [{ id: 'msg-1', status: 'approved', sender_name: 'Example' }],
    counts: { pending: 0, approved: 1, rejected: 0, spam: 0, total: 1 },
  });

  assert.equal(inbox.counts.approved, 1);
  assert.equal(inbox.counts.total, 1);
  assert.equal(inbox.messages[0].status, 'approved');
});

test('parseFounderSupportInboxPayload rejects invalid payloads', () => {
  assert.throws(() => parseFounderSupportInboxPayload(null), /invalid payload/i);
  assert.throws(() => parseFounderSupportInboxPayload({ messages: [], counts: { pending: 0 } }), /invalid status counts/i);
  assert.throws(() => parseFounderSupportInboxPayload({ messages: [{ status: 'unknown' }], counts: { pending: 0, approved: 0, rejected: 0, spam: 0, total: 0 } }), /invalid status/i);
});

test('normalizeSupportStatus only accepts moderation statuses', () => {
  assert.equal(normalizeSupportStatus('Approved'), 'approved');
  assert.equal(normalizeSupportStatus('pending'), 'pending');
  assert.equal(normalizeSupportStatus('archived'), null);
});
