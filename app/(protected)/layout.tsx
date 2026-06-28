import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/middleware/auth';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';

/**
 * Shared shell for ALL authenticated routes (every role).
 * Per-route role enforcement happens in middleware.ts; here we just verify the
 * session exists and render the role-aware Sidebar + Topbar around the page.
 */
export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = getAuthUser();
  if (!user) redirect('/');

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg)]">
      <Sidebar user={user} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar user={user} />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
