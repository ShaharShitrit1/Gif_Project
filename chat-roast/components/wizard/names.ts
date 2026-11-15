/** Helpers for the review step: spotting names worth renaming, following merges. */

const MARKS = /[‎‏‪-‮⁦-⁩﻿]/g;

export function cleanDisplay(name: string): string {
  return name.replace(MARKS, "").replace(/\s+/g, " ").trim();
}

/** "+972 50-123-4567", "050 1234567"… */
export function isPhoneName(name: string): boolean {
  const s = cleanDisplay(name);
  return /^[+\d\s().\-]+$/.test(s) && s.replace(/\D/g, "").length >= 7;
}

/** "💅✨", "🦄" — no letters or digits at all. */
export function isEmojiOnlyName(name: string): boolean {
  const s = cleanDisplay(name);
  return s.length > 0 && !/[\p{L}\p{N}]/u.test(s);
}

/** Follow merge chains to the surviving id (cycle-safe). */
export function resolveMerge(merges: Record<string, string>, id: string): string {
  let curr = id;
  const seen = new Set<string>();
  while (merges[curr] && !seen.has(curr) && merges[curr] !== curr) {
    seen.add(curr);
    curr = merges[curr];
  }
  return curr;
}

/** First letter-ish grapheme for an avatar bubble. */
export function initialOf(name: string): string {
  const s = cleanDisplay(name).replace(/^[+\d\s().\-]+$/, "#");
  const seg = typeof Intl !== "undefined" && "Segmenter" in Intl ? [...new Intl.Segmenter().segment(s)][0]?.segment : s[0];
  return (seg ?? "?").toUpperCase();
}
