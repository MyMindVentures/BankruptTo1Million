import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Clock3, Copy, Filter, ImagePlus, Link2, LoaderCircle, Mail, RefreshCw, Search, Send, UserPlus, XCircle } from 'lucide-react';
import {
  generateOutreachMessages,
  generateOutreachToken,
  getOutreachDetail,
  getOutreachOverview,
  importOutreachFromPartnership,
  listPartnershipContactsForOutreach,
  recordOutreachSent,
  regenerateOutreachToken,
  revokeOutreachToken,
  searchMediaAssetsForOutreach,
  setOutreachPageMedia,
  updateOutreachStatus,
  upsertOutreachCampaign,
  type OutreachDetail,
  type OutreachMediaAssetRow,
  type OutreachOverviewRow,
  type OutreachPageMediaItem,
  type OutreachUpsertPayload,
  type PartnershipContactRow,
} from '../lib/outreachAdminApi';
import type { OutreachStatus } from '../lib/outreachAdminPayload';
import { outreachStoragePublicUrl } from '../lib/outreachPublicApi';
import { useWebsiteI18n } from '../lib/websiteI18n';
import '../styles/outreachAdmin.css';

const statusFilters: OutreachStatus[] = [
  'draft', 'ready', 'sent', 'opened', 'interested', 'meeting_planned', 'accepted', 'declined', 'no_response', 'archived',
];

const categoryOptions = ['work', 'collaboration', 'hosting', 'sponsoring', 'investment', 'technical_support'] as const;

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

function mediaPreviewUrl(item: Pick<OutreachPageMediaItem, 'external_url' | 'storage_bucket' | 'storage_path' | 'thumbnail_url'>) {
  return item.thumbnail_url || item.external_url || outreachStoragePublicUrl(item.storage_bucket ?? null, item.storage_path ?? null);
}

function initialStatusFilter(counts: Record<string, number> | null): 'all' | OutreachStatus {
  if (!counts) return 'all';
  const order: OutreachStatus[] = ['draft', 'ready', 'sent', 'opened', 'interested', 'meeting_planned'];
  for (const status of order) if ((counts[status] || 0) > 0) return status;
  return 'all';
}

export function OutreachAdminPage() {
  const { t, formatDate, languages } = useWebsiteI18n();
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
  const [messages, setMessages] = useState<Awaited<ReturnType<typeof generateOutreachMessages>> | null>(null);
  const [copied, setCopied] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [partnershipQuery, setPartnershipQuery] = useState('');
  const [partnershipRows, setPartnershipRows] = useState<PartnershipContactRow[] | null>(null);
  const [partnershipLoading, setPartnershipLoading] = useState(false);
  const [mediaItems, setMediaItems] = useState<OutreachPageMediaItem[]>([]);
  const [mediaQuery, setMediaQuery] = useState('');
  const [mediaResults, setMediaResults] = useState<OutreachMediaAssetRow[] | null>(null);
  const [mediaLoading, setMediaLoading] = useState(false);
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
    } catch {
      setRows(null);
      setCounts(null);
      setError(t('admin.outreach.error.load', 'Outreach data could not be loaded.'));
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

  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    setMediaLoading(true);
    void searchMediaAssetsForOutreach(mediaQuery)
      .then((items) => { if (!cancelled) setMediaResults(items); })
      .catch(() => { if (!cancelled) setMediaResults(null); })
      .finally(() => { if (!cancelled) setMediaLoading(false); });
    return () => { cancelled = true; };
  }, [mediaQuery, selectedId]);

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
      setGeneratedLink(null);
      setMessages(null);
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
    setGeneratedLink(null);
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
      if (!campaignId) throw new Error('missing-id');
      setSelectedId(campaignId);
      setDetail(saved);
      setForm(detailToPayload(saved));
      setMediaItems(mediaFromDetail(saved));
      await load({ preserveFilter: true });
    } catch (reason) {
      setError(reason instanceof Error && reason.message === 'missing-id'
        ? t('admin.outreach.error.save_id', 'Saved outreach campaign id missing.')
        : t('admin.outreach.error.save', 'Outreach could not be saved.'));
    } finally {
      setSaving(false);
    }
  }

  async function saveMedia() {
    const pageId = String(detail?.page?.id || form.page.id || '');
    if (!pageId) {
      setError(t('admin.outreach.media.requires_save', 'Save the outreach page before linking media.'));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await setOutreachPageMedia(pageId, mediaItems);
      if (selectedId && selectedId !== 'new') await openCampaign(selectedId);
    } catch {
      setError(t('admin.outreach.media.error', 'Media could not be saved.'));
    } finally {
      setSaving(false);
    }
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

  function addMediaAsset(asset: OutreachMediaAssetRow) {
    if (mediaItems.some((item) => item.media_asset_id === asset.id)) return;
    setMediaItems((current) => [...current, {
      media_asset_id: asset.id,
      sort_order: current.length,
      caption: '',
      title: asset.title,
      asset_type: asset.asset_type,
      storage_bucket: asset.storage_bucket,
      storage_path: asset.storage_path,
      external_url: asset.external_url,
      thumbnail_url: asset.thumbnail_url,
    }]);
  }

  function removeMediaItem(mediaAssetId: string) {
    setMediaItems((current) => current.filter((item) => item.media_asset_id !== mediaAssetId).map((item, index) => ({ ...item, sort_order: index })));
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
      const nextMessages = await generateOutreachMessages(selectedId, result.raw_token);
      setMessages(nextMessages);
      await openCampaign(selectedId);
    } catch {
      setError(t('admin.outreach.error.link', 'Secure link could not be generated.'));
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
    } catch {
      setError(t('admin.outreach.error.mark_sent', 'Outreach could not be marked as sent.'));
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
    } catch {
      setError(t('admin.outreach.error.status', 'Status update failed.'));
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
      if (selectedId) await openCampaign(selectedId);
    } catch {
      setError(t('admin.outreach.error.revoke', 'Token revoke failed.'));
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

    {selectedId ? <div className="admin-editor-backdrop" onClick={() => setSelectedId(null)}>
      <div className="admin-editor outreach-admin-editor" onClick={(event) => event.stopPropagation()}>
        <header className="admin-editor-header">
          <div><h2>{selectedId === 'new' ? t('admin.outreach.create', 'New outreach') : String(form.contact.company_name || t('admin.outreach.editor.title', 'Outreach editor'))}</h2><span>{statusLabel(String(form.campaign.status || ''))}</span></div>
          <button onClick={() => setSelectedId(null)} type="button">{t('admin.outreach.close', 'Close')}</button>
        </header>

        <section>
          <h3>{t('admin.outreach.section.contact', 'Contact')}</h3>
          <label>{t('admin.outreach.field.first_name', 'First name')}<input value={String(form.contact.first_name || '')} onChange={(event) => updateField('contact', 'first_name', event.target.value)} /></label>
          <label>{t('admin.outreach.field.last_name', 'Last name')}<input value={String(form.contact.last_name || '')} onChange={(event) => updateField('contact', 'last_name', event.target.value)} /></label>
          <label>{t('admin.outreach.field.company', 'Company')}<input value={String(form.contact.company_name || '')} onChange={(event) => updateField('contact', 'company_name', event.target.value)} /></label>
          <label>{t('admin.outreach.field.job_title', 'Job title')}<input value={String(form.contact.job_title || '')} onChange={(event) => updateField('contact', 'job_title', event.target.value)} /></label>
          <label>{t('admin.outreach.field.email', 'Email')}<input type="email" value={String(form.contact.email || '')} onChange={(event) => updateField('contact', 'email', event.target.value)} /></label>
          <label>{t('admin.outreach.field.phone', 'Phone')}<input value={String(form.contact.phone || '')} onChange={(event) => updateField('contact', 'phone', event.target.value)} /></label>
          <label>{t('admin.outreach.field.whatsapp', 'WhatsApp')}<input value={String(form.contact.whatsapp || '')} onChange={(event) => updateField('contact', 'whatsapp', event.target.value)} /></label>
          <label>{t('admin.outreach.field.website', 'Website')}<input value={String(form.contact.website || '')} onChange={(event) => updateField('contact', 'website', event.target.value)} /></label>
          <label>{t('admin.outreach.field.language', 'Language')}<select value={String(form.contact.language_code || 'en')} onChange={(event) => updateField('contact', 'language_code', event.target.value)}>{languages.map((language) => <option key={language.code} value={language.code}>{language.native_name}</option>)}</select></label>
        </section>

        <section>
          <h3>{t('admin.outreach.section.campaign', 'Campaign')}</h3>
          <label>{t('admin.outreach.field.category', 'Category')}<select value={String(form.campaign.category || 'collaboration')} onChange={(event) => updateField('campaign', 'category', event.target.value)}>{categoryOptions.map((item) => <option key={item} value={item}>{categoryLabel(item)}</option>)}</select></label>
          <label>{t('admin.outreach.field.responsible_email', 'Responsible email')}<input value={String(form.campaign.responsible_email || '')} onChange={(event) => updateField('campaign', 'responsible_email', event.target.value)} /></label>
          <label>{t('admin.outreach.field.internal_notes', 'Internal notes')}<textarea value={String(form.campaign.internal_notes || '')} onChange={(event) => updateField('campaign', 'internal_notes', event.target.value)} /></label>
        </section>

        <section>
          <h3>{t('admin.outreach.section.page_content', 'Page content')}</h3>
          <label>{t('admin.outreach.field.slug', 'Slug')}<input value={String(form.page.slug || '')} onChange={(event) => updateField('page', 'slug', event.target.value)} /></label>
          <label>{t('admin.outreach.field.personal_intro', 'Personal intro')}<textarea value={String(form.page.personal_intro || '')} onChange={(event) => updateField('page', 'personal_intro', event.target.value)} /></label>
          <label>{t('admin.outreach.field.why_them', 'Why them')}<textarea value={String(form.page.why_them || '')} onChange={(event) => updateField('page', 'why_them', event.target.value)} /></label>
          <label>{t('admin.outreach.field.what_we_offer', 'What we offer')}<textarea value={String(form.page.what_we_offer || '')} onChange={(event) => updateField('page', 'what_we_offer', event.target.value)} /></label>
          <label>{t('admin.outreach.field.what_we_ask', 'What we ask')}<textarea value={String(form.page.what_we_ask || '')} onChange={(event) => updateField('page', 'what_we_ask', event.target.value)} /></label>
          <label>{t('admin.outreach.field.win_win', 'Win-win')}<textarea value={String(form.page.win_win || '')} onChange={(event) => updateField('page', 'win_win', event.target.value)} /></label>
          <label>{t('admin.outreach.field.personal_message', 'Personal message')}<textarea value={String(form.page.personal_message || '')} onChange={(event) => updateField('page', 'personal_message', event.target.value)} /></label>
          <label>{t('admin.outreach.field.mission_blurb', 'Mission blurb')}<textarea value={String(form.page.mission_blurb || '')} onChange={(event) => updateField('page', 'mission_blurb', event.target.value)} /></label>
          <label>{t('admin.outreach.field.meeting_url', 'Meeting URL')}<input value={String(form.page.meeting_url || '')} onChange={(event) => updateField('page', 'meeting_url', event.target.value)} /></label>
          <label>{t('admin.outreach.field.founder_video', 'Founder video')}
            <select value={String(form.page.founder_video_media_id || '')} onChange={(event) => updateField('page', 'founder_video_media_id', event.target.value)}>
              <option value="">—</option>
              {(mediaResults || []).map((asset) => <option key={asset.id} value={asset.id}>{asset.title || asset.id}</option>)}
            </select>
          </label>
        </section>

        <section>
          <h3>{t('admin.outreach.section.media', 'Page media')}</h3>
          <div className="admin-section-toolbar">
            <div><Search size={17} /><input value={mediaQuery} onChange={(event) => setMediaQuery(event.target.value)} placeholder={t('admin.outreach.media.search_placeholder', 'Search media assets...')} /></div>
          </div>
          {mediaLoading ? <div className="admin-loading"><LoaderCircle className="spin" /></div> : null}
          <div className="outreach-admin-media__search">
            {(mediaResults || []).map((asset) => <button className="outreach-admin-media__pick" disabled={saving} key={asset.id} onClick={() => addMediaAsset(asset)} type="button">
              {mediaPreviewUrl(asset) ? <img alt="" src={mediaPreviewUrl(asset)} /> : <ImagePlus size={18} />}
              <span>{asset.title || asset.asset_type || asset.id}</span>
            </button>)}
          </div>
          {mediaItems.length === 0 ? <div className="admin-section-empty">{t('admin.outreach.media.empty', 'No media linked yet.')}</div> : null}
          <div className="outreach-admin-media__list">
            {mediaItems.map((item) => <article className="outreach-admin-editor__panel" key={item.media_asset_id}>
              <div className="outreach-admin-media__row">
                {mediaPreviewUrl(item) ? <img alt="" className="outreach-admin-media__thumb" src={mediaPreviewUrl(item)} /> : null}
                <div>
                  <strong>{item.title || item.media_asset_id}</strong>
                  <label>{t('admin.outreach.field.media_caption', 'Caption')}<input value={item.caption} onChange={(event) => setMediaItems((current) => current.map((row) => row.media_asset_id === item.media_asset_id ? { ...row, caption: event.target.value } : row))} /></label>
                </div>
                <button onClick={() => removeMediaItem(item.media_asset_id)} type="button">{t('admin.outreach.media.remove', 'Remove')}</button>
              </div>
            </article>)}
          </div>
          <div className="outreach-admin-editor__actions">
            <button disabled={saving || selectedId === 'new'} onClick={() => void saveMedia()} type="button">{t('admin.outreach.media.save', 'Save media')}</button>
          </div>
        </section>

        <div className="outreach-admin-editor__actions">
          <button disabled={saving} onClick={() => void save()} type="button">{t('admin.outreach.save', 'Save outreach')}</button>
          <button disabled={saving || selectedId === 'new'} onClick={() => void setStatusValue('ready')} type="button">{t('admin.outreach.mark_ready', 'Mark ready')}</button>
          <button disabled={saving || selectedId === 'new'} onClick={() => void createLink(false)} type="button"><Link2 size={15} /> {t('admin.outreach.generate_link', 'Generate secure link')}</button>
          <button disabled={saving || selectedId === 'new'} onClick={() => void createLink(true)} type="button">{t('admin.outreach.regenerate_link', 'Regenerate link')}</button>
          {detail?.token?.id ? <button disabled={saving} onClick={() => void revokeToken()} type="button">{t('admin.outreach.revoke_link', 'Revoke link')}</button> : null}
        </div>

        {generatedLink ? <div className="outreach-admin-editor__panel">
          <p className="outreach-admin-editor__mono">{generatedLink}</p>
          <div className="outreach-admin-editor__actions">
            <button onClick={() => void copyLink()} type="button"><Copy size={15} /> {copied ? t('admin.outreach.copied', 'Copied') : t('admin.outreach.copy_link', 'Copy magic link')}</button>
            <button disabled={saving || selectedId === 'new'} onClick={() => void markSent('email')} type="button"><Send size={15} /> {t('admin.outreach.mark_sent', 'Mark as sent')}</button>
          </div>
        </div> : null}

        {messages ? <section className="outreach-admin-messages">
          <h3>{t('admin.outreach.section.messages', 'Generated messages')}</h3>
          <div className="outreach-admin-editor__panel"><strong>{t('admin.outreach.message.email', 'Email')}</strong><pre>{messages.email.body}</pre>{messages.email.mailto_url ? <a href={messages.email.mailto_url}>{t('admin.outreach.message.open_mailto', 'Open mailto')}</a> : null}</div>
          <div className="outreach-admin-editor__panel"><strong>{t('admin.outreach.message.whatsapp', 'WhatsApp')}</strong><pre>{messages.whatsapp.body}</pre>{messages.whatsapp.wa_me_url ? <a href={messages.whatsapp.wa_me_url} rel="noopener noreferrer" target="_blank">{t('admin.outreach.message.open_whatsapp', 'Open WhatsApp')}</a> : null}</div>
          <div className="outreach-admin-editor__panel"><strong>{t('admin.outreach.message.instagram', 'Instagram')}</strong><pre>{messages.instagram.body}</pre></div>
          <div className="outreach-admin-editor__panel"><strong>{t('admin.outreach.message.linkedin', 'LinkedIn')}</strong><pre>{messages.linkedin.body}</pre></div>
        </section> : null}

        {detail?.responses?.length ? <section>
          <h3>{t('admin.outreach.section.responses', 'Responses')}</h3>
          {detail.responses.map((response) => <div className="outreach-admin-editor__panel" key={String(response.id)}>
            <strong>{statusLabel(String(response.response_type || ''))}</strong>
            <p>{String(response.message || '—')}</p>
            <span>{formatTimestamp(String(response.created_at || ''))}</span>
          </div>)}
        </section> : null}

        {detail?.events?.length ? <section>
          <h3>{t('admin.outreach.section.events', 'Recent events')}</h3>
          {detail.events.slice(0, 8).map((eventItem) => <div className="outreach-admin-editor__panel" key={String(eventItem.id)}>
            <strong>{label(String(eventItem.event_type || ''))}</strong>
            <span>{formatTimestamp(String(eventItem.occurred_at || ''))}</span>
          </div>)}
        </section> : null}
      </div>
    </div> : null}
  </div>;
}
