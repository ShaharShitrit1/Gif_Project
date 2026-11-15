"use client";

import { useT } from "@/lib/i18n";
import { reportDict } from "@/lib/i18n/dict/report";
import type { ReportScore } from "@/lib/types";
import { useReportText } from "./context";
import { SectionHeading, useCountUp, useInView } from "./ui";

const ACCENTS = ["var(--ember)", "var(--grape)", "var(--sea)", "var(--sky)"];

export function Scores({ scores }: { scores: ReportScore[] }) {
  const t = useT(reportDict);
  if (!scores?.length) return null;
  return (
    <section aria-labelledby="sec-scores">
      <SectionHeading index="02" kicker={t("sScoresKicker")} title={t("sScores")} id="sec-scores" accent="var(--sun)" />
      <div className="grid gap-4 sm:grid-cols-2">
        {scores.slice(0, 6).map((s, i) => (
          <ScoreTile key={s.key + i} score={s} accent={ACCENTS[i % ACCENTS.length]} />
        ))}
      </div>
    </section>
  );
}

function ScoreTile({ score, accent }: { score: ReportScore; accent: string }) {
  const text = useReportText();
  const [ref, inView] = useInView<HTMLDivElement>();
  const value = Math.max(0, Math.min(100, Math.round(score.value)));
  const shown = useCountUp(value, inView);
  return (
    <div ref={ref} className="card-flat flex flex-col gap-3 p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <span aria-hidden className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border-2 border-line text-2xl" style={{ background: `color-mix(in oklab, ${accent} 22%, var(--surface))` }}>
          {score.emoji}
        </span>
        <h3 {...text} className="min-w-0 flex-1 text-lg font-black leading-tight">
          {score.label}
        </h3>
        <div className="shrink-0 text-end leading-none" aria-hidden>
          <span className="text-[2.1rem] font-black">{shown}</span>
          <span className="text-sm font-bold text-ink-3">/100</span>
        </div>
      </div>
      <div
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
        aria-label={`${score.label}: ${value}/100`}
        className="relative h-3.5 overflow-hidden rounded-full border-2 border-line"
        style={{ background: `color-mix(in oklab, ${accent} 16%, var(--surface))` }}
      >
        <div
          className="absolute inset-y-0 start-0 rounded-full transition-[width] duration-[1100ms] ease-[cubic-bezier(0.2,0.8,0.2,1)]"
          style={{ width: inView ? `${value}%` : "0%", background: accent }}
        />
      </div>
      {score.comment && (
        <p {...text} className="text-[0.95rem] leading-snug text-ink-2 text-pretty">
          {score.comment}
        </p>
      )}
    </div>
  );
}
