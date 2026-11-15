import "./motion.css";

/** Indeterminate spinner. Pass `label` for screen readers when it stands alone. */
export function Spinner({ size = 20, className = "", label }: { size?: number; className?: string; label?: string }) {
  return (
    <span role={label ? "status" : undefined} className={`inline-flex shrink-0 ${className}`}>
      <svg width={size} height={size} viewBox="0 0 24 24" className="cr-spin" aria-hidden>
        <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
        <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
      {label && <span className="sr-only">{label}</span>}
    </span>
  );
}
