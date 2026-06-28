'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';

interface Question {
  id: string;
  type: 'text' | 'multiple-choice' | 'coding';
  prompt: string;
  options?: string[];
}
interface Details {
  id: string;
  title: string;
  questions: Question[];
}

const inputClass =
  'w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text)] focus:border-[var(--violet)] focus:outline-none';

export function AssessmentTaker({
  assessmentId,
  candidateId,
  candidateName,
  onDone,
}: {
  assessmentId: string;
  candidateId: string;
  candidateName: string;
  onDone?: () => void;
}) {
  const [details, setDetails] = useState<Details | null>(null);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [result, setResult] = useState<{ status: string; score: number | null } | null>(
    null
  );
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/assessments/${assessmentId}/details`)
      .then((r) => r.json())
      .then(setDetails)
      .catch(() => setDetails(null));
  }, [assessmentId]);

  if (!details) return <p className="text-sm text-[var(--text-3)]">Loading…</p>;
  if (result) {
    return (
      <div className="text-center">
        <p className="text-lg font-semibold text-[var(--text)]">Submitted</p>
        <p className="mt-2 text-sm text-[var(--text-2)]">
          Status: <span className="capitalize">{result.status}</span>
          {result.score != null && ` · Score: ${result.score}%`}
        </p>
        {result.status === 'submitted' && (
          <p className="mt-1 text-xs text-[var(--text-3)]">
            Free-text answers are pending manual review.
          </p>
        )}
        <div className="mt-4 flex justify-end">
          <Button onClick={onDone}>Close</Button>
        </div>
      </div>
    );
  }

  const q = details.questions[idx];
  const total = details.questions.length;

  async function submit() {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/assessments/${assessmentId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId, answers }),
      });
      const data = await res.json();
      setResult({ status: data.status, score: data.score ?? null });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <p className="mb-1 text-xs text-[var(--text-3)]">
        For {candidateName} · Question {idx + 1} of {total}
      </p>
      <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-2)]">
        <div
          className="h-full rounded-full bg-[var(--violet)]"
          style={{ width: `${((idx + 1) / total) * 100}%` }}
        />
      </div>

      <p className="mb-3 text-sm font-medium text-[var(--text)]">{q.prompt}</p>

      {q.type === 'multiple-choice' ? (
        <div className="space-y-2">
          {q.options?.map((opt, oi) => (
            <label
              key={oi}
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--border)] p-2 text-sm text-[var(--text)] hover:bg-[var(--surface-2)]"
            >
              <input
                type="radio"
                name={q.id}
                checked={answers[q.id] === oi}
                onChange={() => setAnswers((a) => ({ ...a, [q.id]: oi }))}
              />
              {opt}
            </label>
          ))}
        </div>
      ) : (
        <textarea
          className={inputClass}
          rows={4}
          placeholder="Type your answer…"
          value={(answers[q.id] as string) ?? ''}
          onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
        />
      )}

      <div className="mt-4 flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIdx((i) => Math.max(0, i - 1))}
          disabled={idx === 0}
        >
          Previous
        </Button>
        {idx < total - 1 ? (
          <Button size="sm" onClick={() => setIdx((i) => i + 1)}>
            Next
          </Button>
        ) : (
          <Button size="sm" onClick={submit} disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit'}
          </Button>
        )}
      </div>
    </div>
  );
}
