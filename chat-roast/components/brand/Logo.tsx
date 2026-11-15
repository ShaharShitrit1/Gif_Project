/**
 * ChatRoast brand: a flame inside a speech bubble + the Latin "ChatRoast" wordmark.
 * The wordmark is always Latin and LTR (Hebrew users see the same mark).
 */

const BUBBLE = "M14 4.5H34Q44.5 4.5 44.5 15V24.5Q44.5 35 34 35H21.5L10.5 43.5L12.6 34.6Q3.5 32.6 3.5 24.5V15Q3.5 4.5 14 4.5Z";
const FLAME =
  "M24.4 9.2C26.6 13.1 31.6 15.2 31.6 21.4A7.6 7.6 0 0 1 16.4 21.4C16.4 18.3 18 16.4 19.8 15.2C19.6 17.6 20.8 19 22.3 19.4C21.2 15.8 22.4 12 24.4 9.2Z";
const CORE = "M24.1 18.2C25.2 20 27.4 20.8 27.4 23.4A3.3 3.3 0 0 1 20.8 23.4C20.8 21.6 22.3 21 22.9 20.2C23.5 21.1 23.9 19.7 24.1 18.2Z";

export function LogoMark({ size = 36, className = "", title }: { size?: number; className?: string; title?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      className={`shrink-0 overflow-visible ${className}`}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <path d={BUBBLE} transform="translate(2.5 2.5)" fill="var(--shadow)" />
      <path d={BUBBLE} fill="var(--ember)" stroke="var(--line)" strokeWidth="3" strokeLinejoin="round" />
      <path d={FLAME} fill="var(--sun)" stroke="#17120e" strokeWidth="2.4" strokeLinejoin="round" />
      <path d={CORE} fill="#fff8f0" />
    </svg>
  );
}

export function Logo({
  size = 34,
  withWordmark = true,
  className = "",
}: {
  /** Height of the mark in px; the wordmark scales with it. */
  size?: number;
  withWordmark?: boolean;
  className?: string;
}) {
  return (
    <span dir="ltr" className={`inline-flex items-center gap-[0.35em] ${className}`} style={{ fontSize: size * 0.62 }}>
      <LogoMark size={size} />
      {withWordmark && (
        <span className="font-black tracking-[-0.03em] leading-none text-ink" style={{ fontSize: "1.18em" }}>
          Chat<span className="text-ember">Roast</span>
        </span>
      )}
    </span>
  );
}
