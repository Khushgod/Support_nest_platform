import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/middleware/auth';
import { AllyshipDashboard } from '@/components/features/AllyshipDashboard';

export default function AllyshipPage() {
  const user = getAuthUser();
  if (!user) redirect('/');

  return <AllyshipDashboard userId={user.id} />;
}
