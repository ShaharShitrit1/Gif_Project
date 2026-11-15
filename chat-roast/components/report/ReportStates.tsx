"use client";

import Link from "next/link";
import { Button, ButtonLink } from "@/components/ui/Button";
import { useT } from "@/lib/i18n";
import { reportDict } from "@/lib/i18n/dict/report";

/** Skeleton shaped like the hero + first sections. */
export function ReportSkeleton() {
  const t = useT(reportDict);
  return (
    <div role="status" aria-live="polite" className="mx-auto w-full max-w-3xl px-4 pt-6 pb-16">
      <span className="sr-only">{t("loading")}</span>
      <div aria-hidden className="animate-pulse">
        <div className="flex justify-between border-b-2 border-line-soft pb-3">
          <div className="h-3 w-40 rounded-full bg-surface-2" />
          <div className="h-3 w-20 rounded-full bg-surface-2" />
        </div>
        <div className="mt-6 flex items-center gap-3">
          <div className="h-[52px] w-[52px] rounded-full bg-surface-2" />
          <div className="space-y-2">
            <div className="h-3 w-20 rounded-full bg-surface-2" />
            <div className="h-4 w-32 rounded-full bg-surface-2" />
          </div>
        </div>
        <div className="mt-7 space-y-3">
          <div className="h-10 w-[92%] rounded-2xl bg-surface-2" />
          <div className="h-10 w-[78%] rounded-2xl bg-surface-2" />
          <div className="h-10 w-[55%] rounded-2xl bg-surface-2" />
        </div>
        <div className="mt-5 h-4 w-[70%] rounded-full bg-surface-2" />
        <div className="mt-8 h-14 w-48 rounded-2xl bg-surface-2" />
        <div className="mt-9 h-20 rounded-2xl bg-surface-2" />
        <div className="mt-14 h-6 w-40 rounded-full bg-surface-2" />
        <div className="mt-5 h-64 rounded-[1.5rem] bg-surface-2" />
      </div>
      <p className="mt-6 text-center text-sm font-semibold text-ink-3">{t("loading")}</p>
    </div>
  );
}

export function ReportNotFound({ error = false, onRetry }: { error?: boolean; onRetry?: () => void }) {
  const t = useT(reportDict);
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-center px-4 py-16 text-center sm:py-24">
      <div aria-hidden className="relative mb-8">
        <div className="grid h-28 w-28 -rotate-6 place-items-center rounded-[2rem] border-2 border-line bg-sun text-6xl shadow-pop rtl:rotate-6 rtl:shadow-[-4px_4px_0_0_var(--shadow)]">
          {error ? "🫠" : "🕵️"}
        </div>
        <div className="absolute -end-5 -top-3 grid h-11 w-11 rotate-12 place-items-center rounded-full border-2 border-line bg-surface text-xl">?</div>
      </div>
      <h1 className="text-3xl font-black text-balance sm:text-4xl">{error ? t("errorTitle") : t("notFoundTitle")}</h1>
      <p className="mt-4 text-lg leading-relaxed text-ink-2 text-pretty">{error ? t("errorBody") : t("notFoundBody")}</p>
      <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
        {onRetry && (
          <Button size="lg" variant="dark" onClick={onRetry}>
            ↻ {t("retry")}
          </Button>
        )}
        <ButtonLink href="/analyze" size="lg">
          {t("notFoundCta")} <span aria-hidden>🔥</span>
        </ButtonLink>
        <ButtonLink href="/report/demo" variant="secondary" size="lg">
          {t("notFoundDemo")}
        </ButtonLink>
      </div>
      <Link href="/reports" className="mt-5 text-sm font-semibold text-ink-2 underline underline-offset-4 hover:text-ink">
        {t("notFoundMine")}
      </Link>
    </div>
  );
}

export function DemoRibbon() {
  const t = useT(reportDict);
  return (
    <div className="border-b-2 border-line bg-ink text-paper">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2.5 sm:px-6">
        <p className="flex items-center gap-2 text-sm font-bold">
          <span aria-hidden className="rounded-full bg-sun px-2 py-0.5 text-xs font-black text-[#17120e]">
            DEMO
          </span>
          {t("demoRibbon")}
        </p>
        <Link href="/analyze" className="inline-flex items-center gap-1.5 rounded-full bg-ember px-3.5 py-1 text-sm font-bold text-ember-ink hover:brightness-110 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ember/40">
          <span className="hidden sm:inline">{t("demoCta")}</span>
          <span className="sm:hidden">{t("demoCtaButton")}</span>
          <span aria-hidden className="inline-block rtl:-scale-x-100">→</span>
        </Link>
      </div>
    </div>
  );
}
