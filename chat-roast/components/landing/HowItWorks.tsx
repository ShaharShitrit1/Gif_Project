"use client";

import type { ReactNode } from "react";
import { PersonaAvatar } from "@/components/ui/PersonaAvatar";
import { IconFile, IconUpload } from "@/components/ui/icons";
import { useT } from "@/lib/i18n";
import { landingDict } from "@/lib/i18n/dict/landing";
import { SectionHeading } from "./SectionHeading";

export function HowItWorks() {
  const t = useT(landingDict);

  const steps: { n: number; title: string; body: string; art: ReactNode; tone: string }[] = [
    { n: 1, title: t("how_1_title"), body: t("how_1_body"), art: <ExportArt />, tone: "bg-sky" },
    { n: 2, title: t("how_2_title"), body: t("how_2_body"), art: <DropArt />, tone: "bg-sun" },
    { n: 3, title: t("how_3_title"), body: t("how_3_body"), art: <CastArt />, tone: "bg-bubblegum" },
  ];

  return (
    <section aria-labelledby="how-title" className="border-y-2 border-line-soft bg-surface-2/60">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <SectionHeading id="how-title" kicker={t("how_kicker")} title={t("how_title")} />
        <ol className="mt-10 grid gap-5 md:grid-cols-3">
          {steps.map((s) => (
            <li key={s.n} className="card relative flex flex-col overflow-hidden">
              <div className={`relative grid h-40 place-items-center border-b-2 border-line ${s.tone}`}>
                <span
                  aria-hidden
                  className="absolute start-4 top-4 grid size-10 place-items-center rounded-full border-2 border-line bg-surface text-lg font-black text-ink"
                >
                  {s.n}
                </span>
                {s.art}
              </div>
              <div className="flex-1 p-5">
                <h3 className="text-xl font-extrabold">
                  <span className="sr-only">{s.n}. </span>
                  {s.title}
                </h3>
                <p className="mt-2 leading-relaxed text-ink-2">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/** Tiny phone with the "Export chat" row highlighted. */
function ExportArt() {
  return (
    <div aria-hidden className="relative h-28 w-20 rounded-[1.1rem] border-2 border-line bg-surface p-1.5 shadow-pop-sm rtl:shadow-[-2px_2px_0_0_var(--shadow)]">
      <div className="mx-auto mb-1.5 h-1 w-6 rounded-full bg-line-soft" />
      <div className="space-y-1">
        <div className="h-2 rounded bg-surface-2" />
        <div className="h-2 rounded bg-surface-2" />
        <div className="cr-glow flex h-4 items-center gap-1 rounded-md border-[1.5px] border-line bg-sun/70 px-1">
          <IconUpload size={9} strokeWidth={3} className="text-[#17120e]" />
          <span className="h-1 flex-1 rounded bg-[#17120e]/60" />
        </div>
        <div className="h-2 rounded bg-surface-2" />
        <div className="h-2 w-2/3 rounded bg-ember/40" />
      </div>
    </div>
  );
}

function DropArt() {
  return (
    <div aria-hidden className="relative grid h-24 w-36 place-items-center rounded-2xl border-2 border-dashed border-line bg-surface/70">
      <div className="cr-bob grid size-12 place-items-center rounded-xl border-2 border-line bg-surface shadow-pop-sm rtl:shadow-[-2px_2px_0_0_var(--shadow)]">
        <IconFile size={24} />
      </div>
      <span className="absolute -bottom-3 rounded-full border-2 border-line bg-surface px-2 py-0.5 text-[0.65rem] font-black text-ink" dir="ltr">
        _chat.txt
      </span>
    </div>
  );
}

function CastArt() {
  return (
    <div aria-hidden className="flex items-end -space-x-3 rtl:space-x-reverse">
      <PersonaAvatar id="savta" size={56} className="translate-y-1 -rotate-6" />
      <PersonaAvatar id="max" size={76} className="relative z-10" />
      <PersonaAvatar id="doc" size={56} className="translate-y-1 rotate-6" />
    </div>
  );
}
