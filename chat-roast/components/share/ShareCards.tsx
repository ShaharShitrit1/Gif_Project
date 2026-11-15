"use client";

import { forwardRef, type CSSProperties, type ReactNode } from "react";
import { LogoMark } from "@/components/brand/Logo";
import { PersonaAvatar } from "@/components/ui/PersonaAvatar";
import { PERSONAS } from "@/lib/personas";
import { reportDict } from "@/lib/i18n/dict/report";
import type { Locale } from "@/lib/types";
import { fmtCompact, fmtHour, fmtNum, fmtPct } from "@/components/stats/format";
import { intlLocale } from "@/lib/i18n/config";
import { useReport, type MemberInfo } from "@/components/report/context";
import { quoted } from "@/components/report/Story";

export const CARD_W = 1080;
export const CARD_H = 1350;

/** Share cards always use the light palette, whatever the viewer's theme. */
const LIGHT_TOKENS = {
  "--paper": "#fff8f0",
  "--surface": "#ffffff",
  "--surface-2": "#fdf0e3",
  "--ink": "#17120e",
  "--ink-2": "#5b5049",
  "--ink-3": "#8f837a",
  "--line": "#17120e",
  "--line-soft": "#eadccd",
  "--shadow": "#17120e",
  "--bubble-in": "#ffffff",
  "--bubble-out": "#dcf8c6",
  "--chat-bg": "#efe6da",
} as CSSProperties;

type CardDict = (typeof reportDict)["he"];

/** Chrome labels follow the report language when we have it (he/en), else the UI locale. */
export function useCardStrings() {
  const { saved, locale } = useReport();
  const lang = saved.language.toLowerCase();
  const cardLocale: Locale = lang.startsWith("hebrew") || lang === "he" ? "he" : lang.startsWith("english") || lang === "en" ? "en" : locale;
  const d = reportDict[cardLocale] as CardDict;
  const s = <K extends keyof CardDict>(k: K, p?: Record<string, unknown>): string => {
    const v = d[k] as unknown;
    if (typeof v === "function") return (v as (x: unknown) => string)(p ?? {});
    return String(v).replace(/\{(\w+)\}/g, (m, key) => (p && key in p ? String(p[key]) : m));
  };
  return { s, cardLocale, cardIntl: intlLocale(cardLocale) };
}

/** First sentences of `text`, up to `max` chars, cut on a word boundary. */
export function excerpt(text: string, max: number): string {
  const clean = (text ?? "").replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const sentences = clean.match(/[^.!?。！？…]+[.!?。！？…]+["”״']?\s*/g) ?? [];
  let out = "";
  for (const s of sentences) {
    if ((out + s).trim().length > max) break;
    out += s;
  }
  if (out.trim().length >= max * 0.45) return out.trim();
  const cut = clean.slice(0, max);
  return cut.slice(0, Math.max(cut.lastIndexOf(" "), max * 0.7)).replace(/[,;:\-–—\s]+$/, "") + "…";
}

function CardFrame({ children, accent }: { children: ReactNode; accent: string }) {
  return (
    <div
      className="cr-pal cr-light relative overflow-hidden bg-paper text-ink"
      style={{ ...LIGHT_TOKENS, width: CARD_W, height: CARD_H, fontFamily: '"Rubik Variable", system-ui, sans-serif' }}
    >
      {/* decorative paper + halftone */}
      <div
        aria-hidden
        className="absolute rounded-full"
        style={{ width: 620, height: 620, top: -230, insetInlineEnd: -220, opacity: 0.28, backgroundImage: `radial-gradient(${accent} 5px, transparent 6px)`, backgroundSize: "30px 30px" }}
      />
      <div className="absolute border-[6px] border-line" style={{ inset: 40, borderRadius: 56 }} />
      <div data-card-col className="relative flex h-full flex-col overflow-hidden [&>*]:shrink-0" style={{ padding: "88px 96px 80px" }}>
        {children}
      </div>
    </div>
  );
}

function Brand({ right }: { right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between" style={{ gap: 24 }}>
      <span dir="ltr" className="inline-flex items-center font-black" style={{ gap: 14, fontSize: 44, letterSpacing: "-0.03em" }}>
        <LogoMark size={64} />
        <span>
          Chat<span style={{ color: "var(--ember)" }}>Roast</span>
        </span>
      </span>
      {right}
    </div>
  );
}

function Pill({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <span className="inline-flex items-center rounded-full border-line bg-surface font-bold" style={{ borderWidth: 4, padding: "8px 26px", fontSize: 30, maxWidth: 520, ...style }}>
      <span className="truncate">{children}</span>
    </span>
  );
}

function StatBox({ value, label, tint, sx = 1 }: { value: string; label: string; tint: string; sx?: number }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center rounded-[36px] border-line text-center" style={{ borderWidth: 5, padding: "26px 12px", background: `color-mix(in oklab, ${tint} 22%, white)`, boxShadow: `${sx * 8}px 8px 0 0 var(--shadow)` }}>
      <div className="font-black" style={{ fontSize: 72, lineHeight: 1, letterSpacing: "-0.02em" }}>
        {value}
      </div>
      <div className="font-bold text-ink-2" style={{ fontSize: 30, marginTop: 10 }}>
        {label}
      </div>
    </div>
  );
}

/** Fits long titles: font size steps down with length. */
function titleSize(text: string, base: number): number {
  const n = Array.from(text).length;
  if (n <= 28) return base;
  if (n <= 44) return base * 0.86;
  if (n <= 60) return base * 0.74;
  return base * 0.64;
}

export const GroupShareCard = forwardRef<HTMLDivElement>(function GroupShareCard(_, ref) {
  const { saved, reportDir, reportLang } = useReport();
  const { s, cardLocale, cardIntl } = useCardStrings();
  const sx = reportDir === "rtl" ? -1 : 1; // offset shadows mirror in RTL
  const { report, stats } = saved;
  const persona = PERSONAS[saved.personaId] ?? PERSONAS.max;
  const punch = excerpt(report.closingLine || report.subtitle || report.verdict, 120);
  const sub = report.subtitle && report.subtitle !== punch ? excerpt(report.subtitle, 110) : "";
  const laughs = stats.laugh?.total ?? 0;
  const people = stats.participantsCount || saved.participants.length;
  const third = laughs > 0 ? { value: fmtCompact(laughs, cardIntl), label: s("cardLaughs") } : { value: fmtNum(stats.daysSpan, cardIntl), label: s("cardDays") };

  return (
    <div ref={ref} dir={reportDir} lang={reportLang}>
      <CardFrame accent="var(--ember)">
        <Brand right={saved.groupName ? <Pill>{saved.groupName}</Pill> : undefined} />

        <div className="flex items-center" style={{ gap: 26, marginTop: 72 }}>
          <span style={{ borderRadius: 999, boxShadow: `${sx * 6}px 6px 0 0 var(--shadow)` }}>
            <PersonaAvatar id={persona.id} size={124} className="!border-[5px]" />
          </span>
          <div>
            <div className="font-bold text-ink-2" style={{ fontSize: 30 }}>
              {s("cardBy", { name: persona.name[cardLocale] })}
            </div>
            {report.vibe?.label && (
              <div className="mt-2 inline-flex items-center rounded-2xl border-line font-black" style={{ borderWidth: 4, gap: 12, padding: "6px 20px", fontSize: 34, background: "var(--sun)", transform: reportDir === "rtl" ? "rotate(2deg)" : "rotate(-2deg)" }}>
                <span>{report.vibe.emoji}</span>
                <span>{report.vibe.label}</span>
              </div>
            )}
          </div>
        </div>

        <h1 className="font-black" style={{ fontSize: titleSize(report.title, 104), lineHeight: 1.04, letterSpacing: "-0.025em", marginTop: 50, textWrap: "balance" }}>
          {report.title}
        </h1>
        {sub && (
          <p data-optional className="line-clamp-2 font-semibold text-ink-2" style={{ fontSize: 36, lineHeight: 1.3, marginTop: 24 }}>
            {sub}
          </p>
        )}

        <div className="flex-1" />

        {punch && (
          <div className="relative rounded-[40px] border-line bg-ink text-paper" style={{ borderWidth: 5, padding: "34px 44px", marginBottom: 44 }}>
            <div className="line-clamp-3 font-black" style={{ fontSize: 42, lineHeight: 1.2 }}>
              🎤 {punch}
            </div>
          </div>
        )}

        <div dir={cardLocale === "he" ? "rtl" : "ltr"} className="flex" style={{ gap: 28 }}>
          <StatBox value={fmtCompact(stats.totalMessages, cardIntl)} label={s("cardMessages")} tint="var(--ember)" sx={sx} />
          <StatBox value={fmtNum(people, cardIntl)} label={s("cardPeople")} tint="var(--sky)" sx={sx} />
          <StatBox value={third.value} label={third.label} tint="var(--mint)" sx={sx} />
        </div>

        <div className="flex items-center justify-between whitespace-nowrap font-bold text-ink-2" style={{ fontSize: 28, marginTop: 40 }} dir={cardLocale === "he" ? "rtl" : "ltr"}>
          <span>{s("cardTagline")}</span>
          <span dir="ltr">chatroast</span>
        </div>
      </CardFrame>
    </div>
  );
});

export const MemberShareCard = forwardRef<HTMLDivElement, { member: MemberInfo }>(function MemberShareCard({ member }, ref) {
  const { saved, reportDir, reportLang } = useReport();
  const { s, cardLocale, cardIntl } = useCardStrings();
  const sx = reportDir === "rtl" ? -1 : 1; // offset shadows mirror in RTL
  const p = member.profile;
  const st = member.stats;
  const color = member.color;
  const roast = excerpt(p?.roast ?? "", 105);
  const quote = excerpt(p?.signatureQuote ?? "", 90);
  const persona = PERSONAS[saved.personaId] ?? PERSONAS.max;

  return (
    <div ref={ref} dir={reportDir} lang={reportLang}>
      <CardFrame accent={color}>
        <Brand right={saved.groupName ? <Pill>{saved.groupName}</Pill> : undefined} />

        <div className="flex items-center" style={{ gap: 36, marginTop: 52 }}>
          <span
            className="grid shrink-0 place-items-center rounded-full border-line"
            style={{ width: 172, height: 172, borderWidth: 6, background: color, fontSize: 96, boxShadow: `${sx * 10}px 10px 0 0 var(--shadow)` }}
          >
            {p?.emoji || Array.from(member.name)[0]}
          </span>
          <div className="min-w-0 flex-1">
            <div className="font-black" style={{ fontSize: 56, lineHeight: 1.05 }}>
              {member.name}
            </div>
            {p?.archetype && (
              <div className="mt-4 inline-flex whitespace-nowrap rounded-full border-line bg-surface font-bold" style={{ borderWidth: 4, padding: "6px 22px", fontSize: 30 }}>
                {p.archetype}
              </div>
            )}
          </div>
        </div>

        {p?.nickname && (
          <h1 className="font-black" style={{ fontSize: titleSize(p.nickname, 92), lineHeight: 1.04, letterSpacing: "-0.025em", marginTop: 40, textWrap: "balance" }}>
            {p.nickname}
          </h1>
        )}

        {roast && (
          <p data-optional className="line-clamp-2 font-semibold text-ink-2" style={{ fontSize: 36, lineHeight: 1.36, marginTop: 26 }}>
            {roast}
          </p>
        )}

        <div className="flex-1" />

        {quote && (
          <div className="rounded-[40px]" style={{ background: "var(--chat-bg)", padding: 24, marginBottom: 36, marginTop: 24 }}>
            <div
              className="border-line bg-bubble-in"
              style={{ borderWidth: 5, borderRadius: 34, borderStartStartRadius: 8, padding: "18px 32px 22px", maxWidth: "92%", boxShadow: `${sx * 6}px 6px 0 0 var(--shadow)` }}
            >
              <div className="flex items-center font-bold text-ink-2" style={{ gap: 12, fontSize: 26 }}>
                <span style={{ width: 16, height: 16, borderRadius: 99, background: color, display: "inline-block" }} />
                {member.name}
              </div>
              <div dir="auto" className="font-black" style={{ fontSize: 42, lineHeight: 1.22, marginTop: 4 }}>
                {quoted(quote)}
              </div>
            </div>
          </div>
        )}

        {st && (
          <div dir={cardLocale === "he" ? "rtl" : "ltr"} className="flex" style={{ gap: 28 }}>
            <StatBox value={fmtPct(st.share, cardIntl, st.share < 0.1 ? 1 : 0)} label={s("cardShare")} tint={color} sx={sx} />
            {st.laugh?.count > 0 ? (
              <StatBox value={fmtCompact(st.laugh.count, cardIntl)} label={s("cardLaughs")} tint="var(--sun)" sx={sx} />
            ) : (
              <StatBox value={fmtHour(st.peakHour)} label={s("cardPeak")} tint="var(--sun)" sx={sx} />
            )}
          </div>
        )}

        <div className="flex items-center justify-between whitespace-nowrap font-bold text-ink-2" style={{ fontSize: 28, marginTop: 40 }} dir={cardLocale === "he" ? "rtl" : "ltr"}>
          <span className="inline-flex items-center" style={{ gap: 12 }}>
            <PersonaAvatar id={persona.id} size={44} className="!border-[3px]" />
            {s("cardBy", { name: persona.name[cardLocale] })}
          </span>
          <span dir="ltr">chatroast</span>
        </div>
      </CardFrame>
    </div>
  );
});
