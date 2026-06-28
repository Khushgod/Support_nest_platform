'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';

const ND_OPTIONS = [
  { value: 'autistic', label: 'Autistic' },
  { value: 'adhd', label: 'ADHD' },
  { value: 'both', label: 'Both' },
  { value: 'other', label: 'Other' },
] as const;

const MAX_BYTES = 5 * 1024 * 1024;

function FilePick({
  label,
  file,
  onPick,
}: {
  label: string;
  file: File | null;
  onPick: (f: File | null) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div>
      <p className="mb-1 text-sm text-[var(--text-2)]">{label}</p>
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className="flex w-full items-center justify-between rounded-lg border border-dashed border-[var(--border)] px-3 py-3 text-left text-sm hover:border-[var(--violet)]"
      >
        <span className={file ? 'text-[var(--text)]' : 'text-[var(--text-3)]'}>
          {file ? file.name : 'Click to select a PDF or DOCX'}
        </span>
        <span className="text-xs text-[var(--text-3)]">max 5MB</span>
      </button>
      <input
        ref={ref}
        type="file"
        accept=".pdf,.docx"
        className="hidden"
        onChange={(e) => onPick(e.target.files?.[0] ?? null)}
      />
    </div>
  );
}

export function CandidateIntakeForm({
  token,
  name,
  email,
  roleTitle,
  team,
  company,
}: {
  token: string;
  name: string;
  email: string;
  roleTitle: string;
  team: string;
  company: string;
}) {
  const [nd, setNd] = useState<string>('');
  const [years, setYears] = useState('');
  const [resume, setResume] = useState<File | null>(null);
  const [diagnostic, setDiagnostic] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  function validate(): string | null {
    if (!nd) return 'Please select how you identify.';
    if (!resume || !diagnostic) return 'Please attach both your résumé and diagnostic report.';
    for (const f of [resume, diagnostic]) {
      if (f.size > MAX_BYTES) return 'Each file must be under 5MB.';
      const n = f.name.toLowerCase();
      if (!n.endsWith('.pdf') && !n.endsWith('.docx')) return 'Only PDF and DOCX files are allowed.';
    }
    return null;
  }

  async function submit() {
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const data = new FormData();
      data.append('neurodivergence', nd);
      data.append('years_experience', years || '0');
      data.append('resume', resume!);
      data.append('diagnostic', diagnostic!);
      const res = await fetch(`/api/apply/${token}`, { method: 'POST', body: data });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Something went wrong. Please try again.');
        setSubmitting(false);
        return;
      }
      setDone(true);
    } catch {
      setError('Network error. Please try again.');
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-8">
        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--teal)] text-lg text-[#0E1018]">
          ✓
        </div>
        <h1 className="text-xl font-semibold text-[var(--text)]">
          Thank you, {name.split(' ')[0]}.
        </h1>
        <p className="mt-2 text-sm text-[var(--text-2)]">
          Your documents have been submitted for the {roleTitle} role at {company}.
        </p>
        <div className="mt-4 rounded-lg bg-[var(--surface-2)] p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-3)]">
            What happens next
          </p>
          <ul className="mt-2 space-y-1 text-sm text-[var(--text-2)]">
            <li>• Your diagnostic report is being analysed</li>
            <li>• The talent team will review your fit for this role</li>
            <li>• You&apos;ll hear back within 2 weeks</li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-8">
      <div className="mb-5 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--violet)] text-sm font-bold text-[#0E1018]">
          SN
        </div>
        <span className="font-semibold text-[var(--text)]">Support Nest</span>
      </div>

      <h1 className="text-xl font-semibold text-[var(--text)]">Complete your application</h1>
      <p className="mt-1 text-sm text-[var(--text-2)]">
        {roleTitle}
        {team ? ` · ${team}` : ''} · {company}
      </p>

      <div className="mt-6 space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-1 text-sm text-[var(--text-2)]">Name</p>
            <input
              value={name}
              disabled
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text-3)]"
            />
          </div>
          <div>
            <p className="mb-1 text-sm text-[var(--text-2)]">Email</p>
            <input
              value={email}
              disabled
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text-3)]"
            />
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm text-[var(--text-2)]">How do you identify?</p>
          <div className="flex flex-wrap gap-2">
            {ND_OPTIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => setNd(o.value)}
                className={`rounded-full px-4 py-1.5 text-sm transition-colors ${
                  nd === o.value
                    ? 'bg-[var(--violet)] text-[#0E1018]'
                    : 'border border-[var(--border)] text-[var(--text-2)] hover:text-[var(--text)]'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1 text-sm text-[var(--text-2)]">Years of experience</p>
          <input
            type="number"
            min={0}
            value={years}
            onChange={(e) => setYears(e.target.value)}
            placeholder="e.g. 3"
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text)] focus:border-[var(--violet)] focus:outline-none"
          />
        </div>

        <FilePick label="Résumé" file={resume} onPick={setResume} />
        <FilePick label="Diagnostic report" file={diagnostic} onPick={setDiagnostic} />

        <div className="rounded-lg bg-[var(--surface-2)] p-3 text-xs text-[var(--text-3)]">
          Your diagnostic report is encrypted at rest and only accessible to authorised
          assessors. You can request deletion at any time.
        </div>

        {error && (
          <p className="text-sm text-[var(--rose)]" role="alert">
            {error}
          </p>
        )}

        <Button onClick={submit} disabled={submitting} className="w-full">
          {submitting ? 'Submitting…' : 'Submit application'}
        </Button>
      </div>
    </div>
  );
}
