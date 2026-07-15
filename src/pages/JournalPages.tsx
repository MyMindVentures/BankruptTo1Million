import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Check,
  Copy,
  ExternalLink,
  Facebook,
  Linkedin,
  Mail,
  MessageCircle,
  Pin,
  Send,
  Share2,
  ShieldCheck,
} from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { AceternityContentCard } from '../components/AceternityContentCard';
import { JournalDonationsBlock } from '../components/journal/JournalDonationsBlock';
import { SectionHeading } from '../components/SectionHeading';
import {
  buildShareUrl,
  canonicalJournalPostUrl,
  filterPosts,
  formatAuthorByline,
  getAdminJournalComments,
  getApprovedComments,
  getJournalIndex,
  getJournalPost,
  getPostAuthors,
  getSafeJournalErrorMessage,
  logJournalError,
  recordJournalShare,
  sanitizeMarkdown,
  submitJournalComment,
  submitStory,
  subscribeToJournal,
  updateJournalCommentModeration,
  type JournalAuthor,
  type JournalComment,
  type JournalCommentStatus,
  type JournalIndexData,
  type PublicJournalPost,
  type SharePlatform,
} from '../lib/journal';
import { supabase } from '../lib/supabase';

type JournalLoadStatus = 'loading' | 'ready' | 'error';
type JournalSort = 'newest' | 'updated' | 'short' | 'long';

function isJournalAdminSession(session: NonNullable<ReturnType<typeof supabase.auth.getSession>>) {
  const email = session.user.email || '';
  return email.endsWith('@bankruptto1million.com') || email.endsWith('@mymindventures.com');
}

function fmt(value?: string) {
  return value
    ? new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(value))
    : 'Unpublished';
}

function authorHref(author: JournalAuthor) {
  return author.website_url || author.github_url || `/journal/author/${author.slug}`;
}

function Meta({ post }: { post: PublicJournalPost }) {
  const byline = formatAuthorByline(post);
  return (
    <div className="journal-meta">
      <span>{post.journal_categories?.name || 'Journal'}</span>
      {byline ? <span>{byline}</span> : null}
      <time dateTime={post.published_at}>{fmt(post.published_at)}</time>
      <span>{post.reading_time_minutes || 4} min read</span>
    </div>
  );
}

function CardDate({ post }: { post: PublicJournalPost }) {
  return (
    <time className="journal-card__date" dateTime={post.published_at}>
      {fmt(post.published_at)}
    </time>
  );
}

function AuthorList({ post }: { post: PublicJournalPost }) {
  const authors = getPostAuthors(post);
  if (!authors.length) return null;

  return (
    <div className="journal-authors" aria-label="Journal authors">
      {authors.map((author) => (
        <a className="journal-author" href={authorHref(author)} key={author.id}>
          <img src={author.avatar_url || '/og-image.png'} alt="" />
          <span>
            <strong>{author.display_name}</strong>
            {author.role ? <small>{author.role}</small> : null}
          </span>
        </a>
      ))}
    </div>
  );
}

function updateMeta(title: string, description: string, image?: string) {
  document.title = title;
  const set = (name: string, content: string, property = false) => {
    let el = document.head.querySelector(
      property ? `meta[property="${name}"]` : `meta[name="${name}"]`,
    ) as HTMLMetaElement | null;

    if (!el) {
      el = document.createElement('meta');
      if (property) el.setAttribute('property', name);
      else el.setAttribute('name', name);
      document.head.appendChild(el);
    }

    el.content = content;
  };

  set('description', description);
  set('og:title', title, true);
  set('og:description', description, true);
  if (image) set('og:image', image, true);
}

function JournalHero({ publishedCount }: { publishedCount: number }) {
  return (
    <section className="hero journal-hero section-grid">
      <div>
        <p className="eyebrow">The Journal</p>
        <h1>Stories, visions and lessons from the road to one million.</h1>
        <p className="hero__lede">
          The living editorial heart of Bankrupt to 1 Million. Follow the mission, the ventures,
          the setbacks, the lessons and the people helping shape the journey while it is still
          unfolding.
        </p>
        <div className="hero__actions">
          <a className="button" href="#latest">
            Explore the latest story <ArrowRight size={18} />
          </a>
          <a className="button button--ghost" href="#newsletter">
            Follow the journey
          </a>
          <a className="button button--ghost" href="#submit-story">
            Submit your story
          </a>
        </div>
      </div>
      <aside className="hero-card">
        <BookOpen />
        <blockquote>{publishedCount} published stories</blockquote>
        <p>
          Real public posts loaded from Supabase. Drafts, scheduled posts and archived content stay
          private.
        </p>
      </aside>
    </section>
  );
}

function JournalStatusSection({ status, error }: { status: JournalLoadStatus; error: string }) {
  if (status === 'loading') {
    return (
      <section className="section">
        <div className="impact-state">Loading Journal from Supabase…</div>
      </section>
    );
  }

  if (status === 'error') {
    return (
      <section className="section">
        <div className="impact-state impact-state--error">{error}</div>
      </section>
    );
  }

  return null;
}

function ArticleFeature({ post }: { post: PublicJournalPost }) {
  return (
    <article className="journal-feature">
      <CardDate post={post} />
      <h2>{post.displayTitle}</h2>
      <p>{post.displaySubtitle || post.displayExcerpt}</p>
      <a className="button" href={`/journal/${post.slug}`}>
        Read story
      </a>
    </article>
  );
}

function JournalFeaturedSection({ featured }: { featured?: PublicJournalPost }) {
  return (
    <section className="section" aria-labelledby="featured-title">
      <SectionHeading eyebrow="Featured publication" title="Start with the clearest signal." titleId="featured-title">
        {featured
          ? 'A selected published story from Supabase.'
          : 'No featured article is published yet. The Journal will feature one as soon as editors mark it ready.'}
      </SectionHeading>
      {featured ? <ArticleFeature post={featured} /> : <div className="impact-state">No featured publication is available.</div>}
    </section>
  );
}

function ArticleCard({ post }: { post: PublicJournalPost }) {
  const authors = getPostAuthors(post);
  const primaryAuthor = authors[0];

  return (
    <AceternityContentCard
      href={`/journal/${post.slug}`}
      title={post.displayTitle}
      description={post.displayExcerpt || post.displaySubtitle}
      authorName={primaryAuthor?.display_name || 'Bankrupt to 1 Million'}
      avatarSrc={primaryAuthor?.avatar_url || '/og-image.png'}
      imageSrc={post.cover_image_url || undefined}
      imageAlt={post.cover_image_alt || post.displayTitle}
      readTime={`${post.reading_time_minutes || 4} min read`}
      category={post.journal_categories?.name || 'Journal'}
      publishedDate={post.published_at}
    >
      {fmt(post.published_at)}
    </AceternityContentCard>
  );
}

function JournalFilterToolbar({ search, sort, onSearchChange, onSortChange, onReset }: {
  search: string;
  sort: JournalSort;
  onSearchChange: (value: string) => void;
  onSortChange: (value: JournalSort) => void;
  onReset: () => void;
}) {
  return (
    <div className="journal-toolbar">
      <label>
        Search stories
        <input value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="Title, tag or venture" />
      </label>
      <label>
        Sort
        <select value={sort} onChange={(event) => onSortChange(event.target.value as JournalSort)}>
          <option value="newest">Newest</option>
          <option value="updated">Recently updated</option>
          <option value="short">Shortest reading time</option>
          <option value="long">Longest reading time</option>
        </select>
      </label>
      <button className="button button--ghost button--small" onClick={onReset} type="button">Reset</button>
    </div>
  );
}

function JournalCategoryChips({ data, category, onCategoryChange }: {
  data: JournalIndexData;
  category: string;
  onCategoryChange: (value: string) => void;
}) {
  const chips = [{ slug: 'all', name: 'All' }, ...data.categories];

  return (
    <div className="chip-group" role="group" aria-label="Journal categories">
      {chips.map((chip) => {
        const count = chip.slug === 'all'
          ? data.posts.length
          : data.posts.filter((post) => post.journal_categories?.slug === chip.slug).length;

        return (
          <button
            key={chip.slug}
            className={`chip ${category === chip.slug ? 'chip--active' : ''}`}
            onClick={() => onCategoryChange(chip.slug)}
            type="button"
          >
            {chip.name} <span>({count})</span>
          </button>
        );
      })}
    </div>
  );
}

function JournalPostResults({ allPosts, filteredPosts }: {
  allPosts: PublicJournalPost[];
  filteredPosts: PublicJournalPost[];
}) {
  if (!allPosts.length) {
    return (
      <div className="impact-state">
        <strong>The first stories are being prepared.</strong>
        <br />
        Follow the journey and return soon for new mission updates, visions and founder stories.
      </div>
    );
  }

  if (!filteredPosts.length) return <div className="impact-state">No published stories match these filters.</div>;

  return <div className="journal-grid">{filteredPosts.map((post) => <ArticleCard post={post} key={post.id} />)}</div>;
}

function JournalLatestSection({ data, posts, category, search, sort, onCategoryChange, onSearchChange, onSortChange, onReset }: {
  data: JournalIndexData;
  posts: PublicJournalPost[];
  category: string;
  search: string;
  sort: JournalSort;
  onCategoryChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  onSortChange: (value: JournalSort) => void;
  onReset: () => void;
}) {
  return (
    <section className="section" id="latest" aria-labelledby="latest-title">
      <SectionHeading eyebrow="Latest publications" title="Read what is unfolding." titleId="latest-title">
        Filter by real public categories and search only published Supabase content.
      </SectionHeading>
      <JournalFilterToolbar search={search} sort={sort} onSearchChange={onSearchChange} onSortChange={onSortChange} onReset={onReset} />
      <JournalCategoryChips data={data} category={category} onCategoryChange={onCategoryChange} />
      <JournalPostResults allPosts={data.posts} filteredPosts={posts} />
    </section>
  );
}

function JournalVisionsSection({ posts }: { posts: PublicJournalPost[] }) {
  return (
    <section className="section journal-visions">
      <SectionHeading eyebrow="Evolving visions" title="Strategic pieces that stay visible." titleId="visions-title">
        {posts.length ? 'Vision features selected by editors.' : 'No published vision features yet.'}
      </SectionHeading>
      <div className="journal-grid">{posts.map((post) => <ArticleCard post={post} key={post.id} />)}</div>
    </section>
  );
}

function JournalVenturesSection({ groups }: { groups: JournalIndexData['ventureGroups'] }) {
  return (
    <section className="section">
      <SectionHeading eyebrow="Venture stories" title="Where ideas connect to ventures." titleId="ventures-title">
        Only real venture links from Supabase are shown.
      </SectionHeading>
      {groups.length ? groups.map((group) => (
        <article className="story-panel journal-venture" key={group.slug}>
          <h3>{group.name}</h3>
          <p>{group.posts.length} related published story/stories.</p>
          <div className="journal-grid">{group.posts.slice(0, 3).map((post) => <ArticleCard post={post} key={post.id} />)}</div>
        </article>
      )) : <div className="impact-state">No published venture-linked stories yet.</div>}
    </section>
  );
}

function JournalTimelineSection({ posts }: { posts: PublicJournalPost[] }) {
  return (
    <section className="section">
      <SectionHeading eyebrow="Journey timeline" title="A chronological foundation." titleId="timeline-title">
        For now this timeline uses real published Journal posts; it can later accept milestones, completed issues, contributors and venture launches.
      </SectionHeading>
      <ol className="journal-timeline">
        {posts.map((post) => (
          <li key={post.id}>
            <CalendarDays size={18} />
            <time dateTime={post.published_at}>{fmt(post.published_at)}</time>
            <a href={`/journal/${post.slug}`}>{post.displayTitle}</a>
          </li>
        ))}
      </ol>
    </section>
  );
}

function JournalStorySections({ data }: { data: JournalIndexData }) {
  return (
    <>
      <JournalVisionsSection posts={data.visions} />
      <JournalVenturesSection groups={data.ventureGroups} />
      <JournalTimelineSection posts={data.posts} />
    </>
  );
}

export function JournalPage() {
  const [data, setData] = useState<JournalIndexData | null>(null);
  const [status, setStatus] = useState<JournalLoadStatus>('loading');
  const [error, setError] = useState('');
  const params = new URLSearchParams(location.search);
  const [category, setCategory] = useState(params.get('category') || 'all');
  const [search, setSearch] = useState(params.get('q') || '');
  const [sort, setSort] = useState<JournalSort>((params.get('sort') as JournalSort) || 'newest');

  useEffect(() => {
    updateMeta('The Journal | Bankrupt to 1 Million', 'Stories, visions and lessons from the road to one million.');
    getJournalIndex()
      .then((journalData) => { setData(journalData); setStatus('ready'); })
      .catch((loadError: Error) => {
        logJournalError(loadError, 'index load failed');
        setError(getSafeJournalErrorMessage());
        setStatus('error');
      });
  }, []);

  useEffect(() => {
    const nextParams = new URLSearchParams();
    if (category !== 'all') nextParams.set('category', category);
    if (search) nextParams.set('q', search);
    if (sort !== 'newest') nextParams.set('sort', sort);
    history.replaceState(null, '', `/journal${nextParams.toString() ? `?${nextParams}` : ''}`);
  }, [category, search, sort]);

  const posts = useMemo(() => filterPosts(data?.posts || [], { category, search, sort }), [data, category, search, sort]);
  const resetFilters = () => { setCategory('all'); setSearch(''); setSort('newest'); };

  return (
    <main className="journal-page">
      <JournalHero publishedCount={data?.posts.length || 0} />
      <JournalStatusSection status={status} error={error} />
      {status === 'ready' && data ? (
        <>
          <JournalFeaturedSection featured={data.featured} />
          <JournalLatestSection
            data={data}
            posts={posts}
            category={category}
            search={search}
            sort={sort}
            onCategoryChange={setCategory}
            onSearchChange={setSearch}
            onSortChange={setSort}
            onReset={resetFilters}
          />
          <JournalStorySections data={data} />
          <NewsletterForm />
          <StorySubmissionForm />
        </>
      ) : null}
    </main>
  );
}

function NewsletterForm() {
  const [email, setEmail] = useState('');
  const [lang, setLang] = useState('en');
  const [state, setState] = useState('idle');
  const [msg, setMsg] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    setState('loading');
    setMsg('');
    try {
      const result = await subscribeToJournal(email, lang);
      setState('success');
      setMsg(result.duplicate ? 'You are already subscribed with this email.' : 'You are subscribed. Thank you for following the journey.');
    } catch (submitError) {
      setState('error');
      setMsg((submitError as Error).message);
    }
  }

  return (
    <section className="section" id="newsletter">
      <form className="application-form journal-form" onSubmit={submit}>
        <h2>Follow the journey while it is still being written.</h2>
        <label>Email address<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
        <label>Preferred language<select value={lang} onChange={(event) => setLang(event.target.value)}><option value="en">English</option><option value="nl">Nederlands</option><option value="fr">Français</option></select></label>
        <div className={`form-status ${state === 'error' ? 'impact-state--error' : ''}`} role="status">
          {state === 'loading' ? 'Saving subscription…' : msg || 'Your email is stored securely in Supabase with a consent timestamp.'}
        </div>
        <button className="button" disabled={state === 'loading'}>Subscribe</button>
      </form>
    </section>
  );
}

function StorySubmissionForm() {
  const session = supabase.auth.getSession();
  const [form, setForm] = useState({ name: '', email: session?.user.email || '', submission_type: 'contributor_story', title: '', summary: '', body: '', consent_to_contact: false, consent_to_publish: false });
  const [state, setState] = useState('idle');
  const [msg, setMsg] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    setState('loading');
    try {
      await submitStory(form, session);
      setState('success');
      setMsg('Story proposal saved as pending for moderation.');
    } catch (submitError) {
      setState('error');
      setMsg((submitError as Error).message);
    }
  }

  return (
    <section className="section" id="submit-story">
      <form className="application-form journal-form" onSubmit={submit}>
        <h2>Submit your story.</h2>
        <div className="form-grid">
          <label>Name<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
          <label>Email<input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
        </div>
        <label>Submission type<select value={form.submission_type} onChange={(event) => setForm({ ...form, submission_type: event.target.value })}><option value="contributor_story">Contributor story</option><option value="guest_article">Guest article</option><option value="rebuilding_story">Rebuilding story</option><option value="technical_lesson">Technical lesson</option><option value="mission_vision">Mission-aligned vision</option></select></label>
        <label>Title<input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label>
        <label>Summary<textarea required value={form.summary} onChange={(event) => setForm({ ...form, summary: event.target.value })} /></label>
        <label>Body<textarea required value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} /></label>
        <label><input type="checkbox" checked={form.consent_to_contact} onChange={(event) => setForm({ ...form, consent_to_contact: event.target.checked })} /> Editors may contact me about moderation.</label>
        <label><input type="checkbox" checked={form.consent_to_publish} onChange={(event) => setForm({ ...form, consent_to_publish: event.target.checked })} /> I consent to publication if accepted later.</label>
        <div className={`form-status ${state === 'error' ? 'impact-state--error' : ''}`} role="status">{state === 'loading' ? 'Saving proposal…' : msg || 'Submissions are moderated and never publish automatically.'}</div>
        <button className="button" disabled={state === 'loading'}><Send size={18} /> Submit for moderation</button>
      </form>
    </section>
  );
}

export function ShareBlock({ post, basePath = '/journal' }: { post: PublicJournalPost; basePath?: string }) {
  const [copied, setCopied] = useState(false);
  const url = canonicalJournalPostUrl(post.slug, window.location.origin, basePath);
  const title = post.displayTitle;
  async function track(platform: SharePlatform) { void recordJournalShare(post.id, platform); }
  async function nativeShare() { if (navigator.share) { track('native'); try { await navigator.share({ title, url, text: title }); } catch { return; } } }
  async function copy() { try { await navigator.clipboard.writeText(url); setCopied(true); track('copy_link'); window.setTimeout(() => setCopied(false), 2200); } catch { setCopied(false); } }
  const links: [Exclude<SharePlatform, 'native' | 'copy_link' | 'other'>, string, typeof Share2][] = [['x', 'X', Share2], ['facebook', 'Facebook', Facebook], ['linkedin', 'LinkedIn', Linkedin], ['whatsapp', 'WhatsApp', MessageCircle], ['telegram', 'Telegram', Send], ['email', 'Email', Mail]];
  return <section className="section journal-share" aria-labelledby="share-story-title"><div className="story-panel"><p className="eyebrow">Share this story</p><h2 id="share-story-title">Help this story reach the right reader.</h2><div className="share-actions">{typeof navigator.share === 'function' ? <button className="button" onClick={nativeShare} type="button"><Share2 size={18} /> Native share</button> : null}<button className="button button--ghost" onClick={copy} type="button" aria-live="polite">{copied ? <Check size={18} /> : <Copy size={18} />} {copied ? 'Link copied' : 'Copy link'}</button>{links.map(([platform, label, Icon]) => <a className="button button--ghost" key={platform} href={buildShareUrl(platform, url, title)} target={platform === 'email' ? undefined : '_blank'} rel="noopener noreferrer" onClick={() => track(platform)} aria-label={`Share on ${label}`}><Icon size={18} />{label}</a>)}</div>{copied ? <p className="form-status" role="status">Copied the canonical story link.</p> : null}</div></section>;
}

function CommentForm({ post, parent, onDone, onCancel }: { post: PublicJournalPost; parent?: JournalComment; onDone: () => void; onCancel?: () => void }) {
  const [form, setForm] = useState({ display_name: '', email: '', body: '' });
  const [state, setState] = useState('idle');
  const [msg, setMsg] = useState('');
  async function submit(event: FormEvent) { event.preventDefault(); setState('loading'); setMsg(''); try { await submitJournalComment({ journal_post_id: post.id, parent_comment_id: parent?.id, ...form }, supabase.auth.getSession()); setForm({ display_name: '', email: '', body: '' }); setState('success'); setMsg('Thank you. Your comment will appear after approval.'); onDone(); } catch (submitError) { setState('error'); setMsg((submitError as Error).message); } }
  return <form className="application-form journal-form comment-form" onSubmit={submit}><h3>{parent ? `Reply to ${parent.display_name}` : 'Join the conversation'}</h3><div className="form-grid"><label>Display name<input required value={form.display_name} onChange={(event) => setForm({ ...form, display_name: event.target.value })} /></label><label>Email <span className="optional-label">optional, never public</span><input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label></div><label>Comment<textarea required value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} /></label><div className={`form-status ${state === 'error' ? 'impact-state--error' : ''}`} role="status">{state === 'loading' ? 'Submitting for moderation…' : msg || 'Comments are reviewed before they appear publicly.'}</div><div className="hero__actions"><button className="button" disabled={state === 'loading'} type="submit"><Send size={18} /> Submit comment</button>{onCancel ? <button className="button button--ghost" type="button" onClick={onCancel}>Cancel reply</button> : null}</div></form>;
}

export function CommentsBlock({ post }: { post: PublicJournalPost }) {
  const [comments, setComments] = useState<JournalComment[]>([]);
  const [state, setState] = useState('loading');
  const [error, setError] = useState('');
  const [reply, setReply] = useState<JournalComment | null>(null);
  const load = () => getApprovedComments(post.id).then((rows) => { setComments(rows); setState('ready'); }).catch((loadError) => { setError((loadError as Error).message); setState('error'); });
  useEffect(() => { load(); }, [post.id]);
  const top = comments.filter((comment) => !comment.parent_comment_id);
  const replies = (id: string) => comments.filter((comment) => comment.parent_comment_id === id);
  return <section className="section journal-comments" aria-labelledby="comments-title"><div className="story-panel"><p className="eyebrow">Conversation</p><h2 id="comments-title">Comments</h2>{state === 'loading' ? <div className="impact-state">Loading approved comments…</div> : null}{state === 'error' ? <div className="impact-state impact-state--error">{error}</div> : null}{state === 'ready' && !comments.length ? <div className="impact-state">No approved comments yet. Be the first to respond.</div> : null}<div className="comment-list">{top.map((comment) => <article className={`comment-card ${comment.is_pinned ? 'comment-card--pinned' : ''}`} key={comment.id}>{comment.is_pinned ? <span className="status-badge"><Pin size={14} /> Pinned</span> : null}<h3>{comment.display_name}</h3><time dateTime={comment.created_at}>{fmt(comment.created_at)}</time><p>{comment.body}</p><button className="button button--ghost button--small" type="button" onClick={() => setReply(comment)}>Reply</button>{replies(comment.id).map((child) => <article className="comment-card comment-card--reply" key={child.id}><h4>{child.display_name}</h4><time dateTime={child.created_at}>{fmt(child.created_at)}</time><p>{child.body}</p></article>)}</article>)}</div>{reply ? <CommentForm post={post} parent={reply} onDone={() => { setReply(null); load(); }} onCancel={() => setReply(null)} /> : <CommentForm post={post} onDone={load} />}</div></section>;
}

export function AdminJournalCommentsPage() {
  const session = supabase.auth.getSession();
  if (!session) return <main className="section"><h1>Admin sign in required.</h1><a className="button" href="/profile">Sign in</a></main>;
  if (!isJournalAdminSession(session)) return <main className="section"><div className="impact-state impact-state--error">Administrator access is required.</div></main>;
  return <AdminComments session={session} />;
}

function AdminComments({ session }: { session: NonNullable<ReturnType<typeof supabase.auth.getSession>> }) {
  const [status, setStatus] = useState<JournalCommentStatus | 'all'>('pending');
  const [rows, setRows] = useState<JournalComment[]>([]);
  const [state, setState] = useState('loading');
  const [error, setError] = useState('');
  const load = () => getAdminJournalComments(status, session).then((comments) => { setRows(comments); setState('ready'); }).catch((loadError) => { setError((loadError as Error).message); setState('error'); });
  useEffect(() => { load(); }, [status]);
  async function act(id: string, patch: Partial<Pick<JournalComment, 'status' | 'is_pinned'>>) { await updateJournalCommentModeration(id, patch, session); load(); }
  return <main className="section admin-page"><nav className="admin-nav"><a href="/admin/journal/comments">Journal comments</a><a href="/admin/break-the-circle">Break the Circle</a></nav><div className="admin-heading"><div><p className="eyebrow">Admin</p><h1>Moderate Journal comments.</h1><p>Review commenter details, related posts and moderation status before comments appear publicly.</p></div><ShieldCheck /></div><div className="journal-toolbar"><label>Status<select value={status} onChange={(event) => setStatus(event.target.value as JournalCommentStatus | 'all')}>{['pending', 'approved', 'rejected', 'spam', 'all'].map((option) => <option key={option}>{option}</option>)}</select></label></div>{state === 'loading' ? <div className="impact-state">Loading comments…</div> : null}{state === 'error' ? <div className="impact-state impact-state--error">{error}</div> : null}{state === 'ready' && !rows.length ? <div className="impact-state">No comments match this filter.</div> : null}<div className="admin-table">{rows.map((comment) => <article className="admin-row" key={comment.id}><div><h2>{comment.display_name}</h2><p>{comment.body}</p><div className="journal-meta"><span>{comment.status}</span><span>{comment.journal_posts?.title || comment.journal_post_id}</span>{comment.email ? <span>{comment.email}</span> : null}<time dateTime={comment.created_at}>{fmt(comment.created_at)}</time><span>{comment.is_pinned ? 'Pinned' : 'Not pinned'}</span></div></div><div className="admin-actions"><button className="button button--small" onClick={() => act(comment.id, { status: 'approved' })}>Approve</button><button className="button button--ghost button--small" onClick={() => act(comment.id, { status: 'rejected' })}>Reject</button><button className="button button--ghost button--small" onClick={() => act(comment.id, { status: 'spam' })}>Spam</button><button className="button button--ghost button--small" onClick={() => act(comment.id, { is_pinned: !comment.is_pinned })}>{comment.is_pinned ? 'Unpin' : 'Pin'}</button></div></article>)}</div></main>;
}

export function JournalArticlePage({ slug }: { slug: string }) {
  const [post, setPost] = useState<PublicJournalPost | null>(null);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  useEffect(() => { getJournalPost(slug).then((journalPost) => { setPost(journalPost); setStatus('ready'); if (journalPost) updateMeta(`${journalPost.seo_title || journalPost.displayTitle} | The Journal`, journalPost.seo_description || journalPost.displayExcerpt || 'A Journal story from Bankrupt to 1 Million.', journalPost.og_image_url || journalPost.cover_image_url); }).catch((loadError: Error) => { logJournalError(loadError, 'article load failed'); setError(getSafeJournalErrorMessage()); setStatus('error'); }); }, [slug]);
  if (status === 'loading') return <main className="section"><div className="impact-state">Loading article…</div></main>;
  if (status === 'error' || !post) return <main className="section"><div className="impact-state impact-state--error">{error || 'Article not found or not public.'}</div><a className="button" href="/journal">Back to The Journal</a></main>;
  const issues = post.journal_post_issues?.map((row) => row.github_issues).filter(Boolean) || [];
  return <main className="journal-article"><article className="section"><header className="journal-article__header"><p className="eyebrow">{post.journal_categories?.name || 'The Journal'}</p><h1>{post.displayTitle}</h1><p className="hero__lede">{post.displaySubtitle}</p><Meta post={post} /><AuthorList post={post} /><p>Last updated <time dateTime={post.updated_at}>{fmt(post.updated_at)}</time></p>{post.availableLanguages.length > 1 ? <p>Available languages: {post.availableLanguages.join(', ')}</p> : null}</header><div className="markdown-body journal-body" dangerouslySetInnerHTML={{ __html: sanitizeMarkdown(post.displayBody) }} /></article><ShareBlock post={post} /><JournalDonationsBlock post={post} /><CommentsBlock post={post} /><section className="section journal-related"><h2>Connections</h2>{post.journal_post_ventures?.map((venture) => <p key={venture.venture_slug}><strong>Related venture:</strong> {venture.venture_name}</p>)}{getPostAuthors(post).length ? <div><h3>Authors</h3><AuthorList post={post} /></div> : null}{issues.length ? <div><h3>Related GitHub issues</h3>{issues.map((issue) => <a className="journal-issue-link" key={issue!.id} href={`/issues/${issue!.issue_number}`}><span>#{issue!.issue_number} {issue!.display_title || issue!.title}</span><small>{issue!.state} · {issue!.issue_type || 'Issue'}</small><ExternalLink size={16} /></a>)}</div> : null}<div className="hero__actions"><a className="button" href="/journal">Previous / next publications</a><a className="button button--ghost" href="#newsletter">Share and follow the journey</a></div></section><NewsletterForm /></main>;
}
