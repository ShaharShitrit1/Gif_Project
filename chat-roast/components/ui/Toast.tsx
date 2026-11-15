"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { IconCheck, IconAlert } from "./icons";
import "./motion.css";

/**
 * Fire-and-forget toasts: `toast("Copied!")`, `toast("Merged", { action: { label: "Undo", onClick } })`.
 * The toaster mounts itself on first use — nothing to add to the layout.
 */

export type ToastTone = "default" | "success" | "error";

interface ToastItem {
  id: number;
  message: ReactNode;
  tone: ToastTone;
  action?: { label: string; onClick: () => void };
}

let items: ToastItem[] = [];
let seq = 0;
let mounted = false;
const listeners = new Set<() => void>();
const timers = new Map<number, number>();

function emit() {
  for (const l of listeners) l();
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function dismissToast(id: number) {
  const t = timers.get(id);
  if (t) window.clearTimeout(t);
  timers.delete(id);
  items = items.filter((i) => i.id !== id);
  emit();
}

export function toast(
  message: ReactNode,
  opts: { tone?: ToastTone; action?: { label: string; onClick: () => void }; duration?: number } = {},
): number {
  if (typeof document === "undefined") return -1;
  if (!mounted) {
    mounted = true;
    const host = document.createElement("div");
    host.setAttribute("data-cr-toaster", "");
    document.body.appendChild(host);
    createRoot(host).render(<Toaster />);
  }
  const id = ++seq;
  items = [...items.slice(-2), { id, message, tone: opts.tone ?? "default", action: opts.action }];
  emit();
  const duration = opts.duration ?? (opts.action ? 6000 : 3200);
  timers.set(id, window.setTimeout(() => dismissToast(id), duration));
  return id;
}

const empty: ToastItem[] = [];

function Toaster() {
  const list = useSyncExternalStore(subscribe, () => items, () => empty);
  return (
    <div
      aria-live="polite"
      role="status"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[70] flex flex-col items-center gap-2 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
    >
      {list.map((item) => (
        <div
          key={item.id}
          className="cr-pop-in pointer-events-auto flex max-w-[min(28rem,100%)] items-center gap-2.5 rounded-full border-2 border-line bg-ink py-2 ps-3 pe-2 text-sm font-semibold text-paper shadow-pop rtl:shadow-[-4px_4px_0_0_var(--shadow)]"
        >
          {item.tone === "success" && <IconCheck size={18} className="text-mint" />}
          {item.tone === "error" && <IconAlert size={18} className="text-sun" />}
          <span className="min-w-0 flex-1 py-0.5 pe-1">{item.message}</span>
          {item.action && (
            <button
              type="button"
              onClick={() => {
                item.action?.onClick();
                dismissToast(item.id);
              }}
              className="shrink-0 rounded-full bg-paper/15 px-3 py-1 font-bold text-sun transition-colors hover:bg-paper/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sun"
            >
              {item.action.label}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
