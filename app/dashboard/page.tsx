import { Topbar } from '@/components/layout/Topbar';
import { Card } from '@/components/ui/Card';
import { MetricCard } from '@/components/ui/MetricCard';
import { PhaseTracker } from '@/components/ui/PhaseTracker';

export default function DashboardPage() {
  return (
    <>
      <Topbar
        title="Program Manager Dashboard"
        breadcrumb={['Support Nest', 'Dashboard']}
      />
      <div className="space-y-6 p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard label="Open Requisitions" value="—" tone="violet" />
          <MetricCard label="Candidates in Pipeline" value="—" tone="teal" />
          <MetricCard label="Offers Extended" value="—" tone="amber" />
          <MetricCard label="Retention (90d)" value="—" tone="green" />
        </div>

        <Card>
          <p className="mb-4 text-sm font-medium text-[var(--text-2)]">
            Hiring journey
          </p>
          <PhaseTracker currentPhase={1} />
        </Card>

        <Card>
          <p className="text-sm text-[var(--text-3)]">
            Placeholder — full Program Manager dashboard (metrics, requisitions,
            pipeline, Inclusion ROI) arrives in Chunk 2.
          </p>
        </Card>
      </div>
    </>
  );
}
