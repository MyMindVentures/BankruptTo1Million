import { QrCode } from 'lucide-react';
import type { ButtonHTMLAttributes } from 'react';

type PostQrCodeButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'type'> & {
  label?: string;
};

export function PostQrCodeButton({
  label = 'Show Post QR Code',
  className = '',
  ...buttonProps
}: PostQrCodeButtonProps) {
  const classes = ['button', 'button--ghost', className].filter(Boolean).join(' ');

  return (
    <button
      {...buttonProps}
      type="button"
      className={classes}
      aria-haspopup="dialog"
    >
      <QrCode aria-hidden="true" size={18} />
      <span>{label}</span>
    </button>
  );
}
