import { supabase, type SupabaseSession } from './supabase';
import { resolvePublicMediaUrl } from './journalFootage';

export type JournalStatus = 'draft' | 'scheduled' | 'published' | 'archived';
export type ContentFormat = 'markdown' | 'rich_text' | 'video' | 'mixed';
export type TranslationStatus = 'draft' | 'review' | 'published' | 'archived';
export type JournalCategory = { id: string; name: string; slug: string; description?: string; display_order: number; is_public: boolean; created_at: string; updated_at: string; };
export type JournalTag = { id: string; name: string; slug: string; description?: string; created_at: string; };
export type JournalAuthor = { id: string; slug: string; display_name: string; full_name?: string; role?: string; bio?: string; location?: string; avatar_url?: string; website_url?: string; github_url?: string; is_founder: boolean; is_public: boolean; };
export type JournalPostAuthorLink = { author_order: number; author_role: string; journal_authors: JournalAuthor | null; };
export type JournalIssue = { id: number | string; issue_number?: number; title?: string; display_title?: string; state?: string; issue_type?: string; issue_url?: string; };
export type JournalVenture = { venture_slug: string; venture_name: string; };
export type JournalTranslation = { id: string; language_code: string; translation_status: TranslationStatus; title?: string; subtitle?: string; excerpt?: string; body?: string; seo_title?: string; seo_description?: string; published_at?: string; };
export type JournalPost = { id: string; slug: string; status: JournalStatus; title: string; subtitle?: string; excerpt?: string; body?: string; content_format: ContentFormat; cover_image_url?: string; cover_image_alt?: string; original_language: string; author_profile_id?: string; category_id?: string; is_featured: boolean; is_vision_feature: boolean; published_at?: string; scheduled_for?: string; reading_time_minutes?: number; seo_title?: string; seo_description?: string; og_image_url?: string; created_at: string; updated_at: string; journal_categories?: JournalCategory | null; journal_post_author_links?: JournalPostAuthorLink[]; journal_post_tags?: { journal_tags: JournalTag | null }[]; journal_post_ventures?: JournalVenture[]; journal_post_issues?: { github_issues: JournalIssue | null }[]; journal_translations?: JournalTranslation[]; };
export type PublicJournalPost = JournalPost & { displayTitle: string; displaySubtitle?: string; displayExcerpt?: string; displayBody?: string; activeLanguage: string; availableLanguages: string[] };
export type JournalIndexData = { posts: PublicJournalPost[]; categories: JournalCategory[]; tags: JournalTag[]; featured?: PublicJournalPost; visions: PublicJournalPost[]; ventureGroups: { slug: string; name: string; posts: PublicJournalPost[] }[]; };

export const JOURNAL_SELECT = `
*,
journal_categories(*),
journal_post_author_links(
  author_order,
  author_role,
  journal_authors(
    id,
    slug,
    display_name,
    full_name,
    role,
    bio,
    location,
    avatar_url,
    website_url,
    github_url,
    is_founder,
    is_public
  )
),
journal_post_tags(
  journal_tags(*)
),
journal_post_ventures(*),
journal_post_issues(
  github_issues(
    id,
    issue_number,
    title,
    display_title,
    state,
    issue_type,
    issue_url
  )
),
journal_translations(*)
`;
export const publicPostQuery = `select=${JOURNAL_SELECT}&status=eq.published&published_at=not.is.null&published_at=lte.${encodeURIComponent(new Date().toISOString())}&order=published_at.desc`;

async function readJson<T>(responseOrPromise: Response | Promise<Response>): Promise<T> { const response = await responseOrPromise; if (!response.ok) throw new Error(await response.text()); return response.json() as Promise<T>; }
export function isPostPublic(post: Pick<JournalPost, 'status' | 'published_at'>, now = new Date()) { return post.status === 'published' && Boolean(post.published_at) && Date.parse(post.published_at || '') <= now.getTime(); }
export function getPostAuthors(post: JournalPost): JournalAuthor[] { return [...(post.journal_post_author_links || [])].sort((a,b)=>(a.author_order ?? 0)-(b.author_order ?? 0)).map((link)=>link.journal_authors).filter((author): author is JournalAuthor => Boolean(author?.is_public)); }
export function formatAuthorByline(post: JournalPost): string { const names = getPostAuthors(post).map((a)=>a.display_name).filter(Boolean); if (!names.length) return ''; if (names.length === 1) return `By ${names[0]}`; if (names.length === 2) return `By ${names[0]} & ${names[1]}`; return `By ${names.slice(0,-1).join(', ')} & ${names[names.length - 1]}`; }
export function getSafeJournalErrorMessage() { return 'The Journal is temporarily unavailable. Please try again shortly.'; }
export function logJournalError(error: unknown, context: string) { if (import.meta.env.DEV) console.error(`[Journal] ${context}`, error); }
export function resolveJournalMediaUrl(url?: string | null) {
  const resolved = resolvePublicMediaUrl(url);
  return resolved || undefined;
}

export function normalizeJournalPostMedia(post: JournalPost): JournalPost {
  return {
    ...post,
    cover_image_url: resolveJournalMediaUrl(post.cover_image_url),
    og_image_url: resolveJournalMediaUrl(post.og_image_url),
  };
}

export function applyTranslation(post: JournalPost, language = new URLSearchParams(location.search).get('lang') || post.original_language): PublicJournalPost {
  const normalized = normalizeJournalPostMedia(post);
  const translations = normalized.journal_translations || [];
  const published = translations.filter((t) => t.translation_status === 'published' && (!t.published_at || Date.parse(t.published_at) <= Date.now()));
  const t = published.find((row) => row.language_code === language);
  return {
    ...normalized,
    displayTitle: t?.title || normalized.title,
    displaySubtitle: t?.subtitle || normalized.subtitle,
    displayExcerpt: t?.excerpt || normalized.excerpt,
    displayBody: t?.body || normalized.body,
    activeLanguage: t?.language_code || normalized.original_language,
    availableLanguages: [normalized.original_language, ...published.map((row) => row.language_code)].filter((v, i, a) => v && a.indexOf(v) === i),
  };
}
export function filterPosts(posts: PublicJournalPost[], opts: { category?: string; search?: string; sort?: string }) { const q = (opts.search || '').trim().toLowerCase(); return posts.filter((p) => (!opts.category || opts.category === 'all' || p.journal_categories?.slug === opts.category) && (!q || [p.displayTitle,p.displaySubtitle,p.displayExcerpt,...getPostAuthors(p).map((a)=>a.display_name),...(p.journal_post_tags || []).map((t)=>t.journal_tags?.name),...(p.journal_post_ventures || []).map((v)=>v.venture_name)].filter(Boolean).join(' ').toLowerCase().includes(q))).sort((a,b)=> opts.sort === 'updated' ? Date.parse(b.updated_at)-Date.parse(a.updated_at) : opts.sort === 'short' ? (a.reading_time_minutes||999)-(b.reading_time_minutes||999) : opts.sort === 'long' ? (b.reading_time_minutes||0)-(a.reading_time_minutes||0) : Date.parse(b.published_at || '')-Date.parse(a.published_at || '')); }
export function sanitizeMarkdown(markdown = '') {
  const normalized = markdown
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\r\n/g, '\n')
    .trim();
  let html = normalized.replace(/[&<>]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]!));
  html = html
    .replace(/^### (.*)$/gm,'<h3>$1</h3>')
    .replace(/^## (.*)$/gm,'<h2>$1</h2>')
    .replace(/^# (.*)$/gm,'<h1>$1</h1>')
    .replace(/^&gt; (.*)$/gm,'<blockquote>$1</blockquote>')
    .replace(/!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g,'<img src="$2" alt="$1" loading="lazy" />')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,'<a href="$2" target="_blank" rel="noopener noreferrer">$1<span class="visually-hidden"> (opens in a new tab)</span></a>')
    .replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>')
    .replace(/`([^`]+)`/g,'<code>$1</code>')
    .replace(/\n{2,}/g,'</p><p>')
    .replace(/\n/g,'<br />');
  return `<p>${html}</p>`
    .replace(/<p><h/g,'<h')
    .replace(/<\/h([123])><\/p>/g,'</h$1>')
    .replace(/<p><blockquote>/g,'<blockquote>')
    .replace(/<\/blockquote><\/p>/g,'</blockquote>')
    .replace(/<p>\s*<\/p>/g, '');
}
export async function getJournalIndex(): Promise<JournalIndexData> { const [posts,categories,tags] = await Promise.all([readJson<JournalPost[]>(supabase.from('journal_posts').request({ query: publicPostQuery })), readJson<JournalCategory[]>(supabase.from('journal_categories').request({ query: 'select=*&is_public=eq.true&order=display_order.asc' })), readJson<JournalTag[]>(supabase.from('journal_tags').request({ query: 'select=*&order=name.asc' }))]); const publicPosts = posts.filter((p)=>isPostPublic(p)).map((p)=>applyTranslation(p)); return { posts: publicPosts, categories, tags, featured: publicPosts.find((p)=>p.is_featured), visions: publicPosts.filter((p)=>p.is_vision_feature), ventureGroups: Object.values(publicPosts.flatMap((p)=>p.journal_post_ventures || []).reduce<Record<string,{slug:string;name:string;posts:PublicJournalPost[]}>>((acc,v)=>{ acc[v.venture_slug] ||= { slug:v.venture_slug, name:v.venture_name, posts: publicPosts.filter((p)=>p.journal_post_ventures?.some((pv)=>pv.venture_slug===v.venture_slug)) }; return acc; },{})) }; }
export async function getJournalPost(slug: string): Promise<PublicJournalPost | null> { const rows = await readJson<JournalPost[]>(supabase.from('journal_posts').request({ query: `${publicPostQuery}&slug=eq.${encodeURIComponent(slug)}` })); const post = rows.find((p)=>p.slug === slug && isPostPublic(p)); return post ? applyTranslation(post) : null; }
export async function subscribeToJournal(email: string, preferred_language: string) { const normalized = email.trim().toLowerCase(); if (!/^\S+@\S+\.\S+$/.test(normalized)) throw new Error('Enter a valid email address.'); const response = await supabase.from('newsletter_subscribers').request({ method: 'POST', headers: { Prefer: 'return=representation' }, body: { email: normalized, preferred_language, status: 'active', source: 'journal', consent_at: new Date().toISOString() } }); if (response.status === 409) return { duplicate: true }; await readJson(response); return { duplicate: false }; }
export async function submitStory(input: { name: string; email: string; submission_type: string; title: string; summary: string; body: string; consent_to_contact: boolean; consent_to_publish: boolean }, session?: SupabaseSession | null) { if (!input.title.trim() || !input.summary.trim() || !input.body.trim()) throw new Error('Title, summary and story body are required.'); if (!input.consent_to_contact) throw new Error('Consent to contact is required so editors can moderate submissions.'); await readJson(supabase.from('journal_story_submissions').request({ method: 'POST', accessToken: session?.access_token, headers: { Prefer: 'return=representation' }, body: { ...input, email: input.email.trim().toLowerCase(), status: 'pending', submitted_by_profile_id: session?.user.id || null } })); }

export type JournalCommentStatus = 'pending' | 'approved' | 'rejected' | 'spam';
export type SharePlatform = 'native' | 'copy_link' | 'x' | 'facebook' | 'linkedin' | 'whatsapp' | 'telegram' | 'email' | 'other';
export type JournalComment = { id: string; journal_post_id: string; parent_comment_id?: string | null; user_id?: string | null; display_name: string; email?: string | null; body: string; status: JournalCommentStatus; is_pinned: boolean; created_at: string; journal_posts?: Pick<JournalPost, 'id' | 'slug' | 'title'> | null };
export type NewJournalComment = { journal_post_id: string; parent_comment_id?: string | null; display_name: string; email?: string; body: string };
export const sharePlatforms: SharePlatform[] = ['native','copy_link','x','facebook','linkedin','whatsapp','telegram','email'];
const commentSelect = 'id,journal_post_id,parent_comment_id,display_name,body,status,is_pinned,created_at';
const adminCommentSelect = 'id,journal_post_id,parent_comment_id,user_id,display_name,email,body,status,is_pinned,created_at,journal_posts(id,slug,title)';
const enc = encodeURIComponent;
export function canonicalJournalPostUrl(slug: string, origin = window.location.origin, basePath = '/journal') { return `${origin.replace(/\/$/,'')}${basePath.replace(/\/$/,'')}/${enc(slug)}`; }
export function buildShareUrl(platform: Exclude<SharePlatform, 'native' | 'copy_link' | 'other'>, url: string, title: string) { const u=enc(url), t=enc(title); const map={ x:`https://twitter.com/intent/tweet?url=${u}&text=${t}`, facebook:`https://www.facebook.com/sharer/sharer.php?u=${u}`, linkedin:`https://www.linkedin.com/sharing/share-offsite/?url=${u}`, whatsapp:`https://wa.me/?text=${t}%20${u}`, telegram:`https://t.me/share/url?url=${u}&text=${t}`, email:`mailto:?subject=${t}&body=${u}` }; return map[platform]; }
export function orderApprovedComments(comments: JournalComment[]) { return [...comments].sort((a,b)=>Number(b.is_pinned)-Number(a.is_pinned) || Date.parse(a.created_at)-Date.parse(b.created_at)); }
export function validateCommentInput(input: NewJournalComment) { const display_name=input.display_name.trim(); const email=(input.email || '').trim().toLowerCase(); const body=input.body.trim(); if(!display_name) throw new Error('Display name is required.'); if(!body) throw new Error('Comment body is required.'); if(email && !/^\S+@\S+\.\S+$/.test(email)) throw new Error('Enter a valid email address or leave email blank.'); return { journal_post_id: input.journal_post_id, parent_comment_id: input.parent_comment_id || null, display_name, email: email || null, body, status: 'pending' as const, is_pinned: false };
}
export async function getApprovedComments(journal_post_id: string) { const rows = await readJson<JournalComment[]>(supabase.from('journal_comments').request({ query: `select=${commentSelect}&journal_post_id=eq.${enc(journal_post_id)}&status=eq.approved&order=is_pinned.desc,created_at.asc` })); return orderApprovedComments(rows); }
export async function submitJournalComment(input: NewJournalComment, session?: SupabaseSession | null) { const body=validateCommentInput(input); await readJson(supabase.from('journal_comments').request({ method:'POST', accessToken:session?.access_token, headers:{ Prefer:'return=representation' }, body: { ...body, user_id: session?.user.id || null } })); }
export async function recordJournalShare(journal_post_id: string, platform: SharePlatform) { try { await supabase.from('journal_social_shares').request({ method:'POST', body:{ journal_post_id, platform } }); } catch (error) { logJournalError(error, 'share tracking failed'); } }
export async function getAdminJournalComments(status: JournalCommentStatus | 'all', session: SupabaseSession) { const statusFilter=status==='all'?'':`&status=eq.${enc(status)}`; return readJson<JournalComment[]>(supabase.from('journal_comments').request({ query:`select=${adminCommentSelect}${statusFilter}&order=created_at.desc`, accessToken:session.access_token })); }
export async function updateJournalCommentModeration(id: string, patch: Partial<Pick<JournalComment,'status'|'is_pinned'>>, session: SupabaseSession) { await readJson(supabase.from('journal_comments').request({ method:'PATCH', query:`id=eq.${enc(id)}`, accessToken:session.access_token, headers:{ Prefer:'return=representation' }, body:patch })); }