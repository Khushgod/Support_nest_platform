import { Topbar } from '@/components/layout/Topbar';
import { Card } from '@/components/ui/Card';

export default function AllyshipPage() {
  return (
    <>
      <Topbar
        title="Allyship Training"
        breadcrumb={['Support Nest', 'Allyship']}
      />
      <div className="space-y-6 p-6">
        <Card>
          <p className="text-sm text-[var(--text-3)]">
            Placeholder — your allyship training dashboard, module library, and
            certifications arrive in Chunk 3.
          </p>
        </Card>
      </div>
    </>
  );
}
