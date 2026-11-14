/**
 * Helpers for wall-clock-as-UTC timestamps (see TIME CONVENTION in lib/types.ts).
 * All reads use UTC getters so results never depend on the viewer's time zone.
 */

export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

export function wallClock(y: number, monthIndex: number, d: number, h = 0, mi = 0, s = 0): number {
  return Date.UTC(y, monthIndex, d, h, mi, s);
}

export function hourOf(ts: number): number {
  return new Date(ts).getUTCHours();
}

/** 0 = Sunday … 6 = Saturday */
export function weekdayOf(ts: number): number {
  return new Date(ts).getUTCDay();
}

/** "YYYY-MM-DD" */
export function dateKey(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10);
}

/** "YYYY-MM" */
export function monthKey(ts: number): string {
  return new Date(ts).toISOString().slice(0, 7);
}

export function startOfDay(ts: number): number {
  return Math.floor(ts / DAY) * DAY;
}

/** Format a wall-clock timestamp for display in the given UI locale. */
export function formatDate(ts: number, locale: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }): string {
  return new Intl.DateTimeFormat(locale, { ...opts, timeZone: "UTC" }).format(new Date(ts));
}

export function formatTime(ts: number, locale: string): string {
  return new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "UTC" }).format(new Date(ts));
}
