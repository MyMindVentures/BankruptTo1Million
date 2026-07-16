import { useMemo } from 'react';
import { useWebsiteI18n } from './websiteI18n';

export function useShareCopy() {
  const { t } = useWebsiteI18n();

  return useMemo(() => ({
    nativeShare: t('share.native', 'Native share'),
    copyLink: t('share.copy_link', 'Copy link'),
    copied: t('share.link_copied', 'Link copied'),
    qrButton: t('share.qr_button', 'Show Post QR Code'),
    shareInPerson: t('share.qr.eyebrow', 'Share in person'),
    qrTitle: t('share.qr.title', 'Show Post QR Code'),
    qrInstruction: t('share.qr.instruction', 'Scan this QR code to open this post.'),
    loadingQr: t('share.qr.loading', 'Loading QR Code…'),
    generatingQr: t('share.qr.generating', 'Generating the QR code…'),
    retry: t('share.qr.retry', 'Try again'),
    qrNetworkError: t('share.qr.network_error', 'Could not reach the QR code service. Check your connection and try again.'),
    qrApiError: t('share.qr.api_error', 'Unable to generate the QR code. Please try again.'),
    closeQr: t('share.qr.close', 'Close QR code'),
    shareLabel: t('share.group_aria', 'Share this content'),
    shareVia: t('share.via_aria', 'Share via'),
  }), [t]);
}
