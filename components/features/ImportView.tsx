'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface Req {
  id: string;
  title: string;
  team: string;
}
interface ImportSummary {
  total_rows: number;
  imported: number;
  failed: number;
  duplicates_skipped: number;
}
interface ImportedCandidate {
  id: string;
  name: string;
  email: string;
  inviteLink: string;
}
interface ImportError {
  row: number;
  field: string;
  value: string;
  reason: string;
}
interface Batch {
  id: string;
  filename: string;
  uploaded_at: string;
  row_count: number;
  imported_count: number;
  failed_count: number;
  duplicate_count: number;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        });
      }}
      className="rounded-md border border-[var(--border)] px-2 py-1 text-xs text-[var(--text-2)] hover:text-[var(--text)]"
    >
      {copied ? 'Copied' : 'Copy link'}
    </button>
  );
}

export function ImportView({ requisitions }: { requisitions: Req[] }) {
  const [reqId, setReqId] = useState(requisitions[0]?.id ?? '');
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    summary: ImportSummary;
    candidates: ImportedCandidate[];
    errors: ImportError[];
  } | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadHistory = useCallback(() => {
    if (!reqId) return;
    fetch(`/api/requisitions/${reqId}/invites`)
      .then((r) => r.json())
      .then((d) => setBatches(d.batches ?? []))
      .catch(() => setBatches([]));
  }, [reqId]);

  useEffect(loadHistory, [loadHistory]);

  function pick(f: File | null) {
    setError(null);
    setResult(null);
    if (!f) return;
    if (!f.name.toLowerCase().endsWith('.csv')) {
      setError('Please select a .csv file.');
      return;
    }
    setFile(f);
  }

  async function runImport() {
    if (!file || !reqId) return;
    setImporting(true);
    setError(null);
    try {
      const data = new FormData();
      data.append('file', file);
      const res = await fetch(`/api/requisitions/${reqId}/import`, {
        method: 'POST',
        body: data,
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Import failed.');
      } else {
        setResult({ summary: json.summary, candidates: json.candidates, errors: json.errors });
        setFile(null);
        loadHistory();
      }
    } finally {
      setImporting(false);
    }
  }

  if (requisitions.length === 0) {
    return (
      <div className="p-6">
        <Card>
          <p className="text-sm text-[var(--text-3)]">
            Create a requisition first, then import candidates into it.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <Card>
        <div className="rounded-lg bg-[var(--surface-2)] p-3 text-sm text-[var(--text-2)]">
          Upload a CSV exported from LinkedIn. Required columns:{' '}
          <code className="text-[var(--text)]">name</code>,{' '}
          <code className="text-[var(--text)]">email</code>. Optional:{' '}
          <code>applied_date</code>, <code>resume_link</code>. Max 500 rows.{' '}
          <a href="/sample-import.csv" download className="text-[var(--violet)] hover:underline">
            Download sample CSV
          </a>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-1 text-sm text-[var(--text-2)]">Import into requisition</p>
            <select
              value={reqId}
              onChange={(e) => {
                setReqId(e.target.value);
                setResult(null);
              }}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text)]"
            >
              {requisitions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title} · {r.team}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            pick(e.dataTransfer.files?.[0] ?? null);
          }}
          onClick={() => inputRef.current?.click()}
          className={`mt-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
            dragging
              ? 'border-[var(--violet)] bg-[var(--surface-2)]'
              : 'border-[var(--border)] hover:border-[var(--violet)]'
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => pick(e.target.files?.[0] ?? null)}
          />
          <p className="text-sm text-[var(--text-2)]">
            {file ? file.name : 'Drag & drop or click to select a CSV'}
          </p>
          <p className="mt-1 text-xs text-[var(--text-3)]">CSV · max 500 rows</p>
        </div>

        {error && (
          <p className="mt-3 text-sm text-[var(--rose)]" role="alert">
            {error}
          </p>
        )}

        <div className="mt-4 flex justify-end">
          <Button onClick={runImport} disabled={!file || importing}>
            {importing ? 'Importing…' : 'Import CSV'}
          </Button>
        </div>
      </Card>

      {result && (
        <Card>
          <p className="mb-3 text-sm font-medium text-[var(--text-2)]">Import results</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Total rows" value={result.summary.total_rows} />
            <Stat label="Imported" value={result.summary.imported} tone="var(--teal)" />
            <Stat label="Failed" value={result.summary.failed} tone="var(--rose)" />
            <Stat label="Duplicates" value={result.summary.duplicates_skipped} tone="var(--amber)" />
          </div>

          {result.errors.length > 0 && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm text-[var(--rose)]">
                {result.errors.length} failed row(s)
              </summary>
              <ul className="mt-2 space-y-1 text-xs text-[var(--text-3)]">
                {result.errors.map((e, i) => (
                  <li key={i}>
                    Row {e.row}: {e.reason}
                    {e.value ? ` (“${e.value}”)` : ''}
                  </li>
                ))}
              </ul>
            </details>
          )}

          {result.candidates.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-xs text-[var(--text-3)]">Invite links</p>
              <ul className="space-y-2">
                {result.candidates.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm text-[var(--text)]">{c.name}</p>
                      <p className="truncate text-xs text-[var(--text-3)]">{c.inviteLink}</p>
                    </div>
                    <CopyButton text={c.inviteLink} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}

      <Card>
        <p className="mb-3 text-sm font-medium text-[var(--text-2)]">Import history</p>
        {batches.length === 0 ? (
          <p className="text-sm text-[var(--text-3)]">No imports yet for this requisition.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-[var(--text-3)]">
                <th className="pb-2 font-medium">File</th>
                <th className="pb-2 font-medium">Date</th>
                <th className="pb-2 font-medium">Imported</th>
                <th className="pb-2 font-medium">Failed</th>
                <th className="pb-2 font-medium">Duplicates</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((b) => (
                <tr key={b.id} className="border-t border-[var(--border)] text-[var(--text)]">
                  <td className="py-2">{b.filename}</td>
                  <td className="py-2 text-[var(--text-2)]">
                    {new Date(b.uploaded_at).toLocaleDateString()}
                  </td>
                  <td className="py-2 text-[var(--teal)]">{b.imported_count}</td>
                  <td className="py-2 text-[var(--rose)]">{b.failed_count}</td>
                  <td className="py-2 text-[var(--amber)]">{b.duplicate_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="rounded-lg bg-[var(--surface-2)] p-3">
      <p className="text-xs text-[var(--text-3)]">{label}</p>
      <p className="mt-1 text-2xl font-semibold" style={{ color: tone ?? 'var(--text)' }}>
        {value}
      </p>
    </div>
  );
}
