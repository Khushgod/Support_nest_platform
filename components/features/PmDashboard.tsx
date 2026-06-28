'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { MetricCard } from '@/components/ui/MetricCard';

interface PhaseCount {
  phase: string;
  count: number;
}
interface ReqRow {
  id: string;
  title: string;
  team: string;
  openings: number;
  status: string;
  candidateCount: number;
}
interface Stakeholder {
  id: string;
  full_name: string;
  email: string;
  role: string;
}
interface Health {
  phase: string;
  everEntered: number;
  conversionPct: number;
}
interface PmData {
  metrics: {
    activeCandidates: number;
    avgMatchScore: number;
    timeToOfferDays: number;
    retentionPct: number;
  };
  phases: PhaseCount[];
  requisitions: ReqRow[];
  stakeholders: Stakeholder[];
  health: Health[];
  roi: {
    hires: number;
    candidatesProcessed: number;
    retentionPct: number;
    avgMatchScore: number;
  };
  assessmentPassRate: { graded: number; passRate: number } | null;
}

const ROLE_LABELS: Record<string, string> = {
  program_manager: 'Program Manager',
  talent_acquisition: 'Talent Acquisition',
  employee_hr: 'Employee / HR',
};

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function PmDashboard() {
  const [data, setData] = useState<PmData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/dashboard/pm')
      .then(async (r) => {
        if (!r.ok) throw new Error('Failed to load');
        return r.json();
      })
      .then(setData)
      .catch(() => setError('Could not load dashboard data.'));
  }, []);

  if (error) return <p className="p-6 text-[var(--rose)]">{error}</p>;
  if (!data) return <p className="p-6 text-[var(--text-3)]">Loading…</p>;

  return (
    <div className="space-y-6 p-6">
      {/* Phase tracker with counts */}
      <Card>
        <p className="mb-4 text-sm font-medium text-[var(--text-2)]">
          Hiring pipeline
        </p>
        <div className="flex items-center">
          {data.phases.map((p, i) => (
            <div key={p.phase} className="flex flex-1 items-center">
              <div className="flex flex-1 flex-col items-center">
                <span className="text-2xl font-semibold text-[var(--text)]">
                  {p.count}
                </span>
                <span className="mt-1 text-xs text-[var(--text-3)]">
                  {cap(p.phase)}
                </span>
              </div>
              {i < data.phases.length - 1 && (
                <div
                  className="mx-1 h-0.5 w-6 flex-none"
                  style={{ background: 'var(--border)' }}
                  aria-hidden
                />
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Metric cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Active candidates"
          value={data.metrics.activeCandidates}
          tone="violet"
        />
        <MetricCard
          label="Avg match score"
          value={`${data.metrics.avgMatchScore}%`}
          tone="teal"
        />
        <MetricCard
          label="Time to offer"
          value={`${data.metrics.timeToOfferDays} days`}
          tone="amber"
        />
        <MetricCard
          label="6-mo retention"
          value={`${data.metrics.retentionPct}%`}
          tone="green"
        />
      </div>

      {data.assessmentPassRate && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Skill assessment pass rate"
            value={`${data.assessmentPassRate.passRate}%`}
            delta={`${data.assessmentPassRate.graded} graded`}
            tone="teal"
          />
        </div>
      )}

      {/* Two-column layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left (wider) */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <p className="mb-4 text-sm font-medium text-[var(--text-2)]">
              Open requisitions
            </p>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-[var(--text-3)]">
                  <th className="pb-2 font-medium">Role</th>
                  <th className="pb-2 font-medium">Team</th>
                  <th className="pb-2 font-medium">Openings</th>
                  <th className="pb-2 font-medium">Active</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.requisitions.map((r) => (
                  <tr
                    key={r.id}
                    className="border-t border-[var(--border)] text-[var(--text)]"
                  >
                    <td className="py-2">{r.title}</td>
                    <td className="py-2 text-[var(--text-2)]">{r.team}</td>
                    <td className="py-2 text-[var(--text-2)]">{r.openings}</td>
                    <td className="py-2 text-[var(--text-2)]">
                      {r.candidateCount}
                    </td>
                    <td className="py-2">
                      <span className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-xs text-[var(--teal)]">
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <Card>
            <p className="mb-4 text-sm font-medium text-[var(--text-2)]">
              Program health by phase
            </p>
            <div className="space-y-3">
              {data.health.map((h) => (
                <div key={h.phase}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="text-[var(--text-2)]">{cap(h.phase)}</span>
                    <span className="text-[var(--text-3)]">
                      {h.everEntered} reached · {h.conversionPct}% conv.
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--surface-2)]">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(100, h.conversionPct)}%`,
                        background: 'var(--violet)',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right */}
        <div className="space-y-6">
          <Card>
            <p className="mb-4 text-sm font-medium text-[var(--text-2)]">
              Stakeholders
            </p>
            <ul className="space-y-3">
              {data.stakeholders.map((s) => (
                <li key={s.id} className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--surface-2)] text-xs font-semibold text-[var(--violet)]">
                    {s.full_name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm text-[var(--text)]">
                      {s.full_name}
                    </p>
                    <p className="truncate text-xs text-[var(--text-3)]">
                      {ROLE_LABELS[s.role] ?? s.role}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          <Card elevated>
            <p className="mb-4 text-sm font-medium text-[var(--text-2)]">
              Inclusion ROI
            </p>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-[var(--text-3)]">Hires made</dt>
                <dd className="font-semibold text-[var(--green)]">
                  {data.roi.hires}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--text-3)]">Candidates processed</dt>
                <dd className="font-semibold text-[var(--text)]">
                  {data.roi.candidatesProcessed}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--text-3)]">Retention</dt>
                <dd className="font-semibold text-[var(--teal)]">
                  {data.roi.retentionPct}%
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--text-3)]">Avg match quality</dt>
                <dd className="font-semibold text-[var(--violet)]">
                  {data.roi.avgMatchScore}%
                </dd>
              </div>
            </dl>
          </Card>
        </div>
      </div>
    </div>
  );
}
