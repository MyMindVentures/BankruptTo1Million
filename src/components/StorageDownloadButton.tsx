import { Download, LoaderCircle } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '../lib/supabase';
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

export function StorageDownloadButton({
  bucket,
  paths,
  filename,
  label,
  loadingLabel = 'Downloading…',
  errorLabel = 'The file could not be downloaded.',
  className = '',
  disabled = false,
  onDownloaded,
}: StorageDownloadButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [hasError, setHasError] = useState(false);

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
        {isDownloading ? loadingLabel : label}
      </button>
      {hasError ? <p className="storage-download-button__error" role="alert">{errorLabel}</p> : null}
    </div>
  );
}
