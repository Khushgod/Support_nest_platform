import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/middleware/auth';
import { CertificatesView } from '@/components/features/CertificatesView';

export default function CertificatesPage() {
  const user = getAuthUser();
  if (!user) redirect('/');
  return <CertificatesView userId={user.id} />;
}
