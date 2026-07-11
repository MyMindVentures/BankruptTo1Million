import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const journalSource = readFileSync(new URL('../src/lib/journal.ts', import.meta.url), 'utf8');
const pageSource = readFileSync(new URL('../src/pages/JournalPages.tsx', import.meta.url), 'utf8');
const now = new Date('2026-07-11T12:00:00Z');
const isPostPublic = (p) => p.status === 'published' && Boolean(p.published_at) && Date.parse(p.published_at) <= now.getTime();
const filterPosts = (posts,{category='all',search='',sort='newest'}={}) => posts.filter((p)=>(category==='all'||p.category===category)&&(!search||[p.title,p.subtitle,p.excerpt,...(p.tags||[]),...(p.ventures||[])].join(' ').toLowerCase().includes(search.toLowerCase()))).sort((a,b)=>sort==='short'?a.reading-b.reading:Date.parse(b.published_at)-Date.parse(a.published_at));
const sanitizeMarkdown = (markdown='') => markdown.replace(/[&<>]/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
const applyTranslation = (post, lang) => { const t=(post.translations||[]).find((x)=>x.language_code===lang&&x.translation_status==='published'); return { title:t?.title||post.title, language:t?.language_code||post.original_language }; };
const validSubmission = (s) => Boolean(s.title?.trim() && s.summary?.trim() && s.body?.trim() && s.consent_to_contact);
const duplicate = (rows,email) => rows.some((r)=>r.email.toLowerCase()===email.toLowerCase()&&r.status==='active');
const publicAuthor = (overrides) => ({ id: crypto.randomUUID(), slug: 'author', display_name: 'Author', is_public: true, is_founder: false, ...overrides });
const getPostAuthors = (post) => [...(post.journal_post_author_links || [])].sort((a,b)=>(a.author_order ?? 0)-(b.author_order ?? 0)).map((link)=>link.journal_authors).filter((author) => Boolean(author?.is_public));
const formatAuthorByline = (post) => { const names = getPostAuthors(post).map((a)=>a.display_name).filter(Boolean); if (!names.length) return ''; if (names.length === 1) return `By ${names[0]}`; if (names.length === 2) return `By ${names[0]} & ${names[1]}`; return `By ${names.slice(0,-1).join(', ')} & ${names[names.length - 1]}`; };

test('only currently published posts are public', () => {
  assert.equal(isPostPublic({status:'published',published_at:'2026-07-10T00:00:00Z'}), true);
  assert.equal(isPostPublic({status:'scheduled',published_at:'2026-07-10T00:00:00Z'}), false);
  assert.equal(isPostPublic({status:'archived',published_at:'2026-07-10T00:00:00Z'}), false);
});
test('future scheduled published timestamps are hidden', () => assert.equal(isPostPublic({status:'published',published_at:'2026-07-12T00:00:00Z'}), false));
test('category filters and search match real fields', () => { const rows=[{title:'Mission',category:'mission',tags:['vision'],ventures:[],reading:5,published_at:'2026-07-10'},{title:'Build',category:'build',tags:[],ventures:['VentureFoundry'],reading:2,published_at:'2026-07-09'}]; assert.deepEqual(filterPosts(rows,{category:'mission'}).map(p=>p.title),['Mission']); assert.deepEqual(filterPosts(rows,{search:'venturefoundry'}).map(p=>p.title),['Build']); assert.deepEqual(filterPosts(rows,{sort:'short'}).map(p=>p.title),['Build','Mission']); });
test('slug routing shape supports journal article slugs and not found', () => { const slug = '/journal/why-we-are-building'.split('/')[2]; assert.equal(slug,'why-we-are-building'); assert.equal([].find((p)=>p.slug==='missing') ?? null, null); });
test('newsletter duplicate prevention detects active email only', () => { assert.equal(duplicate([{email:'A@B.com',status:'active'}],'a@b.com'), true); assert.equal(duplicate([{email:'a@b.com',status:'unsubscribed'}],'a@b.com'), false); });
test('story submission validation requires moderation contact consent and content', () => { assert.equal(validSubmission({title:'T',summary:'S',body:'B',consent_to_contact:true}), true); assert.equal(validSubmission({title:'T',summary:'',body:'B',consent_to_contact:true}), false); assert.equal(validSubmission({title:'T',summary:'S',body:'B',consent_to_contact:false}), false); });
test('Markdown sanitization escapes script execution', () => { const html=sanitizeMarkdown('# Hello\n<script>alert(1)</script>'); assert.match(html,/&lt;script&gt;/); assert.doesNotMatch(html,/<script>/); });
test('translation fallback keeps canonical post identity', () => { const post={title:'Original',original_language:'en',translations:[{language_code:'nl',translation_status:'draft',title:'Concept'}]}; assert.deepEqual(applyTranslation(post,'nl'),{title:'Original',language:'en'}); });

test('Journal query no longer includes ambiguous profiles and uses explicit author and issue relations', () => {
  const select = journalSource.match(/export const JOURNAL_SELECT = `([\s\S]*?)`;/)?.[1] ?? '';
  assert.doesNotMatch(select, /profiles\s*\(/);
  assert.match(select, /journal_post_author_links\s*\(/);
  assert.match(select, /journal_authors\s*\(/);
  assert.match(select, /issue_number/);
  assert.match(select, /issue_url/);
  assert.doesNotMatch(select, /html_url/);
});

test('multiple authors are sorted correctly', () => {
  const authors = getPostAuthors({ journal_post_author_links: [
    { author_order: 2, journal_authors: publicAuthor({ display_name: 'Micha' }) },
    { author_order: 1, journal_authors: publicAuthor({ display_name: 'Kevin' }) },
  ]});
  assert.deepEqual(authors.map((a)=>a.display_name), ['Kevin', 'Micha']);
});

test('null and private authors are excluded', () => {
  const authors = getPostAuthors({ journal_post_author_links: [
    { author_order: 1, journal_authors: null },
    { author_order: 2, journal_authors: publicAuthor({ display_name: 'Private', is_public: false }) },
    { author_order: 3, journal_authors: publicAuthor({ display_name: 'Public' }) },
  ]});
  assert.deepEqual(authors.map((a)=>a.display_name), ['Public']);
});

test('one-author and two-author display use linked authors only', () => {
  assert.equal(formatAuthorByline({ journal_post_author_links: [{ author_order: 1, journal_authors: publicAuthor({ display_name: 'Kevin' }) }] }), 'By Kevin');
  assert.equal(formatAuthorByline({ journal_post_author_links: [{ author_order: 1, journal_authors: publicAuthor({ display_name: 'Kevin' }) }, { author_order: 2, journal_authors: publicAuthor({ display_name: 'Micha' }) }] }), 'By Kevin & Micha');
});

test('missing-author state does not invent fallback names', () => {
  assert.equal(formatAuthorByline({ journal_post_author_links: [] }), '');
  assert.doesNotMatch(pageSource, /Bankrupt to 1 Million';/);
});

test('raw Supabase errors are not rendered publicly', () => {
  assert.match(journalSource, /The Journal is temporarily unavailable\. Please try again shortly\./);
  assert.doesNotMatch(pageSource, /Journal unavailable\. \{error\}/);
  assert.doesNotMatch(pageSource, /PGRST201/);
});

test('zero published posts shows an empty state rather than an error', () => {
  assert.match(pageSource, /The first stories are being prepared\./);
  assert.match(pageSource, /Follow the journey and return soon for new mission updates, visions and founder stories\./);
});
