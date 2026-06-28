'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { MetricCard } from '@/components/ui/MetricCard';

const ROLE_LABELS: Record<string, string> = {
  program_manager: 'Program Manager',
  talent_acquisition: 'Talent Acquisition',
  employee_hr: 'Employee / HR',
};
const ND_LABELS: Record<string, string> = {
  autistic: 'Autistic',
  adhd: 'ADHD',
  both: 'Autistic + ADHD',
  other: 'Other',
};
const cap = (s: string | null) =>
  s ? s.charAt(0).toUpperCase() + s.slice(1) : '—';

function usePm() {
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    fetch('/api/dashboard/pm')
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null));
  }, []);
  return data;
}

export function RequisitionsView() {
  const data = usePm();
  if (!data) return <p className="p-6 text-[var(--text-3)]">Loading…</p>;
  return (
    <div className="p-6">
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
              <th className="pb-2 font-medium">Active candidates</th>
              <th className="pb-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {data.requisitions.map((r: any) => (
              <tr key={r.id} className="border-t border-[var(--border)] text-[var(--text)]">
                <td className="py-2">{r.title}</td>
                <td className="py-2 text-[var(--text-2)]">{r.team}</td>
                <td className="py-2 text-[var(--text-2)]">{r.openings}</td>
                <td className="py-2 text-[var(--text-2)]">{r.candidateCount}</td>
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
    </div>
  );
}

export function StakeholdersView() {
  const data = usePm();
  if (!data) return <p className="p-6 text-[var(--text-3)]">Loading…</p>;
  return (
    <div className="p-6">
      <Card>
        <p className="mb-4 text-sm font-medium text-[var(--text-2)]">
          Stakeholders ({data.stakeholders.length})
        </p>
        <ul className="space-y-3">
          {data.stakeholders.map((s: any) => (
            <li key={s.id} className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--surface-2)] text-xs font-semibold text-[var(--violet)]">
                {s.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
              </div>
              <div>
                <p className="text-sm text-[var(--text)]">{s.full_name}</p>
                <p className="text-xs text-[var(--text-3)]">
                  {ROLE_LABELS[s.role] ?? s.role} · {s.email}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

export function RoiView() {
  const data = usePm();
  if (!data) return <p className="p-6 text-[var(--text-3)]">Loading…</p>;
  const roi = data.roi;
  return (
    <div className="space-y-6 p-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Hires made" value={roi.hires} tone="green" />
        <MetricCard label="Candidates processed" value={roi.candidatesProcessed} tone="violet" />
        <MetricCard label="Retention" value={`${roi.retentionPct}%`} tone="teal" />
        <MetricCard label="Avg match quality" value={`${roi.avgMatchScore}%`} tone="amber" />
      </div>
      <Card>
        <p className="mb-4 text-sm font-medium text-[var(--text-2)]">
          Program health by phase
        </p>
        <div className="space-y-3">
          {data.health.map((h: any) => (
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
                  style={{ width: `${Math.min(100, h.conversionPct)}%`, background: 'var(--violet)' }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

export function CandidatesView() {
  const [candidates, setCandidates] = useState<any[] | null>(null);
  useEffect(() => {
    fetch('/api/candidates')
      .then((r) => r.json())
      .then((d) => setCandidates(d.candidates))
      .catch(() => setCandidates([]));
  }, []);
  if (!candidates) return <p className="p-6 text-[var(--text-3)]">Loading…</p>;
  return (
    <div className="p-6">
      <Card>
        <p className="mb-4 text-sm font-medium text-[var(--text-2)]">
          All candidates ({candidates.length})
        </p>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-[var(--text-3)]">
              <th className="pb-2 font-medium">Name</th>
              <th className="pb-2 font-medium">Neurodivergence</th>
              <th className="pb-2 font-medium">Exp.</th>
              <th className="pb-2 font-medium">Phase</th>
              <th className="pb-2 font-medium">Status</th>
              <th className="pb-2 font-medium">Match</th>
            </tr>
          </thead>
          <tbody>
            {candidates.map((c: any) => (
              <tr key={c.id} className="border-t border-[var(--border)] text-[var(--text)]">
                <td className="py-2">{c.first_name} {c.last_name}</td>
                <td className="py-2 text-[var(--text-2)]">
                  {ND_LABELS[c.neurodivergence] ?? c.neurodivergence}
                </td>
                <td className="py-2 text-[var(--text-2)]">{c.years_experience}y</td>
                <td className="py-2 text-[var(--text-2)]">{cap(c.phase)}</td>
                <td className="py-2 capitalize text-[var(--text-2)]">{c.status}</td>
                <td className="py-2">
                  {c.matchScore != null ? (
                    <span className="font-medium text-[var(--violet)]">
                      {Math.round(c.matchScore)}%
                    </span>
                  ) : (
                    <span className="text-[var(--text-3)]">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
