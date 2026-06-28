'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';

const MAX_BYTES = 5 * 1024 * 1024;

function isAllowed(file: File): boolean {
  const n = file.name.toLowerCase();
  return n.endsWith('.pdf') || n.endsWith('.docx');
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function FileUpload({
  candidateId,
  onUploaded,
}: {
  candidateId: string;
  onUploaded?: (result: any) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function pick(f: File | null) {
    setError(null);
    setSuccess(false);
    if (!f) return;
    if (!isAllowed(f)) {
      setError('Only PDF and DOCX files allowed');
      return;
    }
    if (f.size > MAX_BYTES) {
      setError('File must be under 5MB');
      return;
    }
    setFile(f);
  }

  function upload() {
    if (!file) return;
    setUploading(true);
    setError(null);
    setProgress(0);

    const data = new FormData();
    data.append('file', file);
    data.append('candidateId', candidateId);

    // XHR (not fetch) so we can show real upload progress.
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/reports/upload');
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        setProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => {
      setUploading(false);
      if (xhr.status >= 200 && xhr.status < 300) {
        setSuccess(true);
        setFile(null);
        setProgress(100);
        let result: unknown = null;
        try {
          result = JSON.parse(xhr.responseText);
        } catch {
          /* ignore */
        }
        onUploaded?.(result);
      } else {
        try {
          setError(JSON.parse(xhr.responseText).error || 'Upload failed');
        } catch {
          setError('Upload failed');
        }
      }
    };
    xhr.onerror = () => {
      setUploading(false);
      setError('Something went wrong. Try again.');
    };
    xhr.send(data);
  }

  return (
    <div>
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
        className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
          dragging
            ? 'border-[var(--violet)] bg-[var(--surface-2)]'
            : 'border-[var(--border)] hover:border-[var(--violet)]'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx"
          className="hidden"
          onChange={(e) => pick(e.target.files?.[0] ?? null)}
        />
        <p className="text-sm text-[var(--text-2)]">
          {file ? file.name : 'Drag & drop or click to select a report'}
        </p>
        <p className="mt-1 text-xs text-[var(--text-3)]">
          {file ? formatSize(file.size) : 'PDF or DOCX · max 5MB'}
        </p>
      </div>

      {uploading && (
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[var(--surface-2)]">
          <div
            className="h-full rounded-full bg-[var(--violet)] transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {error && (
        <p className="mt-3 text-sm text-[var(--rose)]" role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className="mt-3 text-sm text-[var(--green)]">
          Report uploaded successfully
        </p>
      )}

      <div className="mt-4 flex justify-end">
        <Button onClick={upload} disabled={!file || uploading}>
          {uploading ? `Uploading… ${progress}%` : 'Upload'}
        </Button>
      </div>
    </div>
  );
}
