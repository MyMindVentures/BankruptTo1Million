import { Check, Copy, Facebook, Linkedin, Mail, MessageCircle, Send, Share2 } from 'lucide-react';
import { useState } from 'react';
import { PostQrCodeButton } from './PostQrCodeButton';
import type { ContentQrEntityType } from '../lib/contentQrCodes';
import './ShareActions.css';

type SharePlatform = 'native' | 'copy_link' | 'x' | 'facebook' | 'linkedin' | 'whatsapp' | 'telegram' | 'email';

type ShareActionsProps = {
  title: string;
  url: string;
  entityType: ContentQrEntityType;
  entityId: string;
  qrLabel?: string;
  onShare?: (platform: SharePlatform) => void | Promise<void>;
};

const socialLinks: Array<{
  platform: Exclude<SharePlatform, 'native' | 'copy_link'>;
  label: string;
  icon: typeof Share2;
}> = [
  { platform: 'x', label: 'X', icon: Share2 },
  { platform: 'facebook', label: 'Facebook', icon: Facebook },
  { platform: 'linkedin', label: 'LinkedIn', icon: Linkedin },
  { platform: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
  { platform: 'telegram', label: 'Telegram', icon: Send },
  { platform: 'email', label: 'E-mail', icon: Mail },
];

function buildShareUrl(platform: Exclude<SharePlatform, 'native' | 'copy_link'>, url: string, title: string) {
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  switch (platform) {
    case 'x': return `https://x.com/intent/post?text=${encodedTitle}&url=${encodedUrl}`;
    case 'facebook': return `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
    case 'linkedin': return `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
    case 'whatsapp': return `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`;
    case 'telegram': return `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`;
    case 'email': return `mailto:?subject=${encodedTitle}&body=${encodedUrl}`;
  }
}

export function ShareActions({
  title,
  url,
  entityType,
  entityId,
  qrLabel = 'Show Post QR Code',
  onShare,
}: ShareActionsProps) {
  const [copied, setCopied] = useState(false);

  async function nativeShare() {
    if (!navigator.share) return;
    await onShare?.('native');
    try {
      await navigator.share({ title, text: title, url });
    } catch {
      return;
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      await onShare?.('copy_link');
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="share-actions-grid" role="group" aria-label="Share this content">
      {typeof navigator.share === 'function' ? (
        <button className="button share-actions-grid__item share-actions-grid__item--primary" type="button" onClick={nativeShare}>
          <Share2 aria-hidden="true" size={18} />
          <span>Native delen</span>
        </button>
      ) : null}

      <button className="button button--ghost share-actions-grid__item" type="button" onClick={copyLink} aria-live="polite">
        {copied ? <Check aria-hidden="true" size={18} /> : <Copy aria-hidden="true" size={18} />}
        <span>{copied ? 'Link gekopieerd' : 'Kopieer link'}</span>
      </button>

      <PostQrCodeButton
        entityType={entityType}
        entityId={entityId}
        canonicalUrl={url}
        title={title}
        label={qrLabel}
        className="share-actions-grid__item"
      />

      {socialLinks.map(({ platform, label, icon: Icon }) => (
        <a
          className="button button--ghost share-actions-grid__item"
          key={platform}
          href={buildShareUrl(platform, url, title)}
          target={platform === 'email' ? undefined : '_blank'}
          rel="noopener noreferrer"
          onClick={() => void onShare?.(platform)}
          aria-label={`Deel via ${label}`}
        >
          <Icon aria-hidden="true" size={18} />
          <span>{label}</span>
        </a>
      ))}
    </div>
  );
}
