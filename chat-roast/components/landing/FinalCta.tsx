"use client";

import { ButtonLink } from "@/components/ui/Button";
import { PersonaAvatar } from "@/components/ui/PersonaAvatar";
import { useT } from "@/lib/i18n";
import { landingDict } from "@/lib/i18n/dict/landing";

export function FinalCta() {
  const t = useT(landingDict);

  return (
    <section aria-labelledby="final-title" className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 sm:pb-28">
      <div className="relative overflow-hidden rounded-[2rem] border-2 border-line bg-ember px-6 py-12 text-center text-[#17120e] shadow-pop-lg sm:py-16 rtl:shadow-[-6px_6px_0_0_var(--shadow)]">
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{ backgroundImage: "radial-gradient(rgba(255,255,255,.6) 1.5px, transparent 1.8px)", backgroundSize: "16px 16px" }}
        />
        <div aria-hidden className="relative mb-6 flex justify-center -space-x-3 rtl:space-x-reverse">
          <PersonaAvatar id="savta" size={64} className="rotate-[-8deg]" />
          <PersonaAvatar id="max" size={80} className="relative z-10 -translate-y-2" />
          <PersonaAvatar id="doc" size={64} className="rotate-[8deg]" />
        </div>
        <h2 id="final-title" className="relative mx-auto max-w-2xl text-[2rem] font-black leading-[1.05] tracking-tight text-balance sm:text-5xl">
          {t("final_title")}
        </h2>
        <p className="relative mt-3 text-lg font-semibold opacity-80">{t("final_sub")}</p>
        <ButtonLink href="/analyze" variant="contrast" size="lg" className="relative mt-8">
          {t("final_cta")} <span aria-hidden>🔥</span>
        </ButtonLink>
        <p className="relative mt-4 text-sm font-bold opacity-75">{t("final_note")}</p>
      </div>
    </section>
  );
}
