"use client";

import { PersonaAvatar } from "@/components/ui/PersonaAvatar";
import { PERSONAS } from "@/lib/personas";
import { useLocalized, useT } from "@/lib/i18n";
import { reportDict } from "@/lib/i18n/dict/report";
import { fmtCompact, fmtDate, fmtNum, fmtRange } from "@/components/stats/format";
import { useReport, useReportText } from "./context";

export function Hero() {
  const t = useT(reportDict);
  const loc = useLocalized();
  const { saved, intl } = useReport();
  const text = useReportText();
  const { report, stats, transcriptMeta } = saved;
  const persona = PERSONAS[saved.personaId] ?? PERSONAS.max;
  const level = t(saved.intensity === 1 ? "intensity1" : saved.intensity === 3 ? "intensity3" : "intensity2");
  const people = stats.participantsCount || saved.participants.length;

  return (
    <section aria-labelledby="report-title" className="relative overflow-hidden border-b-2 border-line">
      {/* halftone + color blocks (decorative) */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div
          className="absolute -top-16 -end-24 h-80 w-80 rounded-full opacity-[0.22]"
          style={{ backgroundImage: "radial-gradient(var(--ember) 2.2px, transparent 2.6px)", backgroundSize: "14px 14px" }}
        />
        <div
          className="absolute -bottom-16 -start-16 h-48 w-48 rounded-full opacity-20"
          style={{ backgroundImage: "radial-gradient(var(--grape) 2px, transparent 2.4px)", backgroundSize: "12px 12px" }}
        />
      </div>

      <div className="relative mx-auto max-w-5xl px-4 pt-5 pb-10 sm:px-6 sm:pt-8 sm:pb-16">
        {/* masthead */}
        <div className="flex items-center justify-between gap-3 border-b-2 border-line pb-3 text-[0.7rem] font-bold uppercase tracking-[0.2em]">
          <span className="truncate">
            {t("kicker")} <span className="text-ink-3">·</span> <bdi>{saved.groupName}</bdi>
          </span>
          <span className="shrink-0 text-ink-2 tabular-nums">{fmtDate(saved.createdAt, intl, { day: "numeric", month: "short", year: "numeric" })}</span>
        </div>

        {/* desktop cover art: the narrator as a big sticker */}
        <div aria-hidden className="pointer-events-none absolute end-6 top-28 hidden rotate-6 lg:block rtl:-rotate-6">
          <div className="rounded-full bg-surface p-2 shadow-pop-lg ring-2 ring-line rtl:shadow-[-6px_6px_0_0_var(--shadow)]">
            <PersonaAvatar id={persona.id} size={210} />
          </div>
        </div>

        {/* byline */}
        <div className="mt-6 flex items-center gap-3">
          <PersonaAvatar id={persona.id} size={52} className="shadow-pop-sm rtl:shadow-[-2px_2px_0_0_var(--shadow)]" />
          <div className="min-w-0 leading-tight">
            <div className="text-xs font-semibold text-ink-3">{t("writtenBy")}</div>
            <div className="text-lg font-black">{loc(persona.name)}</div>
            <div className="text-sm text-ink-2">
              {loc(persona.role)} <span className="text-ink-3">·</span> <span className="whitespace-nowrap">{t("intensityLabel", { level })}</span>
            </div>
          </div>
        </div>

        <h1 id="report-title" {...text} className="mt-6 max-w-4xl text-[2.55rem] lg:max-w-[46rem] leading-[1.02] font-black tracking-[-0.02em] text-balance sm:text-6xl lg:text-7xl">
          {report.title}
        </h1>
        {report.subtitle && (
          <p {...text} className="mt-4 max-w-2xl text-lg leading-snug text-ink-2 text-pretty sm:text-xl">
            {report.subtitle}
          </p>
        )}

        {report.vibe?.label && (
          <div className="mt-7 flex">
            <div className="inline-flex -rotate-2 items-center gap-3 rounded-2xl border-2 border-line bg-sun py-2 ps-2 pe-5 text-[#17120e] shadow-pop rtl:rotate-2 rtl:shadow-[-4px_4px_0_0_var(--shadow)]">
              <span aria-hidden className="grid h-11 w-11 place-items-center rounded-xl border-2 border-[#17120e] bg-white/70 text-2xl">
                {report.vibe.emoji}
              </span>
              <span className="leading-tight">
                <span className="block text-[0.65rem] font-bold uppercase tracking-[0.18em] opacity-70">{t("vibeLabel")}</span>
                <span {...text} className="block text-lg font-black">
                  {report.vibe.label}
                </span>
              </span>
            </div>
          </div>
        )}

        <dl className="mt-9 grid max-w-2xl grid-cols-3 overflow-hidden rounded-2xl border-2 border-line bg-surface">
          <Meta value={fmtCompact(stats.totalMessages, intl)} label={t("heroMessages")} />
          <Meta value={fmtNum(stats.daysSpan, intl)} label={t("heroDays")} sub={fmtRange(stats.firstTs, stats.lastTs, intl)} />
          <Meta value={fmtNum(people, intl)} label={t("heroPeople")} />
        </dl>

        {transcriptMeta?.truncated && transcriptMeta.includedMessages > 0 && (
          <p className="relative mt-3 text-sm text-ink-3">
            {t("truncated", { read: fmtNum(transcriptMeta.includedMessages, intl), total: fmtNum(transcriptMeta.totalMessages, intl) })}
          </p>
        )}
      </div>
    </section>
  );
}

function Meta({ value, label, sub }: { value: string; label: string; sub?: string }) {
  return (
    <div className="flex min-w-0 flex-col items-center justify-center border-line px-1.5 py-3 text-center not-first:border-s-2">
      <dd className="text-2xl font-black leading-none sm:text-3xl">{value}</dd>
      <dt className="mt-1.5 max-w-full text-xs font-semibold text-ink-2">{label}</dt>
      {sub && <dd className="mt-0.5 max-w-full text-[0.68rem] leading-tight text-ink-3">{sub}</dd>}
    </div>
  );
}
