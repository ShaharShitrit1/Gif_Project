"use client";

import Link from "next/link";
import { PersonaAvatar } from "@/components/ui/PersonaAvatar";
import { IconArrowForward } from "@/components/ui/icons";
import { useLocalized, useT } from "@/lib/i18n";
import { commonDict } from "@/lib/i18n/dict/common";
import { landingDict } from "@/lib/i18n/dict/landing";
import { PERSONA_IDS, PERSONAS } from "@/lib/personas";
import type { PersonaId } from "@/lib/types";
import { SectionHeading } from "./SectionHeading";

const SAMPLE_KEY: Record<PersonaId, "persona_sample_max" | "persona_sample_savta" | "persona_sample_doc"> = {
  max: "persona_sample_max",
  savta: "persona_sample_savta",
  doc: "persona_sample_doc",
};

export function Narrators() {
  const t = useT(landingDict);
  const c = useT(commonDict);
  const localized = useLocalized();

  return (
    <section aria-labelledby="narrators-title" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
      <SectionHeading id="narrators-title" kicker={t("narrators_kicker")} title={t("narrators_title")} sub={t("narrators_sub")} />
      <ul className="mt-10 grid gap-6 md:grid-cols-3">
        {PERSONA_IDS.map((id, i) => {
          const p = PERSONAS[id];
          const name = localized(p.name);
          return (
            <li key={id} className={`card flex flex-col overflow-hidden ${i === 1 ? "md:translate-y-6" : ""}`}>
              <div className="relative flex h-44 items-end justify-center overflow-hidden border-b-2 border-line" style={{ background: p.color.bg }}>
                <span
                  aria-hidden
                  className="absolute inset-0 opacity-25"
                  style={{
                    backgroundImage: "radial-gradient(rgba(255,255,255,.55) 1.5px, transparent 1.8px)",
                    backgroundSize: "14px 14px",
                  }}
                />
                <PersonaAvatar id={id} size={148} className="relative -mb-5 shadow-pop rtl:shadow-[-4px_4px_0_0_var(--shadow)]" />
              </div>
              <div className="flex flex-1 flex-col p-5">
                <div className="flex items-center gap-2">
                  <h3 className="text-2xl font-black">{name}</h3>
                  <span aria-hidden className="text-xl">
                    {p.emoji}
                  </span>
                </div>
                <p className="text-sm font-bold text-ink-2">{localized(p.role)}</p>
                <p className="mt-3 leading-relaxed text-ink-2">{localized(p.tagline)}</p>
                <figure className="relative mt-6 rounded-2xl rounded-ss-md border-2 border-line bg-surface-2 p-4 pt-5">
                  <span
                    aria-hidden
                    className="absolute -top-3.5 start-4 grid h-7 w-9 place-items-center rounded-full border-2 border-line text-xl font-black leading-none text-white"
                    style={{ background: p.color.bg }}
                  >
                    <span className="translate-y-1">”</span>
                  </span>
                  <figcaption className="sr-only">{t("narrators_says")}</figcaption>
                  <blockquote className="font-semibold leading-snug">{c(SAMPLE_KEY[id])}</blockquote>
                </figure>
                <Link
                  href={`/analyze?persona=${id}`}
                  className="group mt-5 inline-flex items-center gap-1.5 self-start rounded-full font-bold text-ink underline decoration-2 underline-offset-4 transition-colors hover:text-ember focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ember/40"
                  style={{ textDecorationColor: p.color.bg }}
                >
                  {t("narrators_pick", { name })}
                  <IconArrowForward size={18} className="transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" />
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
