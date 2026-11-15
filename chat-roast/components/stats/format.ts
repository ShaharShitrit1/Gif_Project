/**
 * Number / date / duration formatting for the report + dashboard.
 * All timestamps are wall-clock-as-UTC (see lib/types.ts), so every Intl call pins timeZone: "UTC".
 */

const nfCache = new Map<string, Intl.NumberFormat>();
function nf(locale: string, opts: Intl.NumberFormatOptions = {}): Intl.NumberFormat {
  const key = locale + JSON.stringify(opts);
  let f = nfCache.get(key);
  if (!f) {
    f = new Intl.NumberFormat(locale, opts);
    nfCache.set(key, f);
  }
  return f;
}

export function fmtNum(n: number, locale: string, maxFrac = 0): string {
  return nf(locale, { maximumFractionDigits: maxFrac }).format(n);
}

export function fmtCompact(n: number, locale: string): string {
  if (Math.abs(n) < 10_000) return fmtNum(n, locale);
  return nf(locale, { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

/** 0..1 → "47%". Values > 1 are treated as already-percent. */
export function fmtPct(ratio: number, locale: string, maxFrac = 0): string {
  const r = ratio > 1 ? ratio / 100 : ratio;
  return nf(locale, { style: "percent", maximumFractionDigits: maxFrac }).format(r);
}

/** Human duration: 45 sec · 3 min · 2.5 hr · 4 days. */
export function fmtDuration(ms: number, locale: string, display: "short" | "long" = "short"): string {
  const s = ms / 1000;
  let unit: "second" | "minute" | "hour" | "day";
  let value: number;
  if (s < 60) {
    unit = "second";
    value = Math.max(1, Math.round(s));
  } else if (s < 3600) {
    unit = "minute";
    value = s / 60 < 10 ? Math.round((s / 60) * 10) / 10 : Math.round(s / 60);
  } else if (s < 86400 * 2) {
    unit = "hour";
    value = s / 3600 < 10 ? Math.round((s / 3600) * 10) / 10 : Math.round(s / 3600);
  } else {
    unit = "day";
    value = s / 86400 < 10 ? Math.round((s / 86400) * 10) / 10 : Math.round(s / 86400);
  }
  return nf(locale, { style: "unit", unit, unitDisplay: display, maximumFractionDigits: 1 }).format(value);
}

const dfCache = new Map<string, Intl.DateTimeFormat>();
function df(locale: string, opts: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = locale + JSON.stringify(opts);
  let f = dfCache.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat(locale, { ...opts, timeZone: "UTC" });
    dfCache.set(key, f);
  }
  return f;
}

export function fmtDate(ts: number, locale: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }): string {
  return df(locale, opts).format(new Date(ts));
}

/** "YYYY-MM-DD" → timestamp (UTC midnight). */
export function keyToTs(key: string): number {
  const [y, m, d] = key.split("-").map(Number);
  return Date.UTC(y, (m || 1) - 1, d || 1);
}

export function fmtDateKey(key: string, locale: string, opts?: Intl.DateTimeFormatOptions): string {
  return fmtDate(keyToTs(key), locale, opts);
}

export function fmtTime(ts: number, locale: string): string {
  return df(locale, { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(ts));
}

/** 22 → "22:00" (24h everywhere: reads the same in both locales). */
export function fmtHour(h: number): string {
  return `${String(h).padStart(2, "0")}:00`;
}

export function fmtRange(fromTs: number, toTs: number, locale: string): string {
  const opts: Intl.DateTimeFormatOptions = { month: "short", year: "numeric" };
  const f = df(locale, opts);
  const a = f.format(new Date(fromTs));
  const b = f.format(new Date(toTs));
  if (a === b) return fmtDate(fromTs, locale, { day: "numeric", month: "short", year: "numeric" });
  try {
    return f.formatRange(new Date(fromTs), new Date(toTs));
  } catch {
    return `${a} – ${b}`;
  }
}

export function weekdayName(day: number, locale: string, width: "long" | "short" | "narrow" = "long"): string {
  // 2023-01-01 was a Sunday
  return df(locale, { weekday: width }).format(new Date(Date.UTC(2023, 0, 1 + day)));
}

export function monthName(monthIndex: number, locale: string, width: "long" | "short" | "narrow" = "short"): string {
  return df(locale, { month: width }).format(new Date(Date.UTC(2023, monthIndex, 15)));
}

/** "2 Jan – 11 Apr 2026" for two "YYYY-MM-DD" keys. */
export function fmtDayRange(fromKey: string, toKey: string, locale: string): string {
  const f = df(locale, { day: "numeric", month: "short", year: "numeric" });
  try {
    return f.formatRange(new Date(keyToTs(fromKey)), new Date(keyToTs(toKey)));
  } catch {
    return `${f.format(new Date(keyToTs(fromKey)))} – ${f.format(new Date(keyToTs(toKey)))}`;
  }
}
