"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/ui/SiteHeader";
import { SiteFooter } from "@/components/ui/SiteFooter";
import { Button, ButtonLink } from "@/components/ui/Button";
import { PersonaAvatar } from "@/components/ui/PersonaAvatar";
import { IconLock } from "@/components/ui/icons";
import { toast } from "@/components/ui/Toast";
import { useLocalized, useT } from "@/lib/i18n";
import { intlLocale, useLocale } from "@/lib/i18n";
import { reportDict } from "@/lib/i18n/dict/report";
import { PERSONAS } from "@/lib/personas";
import { deleteAllReports, deleteReport, listReports } from "@/lib/storage/reports";
import type { SavedReport } from "@/lib/types";
import { fmtDate, fmtNum, fmtRange } from "@/components/stats/format";
import { ConfirmDialog } from "./ui";

type Confirm = { kind: "one"; report: SavedReport } | { kind: "all" } | null;

/** /reports — every report saved in this browser. */
export function ReportsList() {
  const t = useT(reportDict);
  const [reports, setReports] = useState<SavedReport[] | null>(null);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    listReports()
      .then((r) => alive && setReports(r))
      .catch(() => alive && setReports([]));
    return () => {
      alive = false;
    };
  }, []);

  const onConfirm = async () => {
    if (!confirm) return;
    setBusy(true);
    try {
      if (confirm.kind === "all") {
        await deleteAllReports();
        setReports([]);
      } else {
        await deleteReport(confirm.report.id);
        setReports((rs) => (rs ?? []).filter((r) => r.id !== confirm.report.id));
      }
      toast(t("reportsDeleted"), { tone: "success" });
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  };

  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto w-full max-w-3xl flex-1 px-4 pt-10 pb-20 sm:pt-14">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black tracking-tight sm:text-5xl">{t("reportsTitle")}</h1>
            <p className="mt-2 text-lg text-ink-2">{t("reportsSub")}</p>
          </div>
          {reports && reports.length > 0 && (
            <span className="rounded-full border-2 border-line bg-surface px-3 py-1 text-sm font-bold">{t("reportsCount", { n: reports.length })}</span>
          )}
        </header>

        <p className="mt-6 flex items-start gap-2.5 rounded-2xl border-2 border-line-soft bg-surface px-4 py-3 text-sm text-ink-2">
          <IconLock size={18} className="mt-px shrink-0 text-sea" />
          <span>{t("reportsPrivacy")}</span>
        </p>

        {reports === null ? (
          <ul aria-hidden className="mt-8 space-y-4">
            {[0, 1, 2].map((i) => (
              <li key={i} className="h-28 animate-pulse rounded-[1.5rem] bg-surface-2" />
            ))}
          </ul>
        ) : reports.length === 0 ? (
          <Empty />
        ) : (
          <>
            <ul className="mt-8 space-y-4">
              {reports.map((r) => (
                <li key={r.id}>
                  <ReportRow report={r} onDelete={() => setConfirm({ kind: "one", report: r })} />
                </li>
              ))}
            </ul>
            <div className="mt-10 flex justify-center">
              <Button variant="ghost" onClick={() => setConfirm({ kind: "all" })} className="text-ink-2">
                <span aria-hidden>🗑️</span>
                {t("reportsDeleteAll")}
              </Button>
            </div>
          </>
        )}
      </main>
      <SiteFooter />

      <ConfirmDialog
        open={!!confirm}
        title={confirm?.kind === "all" ? t("reportsDeleteAllTitle") : t("deleteConfirmTitle")}
        body={confirm?.kind === "all" ? t("reportsDeleteAllBody", { n: reports?.length ?? 0 }) : t("deleteConfirmBody")}
        confirmLabel={confirm?.kind === "all" ? t("reportsDeleteAllConfirm") : t("deleteConfirm")}
        cancelLabel={t("cancel")}
        onConfirm={onConfirm}
        onCancel={() => setConfirm(null)}
        busy={busy}
      />
    </>
  );
}

function ReportRow({ report, onDelete }: { report: SavedReport; onDelete: () => void }) {
  const t = useT(reportDict);
  const loc = useLocalized();
  const { locale } = useLocale();
  const intl = intlLocale(locale);
  const persona = PERSONAS[report.personaId] ?? PERSONAS.max;
  const people = report.participants?.length ?? report.stats?.participantsCount ?? 0;
  const href = `/report/${encodeURIComponent(report.id)}`;
  return (
    <article className="card group relative flex items-center gap-4 p-4 transition-transform focus-within:-translate-y-0.5 hover:-translate-y-0.5 sm:p-5">
      <PersonaAvatar id={persona.id} size={56} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-bold uppercase tracking-[0.12em] text-ink-3">
          <bdi className="truncate normal-case tracking-normal text-sm text-ink-2">{report.groupName || t("reportsUntitled")}</bdi>
          <span aria-hidden>·</span>
          <span>{fmtDate(report.createdAt, intl, { day: "numeric", month: "short", year: "numeric" })}</span>
        </div>
        <h2 dir="auto" className="mt-1 line-clamp-2 text-start text-lg leading-snug font-black">
          <Link href={href} className="after:absolute after:inset-0 after:rounded-[1.5rem] focus-visible:outline-none focus-visible:after:ring-4 focus-visible:after:ring-ember/40">
            {report.report?.title || report.groupName}
          </Link>
        </h2>
        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-sm text-ink-2">
          <span>👥 {t("reportsMembers", { n: people, f: fmtNum(people, intl) })}</span>
          {report.stats?.firstTs ? <span>🗓️ {fmtRange(report.stats.firstTs, report.stats.lastTs, intl)}</span> : null}
          <span>{t("reportsBy", { name: loc(persona.name) })}</span>
        </div>
      </div>
      <button
        type="button"
        onClick={onDelete}
        aria-label={`${t("reportsDelete")}: ${report.report?.title || report.groupName}`}
        className="relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-line-soft bg-surface text-lg transition-colors hover:border-line hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ember/40"
      >
        <span aria-hidden>🗑️</span>
      </button>
    </article>
  );
}

function Empty() {
  const t = useT(reportDict);
  return (
    <div className="mt-10 flex flex-col items-center rounded-[2rem] border-2 border-dashed border-line-soft px-6 py-14 text-center">
      <div aria-hidden className="grid h-24 w-24 -rotate-6 place-items-center rounded-[1.75rem] border-2 border-line bg-sun text-5xl shadow-pop rtl:rotate-6 rtl:shadow-[-4px_4px_0_0_var(--shadow)]">
        📭
      </div>
      <h2 className="mt-7 text-2xl font-black">{t("reportsEmptyTitle")}</h2>
      <p className="mt-2 max-w-sm text-ink-2 text-pretty">{t("reportsEmptyBody")}</p>
      <div className="mt-7 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
        <ButtonLink href="/analyze" size="lg">
          {t("reportsEmptyCta")} <span aria-hidden>🔥</span>
        </ButtonLink>
        <ButtonLink href="/report/demo" variant="secondary" size="lg">
          {t("reportsDemo")}
        </ButtonLink>
      </div>
    </div>
  );
}
