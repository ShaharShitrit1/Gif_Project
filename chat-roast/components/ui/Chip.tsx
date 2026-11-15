import type { ComponentProps, ReactNode } from "react";

export type ChipTone = "neutral" | "ember" | "sun" | "grape" | "sea" | "mint" | "sky" | "bubblegum" | "ink";

const tones: Record<ChipTone, string> = {
  neutral: "bg-surface-2 text-ink border-line-soft",
  ember: "bg-ember/15 text-ink border-ember/50",
  sun: "bg-sun/25 text-ink border-sun/70",
  grape: "bg-grape/15 text-ink border-grape/50",
  sea: "bg-sea/15 text-ink border-sea/50",
  mint: "bg-mint/20 text-ink border-mint/60",
  sky: "bg-sky/15 text-ink border-sky/50",
  bubblegum: "bg-bubblegum/20 text-ink border-bubblegum/60",
  ink: "bg-ink text-paper border-ink",
};

const sizes = {
  sm: "h-6 px-2 text-xs gap-1",
  md: "h-8 px-3 text-sm gap-1.5",
};

/** Static pill label. */
export function Chip({
  children,
  tone = "neutral",
  size = "md",
  icon,
  className = "",
}: {
  children: ReactNode;
  tone?: ChipTone;
  size?: "sm" | "md";
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <span className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full border-2 font-semibold ${tones[tone]} ${sizes[size]} ${className}`}>
      {icon}
      {children}
    </span>
  );
}

/** Toggleable / clickable pill (filters, suggestions, follow-up questions). */
export function ChipButton({
  selected = false,
  className = "",
  children,
  ...props
}: ComponentProps<"button"> & { selected?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={props["aria-pressed"] ?? selected}
      {...props}
      className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border-2 px-3.5 py-1 text-sm font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ember/40 disabled:pointer-events-none disabled:opacity-50 ${
        selected
          ? "border-line bg-ink text-paper"
          : "border-line-soft bg-surface text-ink hover:-translate-y-px hover:border-line"
      } ${className}`}
    >
      {children}
    </button>
  );
}
