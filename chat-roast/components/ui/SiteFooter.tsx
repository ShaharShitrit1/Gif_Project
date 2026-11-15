"use client";

import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { useT } from "@/lib/i18n";
import { commonDict } from "@/lib/i18n/dict/common";
import { LocaleSwitch } from "./LocaleSwitch";
import { IconLock } from "./icons";

const linkClass =
  "rounded-md text-ink-2 underline-offset-4 transition-colors hover:text-ink hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ember/40";

/** Site-wide footer: brand, privacy promise, links, language, ©. */
export function SiteFooter({ className = "" }: { className?: string }) {
  const t = useT(commonDict);
  const year = new Date().getFullYear();

  return (
    <footer className={`mt-auto border-t-2 border-line-soft bg-surface-2/60 ${className}`}>
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-[1.3fr_1fr] sm:px-6">
        <div className="space-y-3">
          <Link href="/" aria-label={t("home_aria")} className="inline-block rounded-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ember/40">
            <Logo size={30} />
          </Link>
          <p className="max-w-sm text-sm text-ink-2">{t("footer_tagline")}</p>
          <p className="inline-flex items-start gap-2 rounded-2xl border-2 border-line-soft bg-surface px-3 py-2 text-sm font-medium text-ink">
            <IconLock size={18} className="mt-px text-sea" />
            <span>{t("footer_promise")}</span>
          </p>
        </div>

        <nav aria-label={t("footer_nav_aria")} className="sm:justify-self-end">
          <ul className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm font-medium">
            <li>
              <Link href="/analyze" className={linkClass}>
                {t("footer_new")}
              </Link>
            </li>
            <li>
              <Link href="/reports" className={linkClass}>
                {t("footer_reports")}
              </Link>
            </li>
            <li>
              <Link href="/faq" className={linkClass}>
                {t("footer_faq")}
              </Link>
            </li>
            <li>
              <Link href="/privacy" className={linkClass}>
                {t("footer_privacy")}
              </Link>
            </li>
            <li>
              <Link href="/terms" className={linkClass}>
                {t("footer_terms")}
              </Link>
            </li>
            <li>
              <LocaleSwitch variant="link" className="text-ink-2 hover:text-ink" />
            </li>
          </ul>
        </nav>
      </div>
      <div className="border-t-2 border-line-soft">
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-4 text-xs text-ink-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span dir="ltr" className="self-start sm:self-auto">
            {t("footer_copyright", { year })}
          </span>
          <span>{t("footer_disclaimer")}</span>
        </div>
      </div>
    </footer>
  );
}
