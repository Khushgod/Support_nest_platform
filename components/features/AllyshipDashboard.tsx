'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { MetricCard } from '@/components/ui/MetricCard';

interface ModuleRow {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  order: number;
  startedAt: string | null;
  completedAt: string | null;
  score: number | null;
}
interface ProgressData {
  modules: ModuleRow[];
  completedCount: number;
  totalCount: number;
  progressPct: number;
  minutesInvested: number;
  certified: boolean;
}

export function AllyshipDashboard({ userId }: { userId: string }) {
  const [data, setData] = useState<ProgressData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/allyship/progress/${userId}`)
      .then(async (r) => {
        if (!r.ok) throw new Error('Failed');
        return r.json();
      })
      .then(setData)
      .catch(() => setError('Could not load training progress.'));
  }, [userId]);

  if (error) return <p className="p-6 text-[var(--rose)]">{error}</p>;
  if (!data) return <p className="p-6 text-[var(--text-3)]">Loading…</p>;

  return (
    <div className="space-y-6 p-6">
      {/* Module progression tracker */}
      <Card>
        <p className="mb-4 text-sm font-medium text-[var(--text-2)]">
          Your allyship path
        </p>
        <div className="flex items-center">
          {data.modules.map((m, i) => {
            const done = Boolean(m.completedAt);
            return (
              <div key={m.id} className="flex flex-1 items-center">
                <div className="flex flex-1 flex-col items-center text-center">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold"
                    style={{
                      background: done ? 'var(--teal)' : 'var(--surface-2)',
                      borderColor: done ? 'var(--teal)' : 'var(--border)',
                      color: done ? '#0E1018' : 'var(--text-3)',
                    }}
                  >
                    {done ? '✓' : i + 1}
                  </div>
                  <span className="mt-2 text-xs text-[var(--text-3)]">
                    {m.title}
                  </span>
                </div>
                {i < data.modules.length - 1 && (
                  <div
                    className="mx-1 h-0.5 w-6 flex-none"
                    style={{ background: 'var(--border)' }}
                    aria-hidden
                  />
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Metric cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard
          label="Course progress"
          value={`${data.progressPct}%`}
          delta={`${data.completedCount}/${data.totalCount} modules`}
          tone="violet"
        />
        <MetricCard
          label="Time invested"
          value={`${(data.minutesInvested / 60).toFixed(1)} hrs`}
          tone="teal"
        />
        <MetricCard
          label="Certification"
          value={data.certified ? 'Earned' : 'Locked'}
          tone={data.certified ? 'green' : 'amber'}
        />
      </div>

      {/* Module grid (content arrives in Chunk 3) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.modules.map((m) => {
          const done = Boolean(m.completedAt);
          return (
            <Card key={m.id} className="flex flex-col justify-between">
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs text-[var(--text-3)]">
                    Module {m.order}
                  </span>
                  <span
                    className="rounded-full px-2 py-0.5 text-xs"
                    style={{
                      background: 'var(--surface-2)',
                      color: done ? 'var(--teal)' : 'var(--text-3)',
                    }}
                  >
                    {done ? 'Complete' : 'Not started'}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-[var(--text)]">
                  {m.title}
                </h3>
                <p className="mt-1 text-xs text-[var(--text-3)]">
                  {m.description}
                </p>
              </div>
              <p className="mt-4 text-xs text-[var(--text-3)]">
                {m.duration_minutes} min
              </p>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
