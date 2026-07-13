import { Check, Copy, ExternalLink, QrCode, Share2, Smartphone } from 'lucide-react';
import { useState } from 'react';
import './FounderSupportQrShare.css';

const WEBSITE_URL = 'https://www.bankruptto1million.com';
const QR_IMAGE_URL = 'https://zlwwncmbxohnezotomcx.supabase.co/storage/v1/object/public/media-images/branding/branding/qr_codes/bankruptto1million-qr.png';
const LOGO_IMAGE_URL = 'https://zlwwncmbxohnezotomcx.supabase.co/storage/v1/object/public/media-images/branding/logos/b1m_logo.png';

export function FounderSupportQrShare() {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(WEBSITE_URL);
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
          title: 'Bankrupt to 1 Million',
          text: 'Follow Kevin and Micha as they rebuild from rock bottom in public.',
          url: WEBSITE_URL,
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
        <p>
          Open this page on your phone, hold it up and let another person scan the QR code. They will be taken directly to
          <strong> Bankrupt to 1 Million</strong> to discover the story, follow the journey and support Kevin and Micha.
        </p>
        <div className="founder-support-qr__actions">
          <button type="button" className="button" onClick={() => void shareLink()}><Share2 size={17} /> Share website</button>
          <button type="button" className="button button--ghost" onClick={() => void copyLink()} aria-live="polite">
            {copied ? <Check size={17} /> : <Copy size={17} />}{copied ? 'Link copied' : 'Copy link'}
          </button>
          <a className="button button--ghost" href={WEBSITE_URL} target="_blank" rel="noreferrer"><ExternalLink size={17} /> Open website</a>
        </div>
        <div className="founder-support-qr__url"><Smartphone size={15} aria-hidden="true" /><span>www.bankruptto1million.com</span></div>
      </div>

      <div className="founder-support-qr__visuals" aria-label="Bankrupt to 1 Million logo and QR code">
        <figure className="founder-support-qr__visual founder-support-qr__visual--logo">
          <div className="founder-support-qr__frame founder-support-qr__frame--logo">
            <img src={LOGO_IMAGE_URL} alt="Bankrupt to 1 Million logo" loading="eager" />
          </div>
          <figcaption>Bankrupt to 1 Million</figcaption>
        </figure>

        <figure className="founder-support-qr__visual">
          <div className="founder-support-qr__frame">
            <img src={QR_IMAGE_URL} alt="QR code linking to www.bankruptto1million.com" loading="eager" />
          </div>
          <figcaption>Point your camera at the code</figcaption>
        </figure>
      </div>
    </section>
  );
}
