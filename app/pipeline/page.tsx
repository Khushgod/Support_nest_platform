import { Topbar } from '@/components/layout/Topbar';
import { Card } from '@/components/ui/Card';

export default function PipelinePage() {
  return (
    <>
      <Topbar
        title="Talent Acquisition Pipeline"
        breadcrumb={['Support Nest', 'Pipeline']}
      />
      <div className="space-y-6 p-6">
        <Card>
          <p className="text-sm text-[var(--text-3)]">
            Placeholder — candidate shortlist, genetranslate panel, assessments,
            and interview-prep tracking arrive in Chunks 2 & 3.
          </p>
        </Card>
      </div>
    </>
  );
}
