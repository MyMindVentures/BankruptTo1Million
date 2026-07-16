import type { I18nManifest } from '../lib/i18nManifest';
import { Download, LoaderCircle } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useWebsiteI18n } from '../lib/websiteI18n';
import './StorageDownloadButton.css';

type StorageDownloadButtonProps = {
  bucket: string;
  paths: string[];
  filename: string;
  label: string;
  loadingLabel?: string;
  errorLabel?: string;
  className?: string;
  disabled?: boolean;
  onDownloaded?: (resolvedPath: string) => void;
};

function publicObjectUrl(bucket: string, path: string) {
  const encodedPath = path
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');

  return `${supabase.url}/storage/v1/object/public/${encodeURIComponent(bucket)}/${encodedPath}`;
}

function triggerBrowserDownload(blob: Blob, filename: string) {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

export const STORAGE_DOWNLOAD_BUTTON_I18N_MANIFEST = {
  componentKey: 'components.storage.download.button',
  namespace: 'ui',
  translationKeys: [] as const,
  keyPatterns: ['storage_download.*'] as const,
} as const satisfies I18nManifest;

export function StorageDownloadButton({
  bucket,
  paths,
  filename,
  label,
  loadingLabel,
  errorLabel,
  className = '',
  disabled = false,
  onDownloaded,
}: StorageDownloadButtonProps) {
  const { t } = useWebsiteI18n();
  const [isDownloading, setIsDownloading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const resolvedLoadingLabel = loadingLabel || t('storage_download.loading', 'Downloading…');
  const resolvedErrorLabel = errorLabel || t('storage_download.error', 'The file could not be downloaded.');

  async function download() {
    if (isDownloading || disabled || paths.length === 0) return;

    setIsDownloading(true);
    setHasError(false);

    try {
      for (const path of paths) {
        const response = await fetch(publicObjectUrl(bucket, path));
        if (!response.ok) continue;

        const blob = await response.blob();
        triggerBrowserDownload(blob, filename);
        onDownloaded?.(path);
        return;
      }

      setHasError(true);
    } catch {
      setHasError(true);
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <div className="storage-download-button">
      <button
        type="button"
        className={`button ${className}`.trim()}
        onClick={() => void download()}
        disabled={disabled || isDownloading || paths.length === 0}
        aria-busy={isDownloading}
      >
        {isDownloading ? <LoaderCircle className="storage-download-button__spinner" size={18} aria-hidden="true" /> : <Download size={18} aria-hidden="true" />}
        {isDownloading ? resolvedLoadingLabel : label}
      </button>
      {hasError ? <p className="storage-download-button__error" role="alert">{resolvedErrorLabel}</p> : null}
    </div>
  );
}
