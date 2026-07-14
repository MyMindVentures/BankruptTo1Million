import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock3, Filter, LoaderCircle, Mail, MapPin, RefreshCw, Search, ShieldAlert, UserRound, XCircle } from 'lucide-react';
import { getFounderSupportInbox, moderateFounderSupportMessage, type FounderSupportCounts, type FounderSupportMessage } from '../lib/founderSupportAdmin';

const statuses: FounderSupportMessage['status'][] = ['pending', 'approved', 'rejected', 'spam'];
const emptyCounts: FounderSupportCounts = { pending: 0, approved: 0, rejected: 0, spam: 0, total: 0 };

function label(value: string | null | undefined) {
  if (!value) return '—';
  return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString('nl-BE', { dateStyle: 'medium', timeStyle: 'short' });
}

export function FounderSupportAdminPage() {
  const [messages, setMessages] = useState<FounderSupportMessage[]>([]);
  const [counts, setCounts] = useState<FounderSupportCounts>(emptyCounts);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all' | FounderSupportMessage['status']>('pending');
  const [selected, setSelected] = useState<FounderSupportMessage | null>(null);
  const [notes, setNotes] = useState('');
  const [featured, setFeatured] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const inbox = await getFounderSupportInbox();
      setMessages(inbox.messages);
      setCounts(inbox.counts);
      if (selected) setSelected(inbox.messages.find((row) => row.id === selected.id) || null);
    } catch (reason) {
      setMessages([]);
      setCounts(emptyCounts);
      setError(reason instanceof Error ? reason.message : 'Supportberichten konden niet worden geladen.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => messages.filter((message) => {
    const matchesStatus = status === 'all' || message.status === status;
    const haystack = [message.sender_name, message.sender_email, message.sender_location, message.title, message.body, message.recipient_scope, message.message_type].join(' ').toLowerCase();
    return matchesStatus && haystack.includes(query.toLowerCase());
  }), [messages, query, status]);

  function open(message: FounderSupportMessage) {
    setSelected(message);
    setNotes(message.moderation_notes || '');
    setFeatured(message.is_featured);
  }

  async function moderate(nextStatus: FounderSupportMessage['status']) {
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      await moderateFounderSupportMessage({ id: selected.id, status: nextStatus, isFeatured: featured, moderationNotes: notes });
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Moderatie kon niet worden opgeslagen.');
    } finally {
      setSaving(false);
    }
  }

  return <div className="admin-section-page">
    <div className="admin-section-heading">
      <div><p>COMMUNITY MODERATION</p><h1>Support Messages</h1><span>Review visitor messages, publication consent and featured support.</span></div>
      <button onClick={() => void load()} disabled={loading}><RefreshCw size={16} /> Refresh</button>
    </div>

    <section className="admin-kpis">
      {statuses.map((item) => <article key={item} onClick={() => setStatus(item)} style={{ cursor: 'pointer' }}>
        <div className="admin-kpi-icon">{item === 'pending' ? <Clock3 /> : item === 'approved' ? <CheckCircle2 /> : item === 'rejected' ? <XCircle /> : <ShieldAlert />}</div>
        <p>{label(item)}</p><strong>{counts[item]}</strong><span>{status === item ? 'Active filter' : 'Click to filter'}</span>
      </article>)}
    </section>

    <div className="admin-section-toolbar">
      <div><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search sender, location or message..." /></div>
      <label><Filter size={15} /><select value={status} onChange={(event) => setStatus(event.target.value as typeof status)}><option value="all">All statuses</option>{statuses.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select></label>
      <span>{counts.total} total · {filtered.length} shown</span>
    </div>

    {loading && <div className="admin-loading"><LoaderCircle className="spin" /> Loading support messages…</div>}
    {error && <div className="admin-error">{error}</div>}

    {!loading && !error && <div className="admin-record-grid">
      {filtered.map((message) => <article key={message.id}>
        <div><strong>{message.is_anonymous ? 'Anonymous supporter' : message.sender_name}</strong><span>{message.title || message.body}</span></div>
        <div className="admin-record-meta">
          <p><small>Status</small><b>{label(message.status)}</b></p>
          <p><small>Recipient</small><b>{label(message.recipient_scope)}</b></p>
          <p><small>Type</small><b>{label(message.message_type)}</b></p>
          <p><small>Publish consent</small><b>{message.consent_to_publish ? 'Yes' : 'No'}</b></p>
        </div>
        <footer><button onClick={() => open(message)}>Review</button><time>{formatDate(message.created_at)}</time></footer>
      </article>)}
    </div>}

    {!loading && !error && filtered.length === 0 && <div className="admin-section-empty">No support messages found for this filter.</div>}

    {selected && <div className="admin-editor-backdrop">
      <section className="admin-editor">
        <header><div><p>REVIEW SUPPORT MESSAGE</p><h2>{selected.is_anonymous ? 'Anonymous supporter' : selected.sender_name}</h2></div><button onClick={() => setSelected(null)}><XCircle /></button></header>
        <div className="admin-editor-fields">
          <div style={{ gridColumn: '1 / -1' }}><small>Message</small><p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{selected.body}</p></div>
          <label><span><UserRound size={14} /> Sender</span><input value={selected.is_anonymous ? 'Anonymous' : selected.sender_name} readOnly /></label>
          <label><span><Mail size={14} /> Email</span><input value={selected.sender_email || '—'} readOnly /></label>
          <label><span><MapPin size={14} /> Location</span><input value={selected.sender_location || '—'} readOnly /></label>
          <label><span>Recipient</span><input value={label(selected.recipient_scope)} readOnly /></label>
          <label><span>Message type</span><input value={label(selected.message_type)} readOnly /></label>
          <label><span>Original language</span><input value={(selected.original_language || '—').toUpperCase()} readOnly /></label>
          <label><span>Consent to publish</span><input value={selected.consent_to_publish ? 'Yes' : 'No'} readOnly /></label>
          <label><span>Consent to contact</span><input value={selected.consent_to_contact ? 'Yes' : 'No'} readOnly /></label>
          <label style={{ gridColumn: '1 / -1' }}><span>Moderation notes</span><textarea rows={4} value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
          <label><span>Featured message</span><button className={`admin-toggle ${featured ? 'on' : ''}`} disabled={!selected.consent_to_publish} onClick={() => setFeatured((value) => !value)}><i />{featured ? 'Featured' : 'Not featured'}</button></label>
          <div><small>Created</small><p>{formatDate(selected.created_at)}</p><small>Moderated</small><p>{formatDate(selected.moderated_at)}</p><small>Published</small><p>{formatDate(selected.published_at)}</p></div>
        </div>
        {!selected.consent_to_publish && <div className="admin-error"><ShieldAlert size={18} /> This visitor did not consent to public publication. Approval will keep the message private.</div>}
        <footer>
          <button onClick={() => setSelected(null)} disabled={saving}>Close</button>
          <button onClick={() => void moderate('spam')} disabled={saving}>Mark spam</button>
          <button onClick={() => void moderate('rejected')} disabled={saving}><XCircle size={16} /> Reject</button>
          <button onClick={() => void moderate('approved')} disabled={saving}>{saving ? <LoaderCircle className="spin" size={16} /> : <CheckCircle2 size={16} />} Approve{selected.consent_to_publish ? ' & publish' : ''}</button>
        </footer>
      </section>
    </div>}
  </div>;
}
