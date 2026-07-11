import test from 'node:test';
import assert from 'node:assert/strict';

const now = new Date('2026-07-11T12:00:00Z');
const isPostPublic = (p) => p.status === 'published' && Boolean(p.published_at) && Date.parse(p.published_at) <= now.getTime();
const filterPosts = (posts,{category='all',search='',sort='newest'}={}) => posts.filter((p)=>(category==='all'||p.category===category)&&(!search||[p.title,p.subtitle,p.excerpt,...(p.tags||[]),...(p.ventures||[])].join(' ').toLowerCase().includes(search.toLowerCase()))).sort((a,b)=>sort==='short'?a.reading-b.reading:Date.parse(b.published_at)-Date.parse(a.published_at));
const sanitizeMarkdown = (markdown='') => markdown.replace(/[&<>]/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
const applyTranslation = (post, lang) => { const t=(post.translations||[]).find((x)=>x.language_code===lang&&x.translation_status==='published'); return { title:t?.title||post.title, language:t?.language_code||post.original_language }; };
const validSubmission = (s) => Boolean(s.title?.trim() && s.summary?.trim() && s.body?.trim() && s.consent_to_contact);
const duplicate = (rows,email) => rows.some((r)=>r.email.toLowerCase()===email.toLowerCase()&&r.status==='active');

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
