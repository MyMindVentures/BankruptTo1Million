import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Clock3, Filter, LoaderCircle, Mail, RefreshCw, Search, UserPlus, XCircle } from 'lucide-react';
import { OutreachAdminEditor } from '../components/outreach/OutreachAdminEditor';
import {
  getOutreachDetail,
  getOutreachOverview,
  importOutreachFromPartnership,
  listPartnershipContactsForOutreach,
  type OutreachDetail,
  type OutreachOverviewRow,
  type OutreachPageMediaItem,
  type OutreachUpsertPayload,
  type PartnershipContactRow,
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
      ai_brief: '',
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
      founder_video_media_id: '',
      original_language: 'en',
      expires_at: '',
    },
  };
}

function detailToPayload(detail: OutreachDetail): OutreachUpsertPayload {
  const contact = detail.contact || {};
  const campaign = detail.campaign || {};
  const page = detail.page || {};
  return {
    contact: {
      id: contact.id as string | undefined,
      first_name: String(contact.first_name || ''),
      last_name: String(contact.last_name || ''),
      company_name: String(contact.company_name || ''),
      job_title: String(contact.job_title || ''),
      email: String(contact.email || ''),
      phone: String(contact.phone || ''),
      whatsapp: String(contact.whatsapp || ''),
      website: String(contact.website || ''),
      instagram: String(contact.instagram || ''),
      linkedin: String(contact.linkedin || ''),
      location: String(contact.location || ''),
      language_code: String(contact.language_code || 'en'),
      partnership_contact_id: contact.partnership_contact_id as string | undefined,
    },
    campaign: {
      id: campaign.id as string | undefined,
      category: (campaign.category as OutreachUpsertPayload['campaign']['category']) || 'collaboration',
      status: (campaign.status as OutreachUpsertPayload['campaign']['status']) || 'draft',
      outreach_channel: (campaign.outreach_channel as OutreachUpsertPayload['campaign']['outreach_channel']) || null,
      responsible_email: String(campaign.responsible_email || ''),
      internal_notes: String(campaign.internal_notes || ''),
      ai_brief: String(campaign.ai_brief || detail.ai_source?.brief || ''),
    },
    page: {
      id: page.id as string | undefined,
      slug: String(page.slug || ''),
      personal_intro: String(page.personal_intro || ''),
      why_them: String(page.why_them || ''),
      what_we_offer: String(page.what_we_offer || ''),
      what_we_ask: String(page.what_we_ask || ''),
      win_win: String(page.win_win || ''),
      personal_message: String(page.personal_message || ''),
      mission_blurb: String(page.mission_blurb || ''),
      meeting_url: String(page.meeting_url || ''),
      whatsapp_override: String(page.whatsapp_override || ''),
      founder_video_media_id: String(page.founder_video_media_id || ''),
      original_language: String(page.original_language || contact.language_code || 'en'),
      expires_at: String(page.expires_at || ''),
    },
  };
}

function mediaFromDetail(detail: OutreachDetail | null): OutreachPageMediaItem[] {
  return (detail?.media || [])
    .map((row, index) => ({
      media_asset_id: String(row.media_asset_id || ''),
      sort_order: Number(row.sort_order) || index,
      caption: String(row.caption || ''),
      title: typeof row.title === 'string' ? row.title : null,
      asset_type: typeof row.asset_type === 'string' ? row.asset_type : null,
      storage_bucket: typeof row.storage_bucket === 'string' ? row.storage_bucket : null,
      storage_path: typeof row.storage_path === 'string' ? row.storage_path : null,
      external_url: typeof row.external_url === 'string' ? row.external_url : null,
      thumbnail_url: typeof row.thumbnail_url === 'string' ? row.thumbnail_url : null,
    }))
    .filter((item) => item.media_asset_id);
}

function initialStatusFilter(counts: Record<string, number> | null): 'all' | OutreachStatus {
  if (!counts) return 'all';
  const order: OutreachStatus[] = ['draft', 'ready', 'sent', 'opened', 'interested', 'meeting_planned'];
  for (const status of order) if ((counts[status] || 0) > 0) return status;
  return 'all';
}

export function OutreachAdminPage() {
  const { t, formatDate } = useWebsiteI18n();
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
  const [showImport, setShowImport] = useState(false);
  const [partnershipQuery, setPartnershipQuery] = useState('');
  const [partnershipRows, setPartnershipRows] = useState<PartnershipContactRow[] | null>(null);
  const [partnershipLoading, setPartnershipLoading] = useState(false);
  const [mediaItems, setMediaItems] = useState<OutreachPageMediaItem[]>([]);
  const filterInitialized = useRef(false);

  const statusLabel = (value: string | null | undefined) => {
    if (!value) return '—';
    return t(`admin.outreach.status.${value}`, label(value));
  };

  const categoryLabel = (value: string | null | undefined) => {
    if (!value) return '—';
    return t(`admin.outreach.category.${value}`, label(value));
  };

  const formatTimestamp = (value: string | null | undefined) => {
    if (!value) return '—';
    return formatDate(value, { dateStyle: 'medium', timeStyle: 'short' });
  };

  async function load(options?: { preserveFilter?: boolean }) {
    setLoading(true);
    setError(null);
    try {
      const overview = await getOutreachOverview({ status: status === 'all' ? null : status, query });
      setRows(overview.rows);
      setCounts(overview.counts);
      if (!options?.preserveFilter) setStatus(initialStatusFilter(overview.counts));
      if (selectedId && selectedId !== 'new') {
        const next = await getOutreachDetail(selectedId);
        setDetail(next);
        setForm(detailToPayload(next));
        setMediaItems(mediaFromDetail(next));
      }
    } catch (reason) {
      setRows(null);
      setCounts(null);
      setError(reason instanceof Error && reason.message === 'admin.outreach.error.session'
        ? t('admin.outreach.error.session', 'No valid admin session.')
        : t('admin.outreach.error.load', 'Outreach data could not be loaded.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load({ preserveFilter: filterInitialized.current });
    filterInitialized.current = true;
  }, [status, query]);

  useEffect(() => {
    if (!showImport) return;
    let cancelled = false;
    setPartnershipLoading(true);
    void listPartnershipContactsForOutreach(partnershipQuery)
      .then((items) => { if (!cancelled) setPartnershipRows(items); })
      .catch(() => { if (!cancelled) setPartnershipRows(null); })
      .finally(() => { if (!cancelled) setPartnershipLoading(false); });
    return () => { cancelled = true; };
  }, [showImport, partnershipQuery]);

  const filtered = useMemo(() => rows || [], [rows]);

  async function openCampaign(campaignId: string) {
    setSaving(true);
    setError(null);
    try {
      const next = await getOutreachDetail(campaignId);
      setSelectedId(campaignId);
      setDetail(next);
      setForm(detailToPayload(next));
      setMediaItems(mediaFromDetail(next));
    } catch {
      setError(t('admin.outreach.error.detail', 'Outreach detail could not be loaded.'));
    } finally {
      setSaving(false);
    }
  }

  function openCreate() {
    setSelectedId('new');
    setDetail(null);
    setForm(emptyPayload());
    setMediaItems([]);
  }

  async function importPartnershipContact(partnershipContactId: string) {
    setSaving(true);
    setError(null);
    try {
      const imported = await importOutreachFromPartnership(partnershipContactId);
      setSelectedId('new');
      setDetail(null);
      setForm({
        contact: { ...emptyPayload().contact, ...(imported.contact || {}) },
        campaign: { ...emptyPayload().campaign, ...(imported.campaign || {}) },
        page: { ...emptyPayload().page, ...(imported.page || {}) },
      });
      setMediaItems([]);
      setShowImport(false);
    } catch {
      setError(t('admin.outreach.import.error', 'Partnership import failed.'));
    } finally {
      setSaving(false);
    }
  }

  function handleSaved(saved: OutreachDetail, campaignId: string) {
    setSelectedId(campaignId);
    setDetail(saved);
    setForm(detailToPayload(saved));
    setMediaItems(mediaFromDetail(saved));
  }

  return <div className="admin-section-page">
    <div className="admin-section-heading">
      <div>
        <p>{t('admin.outreach.title', 'Outreach').toUpperCase()}</p>
        <h1>{t('admin.outreach.title', 'Outreach')}</h1>
        <span>{t('admin.outreach.description', 'Create and track personalized private outreach pages.')}</span>
      </div>
      <div className="outreach-admin-editor__actions">
        <button onClick={() => void load({ preserveFilter: true })} disabled={loading}><RefreshCw size={16} /> {t('admin.outreach.refresh', 'Refresh')}</button>
        <button onClick={() => setShowImport((current) => !current)} type="button"><UserPlus size={16} /> {t('admin.outreach.import.title', 'Import from partnership')}</button>
        <button onClick={openCreate}>{t('admin.outreach.create', 'New outreach')}</button>
      </div>
    </div>

    {showImport ? <section className="outreach-admin-import">
      <h3>{t('admin.outreach.import.title', 'Import from partnership')}</h3>
      <div className="admin-section-toolbar">
        <div><Search size={17} /><input value={partnershipQuery} onChange={(event) => setPartnershipQuery(event.target.value)} placeholder={t('admin.outreach.import.placeholder', 'Search partnership contacts...')} /></div>
      </div>
      {partnershipLoading ? <div className="admin-loading"><LoaderCircle className="spin" /> {t('admin.outreach.import.loading', 'Loading partnership contacts…')}</div> : null}
      {!partnershipLoading && partnershipRows?.length === 0 ? <div className="admin-section-empty">{t('admin.outreach.import.empty', 'No partnership contacts found.')}</div> : null}
      <div className="outreach-admin-import__list">
        {(partnershipRows || []).map((row) => <article className="outreach-admin-editor__panel" key={row.id}>
          <div><strong>{row.organization_name || row.full_name || '—'}</strong><span>{row.full_name || row.email || row.country || '—'}</span></div>
          {row.outreach_angle ? <p>{row.outreach_angle}</p> : null}
          <button disabled={saving} onClick={() => void importPartnershipContact(row.id)} type="button">{t('admin.outreach.import.button', 'Import contact')}</button>
        </article>)}
      </div>
    </section> : null}

    <section className="admin-kpis">
      {statusFilters.slice(0, 6).map((item) => <article key={item} onClick={() => setStatus(item)} style={{ cursor: 'pointer' }}>
        <div className="admin-kpi-icon">{item === 'draft' || item === 'ready' ? <Clock3 /> : item === 'accepted' ? <CheckCircle2 /> : item === 'declined' ? <XCircle /> : <Mail />}</div>
        <p>{statusLabel(item)}</p><strong>{loading || !counts ? '—' : counts[item] ?? 0}</strong><span>{status === item ? t('admin.outreach.filter.active', 'Active filter') : t('admin.outreach.filter.click', 'Click to filter')}</span>
      </article>)}
    </section>

    <div className="admin-section-toolbar">
      <div><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('admin.outreach.search.placeholder', 'Search contact, company or status...')} /></div>
      <label><Filter size={15} /><select value={status} onChange={(event) => setStatus(event.target.value as typeof status)}><option value="all">{t('admin.outreach.filter.all_statuses', 'All statuses')}</option>{statusFilters.map((item) => <option key={item} value={item}>{statusLabel(item)}</option>)}</select></label>
      <span>{loading || !counts ? '—' : t('admin.outreach.stats.total', '{count} total', { count: String(counts.total) })} · {loading ? '—' : t('admin.outreach.stats.shown', '{count} shown', { count: String(filtered.length) })}</span>
    </div>

    {error ? <div className="admin-error">{error}</div> : null}
    {loading ? <div className="admin-loading"><LoaderCircle className="spin" /> {t('admin.outreach.loading', 'Loading outreach records…')}</div> : null}

    {!loading && filtered.length === 0 ? <div className="admin-section-empty">{t('admin.outreach.empty', 'No outreach records match this filter.')}</div> : null}

    <div className="admin-record-grid">
      {filtered.map((row) => <article className="admin-record-card" key={row.campaign_id} onClick={() => void openCampaign(row.campaign_id)}>
        <div><strong>{row.first_name} {row.last_name || ''}</strong><span>{row.company_name}</span></div>
        <div><span>{categoryLabel(row.category)}</span><span>{statusLabel(row.status)}</span></div>
        <div><span>{t('admin.outreach.card.visits', '{count} visits', { count: String(row.visit_count) })}</span><span>{formatTimestamp(row.last_opened_at)}</span></div>
      </article>)}
    </div>

    {selectedId ? (
      <OutreachAdminEditor
        detail={detail}
        form={form}
        mediaItems={mediaItems}
        onClose={() => setSelectedId(null)}
        onError={setError}
        onFormChange={setForm}
        onMediaItemsChange={setMediaItems}
        onReload={async () => { await load({ preserveFilter: true }); }}
        onSaved={handleSaved}
        saving={saving}
        selectedId={selectedId}
      />
    ) : null}
  </div>;
}
