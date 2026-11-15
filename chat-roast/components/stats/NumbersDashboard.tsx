"use client";

import { useT } from "@/lib/i18n";
import { statsDict } from "@/lib/i18n/dict/stats";
import type { ChatStats } from "@/lib/types";
import { useReport, type MemberInfo } from "@/components/report/context";
import { SectionHeading } from "@/components/report/ui";
import { CalendarHeatmap } from "./CalendarHeatmap";
import { HourlyChart, RankedBars, WeekdayChart, type RankedItem } from "./Bars";
import { ChartCard } from "./ChartCard";
import { FirstLastCard, GreetingsCard, LaughCard, LongestMessageCard, MediaCard, RhythmTiles, WordsCard } from "./Cards";
import { fmtCompact, fmtNum, fmtPct } from "./format";

const MAX_ROWS = 8;

/** "The Numbers": the locally computed stats dashboard. */
export function NumbersDashboard({ index = "08" }: { index?: string }) {
  const t = useT(statsDict);
  const { saved, intl } = useReport();
  const stats = saved.stats;
  return (
    <section aria-labelledby="sec-numbers" className="relative border-y-2 border-line bg-surface-2">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-48 opacity-[0.18]"
        style={{ backgroundImage: "radial-gradient(var(--line) 1.2px, transparent 1.6px)", backgroundSize: "12px 12px", maskImage: "linear-gradient(to bottom, black, transparent)" }}
      />
      <div className="relative mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
        <SectionHeading index={index} kicker={t("kicker")} title={t("title")} id="sec-numbers" sub={t("lede")} accent="var(--sky)" />

        <HeadlineRow stats={stats} intl={intl} />

        <div className="mt-5 space-y-5">
          <CalendarHeatmap daily={stats.daily ?? []} intl={intl} />
          <PeopleCards stats={stats} />
          <div className="grid gap-5 lg:grid-cols-2">
            <HourlyChart hourly={stats.hourly ?? []} intl={intl} />
            <WeekdayChart weekday={stats.weekday ?? []} intl={intl} />
          </div>
          <RhythmTiles stats={stats} />
          <div className="grid gap-5 lg:grid-cols-2">
            <LaughCard stats={stats} />
            <GreetingsCard stats={stats} />
          </div>
          <WordsCard stats={stats} />
          <div className="grid gap-5 lg:grid-cols-2">
            <MediaCard stats={stats} />
            <LongestMessageCard stats={stats} />
          </div>
          <FirstLastCard stats={stats} />
        </div>
      </div>
    </section>
  );
}

function HeadlineRow({ stats, intl }: { stats: ChatStats; intl: string }) {
  const t = useT(statsDict);
  const small = [
    { label: t("heroWords"), value: fmtCompact(stats.totalWords, intl) },
    { label: t("heroDays"), value: fmtNum(stats.daysSpan, intl) },
    { label: t("heroActiveDays"), value: fmtNum(stats.activeDays, intl) },
    { label: t("heroPerDay"), value: fmtNum(stats.avgMessagesPerActiveDay, intl, stats.avgMessagesPerActiveDay < 10 ? 1 : 0) },
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-[1.2fr_2fr]">
      <div className="relative overflow-hidden rounded-[1.5rem] border-2 border-line bg-ink p-5 text-paper">
        <div aria-hidden className="absolute -end-6 -bottom-8 text-[7rem] leading-none opacity-15">
          💬
        </div>
        <div className="relative text-[3.4rem] leading-none font-black tracking-tight sm:text-6xl">{fmtNum(stats.totalMessages, intl)}</div>
        <div className="relative mt-2 font-bold text-paper/80">{t("heroMessages")}</div>
      </div>
      <dl className="grid grid-cols-2 gap-3">
        {small.map((s) => (
          <div key={s.label} className="flex flex-col justify-center rounded-[1.25rem] border-2 border-line bg-surface px-4 py-3">
            <dd className="text-2xl leading-none font-black">{s.value}</dd>
            <dt className="mt-1 text-xs font-semibold text-ink-2">{s.label}</dt>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** Top N rows by value; the tail folds into one "others" row (never a 9th hue). */
function fold(items: RankedItem[], othersLabel: (n: number) => string, fmt: (v: number) => string): RankedItem[] {
  const sorted = [...items].sort((a, b) => b.value - a.value);
  if (sorted.length <= MAX_ROWS) return sorted;
  const head = sorted.slice(0, MAX_ROWS - 1);
  const tail = sorted.slice(MAX_ROWS - 1);
  const v = tail.reduce((a, b) => a + b.value, 0);
  return [...head, { key: "__others", label: othersLabel(tail.length), value: v, color: "var(--m-other)", display: fmt(v) }];
}

function PeopleCards({ stats }: { stats: ChatStats }) {
  const t = useT(statsDict);
  const { members, intl } = useReport();
  const withStats = members.filter((m): m is MemberInfo & { stats: NonNullable<MemberInfo["stats"]> } => !!m.stats);
  const total = stats.totalMessages || 1;
  const others = (n: number) => t("others", { n });

  const share = fold(
    withStats.map((m) => ({ key: m.id, label: m.name, value: m.stats.messages, color: m.color, display: fmtPct(m.stats.messages / total, intl, m.stats.messages / total < 0.1 ? 1 : 0), sub: fmtNum(m.stats.messages, intl) })),
    others,
    (v) => fmtPct(v / total, intl),
  );
  const fmtCount = (v: number) => fmtNum(v, intl);
  const openers = fold(
    withStats.filter((m) => m.stats.conversationStarts > 0).map((m) => ({ key: m.id, label: m.name, value: m.stats.conversationStarts, color: m.color, display: fmtCount(m.stats.conversationStarts) })),
    others,
    fmtCount,
  ).slice(0, 5);
  const enders = fold(
    withStats.filter((m) => (m.stats.conversationEnds ?? 0) > 0).map((m) => ({ key: m.id, label: m.name, value: m.stats.conversationEnds, color: m.color, display: fmtCount(m.stats.conversationEnds) })),
    others,
    fmtCount,
  ).slice(0, 5);

  return (
    <div className="grid gap-5 lg:grid-cols-[1.25fr_1fr]">
      <ChartCard
        icon="🗣️"
        title={t("peopleTitle")}
        sub={t("peopleSub")}
        table={{ caption: t("peopleTitle"), head: [t("colPerson"), t("colMessages"), t("colShare")], rows: share.map((s) => [s.label, fmtNum(s.value, intl), s.display]) }}
      >
        <StackStrip items={share} total={share.reduce((a, b) => a + b.value, 0)} />
        <div className="mt-4">
          <RankedBars items={share} />
        </div>
      </ChartCard>
      <div className="grid gap-5">
        {openers.length > 0 && (
          <ChartCard
            icon="🚪"
            title={t("openersTitle")}
            sub={t("openersSub")}
            table={{ caption: t("openersTitle"), head: [t("colPerson"), t("colCount")], rows: openers.map((s) => [s.label, s.display]) }}
          >
            <RankedBars items={openers} size="sm" />
          </ChartCard>
        )}
        {enders.length > 0 && (
          <ChartCard
            icon="🫥"
            title={t("endersTitle")}
            sub={t("endersSub")}
            table={{ caption: t("endersTitle"), head: [t("colPerson"), t("colCount")], rows: enders.map((s) => [s.label, s.display]) }}
          >
            <RankedBars items={enders} size="sm" />
          </ChartCard>
        )}
      </div>
    </div>
  );
}

/** Thin segmented bar: the whole chat split by person (figures live in the list below). */
function StackStrip({ items, total }: { items: RankedItem[]; total: number }) {
  if (!total) return null;
  return (
    <div aria-hidden className="flex h-3 w-full gap-[2px] overflow-hidden rounded-full">
      {items.map((it) =>
        it.value > 0 ? <div key={it.key} className="h-full first:rounded-s-full last:rounded-e-full" style={{ width: `${(it.value / total) * 100}%`, background: it.color }} /> : null,
      )}
    </div>
  );
}
