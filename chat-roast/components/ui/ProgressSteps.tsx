/**
 * "Step N of M" indicator: a row of chunky segments, the current one filled ember.
 * `label` is the visible / announced text (e.g. "שלב 2 מתוך 5").
 */
export function ProgressSteps({
  current,
  total,
  label,
  className = "",
  showLabel = true,
}: {
  /** 1-based. */
  current: number;
  total: number;
  label: string;
  className?: string;
  showLabel?: boolean;
}) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={current}
        aria-valuetext={label}
        aria-label={label}
        className="flex flex-1 gap-1.5"
      >
        {Array.from({ length: total }, (_, i) => {
          const n = i + 1;
          const state = n < current ? "done" : n === current ? "current" : "todo";
          return (
            <span
              key={n}
              className={`h-2.5 flex-1 rounded-full border-2 transition-colors duration-300 ${
                state === "done" ? "border-line bg-ink" : state === "current" ? "border-line bg-ember" : "border-line-soft bg-surface"
              }`}
            />
          );
        })}
      </div>
      {showLabel && <span className="shrink-0 text-xs font-bold tabular-nums text-ink-2">{label}</span>}
    </div>
  );
}
