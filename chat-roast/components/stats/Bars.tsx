"use client";

import { useState, type KeyboardEvent } from "react";
import { useT } from "@/lib/i18n";
import { statsDict } from "@/lib/i18n/dict/stats";
import { ChartCard } from "./ChartCard";
import { fmtHour, fmtNum, fmtPct, weekdayName } from "./format";

/** De-emphasis fill for "context" bars; works in both themes. */
export const NEUTRAL_BAR = "color-mix(in oklab, var(--ink-3) 42%, var(--surface))";
const LATE_HOURS = new Set([22, 23, 0, 1, 2, 3, 4]);

function useRoving(count: number) {
  const [active, setActive] = useState(-1);
  const onKey = (e: KeyboardEvent<HTMLElement>, fallback: number) => {
    const rtl = getComputedStyle(e.currentTarget).direction === "rtl";
    const cur = active < 0 ? fallback : active;
    const fwd = rtl ? "ArrowLeft" : "ArrowRight";
    const back = rtl ? "ArrowRight" : "ArrowLeft";
    let next = cur;
    if (e.key === fwd || e.key === "ArrowDown") next = cur + 1;
    else if (e.key === back || e.key === "ArrowUp") next = cur - 1;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = count - 1;
    else return;
    e.preventDefault();
    setActive(Math.max(0, Math.min(count - 1, next)));
  };
  return { active, setActive, onKey };
}

/* ------------------------------------------------------------------ */
/* Hourly activity — 24 columns, peak highlighted, late night tinted     */
/* ------------------------------------------------------------------ */

export function HourlyChart({ hourly, intl }: { hourly: number[]; intl: string }) {
  const t = useT(statsDict);
  const data = Array.from({ length: 24 }, (_, h) => hourly?.[h] ?? 0);
  const total = data.reduce((a, b) => a + b, 0) || 1;
  const max = Math.max(1, ...data);
  const peak = data.indexOf(max);
  const late = data.reduce((a, v, h) => a + (LATE_HOURS.has(h) ? v : 0), 0) / total;
  const { active, setActive, onKey } = useRoving(24);
  const shown = active >= 0 ? active : peak;

  return (
    <ChartCard
      icon="🕐"
      title={t("hoursTitle")}
      sub={t("hoursSub", { hour: fmtHour(peak) })}
      table={{ caption: t("hoursTitle"), head: [t("colHour"), t("colMessages")], rows: data.map((v, h) => [fmtHour(h), fmtNum(v, intl)]) }}
    >
      <p aria-live="polite" className="mb-2 text-sm font-bold tabular-nums">
        {t("hourTip", { hour: fmtHour(shown), f: fmtNum(data[shown], intl) })}
      </p>
      <div
        role="group"
        aria-label={t("hoursTitle")}
        tabIndex={0}
        onKeyDown={(e) => onKey(e, peak)}
        onPointerLeave={() => setActive(-1)}
        className="rounded-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ember/40"
      >
        <div className="relative flex h-40 items-end gap-[2px] border-b border-line-soft">
          {/* gridlines */}
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 border-t border-line-soft" />
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-line-soft" />
          {data.map((v, h) => {
            const fill = h === peak ? "var(--ember)" : LATE_HOURS.has(h) ? "var(--grape)" : NEUTRAL_BAR;
            return (
              <div
                key={h}
                className="relative flex h-full flex-1 cursor-default items-end justify-center"
                onPointerEnter={() => setActive(h)}
                onClick={() => setActive(h)}
              >
                <div
                  className={`w-full max-w-6 rounded-t-[4px] transition-opacity ${shown === h ? "opacity-100" : active >= 0 ? "opacity-60" : "opacity-100"}`}
                  style={{ height: `${Math.max(v > 0 ? 2 : 0, (v / max) * 100)}%`, background: fill, outline: shown === h && active >= 0 ? "2px solid var(--ink)" : undefined, outlineOffset: 1 }}
                />
              </div>
            );
          })}
        </div>
        <div aria-hidden className="mt-1 flex gap-[2px] text-[0.65rem] font-semibold text-ink-3 tabular-nums">
          {data.map((_, h) => (
            <span key={h} className="flex-1 text-center">
              {h % 6 === 0 ? String(h).padStart(2, "0") : ""}
            </span>
          ))}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-2">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="h-2.5 w-2.5 rounded-[3px] bg-ember" />
          {t("hoursSub", { hour: fmtHour(peak) })}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="h-2.5 w-2.5 rounded-[3px] bg-grape" />
          {t("afterTen", { pct: fmtPct(late, intl) })}
        </span>
      </div>
    </ChartCard>
  );
}

/* ------------------------------------------------------------------ */
/* Weekdays — horizontal bars in calendar order, busiest highlighted    */
/* ------------------------------------------------------------------ */

export function WeekdayChart({ weekday, intl }: { weekday: number[]; intl: string }) {
  const t = useT(statsDict);
  const data = Array.from({ length: 7 }, (_, d) => weekday?.[d] ?? 0);
  const max = Math.max(1, ...data);
  const best = data.indexOf(max);
  return (
    <ChartCard
      icon="📆"
      title={t("weekTitle")}
      sub={t("weekSub", { day: weekdayName(best, intl) })}
      table={{ caption: t("weekTitle"), head: [t("colWeekday"), t("colMessages")], rows: data.map((v, d) => [weekdayName(d, intl), fmtNum(v, intl)]) }}
    >
      <ul aria-hidden className="space-y-2">
        {data.map((v, d) => (
          <li key={d} className="grid grid-cols-[4.25rem_1fr] items-center gap-2 text-sm">
            <span className={`truncate ${d === best ? "font-black" : "font-semibold text-ink-2"}`}>{weekdayName(d, intl, "short")}</span>
            <div className="flex items-center gap-2">
              <div className="h-4 rounded-e-[4px]" style={{ width: `${Math.max(1, (v / max) * 82)}%`, background: d === best ? "var(--ember)" : NEUTRAL_BAR }} />
              <span className="text-xs font-bold text-ink-2 tabular-nums">{fmtNum(v, intl)}</span>
            </div>
          </li>
        ))}
      </ul>
    </ChartCard>
  );
}

/* ------------------------------------------------------------------ */
/* Ranked bars (people share, openers, enders)                          */
/* ------------------------------------------------------------------ */

export interface RankedItem {
  key: string;
  label: string;
  value: number;
  color: string;
  /** Right-hand figure, already formatted. */
  display: string;
  sub?: string;
}

export function RankedBars({ items, max, size = "md" }: { items: RankedItem[]; max?: number; size?: "md" | "sm" }) {
  const top = max ?? Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className={size === "sm" ? "space-y-2" : "space-y-3"}>
      {items.map((it) => (
        <li key={it.key}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2 font-bold">
              <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: it.color }} />
              <bdi className="truncate">{it.label}</bdi>
            </span>
            <span className="flex shrink-0 items-baseline gap-1.5 tabular-nums">
              <bdi className="font-black">{it.display}</bdi>
              {it.sub && <bdi className="text-xs font-semibold text-ink-3">{it.sub}</bdi>}
            </span>
          </div>
          <div aria-hidden className={`mt-1 overflow-hidden rounded-full bg-surface-2 ${size === "sm" ? "h-2" : "h-3"}`}>
            <div className="h-full rounded-full" style={{ width: `${Math.max(1.5, (it.value / top) * 100)}%`, background: it.color }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
