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

type MediaFilter = 'all' | 'journal' | 'offers' | 'founders' | 'journey_events' | 'other';
type OpenGroup =
  | { kind: 'post'; post: AdminMediaVaultPostGroup }
  | { kind: 'category'; category: AdminMediaVaultCategoryGroup }
  | { kind: 'offer'; offer: AdminMediaVaultOfferGroup };
type DetailAsset = AdminMediaVaultAsset | AdminJournalFootageItem;
type MediaPreview = { kind: 'image' | 'video'; src: string } | { kind: 'none' };

function previewFor(input: {
  thumbnail_url?: string | null;
  storage_bucket?: string | null;
  storage_path?: string | null;
  asset_type?: string | null;
}): MediaPreview {
  const thumb = resolvePublicMediaUrl(input.thumbnail_url);
  if (thumb) return { kind: 'image', src: thumb };
  const storage = resolvePublicMediaUrl(null, input.storage_bucket, input.storage_path);
  if (!storage) return { kind: 'none' };
  return String(input.asset_type || '').toLowerCase() === 'video'
    ? { kind: 'video', src: storage }
    : { kind: 'image', src: storage };
}

function Preview({ value, alt = '' }: { value: MediaPreview; alt?: string }) {
  if (value.kind === 'image') return <img src={value.src} alt={alt} />;
  if (value.kind === 'video') return <span className="admin-media-preview-video-wrap"><video className="admin-media-preview-video" src={value.src} muted playsInline preload="metadata" aria-label={alt || undefined} /><span className="admin-media-preview-play"><Play size={18} /></span></span>;
  return <div className="admin-media-placeholder">MEDIA</div>;
}

function categoryFilter(key: string): MediaFilter | null {
  if (key === 'journal_unlinked') return 'journal';
  if (key === 'founders' || key === 'journey_events' || key === 'other') return key;
  return null;
}

export function AdminMediaVaultPageV2() {
  const { t, formatDate } = useWebsiteI18n();
  const [groups, setGroups] = useState<AdminMediaVaultGroups | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<MediaFilter>('all');
  const [open, setOpen] = useState<OpenGroup | null>(null);
  const [detailAssets, setDetailAssets] = useState<DetailAsset[] | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deletingAssetId, setDeletingAssetId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const busy = uploading || deletingAssetId !== null;

  function categoryTitle(key: string) {
    if (key === 'journal_unlinked') return t('admin.media.category.journal_unlinked', 'Journal unlinked');
    if (key === 'founders') return t('admin.media.category.founders', 'Founders');
    if (key === 'journey_events') return t('admin.media.category.journey_events', 'Journey events');
    if (key === 'other') return t('admin.media.category.other', 'Other');
    return key;
  }

  async function load(signal?: AbortSignal) {
    setLoading(true);
    setError(null);
    try {
      setGroups(await listAdminMediaVaultGroups(signal));
    } catch (reason) {
      if (reason instanceof DOMException && reason.name === 'AbortError') return;
      setError(reason instanceof Error ? reason.message : 'Media Vault could not be loaded.');
      setGroups(null);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, []);

  const openKey = open?.kind === 'post'
    ? `post:${open.post.post_id}`
    : open?.kind === 'category'
      ? `category:${open.category.key}`
      : open?.kind === 'offer'
        ? `offer:${open.offer.collection_id}`
        : null;

  useEffect(() => {
    setActionError(null);
    setActionNotice(null);
    if (!open) {
      setDetailAssets(null);
      setDetailError(null);
      return;
    }
    if (open.kind === 'category') {
      setDetailAssets(open.category.assets || []);
      setDetailError(null);
      setDetailLoading(false);
      return;
    }
    if (open.kind === 'offer') {
      setDetailAssets(open.offer.assets || []);
      setDetailError(null);
      setDetailLoading(false);
      return;
    }
    setDetailLoading(true);
    setDetailError(null);
    getAdminJournalFootage(open.post.post_id)
      .then(setDetailAssets)
      .catch((reason) => setDetailError(reason instanceof Error ? reason.message : 'Footage could not be loaded.'))
      .finally(() => setDetailLoading(false));
  }, [openKey]);

  async function refreshOpen() {
    const next = await listAdminMediaVaultGroups();
    setGroups(next);
    if (!open) return;
    if (open.kind === 'post') {
      const rows = await getAdminJournalFootage(open.post.post_id);
      setDetailAssets(rows);
      const refreshed = next.posts.find((item) => item.post_id === open.post.post_id);
      if (refreshed) setOpen({ kind: 'post', post: refreshed });
    } else if (open.kind === 'offer') {
      const refreshed = next.offers.find((item) => item.collection_id === open.offer.collection_id);
      if (refreshed) {
        setOpen({ kind: 'offer', offer: refreshed });
        setDetailAssets(refreshed.assets);
      }
    }
  }

  async function handleUploadFiles(fileList: FileList | null) {
    if (!open || !fileList?.length || busy || open.kind === 'category') return;
    const files = Array.from(fileList);
    setUploading(true);
    setActionError(null);
    setActionNotice(null);
    try {
      if (open.kind === 'post') {
        const context = await getJournalEventContext(open.post.post_id);
        await appendJournalFootage(open.post.post_id, files, journalEventDefaults(context));
      } else {
        await uploadOfferMedia(open.offer.collection_id, files);
      }
      await refreshOpen();
      setActionNotice(t('admin.media.upload_success', 'Media uploaded.'));
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : t('admin.media.upload_error', 'Media upload failed.'));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleDeleteAsset(assetId: string) {
    if (!open || open.kind !== 'post' || busy) return;
    if (!window.confirm(t('admin.media.delete_confirm', 'Delete this media file permanently? This cannot be undone.'))) return;
    setDeletingAssetId(assetId);
    setActionError(null);
    try {
      const result = await deleteJournalFootage(open.post.post_id, assetId);
      await refreshOpen();
      setActionNotice(result.deleted ? t('admin.media.delete_success', 'Media deleted.') : t('admin.media.unlinked_only', 'Removed from this group. The file is still used elsewhere.'));
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : t('admin.media.delete_error', 'Media delete failed.'));
    } finally {
      setDeletingAssetId(null);
    }
  }

  const needle = query.trim().toLowerCase();
  const posts = useMemo(() => (filter === 'all' || filter === 'journal' ? (groups?.posts || []).filter((item) => !needle || `${item.title} ${item.slug} ${item.status}`.toLowerCase().includes(needle)) : []), [groups, filter, needle]);
  const offers = useMemo(() => (filter === 'all' || filter === 'offers' ? (groups?.offers || []).filter((item) => !needle || `${item.offer_title} ${item.offer_slug} ${item.title}`.toLowerCase().includes(needle)) : []), [groups, filter, needle]);
  const categories = useMemo(() => (groups?.categories || []).filter((item) => {
    const groupFilter = categoryFilter(item.key);
    if (filter !== 'all' && groupFilter !== filter) return false;
    return !needle || `${categoryTitle(item.key)} ${item.key}`.toLowerCase().includes(needle);
  }), [groups, filter, needle, t]);

  const chips = useMemo(() => {
    const values: { key: MediaFilter; label: string; count: number }[] = [
      { key: 'all', label: t('admin.media.filter.all', 'All'), count: (groups?.posts.length || 0) + (groups?.offers.length || 0) + (groups?.categories.length || 0) },
      { key: 'journal', label: t('admin.media.filter.journal', 'Journal'), count: groups?.posts.length || 0 },
      { key: 'offers', label: t('admin.media.filter.offers', 'Offers'), count: groups?.offers.length || 0 },
    ];
    for (const key of ['founders', 'journey_events', 'other'] as MediaFilter[]) {
      const count = groups?.categories.filter((item) => categoryFilter(item.key) === key).length || 0;
      if (count) values.push({ key, label: categoryTitle(key), count });
    }
    return values;
  }, [groups, t]);

  if (loading) return <div className="admin-loading"><LoaderCircle className="spin" /> {t('admin.loading.live_data', 'Loading live data…')}</div>;
  if (error && !groups) return <div className="admin-error">{error}</div>;
  if (!groups) return <div className="admin-section-empty">{t('admin.media.empty', 'No media groups found.')}</div>;

  const visibleCount = posts.length + offers.length + categories.length;
  const detailTitle = open?.kind === 'post' ? open.post.title : open?.kind === 'offer' ? open.offer.offer_title : open?.kind === 'category' ? categoryTitle(open.category.key) : '';
  const canUpload = open?.kind === 'post' || open?.kind === 'offer';
  const accept = open?.kind === 'offer'
    ? open.offer.accepted_asset_types.map((type) => `${type}/*`).join(',')
    : 'image/*,video/*';

  return <div className="admin-section-page admin-media-vault-page">
    <div className="admin-section-heading"><div><p>{t('admin.section.eyebrow', 'ADMIN SECTION')}</p><h1>{t('admin.media.title', 'Media Vault')}</h1><span>{t('admin.media.description.grouped', 'Footage grouped by journal post, offer and media category.')}</span></div><button type="button" onClick={() => void load()}><RefreshCw size={16} /> {t('admin.refresh', 'Refresh')}</button></div>
    <div className="admin-section-toolbar"><div><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('admin.media.search.placeholder', 'Search media groups…')} /></div><span>{t('admin.media.groups.count', '{count} groups', { count: visibleCount })}</span></div>
    <div className="admin-media-filter-chips" role="toolbar" aria-label={t('admin.media.filter.label', 'Filter media groups')}>{chips.map((chip) => <button key={chip.key} type="button" className={`admin-media-filter-chip ${filter === chip.key ? 'is-active' : ''}`} aria-pressed={filter === chip.key} onClick={() => setFilter(chip.key)}>{chip.label}<span>{chip.count}</span></button>)}</div>
    {error ? <div className="admin-error">{error}</div> : null}
    <div className="admin-media-grid">
      {posts.map((post) => <article key={post.post_id} onClick={() => setOpen({ kind: 'post', post })}><Preview value={previewFor({ thumbnail_url: post.cover_thumbnail_url, storage_bucket: post.cover_storage_bucket, storage_path: post.cover_storage_path, asset_type: post.cover_asset_type })} alt={post.title} /><div><strong>{post.title}</strong><span>{t('admin.media.assets.count', '{count} assets', { count: post.asset_count })}</span><small>{post.status}</small></div></article>)}
      {offers.map((offer) => <article key={offer.collection_id} onClick={() => setOpen({ kind: 'offer', offer })}><Preview value={previewFor({ thumbnail_url: offer.cover_thumbnail_url, storage_bucket: offer.cover_storage_bucket, storage_path: offer.cover_storage_path, asset_type: offer.cover_asset_type })} alt={offer.offer_title} /><div><strong>{offer.offer_title}</strong><span>{offer.title}</span><span>{t('admin.media.assets.count', '{count} assets', { count: offer.asset_count })}</span><small>{t('admin.media.offer.badge', 'offer')}</small></div></article>)}
      {categories.map((category) => <article key={category.key} onClick={() => setOpen({ kind: 'category', category })}><Preview value={previewFor({ thumbnail_url: category.cover_thumbnail_url, storage_bucket: category.cover_storage_bucket, storage_path: category.cover_storage_path, asset_type: category.cover_asset_type })} alt={categoryTitle(category.key)} /><div><strong>{categoryTitle(category.key)}</strong><span>{t('admin.media.assets.count', '{count} assets', { count: category.asset_count })}</span><small>{t('admin.media.category.badge', 'category')}</small></div></article>)}
    </div>
    {visibleCount === 0 ? <div className="admin-section-empty">{t('admin.records.empty', 'No records found.')}</div> : null}

    {open ? <div className="admin-editor-backdrop"><section className="admin-editor admin-media-vault-drawer"><header><div><p>{open.kind === 'offer' ? t('admin.media.offer.eyebrow', 'OFFER MEDIA') : t('admin.media.drawer.eyebrow', 'FOOTAGE')}</p><h2>{detailTitle}</h2></div><button type="button" onClick={() => setOpen(null)} aria-label={t('admin.cancel', 'Cancel')}><X /></button></header>
      <div className="admin-media-vault-drawer__body">
        {open.kind === 'post' ? <p className="admin-media-vault-drawer__meta"><a href="/admin/journal">{t('admin.media.open_journal', 'Open Journal admin')}</a><span>/{open.post.slug}</span></p> : null}
        {open.kind === 'offer' ? <p className="admin-media-vault-drawer__meta"><a href={`/offers/${open.offer.offer_slug}`} target="_blank" rel="noreferrer">{t('admin.media.open_offer', 'Open public offer')} <ExternalLink size={13} /></a><span>{open.offer.storage_bucket}/{open.offer.storage_folder}</span></p> : null}
        {detailLoading ? <div className="admin-loading"><LoaderCircle className="spin" /> {t('admin.loading.live_data', 'Loading live data…')}</div> : null}
        {detailError ? <div className="admin-error">{detailError}</div> : null}
        {actionError ? <div className="admin-error">{actionError}</div> : null}
        {actionNotice ? <div className="admin-media-vault-notice">{actionNotice}</div> : null}
        {uploading ? <div className="admin-loading"><LoaderCircle className="spin" /> {t('admin.media.uploading', 'Uploading media…')}</div> : null}
        {!detailLoading && !detailError && detailAssets?.length === 0 ? <div className="admin-section-empty">{t('admin.media.detail.empty', 'No footage in this group.')}</div> : null}
        {!detailLoading && detailAssets && detailAssets.length > 0 ? <div className="admin-media-grid admin-media-vault-drawer__grid">{detailAssets.map((asset) => <article key={asset.asset_id} className="admin-media-vault-tile"><div className="admin-media-vault-tile__preview"><Preview value={previewFor(asset)} alt={asset.alt_text || ''} />{open.kind === 'post' ? <button type="button" className="admin-media-vault-tile__delete" disabled={busy} aria-label={t('admin.media.delete', 'Delete')} onClick={() => void handleDeleteAsset(asset.asset_id)}>{deletingAssetId === asset.asset_id ? <LoaderCircle size={14} className="spin" /> : <Trash2 size={14} />}</button> : null}</div><div><strong>{asset.original_filename || asset.title || asset.caption || asset.asset_id}</strong><span>{asset.caption || asset.alt_text || '—'}</span><small>{asset.asset_type}</small></div></article>)}</div> : null}
      </div>
      <footer>{open.kind === 'post' ? <a className="admin-media-vault-drawer__link" href="/admin/journal"><ExternalLink size={14} /> {t('admin.media.open_journal', 'Open Journal admin')}</a> : null}{canUpload ? <><input ref={fileInputRef} type="file" accept={accept} multiple hidden onChange={(event) => void handleUploadFiles(event.target.files)} /><button type="button" className="primary" disabled={busy} onClick={() => fileInputRef.current?.click()}>{uploading ? <LoaderCircle size={14} className="spin" /> : <Upload size={14} />}{uploading ? t('admin.media.uploading', 'Uploading media…') : t('admin.media.add_media', 'Add media')}</button></> : null}<button type="button" onClick={() => setOpen(null)} disabled={busy}>{t('admin.cancel', 'Cancel')}</button></footer>
    </section></div> : null}
  </div>;
}
