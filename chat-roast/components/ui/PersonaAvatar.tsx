import { PERSONAS } from "@/lib/personas";
import type { PersonaId } from "@/lib/types";

/**
 * Persona avatar. PLACEHOLDER implementation (emoji in a colored circle).
 * The landing/brand agent replaces the inside with original SVG illustrations —
 * the props API below must stay the same because report/wizard/share code uses it.
 */
export function PersonaAvatar({
  id,
  size = 56,
  className = "",
  ring = true,
}: {
  id: PersonaId;
  size?: number;
  className?: string;
  ring?: boolean;
}) {
  const p = PERSONAS[id];
  return (
    <span
      aria-hidden
      className={`inline-grid place-items-center rounded-full shrink-0 ${ring ? "border-2 border-line" : ""} ${className}`}
      style={{ width: size, height: size, background: p.color.bg, fontSize: size * 0.5 }}
    >
      {p.emoji}
    </span>
  );
}
