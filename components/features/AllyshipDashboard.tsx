'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { MetricCard } from '@/components/ui/MetricCard';
import { Button } from '@/components/ui/Button';
import { ModuleViewer } from '@/components/ModuleViewer';
import { CertificationQuiz } from '@/components/CertificationQuiz';

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

type ModState = 'done' | 'available' | 'locked';

export function AllyshipDashboard({ userId }: { userId: string }) {
  const [data, setData] = useState<ProgressData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openModule, setOpenModule] = useState<ModuleRow | null>(null);

  const load = useCallback(() => {
    fetch(`/api/allyship/progress/${userId}`)
      .then(async (r) => {
        if (!r.ok) throw new Error('Failed');
        return r.json();
      })
      .then(setData)
      .catch(() => setError('Could not load training progress.'));
  }, [userId]);

  useEffect(load, [load]);

  if (error) return <p className="p-6 text-[var(--rose)]">{error}</p>;
  if (!data) return <p className="p-6 text-[var(--text-3)]">Loading…</p>;

  // Sequential unlock: a module is available once all earlier ones are done.
  const stateFor = (m: ModuleRow): ModState => {
    if (m.completedAt) return 'done';
    const earlier = data.modules.filter((x) => x.order < m.order);
    return earlier.every((x) => x.completedAt) ? 'available' : 'locked';
  };

  const certModule = data.modules.find((m) => m.slug === 'certification');
  const certState = certModule ? stateFor(certModule) : 'locked';
  const certStatus = data.certified
    ? 'Passed'
    : certState === 'available'
      ? 'Ready'
      : 'Locked';

  const BADGE: Record<ModState, { label: string; color: string }> = {
    done: { label: '✅ Done', color: 'var(--green)' },
    available: { label: '🆕 Available', color: 'var(--teal)' },
    locked: { label: '🔒 Locked', color: 'var(--text-3)' },
  };

  return (
    <div className="space-y-6 p-6">
      {/* Phase tracker */}
      <Card>
        <p className="mb-4 text-sm font-medium text-[var(--text-2)]">
          Your allyship path ({data.completedCount}/{data.totalCount})
        </p>
        <div className="flex items-center">
          {data.modules.map((m, i) => {
            const st = stateFor(m);
            return (
              <div key={m.id} className="flex flex-1 items-center">
                <div className="flex flex-1 flex-col items-center text-center">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold"
                    style={{
                      background: st === 'done' ? 'var(--teal)' : 'var(--surface-2)',
                      borderColor:
                        st === 'locked' ? 'var(--border)' : 'var(--teal)',
                      color: st === 'done' ? '#0E1018' : 'var(--text-3)',
                    }}
                  >
                    {st === 'done' ? '✓' : st === 'locked' ? '🔒' : i + 1}
                  </div>
                  <span className="mt-2 text-xs text-[var(--text-3)]">
                    {m.title}
                  </span>
                </div>
                {i < data.modules.length - 1 && (
                  <div
                    className="mx-1 h-0.5 w-6 flex-none"
                    style={{
                      background: m.completedAt ? 'var(--teal)' : 'var(--border)',
                    }}
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
          value={certStatus}
          tone={data.certified ? 'green' : certState === 'available' ? 'teal' : 'amber'}
        />
      </div>

      {data.certified && (
        <Card elevated>
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏆</span>
            <div>
              <p className="text-sm font-semibold text-[var(--text)]">
                Allyship Certificate earned
              </p>
              <p className="text-xs text-[var(--text-3)]">
                You’ve completed all modules and passed the certification.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Module grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {data.modules.map((m) => {
          const st = stateFor(m);
          const badge = BADGE[st];
          const isQuiz = m.slug === 'certification';
          const pct = m.completedAt ? 100 : 0;
          return (
            <Card key={m.id} className="flex flex-col justify-between">
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs text-[var(--text-3)]">
                    Module {m.order}
                  </span>
                  <span
                    className="rounded-full px-2 py-0.5 text-xs"
                    style={{ background: 'var(--surface-2)', color: badge.color }}
                  >
                    {badge.label}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-[var(--text)]">
                  {m.title}
                </h3>
                <p className="mt-1 text-xs text-[var(--text-3)]">{m.description}</p>
              </div>

              <div className="mt-4">
                <div className="mb-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-2)]">
                  <div
                    className="h-full rounded-full bg-[var(--teal)]"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--text-3)]">
                    {m.duration_minutes} min
                  </span>
                  <Button
                    size="sm"
                    variant={st === 'locked' ? 'ghost' : 'secondary'}
                    disabled={st === 'locked'}
                    onClick={() => setOpenModule(m)}
                  >
                    {st === 'done'
                      ? 'Review'
                      : isQuiz
                        ? 'Take quiz'
                        : 'Start'}
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Module / quiz modal */}
      {openModule && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4"
          onClick={() => setOpenModule(null)}
        >
          <div
            className="w-full max-w-2xl rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {openModule.slug === 'certification' ? (
              <CertificationQuiz
                slug={openModule.slug}
                onClose={() => setOpenModule(null)}
                onDone={() => {
                  setOpenModule(null);
                  load();
                }}
              />
            ) : (
              <ModuleViewer
                slug={openModule.slug}
                onClose={() => setOpenModule(null)}
                onCompleted={() => {
                  setOpenModule(null);
                  load();
                }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
