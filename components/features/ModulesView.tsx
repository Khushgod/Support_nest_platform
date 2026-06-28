'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ModuleViewer } from '@/components/ModuleViewer';

interface ModuleRow {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  order: number;
  completedAt: string | null;
}

export function ModulesView() {
  const [modules, setModules] = useState<ModuleRow[] | null>(null);
  const [open, setOpen] = useState<ModuleRow | null>(null);

  function load() {
    fetch('/api/allyship/modules')
      .then((r) => r.json())
      .then((d) => setModules(d.modules))
      .catch(() => setModules([]));
  }
  useEffect(load, []);

  if (!modules) return <p className="p-6 text-[var(--text-3)]">Loading…</p>;

  return (
    <div className="space-y-4 p-6">
      <p className="text-sm text-[var(--text-3)]">
        Browse the full allyship module library.
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map((m) => (
          <Card key={m.id} className="flex flex-col justify-between">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs text-[var(--text-3)]">
                  Module {m.order}
                </span>
                {m.completedAt && (
                  <span className="text-xs text-[var(--green)]">✅ Done</span>
                )}
              </div>
              <h3 className="text-sm font-semibold text-[var(--text)]">
                {m.title}
              </h3>
              <p className="mt-1 text-xs text-[var(--text-3)]">{m.description}</p>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs text-[var(--text-3)]">
                {m.duration_minutes} min
              </span>
              {m.slug !== 'certification' && (
                <Button size="sm" variant="secondary" onClick={() => setOpen(m)}>
                  Read
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4"
          onClick={() => setOpen(null)}
        >
          <div
            className="w-full max-w-2xl rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <ModuleViewer
              slug={open.slug}
              onClose={() => setOpen(null)}
              onCompleted={() => {
                setOpen(null);
                load();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
