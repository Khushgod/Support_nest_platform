// The six hiring phases a candidate moves through (see CLAUDE.md → HiringPhases).
export const HIRING_PHASES = [
  'Apply',
  'Match',
  'Assess',
  'Interview',
  'Onboard',
  'Thrive',
] as const;

export type HiringPhase = (typeof HIRING_PHASES)[number];

interface PhaseTrackerProps {
  /** Index of the current phase (0-based). Phases before it render as complete. */
  currentPhase?: number;
}

export function PhaseTracker({ currentPhase = 0 }: PhaseTrackerProps) {
  return (
    <div className="flex w-full items-center">
      {HIRING_PHASES.map((phase, i) => {
        const isComplete = i < currentPhase;
        const isCurrent = i === currentPhase;
        const isLast = i === HIRING_PHASES.length - 1;

        const dotColor = isComplete
          ? 'var(--teal)'
          : isCurrent
          ? 'var(--violet)'
          : 'var(--surface-2)';
        const labelColor = isComplete
          ? 'var(--text-2)'
          : isCurrent
          ? 'var(--text)'
          : 'var(--text-3)';

        return (
          <div key={phase} className="flex flex-1 items-center">
            <div className="flex flex-col items-center">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold"
                style={{
                  background: isCurrent ? 'transparent' : dotColor,
                  borderColor: dotColor,
                  color: isCurrent ? 'var(--violet)' : '#0E1018',
                }}
              >
                {isComplete ? '✓' : i + 1}
              </div>
              <span
                className="mt-2 text-xs"
                style={{ color: labelColor }}
              >
                {phase}
              </span>
            </div>
            {!isLast && (
              <div
                className="mx-2 h-0.5 flex-1"
                style={{
                  background: isComplete ? 'var(--teal)' : 'var(--border)',
                }}
                aria-hidden
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
