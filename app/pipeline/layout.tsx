import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/middleware/auth';
import { AuthedShell } from '@/components/layout/AuthedShell';
import { ROLE_HOME } from '@/lib/types';

// Talent Acquisition area.
export default function PipelineLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = getAuthUser();
  if (!user) redirect('/');
  if (user.role !== 'talent_acquisition') redirect(ROLE_HOME[user.role]);

  return <AuthedShell user={user}>{children}</AuthedShell>;
}
