"use client";

import { useEffect, useEffectEvent, useId, useRef, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { useT } from "@/lib/i18n";
import { commonDict } from "@/lib/i18n/dict/common";
import { IconClose } from "./icons";
import { useIsClient } from "./hooks";
import "./motion.css";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Stack of open sheets so Esc / Tab only act on the top-most one. */
const stack: string[] = [];


/**
 * Accessible modal: bottom sheet on phones, centered dialog from `sm` up.
 * Focus is trapped inside, Esc and backdrop click close it, focus returns to the opener.
 */
export function Sheet({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  icon,
  initialFocusRef,
  className = "",
  bodyClassName = "",
  dismissible = true,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  /** Sticky footer (actions). */
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  /** Optional emoji / icon shown before the title. */
  icon?: ReactNode;
  initialFocusRef?: RefObject<HTMLElement | null>;
  className?: string;
  bodyClassName?: string;
  /** When false, Esc and backdrop clicks do nothing (use for blocking confirmations). */
  dismissible?: boolean;
}) {
  const t = useT(commonDict);
  const isClient = useIsClient();
  const id = useId();
  const titleId = `${id}-title`;
  const descId = `${id}-desc`;
  const panelRef = useRef<HTMLDivElement>(null);

  // Keep rendering while the closing animation plays.
  const [rendered, setRendered] = useState(open);
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setRendered(true);
  }
  const closing = rendered && !open;

  useEffect(() => {
    if (!closing) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(() => setRendered(false), reduce ? 0 : 180);
    return () => window.clearTimeout(timer);
  }, [closing]);

  const requestClose = useEffectEvent(() => {
    if (dismissible) onClose();
  });

  const focusInitial = useEffectEvent(() => {
    const target = initialFocusRef?.current ?? panelRef.current;
    target?.focus({ preventScroll: true });
  });

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (!panel) return;
    const opener = document.activeElement as HTMLElement | null;
    stack.push(id);
    focusInitial();

    const onKey = (e: KeyboardEvent) => {
      if (stack[stack.length - 1] !== id) return;
      if (e.key === "Escape") {
        e.preventDefault();
        requestClose();
        return;
      }
      if (e.key !== "Tab") return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.getClientRects().length > 0 && !el.closest("[inert]"),
      );
      if (!items.length) {
        e.preventDefault();
        panel.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === panel || !panel.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !panel.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);

    const root = document.documentElement;
    const prevOverflow = root.style.overflow;
    root.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      const i = stack.lastIndexOf(id);
      if (i >= 0) stack.splice(i, 1);
      if (!stack.length) root.style.overflow = prevOverflow;
      if (opener && document.contains(opener)) opener.focus({ preventScroll: true });
    };
  }, [open, id]);

  if (!isClient || !rendered) return null;

  const width = { sm: "sm:max-w-md", md: "sm:max-w-lg", lg: "sm:max-w-2xl", xl: "sm:max-w-4xl" }[size];

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-6">
      <div
        aria-hidden
        data-closing={closing || undefined}
        className="cr-sheet-backdrop absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        onClick={() => {
          if (dismissible) onClose();
        }}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        data-closing={closing || undefined}
        className={`cr-sheet-panel relative flex max-h-[min(92dvh,52rem)] w-full flex-col rounded-t-[1.75rem] border-2 border-b-0 border-line bg-surface text-ink shadow-pop-lg outline-none sm:rounded-[1.75rem] sm:border-b-2 rtl:shadow-[-6px_6px_0_0_var(--shadow)] ${width} ${className}`}
      >
        <div aria-hidden className="mx-auto mt-2.5 h-1.5 w-11 shrink-0 rounded-full bg-line-soft sm:hidden" />
        <div className="flex shrink-0 items-start gap-3 px-5 pb-3 pt-3 sm:px-6 sm:pt-5">
          {icon && (
            <span aria-hidden className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-2xl border-2 border-line bg-surface-2 text-xl">
              {icon}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-xl font-extrabold leading-tight text-balance sm:text-2xl">
              {title}
            </h2>
            {description && (
              <p id={descId} className="mt-1 text-sm text-ink-2 text-pretty">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("close")}
            className="-me-1.5 -mt-0.5 grid size-10 shrink-0 place-items-center rounded-full text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ember/40"
          >
            <IconClose size={22} />
          </button>
        </div>
        <div className={`min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-6 ${bodyClassName}`}>{children}</div>
        {footer && (
          <div className="shrink-0 border-t-2 border-line-soft px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6">{footer}</div>
        )}
      </div>
    </div>,
    document.body,
  );
}
