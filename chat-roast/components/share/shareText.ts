import { PERSONAS } from "@/lib/personas";
import { reportDict } from "@/lib/i18n/dict/report";
import type { Locale, SavedReport } from "@/lib/types";
import { PERSONA_FEMININE } from "@/components/report/context";
import { excerpt } from "./ShareCards";

/** WhatsApp markup: *bold*, _italic_. Strips characters that would break the markers. */
const bold = (s: string) => `*${s.replace(/\*/g, "").trim()}*`;
const italic = (s: string) => `_${s.replace(/_/g, " ").trim()}_`;

/** A WhatsApp-ready summary of the report (group) or of one member. */
export function buildShareText(saved: SavedReport, locale: Locale, memberId?: string): string {
  const d = reportDict[locale];
  const persona = PERSONAS[saved.personaId] ?? PERSONAS.max;
  const pname = persona.name[locale];
  const { report } = saved;
  const name = (id: string) => saved.participants.find((p) => p.id === id)?.displayName ?? "";
  const lines: string[] = [];

  if (memberId) {
    const m = report.members.find((x) => x.id === memberId);
    const who = name(memberId);
    if (m) {
      lines.push(`${m.emoji} ${bold(`${who} — ${m.nickname}`)}`);
      if (m.archetype) lines.push(italic(m.archetype));
      lines.push("");
      if (m.roast) lines.push(m.roast.trim());
      if (m.signatureQuote) lines.push("", `💬 ${italic(`“${m.signatureQuote}”`)}`);
      if (m.superpower) lines.push("", `💪 ${bold(d.superpower)}: ${m.superpower}`);
      if (m.redFlag) lines.push(`🚩 ${bold(d.redFlag)}: ${m.redFlag}`);
    }
  } else {
    lines.push(`🔥 ${bold(report.title)}`);
    if (report.subtitle) lines.push(italic(report.subtitle));
    lines.push("");
    lines.push(excerpt(report.verdict.split(/\n\s*\n/)[0] ?? "", 420));
    const members = report.members.filter((m) => name(m.id));
    if (members.length) {
      lines.push("", `🎭 ${bold(d.shareTextMembers)}`);
      for (const m of members.slice(0, 12)) lines.push(`• ${m.emoji} ${bold(name(m.id))} — ${m.nickname}`);
    }
    if (report.scores?.length) {
      lines.push("", `📊 ${bold(d.shareTextScores)}`);
      for (const s of report.scores) lines.push(`${s.emoji} ${s.label}: ${bold(`${Math.round(s.value)}/100`)}`);
    }
    if (report.closingLine) lines.push("", `🎤 ${italic(report.closingLine)}`);
  }

  lines.push("", `— ${d.shareTextIntro({ name: pname, fem: PERSONA_FEMININE[persona.id] })}`, d.shareTextCta);
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
