import { HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Use the elevated surface (--surface-2) instead of the default card surface. */
  elevated?: boolean;
}

export function Card({
  elevated = false,
  className = '',
  children,
  ...props
}: CardProps) {
  const surface = elevated ? 'bg-[var(--surface-2)]' : 'bg-[var(--surface-1)]';
  return (
    <div
      className={`${surface} border border-[var(--border)] rounded-xl p-5 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
