import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';
import { buttonClassName } from '../../lib/buttonStyles';
import type { ButtonSize, ButtonVariant } from '../../lib/buttonStyles';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize; children: ReactNode };
export function Button({ variant, size, className, children, ...props }: ButtonProps) {
  return <button className={buttonClassName({ variant, size, className })} {...props}>{children}</button>;
}

type ButtonLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & { variant?: ButtonVariant; size?: ButtonSize; children: ReactNode };
export function ButtonLink({ variant, size, className, children, ...props }: ButtonLinkProps) {
  return <a className={buttonClassName({ variant, size, className })} {...props}>{children}</a>;
}
