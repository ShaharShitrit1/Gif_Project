import type { ReactNode } from "react";
import { PERSONAS } from "@/lib/personas";
import type { PersonaId } from "@/lib/types";

/*
 * Original flat-vector portraits of the three narrators (120×120 artboard,
 * ink outlines). Colors are fixed illustration colors: each portrait sits on
 * its own persona-colored disc, so it reads the same in light and dark mode.
 *
 *   Max          — flame hair, sunglasses pushed up, cocky grin.
 *   Grandma Pnina — silver curls, huge glasses, pearls, one raised eyebrow.
 *   Dr. Noam     — round glasses, beard, notebook + pen, thoughtful smirk.
 */

const MAX = (
  <>
    <rect width="120" height="120" fill="#FF5A36" />
    <circle cx="60" cy="62" r="42" fill="#FF7A52" />
    <path d="M50 76 L50 97 Q60 103 70 97 L70 76 Z" fill="#E3976C" stroke="#17120e" strokeWidth="3" strokeLinejoin="round" />
    <path
      d="M12 124 C14 106 28 96 47 93 Q60 104 73 93 C92 96 106 106 108 124 Z"
      fill="#2A2320"
      stroke="#17120e"
      strokeWidth="3"
      strokeLinejoin="round"
    />
    <path
      d="M60 104 C63 108 67 110 67 114.5 A7 7 0 0 1 53 114.5 C53 112 54.5 110.5 56 109.6 C56 111.6 57 112.6 58.2 112.8 C57.6 109.8 58.4 106.4 60 104 Z"
      fill="#FFC53D"
      stroke="#17120e"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
    <ellipse cx="37" cy="64" rx="5.5" ry="7.5" fill="#F4B38A" stroke="#17120e" strokeWidth="3" />
    <ellipse cx="83" cy="64" rx="5.5" ry="7.5" fill="#F4B38A" stroke="#17120e" strokeWidth="3" />
    <path
      d="M37.5 58 C37.5 41 47 33 60 33 C73 33 82.5 41 82.5 58 L82.5 66 C82.5 80 73 89 60 89 C47 89 37.5 80 37.5 66 Z"
      fill="#F4B38A"
      stroke="#17120e"
      strokeWidth="3"
    />
    <path
      d="M35.5 57 C31 46 32 35 39.5 28 C39.5 32.5 41.5 35 44 35.5 C42.5 26 48 17.5 56.5 13 C55 19 57 23 60.5 24.5 C62.5 16.5 69.5 11 78 10 C74.5 15.5 75.5 20.5 78.5 23.5 C82.5 20.5 87.5 21 91 24.5 C86.5 27 87 32.5 86.5 38.5 C86 46 85.5 51.5 84.5 57 C82 49.5 76 44.5 68 43.5 C61.5 46.5 53 46.5 46 44 C40.5 46.5 37 51 35.5 57 Z"
      fill="#FFC53D"
      stroke="#17120e"
      strokeWidth="3"
      strokeLinejoin="round"
    />
    <path d="M49 31 C50.5 25 55 21 58.5 19.5 C57.5 24.5 59.5 28.5 63 30.5 C58.5 32.5 53 33 49 31 Z" fill="#FF8A3D" />
    <path d="M68.5 28 C70 23 74 19.5 77 18.5 C76.5 22 78 25 80.5 26.5 C77 28.5 72 29.5 68.5 28 Z" fill="#FF8A3D" />
    <g transform="rotate(-4 60 39)">
      <rect x="41.5" y="33.5" width="16" height="10.5" rx="4.5" fill="#17120e" />
      <rect x="62.5" y="33.5" width="16" height="10.5" rx="4.5" fill="#17120e" />
      <path d="M57 37 Q60 35 63 37" stroke="#17120e" strokeWidth="3" fill="none" />
      <path d="M44.5 37 L48.5 36" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
      <path d="M65.5 37 L69.5 36" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
    </g>
    <path d="M43.5 53.5 Q49.5 50.5 55.5 52.5" stroke="#17120e" strokeWidth="3.6" fill="none" strokeLinecap="round" />
    <path d="M65 50.5 Q71 45 77.5 49" stroke="#17120e" strokeWidth="3.6" fill="none" strokeLinecap="round" />
    <circle cx="50" cy="60" r="3" fill="#17120e" />
    <circle cx="71" cy="59" r="3" fill="#17120e" />
    <path d="M45.5 57.5 L54.5 57" stroke="#17120e" strokeWidth="2.6" strokeLinecap="round" />
    <path d="M60.5 62 Q63.5 67.5 59.5 69" stroke="#17120e" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    <path
      d="M46.5 72.5 Q60 76.5 75.5 69.5 Q73 82.5 60.5 82.5 Q50 82 46.5 72.5 Z"
      fill="#fff"
      stroke="#17120e"
      strokeWidth="3"
      strokeLinejoin="round"
    />
    <path d="M51 77.8 Q61 80.5 71.5 75.8" stroke="#17120e" strokeWidth="1.6" fill="none" opacity="0.35" />
    <path d="M77 66.5 Q79.5 69 78 72.5" stroke="#17120e" strokeWidth="2.4" fill="none" strokeLinecap="round" />
  </>
);

const PNINA = (
  <>
    <rect width="120" height="120" fill="#8B5CF6" />
    <circle cx="60" cy="62" r="42" fill="#9C74F8" />
    <circle cx="35" cy="52" r="10" fill="#EEEAF6" stroke="#17120e" strokeWidth="3" />
    <circle cx="39" cy="38" r="11" fill="#EEEAF6" stroke="#17120e" strokeWidth="3" />
    <circle cx="50" cy="29" r="12" fill="#EEEAF6" stroke="#17120e" strokeWidth="3" />
    <circle cx="64" cy="28" r="12.5" fill="#EEEAF6" stroke="#17120e" strokeWidth="3" />
    <circle cx="77" cy="35" r="11.5" fill="#EEEAF6" stroke="#17120e" strokeWidth="3" />
    <circle cx="85" cy="49" r="10.5" fill="#EEEAF6" stroke="#17120e" strokeWidth="3" />
    <circle cx="33" cy="66" r="8.5" fill="#EEEAF6" stroke="#17120e" strokeWidth="3" />
    <circle cx="87" cy="64" r="8.5" fill="#EEEAF6" stroke="#17120e" strokeWidth="3" />
    <circle cx="35" cy="52" r="10" fill="#EEEAF6" />
    <circle cx="39" cy="38" r="11" fill="#EEEAF6" />
    <circle cx="50" cy="29" r="12" fill="#EEEAF6" />
    <circle cx="64" cy="28" r="12.5" fill="#EEEAF6" />
    <circle cx="77" cy="35" r="11.5" fill="#EEEAF6" />
    <circle cx="85" cy="49" r="10.5" fill="#EEEAF6" />
    <circle cx="33" cy="66" r="8.5" fill="#EEEAF6" />
    <circle cx="87" cy="64" r="8.5" fill="#EEEAF6" />
    <path d="M51 78 L51 97 Q60 101 69 97 L69 78 Z" fill="#EDB898" stroke="#17120e" strokeWidth="3" strokeLinejoin="round" />
    <path
      d="M12 124 C14 104 31 95 48 93 L60 108 L72 93 C89 95 106 104 108 124 Z"
      fill="#FF7AB6"
      stroke="#17120e"
      strokeWidth="3"
      strokeLinejoin="round"
    />
    <path d="M48 93 L60 108 L72 93 Q60 99 48 93 Z" fill="#FFF8F0" stroke="#17120e" strokeWidth="2.4" strokeLinejoin="round" />
    <circle cx="46.5" cy="94.5" r="2.9" fill="#fff" stroke="#17120e" strokeWidth="1.6" />
    <circle cx="50" cy="98.8" r="2.9" fill="#fff" stroke="#17120e" strokeWidth="1.6" />
    <circle cx="54.5" cy="101.6" r="2.9" fill="#fff" stroke="#17120e" strokeWidth="1.6" />
    <circle cx="60" cy="102.6" r="2.9" fill="#fff" stroke="#17120e" strokeWidth="1.6" />
    <circle cx="65.5" cy="101.6" r="2.9" fill="#fff" stroke="#17120e" strokeWidth="1.6" />
    <circle cx="70" cy="98.8" r="2.9" fill="#fff" stroke="#17120e" strokeWidth="1.6" />
    <circle cx="73.5" cy="94.5" r="2.9" fill="#fff" stroke="#17120e" strokeWidth="1.6" />
    <path
      d="M38.5 58 C38.5 42 48 36 60 36 C72 36 81.5 42 81.5 58 L81.5 66 C81.5 81 72 89 60 89 C48 89 38.5 81 38.5 66 Z"
      fill="#F6C9A8"
      stroke="#17120e"
      strokeWidth="3"
    />
    <circle cx="45" cy="42" r="7.5" fill="#EEEAF6" stroke="#17120e" strokeWidth="3" />
    <circle cx="55.5" cy="38.5" r="7.5" fill="#EEEAF6" stroke="#17120e" strokeWidth="3" />
    <circle cx="66" cy="38.5" r="7.5" fill="#EEEAF6" stroke="#17120e" strokeWidth="3" />
    <circle cx="75.5" cy="43" r="7" fill="#EEEAF6" stroke="#17120e" strokeWidth="3" />
    <circle cx="45" cy="42" r="7.5" fill="#EEEAF6" />
    <circle cx="55.5" cy="38.5" r="7.5" fill="#EEEAF6" />
    <circle cx="66" cy="38.5" r="7.5" fill="#EEEAF6" />
    <circle cx="75.5" cy="43" r="7" fill="#EEEAF6" />
    <path
      d="M33 49 q3 -5 8 -2 M41 33 q4 -4 8 0 M58 23.5 q5 -3 9 1 M74 29 q5 -2 7 3 M84 45 q4 1 4 6 M30.5 64 q3 -3 6 0 M85 62 q3 0 4 4 M50 38 q3 -3 6 -1 M62 35.5 q3 -2 6 0.5 M71.5 40 q3 -1 5 2"
      stroke="#B5ADC9"
      strokeWidth="2"
      fill="none"
      strokeLinecap="round"
    />
    <circle cx="38" cy="75" r="3" fill="#fff" stroke="#17120e" strokeWidth="1.6" />
    <circle cx="82" cy="75" r="3" fill="#fff" stroke="#17120e" strokeWidth="1.6" />
    <circle cx="44" cy="73" r="4.5" fill="#FF7AB6" opacity="0.5" />
    <circle cx="76" cy="73" r="4.5" fill="#FF7AB6" opacity="0.5" />
    <circle cx="49" cy="62" r="10" fill="#fff" fillOpacity="0.35" stroke="#17120e" strokeWidth="3.2" />
    <circle cx="71" cy="62" r="10" fill="#fff" fillOpacity="0.35" stroke="#17120e" strokeWidth="3.2" />
    <path d="M59 60.5 Q60 58.5 61 60.5" stroke="#17120e" strokeWidth="3" fill="none" />
    <circle cx="50" cy="63" r="2.6" fill="#17120e" />
    <circle cx="72" cy="63" r="2.6" fill="#17120e" />
    <path d="M42 49 Q48.5 47 55 49" stroke="#17120e" strokeWidth="3.2" fill="none" strokeLinecap="round" />
    <path d="M64.5 47.5 Q71 41.5 78.5 46" stroke="#17120e" strokeWidth="3.2" fill="none" strokeLinecap="round" />
    <path d="M52.5 77 Q59.5 81 67.5 76 Q69 75 69.5 73.5" stroke="#D63A5E" strokeWidth="3.2" fill="none" strokeLinecap="round" />
  </>
);

const NOAM = (
  <>
    <rect width="120" height="120" fill="#0EA5A4" />
    <circle cx="60" cy="62" r="42" fill="#25B3B1" />
    <path d="M51 78 L51 96 Q60 100 69 96 L69 78 Z" fill="#C98A62" stroke="#17120e" strokeWidth="3" strokeLinejoin="round" />
    <path
      d="M12 124 C14 104 31 95 49 93 L60 99 L71 93 C89 95 106 104 108 124 Z"
      fill="#FFC53D"
      stroke="#17120e"
      strokeWidth="3"
      strokeLinejoin="round"
    />
    <path d="M49.5 92 L55.5 102 L60 96 Z" fill="#fff" stroke="#17120e" strokeWidth="2.4" strokeLinejoin="round" />
    <path d="M70.5 92 L64.5 102 L60 96 Z" fill="#fff" stroke="#17120e" strokeWidth="2.4" strokeLinejoin="round" />
    <ellipse cx="38" cy="63" rx="5" ry="7" fill="#DDA07A" stroke="#17120e" strokeWidth="3" />
    <ellipse cx="82" cy="63" rx="5" ry="7" fill="#DDA07A" stroke="#17120e" strokeWidth="3" />
    <path
      d="M38.5 57 C38.5 40 48 33 60 33 C72 33 81.5 40 81.5 57 L81.5 65 C81.5 80 72 89 60 89 C48 89 38.5 80 38.5 65 Z"
      fill="#DDA07A"
      stroke="#17120e"
      strokeWidth="3"
    />
    <path
      d="M38.5 63 C39 72 42.5 84 52 88.5 C56 90.5 64 90.5 68 88.5 C77.5 84 81 72 81.5 63 C79 69 76 73.5 71.5 74.5 C66 71 54 71 48.5 74.5 C44 73.5 41 69 38.5 63 Z"
      fill="#3A2A22"
      stroke="#17120e"
      strokeWidth="3"
      strokeLinejoin="round"
    />
    <path d="M53 79 Q60 81 67.5 76.5" stroke="#F0C7AA" strokeWidth="2.6" fill="none" strokeLinecap="round" />
    <path
      d="M36.5 58 C34 42 42.5 27.5 58.5 26.5 C71 25.5 83 31 85.5 44 C86.5 50 85.5 54.5 84 58 C82 50.5 78.5 46.5 72.5 44.5 C64 47.5 52.5 45.5 46 40 C42.5 46 39 51 36.5 58 Z"
      fill="#2B211C"
      stroke="#17120e"
      strokeWidth="3"
      strokeLinejoin="round"
    />
    <path d="M52 33 Q62 30 72 33" stroke="#4A3B33" strokeWidth="2.4" fill="none" strokeLinecap="round" />
    <circle cx="50" cy="60" r="8.5" fill="#fff" fillOpacity="0.28" stroke="#17120e" strokeWidth="2.6" />
    <circle cx="70" cy="60" r="8.5" fill="#fff" fillOpacity="0.28" stroke="#17120e" strokeWidth="2.6" />
    <path d="M58.5 59.5 Q60 57.5 61.5 59.5" stroke="#17120e" strokeWidth="2.6" fill="none" />
    <path d="M41.5 58.5 L38.5 57.5 M78.5 58.5 L81.5 57.5" stroke="#17120e" strokeWidth="2.6" strokeLinecap="round" />
    <circle cx="51.5" cy="59.5" r="2.4" fill="#17120e" />
    <circle cx="71.5" cy="59.5" r="2.4" fill="#17120e" />
    <path d="M43.5 49.5 Q50 47 56.5 49.5" stroke="#17120e" strokeWidth="3.2" fill="none" strokeLinecap="round" />
    <path d="M63.5 48 Q70 44.5 76.5 48" stroke="#17120e" strokeWidth="3.2" fill="none" strokeLinecap="round" />
    <path d="M60.5 61.5 Q63.5 67 59.5 68.5" stroke="#17120e" strokeWidth="2.4" fill="none" strokeLinecap="round" />
    <g transform="rotate(-10 34 110)">
      <rect x="17" y="97" width="31" height="34" rx="3.5" fill="#FFF8F0" stroke="#17120e" strokeWidth="3" />
      <path d="M23 106 H42 M23 112 H42 M23 118 H35" stroke="#8F837A" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M17 101 H48" stroke="#FF5A36" strokeWidth="3" />
    </g>
    <path d="M66 89.5 L86 115" stroke="#17120e" strokeWidth="5.5" strokeLinecap="round" />
    <path d="M66 89.5 L70 94.5" stroke="#FF5A36" strokeWidth="3" strokeLinecap="round" />
    <path
      d="M73 108 C73 102 77 99.5 82 100 C87 100.5 89 104 88.5 108.5 C88 113 84 116 79 115.5 C75 115 73 112 73 108 Z"
      fill="#DDA07A"
      stroke="#17120e"
      strokeWidth="3"
    />
    <path d="M75 105.5 Q79 104 83 105.5 M75 110 Q79 108.5 83 110" stroke="#17120e" strokeWidth="2" fill="none" strokeLinecap="round" />
  </>
);

const ART: Record<PersonaId, ReactNode> = { max: MAX, savta: PNINA, doc: NOAM };

/**
 * Persona avatar (props API is shared with report / share code — keep it stable).
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
      className={`inline-block shrink-0 overflow-hidden rounded-full ${ring ? "border-2 border-line" : ""} ${className}`}
      style={{ width: size, height: size, background: p.color.bg }}
    >
      <svg viewBox="0 0 120 120" width="100%" height="100%" className="block" focusable={false}>
        {ART[id] ?? null}
      </svg>
    </span>
  );
}
