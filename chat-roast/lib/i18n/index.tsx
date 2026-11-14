"use client";

/**
 * Tiny i18n layer. Each feature owns its own dictionary file in lib/i18n/dict/<ns>.ts:
 *
 *   export const wizardDict = defineDict({
 *     he: { title: "שלום {name}", count: (p: { n: number }) => (p.n === 1 ? "הודעה אחת" : `${p.n} הודעות`) },
 *     en: { title: "Hello {name}", count: (p: { n: number }) => (p.n === 1 ? "one message" : `${p.n} messages`) },
 *   });
 *
 *   const t = useT(wizardDict);
 *   t("title", { name: "Noa" });
 *
 * Hebrew is the source of truth; `en` must have the same keys (enforced by the type).
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Locale } from "../types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Entry = string | ((params: any) => string);
export type Dict = Record<string, Entry>;

export function defineDict<T extends Dict>(d: { he: T; en: { [K in keyof T]: T[K] extends string ? string : T[K] } }) {
  return d as { he: T; en: T };
}

import { DEFAULT_LOCALE, LOCALE_COOKIE, dirOf } from "./config";
export { LOCALES, DEFAULT_LOCALE, LOCALE_COOKIE, dirOf, intlLocale } from "./config";

interface LocaleCtx {
  locale: Locale;
  setLocale: (l: Locale) => void;
}

const LocaleContext = createContext<LocaleCtx>({ locale: DEFAULT_LOCALE, setLocale: () => {} });

export function LocaleProvider({ initial, children }: { initial: Locale; children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(initial);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try {
      document.cookie = `${LOCALE_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
    } catch {}
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = dirOf(locale);
  }, [locale]);

  const value = useMemo(() => ({ locale, setLocale }), [locale, setLocale]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  return useContext(LocaleContext);
}

function interpolate(s: string, params?: Record<string, unknown>): string {
  if (!params) return s;
  return s.replace(/\{(\w+)\}/g, (m, k) => (k in params ? String(params[k]) : m));
}

export function useT<T extends Dict>(dict: { he: T; en: T }) {
  const { locale } = useLocale();
  return useCallback(
    <K extends keyof T>(key: K, params?: T[K] extends (p: infer P) => string ? P : Record<string, unknown>): string => {
      const table = (dict[locale] ?? dict.he) as T;
      const entry = (table[key] ?? dict.he[key]) as Entry | undefined;
      if (entry === undefined) return String(key);
      return typeof entry === "function" ? entry(params) : interpolate(entry, params as Record<string, unknown>);
    },
    [dict, locale],
  );
}

/** Pick a value from a { he, en } record for the current locale. */
export function useLocalized() {
  const { locale } = useLocale();
  return useCallback(<V,>(rec: Record<Locale, V>) => rec[locale] ?? rec.he, [locale]);
}
