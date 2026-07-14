import { useMemo } from 'react';
import { useWebsiteI18n } from '../lib/websiteI18n';
import { StorageDownloadButton } from './StorageDownloadButton';

const PHOTO_FRAME_BUCKET = 'photo-frames';
const DEFAULT_LANGUAGE = 'en';

function normalizeLanguageCode(language: string) {
  return language.trim().toLowerCase().split('-')[0] || DEFAULT_LANGUAGE;
}

export function PhotoFrameDownloadButton({ className = '' }: { className?: string }) {
  const { language, t } = useWebsiteI18n();
  const normalizedLanguage = normalizeLanguageCode(language);
  const paths = useMemo(
    () => normalizedLanguage === DEFAULT_LANGUAGE
      ? [`frames/${DEFAULT_LANGUAGE}.png`]
      : [`frames/${normalizedLanguage}.png`, `frames/${DEFAULT_LANGUAGE}.png`],
    [normalizedLanguage],
  );

  return (
    <StorageDownloadButton
      bucket={PHOTO_FRAME_BUCKET}
      paths={paths}
      filename={`bankrupt-to-1-million-photo-frame-${normalizedLanguage}.png`}
      className={className}
      label={t('founder_support.qr.download_photo_frame', 'Download photo frame')}
      loadingLabel={t('founder_support.qr.downloading_photo_frame', 'Downloading photo frame…')}
      errorLabel={t('founder_support.qr.photo_frame_download_failed', 'The photo frame could not be downloaded.')}
    />
  );
}
