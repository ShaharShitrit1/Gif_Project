/** Server-safe i18n constants & helpers (no "use client" — importable from server components). */
import type { Locale } from "../types";

export const LOCALES: Locale[] = ["he", "en"];
export const DEFAULT_LOCALE: Locale = "he";
export const LOCALE_COOKIE = "cr_locale";

export function dirOf(locale: Locale): "rtl" | "ltr" {
  return locale === "he" ? "rtl" : "ltr";
}

/** BCP-47 tag for Intl formatting. */
export function intlLocale(locale: Locale): string {
  return locale === "he" ? "he-IL" : "en-US";
}
