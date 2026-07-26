import { useEffect, useMemo, useRef, useState } from 'react';
import { Edit3, ExternalLink, LoaderCircle, Play, RefreshCw, Save, Search, Trash2, Upload, X } from 'lucide-react';
import {
  deleteMediaAsset,
  getMediaAssetEditor,
  listAdminMediaVaultGroups,
  saveMediaAssetEditor,
  uploadConceptMedia,
  uploadOfferMedia,
  type AdminMediaVaultAsset,
  type AdminMediaVaultCategoryGroup,
  type AdminMediaVaultConceptGroup,
  type AdminMediaVaultGroups,
  type AdminMediaVaultOfferGroup,
  type AdminMediaVaultPostGroup,
  type MediaApplication,
  type MediaAssetEditorPayload,
  type MediaAssetEditorRecord,
} from '../lib/offerMediaAdminApi';
import {
  appendJournalFootage,
  deleteJournalFootage,
  getAdminJournalFootage,
  getJournalEventContext,
  journalEventDefaults,
  type AdminJournalFootageItem,
} from '../lib/journalAdminApi';
import type { I18nManifest } from '../lib/i18nManifest';
import { resolvePublicMediaUrl } from '../lib/journalFootage';
import { useWebsiteI18n } from '../lib/websiteI18n';

export const ADMIN_MEDIA_VAULT_OFFERS_PAGE_I18N_MANIFEST = {
  componentKey: 'admin.media_vault.page',
  namespace: 'admin.media',
  translationKeys: [] as const,
  keyPatterns: ['admin.*'] as const,
  entityContent: {
    rpc: 'admin_get_media_asset_editor',
    tables: ['media_assets', 'media_usage_types', 'media_asset_usage_types', 'proof_of_mind_concept_media', 'proof_of_mind_mockup_screens'],
  },
} as const satisfies I18nManifest;

type Filter = 'all' | 'journal' | 'offers' | 'concepts' | 'founders' | 'journey_events' | 'other';
type OpenGroup =
  | { kind: 'post'; value: AdminMediaVaultPostGroup }
  | { kind: 'offer'; value: AdminMediaVaultOfferGroup }
  | { kind: 'concept'; value: AdminMediaVaultConceptGroup }
  | { kind: 'category'; value: AdminMediaVaultCategoryGroup };
type DetailAsset = AdminMediaVaultAsset | (AdminJournalFootageItem & { title?: string | null });
type PreviewValue = { type: 'image' | 'video'; url: string } | null;
type PreviewInput = {
  thumbnail_url?: string | null;
  storage_bucket?: string | null;
  storage_path?: string | null;
  asset_type?: string | null;
  cover_thumbnail_url?: string | null;
  cover_storage_bucket?: string | null;
  cover_storage_path?: string | null;
  cover_asset_type?: string | null;
};

function preview(input: PreviewInput): PreviewValue {
  const thumbnailUrl = input.thumbnail_url ?? input.cover_thumbnail_url;
  const storageBucket = input.storage_bucket ?? input.cover_storage_bucket;
  const storagePath = input.storage_path ?? input.cover_storage_path;
  const assetType = input.asset_type ?? input.cover_asset_type;
  const thumbnail = resolvePublicMediaUrl(thumbnailUrl);
  if (thumbnail) return { type: 'image', url: thumbnail };
  const url = resolvePublicMediaUrl(null, storageBucket, storagePath);
  if (!url) return null;
  return { type: String(assetType).toLowerCase() === 'video' ? 'video' : 'image', url };
}

function Preview({ value, alt }: { value: PreviewValue; alt: string }) {
  if (!value) return <div className="admin-media-placeholder">MEDIA</div>;
  if (value.type === 'video') return <span className="admin-media-preview-video-wrap"><video className="admin-media-preview-video" src={value.url} muted playsInline preload="metadata" aria-label={alt} /><span className="admin-media-preview-play"><Play size={18} /></span></span>;
  return <img src={value.url} alt={alt} />;
}

function categoryFilter(key: string): Filter | null {
  if (key === 'journal_unlinked') return 'journal';
  if (key === 'founders' || key === 'journey_events' || key === 'other') return key;
  return null;
}

const readonlyAssetFields = ['id', 'storage_bucket', 'storage_path', 'original_filename', 'mime_type', 'file_extension', 'file_size_bytes', 'width', 'height', 'provider', 'created_at'] as const;
const statusOptions = ['draft', 'uploading', 'processing', 'ready', 'published', 'failed', 'archived'] as const;
const visibilityOptions = ['private', 'unlisted', 'public'] as const;
const placementOptions = ['gallery', 'hero', 'thumbnail', 'cover', 'mockup_screen', 'social'] as const;
const imageStatusOptions = ['brief_ready', 'ready', 'generating', 'failed', 'approved'] as const;

function stringValue(value: unknown) { return typeof value === 'string' ? value : ''; }
function toDateTimeLocal(value: unknown) {
  if (typeof value !== 'string' || !value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 16);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}
function uniqueStrings(values: string[]) { return [...new Set(values.filter(Boolean))]; }

type MediaAssetEditorProps = { assetId: string; onClose: () => void; onSaved: () => Promise<void> };

function MediaAssetEditor({ assetId, onClose, onSaved }: MediaAssetEditorProps) {
  const { t } = useWebsiteI18n();
  const [record, setRecord] = useState<MediaAssetEditorRecord | null>(null);
  const [form, setForm] = useState<MediaAssetEditorPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getMediaAssetEditor(assetId).then((next) => {
      if (!active) return;
      setRecord(next);
      const mockup = next.applications.find((item) => item.relation_table === 'proof_of_mind_mockup_screens');
      setForm({
        asset: {
          title: stringValue(next.asset.title), description: stringValue(next.asset.description), alt_text: stringValue(next.asset.alt_text),
          caption: stringValue(next.asset.caption), language_code: stringValue(next.asset.language_code), tags: Array.isArray(next.asset.tags) ? next.asset.tags : [],
          captured_at: toDateTimeLocal(next.asset.captured_at), visibility: stringValue(next.asset.visibility), status: stringValue(next.asset.status),
          published_at: toDateTimeLocal(next.asset.published_at), show_in_media_vault: next.asset.show_in_media_vault === true,
        },
        usage_type_keys: next.usage_types.map((item) => item.key),
        concept_media: next.applications.filter((item) => item.relation_table === 'proof_of_mind_concept_media'),
        mockup_screen: mockup?.details || null,
      });
    }).catch((reason) => setError(reason instanceof Error ? reason.message : t('admin.media.editor.load_error', 'Media could not be loaded.')))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [assetId, t]);

  const patchAsset = (key: keyof MediaAssetEditorPayload['asset'], value: string | string[] | boolean) => setForm((current) => current ? ({ ...current, asset: { ...current.asset, [key]: value } }) : current);
  const patchRelation = (relationId: string, key: keyof MediaApplication, value: string | number | boolean) => setForm((current) => current ? ({ ...current, concept_media: current.concept_media.map((item) => item.relation_id === relationId ? { ...item, [key]: value } : item) }) : current);
  const toggleUsage = (key: string) => setForm((current) => current ? ({ ...current, usage_type_keys: current.usage_type_keys.includes(key) ? current.usage_type_keys.filter((item) => item !== key) : [...current.usage_type_keys, key] }) : current);
  const wantsMockup = Boolean(form?.usage_type_keys.includes('mockup_screen'));
  const mockup = form?.mockup_screen || {};
  const patchMockup = (key: string, value: string | number) => setForm((current) => current ? ({ ...current, mockup_screen: { ...(current.mockup_screen || {}), [key]: value } }) : current);

  const languageOptions = useMemo(() => uniqueStrings([
    stringValue(record?.asset.language_code),
    'en', 'nl', 'es', 'fr', 'de', 'pt', 'it', 'ko', 'ja', 'zh', 'ar', 'hi', 'tr', 'pl', 'uk', 'ru', 'sv', 'no', 'da', 'fi', 'cs', 'ro', 'hu', 'el', 'he', 'id', 'th', 'vi', 'ms', 'ca',
  ]), [record]);

  const isValid = Boolean(form?.asset.title.trim())
    && Boolean(form?.asset.visibility)
    && Boolean(form?.asset.status)
    && (!wantsMockup || Boolean(stringValue(mockup.concept_id) && stringValue(mockup.screen_name) && stringValue(mockup.screen_key)));

  async function save() {
    if (!form || !isValid) return;
    setSaving(true); setError(null); setNotice(null);
    try {
      const payload: MediaAssetEditorPayload = {
        ...form,
        asset: {
          ...form.asset,
          tags: uniqueStrings(form.asset.tags.map((tag) => tag.trim())),
          captured_at: form.asset.captured_at ? new Date(form.asset.captured_at).toISOString() : '',
          published_at: form.asset.published_at ? new Date(form.asset.published_at).toISOString() : '',
        },
      };
      const next = await saveMediaAssetEditor(assetId, payload);
      setRecord(next);
      setNotice(t('admin.media.editor.save_success', 'Media saved.'));
      await onSaved();
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t('admin.media.editor.save_error', 'Media could not be saved.'));
    } finally { setSaving(false); }
  }

  async function remove() {
    if (!record || !window.confirm(t('admin.media.editor.delete_confirm', 'Delete this unused media asset permanently?'))) return;
    setDeleting(true); setError(null); setNotice(null);
    try {
      await deleteMediaAsset(assetId);
      await onSaved();
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t('admin.media.editor.delete_blocked', 'This media asset is still in use. Unlink its applications first.'));
    } finally { setDeleting(false); }
  }

  const busy = saving || deleting;

  return <div className="admin-editor-backdrop admin-media-editor-backdrop"><section className="admin-editor admin-media-asset-editor">
    <header><div><p>{t('admin.media.editor.eyebrow', 'MEDIA ASSET')}</p><h2>{t('admin.media.editor.title', 'Edit media')}</h2></div><button type="button" onClick={onClose} disabled={busy}><X /></button></header>
    <div className="admin-media-asset-editor__body">
      {loading ? <div className="admin-loading"><LoaderCircle className="spin" /> {t('admin.loading.live_data', 'Loading live data…')}</div> : null}
      {error ? <div className="admin-error">{error}</div> : null}
      {notice ? <div className="admin-notice">{notice}</div> : null}
      {record && form ? <>
        <section><h3>{t('admin.media.editor.metadata', 'General metadata')}</h3><div className="admin-media-editor-grid">
          <label><span>title</span><input value={form.asset.title} required onChange={(event) => patchAsset('title', event.target.value)} /></label>
          <label><span>language</span><select value={form.asset.language_code} onChange={(event) => patchAsset('language_code', event.target.value)}><option value="">—</option>{languageOptions.map((code) => <option key={code} value={code}>{code}</option>)}</select></label>
          <label><span>visibility</span><select value={form.asset.visibility} onChange={(event) => patchAsset('visibility', event.target.value)}>{visibilityOptions.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
          <label><span>status</span><select value={form.asset.status} onChange={(event) => patchAsset('status', event.target.value)}>{statusOptions.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
          <label><span>captured at</span><input type="datetime-local" value={form.asset.captured_at} onChange={(event) => patchAsset('captured_at', event.target.value)} /></label>
          <label><span>published at</span><input type="datetime-local" value={form.asset.published_at} onChange={(event) => patchAsset('published_at', event.target.value)} /></label>
          <label className="wide"><span>description</span><textarea value={form.asset.description} onChange={(event) => patchAsset('description', event.target.value)} /></label>
          <label className="wide"><span>alt text</span><textarea value={form.asset.alt_text} onChange={(event) => patchAsset('alt_text', event.target.value)} /></label>
          <label className="wide"><span>caption</span><textarea value={form.asset.caption} onChange={(event) => patchAsset('caption', event.target.value)} /></label>
          <label className="wide"><span>{t('admin.media.editor.tags', 'Tags')}</span><input value={form.asset.tags.join(', ')} onChange={(event) => patchAsset('tags', event.target.value.split(',').map((tag) => tag.trim()).filter(Boolean))} /></label>
          <label className="admin-media-editor-check"><input type="checkbox" checked={form.asset.show_in_media_vault} onChange={(event) => patchAsset('show_in_media_vault', event.target.checked)} /> {t('admin.media.editor.show_in_vault', 'Show in Media Vault')}</label>
        </div></section>
        <section><h3>{t('admin.media.editor.usage', 'Functional usage')}</h3><div className="admin-media-editor-usages">{record.available_usage_types.map((usage) => <label key={usage.key}><input type="checkbox" checked={form.usage_type_keys.includes(usage.key)} onChange={() => toggleUsage(usage.key)} /><span>{usage.display_name}</span></label>)}</div><small>{t('admin.media.editor.asset_type_help', 'Technical asset type remains unchanged: {type}', { type: stringValue(record.asset.asset_type) })}</small></section>
        {wantsMockup ? <section><h3>{t('admin.media.editor.mockup', 'Mockup screen link')}</h3><div className="admin-media-editor-grid">
          <label><span>{t('admin.media.editor.existing_mockup', 'Existing or new screen')}</span><select value={stringValue(mockup.id)} onChange={(event) => { const selected = record.mockup_screens.find((item) => item.id === event.target.value); setForm((current) => current ? ({ ...current, mockup_screen: selected || { concept_id: stringValue(current.mockup_screen?.concept_id) } }) : current); }}><option value="">{t('admin.media.editor.new_mockup', 'Create new screen')}</option>{record.mockup_screens.map((screen) => <option key={stringValue(screen.id)} value={stringValue(screen.id)}>{stringValue(screen.screen_name)}</option>)}</select></label>
          <label><span>{t('admin.media.editor.concept', 'Proof of Mind concept')}</span><select value={stringValue(mockup.concept_id)} onChange={(event) => patchMockup('concept_id', event.target.value)}><option value="">—</option>{record.concepts.map((concept) => <option key={concept.id} value={concept.id}>{concept.title}</option>)}</select></label>
          <label><span>screen name</span><input value={stringValue(mockup.screen_name)} onChange={(event) => patchMockup('screen_name', event.target.value)} /></label>
          <label><span>screen key</span><input value={stringValue(mockup.screen_key)} onChange={(event) => patchMockup('screen_key', event.target.value)} /></label>
          <label><span>screen purpose</span><input value={stringValue(mockup.screen_purpose)} onChange={(event) => patchMockup('screen_purpose', event.target.value)} /></label>
          <label><span>primary user role</span><input value={stringValue(mockup.primary_user_role)} onChange={(event) => patchMockup('primary_user_role', event.target.value)} /></label>
          <label><span>image alt</span><input value={stringValue(mockup.image_alt)} onChange={(event) => patchMockup('image_alt', event.target.value)} /></label>
          <label><span>image status</span><select value={stringValue(mockup.image_status)} onChange={(event) => patchMockup('image_status', event.target.value)}><option value="">—</option>{imageStatusOptions.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
          <label><span>{t('admin.media.editor.display_order', 'Display order')}</span><input type="number" value={Number(mockup.display_order || 0)} onChange={(event) => patchMockup('display_order', Number(event.target.value))} /></label>
        </div></section> : null}
        <section><h3>{t('admin.media.editor.applications', 'Linked applications')}</h3>{record.applications.length ? <div className="admin-media-editor-relations">{record.applications.map((application) => {
          const editableRelation = form.concept_media.find((item) => item.relation_id === application.relation_id);
          return <article key={`${application.relation_table}:${application.relation_id}`}><strong>{application.entity_title || application.entity_type}</strong><small>{application.relation_table}</small>{application.relation_table === 'proof_of_mind_concept_media' && editableRelation ? <div className="admin-media-editor-grid">
            <label><span>placement</span><select value={editableRelation.placement || ''} onChange={(event) => patchRelation(application.relation_id, 'placement', event.target.value)}><option value="">—</option>{uniqueStrings([editableRelation.placement || '', ...placementOptions]).map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
            <label><span>display order</span><input type="number" value={editableRelation.display_order} onChange={(event) => patchRelation(application.relation_id, 'display_order', Number(event.target.value))} /></label>
            <label><span>caption override</span><input value={editableRelation.caption_override || ''} onChange={(event) => patchRelation(application.relation_id, 'caption_override', event.target.value)} /></label>
            <label><span>alt text override</span><input value={editableRelation.alt_text_override || ''} onChange={(event) => patchRelation(application.relation_id, 'alt_text_override', event.target.value)} /></label>
            {(['is_featured','autoplay','muted','loop'] as const).map((key) => <label className="admin-media-editor-check" key={key}><input type="checkbox" checked={Boolean(editableRelation[key])} onChange={(event) => patchRelation(application.relation_id, key, event.target.checked)} />{key}</label>)}
          </div> : <span>{application.placement || '—'} · {application.display_order}</span>}</article>;
        })}</div> : <p>{t('admin.media.editor.no_applications', 'This asset is not currently linked.')}</p>}</section>
        <section><h3>{t('admin.media.editor.file_info', 'Read-only file information')}</h3><dl className="admin-media-editor-file-info">{readonlyAssetFields.map((key) => <div key={key}><dt>{key.replaceAll('_',' ')}</dt><dd>{String(record.asset[key] ?? '—')}</dd></div>)}</dl></section>
      </> : null}
    </div><footer><button type="button" className="danger" onClick={() => void remove()} disabled={busy || loading || !record}><Trash2 size={14} />{deleting ? t('admin.deleting', 'Deleting…') : t('admin.delete', 'Delete')}</button><button type="button" onClick={onClose} disabled={busy}>{t('admin.cancel', 'Cancel')}</button><button type="button" className="primary" onClick={() => void save()} disabled={busy || loading || !isValid}><Save size={14} />{saving ? t('admin.saving', 'Saving…') : t('admin.save', 'Save')}</button></footer>
  </section></div>;
}

export function AdminMediaVaultOffersPage() {
  const { t } = useWebsiteI18n();
  const [groups, setGroups] = useState<AdminMediaVaultGroups | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [open, setOpen] = useState<OpenGroup | null>(null);
  const [assets, setAssets] = useState<DetailAsset[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const busy = uploading || deleting !== null;

  const categoryTitle = (key: string) => {
    if (key === 'journal_unlinked') return t('admin.media.category.journal_unlinked', 'Journal unlinked');
    if (key === 'founders') return t('admin.media.category.founders', 'Founders');
    if (key === 'journey_events') return t('admin.media.category.journey_events', 'Journey events');
    if (key === 'other') return t('admin.media.category.other', 'Other');
    return key;
  };

  async function load(signal?: AbortSignal) {
    setLoading(true);
    setError(null);
    try { setGroups(await listAdminMediaVaultGroups(signal)); }
    catch (reason) {
      if (!(reason instanceof DOMException && reason.name === 'AbortError')) {
        setGroups(null);
        setError(reason instanceof Error ? reason.message : 'Media Vault could not be loaded.');
      }
    } finally { if (!signal?.aborted) setLoading(false); }
  }

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, []);

  const openKey = open ? `${open.kind}:${open.kind === 'post' ? open.value.post_id : open.kind === 'offer' ? open.value.collection_id : open.kind === 'concept' ? open.value.concept_id : open.value.key}` : '';
  useEffect(() => {
    setActionError(null);
    setNotice(null);
    if (!open) { setAssets([]); return; }
    if (open.kind === 'offer' || open.kind === 'concept' || open.kind === 'category') { setAssets(open.value.assets || []); return; }
    setDetailLoading(true);
    getAdminJournalFootage(open.value.post_id)
      .then(setAssets)
      .catch((reason) => setActionError(reason instanceof Error ? reason.message : 'Footage could not be loaded.'))
      .finally(() => setDetailLoading(false));
  }, [openKey]);

  async function refreshOpen() {
    const next = await listAdminMediaVaultGroups();
    setGroups(next);
    if (!open) return;
    if (open.kind === 'offer') {
      const value = next.offers.find((item) => item.collection_id === open.value.collection_id);
      if (value) { setOpen({ kind: 'offer', value }); setAssets(value.assets); }
    } else if (open.kind === 'concept') {
      const value = next.concepts.find((item) => item.concept_id === open.value.concept_id);
      if (value) { setOpen({ kind: 'concept', value }); setAssets(value.assets); }
    } else if (open.kind === 'post') {
      const value = next.posts.find((item) => item.post_id === open.value.post_id);
      if (value) setOpen({ kind: 'post', value });
      setAssets(await getAdminJournalFootage(open.value.post_id));
    }
  }

  async function upload(fileList: FileList | null) {
    if (!open || open.kind === 'category' || !fileList?.length || busy) return;
    setUploading(true); setActionError(null); setNotice(null);
    try {
      const files = Array.from(fileList);
      if (open.kind === 'offer') await uploadOfferMedia(open.value.collection_id, files);
      else if (open.kind === 'concept') await uploadConceptMedia(open.value.concept_id, files);
      else {
        const context = await getJournalEventContext(open.value.post_id);
        await appendJournalFootage(open.value.post_id, files, journalEventDefaults(context));
      }
      await refreshOpen();
      setNotice(t('admin.media.upload_success', 'Media uploaded.'));
    } catch (reason) { setActionError(reason instanceof Error ? reason.message : t('admin.media.upload_error', 'Media upload failed.')); }
    finally { setUploading(false); if (fileInput.current) fileInput.current.value = ''; }
  }

  async function deleteAsset(assetId: string) {
    if (!open || open.kind !== 'post' || busy || !window.confirm(t('admin.media.delete_confirm', 'Delete this media file permanently? This cannot be undone.'))) return;
    setDeleting(assetId); setActionError(null);
    try { await deleteJournalFootage(open.value.post_id, assetId); await refreshOpen(); setNotice(t('admin.media.delete_success', 'Media deleted.')); }
    catch (reason) { setActionError(reason instanceof Error ? reason.message : t('admin.media.delete_error', 'Media delete failed.')); }
    finally { setDeleting(null); }
  }

  const needle = query.trim().toLowerCase();
  const posts = useMemo(() => filter === 'all' || filter === 'journal' ? (groups?.posts || []).filter((item) => !needle || `${item.title} ${item.slug}`.toLowerCase().includes(needle)) : [], [groups, filter, needle]);
  const offers = useMemo(() => filter === 'all' || filter === 'offers' ? (groups?.offers || []).filter((item) => !needle || `${item.offer_title} ${item.offer_slug} ${item.title}`.toLowerCase().includes(needle)) : [], [groups, filter, needle]);
  const concepts = useMemo(() => filter === 'all' || filter === 'concepts' ? (groups?.concepts || []).filter((item) => !needle || `${item.concept_title} ${item.concept_slug} ${item.concept_type}`.toLowerCase().includes(needle)) : [], [groups, filter, needle]);
  const categories = useMemo(() => (groups?.categories || []).filter((item) => (filter === 'all' || categoryFilter(item.key) === filter) && (!needle || `${categoryTitle(item.key)} ${item.key}`.toLowerCase().includes(needle))), [groups, filter, needle, t]);

  const chips = useMemo(() => {
    const result: { key: Filter; label: string; count: number }[] = [
      { key: 'all', label: t('admin.media.filter.all', 'All'), count: (groups?.posts.length || 0) + (groups?.offers.length || 0) + (groups?.concepts.length || 0) + (groups?.categories.length || 0) },
      { key: 'journal', label: t('admin.media.filter.journal', 'Journal'), count: groups?.posts.length || 0 },
      { key: 'offers', label: t('admin.media.filter.offers', 'Offers'), count: groups?.offers.length || 0 },
      { key: 'concepts', label: t('admin.media.filter.concepts', 'Concepts'), count: groups?.concepts.length || 0 },
    ];
    (['founders', 'journey_events', 'other'] as Filter[]).forEach((key) => {
      const count = groups?.categories.filter((item) => categoryFilter(item.key) === key).length || 0;
      if (count) result.push({ key, label: categoryTitle(key), count });
    });
    return result;
  }, [groups, t]);

  if (loading) return <div className="admin-loading"><LoaderCircle className="spin" /> {t('admin.loading.live_data', 'Loading live data…')}</div>;
  if (error && !groups) return <div className="admin-error">{error}</div>;
  if (!groups) return <div className="admin-section-empty">{t('admin.media.empty', 'No media groups found.')}</div>;

  const cards: { kind: OpenGroup['kind']; value: OpenGroup['value']; title: string; subtitle: string; cover: PreviewValue; count: number }[] = [
    ...posts.map((value) => ({ kind: 'post' as const, value, title: value.title, subtitle: value.slug, cover: preview(value), count: value.asset_count })),
    ...offers.map((value) => ({ kind: 'offer' as const, value, title: value.offer_title, subtitle: value.title, cover: preview(value), count: value.asset_count })),
    ...concepts.map((value) => ({ kind: 'concept' as const, value, title: value.concept_title, subtitle: value.concept_type, cover: preview(value), count: value.asset_count })),
    ...categories.map((value) => ({ kind: 'category' as const, value, title: categoryTitle(value.key), subtitle: value.key, cover: preview(value), count: value.asset_count })),
  ];

  return <div className="admin-media-vault-page">
    <div className="admin-section-heading"><div><p>{t('admin.media.eyebrow', 'MEDIA VAULT')}</p><h1>{t('admin.media.title', 'Media')}</h1><span>{t('admin.media.description', 'Browse and manage media grouped by content.')}</span></div><button onClick={() => void load()}><RefreshCw size={16} />{t('admin.refresh', 'Refresh')}</button></div>
    <div className="admin-section-toolbar"><div><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('admin.search.placeholder', 'Search media…')} /></div><span>{cards.length}</span></div>
    <div className="admin-media-filter-chips">{chips.map((chip) => <button key={chip.key} className={filter === chip.key ? 'active' : ''} onClick={() => setFilter(chip.key)}>{chip.label}<b>{chip.count}</b></button>)}</div>
    {error ? <div className="admin-error">{error}</div> : null}
    <div className="admin-media-grid">{cards.map((card) => <article key={`${card.kind}:${card.subtitle}`} onClick={() => setOpen({ kind: card.kind, value: card.value } as OpenGroup)}><Preview value={card.cover} alt={card.title} /><div><strong>{card.title}</strong><span>{card.subtitle}</span><small>{card.count}</small></div></article>)}</div>
    {!cards.length ? <div className="admin-section-empty">{t('admin.media.empty', 'No media groups found.')}</div> : null}
    {open ? <div className="admin-editor-backdrop"><section className="admin-editor admin-media-group-editor"><header><div><p>{open.kind.toUpperCase()}</p><h2>{open.kind === 'post' ? open.value.title : open.kind === 'offer' ? open.value.offer_title : open.kind === 'concept' ? open.value.concept_title : categoryTitle(open.value.key)}</h2></div><button onClick={() => setOpen(null)}><X /></button></header><div className="admin-media-asset-editor__body">
      {actionError ? <div className="admin-error">{actionError}</div> : null}{notice ? <div className="admin-notice">{notice}</div> : null}{detailLoading ? <div className="admin-loading"><LoaderCircle className="spin" /></div> : null}
      <div className="admin-media-grid">{assets.map((asset) => { const assetId = 'asset_id' in asset ? asset.asset_id : asset.media_asset_id; const value = preview(asset); return <article key={assetId}><Preview value={value} alt={stringValue(asset.alt_text)} /><div><strong>{stringValue(asset.title) || stringValue(asset.original_filename) || assetId}</strong><span>{stringValue(asset.caption)}</span><small>{stringValue(asset.placement)}</small></div><footer><button type="button" onClick={() => setEditingAssetId(assetId)}><Edit3 size={14} />{t('admin.edit', 'Edit')}</button>{open.kind === 'post' ? <button type="button" onClick={() => void deleteAsset(assetId)} disabled={busy}><Trash2 size={14} /></button> : null}</footer></article>; })}</div>
    </div><footer>{open.kind !== 'category' ? <><input ref={fileInput} hidden type="file" multiple accept="image/*,video/*" onChange={(event) => void upload(event.target.files)} /><button onClick={() => fileInput.current?.click()} disabled={busy}><Upload size={14} />{uploading ? t('admin.uploading', 'Uploading…') : t('admin.upload', 'Upload')}</button></> : null}<button onClick={() => setOpen(null)}>{t('admin.close', 'Close')}</button></footer></section></div> : null}
    {editingAssetId ? <MediaAssetEditor assetId={editingAssetId} onClose={() => setEditingAssetId(null)} onSaved={refreshOpen} /> : null}
  </div>;
}
