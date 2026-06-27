import { redirect } from 'next/navigation';
import { Topbar } from '@/components/layout/Topbar';
import { getAuthUser } from '@/lib/middleware/auth';
import { AllyshipDashboard } from '@/components/features/AllyshipDashboard';

export default function AllyshipPage() {
  const user = getAuthUser();
  if (!user) redirect('/');

  return (
    <>
      <Topbar
        title="Allyship Training"
        breadcrumb={['Support Nest', 'Allyship']}
      />
      <AllyshipDashboard userId={user.id} />
    </>
  );
}
