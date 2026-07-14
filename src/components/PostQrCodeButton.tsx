import { LoaderCircle, QrCode, X } from 'lucide-react';
import { useEffect, useId, useState, type ButtonHTMLAttributes } from 'react';
import { generateContentQrCode, type ContentQrEntityType } from '../lib/contentQrCodes';
import { useShareCopy } from '../lib/shareI18n';
import './PostQrCodeButton.css';

type PostQrCodeButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'type' | 'onClick'> & {
  entityType: ContentQrEntityType;
  entityId: string;
  canonicalUrl: string;
  title: string;
  label?: string;
  instruction?: string;
};

export function PostQrCodeButton({
  entityType,
  entityId,
  canonicalUrl,
  title,
  label,
  instruction,
  className = '',
  disabled,
  ...buttonProps
}: PostQrCodeButtonProps) {
  const copy = useShareCopy();
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [resolvedUrl, setResolvedUrl] = useState(canonicalUrl);
  const [error, setError] = useState('');
  const classes = ['button', 'button--ghost', 'post-qr-button', className].filter(Boolean).join(' ');

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    document.body.classList.add('post-qr-modal-open');
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.classList.remove('post-qr-modal-open');
    };
  }, [open]);

  async function showQrCode() {
    setOpen(true);
    setError('');
    if (qrCodeUrl) return;

    setLoading(true);
    try {
      const result = await generateContentQrCode({ entityType, entityId, canonicalUrl });
      setQrCodeUrl(result.qrCodeUrl);
      setResolvedUrl(result.canonicalUrl);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load the QR code.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        {...buttonProps}
        type="button"
        className={classes}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-busy={loading}
        disabled={disabled || loading}
        onClick={showQrCode}
      >
        {loading ? <LoaderCircle aria-hidden="true" className="post-qr-button__spinner" size={18} /> : <QrCode aria-hidden="true" size={18} />}
        <span>{loading ? copy.loadingQr : (label || copy.qrButton)}</span>
      </button>

      {open ? (
        <div className="post-qr-modal" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setOpen(false);
        }}>
          <div className="post-qr-modal__panel" role="dialog" aria-modal="true" aria-labelledby={titleId}>
            <button className="post-qr-modal__close" type="button" onClick={() => setOpen(false)} aria-label={copy.closeQr}>
              <X aria-hidden="true" size={20} />
            </button>
            <p className="eyebrow">{copy.shareInPerson}</p>
            <h2 className="post-qr-modal__title" id={titleId}>{copy.qrTitle}</h2>
            <p className="post-qr-modal__post-title">{title}</p>

            {loading ? (
              <div className="post-qr-modal__state" role="status">
                <LoaderCircle aria-hidden="true" className="post-qr-button__spinner" size={28} />
                <span>{copy.generatingQr}</span>
              </div>
            ) : null}

            {!loading && error ? (
              <div className="post-qr-modal__state post-qr-modal__state--error" role="alert">
                <p>{error}</p>
                <button className="button button--ghost button--small" type="button" onClick={() => {
                  setQrCodeUrl('');
                  void showQrCode();
                }}>{copy.retry}</button>
              </div>
            ) : null}

            {!loading && qrCodeUrl ? (
              <>
                <img className="post-qr-modal__image" src={qrCodeUrl} alt={`${copy.qrTitle}: ${title}`} width={1024} height={1024} />
                <p className="post-qr-modal__instruction">{instruction || copy.qrInstruction}</p>
                <p className="post-qr-modal__url">{resolvedUrl}</p>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
