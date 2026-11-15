"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ButtonLink, Button } from "@/components/ui/Button";
import { useT } from "@/lib/i18n";
import { reportDict } from "@/lib/i18n/dict/report";
import { deleteReport } from "@/lib/storage/reports";
import type { SavedReport } from "@/lib/types";
import { NumbersDashboard } from "@/components/stats/NumbersDashboard";
import { ShareProvider } from "@/components/share/ShareProvider";
import { FloatingShare, ShareBar } from "@/components/share/ShareBar";
import { PaletteStyle, ReportProvider } from "./context";
import { Hero } from "./Hero";
import { Verdict } from "./Verdict";
import { Scores } from "./Scores";
import { Members } from "./Members";
import { Awards } from "./Awards";
import { Closing, Dynamics, InsideJokes, TurningPoint } from "./Story";
import { AskPanel } from "./AskPanel";
import { DemoRibbon } from "./ReportStates";
import { ConfirmDialog } from "./ui";

/** The whole report page body for a loaded SavedReport. */
export function ReportView({ saved }: { saved: SavedReport }) {
  return (
    <ReportProvider saved={saved}>
      <ShareProvider>
        <PaletteStyle />
        <div className="cr-pal flex flex-1 flex-col">
          {saved.demo && <DemoRibbon />}
          <Hero />
          <div className="mx-auto w-full max-w-5xl space-y-16 px-4 py-12 sm:space-y-20 sm:px-6 sm:py-16">
            <Verdict />
            <Scores scores={saved.report.scores} />
            <Members />
            <Awards />
            <Dynamics />
            <TurningPoint />
            <InsideJokes />
          </div>
          <NumbersDashboard index="08" />
          <div className="mx-auto w-full max-w-5xl space-y-16 px-4 py-12 sm:space-y-20 sm:px-6 sm:py-16">
            <Closing />
            <AskPanel index="10" />
            <ShareBar index="11" />
            <ReportActions saved={saved} />
          </div>
          <FloatingShare />
        </div>
      </ShareProvider>
    </ReportProvider>
  );
}

function ReportActions({ saved }: { saved: SavedReport }) {
  const t = useT(reportDict);
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const onDelete = async () => {
    setBusy(true);
    await deleteReport(saved.id);
    router.push("/reports");
  };
  return (
    <footer className="border-t-2 border-dashed border-line-soft pt-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <ButtonLink href="/analyze" size="lg">
          <span aria-hidden>🔥</span>
          {t("newReport")}
        </ButtonLink>
        <div className="flex flex-col gap-3 sm:flex-row">
          <ButtonLink href="/reports" variant="secondary">
            {t("myReports")}
          </ButtonLink>
          {!saved.demo && (
            <Button variant="ghost" onClick={() => setConfirm(true)} className="text-ink-2">
              <span aria-hidden>🗑️</span>
              {t("deleteReport")}
            </Button>
          )}
        </div>
      </div>
      <p className="mt-5 flex items-start gap-2 text-sm text-ink-3">
        <span aria-hidden>🔒</span>
        {saved.mock ? `${t("privacyNote")} ${t("mockNote")}` : t("privacyNote")}
      </p>
      <ConfirmDialog
        open={confirm}
        title={t("deleteConfirmTitle")}
        body={t("deleteConfirmBody")}
        confirmLabel={t("deleteConfirm")}
        cancelLabel={t("cancel")}
        onConfirm={onDelete}
        onCancel={() => setConfirm(false)}
        busy={busy}
      />
    </footer>
  );
}
