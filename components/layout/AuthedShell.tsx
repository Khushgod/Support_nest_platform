import { ReactNode } from 'react';
import { AuthUser } from '@/lib/types';
import { Sidebar } from './Sidebar';

/** Sidebar + scrollable content area used by every authenticated route tree. */
export function AuthedShell({
  user,
  children,
}: {
  user: AuthUser;
  children: ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg)]">
      <Sidebar user={user} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
