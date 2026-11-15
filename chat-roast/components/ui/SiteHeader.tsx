"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/brand/Logo";
import { useT } from "@/lib/i18n";
import { commonDict } from "@/lib/i18n/dict/common";
import { ButtonLink } from "./Button";
import { LocaleSwitch } from "./LocaleSwitch";
import { IconStack } from "./icons";

/**
 * Site-wide top bar: logo → "/", my reports, language toggle, primary CTA.
 * Pages should render their content in `<main id="main">` (target of the skip link).
 */
export function SiteHeader({ cta = true, sticky = true, className = "" }: { cta?: boolean; sticky?: boolean; className?: string }) {
  const t = useT(commonDict);
  const pathname = usePathname();
  const onReports = pathname?.startsWith("/reports");

  return (
    <header
      className={`${sticky ? "sticky top-0" : "relative"} z-40 border-b-2 border-line-soft bg-paper/85 backdrop-blur-md supports-[backdrop-filter]:bg-paper/70 ${className}`}
    >
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:start-3 focus:top-3 focus:z-50 focus:rounded-full focus:border-2 focus:border-line focus:bg-surface focus:px-4 focus:py-2 focus:text-sm focus:font-bold"
      >
        {t("skip_to_content")}
      </a>
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-3 min-[400px]:px-4 sm:px-6">
        <Link
          href="/"
          aria-label={t("home_aria")}
          className="-mx-1 rounded-xl px-1 py-1 transition-transform hover:-rotate-2 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ember/40"
        >
          <span className="block sm:hidden">
            <Logo size={28} />
          </span>
          <span className="hidden sm:block">
            <Logo size={34} />
          </span>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2" aria-label="ChatRoast">
          <Link
            href="/reports"
            aria-label={t("nav_reports")}
            aria-current={onReports ? "page" : undefined}
            className={`inline-flex h-9 items-center gap-1.5 rounded-full px-2.5 text-sm font-semibold text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ember/40 sm:px-3 ${onReports ? "bg-surface-2 text-ink" : ""}`}
          >
            <IconStack size={18} />
            <span className="hidden sm:inline">{t("nav_reports")}</span>
          </Link>
          <LocaleSwitch />
          {cta && (
            <ButtonLink href="/analyze" size="sm" className="ms-0.5 gap-1.5 px-3 sm:px-4">
              <span className="sm:hidden">{t("nav_cta_short")}</span>
              <span className="hidden sm:inline">{t("nav_cta")}</span>
              <span aria-hidden>🔥</span>
            </ButtonLink>
          )}
        </nav>
      </div>
    </header>
  );
}
