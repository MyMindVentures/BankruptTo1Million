import { useEffect, useMemo, useRef, useState } from 'react';
import { ExternalLink, LoaderCircle, Play, RefreshCw, Search, Trash2, Upload, X } from 'lucide-react';
import {
  listAdminMediaVaultGroups,
  uploadOfferMedia,
  type AdminMediaVaultAsset,
  type AdminMediaVaultCategoryGroup,
  type AdminMediaVaultGroups,
  type AdminMediaVaultOfferGroup,
  type AdminMediaVaultPostGroup,
} from '../lib/offerMediaAdminApi';
import {
  appendJournalFootage,
  deleteJournalFootage,
  getAdminJournalFootage,
  getJournalEventContext,
  journalEventDefaults,
  type AdminJournalFootageItem,
} from '../lib/journalAdminApi';
import { resolvePublicMediaUrl } from '../lib/journalFootage';
import { useWebsiteI18n } from '../lib/websiteI18n';

type Filter = 'all' | 'journal' | 'offers' | 'founders' | 'journey_events' | 'other';
type OpenGroup =
  | { kind: 'post'; value: AdminMediaVaultPostGroup }
  | { kind: 'offer'; value: AdminMediaVaultOfferGroup }
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

  const openKey = open ? `${open.kind}:${open.kind === 'post' ? open.value.post_id : open.kind === 'offer' ? open.value.collection_id : open.value.key}` : '';
  useEffect(() => {
    setActionError(null);
    setNotice(null);
    if (!open) { setAssets([]); return; }
    if (open.kind === 'offer' || open.kind === 'category') { setAssets(open.value.assets || []); return; }
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
  const categories = useMemo(() => (groups?.categories || []).filter((item) => (filter === 'all' || categoryFilter(item.key) === filter) && (!needle || `${categoryTitle(item.key)} ${item.key}`.toLowerCase().includes(needle))), [groups, filter, needle, t]);

  const chips = useMemo(() => {
    const result: { key: Filter; label: string; count: number }[] = [
      { key: 'all', label: t('admin.media.filter.all', 'All'), count: (groups?.posts.length || 0) + (groups?.offers.length || 0) + (groups?.categories.length || 0) },
      { key: 'journal', label: t('admin.media.filter.journal', 'Journal'), count: groups?.posts.length || 0 },
      { key: 'offers', label: t('admin.media.filter.offers', 'Offers'), count: groups?.offers.length || 0 },
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

  const title = open?.kind === 'post' ? open.value.title : open?.kind === 'offer' ? open.value.offer_title : open?.kind === 'category' ? categoryTitle(open.value.key) : '';
  const canUpload = open?.kind === 'post' || open?.kind === 'offer';
  const accept = open?.kind === 'offer' ? open.value.accepted_asset_types.map((type) => `${type}/*`).join(',') : 'image/*,video/*';
  const visibleCount = posts.length + offers.length + categories.length;

  return <div className="admin-section-page admin-media-vault-page">
    <div className="admin-section-heading"><div><p>{t('admin.section.eyebrow', 'ADMIN SECTION')}</p><h1>{t('admin.media.title', 'Media Vault')}</h1><span>{t('admin.media.description.grouped', 'Footage grouped by journal post, offer and media category.')}</span></div><button type="button" onClick={() => void load()}><RefreshCw size={16} /> {t('admin.refresh', 'Refresh')}</button></div>
    <div className="admin-section-toolbar"><div><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('admin.media.search.placeholder', 'Search media groups…')} /></div><span>{t('admin.media.groups.count', '{count} groups', { count: visibleCount })}</span></div>
    <div className="admin-media-filter-chips" role="toolbar">{chips.map((chip) => <button key={chip.key} type="button" className={`admin-media-filter-chip ${filter === chip.key ? 'is-active' : ''}`} onClick={() => setFilter(chip.key)}>{chip.label}<span>{chip.count}</span></button>)}</div>
    <div className="admin-media-grid">
      {posts.map((item) => <article key={item.post_id} onClick={() => setOpen({ kind: 'post', value: item })}><Preview value={preview(item)} alt={item.title} /><div><strong>{item.title}</strong><span>{t('admin.media.assets.count', '{count} assets', { count: item.asset_count })}</span><small>{item.status}</small></div></article>)}
      {offers.map((item) => <article key={item.collection_id} onClick={() => setOpen({ kind: 'offer', value: item })}><Preview value={preview(item)} alt={item.offer_title} /><div><strong>{item.offer_title}</strong><span>{item.title}</span><span>{t('admin.media.assets.count', '{count} assets', { count: item.asset_count })}</span><small>{t('admin.media.offer.badge', 'offer')}</small></div></article>)}
      {categories.map((item) => <article key={item.key} onClick={() => setOpen({ kind: 'category', value: item })}><Preview value={preview(item)} alt={categoryTitle(item.key)} /><div><strong>{categoryTitle(item.key)}</strong><span>{t('admin.media.assets.count', '{count} assets', { count: item.asset_count })}</span><small>{t('admin.media.category.badge', 'category')}</small></div></article>)}
    </div>
    {!visibleCount ? <div className="admin-section-empty">{t('admin.records.empty', 'No records found.')}</div> : null}

    {open ? <div className="admin-editor-backdrop"><section className="admin-editor admin-media-vault-drawer"><header><div><p>{open.kind === 'offer' ? t('admin.media.offer.eyebrow', 'OFFER MEDIA') : t('admin.media.drawer.eyebrow', 'FOOTAGE')}</p><h2>{title}</h2></div><button type="button" onClick={() => setOpen(null)}><X /></button></header><div className="admin-media-vault-drawer__body">
      {open.kind === 'offer' ? <p className="admin-media-vault-drawer__meta"><a href={`/offers/${open.value.offer_slug}`} target="_blank" rel="noreferrer">{t('admin.media.open_offer', 'Open public offer')} <ExternalLink size={13} /></a><span>{open.value.storage_bucket}/{open.value.storage_folder}</span></p> : null}
      {detailLoading ? <div className="admin-loading"><LoaderCircle className="spin" /> {t('admin.loading.live_data', 'Loading live data…')}</div> : null}
      {actionError ? <div className="admin-error">{actionError}</div> : null}{notice ? <div className="admin-media-vault-notice">{notice}</div> : null}
      {!detailLoading && !assets.length ? <div className="admin-section-empty">{t('admin.media.detail.empty', 'No footage in this group.')}</div> : null}
      {assets.length ? <div className="admin-media-grid admin-media-vault-drawer__grid">{assets.map((asset) => <article key={asset.asset_id} className="admin-media-vault-tile"><div className="admin-media-vault-tile__preview"><Preview value={preview(asset)} alt={asset.alt_text || ''} />{open.kind === 'post' ? <button type="button" className="admin-media-vault-tile__delete" disabled={busy} onClick={() => void deleteAsset(asset.asset_id)}>{deleting === asset.asset_id ? <LoaderCircle size={14} className="spin" /> : <Trash2 size={14} />}</button> : null}</div><div><strong>{asset.original_filename || asset.title || asset.caption || asset.asset_id}</strong><span>{asset.caption || asset.alt_text || '—'}</span><small>{asset.asset_type}</small></div></article>)}</div> : null}
    </div><footer>{canUpload ? <><input ref={fileInput} type="file" accept={accept} multiple hidden onChange={(event) => void upload(event.target.files)} /><button type="button" className="primary" disabled={busy} onClick={() => fileInput.current?.click()}>{uploading ? <LoaderCircle size={14} className="spin" /> : <Upload size={14} />}{uploading ? t('admin.media.uploading', 'Uploading media…') : t('admin.media.add_media', 'Add media')}</button></> : null}<button type="button" onClick={() => setOpen(null)} disabled={busy}>{t('admin.cancel', 'Cancel')}</button></footer></section></div> : null}
  </div>;
}
