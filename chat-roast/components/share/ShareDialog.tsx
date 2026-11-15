"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { toast } from "@/components/ui/Toast";
import { useT } from "@/lib/i18n";
import { reportDict } from "@/lib/i18n/dict/report";
import { useReport } from "@/components/report/context";
import { CARD_H, CARD_W, GroupShareCard, MemberShareCard, useCardStrings } from "./ShareCards";
import { canShareFiles, cardFileName, copyText, downloadBlob, renderCardPng } from "./exportCard";
import { buildShareText } from "./shareText";
import type { ShareTarget } from "./ShareProvider";

interface Rendered {
  key: string;
  blob: Blob | null;
  url: string | null;
  error: boolean;
}

export function ShareDialog({ target, onClose }: { target: ShareTarget | null; onClose: () => void }) {
  const t = useT(reportDict);
  const { saved, member } = useReport();
  const { cardLocale } = useCardStrings();
  const cardRef = useRef<HTMLDivElement>(null);
  const [attempt, setAttempt] = useState(0);
  const [rendered, setRendered] = useState<Rendered | null>(null);
  const [busy, setBusy] = useState(false);

  const m = target?.kind === "member" ? member(target.id) : undefined;
  const key = target ? `${target.kind}:${target.kind === "member" ? target.id : ""}:${attempt}` : "";
  const current = rendered && rendered.key === key ? rendered : null;
  const baseName = target?.kind === "member" ? `${saved.groupName}-${m?.name ?? ""}` : saved.groupName || saved.report.title;
  const file = useMemo(() => (current?.blob ? new File([current.blob], cardFileName(baseName), { type: "image/png" }) : null), [current, baseName]);
  const shareable = file ? canShareFiles(file) : false;

  useEffect(() => {
    if (!target) return;
    let cancelled = false;
    let url: string | null = null;
    // two frames: let the off-screen card mount + lay out
    const raf = requestAnimationFrame(() =>
      requestAnimationFrame(async () => {
        const node = cardRef.current;
        if (!node || cancelled) return;
        try {
          const blob = await renderCardPng(node.firstElementChild as HTMLElement);
          if (cancelled) return;
          url = URL.createObjectURL(blob);
          setRendered({ key, blob, url, error: false });
        } catch (err) {
          console.error("[share] card render failed", err);
          if (!cancelled) setRendered({ key, blob: null, url: null, error: true });
        }
      }),
    );
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      if (url) URL.revokeObjectURL(url);
    };
  }, [target, key]);

  const text = () => buildShareText(saved, cardLocale, target?.kind === "member" ? target.id : undefined);

  const onShare = async () => {
    if (!file) return;
    setBusy(true);
    try {
      await navigator.share({ files: [file], text: text() });
    } catch (err) {
      if ((err as DOMException)?.name !== "AbortError") downloadBlob(file, file.name);
    } finally {
      setBusy(false);
    }
  };
  const onDownload = () => {
    if (!file) return;
    downloadBlob(file, file.name);
    toast(t("shareDone"), { tone: "success" });
  };
  const onCopy = async () => {
    const ok = await copyText(text());
    toast(ok ? t("shareCopied") : t("shareFailed"), { tone: ok ? "success" : "error" });
  };

  const title = target?.kind === "member" && m ? t("shareMemberTitle", { name: m.name }) : t("sharePreviewTitle");

  return (
    <>
      {/* Off-screen render target (real 1080×1350 px). */}
      {target && (
        <div aria-hidden ref={cardRef} className="pointer-events-none fixed top-0" style={{ left: -20000, width: CARD_W, height: CARD_H }}>
          {target.kind === "group" ? <GroupShareCard /> : m ? <MemberShareCard member={m} /> : null}
        </div>
      )}

      <Sheet
        open={!!target}
        onClose={onClose}
        title={title}
        icon="📤"
        size="md"
        footer={
          <div className="grid gap-2.5">
            <div className="grid grid-cols-2 gap-2.5">
              {shareable ? (
                <Button onClick={onShare} disabled={!file || busy} className="whitespace-nowrap !px-3">
                  <span aria-hidden>📲</span>
                  {t("shareNative")}
                </Button>
              ) : (
                <Button onClick={onDownload} disabled={!file} className="whitespace-nowrap !px-3">
                  <span aria-hidden>⬇️</span>
                  {t("shareDownload")}
                </Button>
              )}
              <Button variant="secondary" onClick={onCopy} className="whitespace-nowrap !px-3">
                <span aria-hidden>📋</span>
                {t("shareCopyText")}
              </Button>
            </div>
            {shareable && (
              <button type="button" onClick={onDownload} disabled={!file} className="justify-self-center rounded-full px-3 py-1 text-sm font-semibold text-ink-2 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ember/40">
                {t("shareDownload")}
              </button>
            )}
          </div>
        }
      >
        <div className="mx-auto w-full max-w-[22rem]">
          <div className="relative overflow-hidden rounded-2xl border-2 border-line bg-surface-2 shadow-pop rtl:shadow-[-4px_4px_0_0_var(--shadow)]" style={{ aspectRatio: `${CARD_W} / ${CARD_H}` }}>
            {current?.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={current.url} alt={title} className="h-full w-full object-cover" />
            ) : current?.error ? (
              <div className="grid h-full place-items-center p-6 text-center">
                <div>
                  <p className="font-semibold text-ink-2">{t("shareFailed")}</p>
                  <Button variant="secondary" size="sm" className="mt-4" onClick={() => setAttempt((a) => a + 1)}>
                    {t("retry")}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid h-full place-items-center">
                <div className="flex flex-col items-center gap-3 text-sm font-semibold text-ink-2">
                  <Spinner size={28} />
                  {t("sharePreparing")}
                </div>
              </div>
            )}
          </div>
        </div>
      </Sheet>
    </>
  );
}
