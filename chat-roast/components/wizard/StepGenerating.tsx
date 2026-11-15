"use client";

import { useEffect, useRef, useState } from "react";
import { LogoMark } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";
import { PersonaAvatar } from "@/components/ui/PersonaAvatar";
import { Sheet } from "@/components/ui/Sheet";
import { usePrefersReducedMotion } from "@/components/ui/hooks";
import { IconArrowBack, IconRefresh } from "@/components/ui/icons";
import { intlLocale, useLocale, useLocalized, useT } from "@/lib/i18n";
import { phaseLines, wizardDict } from "@/lib/i18n/dict/wizard";
import { PERSONAS } from "@/lib/personas";
import type { PersonaId } from "@/lib/types";
import { buildTeasers } from "./teasers";
import type { GenState } from "./Wizard";
import "@/components/ui/motion.css";

const LINE_MS = 4200;
const TEASER_MS = 5600;
const COUNT_MS = 5200;

/** Full-screen loading scene (and error / done states) for step 5. */
export function StepGenerating({
  personaId,
  gen,
  onRetry,
  onBack,
  onCancel,
  confirmLeave,
  onStay,
  onLeave,
}: {
  personaId: PersonaId;
  gen: GenState;
  onRetry: () => void;
  onBack: () => void;
  onCancel: () => void;
  confirmLeave: boolean;
  onStay: () => void;
  onLeave: () => void;
}) {
  const t = useT(wizardDict);
  const { locale } = useLocale();
  const localized = useLocalized();
  const il = intlLocale(locale);
  const nf = new Intl.NumberFormat(il);
  const reduced = usePrefersReducedMotion();
  const persona = PERSONAS[personaId];
  const headingRef = useRef<HTMLHeadingElement>(null);

  /* rotating persona line within the current phase */
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (gen.status !== "running") return;
    const id = window.setInterval(() => setTick((x) => x + 1), LINE_MS);
    return () => window.clearInterval(id);
  }, [gen.status]);
  const lines = localized(phaseLines)[personaId][gen.phase];
  const line = lines[tick % lines.length];

  /* rotating teasers from the real stats */
  const teasers = gen.stats ? buildTeasers(gen.stats, t, il) : [];
  const [teaserIdx, setTeaserIdx] = useState(0);
  useEffect(() => {
    if (gen.status !== "running" || teasers.length < 2) return;
    const id = window.setInterval(() => setTeaserIdx((x) => x + 1), TEASER_MS);
    return () => window.clearInterval(id);
  }, [gen.status, teasers.length]);
  const teaser = teasers.length ? teasers[teaserIdx % teasers.length] : null;

  /* "I've read N messages" counter */
  const [count, setCount] = useState(0);
  useEffect(() => {
    const total = gen.totalMessages;
    if (!total) return;
    if (reduced) {
      const id = requestAnimationFrame(() => setCount(total));
      return () => cancelAnimationFrame(id);
    }
    let raf = 0;
    const start = performance.now();
    const step = (now: number) => {
      const k = Math.min(1, (now - start) / COUNT_MS);
      const eased = 1 - Math.pow(1 - k, 3);
      setCount(Math.round(total * eased));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [gen.totalMessages, reduced]);

  /* gentle creep so the bar never looks frozen during long phases */
  const [now, setNow] = useState(0);
  const [phaseMark, setPhaseMark] = useState<{ phase: string; at: number }>({ phase: gen.phase, at: 0 });
  useEffect(() => {
    if (gen.status !== "running") return;
    const id = window.setInterval(() => setNow(Date.now()), 600);
    return () => window.clearInterval(id);
  }, [gen.status]);
  if (phaseMark.phase !== gen.phase) setPhaseMark({ phase: gen.phase, at: now });
  const sincePhase = phaseMark.at && now ? now - phaseMark.at : 0;
  const creep = gen.status === "running" ? 0.05 * (1 - Math.exp(-sincePhase / 25000)) : 0;
  const progress = gen.status === "done" ? 1 : Math.min(0.985, gen.progress + creep);
  const pct = Math.round(progress * 100);

  useEffect(() => {
    window.scrollTo({ top: 0 });
    headingRef.current?.focus({ preventScroll: true });
  }, [gen.status]);

  const error = gen.status === "error" ? gen.error : null;

  return (
    <main id="main" className="relative flex min-h-dvh flex-1 flex-col overflow-hidden bg-paper">
      {/* soft persona-colored glow */}
      <span
        aria-hidden
        className="pointer-events-none absolute start-1/2 top-[-10rem] size-[38rem] -translate-x-1/2 rounded-full opacity-[0.16] blur-3xl rtl:translate-x-1/2"
        style={{ background: persona.color.bg }}
      />

      <div className="relative mx-auto flex w-full max-w-xl items-center justify-between px-4 pt-4">
        <span className="inline-flex items-center gap-2 text-sm font-black" dir="ltr">
          <LogoMark size={26} />
          ChatRoast
        </span>
        {gen.status === "running" && (
          <Button variant="ghost" size="sm" onClick={onCancel}>
            {t("s5_cancel")}
          </Button>
        )}
      </div>

      <div className="relative mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center px-5 pb-10 pt-6 text-center">
        {error ? (
          <ErrorPanel code={error.code} retryAfter={error.retryAfter} personaId={personaId} onRetry={onRetry} onBack={onBack} headingRef={headingRef} />
        ) : (
          <>
            <div className="relative">
              <span
                aria-hidden
                className="absolute inset-[-14px] rounded-full border-[3px] border-dashed opacity-50"
                style={{ borderColor: persona.color.bg, animation: reduced ? undefined : "cr-spin 14s linear infinite" }}
              />
              <div className={gen.status === "done" ? "" : "cr-bob"}>
                <PersonaAvatar id={personaId} size={148} className="shadow-pop-lg rtl:shadow-[-6px_6px_0_0_var(--shadow)]" />
              </div>
              <span aria-hidden className="cr-flicker absolute -end-3 -top-1 text-3xl">
                {gen.status === "done" ? "🎉" : persona.emoji}
              </span>
            </div>

            <h1
              ref={headingRef}
              tabIndex={-1}
              aria-live="polite"
              className="mt-9 min-h-[4.5rem] max-w-md text-2xl font-black leading-tight text-balance outline-none sm:text-3xl"
            >
              <span key={gen.status === "done" ? "done" : `${gen.phase}-${tick % lines.length}`} className="cr-slide-up inline-block">
                {gen.status === "done" ? t("s5_done") : line}
              </span>
            </h1>

            <div className="mt-6 w-full max-w-sm">
              <div
                role="progressbar"
                aria-label={t("s5_progress_aria")}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={pct}
                className="relative h-5 overflow-hidden rounded-full border-2 border-line bg-surface"
              >
                <span
                  className="absolute inset-y-0 start-0 rounded-full bg-ember transition-[width] duration-700 ease-out"
                  style={{ width: `${Math.max(4, pct)}%` }}
                >
                  <span className="cr-shimmer absolute inset-0 rounded-full" />
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs font-bold text-ink-2 tabular-nums">
                <span>{gen.totalMessages ? t("s5_counter", { n: nf.format(count), total: nf.format(gen.totalMessages) }) : " "}</span>
                <span>{pct}%</span>
              </div>
            </div>

            {teaser && gen.status === "running" && (
              <div className="mt-10 w-full max-w-md">
                <p className="text-xs font-black uppercase tracking-[0.12em] text-ember rtl:text-sm rtl:tracking-normal">{t("s5_teaser_kicker")}</p>
                <div
                  key={teaser.key}
                  className="cr-pop-in mt-3 flex items-start gap-3 rounded-3xl border-2 border-line bg-surface p-4 text-start shadow-pop rtl:shadow-[-4px_4px_0_0_var(--shadow)]"
                >
                  <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-2xl border-2 border-line bg-sun text-2xl">
                    {teaser.emoji}
                  </span>
                  <p className="min-w-0 pt-0.5 font-semibold leading-snug" dir="auto">
                    {teaser.text}
                  </p>
                </div>
              </div>
            )}

            {gen.status === "running" && <p className="mt-8 max-w-xs text-sm text-ink-3">{t("s5_eta")}</p>}
          </>
        )}
      </div>

      <Sheet
        open={confirmLeave}
        onClose={onStay}
        title={t("s5_leave_title")}
        description={t("s5_leave_body")}
        icon="✋"
        size="sm"
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={onLeave}>
              {t("s5_leave_go")}
            </Button>
            <Button onClick={onStay}>{t("s5_leave_stay")}</Button>
          </div>
        }
      />
    </main>
  );
}

const KNOWN = ["rate_limited", "overloaded", "too_large", "refused", "bad_request", "server_error", "network", "unauthorized", "client"] as const;
type Known = (typeof KNOWN)[number];

function ErrorPanel({
  code,
  retryAfter,
  personaId,
  onRetry,
  onBack,
  headingRef,
}: {
  code: string;
  retryAfter?: number;
  personaId: PersonaId;
  onRetry: () => void;
  onBack: () => void;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
}) {
  const t = useT(wizardDict);
  const k: Known = (KNOWN as readonly string[]).includes(code) ? (code as Known) : "server_error";

  // Countdown before a retry makes sense (rate limits).
  const initialWait = k === "rate_limited" ? Math.min(90, Math.max(5, retryAfter ?? 20)) : 0;
  const [left, setLeft] = useState(initialWait);
  useEffect(() => {
    if (left <= 0) return;
    const id = window.setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => window.clearTimeout(id);
  }, [left]);

  const [code_, setCode] = useState(() => {
    try {
      return localStorage.getItem("cr_access_code") ?? "";
    } catch {
      return "";
    }
  });

  const retry = () => {
    if (k === "unauthorized") {
      try {
        localStorage.setItem("cr_access_code", code_.trim());
      } catch {}
    }
    onRetry();
  };

  return (
    <div className="cr-pop-in w-full max-w-md" role="alert">
      <div className="relative mx-auto w-fit">
        <PersonaAvatar id={personaId} size={104} className="grayscale-[35%]" />
        <span aria-hidden className="absolute -bottom-1 -end-2 grid size-10 place-items-center rounded-full border-2 border-line bg-surface text-xl">
          {k === "network" ? "📡" : k === "rate_limited" || k === "overloaded" ? "⏳" : k === "unauthorized" ? "🔑" : "😵"}
        </span>
      </div>
      <h1 ref={headingRef} tabIndex={-1} className="mt-6 text-2xl font-black leading-tight text-balance outline-none sm:text-3xl">
        {t(`g_err_${k}_title`)}
      </h1>
      <p className="mt-3 text-ink-2 text-pretty">{t(`g_err_${k}_body`)}</p>
      <p className="mt-2 text-sm font-semibold text-sea">{t("g_err_kept")}</p>

      {k === "unauthorized" && (
        <div className="mt-5 text-start">
          <label htmlFor="access-code" className="text-sm font-extrabold">
            {t("g_err_access_label")}
          </label>
          <input
            id="access-code"
            type="password"
            autoComplete="off"
            value={code_}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && code_.trim()) retry();
            }}
            className="mt-1.5 h-12 w-full rounded-2xl border-2 border-line bg-surface px-4 font-bold text-ink focus:border-ember focus:outline-none focus-visible:ring-4 focus-visible:ring-ember/30"
          />
        </div>
      )}

      <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Button size="lg" onClick={retry} disabled={left > 0 || (k === "unauthorized" && !code_.trim())}>
          <IconRefresh size={18} />
          {k === "unauthorized" ? t("g_err_access_save") : t("g_err_retry")}
        </Button>
        <Button size="lg" variant="secondary" onClick={onBack}>
          <IconArrowBack size={18} />
          {t("g_err_back")}
        </Button>
      </div>
      {left > 0 && (
        <p className="mt-3 text-sm font-semibold text-ink-3 tabular-nums" aria-live="polite">
          {t("g_err_wait", { s: left })}
        </p>
      )}
    </div>
  );
}
