import { ReactNode } from 'react';

interface TopbarProps {
  title: string;
  /** Optional breadcrumb segments rendered before the title. */
  breadcrumb?: string[];
  /** Optional action buttons rendered on the right. */
  actions?: ReactNode;
}

export function Topbar({ title, breadcrumb, actions }: TopbarProps) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-[var(--border)] bg-[var(--bg)] px-6">
      <div>
        {breadcrumb && breadcrumb.length > 0 && (
          <p className="text-xs text-[var(--text-3)]">
            {breadcrumb.join('  /  ')}
          </p>
        )}
        <h1 className="text-lg font-semibold text-[var(--text)]">{title}</h1>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}
