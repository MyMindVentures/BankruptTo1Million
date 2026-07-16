import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDown, ArrowUp, CheckCircle2, Copy, ExternalLink, ImagePlus, Link2, LoaderCircle, Mail, Search, Send, Sparkles, X,
} from 'lucide-react';
import {
  generateOutreachAiContent,
  generateOutreachMessages,
  generateOutreachToken,
  getOutreachAiStatus,
  prepareOutreachAi,
  recordOutreachSent,
  regenerateOutreachToken,
  revokeOutreachToken,
  searchMediaAssetsForOutreach,
  setOutreachPageMedia,
  updateOutreachStatus,
  upsertOutreachCampaign,
  type OutreachDetail,
  type OutreachMediaAssetRow,
  type OutreachPageMediaItem,
  type OutreachUpsertPayload,
} from '../../lib/outreachAdminApi';
import type { OutreachCategory, OutreachChannel, OutreachStatus } from '../../lib/outreachAdminPayload';
import type { I18nManifest } from '../../lib/i18nManifest';
import { outreachStoragePublicUrl } from '../../lib/outreachPublicApi';
import { useWebsiteI18n } from '../../lib/websiteI18n';

export const OUTREACH_ADMIN_EDITOR_I18N_MANIFEST = {
  componentKey: 'components.outreach.admin.editor',
  namespace: 'admin.outreach',
  translationKeys: [] as const,
  keyPatterns: ['admin.outreach.*'] as const,
} as const satisfies I18nManifest;

export type OutreachEditorTab = 'contact' | 'campaign' | 'page' | 'media' | 'send';

const statusFilters: OutreachStatus[] = [
  'draft', 'ready', 'sent', 'opened', 'interested', 'meeting_planned', 'accepted', 'declined', 'no_response', 'archived',
];

const categoryOptions: OutreachCategory[] = ['work', 'collaboration', 'hosting', 'sponsoring', 'investment', 'technical_support'];
const channelOptions: OutreachChannel[] = ['email', 'whatsapp', 'instagram', 'linkedin', 'manual'];

function label(value: string | null | undefined) {
  if (!value) return '—';
  return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function toLocalInput(value: string | null | undefined) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
}

function fromLocalInput(value: string) {
  if (!value) return '';
  return new Date(value).toISOString();
}

function mediaPreviewUrl(item: Pick<OutreachPageMediaItem, 'external_url' | 'storage_bucket' | 'storage_path' | 'thumbnail_url'>) {
  return item.thumbnail_url || item.external_url || outreachStoragePublicUrl(item.storage_bucket ?? null, item.storage_path ?? null);
}

type Props = {
  selectedId: string;
  form: OutreachUpsertPayload;
  detail: OutreachDetail | null;
  saving: boolean;
  mediaItems: OutreachPageMediaItem[];
  onClose: () => void;
  onFormChange: (form: OutreachUpsertPayload) => void;
  onMediaItemsChange: (items: OutreachPageMediaItem[]) => void;
  onSaved: (detail: OutreachDetail, campaignId: string) => void;
  onError: (message: string) => void;
  onReload: () => Promise<void>;
};

export function OutreachAdminEditor({
  selectedId, form, detail, saving: parentSaving, mediaItems, onClose, onFormChange, onMediaItemsChange, onSaved, onError, onReload,
}: Props) {
  const { t, formatDate, languages } = useWebsiteI18n();
  const [tab, setTab] = useState<OutreachEditorTab>('contact');
  const [saving, setSaving] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiPreview, setAiPreview] = useState<OutreachUpsertPayload['page'] | null>(null);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [messages, setMessages] = useState<Awaited<ReturnType<typeof generateOutreachMessages>> | null>(null);
  const [copied, setCopied] = useState(false);
  const [maxVisits, setMaxVisits] = useState('');
  const [mediaQuery, setMediaQuery] = useState('');
  const [mediaResults, setMediaResults] = useState<OutreachMediaAssetRow[] | null>(null);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [saveStage, setSaveStage] = useState('');

  const busy = saving || parentSaving || aiGenerating;

  const statusLabel = (value: string | null | undefined) => t(`admin.outreach.status.${value}`, label(value));
  const categoryLabel = (value: string | null | undefined) => t(`admin.outreach.category.${value}`, label(value));
  const channelLabel = (value: string | null | undefined) => t(`admin.outreach.channel.${value}`, label(value));
  const formatTimestamp = (value: string | null | undefined) => {
    if (!value) return '—';
    return formatDate(value, { dateStyle: 'medium', timeStyle: 'short' });
  };

  function updateField(scope: keyof OutreachUpsertPayload, field: string, value: string) {
    onFormChange({ ...form, [scope]: { ...form[scope], [field]: value } });
  }

  const readiness = useMemo(() => ({
    contact: Boolean(form.contact.first_name?.trim() && form.contact.company_name?.trim()),
    slug: Boolean(form.page.slug?.trim()),
    page: Boolean(form.page.personal_intro?.trim() && form.page.why_them?.trim()),
  }), [form]);

  const copyLanguage = form.page.original_language || form.contact.language_code || 'en';

  useEffect(() => {
    let cancelled = false;
    setMediaLoading(true);
    void searchMediaAssetsForOutreach(mediaQuery)
      .then((items) => { if (!cancelled) setMediaResults(items); })
      .catch(() => { if (!cancelled) setMediaResults(null); })
      .finally(() => { if (!cancelled) setMediaLoading(false); });
    return () => { cancelled = true; };
  }, [mediaQuery, selectedId]);

  useEffect(() => {
    if (selectedId === 'new' || !detail?.campaign?.id) return;
    void getOutreachAiStatus(String(detail.campaign.id))
      .then((status) => {
        if (status.ai_generation_status === 'completed' && status.page) {
          setAiPreview(status.page);
        }
      })
      .catch(() => undefined);
  }, [detail?.campaign?.id, selectedId]);

  async function save() {
    if (!form.contact.first_name?.trim() || !form.contact.company_name?.trim()) {
      onError(t('admin.outreach.validation.required_contact', 'First name and company are required.'));
      return;
    }
    setSaving(true);
    setSaveStage(t('admin.outreach.save', 'Save outreach'));
    try {
      const payload: OutreachUpsertPayload = {
        contact: { ...form.contact, id: form.contact.id || (detail?.contact?.id as string | undefined) },
        campaign: {
          ...form.campaign,
          id: form.campaign.id || (detail?.campaign?.id as string | undefined),
          ai_brief: form.campaign.ai_brief,
        },
        page: {
          ...form.page,
          id: form.page.id || (detail?.page?.id as string | undefined),
          expires_at: form.page.expires_at ? fromLocalInput(String(form.page.expires_at)) : form.page.expires_at,
        },
      };
      const saved = await upsertOutreachCampaign(payload);
      const campaignId = String(saved.campaign?.id || '');
      if (!campaignId) throw new Error('missing-id');
      onSaved(saved, campaignId);
      await onReload();
    } catch {
      onError(t('admin.outreach.error.save', 'Outreach could not be saved.'));
    } finally {
      setSaving(false);
      setSaveStage('');
    }
  }

  async function saveMedia() {
    const pageId = String(detail?.page?.id || form.page.id || '');
    if (!pageId) {
      onError(t('admin.outreach.media.requires_save', 'Save the outreach page before linking media.'));
      return;
    }
    setSaving(true);
    try {
      await setOutreachPageMedia(pageId, mediaItems);
      await onReload();
    } catch {
      onError(t('admin.outreach.media.error', 'Media could not be saved.'));
    } finally {
      setSaving(false);
    }
  }

  async function generateAi() {
    const campaignId = selectedId === 'new' ? '' : selectedId;
    if (!campaignId) {
      onError(t('admin.outreach.ai.requires_save', 'Save the outreach campaign before generating AI copy.'));
      return;
    }
    const brief = String(form.campaign.ai_brief || '').trim();
    if (!brief) {
      onError(t('admin.outreach.ai.requires_brief', 'Add a private AI brief before generating.'));
      return;
    }
    setAiGenerating(true);
    setSaveStage(t('admin.outreach.ai.generating', 'Generating page copy…'));
    try {
      await prepareOutreachAi(campaignId, brief);
      const status = await generateOutreachAiContent(campaignId, (progress) => {
        setSaveStage(t('admin.outreach.ai.generating', 'Generating page copy…'));
        if (progress.ai_generation_status === 'completed' && progress.page) setAiPreview(progress.page);
      });
      if (status.page) setAiPreview(status.page);
      setSaveStage(t('admin.outreach.ai.completed', 'AI copy ready for review'));
      await onReload();
    } catch (reason) {
      onError(reason instanceof Error ? reason.message : t('admin.outreach.ai.failed', 'AI generation failed.'));
    } finally {
      setAiGenerating(false);
      window.setTimeout(() => setSaveStage(''), 2400);
    }
  }

  function applyAiPreview() {
    if (!aiPreview) return;
    onFormChange({
      ...form,
      page: {
        ...form.page,
        personal_intro: aiPreview.personal_intro || form.page.personal_intro,
        why_them: aiPreview.why_them || form.page.why_them,
        what_we_offer: aiPreview.what_we_offer || form.page.what_we_offer,
        what_we_ask: aiPreview.what_we_ask || form.page.what_we_ask,
        win_win: aiPreview.win_win || form.page.win_win,
        personal_message: aiPreview.personal_message || form.page.personal_message,
        mission_blurb: aiPreview.mission_blurb || form.page.mission_blurb,
        original_language: aiPreview.original_language || form.page.original_language,
      },
    });
  }

  async function createLink(regenerate = false) {
    if (!selectedId || selectedId === 'new') return;
    setSaving(true);
    try {
      const max = maxVisits ? Number(maxVisits) : null;
      const result = regenerate
        ? await regenerateOutreachToken(selectedId, max)
        : await generateOutreachToken(selectedId, max);
      setGeneratedLink(result.url);
      const nextMessages = await generateOutreachMessages(selectedId, result.raw_token);
      setMessages(nextMessages);
      await onReload();
    } catch {
      onError(t('admin.outreach.error.link', 'Secure link could not be generated.'));
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

  async function markSent() {
    if (!selectedId || selectedId === 'new') return;
    setSaving(true);
    try {
      await recordOutreachSent(selectedId, 'email', messages?.email.body || messages?.whatsapp.body);
      await updateOutreachStatus(selectedId, 'sent');
      await onReload();
    } catch {
      onError(t('admin.outreach.error.mark_sent', 'Outreach could not be marked as sent.'));
    } finally {
      setSaving(false);
    }
  }

  async function setStatusValue(nextStatus: OutreachStatus) {
    if (!selectedId || selectedId === 'new') return;
    setSaving(true);
    try {
      await updateOutreachStatus(selectedId, nextStatus);
      updateField('campaign', 'status', nextStatus);
      await onReload();
    } catch {
      onError(t('admin.outreach.error.status', 'Status update failed.'));
    } finally {
      setSaving(false);
    }
  }

  async function revokeToken() {
    const tokenId = detail?.token?.id;
    if (!tokenId || typeof tokenId !== 'string') return;
    setSaving(true);
    try {
      await revokeOutreachToken(tokenId);
      setGeneratedLink(null);
      await onReload();
    } catch {
      onError(t('admin.outreach.error.revoke', 'Token revoke failed.'));
    } finally {
      setSaving(false);
    }
  }

  function addMediaAsset(asset: OutreachMediaAssetRow) {
    if (mediaItems.some((item) => item.media_asset_id === asset.id)) return;
    onMediaItemsChange([...mediaItems, {
      media_asset_id: asset.id,
      sort_order: mediaItems.length,
      caption: '',
      title: asset.title,
      asset_type: asset.asset_type,
      storage_bucket: asset.storage_bucket,
      storage_path: asset.storage_path,
      external_url: asset.external_url,
      thumbnail_url: asset.thumbnail_url,
    }]);
  }

  function moveMediaItem(mediaAssetId: string, direction: -1 | 1) {
    const index = mediaItems.findIndex((item) => item.media_asset_id === mediaAssetId);
    if (index < 0) return;
    const target = index + direction;
    if (target < 0 || target >= mediaItems.length) return;
    const next = [...mediaItems];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    onMediaItemsChange(next.map((row, sort) => ({ ...row, sort_order: sort })));
  }

  const tabs: { id: OutreachEditorTab; label: string }[] = [
    { id: 'contact', label: t('admin.outreach.tab.contact', 'Contact') },
    { id: 'campaign', label: t('admin.outreach.tab.campaign', 'Campaign') },
    { id: 'page', label: t('admin.outreach.tab.page', 'Page') },
    { id: 'media', label: t('admin.outreach.tab.media', 'Media') },
    { id: 'send', label: t('admin.outreach.tab.send', 'Send') },
  ];

  return (
    <div className="admin-editor-backdrop" onClick={onClose}>
      <form className="admin-editor outreach-admin-editor outreach-editor-premium" onClick={(event) => event.stopPropagation()} onSubmit={(event) => { event.preventDefault(); void save(); }}>
        <header className="admin-editor-header outreach-editor-premium__header">
          <div>
            <p>{selectedId === 'new' ? t('admin.outreach.create', 'New outreach') : t('admin.outreach.editor.title', 'Outreach editor').toUpperCase()}</p>
            <h2>{selectedId === 'new' ? t('admin.outreach.create', 'New outreach') : String(form.contact.company_name || t('admin.outreach.editor.title', 'Outreach editor'))}</h2>
            <span>{statusLabel(String(form.campaign.status || 'draft'))}</span>
          </div>
          <button type="button" onClick={onClose}><X size={18} /></button>
        </header>

        <nav className="outreach-editor-tabs" aria-label={t('admin.outreach.editor.title', 'Outreach editor')}>
          {tabs.map((item) => (
            <button
              className={tab === item.id ? 'active' : ''}
              key={item.id}
              onClick={() => setTab(item.id)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="outreach-premium-layout">
          <main className="outreach-premium-main">
            {tab === 'contact' ? (
              <section className="outreach-panel">
                <div className="outreach-panel-heading"><span>01</span><h3>{t('admin.outreach.section.contact', 'Contact')}</h3></div>
                <div className="outreach-field-grid">
                  <label>{t('admin.outreach.field.first_name', 'First name')}<input value={String(form.contact.first_name || '')} onChange={(e) => updateField('contact', 'first_name', e.target.value)} required /></label>
                  <label>{t('admin.outreach.field.last_name', 'Last name')}<input value={String(form.contact.last_name || '')} onChange={(e) => updateField('contact', 'last_name', e.target.value)} /></label>
                  <label>{t('admin.outreach.field.company', 'Company')}<input value={String(form.contact.company_name || '')} onChange={(e) => updateField('contact', 'company_name', e.target.value)} required /></label>
                  <label>{t('admin.outreach.field.job_title', 'Job title')}<input value={String(form.contact.job_title || '')} onChange={(e) => updateField('contact', 'job_title', e.target.value)} /></label>
                  <label>{t('admin.outreach.field.email', 'Email')}<input type="email" value={String(form.contact.email || '')} onChange={(e) => updateField('contact', 'email', e.target.value)} /></label>
                  <label>{t('admin.outreach.field.phone', 'Phone')}<input value={String(form.contact.phone || '')} onChange={(e) => updateField('contact', 'phone', e.target.value)} /></label>
                  <label>{t('admin.outreach.field.whatsapp', 'WhatsApp')}<input value={String(form.contact.whatsapp || '')} onChange={(e) => updateField('contact', 'whatsapp', e.target.value)} /></label>
                  <label>{t('admin.outreach.field.website', 'Website')}<input value={String(form.contact.website || '')} onChange={(e) => updateField('contact', 'website', e.target.value)} /></label>
                  <label>{t('admin.outreach.field.instagram', 'Instagram')}<input value={String(form.contact.instagram || '')} onChange={(e) => updateField('contact', 'instagram', e.target.value)} /></label>
                  <label>{t('admin.outreach.field.linkedin', 'LinkedIn')}<input value={String(form.contact.linkedin || '')} onChange={(e) => updateField('contact', 'linkedin', e.target.value)} /></label>
                  <label className="full">{t('admin.outreach.field.location', 'Location')}<input value={String(form.contact.location || '')} onChange={(e) => updateField('contact', 'location', e.target.value)} /></label>
                  <label>{t('admin.outreach.field.language', 'Language')}
                    <select value={String(form.contact.language_code || 'en')} onChange={(e) => updateField('contact', 'language_code', e.target.value)}>
                      {languages.map((language) => <option key={language.code} value={language.code}>{language.native_name}</option>)}
                    </select>
                  </label>
                </div>
              </section>
            ) : null}

            {tab === 'campaign' ? (
              <section className="outreach-panel">
                <div className="outreach-panel-heading"><span>02</span><h3>{t('admin.outreach.section.campaign', 'Campaign')}</h3></div>
                <div className="outreach-field-grid">
                  <label>{t('admin.outreach.field.category', 'Category')}
                    <select value={String(form.campaign.category || 'collaboration')} onChange={(e) => updateField('campaign', 'category', e.target.value)}>
                      {categoryOptions.map((item) => <option key={item} value={item}>{categoryLabel(item)}</option>)}
                    </select>
                  </label>
                  <label>{t('admin.outreach.field.status', 'Status')}
                    <select value={String(form.campaign.status || 'draft')} onChange={(e) => updateField('campaign', 'status', e.target.value)}>
                      {statusFilters.map((item) => <option key={item} value={item}>{statusLabel(item)}</option>)}
                    </select>
                  </label>
                  <label>{t('admin.outreach.field.outreach_channel', 'Outreach channel')}
                    <select value={String(form.campaign.outreach_channel || '')} onChange={(e) => updateField('campaign', 'outreach_channel', e.target.value)}>
                      <option value="">—</option>
                      {channelOptions.map((item) => <option key={item} value={item}>{channelLabel(item)}</option>)}
                    </select>
                  </label>
                  <label>{t('admin.outreach.field.responsible_email', 'Responsible email')}<input value={String(form.campaign.responsible_email || '')} onChange={(e) => updateField('campaign', 'responsible_email', e.target.value)} /></label>
                  <label className="full">{t('admin.outreach.field.internal_notes', 'Internal notes')}<textarea value={String(form.campaign.internal_notes || '')} onChange={(e) => updateField('campaign', 'internal_notes', e.target.value)} /></label>
                </div>
                {selectedId !== 'new' ? (
                  <div className="outreach-meta-grid">
                    <p>{t('admin.outreach.meta.visits', '{count} visits', { count: String(detail?.campaign?.visit_count ?? 0) })}</p>
                    <p>{detail?.campaign?.sent_at ? t('admin.outreach.meta.sent_at', 'Sent {date}', { date: formatTimestamp(String(detail.campaign.sent_at)) }) : '—'}</p>
                    <p>{detail?.campaign?.last_opened_at ? t('admin.outreach.meta.last_opened', 'Last opened {date}', { date: formatTimestamp(String(detail.campaign.last_opened_at)) }) : '—'}</p>
                  </div>
                ) : null}
              </section>
            ) : null}

            {tab === 'page' ? (
              <>
                <section className="outreach-panel">
                  <div className="outreach-panel-heading"><span>03</span><h3>{t('admin.outreach.section.page_content', 'Page content')}</h3></div>
                  <div className="outreach-field-grid">
                    <label>{t('admin.outreach.field.slug', 'Slug')}<input value={String(form.page.slug || '')} onChange={(e) => updateField('page', 'slug', e.target.value)} /></label>
                    <label>{t('admin.outreach.field.original_language', 'Page language')}
                      <select value={String(form.page.original_language || form.contact.language_code || 'en')} onChange={(e) => updateField('page', 'original_language', e.target.value)}>
                        {languages.map((language) => <option key={language.code} value={language.code}>{language.native_name}</option>)}
                      </select>
                    </label>
                    <label>{t('admin.outreach.field.expires_at', 'Page expires')}<input type="datetime-local" value={toLocalInput(String(form.page.expires_at || detail?.page?.expires_at || ''))} onChange={(e) => updateField('page', 'expires_at', e.target.value)} /></label>
                    <label>{t('admin.outreach.field.whatsapp_override', 'WhatsApp override')}<input value={String(form.page.whatsapp_override || '')} onChange={(e) => updateField('page', 'whatsapp_override', e.target.value)} /></label>
                    <label>{t('admin.outreach.field.meeting_url', 'Meeting URL')}<input value={String(form.page.meeting_url || '')} onChange={(e) => updateField('page', 'meeting_url', e.target.value)} /></label>
                    <label>{t('admin.outreach.field.founder_video', 'Founder video')}
                      <select value={String(form.page.founder_video_media_id || '')} onChange={(e) => updateField('page', 'founder_video_media_id', e.target.value)}>
                        <option value="">—</option>
                        {(mediaResults || []).map((asset) => <option key={asset.id} value={asset.id}>{asset.title || asset.id}</option>)}
                      </select>
                    </label>
                  </div>
                  <div className="outreach-field-stack">
                    <label>{t('admin.outreach.field.personal_intro', 'Personal intro')}<textarea value={String(form.page.personal_intro || '')} onChange={(e) => updateField('page', 'personal_intro', e.target.value)} /></label>
                    <label>{t('admin.outreach.field.why_them', 'Why them')}<textarea value={String(form.page.why_them || '')} onChange={(e) => updateField('page', 'why_them', e.target.value)} /></label>
                    <label>{t('admin.outreach.field.what_we_offer', 'What we offer')}<textarea value={String(form.page.what_we_offer || '')} onChange={(e) => updateField('page', 'what_we_offer', e.target.value)} /></label>
                    <label>{t('admin.outreach.field.what_we_ask', 'What we ask')}<textarea value={String(form.page.what_we_ask || '')} onChange={(e) => updateField('page', 'what_we_ask', e.target.value)} /></label>
                    <label>{t('admin.outreach.field.win_win', 'Win-win')}<textarea value={String(form.page.win_win || '')} onChange={(e) => updateField('page', 'win_win', e.target.value)} /></label>
                    <label>{t('admin.outreach.field.personal_message', 'Personal message')}<textarea value={String(form.page.personal_message || '')} onChange={(e) => updateField('page', 'personal_message', e.target.value)} /></label>
                    <label>{t('admin.outreach.field.mission_blurb', 'Mission blurb')}<textarea value={String(form.page.mission_blurb || '')} onChange={(e) => updateField('page', 'mission_blurb', e.target.value)} /></label>
                  </div>
                </section>

                <section className="outreach-panel outreach-ai-panel">
                  <div className="outreach-panel-heading"><span>04</span><div><h3>{t('admin.outreach.field.ai_brief', 'Private AI brief')}</h3><p>{t('admin.outreach.ai.brief_hint', 'Write quick private notes. AI uses these plus contact data to draft page copy.')}</p></div><Sparkles size={20} /></div>
                  <label>{t('admin.outreach.field.ai_brief', 'Private AI brief')}<textarea rows={6} value={String(form.campaign.ai_brief || '')} onChange={(e) => updateField('campaign', 'ai_brief', e.target.value)} /></label>
                  <div className="outreach-admin-editor__actions">
                    <button disabled={busy || selectedId === 'new'} onClick={() => void generateAi()} type="button">
                      {aiGenerating ? <LoaderCircle className="spin" size={16} /> : <Sparkles size={16} />}
                      {t('admin.outreach.ai.generate', 'Generate page copy')}
                    </button>
                    {aiPreview ? <button disabled={busy} onClick={applyAiPreview} type="button">{t('admin.outreach.ai.apply', 'Apply AI copy to form')}</button> : null}
                  </div>
                  {aiPreview ? (
                    <div className="outreach-ai-preview">
                      <p>{t('admin.outreach.ai.completed', 'AI copy ready for review')}</p>
                      {Object.entries(aiPreview).filter(([, value]) => typeof value === 'string' && value).map(([key, value]) => (
                        <div key={key}><strong>{key}</strong><p>{String(value)}</p></div>
                      ))}
                    </div>
                  ) : null}
                </section>
              </>
            ) : null}

            {tab === 'media' ? (
              <section className="outreach-panel">
                <div className="outreach-panel-heading"><span>05</span><h3>{t('admin.outreach.section.media', 'Page media')}</h3></div>
                <div className="admin-section-toolbar">
                  <div><Search size={17} /><input value={mediaQuery} onChange={(e) => setMediaQuery(e.target.value)} placeholder={t('admin.outreach.media.search_placeholder', 'Search media assets...')} /></div>
                </div>
                {mediaLoading ? <div className="admin-loading"><LoaderCircle className="spin" /></div> : null}
                <div className="outreach-admin-media__search">
                  {(mediaResults || []).map((asset) => (
                    <button className="outreach-admin-media__pick" disabled={busy} key={asset.id} onClick={() => addMediaAsset(asset)} type="button">
                      {mediaPreviewUrl(asset) ? <img alt="" src={mediaPreviewUrl(asset)} /> : <ImagePlus size={18} />}
                      <span>{asset.title || asset.asset_type || asset.id}</span>
                    </button>
                  ))}
                </div>
                {mediaItems.length === 0 ? <div className="admin-section-empty">{t('admin.outreach.media.empty', 'No media linked yet.')}</div> : null}
                <div className="outreach-admin-media__list">
                  {mediaItems.map((item) => (
                    <article className="outreach-admin-editor__panel" key={item.media_asset_id}>
                      <div className="outreach-admin-media__row">
                        {mediaPreviewUrl(item) ? <img alt="" className="outreach-admin-media__thumb" src={mediaPreviewUrl(item)} /> : null}
                        <div>
                          <strong>{item.title || item.media_asset_id}</strong>
                          <label>{t('admin.outreach.field.media_caption', 'Caption')}<input value={item.caption} onChange={(e) => onMediaItemsChange(mediaItems.map((row) => row.media_asset_id === item.media_asset_id ? { ...row, caption: e.target.value } : row))} /></label>
                        </div>
                        <div className="outreach-media-actions">
                          <button onClick={() => moveMediaItem(item.media_asset_id, -1)} type="button">{t('admin.outreach.media.move_up', 'Move up')}<ArrowUp size={14} /></button>
                          <button onClick={() => moveMediaItem(item.media_asset_id, 1)} type="button">{t('admin.outreach.media.move_down', 'Move down')}<ArrowDown size={14} /></button>
                          <button onClick={() => onMediaItemsChange(mediaItems.filter((row) => row.media_asset_id !== item.media_asset_id).map((row, index) => ({ ...row, sort_order: index })))} type="button">{t('admin.outreach.media.remove', 'Remove')}</button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
                <div className="outreach-admin-editor__actions">
                  <button disabled={busy || selectedId === 'new'} onClick={() => void saveMedia()} type="button">{t('admin.outreach.media.save', 'Save media')}</button>
                </div>
              </section>
            ) : null}

            {tab === 'send' ? (
              <section className="outreach-panel">
                <div className="outreach-panel-heading"><span>06</span><h3>{t('admin.outreach.section.messages', 'Generated messages')}</h3></div>
                <label>{t('admin.outreach.field.max_visits', 'Max visits')}<input inputMode="numeric" value={maxVisits} onChange={(e) => setMaxVisits(e.target.value)} placeholder="—" /></label>
                <div className="outreach-admin-editor__actions">
                  <button disabled={busy || selectedId === 'new'} onClick={() => void createLink(false)} type="button"><Link2 size={15} /> {t('admin.outreach.generate_link', 'Generate secure link')}</button>
                  <button disabled={busy || selectedId === 'new'} onClick={() => void createLink(true)} type="button">{t('admin.outreach.regenerate_link', 'Regenerate link')}</button>
                  {detail?.token?.id ? <button disabled={busy} onClick={() => void revokeToken()} type="button">{t('admin.outreach.revoke_link', 'Revoke link')}</button> : null}
                  <button disabled={busy || selectedId === 'new'} onClick={() => void setStatusValue('ready')} type="button">{t('admin.outreach.mark_ready', 'Mark ready')}</button>
                </div>
                {generatedLink ? (
                  <div className="outreach-admin-editor__panel">
                    <p className="outreach-admin-editor__mono">{generatedLink}</p>
                    <div className="outreach-admin-editor__actions">
                      <button onClick={() => void copyLink()} type="button"><Copy size={15} /> {copied ? t('admin.outreach.copied', 'Copied') : t('admin.outreach.copy_link', 'Copy magic link')}</button>
                      <button disabled={busy || selectedId === 'new'} onClick={() => void markSent()} type="button"><Send size={15} /> {t('admin.outreach.mark_sent', 'Mark as sent')}</button>
                    </div>
                  </div>
                ) : null}
                {messages ? (
                  <div className="outreach-admin-messages">
                    {(['email', 'whatsapp', 'instagram', 'linkedin'] as const).map((channel) => (
                      <div className="outreach-admin-editor__panel" key={channel}>
                        <strong>{t(`admin.outreach.message.${channel}`, channel)}</strong>
                        <pre>{messages[channel].body}</pre>
                        {channel === 'email' && messages.email.mailto_url ? <a href={messages.email.mailto_url}>{t('admin.outreach.message.open_mailto', 'Open mailto')}</a> : null}
                        {channel === 'whatsapp' && messages.whatsapp.wa_me_url ? <a href={messages.whatsapp.wa_me_url} rel="noopener noreferrer" target="_blank">{t('admin.outreach.message.open_whatsapp', 'Open WhatsApp')}</a> : null}
                      </div>
                    ))}
                  </div>
                ) : null}
                {detail?.responses?.length ? (
                  <section>
                    <h3>{t('admin.outreach.section.responses', 'Responses')}</h3>
                    {detail.responses.map((response) => (
                      <div className="outreach-admin-editor__panel" key={String(response.id)}>
                        <strong>{statusLabel(String(response.response_type || ''))}</strong>
                        <p>{String(response.message || '—')}</p>
                        <span>{formatTimestamp(String(response.created_at || ''))}</span>
                      </div>
                    ))}
                  </section>
                ) : null}
                {detail?.events?.length ? (
                  <section>
                    <h3>{t('admin.outreach.section.events', 'Recent events')}</h3>
                    {detail.events.slice(0, 8).map((eventItem) => (
                      <div className="outreach-admin-editor__panel" key={String(eventItem.id)}>
                        <strong>{label(String(eventItem.event_type || ''))}</strong>
                        <span>{formatTimestamp(String(eventItem.occurred_at || ''))}</span>
                      </div>
                    ))}
                  </section>
                ) : null}
              </section>
            ) : null}
          </main>

          <aside className="outreach-publish-sidebar">
            <section>
              <p>{t('admin.outreach.readiness.title', 'Readiness')}</p>
              <ul className="outreach-readiness-list">
                <li className={readiness.contact ? 'done' : ''}><CheckCircle2 size={15} />{t('admin.outreach.readiness.contact', 'Contact details')}</li>
                <li className={readiness.slug ? 'done' : ''}><CheckCircle2 size={15} />{t('admin.outreach.readiness.slug', 'Slug set')}</li>
                <li className={readiness.page ? 'done' : ''}><CheckCircle2 size={15} />{t('admin.outreach.readiness.page', 'Page copy')}</li>
              </ul>
            </section>
            <section>
              <p>{t('admin.outreach.sidebar.language', 'Copy language')}</p>
              <div className="outreach-language-chip">{copyLanguage.toUpperCase()}</div>
            </section>
            {form.page.expires_at || detail?.page?.expires_at ? (
              <section>
                <p>{t('admin.outreach.sidebar.expires', 'Page expires')}</p>
                <small>{formatTimestamp(String(form.page.expires_at || detail?.page?.expires_at || ''))}</small>
              </section>
            ) : null}
            {generatedLink ? (
              <section>
                <a href={generatedLink} rel="noopener noreferrer" target="_blank"><ExternalLink size={14} /> {t('admin.outreach.sidebar.open_page', 'Open private page')}</a>
              </section>
            ) : null}
            <section>
              <p>{t('admin.outreach.field.status', 'Status')}</p>
              <strong>{statusLabel(String(form.campaign.status || 'draft'))}</strong>
            </section>
          </aside>
        </div>

        <footer className="outreach-editor-premium__footer">
          <button disabled={busy} onClick={onClose} type="button">{t('admin.outreach.close', 'Close')}</button>
          {saveStage ? <span className="outreach-save-stage" role="status" aria-live="polite">{saveStage}</span> : null}
          <button className="primary" disabled={busy} type="submit">
            {busy ? <LoaderCircle className="spin" size={16} /> : <Mail size={16} />}
            {t('admin.outreach.save', 'Save outreach')}
          </button>
        </footer>
      </form>
    </div>
  );
}
