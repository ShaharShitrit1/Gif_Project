import type { ReactNode } from "react";

export function SectionHeading({
  kicker,
  title,
  sub,
  id,
  align = "start",
  className = "",
  invert = false,
}: {
  kicker?: ReactNode;
  title: ReactNode;
  sub?: ReactNode;
  id?: string;
  align?: "start" | "center";
  className?: string;
  /** For sections on an ink background. */
  invert?: boolean;
}) {
  return (
    <div className={`${align === "center" ? "mx-auto text-center" : ""} max-w-2xl ${className}`}>
      {kicker && (
        <p
          className={`mb-3 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] rtl:text-sm rtl:tracking-normal ${invert ? "text-sun" : "text-ember"}`}
        >
          <span aria-hidden className={`h-0.5 w-5 rounded-full ${invert ? "bg-sun" : "bg-ember"}`} />
          {kicker}
        </p>
      )}
      <h2 id={id} className="text-[2rem] font-black leading-[1.08] tracking-tight text-balance sm:text-5xl">
        {title}
      </h2>
      {sub && <p className={`mt-4 text-lg text-pretty ${invert ? "text-[#fff8f0]/75" : "text-ink-2"}`}>{sub}</p>}
    </div>
  );
}
