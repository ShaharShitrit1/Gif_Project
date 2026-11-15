"use client";

import { useEffect, useRef, useState, type DragEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { toast } from "@/components/ui/Toast";
import { useMediaQuery } from "@/components/ui/hooks";
import { IconAlert, IconArrowForward, IconCheck, IconFile, IconLock, IconPhone, IconRefresh, IconSparkles, IconUpload } from "@/components/ui/icons";
import { intlLocale, useLocale, useT } from "@/lib/i18n";
import { wizardDict } from "@/lib/i18n/dict/wizard";
import { parseChatFile } from "@/lib/parser";
import { ChatParseError, type ParseErrorCode } from "@/lib/types";
import { ExportGuide, type GuidePlatform } from "./ExportGuide";
import { PrivacySheet } from "./PrivacySheet";
import type { ChatSource } from "./Wizard";
import { WizardFrame } from "./WizardFrame";

const ACCEPT = ".txt,.zip,text/plain,application/zip";
const MIN_SPIN_MS = 450;

type UploadError = { code: ParseErrorCode | "unknown"; details: Record<string, string | number> };

export function StepUpload({
  source,
  onLoaded,
  onContinue,
  onBack,
}: {
  source: ChatSource | null;
  onLoaded: (s: ChatSource) => void;
  onContinue: () => void;
  onBack: () => void;
}) {
  const t = useT(wizardDict);
  const { locale } = useLocale();
  const nf = new Intl.NumberFormat(intlLocale(locale));
  const touch = useMediaQuery("(hover: none)");

  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<{ name: string } | null>(null);
  const [error, setError] = useState<UploadError | null>(null);
  const [dragging, setDragging] = useState(false);
  const [guide, setGuide] = useState<GuidePlatform | null>(null);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);

  const handleFile = async (file: File, opts: { demo?: boolean; displayName?: string } = {}) => {
    setError(null);
    setBusy({ name: opts.displayName ?? file.name });
    const started = Date.now();
    try {
      const chat = await parseChatFile(file);
      const wait = MIN_SPIN_MS - (Date.now() - started);
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      setBusy(null);
      onLoaded({ chat, fileName: opts.displayName ?? file.name, demo: Boolean(opts.demo) });
    } catch (err) {
      setBusy(null);
      if (err instanceof ChatParseError) setError({ code: err.code, details: err.details });
      else {
        console.error(err);
        setError({ code: "unknown", details: {} });
      }
      requestAnimationFrame(() => errorRef.current?.focus());
    }
  };

  const tryDemo = async () => {
    setError(null);
    setBusy({ name: t("s2_demo_name") });
    try {
      const res = await fetch("/samples/demo-chat.txt");
      if (!res.ok) throw new Error(String(res.status));
      const blob = await res.blob();
      await handleFile(new File([blob], "demo-chat.txt", { type: "text/plain" }), { demo: true, displayName: t("s2_demo_name") });
    } catch {
      setBusy(null);
      toast(t("s2_demo_failed"), { tone: "error" });
    }
  };

  const handleFileRef = useRef(handleFile);
  useEffect(() => {
    handleFileRef.current = handleFile;
  });

  // Accept a drop anywhere on the page, and never let the browser navigate to the file.
  useEffect(() => {
    let depth = 0;
    const hasFiles = (e: globalThis.DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes("Files");
    const onEnter = (e: globalThis.DragEvent) => {
      if (!hasFiles(e)) return;
      depth++;
      setDragging(true);
    };
    const onLeave = (e: globalThis.DragEvent) => {
      if (!hasFiles(e)) return;
      depth = Math.max(0, depth - 1);
      if (depth === 0) setDragging(false);
    };
    const onOver = (e: globalThis.DragEvent) => {
      if (hasFiles(e)) e.preventDefault();
    };
    const onDrop = (e: globalThis.DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth = 0;
      setDragging(false);
      const file = e.dataTransfer?.files?.[0];
      if (file) void handleFileRef.current(file);
    };
    window.addEventListener("dragenter", onEnter);
    window.addEventListener("dragleave", onLeave);
    window.addEventListener("dragover", onOver);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragenter", onEnter);
      window.removeEventListener("dragleave", onLeave);
      window.removeEventListener("dragover", onOver);
      window.removeEventListener("drop", onDrop);
    };
  }, []);

  const errorCopy = error ? describeError(error, t, nf) : null;

  return (
    <WizardFrame
      step={2}
      title={t("s2_title")}
      sub={t("s2_sub")}
      onBack={onBack}
      footer={
        source && !busy ? (
          <Button size="lg" className="w-full" onClick={onContinue}>
            {t("continue")}
            <IconArrowForward size={20} />
          </Button>
        ) : undefined
      }
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) void handleFile(f);
        }}
      />

      {errorCopy && !busy && (
        <div
          ref={errorRef}
          tabIndex={-1}
          role="alert"
          className="cr-pop-in mb-5 rounded-3xl border-2 border-line bg-surface p-5 shadow-pop outline-none rtl:shadow-[-4px_4px_0_0_var(--shadow)]"
        >
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-2xl border-2 border-line bg-sun text-[#17120e]">
              <IconAlert size={20} />
            </span>
            <div className="min-w-0">
              <h2 className="text-lg font-extrabold leading-snug">{errorCopy.title}</h2>
              <p className="mt-1 text-ink-2">{errorCopy.body}</p>
            </div>
          </div>
          <div className="mt-4 rounded-2xl bg-surface-2 p-3.5">
            <p className="text-xs font-black uppercase tracking-wide text-ember rtl:tracking-normal">{t("s2_err_fix")}</p>
            <p className="mt-1 font-medium">{errorCopy.fix}</p>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm" onClick={() => inputRef.current?.click()}>
              <IconRefresh size={16} />
              {t("s2_err_choose")}
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setGuide("ios")}>
              {t("s2_err_guide")}
            </Button>
          </div>
        </div>
      )}

      {source && !busy ? (
        <div className="cr-pop-in flex items-center gap-4 rounded-3xl border-2 border-line bg-surface p-4 shadow-pop rtl:shadow-[-4px_4px_0_0_var(--shadow)]">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl border-2 border-line bg-mint text-[#0b3b24]">
            <IconCheck size={24} strokeWidth={3} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-extrabold">{t("s2_loaded_title")}</p>
            <p className="truncate text-sm text-ink-2">
              <span dir="auto">{source.fileName}</span> ·{" "}
              {t("s2_loaded_meta", { people: nf.format(source.chat.participants.length), messages: nf.format(source.chat.messages.length) })}
            </p>
          </div>
          <Button size="sm" variant="ghost" onClick={() => inputRef.current?.click()} className="shrink-0">
            {t("s2_replace")}
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e: DragEvent) => e.preventDefault()}
          disabled={Boolean(busy)}
          aria-label={t("s2_drop_aria")}
          aria-busy={Boolean(busy) || undefined}
          className={`group relative flex min-h-[17rem] w-full flex-col items-center justify-center gap-3 rounded-[1.75rem] border-[3px] border-dashed px-6 py-10 text-center transition-all duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ember/40 disabled:cursor-wait ${
            dragging ? "scale-[1.01] border-ember bg-ember/10" : "border-line/70 bg-surface hover:border-line hover:bg-surface-2/60"
          }`}
        >
          {busy ? (
            <>
              <Spinner size={44} className="text-ember" />
              <span className="text-lg font-extrabold" aria-live="polite">
                {t("s2_parsing", { name: busy.name })}
              </span>
              <span className="max-w-xs text-sm text-ink-2">{t("s2_parsing_sub")}</span>
            </>
          ) : (
            <>
              <span
                aria-hidden
                className={`relative grid size-20 place-items-center rounded-3xl border-2 border-line bg-sun text-[#17120e] shadow-pop-sm transition-transform duration-200 rtl:shadow-[-2px_2px_0_0_var(--shadow)] ${dragging ? "-translate-y-2 rotate-6" : "group-hover:-translate-y-1 group-hover:-rotate-3"}`}
              >
                {dragging ? <IconFile size={36} /> : <IconUpload size={36} />}
              </span>
              <span className="text-xl font-black sm:text-2xl">
                {dragging ? t("s2_drop_active") : touch ? t("s2_drop_title_touch") : t("s2_drop_title")}
              </span>
              {!dragging && <span className="text-ink-2">{touch ? t("s2_drop_or_touch") : t("s2_drop_or")}</span>}
              <span className="mt-1 rounded-full border-2 border-line-soft bg-surface-2 px-3 py-1 text-xs font-bold text-ink-2" dir="auto">
                {t("s2_drop_hint")}
              </span>
            </>
          )}
        </button>
      )}

      <p className="mt-4 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-ink-2">
        <IconLock size={16} className="text-sea" />
        <span>{t("s2_privacy")}</span>
        <button
          type="button"
          onClick={() => setPrivacyOpen(true)}
          className="rounded font-bold text-ink underline decoration-sea decoration-2 underline-offset-4 hover:decoration-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ember/40"
        >
          {t("s2_privacy_more")}
        </button>
      </p>

      <div className="mt-8 rounded-3xl border-2 border-line-soft bg-surface-2/70 p-5">
        <div className="flex items-start gap-3">
          <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-2xl border-2 border-line bg-sky text-[#17120e]">
            <IconPhone size={22} />
          </span>
          <div>
            <h2 className="text-lg font-extrabold">{t("s2_no_file_title")}</h2>
            <p className="text-ink-2">{t("s2_no_file_body")}</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button variant="secondary" size="sm" onClick={() => setGuide("ios")} className="h-11">
            {t("s2_guide_iphone")}
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setGuide("android")} className="h-11">
            {t("s2_guide_android")}
          </Button>
        </div>
      </div>

      {!source && (
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => void tryDemo()}
            disabled={Boolean(busy)}
            className="inline-flex items-center gap-2 rounded-full px-4 py-2 font-bold text-ink-2 underline decoration-dotted decoration-2 underline-offset-4 transition-colors hover:text-ink disabled:opacity-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ember/40"
          >
            <IconSparkles size={18} className="text-ember" />
            {t("s2_demo")}
          </button>
        </div>
      )}

      <ExportGuide
        open={guide !== null}
        platform={guide ?? "ios"}
        onClose={() => setGuide(null)}
        onDone={() => {
          setGuide(null);
          window.setTimeout(() => inputRef.current?.click(), 250);
        }}
      />
      <PrivacySheet open={privacyOpen} onClose={() => setPrivacyOpen(false)} />
    </WizardFrame>
  );
}

function describeError(
  err: UploadError,
  t: ReturnType<typeof useT<typeof wizardDict.he>>,
  nf: Intl.NumberFormat,
): { title: string; body: string; fix: string } {
  const d = err.details;
  switch (err.code) {
    case "wrong_extension":
      return { title: t("err_wrong_extension_title"), body: t("err_wrong_extension_body", { ext: d.ext ? String(d.ext) : undefined }), fix: t("err_wrong_extension_fix") };
    case "file_too_large": {
      const mb = typeof d.size === "number" ? `${nf.format(Math.round(d.size / 1024 / 1024))}MB` : "200MB+";
      return { title: t("err_file_too_large_title"), body: t("err_file_too_large_body", { size: mb }), fix: t("err_file_too_large_fix") };
    }
    case "too_few_messages":
      return {
        title: t("err_too_few_messages_title"),
        body: t("err_too_few_messages_body", { count: nf.format(Number(d.messageCount ?? 0)), min: nf.format(Number(d.min ?? 50)) }),
        fix: t("err_too_few_messages_fix"),
      };
    case "single_sender_chat":
      return { title: t("err_single_sender_chat_title"), body: t("err_single_sender_chat_body", { name: String(d.name ?? "") }), fix: t("err_single_sender_chat_fix") };
    case "zip_corrupt":
    case "archive_without_transcript":
    case "encrypted_backup":
    case "not_chat_export":
    case "empty_chat_export":
      return { title: t(`err_${err.code}_title`), body: t(`err_${err.code}_body`), fix: t(`err_${err.code}_fix`) };
    default:
      return { title: t("err_unknown_title"), body: t("err_unknown_body"), fix: t("err_unknown_fix") };
  }
}
