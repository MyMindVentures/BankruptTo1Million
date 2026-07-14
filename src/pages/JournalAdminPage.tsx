import { FormEvent, useEffect, useMemo, useState } from 'react';
import { CalendarClock, Edit3, ExternalLink, FilePlus2, LoaderCircle, RefreshCw, Search, Trash2, X } from 'lucide-react';
import {
  createJournalPost,
  deleteJournalPost,
  getJournalOptions,
  listJournalPosts,
  updateJournalPost,
  type JournalOption,
  type JournalPayload,
  type JournalPost,
} from '../lib/journalAdminApi';

const emptyForm: Partial<JournalPayload> = {
  title: '', slug: '', status: 'draft', subtitle: '', excerpt: '', body: '', content_format: 'markdown',
  cover_image_url: '', cover_image_alt: '', original_language: 'en', category_id: '', primary_creator_id: '',
  is_featured: false, is_vision_feature: false, published_at: null, scheduled_for: null,
  reading_time_minutes: null, seo_title: '', seo_description: '', publication_timezone: 'Europe/Madrid',
};

function toLocalInput(value: string | null | undefined) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
}

export function JournalAdminPage() {
  const [posts, setPosts] = useState<JournalPost[]>([]);
  const [categories, setCategories] = useState<JournalOption[]>([]);
  const [authors, setAuthors] = useState<JournalOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<JournalPayload>>(emptyForm);

  async function load() {
    setLoading(true); setError(null);
    try {
      const [rows, options] = await Promise.all([listJournalPosts(), getJournalOptions()]);
      setPosts(rows); setCategories(options.categories); setAuthors(options.authors);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Journaldata kon niet worden geladen.');
    } finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => posts.filter((post) => {
    const matchesQuery = `${post.title} ${post.slug} ${post.excerpt || ''}`.toLowerCase().includes(query.toLowerCase());
    const matchesStatus = status === 'all' || post.status === status;
    return matchesQuery && matchesStatus;
  }), [posts, query, status]);

  function openCreate() {
    setEditingId(null); setForm(emptyForm); setEditorOpen(true); setError(null);
  }

  function openEdit(post: JournalPost) {
    setEditingId(post.id);
    setForm({ ...post });
    setEditorOpen(true); setError(null);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true); setError(null);
    const payload = {
      ...form,
      category_id: form.category_id || '',
      primary_creator_id: form.primary_creator_id || '',
      scheduled_for: form.status === 'scheduled' && form.scheduled_for ? new Date(form.scheduled_for).toISOString() : '',
      published_at: form.status === 'published' && form.published_at ? new Date(form.published_at).toISOString() : '',
      reading_time_minutes: form.reading_time_minutes ? Number(form.reading_time_minutes) : null,
    };
    try {
      if (editingId) await updateJournalPost(editingId, payload);
      else await createJournalPost(payload);
      setEditorOpen(false);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Opslaan mislukt.');
    } finally { setSaving(false); }
  }

  async function remove(post: JournalPost) {
    if (!window.confirm(`Verwijder “${post.title}” definitief?`)) return;
    setError(null);
    try { await deleteJournalPost(post.id); await load(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Verwijderen mislukt.'); }
  }

  const counts = {
    all: posts.length,
    draft: posts.filter((p) => p.status === 'draft').length,
    scheduled: posts.filter((p) => p.status === 'scheduled').length,
    published: posts.filter((p) => p.status === 'published').length,
    archived: posts.filter((p) => p.status === 'archived').length,
  };

  return <div className="journal-admin-page">
    <div className="journal-admin-heading">
      <div><p>CONTENT MANAGEMENT</p><h1>Journal posts</h1><span>Maak, bewerk, plan, publiceer en verwijder journalposts.</span></div>
      <div><button onClick={() => void load()}><RefreshCw size={16} />Vernieuwen</button><button className="primary" onClick={openCreate}><FilePlus2 size={17} />Nieuwe post</button></div>
    </div>

    <div className="journal-admin-stats">{Object.entries(counts).map(([key, value]) => <button key={key} className={status === key ? 'active' : ''} onClick={() => setStatus(key)}><span>{key}</span><strong>{value}</strong></button>)}</div>

    <div className="journal-admin-toolbar"><div><Search size={17} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Zoek op titel, slug of excerpt…" /></div><select value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">Alle statussen</option><option value="draft">Draft</option><option value="scheduled">Scheduled</option><option value="published">Published</option><option value="archived">Archived</option></select></div>

    {loading && <div className="admin-loading"><LoaderCircle className="spin" />Live journaldata laden…</div>}
    {error && <div className="admin-error">{error}</div>}

    {!loading && <div className="journal-admin-table"><table><thead><tr><th>Post</th><th>Status</th><th>Planning</th><th>Featured</th><th>Bijgewerkt</th><th /></tr></thead><tbody>{filtered.map((post) => <tr key={post.id}><td><strong>{post.title}</strong><span>/{post.slug}</span></td><td><span className={`journal-status ${post.status}`}>{post.status}</span></td><td>{post.status === 'scheduled' ? toLocalInput(post.scheduled_for).replace('T',' ') : post.published_at ? new Date(post.published_at).toLocaleString() : '—'}</td><td>{post.is_featured ? 'Yes' : 'No'}</td><td>{new Date(post.updated_at).toLocaleString()}</td><td><div className="journal-row-actions"><a href={`/journal/${post.slug}`} target="_blank" rel="noreferrer"><ExternalLink size={14} /></a><button onClick={() => openEdit(post)}><Edit3 size={14} /></button><button className="danger" onClick={() => void remove(post)}><Trash2 size={14} /></button></div></td></tr>)}</tbody></table></div>}

    {!loading && filtered.length === 0 && <div className="admin-section-empty">Geen journalposts gevonden.</div>}

    {editorOpen && <div className="journal-editor-backdrop"><form className="journal-editor" onSubmit={submit}><header><div><p>{editingId ? 'EDIT JOURNAL POST' : 'CREATE JOURNAL POST'}</p><h2>{editingId ? form.title || 'Untitled' : 'Nieuwe journalpost'}</h2></div><button type="button" onClick={() => setEditorOpen(false)}><X /></button></header>
      <div className="journal-editor-body">
        <section><h3>Content</h3><label>Titel<input required value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label><label>Slug<input value={form.slug || ''} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="automatisch indien leeg" /></label><label>Subtitle<input value={form.subtitle || ''} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} /></label><label>Excerpt<textarea rows={3} value={form.excerpt || ''} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} /></label><label>Body<textarea rows={16} value={form.body || ''} onChange={(e) => setForm({ ...form, body: e.target.value })} /></label></section>
        <section><h3>Publishing</h3><label>Status<select value={form.status || 'draft'} onChange={(e) => setForm({ ...form, status: e.target.value as JournalPost['status'] })}><option value="draft">Draft</option><option value="scheduled">Scheduled</option><option value="published">Published</option><option value="archived">Archived</option></select></label>{form.status === 'scheduled' && <label><CalendarClock size={14} />Scheduled for<input type="datetime-local" required value={toLocalInput(form.scheduled_for)} onChange={(e) => setForm({ ...form, scheduled_for: e.target.value })} /></label>}<label>Category<select value={form.category_id || ''} onChange={(e) => setForm({ ...form, category_id: e.target.value })}><option value="">Geen categorie</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label><label>Author<select value={form.primary_creator_id || ''} onChange={(e) => setForm({ ...form, primary_creator_id: e.target.value })}><option value="">Geen auteur</option>{authors.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label><label>Content format<select value={form.content_format || 'markdown'} onChange={(e) => setForm({ ...form, content_format: e.target.value as JournalPost['content_format'] })}><option value="markdown">Markdown</option><option value="rich_text">Rich text</option><option value="video">Video</option><option value="mixed">Mixed</option></select></label><label>Language<input value={form.original_language || 'en'} onChange={(e) => setForm({ ...form, original_language: e.target.value })} /></label><label>Reading time<input type="number" min="1" value={form.reading_time_minutes || ''} onChange={(e) => setForm({ ...form, reading_time_minutes: e.target.value ? Number(e.target.value) : null })} /></label><label className="check"><input type="checkbox" checked={Boolean(form.is_featured)} onChange={(e) => setForm({ ...form, is_featured: e.target.checked })} />Featured</label><label className="check"><input type="checkbox" checked={Boolean(form.is_vision_feature)} onChange={(e) => setForm({ ...form, is_vision_feature: e.target.checked })} />Vision feature</label></section>
        <section><h3>Media & SEO</h3><label>Cover image URL<input value={form.cover_image_url || ''} onChange={(e) => setForm({ ...form, cover_image_url: e.target.value })} /></label><label>Cover image alt<input value={form.cover_image_alt || ''} onChange={(e) => setForm({ ...form, cover_image_alt: e.target.value })} /></label><label>SEO title<input value={form.seo_title || ''} onChange={(e) => setForm({ ...form, seo_title: e.target.value })} /></label><label>SEO description<textarea rows={4} value={form.seo_description || ''} onChange={(e) => setForm({ ...form, seo_description: e.target.value })} /></label></section>
      </div>
      <footer><button type="button" onClick={() => setEditorOpen(false)}>Annuleren</button><button className="primary" disabled={saving}>{saving ? <LoaderCircle className="spin" size={16} /> : null}{editingId ? 'Wijzigingen opslaan' : 'Post aanmaken'}</button></footer>
    </form></div>}
  </div>;
}
