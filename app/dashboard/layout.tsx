import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/middleware/auth';
import { AuthedShell } from '@/components/layout/AuthedShell';
import { ROLE_HOME } from '@/lib/types';

// Program Manager area. Verify the session and enforce the role server-side.
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = getAuthUser();
  if (!user) redirect('/');
  if (user.role !== 'program_manager') redirect(ROLE_HOME[user.role]);

  return <AuthedShell user={user}>{children}</AuthedShell>;
}
