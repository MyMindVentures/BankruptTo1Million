import { Check, Copy, ExternalLink, NotebookPen, QrCode, Share2, Smartphone } from 'lucide-react';
import { useEffect, useState } from 'react';
import { canCreateJournalPost } from '../lib/adminApi';
import { MISSION_BRAND } from '../lib/brandAssets';
import { useWebsiteI18n } from '../lib/websiteI18n';
import { MissionLogo } from './MissionLogo';
import { FounderSupportUpcomingTimeline } from './FounderSupportUpcomingTimeline';
import './FounderSupportQrShare.css';

export function FounderSupportQrShare() {
  const { t } = useWebsiteI18n();
  const [copied, setCopied] = useState(false);
  const [canCreateJournal, setCanCreateJournal] = useState(false);

  useEffect(() => {
    let mounted = true;
    void canCreateJournalPost()
      .then((allowed) => { if (mounted) setCanCreateJournal(allowed); })
      .catch(() => { if (mounted) setCanCreateJournal(false); });
    return () => { mounted = false; };
  }, []);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(MISSION_BRAND.websiteUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  }

  async function shareLink() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: MISSION_BRAND.name,
          text: t(
            'founder_support.qr.share_text',
            'Follow Kevin and Micha as they rebuild from rock bottom in public.',
          ),
          url: MISSION_BRAND.websiteUrl,
        });
        return;
      } catch {
        return;
      }
    }
    await copyLink();
  }

  return (
    <section className="founder-support-qr" aria-labelledby="founder-support-qr-title">
      <div className="founder-support-qr__content">
        <div className="founder-support-qr__eyebrow">
          <QrCode size={17} aria-hidden="true" />
          {t('founder_support.qr.eyebrow', 'Share the mission in seconds')}
        </div>
        <h2 id="founder-support-qr-title">
          {t('founder_support.qr.title', 'Let someone next to you scan and join the journey.')}
        </h2>
        <p>
          {t(
            'founder_support.qr.body_before_brand',
            'Open this page on your phone, hold it up and let another person scan the QR code. They will be taken directly to',
          )}{' '}
          <strong>{MISSION_BRAND.name}</strong>{' '}
          {t(
            'founder_support.qr.body_after_brand',
            'to discover the story, follow the journey and support Kevin and Micha.',
          )}
        </p>
        <div className="founder-support-qr__actions">
          <button type="button" className="button" onClick={() => void shareLink()}>
            <Share2 size={17} />
            {t('founder_support.qr.share_website', 'Share website')}
          </button>
          <button type="button" className="button button--ghost" onClick={() => void copyLink()} aria-live="polite">
            {copied ? <Check size={17} /> : <Copy size={17} />}
            {copied
              ? t('founder_support.qr.link_copied', 'Link copied')
              : t('founder_support.qr.copy_link', 'Copy link')}
          </button>
          <a className="button button--ghost" href={MISSION_BRAND.websiteUrl} target="_blank" rel="noreferrer">
            <ExternalLink size={17} />
            {t('founder_support.qr.open_website', 'Open website')}
          </a>
        </div>
        <div className="founder-support-qr__url">
          <Smartphone size={15} aria-hidden="true" />
          <span>www.bankruptto1million.com</span>
        </div>
        {canCreateJournal && (
          <a className="button founder-support-qr__journal-button" href="/admin/journal?create=1">
            <NotebookPen size={18} aria-hidden="true" />
            Nieuwe journalpost aanmaken
          </a>
        )}
      </div>

      <div
        className="founder-support-qr__visuals"
        aria-label={t('founder_support.qr.visuals_aria', 'Bankrupt to 1 Million logo and QR code')}
      >
        <figure className="founder-support-qr__visual founder-support-qr__visual--logo">
          <div className="founder-support-qr__frame founder-support-qr__frame--logo"><MissionLogo eager /></div>
          <figcaption>{MISSION_BRAND.name}</figcaption>
        </figure>
        <figure className="founder-support-qr__visual">
          <div className="founder-support-qr__frame">
            <img
              src={MISSION_BRAND.qrUrl}
              alt={t('founder_support.qr.image_alt', 'QR code linking to www.bankruptto1million.com')}
              loading="eager"
            />
          </div>
          <figcaption>{t('founder_support.qr.scan_caption', 'Point your camera at the code')}</figcaption>
        </figure>
      </div>

      <div className="founder-upcoming">
        <FounderSupportUpcomingTimeline />
      </div>
    </section>
  );
}
