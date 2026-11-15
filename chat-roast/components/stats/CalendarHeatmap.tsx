"use client";

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useT } from "@/lib/i18n";
import { statsDict } from "@/lib/i18n/dict/stats";
import type { DayCount } from "@/lib/types";
import { ChartCard } from "./ChartCard";
import { fmtDateKey, fmtNum, keyToTs, monthName, weekdayName } from "./format";

const GAP = 3;
const MIN_CELL = 11;
const MAX_CELL = 18;
const LEVELS = [0, 28, 48, 72, 100]; // % of ember mixed into the surface, per level (0 = empty)

/**
 * GitHub-style calendar: weeks are columns, Sunday on top. A CSS grid (auto-flow: column) so
 * the time axis mirrors automatically in RTL. Scrolls inside its own box only when needed.
 */
export function CalendarHeatmap({ daily, intl }: { daily: DayCount[]; intl: string }) {
  const t = useT(statsDict);
  const scrollRef = useRef<HTMLDivElement>(null);
  const readoutId = useId();
  const [cell, setCell] = useState(14);

  const model = useMemo(() => {
    const days = daily.filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d.date));
    const offset = days.length ? new Date(keyToTs(days[0].date)).getUTCDay() : 0;
    const weeks = Math.max(1, Math.ceil((days.length + offset) / 7));
    const nonzero = days.map((d) => d.count).filter((c) => c > 0).sort((a, b) => a - b);
    const q = (p: number) => (nonzero.length ? nonzero[Math.min(nonzero.length - 1, Math.floor(p * nonzero.length))] : 0);
    const th = [q(0.25), q(0.5), q(0.8)];
    const level = (c: number) => (c <= 0 ? 0 : c <= th[0] ? 1 : c <= th[1] ? 2 : c <= th[2] ? 3 : 4);
    let record = -1;
    days.forEach((d, i) => {
      if (record < 0 || d.count > days[record].count) record = i;
    });
    // month labels: first column whose week contains the 1st of a month
    const months: { col: number; label: string }[] = [];
    let lastCol = -10;
    days.forEach((d, i) => {
      const day = Number(d.date.slice(8, 10));
      if (day !== 1 && i !== 0) return;
      const col = Math.floor((i + offset) / 7);
      if (i === 0 && day > 20) return; // partial first month: too short to label
      if (col - lastCol < 3) return;
      const m = Number(d.date.slice(5, 7)) - 1;
      const showYear = months.length === 0 || m === 0;
      months.push({ col, label: showYear ? `${monthName(m, intl, "short")} ${d.date.slice(2, 4)}′` : monthName(m, intl, "short") });
      lastCol = col;
    });
    // monthly totals for the table twin
    const monthly = new Map<string, number>();
    for (const d of days) monthly.set(d.date.slice(0, 7), (monthly.get(d.date.slice(0, 7)) ?? 0) + d.count);
    return { days, offset, weeks, level, record, months, monthly };
  }, [daily, intl]);

  const [active, setActive] = useState<number>(-1);
  const shown = active >= 0 ? active : model.record;

  // Fit cells to the available width; fall back to horizontal scroll below MIN_CELL.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth - 28; // weekday label column
      const c = Math.floor((w - GAP * (model.weeks - 1)) / model.weeks);
      setCell(Math.max(MIN_CELL, Math.min(MAX_CELL, c)));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [model.weeks]);

  // Start scrolled to the most recent weeks (the inline-end edge, in either direction).
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || el.scrollWidth <= el.clientWidth) return;
    const rtl = getComputedStyle(el).direction === "rtl";
    el.scrollLeft = rtl ? -el.scrollWidth : el.scrollWidth;
  }, [cell, model.weeks]);

  if (!model.days.length) return null;

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const rtl = getComputedStyle(e.currentTarget).direction === "rtl";
    const cur = shown < 0 ? 0 : shown;
    const step: Record<string, number> = { ArrowUp: -1, ArrowDown: 1, ArrowRight: rtl ? -7 : 7, ArrowLeft: rtl ? 7 : -7, Home: -cur, End: model.days.length - 1 - cur };
    if (!(e.key in step)) return;
    e.preventDefault();
    setActive(Math.max(0, Math.min(model.days.length - 1, cur + step[e.key])));
  };

  const pick = (target: EventTarget) => {
    const i = Number((target as HTMLElement).dataset?.i);
    if (Number.isFinite(i)) setActive(i);
  };

  const sel = model.days[shown];
  const color = (lvl: number) => (lvl === 0 ? "var(--surface-2)" : `color-mix(in oklab, var(--ember) ${LEVELS[lvl]}%, var(--surface))`);
  const longDate = (key: string) => fmtDateKey(key, intl, { weekday: "short", day: "numeric", month: "long", year: "numeric" });

  return (
    <ChartCard
      icon="🗓️"
      title={t("calendarTitle")}
      sub={t("calendarSub")}
      table={{
        caption: t("calendarTitle"),
        head: [t("colMonth"), t("colMessages")],
        rows: [...model.monthly.entries()].map(([m, c]) => [fmtDateKey(`${m}-01`, intl, { month: "long", year: "numeric" }), fmtNum(c, intl)]),
      }}
    >
      <div ref={scrollRef} className="-mx-1 overflow-x-auto overscroll-x-contain px-1 pb-1 [scrollbar-width:thin]">
        <div className="inline-grid" style={{ gridTemplateColumns: `24px auto`, columnGap: 4 }}>
          <span />
          {/* month labels */}
          <div aria-hidden className="relative mb-1 h-4 text-[0.68rem] font-semibold text-ink-3" style={{ display: "grid", gridTemplateColumns: `repeat(${model.weeks}, ${cell}px)`, columnGap: GAP }}>
            {model.months.map((m) => (
              <span key={m.col} className="whitespace-nowrap" style={{ gridColumn: `${m.col + 1} / span 4`, gridRow: 1 }}>
                {m.label}
              </span>
            ))}
          </div>
          {/* weekday labels */}
          <div aria-hidden className="grid text-[0.62rem] font-semibold text-ink-3" style={{ gridTemplateRows: `repeat(7, ${cell}px)`, rowGap: GAP }}>
            {[0, 1, 2, 3, 4, 5, 6].map((d) => (
              <span key={d} className="flex items-center leading-none">
                {d % 2 === 0 ? weekdayName(d, intl, "narrow") : ""}
              </span>
            ))}
          </div>
          {/* cells */}
          <div
            role="group"
            aria-label={t("calendarTitle")}
            aria-describedby={readoutId}
            tabIndex={0}
            onKeyDown={onKey}
            onPointerMove={(e) => pick(e.target)}
            onClick={(e) => pick(e.target)}
            onPointerLeave={() => setActive(-1)}
            className="rounded-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ember/40"
            style={{ display: "grid", gridTemplateRows: `repeat(7, ${cell}px)`, gridAutoFlow: "column", gridAutoColumns: `${cell}px`, gap: GAP }}
          >
            {Array.from({ length: model.offset }, (_, i) => (
              <span key={`pad${i}`} aria-hidden />
            ))}
            {model.days.map((d, i) => {
              const lvl = model.level(d.count);
              const isSel = i === shown;
              const isRecord = i === model.record;
              return (
                <span
                  key={d.date}
                  data-i={i}
                  aria-hidden
                  className={`rounded-[3px] ${isSel ? "outline-2 outline-offset-1 outline-ink" : ""}`}
                  style={{
                    background: color(lvl),
                    boxShadow: lvl === 0 ? "inset 0 0 0 1px var(--line-soft)" : isRecord ? "inset 0 0 0 2px var(--ink)" : undefined,
                  }}
                />
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <p id={readoutId} aria-live="polite" className="min-h-6 text-sm font-semibold">
          {sel && (
            <>
              {shown === model.record && (
                <span className="me-1.5 rounded-full bg-ink px-2 py-0.5 text-[0.7rem] font-bold text-paper">{t("calendarRecord")}</span>
              )}
              {t("calendarDay", { date: longDate(sel.date), n: sel.count, f: fmtNum(sel.count, intl) })}
            </>
          )}
        </p>
        <div aria-hidden className="flex items-center gap-1.5 text-xs text-ink-3">
          <span>{t("calendarLess")}</span>
          {[0, 1, 2, 3, 4].map((l) => (
            <span key={l} className="h-3 w-3 rounded-[3px]" style={{ background: color(l), boxShadow: l === 0 ? "inset 0 0 0 1px var(--line-soft)" : undefined }} />
          ))}
          <span>{t("calendarMore")}</span>
        </div>
      </div>
    </ChartCard>
  );
}
