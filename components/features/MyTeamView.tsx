'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface Hire {
  id: string;
  first_name: string;
  last_name: string;
  neurodivergence: string;
  role: string | null;
  team: string | null;
  phase: string;
}
interface Brief {
  name: string;
  role: string;
  team: string;
  neurodivergence: string;
  strengths: string[];
  communication: string[];
  accommodations: string[];
  firstWeek: string[];
}

export function MyTeamView() {
  const [hires, setHires] = useState<Hire[] | null>(null);
  const [brief, setBrief] = useState<Brief | null>(null);
  const [loadingBrief, setLoadingBrief] = useState(false);

  useEffect(() => {
    fetch('/api/allyship/team')
      .then((r) => r.json())
      .then((d) => setHires(d.hires ?? []))
      .catch(() => setHires([]));
  }, []);

  function openBrief(id: string) {
    setLoadingBrief(true);
    setBrief(null);
    fetch(`/api/allyship/briefs/${id}`)
      .then((r) => r.json())
      .then((d) => setBrief(d.brief))
      .catch(() => setBrief(null))
      .finally(() => setLoadingBrief(false));
  }

  if (!hires) return <p className="p-6 text-[var(--text-3)]">Loading…</p>;

  return (
    <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-3">
      {/* Upcoming hires */}
      <Card className="lg:col-span-1">
        <p className="mb-4 text-sm font-medium text-[var(--text-2)]">
          Upcoming & recent ND hires
        </p>
        {hires.length === 0 ? (
          <p className="text-sm text-[var(--text-3)]">No new hires yet.</p>
        ) : (
          <ul className="space-y-2">
            {hires.map((h) => (
              <li key={h.id}>
                <button
                  onClick={() => openBrief(h.id)}
                  className="w-full rounded-lg px-3 py-2 text-left text-sm text-[var(--text-2)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
                >
                  <span className="font-medium text-[var(--text)]">
                    {h.first_name} {h.last_name}
                  </span>
                  <span className="block text-xs text-[var(--text-3)]">
                    {h.role ?? 'New role'} · {h.team ?? ''} · {h.phase}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Brief */}
      <div className="lg:col-span-2">
        {loadingBrief && (
          <p className="text-sm text-[var(--text-3)]">Generating brief…</p>
        )}
        {!loadingBrief && !brief && (
          <Card>
            <p className="text-sm text-[var(--text-3)]">
              Select a hire to see a personalized “Working with…” brief.
            </p>
          </Card>
        )}
        {brief && (
          <Card elevated>
            <h2 className="text-lg font-semibold text-[var(--text)]">
              Working with {brief.name}
            </h2>
            <p className="mt-1 text-sm text-[var(--text-3)]">
              {brief.name} is joining {brief.team} as a {brief.role}. They are{' '}
              {brief.neurodivergence}.
            </p>

            <BriefSection title="Strengths" items={brief.strengths} />
            <BriefSection title="Communication style" items={brief.communication} />
            <BriefSection title="Accommodations" items={brief.accommodations} />
            <BriefSection title="First week" items={brief.firstWeek} />

            <div className="mt-4 flex justify-end">
              <Button size="sm" variant="secondary" onClick={() => window.print()}>
                Print brief
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

function BriefSection({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="mt-4">
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-[var(--text-3)]">
        {title}
      </p>
      <ul className="list-inside list-disc space-y-1 text-sm text-[var(--text)]">
        {items.map((it, i) => (
          <li key={i}>{it}</li>
        ))}
      </ul>
    </div>
  );
}
