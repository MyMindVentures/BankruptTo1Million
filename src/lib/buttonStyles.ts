import { cn } from './utils';

export type ButtonVariant = 'default' | 'secondary' | 'ghost' | 'destructive';
export type ButtonSize = 'default' | 'sm' | 'lg';

const variantClass: Record<ButtonVariant, string> = {
  default: 'ui-button--default',
  secondary: 'ui-button--secondary',
  ghost: 'ui-button--ghost',
  destructive: 'ui-button--destructive',
};

const sizeClass: Record<ButtonSize, string> = {
  default: 'ui-button--default-size',
  sm: 'ui-button--sm',
  lg: 'ui-button--lg',
};

export function buttonClassName({ variant = 'default', size = 'default', className }: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {}) {
  return cn('ui-button', variantClass[variant], sizeClass[size], className);
}
