import { Check, Copy, ExternalLink, QrCode, Share2, Smartphone } from 'lucide-react';
import { useState } from 'react';
import { MISSION_BRAND } from '../lib/brandAssets';
import { MissionLogo } from './MissionLogo';
import { FounderSupportUpcomingTimeline } from './FounderSupportUpcomingTimeline';
import './FounderSupportQrShare.css';

export function FounderSupportQrShare() {
  const [copied, setCopied] = useState(false);

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
          text: 'Follow Kevin and Micha as they rebuild from rock bottom in public.',
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
        <div className="founder-support-qr__eyebrow"><QrCode size={17} aria-hidden="true" /> Share the mission in seconds</div>
        <h2 id="founder-support-qr-title">Let someone next to you scan and join the journey.</h2>
        <p>Open this page on your phone, hold it up and let another person scan the QR code. They will be taken directly to <strong>{MISSION_BRAND.name}</strong> to discover the story, follow the journey and support Kevin and Micha.</p>
        <div className="founder-support-qr__actions">
          <button type="button" className="button" onClick={() => void shareLink()}><Share2 size={17} /> Share website</button>
          <button type="button" className="button button--ghost" onClick={() => void copyLink()} aria-live="polite">{copied ? <Check size={17} /> : <Copy size={17} />}{copied ? 'Link copied' : 'Copy link'}</button>
          <a className="button button--ghost" href={MISSION_BRAND.websiteUrl} target="_blank" rel="noreferrer"><ExternalLink size={17} /> Open website</a>
        </div>
        <div className="founder-support-qr__url"><Smartphone size={15} aria-hidden="true" /><span>www.bankruptto1million.com</span></div>
      </div>

      <div className="founder-support-qr__visuals" aria-label="Bankrupt to 1 Million logo and QR code">
        <figure className="founder-support-qr__visual founder-support-qr__visual--logo">
          <div className="founder-support-qr__frame founder-support-qr__frame--logo"><MissionLogo eager /></div>
          <figcaption>{MISSION_BRAND.name}</figcaption>
        </figure>
        <figure className="founder-support-qr__visual">
          <div className="founder-support-qr__frame"><img src={MISSION_BRAND.qrUrl} alt="QR code linking to www.bankruptto1million.com" loading="eager" /></div>
          <figcaption>Point your camera at the code</figcaption>
        </figure>
      </div>

      <div className="founder-upcoming">
        <FounderSupportUpcomingTimeline />
      </div>
    </section>
  );
}
