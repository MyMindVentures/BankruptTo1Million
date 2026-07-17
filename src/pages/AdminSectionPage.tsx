import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, Filter, LoaderCircle, Play, RefreshCw, Save, Search, X } from 'lucide-react';
import {
  getAdminSectionDefinition,
  getAdminSectionRows,
  updateAdminSectionRow,
  type AdminRow,
  type AdminSectionDefinition,
  type AdminSectionField,
} from '../lib/adminApi';
import { resolvePublicMediaUrl } from '../lib/journalFootage';
import { useWebsiteI18n } from '../lib/websiteI18n';

type MediaPreview =
  | { kind: 'image'; src: string }
  | { kind: 'video'; src: string }
  | { kind: 'none' };

function text(value: unknown) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function asText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const next = String(value).trim();
  return next || null;
}

function resolveMediaPreview(row: AdminRow, definition: AdminSectionDefinition): MediaPreview {
  const thumbnail = asText(definition.imageField ? row[definition.imageField] : row.thumbnail_url);
  const fromThumb = resolvePublicMediaUrl(thumbnail);
  if (fromThumb) return { kind: 'image', src: fromThumb };

  const storageUrl = resolvePublicMediaUrl(null, asText(row.storage_bucket), asText(row.storage_path));
  if (!storageUrl) return { kind: 'none' };

  const assetType = asText(row.asset_type)?.toLowerCase();
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

function editorValue(value: unknown, field: AdminSectionField): string {
  if (value === null || value === undefined) return '';
  if (field.inputType === 'json') return typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  if (field.inputType === 'datetime' && typeof value === 'string') return value.slice(0, 16);
  return String(value);
}

function coerceValue(value: unknown, field: AdminSectionField): unknown {
  if (field.inputType === 'boolean') return Boolean(value);
  const raw = typeof value === 'string' ? value.trim() : value;
  if (raw === '') {
    if (field.required) throw new Error(`${field.labelFallback} is required.`);
    return null;
  }
  if (field.inputType === 'number') {
    const number = Number(raw);
    if (!Number.isFinite(number)) throw new Error(`${field.labelFallback} must be a valid number.`);
    return number;
  }
  if (field.inputType === 'json') {
    try { return typeof raw === 'string' ? JSON.parse(raw) : raw; }
    catch { throw new Error(`${field.labelFallback} must contain valid JSON.`); }
  }
  if (field.inputType === 'datetime' && typeof raw === 'string') return new Date(raw).toISOString();
  return raw;
}

export function AdminSectionPage({ path }: { path: string }) {
  const { t } = useWebsiteI18n();
  const [definition, setDefinition] = useState<AdminSectionDefinition | null>(null);
  const [rows, setRows] = useState<AdminRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [editing, setEditing] = useState<AdminRow | null>(null);
  const [saving, setSaving] = useState(false);

  async function load(signal?: AbortSignal) {
    setLoading(true);
    setError(null);
    setRows(null);
    try {
      const nextDefinition = await getAdminSectionDefinition(path, signal);
      const nextRows = await getAdminSectionRows(nextDefinition, signal);
      setDefinition(nextDefinition);
      setRows(nextRows);
    } catch (reason) {
      if (reason instanceof DOMException && reason.name === 'AbortError') return;
      setDefinition(null);
      setError(reason instanceof Error ? reason.message : t('admin.error.load', 'Data could not be loaded.'));
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    setQuery('');
    setStatus('all');
    setEditing(null);
    void load(controller.signal);
    return () => controller.abort();
  }, [path]);

  const listFields = useMemo(() => definition?.fields.filter((field) => field.showInList).sort((a, b) => a.displayOrder - b.displayOrder) || [], [definition]);
  const editorFields = useMemo(() => definition?.fields.filter((field) => field.showInEditor).sort((a, b) => a.displayOrder - b.displayOrder) || [], [definition]);

  const filtered = useMemo(() => {
    if (!rows || !definition) return [];
    return rows.filter((row) => {
      const haystack = JSON.stringify(row).toLowerCase();
      const matchesQuery = haystack.includes(query.toLowerCase());
      const matchesStatus = status === 'all' || text(row[definition.statusField || '']).toLowerCase() === status.toLowerCase();
      return matchesQuery && matchesStatus;
    });
  }, [rows, query, status, definition]);

  const statusOptions = useMemo(() => {
    if (!rows || !definition?.statusField) return [];
    const configured = definition.fields.find((field) => field.name === definition.statusField)?.options || [];
    const values = configured.length ? configured.map(String) : rows.map((row) => text(row[definition.statusField!])).filter((value) => value !== '—');
    return [...new Set(values)];
  }, [rows, definition]);

  async function saveEdit() {
    if (!editing || !definition) return;
    setSaving(true);
    setError(null);
    try {
      const keyValue = editing[definition.primaryKey];
      if (keyValue === null || keyValue === undefined || keyValue === '') throw new Error('The record primary key is missing.');
      const changes: AdminRow = {};
      for (const field of editorFields) {
        if (field.readOnly) continue;
        changes[field.name] = coerceValue(editing[field.name], field);
      }
      await updateAdminSectionRow(definition, String(keyValue), changes);
      setEditing(null);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t('admin.error.save', 'Saving failed.'));
    } finally {
      setSaving(false);
    }
  }

  function renderInput(field: AdminSectionField) {
    if (!editing) return null;
    const value = editing[field.name];
    const disabled = field.readOnly;
    if (field.inputType === 'boolean') {
      return <button type="button" disabled={disabled} className={`admin-toggle ${value ? 'on' : ''}`} onClick={() => setEditing({ ...editing, [field.name]: !value })}><i />{value ? t('admin.enabled', 'Enabled') : t('admin.disabled', 'Disabled')}</button>;
    }
    if (field.inputType === 'select') {
      return <select disabled={disabled} value={value === null || value === undefined ? '' : String(value)} onChange={(event) => setEditing({ ...editing, [field.name]: event.target.value })}><option value="">—</option>{field.options.map((option) => <option key={String(option)} value={String(option)}>{String(option)}</option>)}</select>;
    }
    if (field.inputType === 'textarea' || field.inputType === 'json') {
      return <textarea disabled={disabled} value={editorValue(value, field)} onChange={(event) => setEditing({ ...editing, [field.name]: event.target.value })} />;
    }
    const inputType = field.inputType === 'datetime' ? 'datetime-local' : field.inputType === 'number' ? 'number' : field.inputType;
    return <input disabled={disabled} required={field.required} type={inputType} value={editorValue(value, field)} onChange={(event) => setEditing({ ...editing, [field.name]: event.target.value })} />;
  }

  if (loading) return <div className="admin-loading"><LoaderCircle className="spin" /> {t('admin.loading.live_data', 'Loading live data…')}</div>;
  if (error && !definition) return <div className="admin-error">{error}</div>;
  if (!definition || rows === null) return <div className="admin-section-empty">{t('admin.metadata.missing', 'Admin metadata is unavailable.')}</div>;

  const title = t(definition.titleKey, definition.titleFallback);
  const description = t(definition.descriptionKey, definition.descriptionFallback);

  return (
    <div className="admin-section-page">
      <div className="admin-section-heading">
        <div><p>{t('admin.section.eyebrow', 'ADMIN SECTION')}</p><h1>{title}</h1><span>{description}</span></div>
        <button onClick={() => void load()}><RefreshCw size={16} /> {t('admin.refresh', 'Refresh')}</button>
      </div>

      <div className="admin-section-toolbar">
        <div><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('admin.search.placeholder', 'Search {section}…', { section: title.toLowerCase() })} /></div>
        {definition.statusField && <label><Filter size={15} /><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">{t('admin.filter.all', 'All')}</option>{statusOptions.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>}
        <span>{t('admin.records.count', '{count} records', { count: filtered.length })}</span>
      </div>

      {error && <div className="admin-error">{error}</div>}

      {definition.variant === 'media' && <div className="admin-media-grid">{filtered.map((row) => {
        const preview = resolveMediaPreview(row, definition);
        return <article key={text(row[definition.primaryKey])} onClick={() => setEditing({ ...row })}><MediaPreviewFrame preview={preview} alt={text(row[definition.titleField])} /><div><strong>{text(row[definition.titleField])}</strong><span>{text(row[definition.subtitleField || ''])}</span><small>{text(row[definition.statusField || ''])}</small></div></article>;
      })}</div>}

      {definition.variant === 'timeline' && <div className="admin-timeline-list">{filtered.map((row) => <button key={text(row[definition.primaryKey])} onClick={() => setEditing({ ...row })}><i /><div><time>{text(row[definition.dateField || ''])}</time><strong>{text(row[definition.titleField])}</strong><span>{text(row[definition.subtitleField || ''])}</span></div></button>)}</div>}

      {['cards', 'settings'].includes(definition.variant) && <div className="admin-record-grid">{filtered.map((row) => <article key={text(row[definition.primaryKey])}><div><strong>{text(row[definition.titleField])}</strong><span>{text(row[definition.subtitleField || ''])}</span></div><div className="admin-record-meta">{listFields.slice(1, 5).map((field) => <p key={field.name}><small>{t(field.labelKey, field.labelFallback)}</small><b>{text(row[field.name])}</b></p>)}</div><footer>{editorFields.some((field) => !field.readOnly) && <button onClick={() => setEditing({ ...row })}>{t('admin.edit', 'Edit')}</button>}{definition.linkField && row[definition.linkField] ? <a href={String(row[definition.linkField])} target="_blank" rel="noreferrer"><ExternalLink size={14} /> {t('admin.open', 'Open')}</a> : null}</footer></article>)}</div>}

      {['table', 'audit'].includes(definition.variant) && <div className="admin-data-table"><table><thead><tr>{listFields.map((field) => <th key={field.name}>{t(field.labelKey, field.labelFallback)}</th>)}{definition.variant !== 'audit' && editorFields.some((field) => !field.readOnly) && <th />}</tr></thead><tbody>{filtered.map((row) => <tr key={text(row[definition.primaryKey])}>{listFields.map((field) => <td key={field.name}>{field.name === definition.linkField && row[field.name] ? <a href={String(row[field.name])} target="_blank" rel="noreferrer">{t('admin.open', 'Open')} <ExternalLink size={12} /></a> : text(row[field.name])}</td>)}{definition.variant !== 'audit' && editorFields.some((field) => !field.readOnly) && <td><button onClick={() => setEditing({ ...row })}>{t('admin.edit', 'Edit')}</button></td>}</tr>)}</tbody></table></div>}

      {filtered.length === 0 && <div className="admin-section-empty">{t('admin.records.empty', 'No records found.')}</div>}

      {editing && <div className="admin-editor-backdrop"><section className="admin-editor"><header><div><p>{t('admin.editor.eyebrow', 'EDIT RECORD')}</p><h2>{text(editing[definition.titleField])}</h2></div><button onClick={() => setEditing(null)}><X /></button></header><div className="admin-editor-fields">{editorFields.map((field) => <label key={field.name}><span>{t(field.labelKey, field.labelFallback)}</span>{renderInput(field)}</label>)}</div><footer><button onClick={() => setEditing(null)}>{t('admin.cancel', 'Cancel')}</button><button className="primary" onClick={() => void saveEdit()} disabled={saving}>{saving ? <LoaderCircle className="spin" size={16} /> : <Save size={16} />} {t('admin.save_changes', 'Save changes')}</button></footer></section></div>}
    </div>
  );
}
