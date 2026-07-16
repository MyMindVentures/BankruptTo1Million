import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Clock3, Copy, Filter, Link2, LoaderCircle, Mail, RefreshCw, Search, Send, XCircle } from 'lucide-react';
import {
  generateOutreachMessages,
  generateOutreachToken,
  getOutreachDetail,
  getOutreachOverview,
  recordOutreachSent,
  regenerateOutreachToken,
  revokeOutreachToken,
  updateOutreachStatus,
  upsertOutreachCampaign,
  type OutreachDetail,
  type OutreachOverviewRow,
  type OutreachUpsertPayload,
} from '../lib/outreachAdminApi';
import type { OutreachStatus } from '../lib/outreachAdminPayload';
import { useWebsiteI18n } from '../lib/websiteI18n';
import '../styles/outreachAdmin.css';

const statusFilters: OutreachStatus[] = [
  'draft', 'ready', 'sent', 'opened', 'interested', 'meeting_planned', 'accepted', 'declined', 'no_response', 'archived',
];

function label(value: string | null | undefined) {
  if (!value) return '—';
  return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  return new Date(value).toLocaleString();
}

function emptyPayload(): OutreachUpsertPayload {
  return {
    contact: {
      first_name: '',
      last_name: '',
      company_name: '',
      job_title: '',
      email: '',
      phone: '',
      whatsapp: '',
      website: '',
      instagram: '',
      linkedin: '',
      location: '',
      language_code: 'en',
    },
    campaign: {
      category: 'collaboration',
      status: 'draft',
      outreach_channel: null,
      responsible_email: '',
      internal_notes: '',
    },
    page: {
      slug: '',
      personal_intro: '',
      why_them: '',
      what_we_offer: '',
      what_we_ask: '',
      win_win: '',
      personal_message: '',
      mission_blurb: '',
      meeting_url: '',
      whatsapp_override: '',
      original_language: 'en',
    },
  };
}

function detailToPayload(detail: OutreachDetail): OutreachUpsertPayload {
  return {
    contact: { ...(detail.contact || {}) },
    campaign: { ...(detail.campaign || {}) },
    page: { ...(detail.page || {}) },
  };
}

function initialStatusFilter(counts: Record<string, number> | null): 'all' | OutreachStatus {
  if (!counts) return 'all';
  const order: OutreachStatus[] = ['draft', 'ready', 'sent', 'opened', 'interested', 'meeting_planned'];
  for (const status of order) if ((counts[status] || 0) > 0) return status;
  return 'all';
}

export function OutreachAdminPage() {
  const { t } = useWebsiteI18n();
  const [rows, setRows] = useState<OutreachOverviewRow[] | null>(null);
  const [counts, setCounts] = useState<Record<string, number> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all' | OutreachStatus>('draft');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<OutreachDetail | null>(null);
  const [form, setForm] = useState<OutreachUpsertPayload>(emptyPayload());
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [messages, setMessages] = useState<Awaited<ReturnType<typeof generateOutreachMessages>> | null>(null);
  const [copied, setCopied] = useState(false);
  const filterInitialized = useRef(false);

  async function load(options?: { preserveFilter?: boolean }) {
    setLoading(true);
    setError(null);
    try {
      const overview = await getOutreachOverview({ status: status === 'all' ? null : status, query });
      setRows(overview.rows);
      setCounts(overview.counts);
      if (!options?.preserveFilter) setStatus(initialStatusFilter(overview.counts));
      if (selectedId) {
        const next = await getOutreachDetail(selectedId);
        setDetail(next);
        setForm(detailToPayload(next));
      }
    } catch (reason) {
      setRows(null);
      setCounts(null);
      setError(reason instanceof Error ? reason.message : 'Outreach data could not be loaded.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load({ preserveFilter: filterInitialized.current });
    filterInitialized.current = true;
  }, [status, query]);

  const filtered = useMemo(() => rows || [], [rows]);

  async function openCampaign(campaignId: string) {
    setSaving(true);
    setError(null);
    try {
      const next = await getOutreachDetail(campaignId);
      setSelectedId(campaignId);
      setDetail(next);
      setForm(detailToPayload(next));
      setGeneratedLink(null);
      setGeneratedToken(null);
      setMessages(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Outreach detail could not be loaded.');
    } finally {
      setSaving(false);
    }
  }

  function openCreate() {
    setSelectedId('new');
    setDetail(null);
    setForm(emptyPayload());
    setGeneratedLink(null);
    setGeneratedToken(null);
    setMessages(null);
  }

  function updateField(scope: keyof OutreachUpsertPayload, field: string, value: string) {
    setForm((current) => ({ ...current, [scope]: { ...current[scope], [field]: value } }));
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const saved = await upsertOutreachCampaign(form);
      const campaignId = String(saved.campaign?.id || '');
      if (!campaignId) throw new Error('Saved outreach campaign id missing.');
      setSelectedId(campaignId);
      setDetail(saved);
      setForm(detailToPayload(saved));
      await load({ preserveFilter: true });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Outreach could not be saved.');
    } finally {
      setSaving(false);
    }
  }

  async function createLink(regenerate = false) {
    if (!selectedId || selectedId === 'new') return;
    setSaving(true);
    setError(null);
    try {
      const result = regenerate
        ? await regenerateOutreachToken(selectedId)
        : await generateOutreachToken(selectedId);
      setGeneratedLink(result.url);
      setGeneratedToken(result.raw_token);
      const nextMessages = await generateOutreachMessages(selectedId, result.raw_token);
      setMessages(nextMessages);
      await openCampaign(selectedId);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Secure link could not be generated.');
    } finally {
      setSaving(false);
    }
  }

  async function copyLink() {
    if (!generatedLink) return;
    await navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  async function markSent(channel: 'email' | 'whatsapp' | 'instagram' | 'linkedin' | 'manual') {
    if (!selectedId || selectedId === 'new') return;
    setSaving(true);
    setError(null);
    try {
      await recordOutreachSent(selectedId, channel, messages?.email.body || messages?.whatsapp.body);
      await updateOutreachStatus(selectedId, 'sent');
      await load({ preserveFilter: true });
      await openCampaign(selectedId);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Outreach could not be marked as sent.');
    } finally {
      setSaving(false);
    }
  }

  async function setStatusValue(nextStatus: OutreachStatus) {
    if (!selectedId || selectedId === 'new') return;
    setSaving(true);
    setError(null);
    try {
      await updateOutreachStatus(selectedId, nextStatus);
      updateField('campaign', 'status', nextStatus);
      await load({ preserveFilter: true });
      await openCampaign(selectedId);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Status update failed.');
    } finally {
      setSaving(false);
    }
  }

  async function revokeToken() {
    const tokenId = detail?.token?.id;
    if (!tokenId || typeof tokenId !== 'string') return;
    setSaving(true);
    setError(null);
    try {
      await revokeOutreachToken(tokenId);
      setGeneratedLink(null);
      setGeneratedToken(null);
      if (selectedId) await openCampaign(selectedId);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Token revoke failed.');
    } finally {
      setSaving(false);
    }
  }

  return <div className="admin-section-page">
    <div className="admin-section-heading">
      <div>
        <p>{t('admin.outreach.title', 'Outreach').toUpperCase()}</p>
        <h1>{t('admin.outreach.title', 'Outreach')}</h1>
        <span>{t('admin.outreach.description', 'Create and track personalized private outreach pages.')}</span>
      </div>
      <div className="outreach-admin-editor__actions">
        <button onClick={() => void load({ preserveFilter: true })} disabled={loading}><RefreshCw size={16} /> Refresh</button>
        <button onClick={openCreate}>{t('admin.outreach.create', 'New outreach')}</button>
      </div>
    </div>

    <section className="admin-kpis">
      {statusFilters.slice(0, 6).map((item) => <article key={item} onClick={() => setStatus(item)} style={{ cursor: 'pointer' }}>
        <div className="admin-kpi-icon">{item === 'draft' || item === 'ready' ? <Clock3 /> : item === 'accepted' ? <CheckCircle2 /> : item === 'declined' ? <XCircle /> : <Mail />}</div>
        <p>{label(item)}</p><strong>{loading || !counts ? '—' : counts[item] ?? 0}</strong><span>{status === item ? 'Active filter' : 'Click to filter'}</span>
      </article>)}
    </section>

    <div className="admin-section-toolbar">
      <div><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search contact, company or status..." /></div>
      <label><Filter size={15} /><select value={status} onChange={(event) => setStatus(event.target.value as typeof status)}><option value="all">All statuses</option>{statusFilters.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select></label>
      <span>{loading || !counts ? '—' : `${counts.total} total`} · {loading ? '—' : `${filtered.length} shown`}</span>
    </div>

    {error ? <div className="admin-error">{error}</div> : null}
    {loading ? <div className="admin-loading"><LoaderCircle className="spin" /> Loading outreach records…</div> : null}

    {!loading && filtered.length === 0 ? <div className="admin-section-empty">No outreach records match this filter.</div> : null}

    <div className="admin-record-grid">
      {filtered.map((row) => <article className="admin-record-card" key={row.campaign_id} onClick={() => void openCampaign(row.campaign_id)}>
        <div><strong>{row.first_name} {row.last_name || ''}</strong><span>{row.company_name}</span></div>
        <div><span>{label(row.category)}</span><span>{label(row.status)}</span></div>
        <div><span>{row.visit_count} visits</span><span>{formatDate(row.last_opened_at)}</span></div>
      </article>)}
    </div>

    {selectedId ? <div className="admin-editor-backdrop" onClick={() => setSelectedId(null)}>
      <div className="admin-editor outreach-admin-editor" onClick={(event) => event.stopPropagation()}>
        <header className="admin-editor-header">
          <div><h2>{selectedId === 'new' ? t('admin.outreach.create', 'New outreach') : form.contact.company_name as string || 'Outreach editor'}</h2><span>{label(form.campaign.status as string)}</span></div>
          <button onClick={() => setSelectedId(null)} type="button">Close</button>
        </header>

        <section>
          <h3>Contact</h3>
          <label>First name<input value={String(form.contact.first_name || '')} onChange={(event) => updateField('contact', 'first_name', event.target.value)} /></label>
          <label>Last name<input value={String(form.contact.last_name || '')} onChange={(event) => updateField('contact', 'last_name', event.target.value)} /></label>
          <label>Company<input value={String(form.contact.company_name || '')} onChange={(event) => updateField('contact', 'company_name', event.target.value)} /></label>
          <label>Job title<input value={String(form.contact.job_title || '')} onChange={(event) => updateField('contact', 'job_title', event.target.value)} /></label>
          <label>Email<input type="email" value={String(form.contact.email || '')} onChange={(event) => updateField('contact', 'email', event.target.value)} /></label>
          <label>Phone<input value={String(form.contact.phone || '')} onChange={(event) => updateField('contact', 'phone', event.target.value)} /></label>
          <label>WhatsApp<input value={String(form.contact.whatsapp || '')} onChange={(event) => updateField('contact', 'whatsapp', event.target.value)} /></label>
          <label>Website<input value={String(form.contact.website || '')} onChange={(event) => updateField('contact', 'website', event.target.value)} /></label>
          <label>Language<select value={String(form.contact.language_code || 'en')} onChange={(event) => updateField('contact', 'language_code', event.target.value)}><option value="en">en</option><option value="es">es</option><option value="nl">nl</option><option value="fr">fr</option><option value="de">de</option></select></label>
        </section>

        <section>
          <h3>Campaign</h3>
          <label>Category<select value={String(form.campaign.category || 'collaboration')} onChange={(event) => updateField('campaign', 'category', event.target.value)}><option value="work">work</option><option value="collaboration">collaboration</option><option value="hosting">hosting</option><option value="sponsoring">sponsoring</option><option value="investment">investment</option><option value="technical_support">technical_support</option></select></label>
          <label>Responsible email<input value={String(form.campaign.responsible_email || '')} onChange={(event) => updateField('campaign', 'responsible_email', event.target.value)} /></label>
          <label>Internal notes<textarea value={String(form.campaign.internal_notes || '')} onChange={(event) => updateField('campaign', 'internal_notes', event.target.value)} /></label>
        </section>

        <section>
          <h3>Page content</h3>
          <label>Slug<input value={String(form.page.slug || '')} onChange={(event) => updateField('page', 'slug', event.target.value)} /></label>
          <label>Personal intro<textarea value={String(form.page.personal_intro || '')} onChange={(event) => updateField('page', 'personal_intro', event.target.value)} /></label>
          <label>Why them<textarea value={String(form.page.why_them || '')} onChange={(event) => updateField('page', 'why_them', event.target.value)} /></label>
          <label>What we offer<textarea value={String(form.page.what_we_offer || '')} onChange={(event) => updateField('page', 'what_we_offer', event.target.value)} /></label>
          <label>What we ask<textarea value={String(form.page.what_we_ask || '')} onChange={(event) => updateField('page', 'what_we_ask', event.target.value)} /></label>
          <label>Win-win<textarea value={String(form.page.win_win || '')} onChange={(event) => updateField('page', 'win_win', event.target.value)} /></label>
          <label>Personal message<textarea value={String(form.page.personal_message || '')} onChange={(event) => updateField('page', 'personal_message', event.target.value)} /></label>
          <label>Mission blurb<textarea value={String(form.page.mission_blurb || '')} onChange={(event) => updateField('page', 'mission_blurb', event.target.value)} /></label>
          <label>Meeting URL<input value={String(form.page.meeting_url || '')} onChange={(event) => updateField('page', 'meeting_url', event.target.value)} /></label>
        </section>

        <div className="outreach-admin-editor__actions">
          <button disabled={saving} onClick={() => void save()} type="button">Save outreach</button>
          <button disabled={saving || selectedId === 'new'} onClick={() => void setStatusValue('ready')} type="button">Mark ready</button>
          <button disabled={saving || selectedId === 'new'} onClick={() => void createLink(false)} type="button"><Link2 size={15} /> {t('admin.outreach.generate_link', 'Generate secure link')}</button>
          <button disabled={saving || selectedId === 'new'} onClick={() => void createLink(true)} type="button">Regenerate link</button>
          {detail?.token?.id ? <button disabled={saving} onClick={() => void revokeToken()} type="button">Revoke link</button> : null}
        </div>

        {generatedLink ? <div className="outreach-admin-editor__panel">
          <p className="outreach-admin-editor__mono">{generatedLink}</p>
          <div className="outreach-admin-editor__actions">
            <button onClick={() => void copyLink()} type="button"><Copy size={15} /> {copied ? 'Copied' : t('admin.outreach.copy_link', 'Copy magic link')}</button>
            <button disabled={saving || selectedId === 'new'} onClick={() => void markSent('email')} type="button"><Send size={15} /> {t('admin.outreach.mark_sent', 'Mark as sent')}</button>
          </div>
        </div> : null}

        {messages ? <section className="outreach-admin-messages">
          <h3>Generated messages</h3>
          <div className="outreach-admin-editor__panel"><strong>Email</strong><pre>{messages.email.body}</pre>{messages.email.mailto_url ? <a href={messages.email.mailto_url}>Open mailto</a> : null}</div>
          <div className="outreach-admin-editor__panel"><strong>WhatsApp</strong><pre>{messages.whatsapp.body}</pre>{messages.whatsapp.wa_me_url ? <a href={messages.whatsapp.wa_me_url} rel="noopener noreferrer" target="_blank">Open WhatsApp</a> : null}</div>
          <div className="outreach-admin-editor__panel"><strong>Instagram</strong><pre>{messages.instagram.body}</pre></div>
          <div className="outreach-admin-editor__panel"><strong>LinkedIn</strong><pre>{messages.linkedin.body}</pre></div>
        </section> : null}

        {detail?.responses?.length ? <section>
          <h3>Responses</h3>
          {detail.responses.map((response) => <div className="outreach-admin-editor__panel" key={String(response.id)}>
            <strong>{label(String(response.response_type || ''))}</strong>
            <p>{String(response.message || '—')}</p>
            <span>{formatDate(String(response.created_at || ''))}</span>
          </div>)}
        </section> : null}

        {detail?.events?.length ? <section>
          <h3>Recent events</h3>
          {detail.events.slice(0, 8).map((eventItem) => <div className="outreach-admin-editor__panel" key={String(eventItem.id)}>
            <strong>{label(String(eventItem.event_type || ''))}</strong>
            <span>{formatDate(String(eventItem.occurred_at || ''))}</span>
          </div>)}
        </section> : null}
      </div>
    </div> : null}
  </div>;
}
