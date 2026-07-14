import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Edit3, ExternalLink, FilePlus2, LoaderCircle, RefreshCw, Search, Sparkles, Trash2, X } from 'lucide-react';
import { JournalEventCapture } from '../components/JournalEventCapture';
import {
  createJournalPost,
  deleteJournalPost,
  generateJournalAiPost,
  getJournalAiSource,
  getJournalEventContext,
  getJournalOptions,
  listJournalPosts,
  saveJournalAiSource,
  saveJournalEventContext,
  updateJournalPost,
  uploadJournalFootage,
  type EventTypeOption,
  type FounderOption,
  type JournalEventPayload,
  type JournalOption,
  type JournalPayload,
  type JournalPost,
  type JourneyPerson,
} from '../lib/journalAdminApi';

function localNow() {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
}

const emptyForm: Partial<JournalPayload> = {
  title: '', slug: '', status: 'draft', subtitle: '', excerpt: '', body: '', content_format: 'markdown',
  cover_image_url: '', cover_image_alt: '', original_language: 'en', category_id: '', primary_creator_id: '',
  is_featured: false, is_vision_feature: false, published_at: null, scheduled_for: null,
  reading_time_minutes: null, seo_title: '', seo_description: '', publication_timezone: 'Europe/Madrid',
};

const emptyEvent: JournalEventPayload = {
  subject_founder_ids: [], person_ids: [], event_type: 'daily_update', occurred_at: localNow(),
  timezone: 'Europe/Madrid', journey_person: 'together', location_name: '', address_text: '',
  latitude: '', longitude: '', plus_code: '', description: '', show_on_map: true,
  show_on_timeline: true, is_public_location: true,
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
  const [founders, setFounders] = useState<FounderOption[]>([]);
  const [people, setPeople] = useState<JourneyPerson[]>([]);
  const [eventTypes, setEventTypes] = useState<EventTypeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<JournalPayload>>(emptyForm);
  const [eventForm, setEventForm] = useState<JournalEventPayload>(emptyEvent);
  const [footage, setFootage] = useState<File[]>([]);
  const [saveStage, setSaveStage] = useState('');

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [rows, options] = await Promise.all([listJournalPosts(), getJournalOptions()]);
      setPosts(rows);
      setCategories(options.categories);
      setAuthors(options.authors);
      setFounders(options.founders);
      setPeople(options.people);
      setEventTypes(options.eventTypes);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Journal data could not be loaded.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    if (new URLSearchParams(window.location.search).get('create') === '1') {
      setEditingId(null);
      setForm({ ...emptyForm });
      setEventForm({ ...emptyEvent, occurred_at: localNow() });
      setFootage([]);
      setEditorOpen(true);
    }
  }, []);

  const filtered = useMemo(() => posts.filter((post) => {
    const matchesQuery = `${post.title} ${post.slug} ${post.excerpt || ''}`.toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (status === 'all' || post.status === status);
  }), [posts, query, status]);

  function openCreate() {
    setEditingId(null);
    setForm({ ...emptyForm });
    setEventForm({ ...emptyEvent, occurred_at: localNow() });
    setFootage([]);
    setEditorOpen(true);
    setError(null);
    window.history.replaceState({}, '', '/admin/journal?create=1');
  }

  async function openEdit(post: JournalPost) {
    setEditingId(post.id);
    setForm({ ...post });
    setFootage([]);
    setEditorOpen(true);
    setError(null);
    try {
      const [context, rawDescription] = await Promise.all([
        getJournalEventContext(post.id),
        getJournalAiSource(post.id),
      ]);
      setEventForm({
        ...emptyEvent,
        ...context,
        description: rawDescription,
        occurred_at: toLocalInput(context.occurred_at) || localNow(),
      });
    } catch {
      setEventForm({ ...emptyEvent, occurred_at: localNow() });
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!eventForm.description.trim()) {
      setError('Private field notes are required before AI generation.');
      return;
    }
    setSaving(true);
    setError(null);
    setSaveStage('Creating event record…');

    try {
      const placeholderTitle = editingId && form.title
        ? form.title
        : `Journal event ${new Date(eventForm.occurred_at).toLocaleString()}`;

      const basePayload = {
        ...form,
        title: placeholderTitle,
        body: editingId ? form.body || '' : '',
        excerpt: editingId ? form.excerpt || '' : '',
        status: editingId ? form.status || 'draft' : 'draft',
        published_at: editingId ? form.published_at || '' : '',
        category_id: form.category_id || '',
        primary_creator_id: form.primary_creator_id || '',
      };

      const saved = editingId
        ? await updateJournalPost(editingId, basePayload)
        : await createJournalPost(basePayload);

      setSaveStage('Saving people, location and event metadata…');
      await saveJournalEventContext(saved.id, {
        ...eventForm,
        occurred_at: new Date(eventForm.occurred_at).toISOString(),
        description: '',
      });

      setSaveStage(`Uploading ${footage.length} footage file${footage.length === 1 ? '' : 's'}…`);
      for (let index = 0; index < footage.length; index += 1) {
        await uploadJournalFootage(saved.id, footage[index], index, eventForm);
      }

      setSaveStage('Saving private notes for AI…');
      await saveJournalAiSource(saved.id, eventForm.description, {
        event_type: eventForm.event_type,
        occurred_at: new Date(eventForm.occurred_at).toISOString(),
        location_name: eventForm.location_name,
        address_text: eventForm.address_text,
        plus_code: eventForm.plus_code,
        latitude: eventForm.latitude,
        longitude: eventForm.longitude,
        subject_founder_ids: eventForm.subject_founder_ids,
        person_ids: eventForm.person_ids,
        footage: footage.map((file) => ({ name: file.name, type: file.type, size: file.size })),
      });

      setSaveStage('AI is writing and translating the public story…');
      await generateJournalAiPost(saved.id);

      setEditorOpen(false);
      setSaveStage('');
      window.history.replaceState({}, '', '/admin/journal');
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'AI publication failed. The event remains safely stored as a draft.');
    } finally {
      setSaving(false);
      setSaveStage('');
    }
  }

  async function remove(post: JournalPost) {
    if (!window.confirm(`Delete “${post.title}” permanently?`)) return;
    setError(null);
    try {
      await deleteJournalPost(post.id);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Delete failed.');
    }
  }

  const counts = {
    all: posts.length,
    draft: posts.filter((post) => post.status === 'draft').length,
    scheduled: posts.filter((post) => post.status === 'scheduled').length,
    published: posts.filter((post) => post.status === 'published').length,
    archived: posts.filter((post) => post.status === 'archived').length,
  };

  return <div className="journal-admin-page">
    <div className="journal-admin-heading">
      <div><p>CONTENT MANAGEMENT</p><h1>Journal posts</h1><span>Capture an event on location and publish an AI-polished story in 15 languages.</span></div>
      <div><button onClick={() => void load()}><RefreshCw size={16} />Refresh</button><button className="primary" onClick={openCreate}><FilePlus2 size={17} />New event</button></div>
    </div>

    <div className="journal-admin-stats">{Object.entries(counts).map(([key, value]) => <button key={key} className={status === key ? 'active' : ''} onClick={() => setStatus(key)}><span>{key}</span><strong>{value}</strong></button>)}</div>
    <div className="journal-admin-toolbar"><div><Search size={17} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by title, slug or excerpt…" /></div><select value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">All statuses</option><option value="draft">Draft</option><option value="scheduled">Scheduled</option><option value="published">Published</option><option value="archived">Archived</option></select></div>

    {loading && <div className="admin-loading"><LoaderCircle className="spin" />Loading live journal data…</div>}
    {error && <div className="admin-error">{error}</div>}

    {!loading && <div className="journal-admin-table"><table><thead><tr><th>Post</th><th>Status</th><th>AI</th><th>Published</th><th>Updated</th><th /></tr></thead><tbody>{filtered.map((post) => <tr key={post.id}><td><strong>{post.title}</strong><span>/{post.slug}</span></td><td><span className={`journal-status ${post.status}`}>{post.status}</span></td><td>{post.ai_generation_status || 'not requested'}</td><td>{post.published_at ? new Date(post.published_at).toLocaleString() : '—'}</td><td>{new Date(post.updated_at).toLocaleString()}</td><td><div className="journal-row-actions"><a href={`/journal/${post.slug}`} target="_blank" rel="noreferrer"><ExternalLink size={14} /></a><button onClick={() => void openEdit(post)}><Edit3 size={14} /></button><button className="danger" onClick={() => void remove(post)}><Trash2 size={14} /></button></div></td></tr>)}</tbody></table></div>}

    {!loading && filtered.length === 0 && <div className="admin-section-empty">No journal posts found.</div>}

    {editorOpen && <div className="journal-editor-backdrop"><form className="journal-editor journal-editor-premium" onSubmit={submit}>
      <header><div><p>{editingId ? 'EDIT AI JOURNAL EVENT' : 'CREATE LIVE AI JOURNAL EVENT'}</p><h2>{editingId ? form.title || 'Untitled event' : 'Capture once. Publish everywhere.'}</h2><span>Your quick notes stay private. Only AI-polished content becomes public.</span></div><button type="button" onClick={() => { setEditorOpen(false); window.history.replaceState({}, '', '/admin/journal'); }}><X /></button></header>

      <div className="journal-premium-layout">
        <main>
          <JournalEventCapture value={eventForm} onChange={setEventForm} founders={founders} people={people} eventTypes={eventTypes} files={footage} onFilesChange={setFootage} onPeopleRefresh={(person) => setPeople((current) => [...current, person].sort((a, b) => a.display_name.localeCompare(b.display_name)))} />

          <section className="event-panel ai-source-panel">
            <div className="event-panel-heading"><span>06</span><div><h3>Private field notes</h3><p>Write quickly in your own words. These notes are admin-only and are never shown publicly.</p></div><Sparkles size={20} /></div>
            <label>What happened?<textarea rows={8} required value={eventForm.description} onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })} placeholder="Write naturally and quickly: what happened, why it mattered, what you felt, and any detail AI should understand…" /></label>
            <div className="ai-output-notice"><Sparkles size={17} /><div><strong>AI public output</strong><span>OpenRouter generates the public title, subtitle, excerpt, full story and SEO copy in English plus 14 translations.</span></div></div>

            {editingId && form.ai_generation_status === 'completed' && <div className="ai-public-preview"><p>PUBLIC AI VERSION</p><h3>{form.title}</h3><span>{form.excerpt}</span><div>{form.body}</div></div>}
          </section>
        </main>

        <aside className="journal-publish-sidebar">
          <section><p>PUBLICATION</p><div className="instant-public-badge"><span />AI publishes when ready</div><label>Category<select value={form.category_id || ''} onChange={(e) => setForm({ ...form, category_id: e.target.value })}><option value="">No category</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label><label>Author<select value={form.primary_creator_id || ''} onChange={(e) => setForm({ ...form, primary_creator_id: e.target.value })}><option value="">No author</option>{authors.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label><label className="check"><input type="checkbox" checked={Boolean(form.is_featured)} onChange={(e) => setForm({ ...form, is_featured: e.target.checked })} />Featured story</label></section>
          <section><p>LANGUAGES</p><div className="language-chip-grid">{['EN','NL','FR','DE','ES','PT','IT','PL','CS','TR','AR','HI','ZH','JA','KO'].map((code) => <span key={code}>{code}</span>)}</div></section>
          <section><p>FOOTAGE STORAGE</p><small>Images → media-images<br />Videos → media-videos<br />Linked to Media Vault and this journal post.</small></section>
        </aside>
      </div>

      <footer><button type="button" onClick={() => { setEditorOpen(false); window.history.replaceState({}, '', '/admin/journal'); }}>Cancel</button>{saving && <span className="journal-save-stage">{saveStage}</span>}<button className="primary publish-now" disabled={saving}>{saving ? <LoaderCircle className="spin" size={16} /> : <Sparkles size={16} />}{editingId ? 'Regenerate and update public story' : 'Generate and publish in 15 languages'}</button></footer>
    </form></div>}
  </div>;
}
