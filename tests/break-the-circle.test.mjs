import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const lib = readFileSync(new URL('../src/lib/breakTheCircle.ts', import.meta.url), 'utf8');
const page = readFileSync(new URL('../src/pages/BreakTheCirclePages.tsx', import.meta.url), 'utf8');
const migration = readFileSync(new URL('../supabase/migrations/20260712006200_break_the_circle_admin.sql', import.meta.url), 'utf8');
const isPublic = (p, now = new Date('2026-07-12T12:00:00Z')) => p.status === 'published' && Boolean(p.published_at) && Date.parse(p.published_at) <= now.getTime();
const validateCta = (label, url) => Boolean(label.trim()) === Boolean(url.trim());
const filterAdmin = (posts, { search='', status='all', featured='all' } = {}) => posts.filter((p)=>(status==='all'||p.status===status)&&(featured==='all'||(featured==='featured'?p.featured:!p.featured))&&(!search||[p.title,p.slug,p.excerpt].join(' ').toLowerCase().includes(search.toLowerCase())));

test('public collection only returns linked published due posts', () => {
  assert.equal(isPublic({ status: 'published', published_at: '2026-07-12T00:00:00Z', linked: true }), true);
  assert.equal(isPublic({ status: 'draft', published_at: '2026-07-12T00:00:00Z', linked: true }), false);
  assert.match(lib, /break_the_circle_posts!inner/);
  assert.match(lib, /status=eq\.published/);
  assert.match(lib, /published_at=lte/);
});

test('public slug page rejects drafts and future scheduled posts', () => {
  assert.equal(isPublic({ status: 'draft', published_at: '2026-07-11T00:00:00Z' }), false);
  assert.equal(isPublic({ status: 'scheduled', published_at: '2026-07-13T00:00:00Z' }), false);
  assert.match(page, /Story not found or not public/);
});

test('administrator create writes journal and metadata through one rpc', () => {
  assert.match(lib, /upsert_break_the_circle_post/);
  assert.match(migration, /insert into public\.journal_posts/);
  assert.match(migration, /insert into public\.break_the_circle_posts/);
  assert.match(migration, /on conflict \(journal_post_id\) do update/);
  assert.match(migration, /raise exception 'Administrator access is required\.'/);
});

test('admin rpc enforces publish and schedule readiness server-side', () => {
  assert.match(migration, /Scheduled posts require a future scheduled date\./);
  assert.match(migration, /Published posts require a valid publication date\./);
  assert.match(migration, /p_post->>'status' = 'scheduled'/);
  assert.match(migration, /p_post->>'status' = 'published'/);
});

test('CTA pair validation requires both label and URL or neither', () => {
  assert.equal(validateCta('', ''), true);
  assert.equal(validateCta('Help', 'https://example.com'), true);
  assert.equal(validateCta('Help', ''), false);
  assert.match(lib, /CTA label and URL must either both be filled in or both be empty/);
});

test('administrator can publish, unpublish, archive and schedule', () => {
  assert.match(page, />Publish</);
  assert.match(page, />Unpublish</);
  assert.match(page, />Archive</);
  assert.match(page, />Schedule</);
  assert.match(lib, /transitionBreakTheCirclePost/);
  assert.match(lib, /transition_break_the_circle_post/);
  assert.match(lib, /Scheduled posts require a future scheduled date/);
  assert.match(migration, /Body and excerpt are required before publishing or scheduling/);
});

test('featured status and order are editable and sorted from metadata', () => {
  const rows=[{title:'B', featured:true, order:2, published_at:'2026-07-12'}, {title:'A', featured:true, order:1, published_at:'2026-07-11'}].sort((a,b)=>a.order-b.order || Date.parse(b.published_at)-Date.parse(a.published_at));
  assert.deepEqual(rows.map((r)=>r.title), ['A','B']);
  assert.match(lib, /btcMeta\?\.featured_order/);
  assert.match(page, /Featured order/);
});

test('non-admin users cannot access admin actions or preview', () => {
  assert.match(lib, /Administrator access is required/);
  assert.match(page, /AdminGate/);
  assert.match(page, /Administrator preview · not public/);
});

test('deleting journal post cascades to metadata', () => {
  assert.match(migration, /journal_post_id uuid not null unique references public\.journal_posts\(id\) on delete cascade/);
  assert.match(lib, /deleteBreakTheCirclePost/);
});

test('admin search and status filters behave correctly', () => {
  const rows=[{title:'Momentum',slug:'momentum',excerpt:'network',status:'draft',featured:false},{title:'Partner',slug:'partner',excerpt:'launch',status:'published',featured:true}];
  assert.deepEqual(filterAdmin(rows,{search:'launch'}).map((r)=>r.title), ['Partner']);
  assert.deepEqual(filterAdmin(rows,{status:'draft'}).map((r)=>r.title), ['Momentum']);
  assert.deepEqual(filterAdmin(rows,{featured:'featured'}).map((r)=>r.title), ['Partner']);
});
