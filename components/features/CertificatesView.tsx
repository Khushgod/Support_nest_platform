'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';

interface ProgressData {
  certified: boolean;
  progressPct: number;
  completedCount: number;
  totalCount: number;
  modules: { slug: string; score: number | null; completedAt: string | null }[];
}

export function CertificatesView({ userId }: { userId: string }) {
  const [data, setData] = useState<ProgressData | null>(null);

  useEffect(() => {
    fetch(`/api/allyship/progress/${userId}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null));
  }, [userId]);

  if (!data) return <p className="p-6 text-[var(--text-3)]">Loading…</p>;

  const cert = data.modules.find((m) => m.slug === 'certification');

  return (
    <div className="p-6">
      <Card elevated className="mx-auto max-w-xl text-center">
        {data.certified ? (
          <>
            <p className="text-4xl">🏆</p>
            <h2 className="mt-3 text-xl font-semibold text-[var(--text)]">
              Allyship Certificate
            </h2>
            <p className="mt-1 text-sm text-[var(--text-2)]">
              Awarded for completing all 5 modules and passing the certification
              {cert?.score != null ? ` (${cert.score}%)` : ''}.
            </p>
            <div className="mt-4 inline-block rounded-lg border border-[var(--teal)] px-4 py-2 text-sm text-[var(--teal)]">
              Status: Certified Ally
            </div>
          </>
        ) : (
          <>
            <p className="text-4xl">🔒</p>
            <h2 className="mt-3 text-xl font-semibold text-[var(--text)]">
              Certificate locked
            </h2>
            <p className="mt-1 text-sm text-[var(--text-3)]">
              Complete all modules and pass the certification quiz to earn your
              certificate. You’re {data.progressPct}% there (
              {data.completedCount}/{data.totalCount} modules).
            </p>
          </>
        )}
      </Card>
    </div>
  );
}
