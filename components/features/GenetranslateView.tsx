'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { GenetranslatePanel, NeuroProfile } from '@/components/GenetranslatePanel';

interface ReportItem {
  id: string;
  candidateName: string;
  reportName: string | null;
  uploadedAt: string;
  profile: NeuroProfile | null;
}

export function GenetranslateView() {
  const [reports, setReports] = useState<ReportItem[] | null>(null);
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/genetranslate/reports')
      .then((r) => r.json())
      .then((d) => {
        setReports(d.reports);
        if (d.reports?.length) setActive(d.reports[0].id);
      })
      .catch(() => setReports([]));
  }, []);

  if (!reports) return <p className="p-6 text-[var(--text-3)]">Loading…</p>;

  if (reports.length === 0) {
    return (
      <div className="p-6">
        <Card>
          <p className="text-sm text-[var(--text-3)]">
            No diagnostic reports yet. Upload one from the Pipeline to see its
            genetranslate profile here.
          </p>
        </Card>
      </div>
    );
  }

  const current = reports.find((r) => r.id === active) ?? reports[0];

  return (
    <div className="space-y-4 p-6">
      <div className="flex flex-wrap gap-2">
        {reports.map((r) => (
          <button
            key={r.id}
            onClick={() => setActive(r.id)}
            className={`rounded-lg px-3 py-1.5 text-sm ${
              r.id === current.id
                ? 'bg-[var(--surface-2)] text-[var(--text)]'
                : 'text-[var(--text-2)] hover:text-[var(--text)]'
            }`}
          >
            {r.candidateName}
          </button>
        ))}
      </div>

      {current.profile ? (
        <GenetranslatePanel
          profile={current.profile}
          reportName={current.reportName ?? undefined}
        />
      ) : (
        <Card>
          <p className="text-sm text-[var(--text-3)]">
            This report hasn’t been parsed yet.
          </p>
        </Card>
      )}
    </div>
  );
}
