import { type ReactNode } from 'react';

export function AdminField({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`admin-picker-field${className ? ` ${className}` : ''}`}>
      <span className="admin-picker-field__label">{label}</span>
      {children}
    </div>
  );
}
