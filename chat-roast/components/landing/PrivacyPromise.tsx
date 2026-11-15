"use client";

import Link from "next/link";
import { IconArrowForward } from "@/components/ui/icons";
import { useT } from "@/lib/i18n";
import { landingDict } from "@/lib/i18n/dict/landing";
import { SectionHeading } from "./SectionHeading";

const ITEMS = [
  { k: 1, emoji: "💻", tone: "bg-sky" },
  { k: 2, emoji: "🕶️", tone: "bg-sun" },
  { k: 3, emoji: "🗑️", tone: "bg-mint" },
  { k: 4, emoji: "📱", tone: "bg-bubblegum" },
] as const;

export function PrivacyPromise() {
  const t = useT(landingDict);

  return (
    <section aria-labelledby="privacy-title" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
      <div className="relative overflow-hidden rounded-[2rem] border-2 border-line bg-[#17120e] px-5 py-10 text-[#fff8f0] shadow-pop-lg dark:bg-[#211b17] sm:px-10 sm:py-14 rtl:shadow-[-6px_6px_0_0_var(--shadow)]">
        <span aria-hidden className="pointer-events-none absolute -end-10 -top-10 text-[10rem] leading-none opacity-10 select-none">
          🔒
        </span>
        <SectionHeading id="privacy-title" kicker={t("privacy_kicker")} title={t("privacy_title")} sub={t("privacy_sub")} invert />
        <ul className="mt-10 grid gap-4 sm:grid-cols-2">
          {ITEMS.map(({ k, emoji, tone }) => (
            <li key={k} className="flex gap-4 rounded-3xl border-2 border-white/15 bg-white/5 p-5">
              <span aria-hidden className={`grid size-12 shrink-0 place-items-center rounded-2xl border-2 border-white/25 text-2xl ${tone}`}>
                {emoji}
              </span>
              <div>
                <h3 className="text-lg font-extrabold">{t(`privacy_${k}_title`)}</h3>
                <p className="mt-1 leading-relaxed text-[#fff8f0]/75">{t(`privacy_${k}_body`)}</p>
              </div>
            </li>
          ))}
        </ul>
        <Link
          href="/privacy"
          className="group mt-8 inline-flex items-center gap-2 rounded-full font-bold text-sun underline decoration-2 underline-offset-4 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sun/50"
        >
          {t("privacy_link")}
          <IconArrowForward size={18} className="transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" />
        </Link>
      </div>
    </section>
  );
}
