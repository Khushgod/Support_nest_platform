import { Card } from '@/components/ui/Card';

/** Lightweight stub for nav destinations whose full UI lands in Chunk 3. */
export function Placeholder({
  title,
  note,
}: {
  title: string;
  note?: string;
}) {
  return (
    <div className="p-6">
      <Card>
        <h2 className="text-base font-semibold text-[var(--text)]">{title}</h2>
        <p className="mt-2 text-sm text-[var(--text-3)]">
          {note ?? 'This section is coming in Chunk 3.'}
        </p>
      </Card>
    </div>
  );
}
