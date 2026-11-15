"use client";

import { useCallback, useEffect, useState } from "react";
import { SiteHeader } from "@/components/ui/SiteHeader";
import { SiteFooter } from "@/components/ui/SiteFooter";
import { getReport } from "@/lib/storage/reports";
import type { SavedReport } from "@/lib/types";
import { ReportNotFound, ReportSkeleton } from "./ReportStates";
import { ReportView } from "./ReportView";

type State = { id: string; status: "loading" } | { id: string; status: "ready"; saved: SavedReport } | { id: string; status: "missing" } | { id: string; status: "error" };

/** Client-side loader for /report/[id] (reports live only in this browser; "demo" is bundled). */
export function ReportScreen({ id }: { id: string }) {
  const [state, setState] = useState<State>({ id, status: "loading" });
  const [attempt, setAttempt] = useState(0);

  const load = useCallback(async (): Promise<State> => {
    try {
      if (id === "demo") {
        const { loadDemo } = await import("@/lib/demo");
        return { id, status: "ready", saved: await loadDemo() };
      }
      const saved = await getReport(id);
      return saved ? { id, status: "ready", saved } : { id, status: "missing" };
    } catch (err) {
      console.error("[report] failed to load", err);
      return { id, status: "error" };
    }
  }, [id]);

  useEffect(() => {
    let alive = true;
    load().then((s) => {
      if (alive) setState(s);
    });
    return () => {
      alive = false;
    };
  }, [load, attempt]);

  // A new id renders the skeleton until its own load resolves.
  const current: State = state.id === id ? state : { id, status: "loading" };

  const readyTitle = current.status === "ready" ? current.saved.report.title : null;
  useEffect(() => {
    if (readyTitle) document.title = `${readyTitle} · ChatRoast`;
  }, [readyTitle]);

  return (
    <>
      <SiteHeader />
      <main id="main" className="flex flex-1 flex-col">
        {current.status === "loading" && <ReportSkeleton />}
        {current.status === "missing" && <ReportNotFound />}
        {current.status === "error" && <ReportNotFound error onRetry={() => setAttempt((a) => a + 1)} />}
        {current.status === "ready" && <ReportView saved={current.saved} />}
      </main>
      <SiteFooter />
    </>
  );
}
