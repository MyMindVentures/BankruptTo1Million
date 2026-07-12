import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/utils';

export function Card({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return <article className={cn('ui-card', className)} {...props} />;
}
export function Callout({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('ui-callout', className)} {...props} />;
}
export function Badge({ className, children, ...props }: HTMLAttributes<HTMLSpanElement> & { children: ReactNode }) {
  return <span className={cn('ui-badge', className)} {...props}>{children}</span>;
}
