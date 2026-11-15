"use client";

import { useT } from "@/lib/i18n";
import { reportDict } from "@/lib/i18n/dict/report";
import { STAT_AWARD_FORMAT, statsDict, type StatsDictKey } from "@/lib/i18n/dict/stats";
import type { ReportAward, StatAward } from "@/lib/types";
import { fmtDuration, fmtNum, fmtPct } from "@/components/stats/format";
import { useReport, useReportText } from "./context";
import { MemberBadge, SectionHeading } from "./ui";

export function Awards() {
  const t = useT(reportDict);
  const { saved } = useReport();
  const ai = saved.report.awards ?? [];
  const stat = saved.stats.awards ?? [];
  if (!ai.length && !stat.length) return null;
  return (
    <section aria-labelledby="sec-awards">
      <SectionHeading index="04" kicker={t("sAwardsKicker")} title={t("sAwards")} id="sec-awards" accent="var(--sun)" />
      {ai.length > 0 && (
        <ol className="grid gap-4 sm:grid-cols-2">
          {ai.map((a, i) => (
            <li key={i} className={ai.length % 2 === 1 && i === ai.length - 1 ? "sm:col-span-2" : ""}>
              <TrophyCard award={a} />
            </li>
          ))}
        </ol>
      )}
      {stat.length > 0 && <StatAwards awards={stat} />}
    </section>
  );
}

function TrophyCard({ award }: { award: ReportAward }) {
  const t = useT(reportDict);
  const text = useReportText();
  const { member } = useReport();
  const winner = member(award.winnerId);
  return (
    <article className="card relative h-full overflow-hidden p-4 ps-[5.25rem] sm:p-5 sm:ps-24">
      <div
        aria-hidden
        className="absolute inset-y-0 start-0 w-[4.25rem] border-e-2 border-line sm:w-[4.75rem]"
        style={{ background: "color-mix(in oklab, var(--sun) 55%, var(--surface))", backgroundImage: "radial-gradient(color-mix(in oklab, var(--ember) 35%, transparent) 1.4px, transparent 1.8px)", backgroundSize: "9px 9px" }}
      />
      <span aria-hidden className="absolute top-4 start-2.5 grid h-12 w-12 place-items-center rounded-full border-2 border-line bg-surface text-[1.6rem] shadow-pop-sm rtl:shadow-[-2px_2px_0_0_var(--shadow)] sm:start-3.5">
        {award.emoji || "🏆"}
      </span>
      <h3 {...text} className="text-lg leading-tight font-black text-balance sm:text-xl">
        {award.title}
      </h3>
      <div className="mt-2.5 inline-flex max-w-full items-center gap-2 rounded-full border-2 border-line bg-surface-2 py-0.5 ps-0.5 pe-3">
        <MemberBadge color={winner?.color ?? "var(--m-other)"} emoji={winner?.profile?.emoji} name={winner?.name ?? "?"} size={26} className="!border" />
        <span className="truncate text-sm font-bold">
          <span className="sr-only">{t("winner")}: </span>
          <bdi>{winner?.name ?? t("unknownMember")}</bdi>
        </span>
      </div>
      {award.reason && (
        <p {...text} className="mt-2.5 text-[0.95rem] leading-snug text-ink-2 text-pretty">
          {award.reason}
        </p>
      )}
    </article>
  );
}

export function useStatAwardFormat() {
  const ts = useT(statsDict);
  const { intl } = useReport();
  return (a: StatAward) => {
    const fmt = STAT_AWARD_FORMAT[a.key];
    const title = ts(`award_${a.key}` as StatsDictKey);
    const desc = ts(`award_${a.key}_desc` as StatsDictKey);
    if (!fmt) return { title: a.key, desc: "", value: fmtNum(a.value, intl) };
    let value: string;
    switch (fmt.kind) {
      case "ratio":
        value = ts(fmt.key, { pct: fmtPct(a.value, intl) } as never);
        break;
      case "ms":
        value = ts(fmt.key, { d: fmtDuration(a.value, intl) } as never);
        break;
      case "avg":
        value = ts(fmt.key, { n: a.value, f: fmtNum(a.value, intl, 1) } as never);
        break;
      default:
        value = ts(fmt.key, { n: a.value, f: fmtNum(a.value, intl) } as never);
    }
    return { title, desc, value };
  };
}

function StatAwards({ awards }: { awards: StatAward[] }) {
  const ts = useT(statsDict);
  const { member } = useReport();
  const format = useStatAwardFormat();
  return (
    <div className="mt-10">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h3 className="text-xl font-black">📊 {ts("statAwardsTitle")}</h3>
          <p className="text-sm text-ink-2">{ts("statAwardsSub")}</p>
        </div>
      </div>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {awards.map((a) => {
          const w = member(a.winnerId);
          const f = format(a);
          return (
            <li key={a.key} className="card-flat flex flex-col p-3 sm:p-4">
              <div className="flex items-start justify-between gap-2">
                <span aria-hidden className="text-[1.75rem] leading-none">
                  {a.emoji}
                </span>
                <span aria-hidden className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: w?.color ?? "var(--m-other)" }} />
              </div>
              <h4 className="mt-2 text-[0.95rem] font-black leading-tight">{f.title}</h4>
              <div className="mt-1 truncate text-sm font-bold text-ink-2">
                <bdi>{w?.name ?? ts("unknownPerson")}</bdi>
              </div>
              <div className="mt-auto pt-2 text-sm font-black tabular-nums">{f.value}</div>
              <p className="mt-1 text-xs leading-snug text-ink-3">{f.desc}</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
