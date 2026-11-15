/**
 * Bidi isolation for AI-written text.
 *
 * An English report that mentions a Hebrew group name ("החבר'ה 🍕: 6 people") or a Hebrew
 * report quoting an English phrase can come out visually scrambled, because neutral characters
 * (":", digits, emoji) next to the foreign-direction run get attached to the wrong side.
 * Wrapping every foreign-direction run in FSI…PDI (U+2068 … U+2069) isolates it, so the
 * surrounding sentence keeps its own order. The marks are invisible and survive copy/paste.
 *
 * Idempotent: existing isolate marks are stripped before re-applying.
 */

const RTL = "֐-׿יִ-ﭏ؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿";
const RTL_RUN = new RegExp(`[${RTL}](?:[${RTL}'"׳״\\-\\s]*[${RTL}])?`, "g");
const LTR_RUN = /[A-Za-zÀ-ɏ](?:[A-Za-zÀ-ɏ0-9'’\-.\s]*[A-Za-zÀ-ɏ0-9])?/g;
const MARKS = /[⁨⁩]/g;

export function isolateForeignRuns(text: string, dir: "rtl" | "ltr"): string {
  const clean = text.replace(MARKS, "");
  return clean.replace(dir === "ltr" ? RTL_RUN : LTR_RUN, (m) => `⁨${m}⁩`);
}

/** Deep-map every string in a JSON-like value (objects, arrays) through isolateForeignRuns. */
export function isolateDeep<T>(value: T, dir: "rtl" | "ltr"): T {
  if (typeof value === "string") return isolateForeignRuns(value, dir) as T;
  if (Array.isArray(value)) return value.map((v) => isolateDeep(v, dir)) as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      // ids / keys are identifiers, never displayed text
      out[k] = k === "id" || k === "winnerId" || k === "closestTo" || k === "key" ? v : isolateDeep(v, dir);
    }
    return out as T;
  }
  return value;
}

/** Remove isolate marks (e.g. before sending text back to the model). */
export function stripIsolates(text: string): string {
  return text.replace(MARKS, "");
}
