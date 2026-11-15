"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";

/* ------------------------------------------------------------------ */
/* Section heading — magazine style: number · rule · kicker, then title */
/* ------------------------------------------------------------------ */

export function SectionHeading({
  index,
  kicker,
  title,
  sub,
  id,
  accent = "var(--ember)",
}: {
  index?: string;
  kicker: string;
  title: ReactNode;
  sub?: ReactNode;
  id?: string;
  accent?: string;
}) {
  return (
    <header className="mb-6">
      <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.18em] text-ink-2">
        {index && (
          <span className="grid h-7 min-w-7 place-items-center rounded-full border-2 border-line px-1 text-[0.7rem] tracking-normal text-ink tabular-nums" style={{ background: accent }}>
            {index}
          </span>
        )}
        <span className="shrink-0">{kicker}</span>
        <span aria-hidden className="h-[2px] flex-1 rounded-full bg-line" />
      </div>
      <h2 id={id} className="mt-3 scroll-mt-24 text-[2rem] leading-[1.05] font-black tracking-tight text-balance sm:text-[2.5rem]">
        {title}
      </h2>
      {sub && <p className="mt-2 text-ink-2 text-pretty">{sub}</p>}
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Paragraphs from "\n\n"-separated text                               */
/* ------------------------------------------------------------------ */

export function splitParagraphs(text: string | undefined | null): string[] {
  return (text ?? "")
    .split(/\n\s*\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/* ------------------------------------------------------------------ */
/* In-view hook (for one-shot entrance animations)                      */
/* ------------------------------------------------------------------ */

export function useInView<T extends Element>(rootMargin = "0px 0px -10% 0px") {
  const ref = useRef<T | null>(null);
  // Reduced motion: nothing animates, so everything is "in view" from the start.
  const [inView, setInView] = useState(() => prefersReducedMotion() || typeof IntersectionObserver === "undefined");
  useEffect(() => {
    const el = ref.current;
    if (!el || inView) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true);
          io.disconnect();
        }
      },
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [inView, rootMargin]);
  return [ref, inView] as const;
}

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

/** Counts from 0 to `value` once `run` turns true. */
export function useCountUp(value: number, run: boolean, ms = 900): number {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!run) return;
    if (prefersReducedMotion()) {
      const id = requestAnimationFrame(() => setN(value));
      return () => cancelAnimationFrame(id);
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / ms);
      const eased = 1 - Math.pow(1 - k, 3);
      setN(Math.round(value * eased));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, run, ms]);
  return n;
}

/* ------------------------------------------------------------------ */
/* Confirm dialog (on top of the shared Sheet)                          */
/* ------------------------------------------------------------------ */

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  busy = false,
}: {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
}) {
  return (
    <Sheet
      open={open}
      onClose={onCancel}
      title={title}
      description={body}
      icon="🗑️"
      size="sm"
      footer={
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button variant="primary" onClick={onConfirm} disabled={busy}>
            {confirmLabel}
          </Button>
        </div>
      }
    />
  );
}

/* ------------------------------------------------------------------ */
/* Member avatar: emoji (or initial) in the member's color              */
/* ------------------------------------------------------------------ */

export function MemberBadge({ color, emoji, name, size = 44, className = "" }: { color: string; emoji?: string; name: string; size?: number; className?: string }) {
  const initial = Array.from(name.trim())[0] ?? "?";
  return (
    <span
      aria-hidden
      className={`inline-grid shrink-0 place-items-center rounded-full border-2 border-line font-black text-white ${className}`}
      style={{ width: size, height: size, background: color, fontSize: emoji ? size * 0.5 : size * 0.42 }}
    >
      {emoji || initial}
    </span>
  );
}

export function Dot({ color, className = "" }: { color: string; className?: string }) {
  return <span aria-hidden className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${className}`} style={{ background: color }} />;
}
