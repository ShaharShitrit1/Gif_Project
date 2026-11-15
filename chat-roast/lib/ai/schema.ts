/**
 * AIReport contract for the model (JSON Schema for structured outputs) and for
 * us (zod validator + normalization).
 *
 * Structured-outputs JSON Schema limits respected here: every object has
 * `additionalProperties: false` and lists all keys in `required`; no
 * min/max/minLength/maxLength/multipleOf; minItems only 0/1; no recursion.
 * Length/count rules live in descriptions and are enforced by `normalizeReport`.
 * The schema is static (no per-request enums) so it compiles once and stays cached.
 */

import { z } from "zod";
import type { AIReport } from "../types";

const str = (description: string) => ({ type: "string", description }) as const;

const SCORE = {
  type: "object",
  additionalProperties: false,
  required: ["key", "label", "emoji", "value", "comment"],
  properties: {
    key: str("Short snake_case English key unique to this chat, e.g. \"trip_postponement\"."),
    label: str("Category name in the report language, invented for THIS chat (2–5 words)."),
    emoji: str("One emoji."),
    value: { type: "integer", description: "Score from 0 to 100." },
    comment: str("One or two sentences justifying the score with concrete evidence (a number, quote or event)."),
  },
} as const;

const MEMBER = {
  type: "object",
  additionalProperties: false,
  required: ["id", "nickname", "archetype", "emoji", "roast", "superpower", "redFlag", "signatureQuote", "advice", "closestTo"],
  properties: {
    id: str("Participant id from the request (e.g. \"p0\")."),
    nickname: str("Funny, screenshot-worthy title for this person, 2–7 words."),
    archetype: str("Their role in the group, 2–4 words."),
    emoji: str("One emoji that fits them."),
    roast: str("The personal roast: 3–6 sentences, at least two concrete pieces of evidence from the chat (quote, event, number)."),
    superpower: str("One line: what they genuinely bring, said funny."),
    redFlag: str("One line: their most roastable habit."),
    signatureQuote: str("A real message this person wrote, verbatim from the transcript (may trim with …), ≤ 140 characters. Never a media placeholder."),
    advice: str("1–2 sentences the narrator would tell them privately; may be sincere."),
    closestTo: {
      anyOf: [{ type: "string" }, { type: "null" }],
      description: "Participant id of the person they're visibly closest to in the chat, or null.",
    },
  },
} as const;

const AWARD = {
  type: "object",
  additionalProperties: false,
  required: ["emoji", "title", "winnerId", "reason"],
  properties: {
    emoji: str("One emoji."),
    title: str("Award name, specific to this chat, 2–6 words."),
    winnerId: str("Participant id of the winner."),
    reason: str("1–2 sentences with the evidence."),
  },
} as const;

const TURNING_POINT = {
  anyOf: [
    {
      type: "object",
      additionalProperties: false,
      required: ["when", "title", "description"],
      properties: {
        when: str("A real date or period visible in the transcript, written in the report language (e.g. \"14 באוגוסט\", \"mid-September\")."),
        title: str("Punchy title for the moment, ≤ 8 words."),
        description: str("2–4 sentences: what happened and what changed after."),
      },
    },
    { type: "null" },
  ],
  description: "The moment the chat changed, or null if there is no real one.",
} as const;

const INSIDE_JOKE = {
  type: "object",
  additionalProperties: false,
  required: ["phrase", "explanation"],
  properties: {
    phrase: str("The recurring phrase exactly as the group writes it."),
    explanation: str("Where it came from and how it's used, 1–2 funny sentences."),
  },
} as const;

/** JSON Schema sent as `output_config.format.schema`. */
export const REPORT_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "title",
    "subtitle",
    "vibe",
    "verdict",
    "dynamics",
    "whoCares",
    "scores",
    "members",
    "awards",
    "turningPoint",
    "insideJokes",
    "advice",
    "closingLine",
    "followUps",
  ],
  properties: {
    title: str("Share-card headline, ≤ 80 characters, specific to this chat."),
    subtitle: str("One line in the narrator's voice under the title; mention the real total message count."),
    vibe: {
      type: "object",
      additionalProperties: false,
      required: ["emoji", "label"],
      properties: { emoji: str("One emoji."), label: str("2–5 word label for the group's vibe.") },
    },
    verdict: str("The main roast of the group: 2–4 short paragraphs separated by a blank line (\\n\\n)."),
    dynamics: str("What is really going on between these people: 1–3 paragraphs separated by \\n\\n."),
    whoCares: str("One paragraph: who writes first, who pretends not to care, who holds it together — with numbers."),
    scores: { type: "array", description: "Exactly 4 scores with categories invented for this chat.", items: SCORE },
    members: { type: "array", description: "One profile per participant listed under 'Members to profile', in that order.", items: MEMBER },
    awards: { type: "array", description: "5–8 awards, spread across people (max 2 per person).", items: AWARD },
    turningPoint: TURNING_POINT,
    insideJokes: { type: "array", description: "0–6 real recurring phrases from the chat.", items: INSIDE_JOKE },
    advice: str("What the narrator would do in their place: one concrete paragraph."),
    closingLine: str("Mic-drop final line, short."),
    followUps: { type: "array", description: "Exactly 4 tempting follow-up questions, in the report language, phrased as the user would ask them.", items: { type: "string" } },
  },
} as const;

/* ------------------------------------------------------------------ */
/* zod                                                                 */
/* ------------------------------------------------------------------ */

const nonEmpty = z.string().trim().min(1);

export const ReportScoreSchema = z.object({
  key: nonEmpty,
  label: nonEmpty,
  emoji: z.string(),
  value: z.number(),
  comment: z.string(),
});

export const MemberProfileSchema = z.object({
  id: nonEmpty,
  nickname: nonEmpty,
  archetype: z.string(),
  emoji: z.string(),
  roast: nonEmpty,
  superpower: z.string(),
  redFlag: z.string(),
  signatureQuote: z.string(),
  advice: z.string(),
  closestTo: z.string().nullable(),
});

export const ReportAwardSchema = z.object({
  emoji: z.string(),
  title: nonEmpty,
  winnerId: nonEmpty,
  reason: z.string(),
});

export const AIReportSchema = z.object({
  title: nonEmpty,
  subtitle: z.string(),
  vibe: z.object({ emoji: z.string(), label: z.string() }),
  verdict: nonEmpty,
  dynamics: z.string(),
  whoCares: z.string(),
  scores: z.array(ReportScoreSchema),
  members: z.array(MemberProfileSchema).min(1),
  awards: z.array(ReportAwardSchema),
  turningPoint: z.object({ when: z.string(), title: z.string(), description: z.string() }).nullable(),
  insideJokes: z.array(z.object({ phrase: nonEmpty, explanation: z.string() })),
  advice: z.string(),
  closingLine: z.string(),
  followUps: z.array(z.string()),
}) satisfies z.ZodType<AIReport>;

/* ------------------------------------------------------------------ */
/* Normalization                                                       */
/* ------------------------------------------------------------------ */

export const MAX_PROFILED_MEMBERS = 15;

export interface ReportCheck {
  /** Usable report (normalized), or null when the output can't be used at all. */
  report: AIReport | null;
  /** Problems worth one repair round-trip (missing members, wrong counts…). */
  problems: string[];
}

function clipTitle(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const sp = cut.lastIndexOf(" ");
  return (sp > max * 0.6 ? cut.slice(0, sp) : cut).trimEnd() + "…";
}

/** The ids that must get a profile: everyone, or the 15 most active in big groups. */
export function requiredMemberIds(participants: { id: string; messages: number }[]): string[] {
  return [...participants]
    .sort((a, b) => b.messages - a.messages)
    .slice(0, MAX_PROFILED_MEMBERS)
    .map((p) => p.id);
}

/**
 * Validates shape with zod, then repairs what can be repaired locally (unknown
 * ids, out-of-range scores, too many items) and lists what can't.
 */
export function checkReport(raw: unknown, participants: { id: string; messages: number }[]): ReportCheck {
  const parsed = AIReportSchema.safeParse(raw);
  if (!parsed.success) {
    const problems = parsed.error.issues.slice(0, 8).map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`);
    return { report: null, problems };
  }
  const r = structuredClone(parsed.data) as AIReport;
  const problems: string[] = [];
  const ids = new Set(participants.map((p) => p.id));
  const required = requiredMemberIds(participants);
  const order = new Map(required.map((id, i) => [id, i]));

  r.title = clipTitle(r.title, 100);

  // members: known ids only, no duplicates, in required order.
  const seen = new Set<string>();
  r.members = r.members.filter((m) => {
    if (!ids.has(m.id) || seen.has(m.id)) return false;
    seen.add(m.id);
    return true;
  });
  for (const m of r.members) {
    if (m.closestTo !== null && (!ids.has(m.closestTo) || m.closestTo === m.id)) m.closestTo = null;
    m.signatureQuote = m.signatureQuote.trim().replace(/^["“”״']+|["“”״']+$/g, "");
  }
  r.members.sort((a, b) => (order.get(a.id) ?? 999) - (order.get(b.id) ?? 999));
  const missing = required.filter((id) => !seen.has(id));
  if (missing.length) problems.push(`members is missing profiles for: ${missing.join(", ")} (one profile per required participant)`);
  if (r.members.length === 0) return { report: null, problems: ["members: no profile has a valid participant id"] };

  // scores: clamp, cap at 4.
  for (const s of r.scores) s.value = Math.max(0, Math.min(100, Math.round(Number(s.value) || 0)));
  if (r.scores.length > 4) r.scores = r.scores.slice(0, 4);
  if (r.scores.length < 4) problems.push(`scores has ${r.scores.length} items; exactly 4 are required`);

  // awards: known winners, cap at 8.
  const awardsBefore = r.awards.length;
  r.awards = r.awards.filter((a) => ids.has(a.winnerId)).slice(0, 8);
  if (r.awards.length < 3) problems.push(`awards has ${r.awards.length} valid items (winnerId must be a participant id); 5–8 are required`);
  else if (awardsBefore !== r.awards.length && r.awards.length < 5) problems.push("some awards had unknown winnerIds");

  r.insideJokes = r.insideJokes.slice(0, 6);
  r.followUps = r.followUps.map((q) => q.trim()).filter(Boolean).slice(0, 4);
  if (r.followUps.length < 2) problems.push("followUps needs 4 questions");
  if (r.turningPoint && !r.turningPoint.when.trim() && !r.turningPoint.title.trim()) r.turningPoint = null;

  return { report: r, problems };
}

/** Strict check used by tests and the demo: shape + ids + counts, no repairs needed. */
export function isCompleteReport(raw: unknown, participants: { id: string; messages: number }[]): boolean {
  const { report, problems } = checkReport(raw, participants);
  return report !== null && problems.length === 0;
}
