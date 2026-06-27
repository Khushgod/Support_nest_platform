import { Card } from './Card';

interface MetricCardProps {
  label: string;
  value: string | number;
  /** Optional change indicator, e.g. "+12%". */
  delta?: string;
  /** Tone of the delta / accent bar. */
  tone?: 'violet' | 'teal' | 'amber' | 'rose' | 'green';
}

const toneVar: Record<NonNullable<MetricCardProps['tone']>, string> = {
  violet: 'var(--violet)',
  teal: 'var(--teal)',
  amber: 'var(--amber)',
  rose: 'var(--rose)',
  green: 'var(--green)',
};

export function MetricCard({
  label,
  value,
  delta,
  tone = 'violet',
}: MetricCardProps) {
  const color = toneVar[tone];
  return (
    <Card className="relative overflow-hidden">
      <div
        className="absolute left-0 top-0 h-full w-1"
        style={{ background: color }}
        aria-hidden
      />
      <p className="text-sm text-[var(--text-3)]">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-[var(--text)]">{value}</p>
      {delta && (
        <p className="mt-1 text-sm font-medium" style={{ color }}>
          {delta}
        </p>
      )}
    </Card>
  );
}
