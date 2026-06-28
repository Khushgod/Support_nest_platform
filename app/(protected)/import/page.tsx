import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/middleware/auth';
import { getRequisitions } from '@/lib/queries';
import { ImportView } from '@/components/features/ImportView';

export default function ImportPage() {
  const user = getAuthUser();
  if (!user) redirect('/');

  const requisitions = getRequisitions(user.organization_id).map((r) => ({
    id: r.id,
    title: r.title,
    team: r.team,
  }));

  return <ImportView requisitions={requisitions} />;
}
