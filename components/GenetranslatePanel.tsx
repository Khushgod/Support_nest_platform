'use client';

import { Card } from '@/components/ui/Card';

export interface NeuroProfile {
  neurodivergence: string;
  traits: string[];
  strengths: string[];
  accommodations: string[];
  workStyleProfile: {
    summary: string;
    communication: string;
    environment: string;
  };
  confidence: number;
}

const ND_LABELS: Record<string, string> = {
  autistic: 'Autistic',
  adhd: 'ADHD',
  both: 'Autistic + ADHD',
  other: 'Other',
};

function List({
  title,
  icon,
  items,
  color,
}: {
  title: string;
  icon: string;
  items: string[];
  color: string;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--text-3)]">
        {title}
      </p>
      <ul className="space-y-1.5">
        {items.map((it, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-[var(--text)]">
            <span aria-hidden style={{ color }}>
              {icon}
            </span>
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function GenetranslatePanel({
  profile,
  reportName,
}: {
  profile: NeuroProfile;
  reportName?: string;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {/* Left: source summary */}
      <Card>
        <p className="mb-3 text-sm font-medium text-[var(--text-2)]">
          Diagnostic report
        </p>
        <div className="space-y-2 text-sm text-[var(--text-3)]">
          <p>
            Source: <span className="text-[var(--text)]">{reportName ?? 'Uploaded report'}</span>
          </p>
          <p>
            Encrypted at rest · parsed into a PII-free profile by genetranslate.
          </p>
          <div className="mt-3 rounded-lg bg-[var(--surface-2)] p-3 text-[var(--text-2)]">
            <p className="text-xs">
              Raw clinical text is never displayed or stored in plaintext. Only
              the workplace-relevant profile on the right is retained.
            </p>
          </div>
        </div>
      </Card>

      {/* Right: parsed profile */}
      <Card elevated>
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-medium text-[var(--text-2)]">
            Parsed profile
          </p>
          <span className="rounded-full bg-[var(--surface-1)] px-2 py-0.5 text-xs text-[var(--teal)]">
            {Math.round((profile.confidence ?? 0) * 100)}% confidence
          </span>
        </div>

        <div className="mb-4">
          <span className="text-xs text-[var(--text-3)]">Neurodivergence</span>
          <p className="text-base font-semibold text-[var(--violet)]">
            {ND_LABELS[profile.neurodivergence] ?? profile.neurodivergence}
          </p>
        </div>

        <div className="space-y-4">
          <List title="Key traits" icon="🎯" items={profile.traits} color="var(--violet)" />
          <List title="Strengths" icon="🧩" items={profile.strengths} color="var(--teal)" />
          <List
            title="Accommodations"
            icon="🔇"
            items={profile.accommodations}
            color="var(--amber)"
          />

          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-[var(--text-3)]">
              Work style
            </p>
            <p className="text-sm text-[var(--text)]">
              {profile.workStyleProfile?.summary}
            </p>
            <p className="mt-1 text-xs text-[var(--text-3)]">
              💬 {profile.workStyleProfile?.communication}
            </p>
            <p className="text-xs text-[var(--text-3)]">
              🏠 {profile.workStyleProfile?.environment}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
