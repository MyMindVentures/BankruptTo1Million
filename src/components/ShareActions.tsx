import type { I18nManifest } from '../lib/i18nManifest';
import { Check, Copy, Facebook, Linkedin, Mail, MessageCircle, Send, Share2 } from 'lucide-react';
import { useState } from 'react';
import { PostQrCodeButton } from './PostQrCodeButton';
import type { ContentQrEntityType } from '../lib/contentQrCodes';
import { useShareCopy } from '../lib/shareI18n';
import './ShareActions.css';

type SharePlatform = 'native' | 'copy_link' | 'x' | 'facebook' | 'linkedin' | 'whatsapp' | 'telegram' | 'email';

type ShareActionsProps = {
  title: string;
  url: string;
  entityType: ContentQrEntityType;
  entityId: string;
  qrLabel?: string;
  onShare?: (platform: SharePlatform) => void;
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

export const SHARE_ACTIONS_I18N_MANIFEST = {
  componentKey: 'components.share.actions',
  namespace: 'ui',
  translationKeys: [
  ] as const,
} as const satisfies I18nManifest;

export function ShareActions({
  title,
  url,
  entityType,
  entityId,
  qrLabel,
  onShare,
}: ShareActionsProps) {
  const copy = useShareCopy();
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
    <div className="share-actions-grid" role="group" aria-label={copy.shareLabel}>
      {typeof navigator.share === 'function' ? (
        <button className="button share-actions-grid__item share-actions-grid__item--primary" type="button" onClick={nativeShare}>
          <Share2 aria-hidden="true" size={18} />
          <span>{copy.nativeShare}</span>
        </button>
      ) : null}

      <button className="button button--ghost share-actions-grid__item" type="button" onClick={copyLink} aria-live="polite">
        {copied ? <Check aria-hidden="true" size={18} /> : <Copy aria-hidden="true" size={18} />}
        <span>{copied ? copy.copied : copy.copyLink}</span>
      </button>

      <PostQrCodeButton
        entityType={entityType}
        entityId={entityId}
        canonicalUrl={url}
        title={title}
        label={qrLabel || copy.qrButton}
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
          aria-label={`${copy.shareVia} ${label}`}
        >
          <Icon aria-hidden="true" size={18} />
          <span>{label}</span>
        </a>
      ))}
    </div>
  );
}
