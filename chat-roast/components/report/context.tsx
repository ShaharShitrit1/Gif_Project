"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { PERSONAS, REPORT_LANGUAGES, RTL_LANGUAGES } from "@/lib/personas";
import { intlLocale, useLocale } from "@/lib/i18n";
import type { Locale, MemberProfile, Participant, PersonStats, PersonaId, SavedReport } from "@/lib/types";
import { isolateDeep } from "@/lib/bidi";

/**
 * Member identity colors: 8 categorical slots derived from the brand hues, validated with the
 * dataviz six-checks (adjacent CVD ΔE ≥ 16.9, normal-vision ΔE ≥ 20 in both modes; light-mode
 * sky/sun/sea sit under 3:1 on white, so every colored mark ships with a visible name label).
 * Color follows the participant (index in SavedReport.participants), never the rank in a chart.
 * Members past slot 8 share the neutral "other" color.
 */
export const MEMBER_COLORS_LIGHT = ["#f3562e", "#49a9ff", "#009351", "#6b89f9", "#d89700", "#c3457f", "#9a73ff", "#1abcb8"];
export const MEMBER_COLORS_DARK = ["#e5481e", "#3496ef", "#008d4b", "#5f7ceb", "#c48400", "#bc3e79", "#8e66f1", "#00a9a5"];
const OTHER_LIGHT = "#a39890";
const OTHER_DARK = "#6e645c";

const vars = (cols: string[], other: string) => cols.map((c, i) => `--m${i}:${c};`).join("") + `--m-other:${other};`;

// Declared on :root (while a report is mounted) so portaled sheets/dialogs see them too;
// `.cr-light` (share cards) pins the light steps whatever the theme.
export const PALETTE_CSS =
  `:root{${vars(MEMBER_COLORS_LIGHT, OTHER_LIGHT)}}` +
  `@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){${vars(MEMBER_COLORS_DARK, OTHER_DARK)}}}` +
  `:root[data-theme="dark"]{${vars(MEMBER_COLORS_DARK, OTHER_DARK)}}` +
  `.cr-light{${vars(MEMBER_COLORS_LIGHT, OTHER_LIGHT)}}`;

export function PaletteStyle() {
  return <style>{PALETTE_CSS}</style>;
}

export function memberColorVar(index: number): string {
  return index >= 0 && index < 8 ? `var(--m${index})` : "var(--m-other)";
}

/** Narrators' grammatical gender (Hebrew strings need it). */
export const PERSONA_FEMININE: Record<PersonaId, boolean> = { max: false, savta: true, doc: false };

export interface MemberInfo {
  id: string;
  /** Position in SavedReport.participants (−1 when the id is unknown). */
  index: number;
  name: string;
  color: string;
  participant?: Participant;
  stats?: PersonStats;
  profile?: MemberProfile;
  isSelf: boolean;
}

export interface ReportCtx {
  saved: SavedReport;
  locale: Locale;
  intl: string;
  /** Direction + BCP-47 tag of the REPORT language (AI text), independent of the UI locale. */
  reportDir: "rtl" | "ltr";
  reportLang: string | undefined;
  personaName: string;
  personaFem: boolean;
  members: MemberInfo[];
  member: (id: string | null | undefined) => MemberInfo | undefined;
  nameOf: (id: string | null | undefined, fallback?: string) => string;
  colorOf: (id: string | null | undefined) => string;
}

const Ctx = createContext<ReportCtx | null>(null);

export function reportLangInfo(language: string): { dir: "rtl" | "ltr"; lang: string | undefined } {
  const entry = REPORT_LANGUAGES.find((l) => l.model.toLowerCase() === language.toLowerCase() || l.code === language.toLowerCase());
  const rtl = RTL_LANGUAGES.has(entry?.model ?? language) || /^(hebrew|arabic|persian|farsi|urdu|yiddish)/i.test(language);
  return { dir: rtl ? "rtl" : "ltr", lang: entry?.code };
}

export function ReportProvider({ saved: raw, children }: { saved: SavedReport; children: ReactNode }) {
  const { locale } = useLocale();
  // Isolate foreign-direction runs in the AI text once, so every section (and the share cards)
  // renders mixed Hebrew/English correctly. Idempotent, so re-saving this object is safe.
  const saved = useMemo<SavedReport>(
    () => ({ ...raw, report: isolateDeep(raw.report, reportLangInfo(raw.language).dir) }),
    [raw],
  );
  const value = useMemo<ReportCtx>(() => {
    const statsById = new Map(saved.stats.perPerson.map((p) => [p.id, p]));
    const profileById = new Map(saved.report.members.map((m) => [m.id, m]));
    const members: MemberInfo[] = saved.participants.map((p, i) => ({
      id: p.id,
      index: i,
      name: p.displayName || statsById.get(p.id)?.name || p.originalNames[0] || "?",
      color: memberColorVar(i),
      participant: p,
      stats: statsById.get(p.id),
      profile: profileById.get(p.id),
      isSelf: !!p.isSelf,
    }));
    const byId = new Map(members.map((m) => [m.id, m]));
    // Stats may know people the participants list doesn't (defensive).
    for (const s of saved.stats.perPerson) {
      if (!byId.has(s.id)) {
        const m: MemberInfo = { id: s.id, index: -1, name: s.name, color: memberColorVar(-1), stats: s, profile: profileById.get(s.id), isSelf: false };
        members.push(m);
        byId.set(s.id, m);
      }
    }
    const { dir, lang } = reportLangInfo(saved.language);
    const persona = PERSONAS[saved.personaId] ?? PERSONAS.max;
    return {
      saved,
      locale,
      intl: intlLocale(locale),
      reportDir: dir,
      reportLang: lang,
      personaName: persona.name[locale],
      personaFem: PERSONA_FEMININE[persona.id],
      members,
      member: (id) => (id ? byId.get(id) : undefined),
      nameOf: (id, fallback = "?") => (id ? byId.get(id)?.name ?? fallback : fallback),
      colorOf: (id) => (id ? byId.get(id)?.color ?? memberColorVar(-1) : memberColorVar(-1)),
    };
  }, [saved, locale]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useReport(): ReportCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useReport outside ReportProvider");
  return v;
}

/** Props that make an element render in the report language's direction. */
export function useReportText() {
  const { reportDir, reportLang } = useReport();
  return { dir: reportDir, lang: reportLang } as const;
}
