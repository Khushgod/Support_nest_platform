import { Topbar } from '@/components/layout/Topbar';
import { TaPipeline } from '@/components/features/TaPipeline';

export default function PipelinePage() {
  return (
    <>
      <Topbar
        title="Talent Acquisition Pipeline"
        breadcrumb={['Support Nest', 'Pipeline']}
      />
      <TaPipeline />
    </>
  );
}
