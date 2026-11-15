"use client";

import { ButtonLink } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { PersonaAvatar } from "@/components/ui/PersonaAvatar";
import { IconArrowForward, IconCheck, IconSparkles } from "@/components/ui/icons";
import { useT } from "@/lib/i18n";
import { landingDict } from "@/lib/i18n/dict/landing";
import { HeroChat } from "./HeroChat";
import "@/components/ui/motion.css";

export function Hero() {
  const t = useT(landingDict);

  return (
    <section aria-labelledby="hero-title" className="relative overflow-hidden">
      {/* decorative paper confetti */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-0">
        <span className="absolute -top-24 end-[-6rem] size-80 rounded-full bg-sun/25 blur-3xl" />
        <span className="absolute bottom-0 start-[-8rem] size-72 rounded-full bg-bubblegum/15 blur-3xl" />
      </div>

      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-8 sm:px-6 sm:pt-14 lg:grid-cols-[1.08fr_0.92fr] lg:gap-16 lg:pb-24">
        <div className="cr-slide-up">
          <Chip tone="sun" icon={<IconSparkles size={15} />} className="mb-5">
            {t("hero_eyebrow")}
          </Chip>
          <h1 id="hero-title" className="text-[2.75rem] font-black leading-[0.98] tracking-[-0.035em] text-balance sm:text-7xl">
            <span className="block">{t("hero_title_a")}</span>
            <span className="relative inline-block text-ember">
              {t("hero_title_b")}
              <svg
                aria-hidden
                viewBox="0 0 300 18"
                preserveAspectRatio="none"
                className="absolute inset-x-0 -bottom-2 h-3 w-full text-sun sm:-bottom-3 sm:h-4"
              >
                <path d="M3 13 C 60 4, 120 4, 170 9 S 260 15, 297 6" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
              </svg>
            </span>
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-relaxed text-ink-2 text-pretty sm:text-xl">{t("hero_sub")}</p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <ButtonLink href="/analyze" size="lg" className="w-full sm:w-auto">
              {t("hero_cta")} <span aria-hidden>🔥</span>
            </ButtonLink>
            <ButtonLink href="/report/demo" variant="secondary" size="lg" className="w-full sm:w-auto">
              {t("hero_cta_secondary")}
              <IconArrowForward size={18} />
            </ButtonLink>
          </div>

          <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-ink-2">
            {(["hero_trust_free", "hero_trust_signup", "hero_trust_local"] as const).map((k) => (
              <li key={k} className="inline-flex items-center gap-1.5">
                <span className="grid size-5 place-items-center rounded-full bg-mint text-[#0b3b24]">
                  <IconCheck size={13} strokeWidth={3.2} />
                </span>
                {t(k)}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative mx-auto w-full max-w-[25rem] lg:me-0">
          {/* floating narrator heads + stickers */}
          <div aria-hidden className="cr-bob absolute -top-8 end-[-2rem] z-10 hidden sm:block" style={{ animationDelay: "-1.2s" }}>
            <PersonaAvatar id="savta" size={58} className="shadow-pop-sm" />
          </div>
          <div aria-hidden className="cr-bob absolute -bottom-7 start-[-2.25rem] z-10 hidden sm:block" style={{ animationDelay: "-2.6s" }}>
            <PersonaAvatar id="doc" size={52} className="shadow-pop-sm" />
          </div>
          <span
            aria-hidden
            className="absolute -start-3 top-16 z-10 hidden rotate-[-8deg] rounded-xl border-2 border-line bg-sun px-2.5 py-1 text-sm font-black text-[#17120e] shadow-pop-sm sm:-start-14 sm:block"
          >
            {t("hero_sticker_laughs")}
          </span>
          <span
            aria-hidden
            className="absolute -end-3 bottom-24 z-10 hidden rotate-[6deg] rounded-xl border-2 border-line bg-sky px-2.5 py-1 text-sm font-black text-[#17120e] shadow-pop-sm sm:-end-12 sm:block"
          >
            🌙 {t("hero_sticker_night")}
          </span>
          <HeroChat className="rotate-[0.6deg] rtl:rotate-[-0.6deg]" />
        </div>
      </div>
    </section>
  );
}
