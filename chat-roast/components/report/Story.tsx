"use client";

import { useT } from "@/lib/i18n";
import { reportDict } from "@/lib/i18n/dict/report";
import { PersonaAvatar } from "@/components/ui/PersonaAvatar";
import { useReport, useReportText } from "./context";
import { SectionHeading, splitParagraphs } from "./ui";

export function Dynamics() {
  const t = useT(reportDict);
  const text = useReportText();
  const { saved } = useReport();
  const paras = splitParagraphs(saved.report.dynamics);
  const cares = splitParagraphs(saved.report.whoCares);
  if (!paras.length && !cares.length) return null;
  return (
    <section aria-labelledby="sec-dynamics">
      <SectionHeading index="05" kicker={t("sDynamicsKicker")} title={t("sDynamics")} id="sec-dynamics" accent="var(--sky)" />
      {paras.length > 0 && (
        <div {...text} className="max-w-3xl space-y-4 text-[1.08rem] leading-[1.7] text-pretty">
          {paras.map((p, i) => (
            <p key={i} className={i === 0 ? "font-semibold" : "text-ink-2"}>
              {p}
            </p>
          ))}
        </div>
      )}
      {cares.length > 0 && (
        <aside className="relative mt-8 max-w-3xl rounded-[1.5rem] border-2 border-line p-5 pt-7 sm:p-7" style={{ background: "color-mix(in oklab, var(--bubblegum) 13%, var(--surface))" }}>
          <h3 className="absolute -top-4 start-4 inline-flex items-center gap-2 rounded-full border-2 border-line bg-bubblegum px-3.5 py-1 text-sm font-black text-[#17120e] shadow-pop-sm rtl:shadow-[-2px_2px_0_0_var(--shadow)]">
            <span aria-hidden>💘</span>
            {t("sWhoCares")}
          </h3>
          <div {...text} className="space-y-3 text-[1.04rem] leading-[1.65] text-pretty">
            {cares.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </aside>
      )}
    </section>
  );
}

export function TurningPoint() {
  const t = useT(reportDict);
  const text = useReportText();
  const { saved } = useReport();
  const tp = saved.report.turningPoint;
  if (!tp || (!tp.title && !tp.description)) return null;
  return (
    <section aria-labelledby="sec-turning">
      <SectionHeading index="06" kicker={t("sTurningKicker")} title={t("sTurning")} id="sec-turning" accent="var(--grape)" />
      <div className="relative max-w-3xl ps-9">
        {/* timeline rail */}
        <div aria-hidden className="absolute top-1 bottom-1 start-[0.6rem] w-[3px] rounded-full bg-line-soft" />
        <div aria-hidden className="absolute top-0 start-[0.6rem] h-10 w-[3px] -translate-x-0 rounded-full bg-line opacity-30" />
        <div aria-hidden className="absolute bottom-0 start-[0.6rem] h-10 w-[3px] rounded-full bg-line opacity-30" />
        <span aria-hidden className="absolute top-[2.35rem] start-0 grid h-[1.4rem] w-[1.4rem] place-items-center rounded-full border-2 border-line bg-grape">
          <span className="h-1.5 w-1.5 rounded-full bg-surface" />
        </span>
        {tp.when && (
          <div {...text} className="inline-flex rounded-full border-2 border-line bg-ink px-3 py-1 text-sm font-black text-paper">
            {tp.when}
          </div>
        )}
        <article className="card mt-3 p-5 sm:p-6">
          <h3 {...text} className="text-2xl font-black leading-tight text-balance">
            <span aria-hidden className="me-2">⚡</span>
            {tp.title}
          </h3>
          {tp.description && (
            <div {...text} className="mt-3 space-y-3 text-[1.04rem] leading-[1.65] text-ink-2 text-pretty">
              {splitParagraphs(tp.description).map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          )}
        </article>
      </div>
    </section>
  );
}

/** Direction of a raw chat string (its first strong character decides, like dir="auto"). */
export function textDir(s: string): "rtl" | "ltr" {
  const m = s.match(/[\p{L}]/u);
  return m && /[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/.test(m[0]) ? "rtl" : "ltr";
}

/** Curly quotes read wrong when mirrored; RTL text gets neutral ones. */
export function quoted(s: string, dir: "rtl" | "ltr" = textDir(s)): string {
  return dir === "rtl" ? `"${s}"` : `“${s}”`;
}

const STICKER_TINTS = ["var(--sun)", "var(--mint)", "var(--sky)", "var(--bubblegum)", "var(--grape)", "var(--ember)"];

export function InsideJokes() {
  const t = useT(reportDict);
  const text = useReportText();
  const { saved } = useReport();
  const jokes = (saved.report.insideJokes ?? []).filter((j) => j.phrase);
  if (!jokes.length) return null;
  return (
    <section aria-labelledby="sec-jokes">
      <SectionHeading index="07" kicker={t("sJokesKicker")} title={t("sJokes")} id="sec-jokes" accent="var(--mint)" />
      <ul className="grid gap-x-5 gap-y-7 sm:grid-cols-2 lg:grid-cols-3">
        {jokes.map((j, i) => {
          const tint = STICKER_TINTS[i % STICKER_TINTS.length];
          const tilt = i % 2 === 0 ? "-rotate-[1.5deg]" : "rotate-[1.5deg]";
          return (
            <li key={i} className="flex flex-col items-start">
              <span
                dir={textDir(j.phrase)}
                className={`relative z-10 inline-block max-w-full ${tilt} rounded-2xl border-2 border-line px-4 py-2 text-lg font-black leading-tight text-[#17120e] shadow-pop rtl:shadow-[-4px_4px_0_0_var(--shadow)] break-words`}
                style={{ background: `color-mix(in oklab, ${tint} 70%, white)` }}
              >
                {quoted(j.phrase)}
              </span>
              {j.explanation && (
                <p {...text} className="-mt-2 w-full rounded-2xl border-2 border-line-soft bg-surface px-4 pt-5 pb-3 text-[0.98rem] leading-snug text-ink-2 text-pretty">
                  {j.explanation}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function Closing() {
  const t = useT(reportDict);
  const text = useReportText();
  const { saved, personaName } = useReport();
  const advice = splitParagraphs(saved.report.advice);
  const line = saved.report.closingLine?.trim();
  if (!advice.length && !line) return null;
  return (
    <section aria-labelledby="sec-advice">
      <SectionHeading index="09" kicker={t("sAdviceKicker")} title={t("sAdvice")} id="sec-advice" accent="var(--sea)" />
      {advice.length > 0 && (
        <div className="card max-w-3xl p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <PersonaAvatar id={saved.personaId} size={44} />
            <div {...text} className="min-w-0 space-y-3 text-[1.08rem] leading-[1.65] text-pretty">
              {advice.map((p, i) => (
                <p key={i} className={i === 0 ? "font-semibold" : "text-ink-2"}>
                  {p}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}
      {line && (
        <figure className="relative mt-12 mb-4 overflow-hidden rounded-[2rem] border-2 border-line bg-ink px-6 py-12 text-center text-paper shadow-pop-lg rtl:shadow-[-6px_6px_0_0_var(--shadow)] sm:px-12 sm:py-16">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.16]"
            style={{ backgroundImage: "radial-gradient(var(--ember) 2px, transparent 2.4px)", backgroundSize: "16px 16px" }}
          />
          <div aria-hidden className="relative text-5xl">
            🎤
          </div>
          <blockquote {...text} className="relative mt-5 text-[2.1rem] leading-[1.08] font-black tracking-tight text-balance sm:text-5xl">
            {line}
          </blockquote>
          <figcaption className="relative mt-6 text-sm font-bold uppercase tracking-[0.22em] text-ember">— {personaName}</figcaption>
        </figure>
      )}
    </section>
  );
}
