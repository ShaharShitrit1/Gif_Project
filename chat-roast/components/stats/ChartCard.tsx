"use client";

import { useId, useState, type ReactNode } from "react";
import { useT } from "@/lib/i18n";
import { statsDict } from "@/lib/i18n/dict/stats";

/**
 * A chart's container: title + subtitle, the chart, and its table twin.
 * The table is always in the DOM for screen readers (sr-only) and can be revealed visually.
 */
export function ChartCard({
  title,
  sub,
  icon,
  children,
  table,
  className = "",
  bodyClassName = "",
}: {
  title: ReactNode;
  sub?: ReactNode;
  icon?: string;
  children: ReactNode;
  table?: { caption: string; head: string[]; rows: (string | number)[][] };
  className?: string;
  bodyClassName?: string;
}) {
  const t = useT(statsDict);
  const [showTable, setShowTable] = useState(false);
  const id = useId();
  return (
    <figure aria-labelledby={`${id}-t`} className={`min-w-0 rounded-[1.5rem] border-2 border-line bg-surface p-4 sm:p-5 ${className}`}>
      <figcaption className="mb-4 flex items-start gap-3">
        {icon && (
          <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border-2 border-line bg-surface-2 text-lg">
            {icon}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h3 id={`${id}-t`} className="text-lg font-black leading-tight">
            {title}
          </h3>
          {sub && <p className="mt-0.5 text-sm text-ink-2 text-pretty">{sub}</p>}
        </div>
      </figcaption>
      <div className={bodyClassName}>{children}</div>
      {table && (
        <>
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={() => setShowTable((v) => !v)}
              aria-expanded={showTable}
              aria-controls={`${id}-table`}
              className="rounded-full px-2 py-1 text-xs font-semibold text-ink-3 underline-offset-4 hover:text-ink hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ember/40"
            >
              {showTable ? t("tableHide") : t("tableToggle")}
            </button>
          </div>
          <div id={`${id}-table`} className={showTable ? "mt-2 max-h-72 overflow-auto rounded-xl border-2 border-line-soft" : "sr-only"}>
            <table className="w-full text-sm">
              <caption className="sr-only">{table.caption}</caption>
              <thead className="sticky top-0 bg-surface-2">
                <tr>
                  {table.head.map((h) => (
                    <th key={h} scope="col" className="px-3 py-1.5 text-start font-bold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((r, i) => (
                  <tr key={i} className="border-t border-line-soft">
                    {r.map((c, j) =>
                      j === 0 ? (
                        <th key={j} scope="row" className="px-3 py-1 text-start font-semibold">
                          {c}
                        </th>
                      ) : (
                        <td key={j} className="px-3 py-1 tabular-nums">
                          {c}
                        </td>
                      ),
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </figure>
  );
}

/** Stat tile: label · value (proportional figures) · hint. */
export function StatTile({ icon, label, value, hint, accent }: { icon?: string; label: string; value: ReactNode; hint?: ReactNode; accent?: string }) {
  return (
    <div className="flex min-w-0 flex-col rounded-[1.25rem] border-2 border-line bg-surface p-3.5 sm:p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-ink-2">
        {icon && (
          <span aria-hidden className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-base" style={{ background: accent ? `color-mix(in oklab, ${accent} 22%, var(--surface))` : "var(--surface-2)" }}>
            {icon}
          </span>
        )}
        <span className="min-w-0 leading-tight">{label}</span>
      </div>
      <div className="mt-2 text-[1.65rem] leading-none font-black tracking-tight sm:text-3xl">{value}</div>
      {hint && <div className="mt-1.5 text-xs leading-snug text-ink-3 text-pretty">{hint}</div>}
    </div>
  );
}
