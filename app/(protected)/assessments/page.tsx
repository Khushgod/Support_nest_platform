import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/middleware/auth';
import { AssessmentsManager } from '@/components/features/AssessmentsManager';

export default function AssessmentsPage() {
  const user = getAuthUser();
  if (!user) redirect('/');
  return <AssessmentsManager role={user.role} />;
}
