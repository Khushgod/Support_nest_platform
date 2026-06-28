'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';

interface ModuleData {
  slug: string;
  title: string;
  durationMinutes: number;
  contentHtml: string | null;
}

export function ModuleViewer({
  slug,
  onCompleted,
  onClose,
}: {
  slug: string;
  onCompleted: () => void;
  onClose: () => void;
}) {
  const [mod, setMod] = useState<ModuleData | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/allyship/modules/${slug}`)
      .then((r) => r.json())
      .then(setMod)
      .catch(() => setError('Could not load module.'));
  }, [slug]);

  async function complete() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/allyship/modules/${slug}/complete`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not save');
      } else {
        onCompleted();
      }
    } finally {
      setSaving(false);
    }
  }

  if (error) return <p className="text-sm text-[var(--rose)]">{error}</p>;
  if (!mod) return <p className="text-sm text-[var(--text-3)]">Loading…</p>;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[var(--text)]">{mod.title}</h2>
        <button
          onClick={onClose}
          className="text-[var(--text-3)] hover:text-[var(--text)]"
        >
          ✕
        </button>
      </div>
      <p className="mb-3 text-xs text-[var(--text-3)]">
        {mod.durationMinutes} min read
      </p>
      <div
        className="allyship-content max-h-[60vh] overflow-y-auto pr-2 text-sm leading-relaxed text-[var(--text-2)]"
        dangerouslySetInnerHTML={{ __html: mod.contentHtml ?? '' }}
      />
      <div className="mt-4 flex justify-end">
        <Button onClick={complete} disabled={saving}>
          {saving ? 'Saving…' : 'Mark as complete'}
        </Button>
      </div>
    </div>
  );
}
