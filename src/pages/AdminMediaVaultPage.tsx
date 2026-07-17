import { useEffect, useMemo, useRef, useState } from 'react';
import { ExternalLink, LoaderCircle, Play, RefreshCw, Search, Trash2, Upload, X } from 'lucide-react';
import {
  listAdminMediaVaultGroups,
  type AdminMediaVaultAsset,
  type AdminMediaVaultCategoryGroup,
  type AdminMediaVaultGroups,
  type AdminMediaVaultPostGroup,
} from '../lib/adminApi';
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

type MediaFilter = 'all' | 'journal' | 'founders' | 'journey_events' | 'other';

type OpenGroup =
  | { kind: 'post'; post: AdminMediaVaultPostGroup }
  | { kind: 'category'; category: AdminMediaVaultCategoryGroup };

type MediaPreview =
  | { kind: 'image'; src: string }
  | { kind: 'video'; src: string }
  | { kind: 'none' };

function resolveMediaPreview(input: {
  thumbnail_url?: string | null;
  storage_bucket?: string | null;
  storage_path?: string | null;
  asset_type?: string | null;
}): MediaPreview {
  const fromThumb = resolvePublicMediaUrl(input.thumbnail_url);
  if (fromThumb) return { kind: 'image', src: fromThumb };

  const storageUrl = resolvePublicMediaUrl(null, input.storage_bucket, input.storage_path);
  if (!storageUrl) return { kind: 'none' };

  const assetType = String(input.asset_type || '').toLowerCase();
  if (assetType === 'video') return { kind: 'video', src: storageUrl };
  if (!assetType || assetType === 'image') return { kind: 'image', src: storageUrl };
  return { kind: 'none' };
}

function MediaPreviewFrame({ preview, alt }: { preview: MediaPreview; alt?: string }) {
  if (preview.kind === 'image') return <img src={preview.src} alt={alt || ''} />;
  if (preview.kind === 'video') {
    return (
      <span className="admin-media-preview-video-wrap">
        <video
          className="admin-media-preview-video"
          src={preview.src}
          muted
          playsInline
          preload="metadata"
          aria-label={alt || undefined}
        />
        <span className="admin-media-preview-play" aria-hidden="true"><Play size={18} /></span>
      </span>
    );
  }
  return <div className="admin-media-placeholder">MEDIA</div>;
}

function postCoverPreview(post: AdminMediaVaultPostGroup): MediaPreview {
  return resolveMediaPreview({
    thumbnail_url: post.cover_thumbnail_url,
    storage_bucket: post.cover_storage_bucket,
    storage_path: post.cover_storage_path,
    asset_type: post.cover_asset_type,
  });
}

function categoryCoverPreview(category: AdminMediaVaultCategoryGroup): MediaPreview {
  return resolveMediaPreview({
    thumbnail_url: category.cover_thumbnail_url,
    storage_bucket: category.cover_storage_bucket,
    storage_path: category.cover_storage_path,
    asset_type: category.cover_asset_type,
  });
}

function assetPreview(asset: AdminMediaVaultAsset | AdminJournalFootageItem): MediaPreview {
  return resolveMediaPreview({
    thumbnail_url: asset.thumbnail_url,
    storage_bucket: asset.storage_bucket,
    storage_path: asset.storage_path,
    asset_type: asset.asset_type,
  });
}

function formatEventDateTime(
  formatDate: (value: string | Date, options?: Intl.DateTimeFormatOptions) => string,
  occurredAt: string | null | undefined,
  eventTimezone: string | null | undefined,
): string {
  if (!occurredAt) return '';
  return formatDate(occurredAt, {
    timeZone: eventTimezone || 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZoneName: 'short',
  });
}

function formatAssetCaptureLine(
  t: (key: string, fallback: string, variables?: Record<string, string | number>) => string,
  formatDate: (value: string | Date, options?: Intl.DateTimeFormatOptions) => string,
  asset: { captured_at?: string | null; created_at: string },
): string {
  const capturedAt = asset.captured_at?.trim() || '';
  const datetime = formatEventDateTime(formatDate, capturedAt || asset.created_at, 'Europe/Madrid');
  if (!datetime) return '';
  if (capturedAt) {
    return t('admin.media.captured_at', 'Captured {datetime}', { datetime });
  }
  return t('admin.media.uploaded_at', 'Uploaded {datetime}', { datetime });
}

function categoryFilterKey(key: string): MediaFilter | null {
  if (key === 'journal_unlinked') return 'journal';
  if (key === 'founders' || key === 'journey_events' || key === 'other') return key;
  return null;
}

export function AdminMediaVaultPage() {
  const { t, formatDate } = useWebsiteI18n();
  const [groups, setGroups] = useState<AdminMediaVaultGroups | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<MediaFilter>('all');
  const [open, setOpen] = useState<OpenGroup | null>(null);
  const [detailAssets, setDetailAssets] = useState<(AdminMediaVaultAsset | AdminJournalFootageItem)[] | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deletingAssetId, setDeletingAssetId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const openRef = useRef(open);
  openRef.current = open;
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
      const next = await listAdminMediaVaultGroups(signal);
      setGroups(next);
    } catch (reason) {
      if (reason instanceof DOMException && reason.name === 'AbortError') return;
      setGroups(null);
      setError(reason instanceof Error ? reason.message : t('admin.media.error.load', 'Media Vault could not be loaded.'));
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, []);

  const openGroupKey = open?.kind === 'post'
    ? `post:${open.post.post_id}`
    : open?.kind === 'category'
      ? `category:${open.category.key}`
      : null;

  useEffect(() => {
    const current = openRef.current;
    if (!current || !openGroupKey) {
      setDetailAssets(null);
      setDetailError(null);
      setDetailLoading(false);
      setActionError(null);
      setActionNotice(null);
      setUploading(false);
      setDeletingAssetId(null);
      return;
    }

    setActionError(null);
    setActionNotice(null);

    if (current.kind === 'category') {
      setDetailAssets(current.category.assets || []);
      setDetailError(null);
      setDetailLoading(false);
      return;
    }

    const postId = current.post.post_id;
    const controller = new AbortController();
    setDetailLoading(true);
    setDetailError(null);
    setDetailAssets(null);
    getAdminJournalFootage(postId)
      .then((rows) => {
        if (!controller.signal.aborted) setDetailAssets(rows);
      })
      .catch((reason) => {
        if (controller.signal.aborted) return;
        setDetailAssets(null);
        setDetailError(reason instanceof Error ? reason.message : t('admin.media.error.detail', 'Footage could not be loaded.'));
      })
      .finally(() => {
        if (!controller.signal.aborted) setDetailLoading(false);
      });

    return () => controller.abort();
  }, [openGroupKey, t]);

  async function refreshPostDetail(postId: string) {
    const [rows, nextGroups] = await Promise.all([
      getAdminJournalFootage(postId),
      listAdminMediaVaultGroups(),
    ]);
    setDetailAssets(rows);
    setGroups(nextGroups);
    setOpen((current) => {
      if (current?.kind !== 'post' || current.post.post_id !== postId) return current;
      const refreshed = nextGroups.posts.find((post) => post.post_id === postId);
      return refreshed ? { kind: 'post', post: refreshed } : current;
    });
  }

  async function handleUploadFiles(fileList: FileList | null) {
    if (!open || open.kind !== 'post' || !fileList?.length || busy) return;
    const files = Array.from(fileList);
    setUploading(true);
    setActionError(null);
    setActionNotice(null);
    try {
      const context = await getJournalEventContext(open.post.post_id);
      const event = journalEventDefaults(context);
      await appendJournalFootage(open.post.post_id, files, event);
      await refreshPostDetail(open.post.post_id);
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
    const confirmed = window.confirm(
      t('admin.media.delete_confirm', 'Delete this media file permanently? This cannot be undone.'),
    );
    if (!confirmed) return;

    setDeletingAssetId(assetId);
    setActionError(null);
    setActionNotice(null);
    try {
      const result = await deleteJournalFootage(open.post.post_id, assetId);
      await refreshPostDetail(open.post.post_id);
      setActionNotice(
        result.deleted
          ? t('admin.media.delete_success', 'Media deleted.')
          : t('admin.media.unlinked_only', 'Removed from this group. The file is still used elsewhere.'),
      );
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : t('admin.media.delete_error', 'Media delete failed.'));
    } finally {
      setDeletingAssetId(null);
    }
  }

  const filteredPosts = useMemo(() => {
    if (filter !== 'all' && filter !== 'journal') return [];
    const posts = groups?.posts || [];
    const needle = query.trim().toLowerCase();
    if (!needle) return posts;
    return posts.filter((post) => {
      const haystack = `${post.title} ${post.slug} ${post.status}`.toLowerCase();
      return haystack.includes(needle);
    });
  }, [groups, query, filter]);

  const filteredCategories = useMemo(() => {
    const categories = groups?.categories || [];
    const needle = query.trim().toLowerCase();
    return categories.filter((category) => {
      const chipFilter = categoryFilterKey(category.key);
      if (filter !== 'all' && chipFilter !== filter) return false;
      if (!needle) return true;
      const title = categoryTitle(category.key).toLowerCase();
      return title.includes(needle) || category.key.toLowerCase().includes(needle);
    });
  }, [groups, query, filter, t]);

  const chips = useMemo(() => {
    const posts = groups?.posts || [];
    const categories = groups?.categories || [];
    const hasJournalUnlinked = categories.some((category) => category.key === 'journal_unlinked');
    const hasFounders = categories.some((category) => category.key === 'founders');
    const hasJourney = categories.some((category) => category.key === 'journey_events');
    const hasOther = categories.some((category) => category.key === 'other');

    const items: { key: MediaFilter; label: string; count: number }[] = [
      {
        key: 'all',
        label: t('admin.media.filter.all', 'All'),
        count: posts.length + categories.length,
      },
      {
        key: 'journal',
        label: t('admin.media.filter.journal', 'Journal'),
        count: posts.length + (hasJournalUnlinked ? 1 : 0),
      },
    ];
    if (hasFounders) {
      items.push({ key: 'founders', label: t('admin.media.filter.founders', 'Founders'), count: 1 });
    }
    if (hasJourney) {
      items.push({ key: 'journey_events', label: t('admin.media.filter.journey_events', 'Journey events'), count: 1 });
    }
    if (hasOther) {
      items.push({ key: 'other', label: t('admin.media.filter.other', 'Other'), count: 1 });
    }
    return items;
  }, [groups, t]);

  const detailTitle = open?.kind === 'post'
    ? open.post.title
    : open?.kind === 'category'
      ? categoryTitle(open.category.key)
      : '';
  const detailEventAt = open?.kind === 'post'
    ? formatEventDateTime(formatDate, open.post.occurred_at, open.post.event_timezone)
    : '';

  if (loading) {
    return <div className="admin-loading"><LoaderCircle className="spin" /> {t('admin.loading.live_data', 'Loading live data…')}</div>;
  }

  if (error && !groups) {
    return <div className="admin-error">{error}</div>;
  }

  if (!groups) {
    return <div className="admin-section-empty">{t('admin.media.empty', 'No media groups found.')}</div>;
  }

  const visibleCount = filteredPosts.length + filteredCategories.length;

  return (
    <div className="admin-section-page admin-media-vault-page">
      <div className="admin-section-heading">
        <div>
          <p>{t('admin.section.eyebrow', 'ADMIN SECTION')}</p>
          <h1>{t('admin.media.title', 'Media Vault')}</h1>
          <span>{t('admin.media.description.grouped', 'Footage grouped by journal post and media category. Open a card to review assets.')}</span>
        </div>
        <button type="button" onClick={() => void load()}>
          <RefreshCw size={16} /> {t('admin.refresh', 'Refresh')}
        </button>
      </div>

      <div className="admin-section-toolbar">
        <div>
          <Search size={17} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('admin.media.search.placeholder', 'Search journal posts and categories…')}
          />
        </div>
        <span>{t('admin.media.groups.count', '{count} groups', { count: visibleCount })}</span>
      </div>

      <div className="admin-media-filter-chips" role="toolbar" aria-label={t('admin.media.filter.label', 'Filter media groups')}>
        {chips.map((chip) => (
          <button
            key={chip.key}
            type="button"
            className={`admin-media-filter-chip ${filter === chip.key ? 'is-active' : ''}`}
            aria-pressed={filter === chip.key}
            onClick={() => setFilter(chip.key)}
          >
            {chip.label}
            <span>{chip.count}</span>
          </button>
        ))}
      </div>

      {error && <div className="admin-error">{error}</div>}

      <div className="admin-media-grid">
        {filteredPosts.map((post) => {
          const cover = postCoverPreview(post);
          const eventAt = formatEventDateTime(formatDate, post.occurred_at, post.event_timezone);
          return (
            <article key={post.post_id} onClick={() => setOpen({ kind: 'post', post })}>
              <MediaPreviewFrame preview={cover} alt={post.title} />
              <div>
                <strong>{post.title}</strong>
                <span>{t('admin.media.assets.count', '{count} assets', { count: post.asset_count })}</span>
                {eventAt ? <span className="admin-media-vault-event">{t('admin.media.event_at', 'Event {datetime}', { datetime: eventAt })}</span> : null}
                <small>{post.status}</small>
              </div>
            </article>
          );
        })}

        {filteredCategories.map((category) => {
          const cover = categoryCoverPreview(category);
          return (
            <article key={category.key} onClick={() => setOpen({ kind: 'category', category })}>
              <MediaPreviewFrame preview={cover} alt={categoryTitle(category.key)} />
              <div>
                <strong>{categoryTitle(category.key)}</strong>
                <span>{t('admin.media.assets.count', '{count} assets', { count: category.asset_count })}</span>
                <small>{t('admin.media.category.badge', 'category')}</small>
              </div>
            </article>
          );
        })}
      </div>

      {visibleCount === 0 && (
        <div className="admin-section-empty">{t('admin.records.empty', 'No records found.')}</div>
      )}

      {open && (
        <div className="admin-editor-backdrop">
          <section className="admin-editor admin-media-vault-drawer">
            <header>
              <div>
                <p>{t('admin.media.drawer.eyebrow', 'FOOTAGE')}</p>
                <h2>{detailTitle}</h2>
              </div>
              <button type="button" onClick={() => setOpen(null)} aria-label={t('admin.cancel', 'Cancel')}><X /></button>
            </header>

            <div className="admin-media-vault-drawer__body">
              {open.kind === 'post' && (
                <p className="admin-media-vault-drawer__meta">
                  <a href={`/admin/journal`}>{t('admin.media.open_journal', 'Open Journal admin')}</a>
                  {open.post.slug ? <span>/{open.post.slug}</span> : null}
                  {detailEventAt ? (
                    <time dateTime={open.post.occurred_at || undefined}>
                      {t('admin.media.event_at', 'Event {datetime}', { datetime: detailEventAt })}
                    </time>
                  ) : null}
                </p>
              )}

              {detailLoading && (
                <div className="admin-loading"><LoaderCircle className="spin" /> {t('admin.loading.live_data', 'Loading live data…')}</div>
              )}
              {detailError && <div className="admin-error">{detailError}</div>}
              {actionError && <div className="admin-error">{actionError}</div>}
              {actionNotice && <div className="admin-media-vault-notice">{actionNotice}</div>}
              {uploading && (
                <div className="admin-loading"><LoaderCircle className="spin" /> {t('admin.media.uploading', 'Uploading media…')}</div>
              )}

              {!detailLoading && !detailError && detailAssets && detailAssets.length === 0 && (
                <div className="admin-section-empty">{t('admin.media.detail.empty', 'No footage in this group.')}</div>
              )}

              {!detailLoading && detailAssets && detailAssets.length > 0 && (
                <div className="admin-media-grid admin-media-vault-drawer__grid">
                  {detailAssets.map((asset) => {
                    const preview = assetPreview(asset);
                    const deleting = deletingAssetId === asset.asset_id;
                    const captureLine = formatAssetCaptureLine(t, formatDate, asset);
                    return (
                      <article key={asset.asset_id} className="admin-media-vault-tile">
                        <div className="admin-media-vault-tile__preview">
                          <MediaPreviewFrame preview={preview} alt={asset.alt_text || undefined} />
                          {open.kind === 'post' && (
                            <button
                              type="button"
                              className="admin-media-vault-tile__delete"
                              disabled={busy}
                              aria-label={t('admin.media.delete', 'Delete')}
                              onClick={(event) => {
                                event.stopPropagation();
                                void handleDeleteAsset(asset.asset_id);
                              }}
                            >
                              {deleting ? <LoaderCircle size={14} className="spin" /> : <Trash2 size={14} />}
                            </button>
                          )}
                        </div>
                        <div>
                          <strong>{asset.original_filename || asset.caption || asset.asset_id}</strong>
                          {captureLine ? <span className="admin-media-vault-captured">{captureLine}</span> : null}
                          <span>{asset.caption || asset.alt_text || '—'}</span>
                          <small>{asset.asset_type}</small>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>

            <footer>
              {open.kind === 'post' && (
                <>
                  <a className="admin-media-vault-drawer__link" href="/admin/journal">
                    <ExternalLink size={14} /> {t('admin.media.open_journal', 'Open Journal admin')}
                  </a>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    hidden
                    onChange={(event) => void handleUploadFiles(event.target.files)}
                  />
                  <button
                    type="button"
                    className="primary"
                    disabled={busy}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {uploading ? <LoaderCircle size={14} className="spin" /> : <Upload size={14} />}
                    {uploading
                      ? t('admin.media.uploading', 'Uploading media…')
                      : t('admin.media.add_media', 'Add media')}
                  </button>
                </>
              )}
              <button type="button" onClick={() => setOpen(null)} disabled={busy}>{t('admin.cancel', 'Cancel')}</button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}
