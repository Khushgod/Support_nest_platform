'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';

interface QuizQ {
  prompt: string;
  options: string[];
}
interface QuizData {
  title: string;
  quiz?: { passPct: number; questions: QuizQ[] };
}

export function CertificationQuiz({
  slug,
  onDone,
  onClose,
}: {
  slug: string;
  onDone: () => void;
  onClose: () => void;
}) {
  const [data, setData] = useState<QuizData | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<{ passed: boolean; score: number } | null>(
    null
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/allyship/modules/${slug}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => setError('Could not load quiz.'));
  }, [slug]);

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/allyship/certification/${slug}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      });
      const d = await res.json();
      if (!res.ok) {
        setError(d.error || 'Could not submit');
      } else {
        setResult({ passed: d.passed, score: d.score });
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (error) return <p className="text-sm text-[var(--rose)]">{error}</p>;
  if (!data?.quiz) return <p className="text-sm text-[var(--text-3)]">Loading…</p>;

  if (result) {
    return (
      <div className="text-center">
        <p className="text-2xl">{result.passed ? '✅' : '❌'}</p>
        <p className="mt-2 text-lg font-semibold text-[var(--text)]">
          {result.passed
            ? "Passed! You've earned your allyship certificate"
            : 'Not yet — review the modules and retake the quiz'}
        </p>
        <p className="mt-1 text-sm text-[var(--text-3)]">Score: {result.score}%</p>
        <div className="mt-4 flex justify-center">
          <Button onClick={result.passed ? onDone : onClose}>
            {result.passed ? 'View certificate' : 'Close'}
          </Button>
        </div>
      </div>
    );
  }

  const qs = data.quiz.questions;
  const allAnswered = qs.every((_, i) => answers[String(i)] != null);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[var(--text)]">
          Certification check
        </h2>
        <button
          onClick={onClose}
          className="text-[var(--text-3)] hover:text-[var(--text)]"
        >
          ✕
        </button>
      </div>
      <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-2">
        {qs.map((q, i) => (
          <div key={i}>
            <p className="mb-2 text-sm font-medium text-[var(--text)]">
              {i + 1}. {q.prompt}
            </p>
            <div className="space-y-1.5">
              {q.options.map((opt, oi) => (
                <label
                  key={oi}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--border)] p-2 text-sm text-[var(--text)] hover:bg-[var(--surface-2)]"
                >
                  <input
                    type="radio"
                    name={`q-${i}`}
                    checked={answers[String(i)] === oi}
                    onChange={() =>
                      setAnswers((a) => ({ ...a, [String(i)]: oi }))
                    }
                  />
                  {opt}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex justify-end">
        <Button onClick={submit} disabled={!allAnswered || submitting}>
          {submitting ? 'Submitting…' : 'Submit quiz'}
        </Button>
      </div>
    </div>
  );
}
