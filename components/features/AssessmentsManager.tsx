'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { AssessmentBuilder } from '@/components/AssessmentBuilder';
import { AssessmentTaker } from '@/components/AssessmentTaker';
import { Role } from '@/lib/types';

interface Summary {
  id: string;
  title: string;
  description: string;
  roleTitle: string;
  questionCount: number;
}
interface Assigned {
  candidateId: string;
  candidateName: string;
  status: string;
  score: number | null;
}
interface Candidate {
  id: string;
  first_name: string;
  last_name: string;
}

const STATUS_BADGE: Record<string, { label: string; color: string }> = {
  not_started: { label: 'Not started', color: 'var(--text-3)' },
  assigned: { label: '🔵 Assigned', color: 'var(--violet)' },
  submitted: { label: '🟡 Submitted', color: 'var(--amber)' },
  graded: { label: '✅ Graded', color: 'var(--teal)' },
};

export function AssessmentsManager({ role }: { role: Role }) {
  const isTa = role === 'talent_acquisition';
  const [assessments, setAssessments] = useState<Summary[] | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [assigned, setAssigned] = useState<Record<string, Assigned[]>>({});
  const [taking, setTaking] = useState<{ id: string; cand: Assigned } | null>(null);

  const loadList = useCallback(() => {
    fetch('/api/assessments')
      .then((r) => r.json())
      .then((d) => setAssessments(d.assessments))
      .catch(() => setAssessments([]));
  }, []);

  useEffect(() => {
    loadList();
    if (isTa) {
      fetch('/api/pipeline/candidates')
        .then((r) => r.json())
        .then((d) => setCandidates(d.candidates ?? []))
        .catch(() => setCandidates([]));
    }
  }, [loadList, isTa]);

  function loadDetails(id: string) {
    fetch(`/api/assessments/${id}/details`)
      .then((r) => r.json())
      .then((d) => setAssigned((m) => ({ ...m, [id]: d.assigned ?? [] })))
      .catch(() => {});
  }

  function toggle(id: string) {
    const next = openId === id ? null : id;
    setOpenId(next);
    if (next) loadDetails(next);
  }

  async function assign(id: string, candidateId: string) {
    if (!candidateId) return;
    await fetch(`/api/assessments/${id}/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ candidateId }),
    });
    loadDetails(id);
  }

  async function grade(id: string, candidateId: string) {
    const input = window.prompt('Enter score (0–100):');
    if (input == null) return;
    const score = Number(input);
    if (Number.isNaN(score)) return;
    await fetch(`/api/assessments/${id}/results/${candidateId}/grade`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ score }),
    });
    loadDetails(id);
  }

  if (!assessments) return <p className="p-6 text-[var(--text-3)]">Loading…</p>;

  return (
    <div className="space-y-6 p-6">
      {role === 'program_manager' && <AssessmentBuilder onCreated={loadList} />}

      <Card>
        <p className="mb-4 text-sm font-medium text-[var(--text-2)]">
          Assessment library ({assessments.length})
        </p>
        {assessments.length === 0 && (
          <p className="text-sm text-[var(--text-3)]">
            No assessments yet{role === 'program_manager' ? ' — create one above.' : '.'}
          </p>
        )}
        <div className="space-y-3">
          {assessments.map((a) => (
            <div
              key={a.id}
              className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[var(--text)]">{a.title}</p>
                  <p className="text-xs text-[var(--text-3)]">
                    {a.roleTitle} · {a.questionCount} questions
                  </p>
                </div>
                <Button size="sm" variant="secondary" onClick={() => toggle(a.id)}>
                  {openId === a.id ? 'Hide' : isTa ? 'Manage' : 'View'}
                </Button>
              </div>

              {openId === a.id && (
                <div className="mt-3 border-t border-[var(--border)] pt-3">
                  {isTa && (
                    <div className="mb-3 flex items-center gap-2">
                      <select
                        className="rounded bg-[var(--surface-1)] px-2 py-1 text-sm text-[var(--text)]"
                        defaultValue=""
                        onChange={(e) => {
                          assign(a.id, e.target.value);
                          e.target.value = '';
                        }}
                      >
                        <option value="" disabled>
                          Assign to candidate…
                        </option>
                        {candidates.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.first_name} {c.last_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <p className="mb-2 text-xs text-[var(--text-3)]">Assigned</p>
                  {(assigned[a.id]?.length ?? 0) === 0 ? (
                    <p className="text-xs text-[var(--text-3)]">No assignments yet.</p>
                  ) : (
                    <ul className="space-y-2">
                      {assigned[a.id].map((c) => {
                        const badge = STATUS_BADGE[c.status] ?? STATUS_BADGE.assigned;
                        return (
                          <li
                            key={c.candidateId}
                            className="flex items-center justify-between text-sm"
                          >
                            <span className="text-[var(--text)]">{c.candidateName}</span>
                            <span className="flex items-center gap-3">
                              <span style={{ color: badge.color }}>{badge.label}</span>
                              {c.score != null && (
                                <span className="text-[var(--violet)]">{c.score}%</span>
                              )}
                              {isTa && c.status !== 'graded' && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() =>
                                    setTaking({ id: a.id, cand: c })
                                  }
                                >
                                  Take
                                </Button>
                              )}
                              {isTa && c.status === 'submitted' && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => grade(a.id, c.candidateId)}
                                >
                                  Grade
                                </Button>
                              )}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      {taking && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setTaking(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <AssessmentTaker
              assessmentId={taking.id}
              candidateId={taking.cand.candidateId}
              candidateName={taking.cand.candidateName}
              onDone={() => {
                const id = taking.id;
                setTaking(null);
                loadDetails(id);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
