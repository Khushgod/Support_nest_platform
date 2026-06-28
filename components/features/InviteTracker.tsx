'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { MetricCard } from '@/components/ui/MetricCard';
import { Button } from '@/components/ui/Button';

interface Req {
  id: string;
  title: string;
  team: string;
}
interface InviteCandidate {
  id: string;
  name: string;
  email: string;
  status: string;
  inviteStatus: 'pending' | 'submitted' | 'expired' | 'invalidated';
  inviteLink: string | null;
  resumeReceived: boolean;
  diagnosticReceived: boolean;
  matchScore: number | null;
}
interface Metrics {
  total: number;
  pending_docs: number;
  docs_submitted: number;
  matched: number;
}

const STATUS_BADGE: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pending docs', color: 'var(--amber)' },
  submitted: { label: 'Docs submitted', color: 'var(--teal)' },
  expired: { label: 'Expired', color: 'var(--rose)' },
  invalidated: { label: 'Re-issued', color: 'var(--text-3)' },
};

export function InviteTracker() {
  const [reqs, setReqs] = useState<Req[]>([]);
  const [reqId, setReqId] = useState('');
  const [candidates, setCandidates] = useState<InviteCandidate[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/pipeline/candidates')
      .then((r) => r.json())
      .then((d) => {
        const list: Req[] = d.requisitions ?? [];
        setReqs(list);
        if (list[0]) setReqId(list[0].id);
      })
      .catch(() => setReqs([]));
  }, []);

  const load = useCallback(() => {
    if (!reqId) return;
    setLoading(true);
    fetch(`/api/requisitions/${reqId}/invites`)
      .then((r) => r.json())
      .then((d) => {
        setCandidates(d.candidates ?? []);
        setMetrics(d.metrics ?? null);
      })
      .catch(() => {
        setCandidates([]);
        setMetrics(null);
      })
      .finally(() => setLoading(false));
  }, [reqId]);

  useEffect(load, [load]);

  async function copy(link: string) {
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      /* ignore */
    }
  }

  async function resend(candidateId: string) {
    await fetch(`/api/invitations/${candidateId}/resend`, { method: 'POST' });
    load();
  }

  async function resendAllExpired() {
    const expired = candidates.filter((c) => c.inviteStatus === 'expired');
    await Promise.all(
      expired.map((c) =>
        fetch(`/api/invitations/${c.id}/resend`, { method: 'POST' })
      )
    );
    load();
  }

  const hasExpired = candidates.some((c) => c.inviteStatus === 'expired');

  return (
    <div className="space-y-4 px-6 pb-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-[var(--text-2)]">Candidate intake</h2>
        {reqs.length > 0 && (
          <select
            value={reqId}
            onChange={(e) => setReqId(e.target.value)}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-sm text-[var(--text)]"
          >
            {reqs.map((r) => (
              <option key={r.id} value={r.id}>
                {r.title} · {r.team}
              </option>
            ))}
          </select>
        )}
      </div>

      {metrics && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <MetricCard label="Invites sent" value={metrics.total} tone="violet" />
          <MetricCard label="Pending docs" value={metrics.pending_docs} tone="amber" />
          <MetricCard label="Docs submitted" value={metrics.docs_submitted} tone="teal" />
          <MetricCard label="Matched" value={metrics.matched} tone="green" />
        </div>
      )}

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-medium text-[var(--text-2)]">
            Invited candidates {loading ? '…' : `(${candidates.length})`}
          </p>
          {hasExpired && (
            <Button size="sm" variant="secondary" onClick={resendAllExpired}>
              Resend all expired
            </Button>
          )}
        </div>

        {candidates.length === 0 ? (
          <p className="text-sm text-[var(--text-3)]">
            No invited candidates yet. Ask a Program Manager to import a CSV.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-[var(--text-3)]">
                <th className="pb-2 font-medium">Candidate</th>
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2 font-medium">Invite link</th>
                <th className="pb-2 font-medium">Match</th>
                <th className="pb-2 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((c) => {
                const badge = STATUS_BADGE[c.inviteStatus] ?? STATUS_BADGE.pending;
                const canResend =
                  c.inviteStatus === 'expired' || c.inviteStatus === 'pending';
                return (
                  <tr key={c.id} className="border-t border-[var(--border)] text-[var(--text)]">
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-[var(--surface-2)] text-xs font-semibold text-[var(--violet)]">
                          {c.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-[var(--text)]">{c.name}</p>
                          <p className="truncate text-xs text-[var(--text-3)]">{c.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-2">
                      <span
                        className="rounded-full px-2 py-0.5 text-xs"
                        style={{ background: 'var(--surface-2)', color: badge.color }}
                      >
                        {badge.label}
                      </span>
                    </td>
                    <td className="py-2">
                      {c.inviteLink ? (
                        <span className="text-xs text-[var(--text-3)]">
                          /apply/{c.inviteLink.split('/apply/')[1]?.slice(0, 10)}…
                        </span>
                      ) : (
                        <span className="text-[var(--text-3)]">—</span>
                      )}
                    </td>
                    <td className="py-2">
                      {c.matchScore != null ? (
                        <span className="font-medium text-[var(--violet)]">
                          {Math.round(c.matchScore)}%
                        </span>
                      ) : (
                        <span className="text-[var(--text-3)]">—</span>
                      )}
                    </td>
                    <td className="py-2">
                      <div className="flex justify-end gap-2">
                        {c.inviteLink && (
                          <Button size="sm" variant="ghost" onClick={() => copy(c.inviteLink!)}>
                            Copy
                          </Button>
                        )}
                        {canResend && (
                          <Button size="sm" variant="ghost" onClick={() => resend(c.id)}>
                            Resend
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
