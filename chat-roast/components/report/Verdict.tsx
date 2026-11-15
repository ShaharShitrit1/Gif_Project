"use client";

import { useT } from "@/lib/i18n";
import { reportDict } from "@/lib/i18n/dict/report";
import { PersonaAvatar } from "@/components/ui/PersonaAvatar";
import { useReport, useReportText } from "./context";
import { SectionHeading, splitParagraphs } from "./ui";

export function Verdict() {
  const t = useT(reportDict);
  const { saved, personaName, reportDir } = useReport();
  const text = useReportText();
  const paras = splitParagraphs(saved.report.verdict);
  if (!paras.length) return null;
  const [lede, ...rest] = paras;

  return (
    <section aria-labelledby="sec-verdict" className="scroll-mt-20">
      <SectionHeading index="01" kicker={t("sVerdictKicker")} title={t("sVerdict")} id="sec-verdict" />
      <article className="card relative max-w-3xl overflow-hidden px-5 pt-8 pb-6 sm:px-8">
        <span aria-hidden className="pointer-events-none absolute -top-6 end-3 select-none font-black leading-none text-ember/15 text-[9rem]">
          ”
        </span>
        <div {...text} className="relative">
          <p
            className={`text-[1.3rem] leading-[1.45] font-bold text-pretty sm:text-2xl ${
              reportDir === "ltr" && /^\p{L}/u.test(lede) ? "first-letter:float-start first-letter:me-2.5 first-letter:mt-1 first-letter:text-[4.2rem] first-letter:leading-[0.82] first-letter:font-black first-letter:text-ember" : ""
            }`}
          >
            {lede}
          </p>
          {rest.map((p, i) => (
            <p key={i} className="mt-4 text-[1.06rem] leading-[1.7] text-ink-2 text-pretty sm:text-lg">
              {p}
            </p>
          ))}
        </div>
        <footer className="mt-6 flex items-center gap-2 border-t-2 border-dashed border-line-soft pt-4 text-sm font-bold">
          <PersonaAvatar id={saved.personaId} size={28} />
          <span>— {personaName}</span>
        </footer>
      </article>
    </section>
  );
}
