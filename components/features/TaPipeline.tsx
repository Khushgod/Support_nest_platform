'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { FileUpload } from '@/components/FileUpload';
import { GenetranslatePanel, NeuroProfile } from '@/components/GenetranslatePanel';

interface PipelineCandidate {
  id: string;
  first_name: string;
  last_name: string;
  neurodivergence: string;
  years_experience: number;
  status: string;
  matchScore: number | null;
  assessmentStatus: 'not_started' | 'assigned' | 'submitted' | 'graded';
  assessmentScore: number | null;
  requisitionId: string | null;
  requisitionTitle: string | null;
  hasReport: boolean;
}
interface ReqRow {
  id: string;
  title: string;
}
interface PipelineData {
  candidates: PipelineCandidate[];
  requisitions: ReqRow[];
  shortlist: string[];
}

const ND_LABELS: Record<string, string> = {
  autistic: 'Autistic',
  adhd: 'ADHD',
  both: 'Autistic + ADHD',
  other: 'Other',
};

const ASSESSMENT_BADGE: Record<
  PipelineCandidate['assessmentStatus'],
  { label: string; color: string }
> = {
  not_started: { label: 'Not started', color: 'var(--text-3)' },
  assigned: { label: '🔵 Assigned', color: 'var(--violet)' },
  submitted: { label: '🟡 Submitted', color: 'var(--amber)' },
  graded: { label: '✅ Graded', color: 'var(--teal)' },
};

export function TaPipeline() {
  const [data, setData] = useState<PipelineData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeReq, setActiveReq] = useState<string>('all');
  const [uploadFor, setUploadFor] = useState<PipelineCandidate | null>(null);
  const [parsed, setParsed] = useState<NeuroProfile | null>(null);
  const [parsing, setParsing] = useState(false);

  function load() {
    fetch('/api/pipeline/candidates')
      .then(async (r) => {
        if (!r.ok) throw new Error('Failed');
        return r.json();
      })
      .then(setData)
      .catch(() => setError('Could not load pipeline.'));
  }

  useEffect(load, []);

  function closeUpload() {
    setUploadFor(null);
    setParsed(null);
    setParsing(false);
  }

  if (error) return <p className="p-6 text-[var(--rose)]">{error}</p>;
  if (!data) return <p className="p-6 text-[var(--text-3)]">Loading…</p>;

  const visible =
    activeReq === 'all'
      ? data.candidates
      : data.candidates.filter((c) => c.requisitionId === activeReq);

  return (
    <div className="space-y-6 p-6">
      {/* Requisition tabs */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setActiveReq('all')}
          className={`rounded-lg px-3 py-1.5 text-sm ${
            activeReq === 'all'
              ? 'bg-[var(--surface-2)] text-[var(--text)]'
              : 'text-[var(--text-2)] hover:text-[var(--text)]'
          }`}
        >
          All ({data.candidates.length})
        </button>
        {data.requisitions.map((r) => {
          const count = data.candidates.filter(
            (c) => c.requisitionId === r.id
          ).length;
          return (
            <button
              key={r.id}
              onClick={() => setActiveReq(r.id)}
              className={`rounded-lg px-3 py-1.5 text-sm ${
                activeReq === r.id
                  ? 'bg-[var(--surface-2)] text-[var(--text)]'
                  : 'text-[var(--text-2)] hover:text-[var(--text)]'
              }`}
            >
              {r.title} ({count})
            </button>
          );
        })}
      </div>

      <Card>
        <p className="mb-4 text-sm font-medium text-[var(--text-2)]">
          Candidate shortlist
        </p>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-[var(--text-3)]">
              <th className="pb-2 font-medium">Name</th>
              <th className="pb-2 font-medium">Neurodivergence</th>
              <th className="pb-2 font-medium">Exp.</th>
              <th className="pb-2 font-medium">Status</th>
              <th className="pb-2 font-medium">Match</th>
              <th className="pb-2 font-medium">Assessment</th>
              <th className="pb-2 font-medium">Report</th>
              <th className="pb-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {visible.map((c) => {
              const badge = ASSESSMENT_BADGE[c.assessmentStatus];
              const starred = data.shortlist.includes(c.id);
              return (
                <tr
                  key={c.id}
                  className="border-t border-[var(--border)] text-[var(--text)]"
                >
                  <td className="py-2">
                    {starred && (
                      <span
                        className="mr-1 text-[var(--amber)]"
                        title="Top shortlist"
                      >
                        ★
                      </span>
                    )}
                    {c.first_name} {c.last_name}
                  </td>
                  <td className="py-2 text-[var(--text-2)]">
                    {ND_LABELS[c.neurodivergence] ?? c.neurodivergence}
                  </td>
                  <td className="py-2 text-[var(--text-2)]">
                    {c.years_experience}y
                  </td>
                  <td className="py-2 text-[var(--text-2)] capitalize">
                    {c.status}
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
                    <span style={{ color: badge.color }}>{badge.label}</span>
                    {c.assessmentScore != null && (
                      <span className="ml-1 text-[var(--violet)]">
                        {c.assessmentScore}%
                      </span>
                    )}
                  </td>
                  <td className="py-2">
                    {c.hasReport ? (
                      <span className="text-[var(--teal)]">On file</span>
                    ) : (
                      <span className="text-[var(--text-3)]">None</span>
                    )}
                  </td>
                  <td className="py-2 text-right">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setUploadFor(c)}
                    >
                      Upload report
                    </Button>
                  </td>
                </tr>
              );
            })}
            {visible.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="py-6 text-center text-[var(--text-3)]"
                >
                  No candidates for this requisition.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      {/* Upload modal */}
      {uploadFor && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4"
          onClick={closeUpload}
        >
          <div
            className={`w-full ${parsed ? 'max-w-3xl' : 'max-w-md'} rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-6`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[var(--text)]">
                {parsed ? 'genetranslate profile' : 'Upload diagnostic report'}
              </h2>
              <button
                onClick={closeUpload}
                className="text-[var(--text-3)] hover:text-[var(--text)]"
              >
                ✕
              </button>
            </div>

            {parsed ? (
              <>
                <GenetranslatePanel profile={parsed} />
                <div className="mt-4 flex justify-end">
                  <Button onClick={closeUpload}>Done</Button>
                </div>
              </>
            ) : parsing ? (
              <p className="py-8 text-center text-sm text-[var(--text-2)]">
                genetranslate is parsing…
              </p>
            ) : (
              <>
                <p className="mb-4 text-sm text-[var(--text-3)]">
                  For {uploadFor.first_name} {uploadFor.last_name}. Files are
                  encrypted at rest, then parsed into a PII-free profile.
                </p>
                <FileUpload
                  candidateId={uploadFor.id}
                  onUploaded={(result) => {
                    setParsing(true);
                    load();
                    if (result?.parsedProfile) {
                      setParsed(result.parsedProfile as NeuroProfile);
                    }
                    setParsing(false);
                  }}
                />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
