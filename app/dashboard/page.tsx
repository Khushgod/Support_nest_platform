import { Topbar } from '@/components/layout/Topbar';
import { PmDashboard } from '@/components/features/PmDashboard';

export default function DashboardPage() {
  return (
    <>
      <Topbar
        title="Program Manager Dashboard"
        breadcrumb={['Support Nest', 'Dashboard']}
      />
      <PmDashboard />
    </>
  );
}
