import type { I18nManifest } from '../lib/i18nManifest';
import { useMemo } from 'react';
import { useWebsiteI18n } from '../lib/websiteI18n';
import { StorageDownloadButton } from './StorageDownloadButton';

const PHOTO_FRAME_BUCKET = 'photo-frames';
const DEFAULT_LANGUAGE = 'en';

function normalizeLanguageCode(language: string) {
  return language.trim().toLowerCase().split('-')[0] || DEFAULT_LANGUAGE;
}

function photoFramePath(language: string) {
  return `photoframe-${language}.png`;
}

export const PHOTO_FRAME_DOWNLOAD_BUTTON_I18N_MANIFEST = {
  componentKey: 'components.photo.frame.download.button',
  namespace: 'founder_support.qr',
  translationKeys: [
    'founder_support.qr.download_photo_frame',
    'founder_support.qr.downloading_photo_frame',
    'founder_support.qr.photo_frame_download_failed',
  ] as const,
  keyPatterns: [
    'founder_support.qr.*',
  ] as const,
} as const satisfies I18nManifest;

export function PhotoFrameDownloadButton({ className = '' }: { className?: string }) {
  const { language, t } = useWebsiteI18n();
  const normalizedLanguage = normalizeLanguageCode(language);
  const paths = useMemo(
    () => normalizedLanguage === DEFAULT_LANGUAGE
      ? [photoFramePath(DEFAULT_LANGUAGE)]
      : [photoFramePath(normalizedLanguage), photoFramePath(DEFAULT_LANGUAGE)],
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
