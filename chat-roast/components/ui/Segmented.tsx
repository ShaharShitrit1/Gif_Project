"use client";

import { useRef, type KeyboardEvent, type ReactNode } from "react";

export interface SegmentedOption<T extends string | number> {
  value: T;
  label: ReactNode;
  /** Accessible name when `label` is visual only. */
  ariaLabel?: string;
  disabled?: boolean;
}

/**
 * Segmented control (radiogroup). Arrow keys move the selection and follow the
 * reading direction, Home/End jump to the ends.
 */
export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  ariaLabel,
  size = "md",
  className = "",
  fullWidth = true,
}: {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (v: T) => void;
  ariaLabel: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  fullWidth?: boolean;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const enabled = options.map((o, i) => (o.disabled ? -1 : i)).filter((i) => i >= 0);
  const currentIndex = options.findIndex((o) => o.value === value);

  const move = (to: number) => {
    const opt = options[to];
    if (!opt || opt.disabled) return;
    onChange(opt.value);
    refs.current[to]?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const rtl = getComputedStyle(e.currentTarget).direction === "rtl";
    const pos = enabled.indexOf(currentIndex);
    let next: number | null = null;
    if (e.key === "ArrowRight") next = enabled[(pos + (rtl ? -1 : 1) + enabled.length) % enabled.length];
    else if (e.key === "ArrowLeft") next = enabled[(pos + (rtl ? 1 : -1) + enabled.length) % enabled.length];
    else if (e.key === "ArrowDown") next = enabled[(pos + 1) % enabled.length];
    else if (e.key === "ArrowUp") next = enabled[(pos - 1 + enabled.length) % enabled.length];
    else if (e.key === "Home") next = enabled[0];
    else if (e.key === "End") next = enabled[enabled.length - 1];
    if (next !== null && next !== undefined) {
      e.preventDefault();
      move(next);
    }
  };

  const h = { sm: "min-h-9 text-sm", md: "min-h-11 text-sm sm:text-base", lg: "min-h-14 text-base" }[size];

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
      className={`${fullWidth ? "flex" : "inline-flex"} gap-1 rounded-full border-2 border-line bg-surface-2 p-1 ${className}`}
    >
      {options.map((o, i) => {
        const selected = o.value === value;
        return (
          <button
            key={String(o.value)}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={o.ariaLabel}
            disabled={o.disabled}
            tabIndex={selected || (currentIndex < 0 && i === enabled[0]) ? 0 : -1}
            onClick={() => onChange(o.value)}
            className={`${fullWidth ? "flex-1" : ""} ${h} inline-flex items-center justify-center gap-1.5 rounded-full px-3 font-bold leading-tight transition-all duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ember/40 disabled:opacity-40 ${
              selected ? "border-2 border-line bg-surface text-ink shadow-pop-sm rtl:shadow-[-2px_2px_0_0_var(--shadow)]" : "border-2 border-transparent text-ink-2 hover:text-ink"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
