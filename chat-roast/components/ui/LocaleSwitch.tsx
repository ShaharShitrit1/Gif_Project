"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useLocale, useT } from "@/lib/i18n";
import { commonDict } from "@/lib/i18n/dict/common";
import { IconGlobe } from "./icons";

/** Toggles the UI between Hebrew and English (cookie + server re-render). */
export function LocaleSwitch({ variant = "pill", className = "" }: { variant?: "pill" | "link"; className?: string }) {
  const { locale, setLocale } = useLocale();
  const t = useT(commonDict);
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const next = locale === "he" ? "en" : "he";

  const onClick = () => {
    setLocale(next);
    startTransition(() => router.refresh());
  };

  if (variant === "link") {
    return (
      <button
        type="button"
        onClick={onClick}
        lang={next}
        aria-label={t("locale_switch_aria")}
        className={`inline-flex items-center gap-1.5 rounded-md underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ember/40 ${className}`}
      >
        <IconGlobe size={16} />
        {t("locale_name_other")}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      lang={next}
      aria-label={t("locale_switch_aria")}
      aria-busy={pending || undefined}
      className={`inline-flex h-9 items-center gap-1 rounded-full border-2 border-line bg-surface px-2.5 text-sm font-bold text-ink transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ember/40 ${className}`}
    >
      <IconGlobe size={16} className={pending ? "animate-spin" : ""} />
      <span className="min-w-[1.4em] text-center">{t("locale_switch_short")}</span>
    </button>
  );
}
