'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { QuestionType } from '@/lib/assessment';

interface DraftQuestion {
  type: QuestionType;
  prompt: string;
  options: string[];
  correct: number;
  rubric: string;
}

const emptyQuestion = (): DraftQuestion => ({
  type: 'multiple-choice',
  prompt: '',
  options: ['', ''],
  correct: 0,
  rubric: '',
});

const inputClass =
  'w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text)] placeholder-[var(--text-3)] focus:border-[var(--violet)] focus:outline-none';

export function AssessmentBuilder({ onCreated }: { onCreated?: () => void }) {
  const [title, setTitle] = useState('');
  const [roleTitle, setRoleTitle] = useState('');
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState<DraftQuestion[]>([emptyQuestion()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function update(i: number, patch: Partial<DraftQuestion>) {
    setQuestions((qs) => qs.map((q, idx) => (idx === i ? { ...q, ...patch } : q)));
  }

  async function save() {
    setError(null);
    if (!title.trim()) return setError('Title is required');
    if (questions.some((q) => !q.prompt.trim()))
      return setError('Every question needs a prompt');

    setSaving(true);
    const payload = {
      title,
      roleTitle: roleTitle || title,
      description,
      questions: questions.map((q) => ({
        type: q.type,
        prompt: q.prompt,
        options: q.type === 'multiple-choice' ? q.options.filter(Boolean) : undefined,
        correct: q.type === 'multiple-choice' ? q.correct : undefined,
        rubric: q.type !== 'multiple-choice' ? q.rubric : undefined,
      })),
    };
    try {
      const res = await fetch('/api/assessments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not save');
      } else {
        setSuccess(true);
        setTitle('');
        setRoleTitle('');
        setDescription('');
        setQuestions([emptyQuestion()]);
        onCreated?.();
        setTimeout(() => setSuccess(false), 2500);
      }
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <p className="mb-4 text-sm font-medium text-[var(--text-2)]">
        Create assessment
      </p>
      <div className="space-y-3">
        <input
          className={inputClass}
          placeholder="Title — e.g. Data Analyst · Pattern Recognition"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          className={inputClass}
          placeholder="Role title — e.g. Data Analyst"
          value={roleTitle}
          onChange={(e) => setRoleTitle(e.target.value)}
        />
        <textarea
          className={inputClass}
          placeholder="Short description"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        {questions.map((q, i) => (
          <div
            key={i}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs text-[var(--text-3)]">Question {i + 1}</span>
              <div className="flex items-center gap-2">
                <select
                  className="rounded bg-[var(--surface-1)] px-2 py-1 text-xs text-[var(--text)]"
                  value={q.type}
                  onChange={(e) => update(i, { type: e.target.value as QuestionType })}
                >
                  <option value="multiple-choice">Multiple choice</option>
                  <option value="text">Text</option>
                  <option value="coding">Coding</option>
                </select>
                {questions.length > 1 && (
                  <button
                    onClick={() =>
                      setQuestions((qs) => qs.filter((_, idx) => idx !== i))
                    }
                    className="text-xs text-[var(--rose)]"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>

            <input
              className={inputClass}
              placeholder="Prompt"
              value={q.prompt}
              onChange={(e) => update(i, { prompt: e.target.value })}
            />

            {q.type === 'multiple-choice' ? (
              <div className="mt-2 space-y-2">
                {q.options.map((opt, oi) => (
                  <div key={oi} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={`correct-${i}`}
                      checked={q.correct === oi}
                      onChange={() => update(i, { correct: oi })}
                      title="Mark as correct"
                    />
                    <input
                      className={inputClass}
                      placeholder={`Option ${oi + 1}`}
                      value={opt}
                      onChange={(e) =>
                        update(i, {
                          options: q.options.map((o, idx) =>
                            idx === oi ? e.target.value : o
                          ),
                        })
                      }
                    />
                  </div>
                ))}
                <button
                  onClick={() => update(i, { options: [...q.options, ''] })}
                  className="text-xs text-[var(--violet)]"
                >
                  + Add option
                </button>
              </div>
            ) : (
              <input
                className={`${inputClass} mt-2`}
                placeholder="Rubric / expected answer (for grading)"
                value={q.rubric}
                onChange={(e) => update(i, { rubric: e.target.value })}
              />
            )}
          </div>
        ))}

        <button
          onClick={() => setQuestions((qs) => [...qs, emptyQuestion()])}
          className="text-sm text-[var(--violet)]"
        >
          + Add question
        </button>

        {error && <p className="text-sm text-[var(--rose)]">{error}</p>}
        {success && (
          <p className="text-sm text-[var(--green)]">Assessment created</p>
        )}

        <div className="flex justify-end">
          <Button onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save assessment'}
          </Button>
        </div>
      </div>
    </Card>
  );
}
