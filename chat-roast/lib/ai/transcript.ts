/**
 * Isomorphic helpers that turn a parsed chat + stats into the compact, redacted
 * payload we send to /api/report. Runs in the browser (wizard) and on the server
 * (defensive re-redaction). No Node-only APIs here.
 */

import type {
  ChatStats,
  ChatType,
  Intensity,
  Message,
  MessageKind,
  ParsedChat,
  PersonaId,
  ReportRequest,
  StatAward,
  SystemEvent,
  TranscriptMeta,
} from "../types";
import { dateKey, weekdayOf } from "../time";

/* ------------------------------------------------------------------ */
/* Redaction                                                           */
/* ------------------------------------------------------------------ */

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g;
// Explicit URLs. Hebrew/Arabic letters end a URL (people glue words to links).
const URL_RE = /\b(?:https?:\/\/|www\.)[^\s<>"'֐-׿؀-ۿ‎‏]+/gi;
// Bare domains ("ynet.co.il", "vm.tiktok.com/ZM123"). Not preceded by ":" so
// already-redacted "[link:tiktok.com]" is never matched again (idempotent).
const BARE_DOMAIN_RE =
  /(?<![\w.@:/-])(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(?:com|net|org|io|il|ly|be|gl|tv|app|me|gg|ai|dev|info|xyz|uk|de|fr|ru|es|nl|ca|au|link|site|page|shop)(?:\/[^\s<>"'֐-׿؀-ۿ]*)?(?![\w-])/gi;
const IBAN_RE = /\b[A-Z]{2}\d{2}(?:[ -]?(?=[A-Z0-9]{0,3}\d)[A-Z0-9]{4}){2,7}(?:[ -]?[A-Z0-9]{1,3})?\b/g;
const CARD_GROUPED_RE = /(?<!\d)(?:\d{4}[ -]){3}\d{1,7}(?!\d)/g;
const CARD_PLAIN_RE = /(?<!\d)\d{13,19}(?!\d)/g;
const INTL_PHONE_RE = /(?<![\w+])\+\d[\d \-().]{6,20}\d(?!\d)/g;
// Israeli mobile (05x-xxxxxxx), 07x VoIP and landlines (02/03/04/08/09), with or without 972.
const IL_PHONE_RE = /(?<![\d+])(?:972[ -]?|0)(?:5\d|7\d|[23489])(?:[ -]?\d){7}(?!\d)/g;
const ID_RE = /(?<!\d)\d{9}(?!\d)/g;
const LONG_DIGITS_RE = /(?<!\d)\d{10,12}(?!\d)/g;

const TRAILING_PUNCT = /[.,!?;:)\]}'"…]+$/;
const SECOND_LEVEL = new Set(["co", "org", "net", "ac", "gov", "muni", "k12", "idf", "com", "edu"]);

function registrableDomain(rawHost: string): string {
  const host = rawHost.toLowerCase().replace(/^www\./, "").replace(/:\d+$/, "");
  const parts = host.split(".").filter(Boolean);
  if (parts.length <= 2) return parts.join(".");
  const tld = parts[parts.length - 1];
  const sld = parts[parts.length - 2];
  if (tld.length === 2 && SECOND_LEVEL.has(sld)) return parts.slice(-3).join(".");
  return parts.slice(-2).join(".");
}

function linkPlaceholder(match: string): string {
  const trail = match.match(TRAILING_PUNCT)?.[0] ?? "";
  const url = trail ? match.slice(0, -trail.length) : match;
  const host = url.replace(/^[a-z]+:\/\//i, "").split(/[/?#]/)[0].split("@").pop() ?? "";
  const domain = registrableDomain(host);
  return (domain ? `[link:${domain}]` : "[link]") + trail;
}

/**
 * Masks personal data before anything leaves the device: phone numbers (Israeli
 * and international), emails, URLs (domain kept), card-like numbers, IBANs,
 * 9-digit ID-like numbers and other long digit runs. Idempotent.
 */
export function redact(text: string): string {
  if (!text) return text;
  let out = text;
  out = out.replace(EMAIL_RE, "[email]");
  out = out.replace(URL_RE, linkPlaceholder);
  out = out.replace(BARE_DOMAIN_RE, linkPlaceholder);
  out = out.replace(IBAN_RE, "[iban]");
  out = out.replace(CARD_GROUPED_RE, "[card]");
  out = out.replace(CARD_PLAIN_RE, "[card]");
  out = out.replace(INTL_PHONE_RE, (m) => {
    const digits = m.replace(/\D/g, "").length;
    return digits >= 8 && digits <= 15 ? "[phone]" : m;
  });
  out = out.replace(IL_PHONE_RE, "[phone]");
  out = out.replace(ID_RE, "[id]");
  out = out.replace(LONG_DIGITS_RE, "[number]");
  return out;
}

/* ------------------------------------------------------------------ */
/* Token estimation                                                    */
/* ------------------------------------------------------------------ */

/**
 * Conservative token estimate with per-script weights (Hebrew/Arabic/CJK
 * tokenize far worse than English). Deliberately errs on the high side.
 */
export function estimateTokens(text: string): number {
  let t = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    if (c < 0x80) {
      if ((c >= 0x41 && c <= 0x5a) || (c >= 0x61 && c <= 0x7a)) t += 0.27;
      else if (c >= 0x30 && c <= 0x39) t += 0.4;
      else if (c === 0x20) t += 0.15;
      else t += 0.35;
    } else if (c >= 0xd800 && c <= 0xdbff) {
      // astral plane: emoji and rare CJK -> one code point, count the pair once
      t += 2.2;
      i++;
    } else if (c >= 0x0590 && c <= 0x06ff) t += 0.62; // Hebrew + Arabic
    else if (c >= 0x0400 && c <= 0x04ff) t += 0.5; // Cyrillic
    else if (c >= 0x0900 && c <= 0x0dff) t += 0.9; // Indic
    else if (c >= 0x0e00 && c <= 0x0e7f) t += 0.9; // Thai
    else if ((c >= 0x3040 && c <= 0x30ff) || (c >= 0x3400 && c <= 0x9fff) || (c >= 0xac00 && c <= 0xd7af)) t += 1.25; // CJK / kana / Hangul
    else if (c >= 0x2000 && c <= 0x2bff) t += 1; // punctuation, arrows, symbols, BMP emoji
    else if (c === 0xfe0f || c === 0x200d) t += 0.5; // emoji modifiers / ZWJ
    else t += 0.6;
  }
  return Math.ceil(t * 1.05);
}

/* ------------------------------------------------------------------ */
/* Participants                                                        */
/* ------------------------------------------------------------------ */

/** Display names, redacted; names that were only a phone number become "Member N". */
export function participantNames(chat: ParsedChat): Map<string, string> {
  const map = new Map<string, string>();
  chat.participants.forEach((p, i) => {
    const cleaned = redact(stripMarks(p.displayName || "")).trim();
    const hasLetters = /\p{L}/u.test(cleaned.replace(/\[(?:phone|email|id|number|card|iban|link[^\]]*)\]/g, ""));
    map.set(p.id, hasLetters ? clip(cleaned, 40) : `Member ${i + 1}`);
  });
  return map;
}

function stripMarks(s: string): string {
  return s.replace(/[‎‏‪-‮⁦-⁩﻿]/g, "");
}

/* ------------------------------------------------------------------ */
/* Transcript                                                          */
/* ------------------------------------------------------------------ */

export const DEFAULT_TRANSCRIPT_TOKENS = 150_000;
const CLIP_AT = 520;
const CLIP_KEEP = 400;
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const KIND_TAG: Record<MessageKind, string> = {
  text: "",
  image: "[image]",
  video: "[video]",
  audio: "[voice note]",
  sticker: "[sticker]",
  gif: "[GIF]",
  document: "[document]",
  media: "[media]",
  deleted: "[deleted]",
  poll: "[poll]",
  location: "[location]",
  contact: "[contact card]",
  call: "[missed call]",
  viewonce: "[view once]",
};

/** Kinds whose text is just the placeholder (no caption worth keeping). */
const TAG_ONLY: ReadonlySet<MessageKind> = new Set(["deleted", "call", "viewonce", "contact"]);

/** Slice that never cuts a surrogate pair in half. */
function safeSlice(s: string, end: number): string {
  if (end >= s.length) return s;
  const c = s.charCodeAt(end - 1);
  if (c >= 0xd800 && c <= 0xdbff) end -= 1;
  return s.slice(0, end);
}

function clip(s: string, max: number): string {
  return s.length > max ? safeSlice(s, max - 1).trimEnd() + "…" : s;
}

function renderBody(m: Message): string {
  const tag = KIND_TAG[m.kind] ?? "[media]";
  let text = stripMarks(m.text || "")
    .replace(/\s*\n\s*/g, " ↵ ")
    .replace(/[ \t]+/g, " ")
    .trim();
  if (TAG_ONLY.has(m.kind)) text = "";
  text = redact(text);
  if (text.length > CLIP_AT) {
    const kept = safeSlice(text, CLIP_KEEP).trimEnd();
    text = `${kept}… [+${text.length - kept.length} chars]`;
  }
  let body = tag && text ? `${tag} ${text}` : tag || text || "[empty]";
  if (m.edited) body += " (edited)";
  return body;
}

function hhmm(ts: number): string {
  return new Date(ts).toISOString().slice(11, 16);
}

interface DayBlock {
  key: string;
  text: string;
  tokens: number;
  messages: number;
  firstMsgTs: number | null;
  lastMsgTs: number | null;
  lines: string[];
  /** Message count at each line index (to clip oversized days accurately). */
  lineMessages: number[];
}

type Item = { ts: number; msg?: Message; event?: SystemEvent };

const SKIP_EVENTS = new Set(["encryption", "security_code"]);

function buildDays(chat: ParsedChat): DayBlock[] {
  const items: Item[] = [];
  for (const m of chat.messages) items.push({ ts: m.ts, msg: m });
  for (const e of chat.systemEvents) if (!SKIP_EVENTS.has(e.type)) items.push({ ts: e.ts, event: e });
  // Stable sort: messages are already chronological; events slot in by time.
  items.sort((a, b) => a.ts - b.ts);

  // Map raw sender names in system events to the (possibly renamed) display names.
  const renames: [string, string][] = [];
  for (const p of chat.participants)
    for (const raw of p.originalNames)
      if (raw && raw !== p.displayName && raw.length >= 2) renames.push([raw, p.displayName]);
  renames.sort((a, b) => b[0].length - a[0].length);

  const days: DayBlock[] = [];
  let cur: DayBlock | null = null;
  let prev: { author: string; body: string; lineIdx: number; count: number } | null = null;

  for (const it of items) {
    const key = dateKey(it.ts);
    if (!cur || cur.key !== key) {
      cur = { key, text: "", tokens: 0, messages: 0, firstMsgTs: null, lastMsgTs: null, lines: [], lineMessages: [] };
      cur.lines.push(`## ${key} (${WEEKDAYS[weekdayOf(it.ts)]})`);
      cur.lineMessages.push(0);
      days.push(cur);
      prev = null;
    }
    if (it.msg) {
      const m = it.msg;
      const body = renderBody(m);
      cur.messages++;
      if (cur.firstMsgTs === null) cur.firstMsgTs = m.ts;
      cur.lastMsgTs = m.ts;
      if (prev && prev.author === m.author && prev.body === body) {
        prev.count++;
        cur.lines[prev.lineIdx] = `${cur.lines[prev.lineIdx].replace(/ ×\d+$/, "")} ×${prev.count}`;
        cur.lineMessages[prev.lineIdx]++;
        continue;
      }
      cur.lines.push(`${hhmm(m.ts)} ${m.author}: ${body}`);
      cur.lineMessages.push(1);
      prev = { author: m.author, body, lineIdx: cur.lines.length - 1, count: 1 };
    } else if (it.event) {
      let text = stripMarks(it.event.text || "").replace(/\s*\n\s*/g, " ").trim();
      for (const [raw, name] of renames) text = text.split(raw).join(name);
      cur.lines.push(`${hhmm(it.ts)} * ${clip(redact(text), 200)}`);
      cur.lineMessages.push(0);
      prev = null;
    }
  }
  for (const d of days) {
    d.text = d.lines.join("\n");
    d.tokens = estimateTokens(d.text) + 1;
  }
  return days;
}

function skippedMarker(days: DayBlock[]): string {
  const count = days.reduce((s, d) => s + d.messages, 0);
  const from = days[0].key;
  const to = days[days.length - 1].key;
  const range = from === to ? from : `${from} → ${to}`;
  return count > 0
    ? `[… ${count.toLocaleString("en-US")} messages skipped (${range}) …]`
    : `[… quiet stretch skipped (${range}) …]`;
}

/** Order indices so that taking a prefix samples the range evenly (BFS of midpoints). */
function spreadOrder(n: number): number[] {
  const order: number[] = [];
  const queue: [number, number][] = [[0, n - 1]];
  while (queue.length) {
    const [lo, hi] = queue.shift()!;
    if (lo > hi) continue;
    const mid = (lo + hi) >> 1;
    order.push(mid);
    queue.push([lo, mid - 1], [mid + 1, hi]);
  }
  return order;
}

/**
 * Compact, redacted transcript the model reads well:
 *   legend line, "## YYYY-MM-DD (Ddd)" day headers, "HH:MM p0: text" lines.
 * When over budget, keeps the first days and the most recent stretch, then adds
 * whole high-activity days and evenly spread days, marking skipped stretches.
 * Days are never cut in half (except a single day that alone exceeds the budget).
 */
export function buildTranscript(
  chat: ParsedChat,
  opts: { maxTokens?: number } = {},
): { transcript: string; meta: TranscriptMeta } {
  const budget = Math.max(2_000, opts.maxTokens ?? DEFAULT_TRANSCRIPT_TOKENS);
  const names = participantNames(chat);
  const legend = `PARTICIPANTS: ${chat.participants.map((p) => `${p.id}=${names.get(p.id)}`).join(", ")}`;
  const days = buildDays(chat);
  const totalMessages = chat.messages.length;

  const headerFor = (included: number) =>
    included >= totalMessages
      ? `TRANSCRIPT (all ${totalMessages.toLocaleString("en-US")} messages; times are local; "×N" = same message sent N times in a row)`
      : `TRANSCRIPT (sampled: ${included.toLocaleString("en-US")} of ${totalMessages.toLocaleString("en-US")} messages — first days, most recent stretch, busiest days and an even spread; skipped stretches are marked; times are local; "×N" = same message sent N times in a row)`;

  const headerTokens = estimateTokens(legend + "\n" + headerFor(totalMessages - 1)) + 4;
  const fullTokens = headerTokens + days.reduce((s, d) => s + d.tokens, 0);

  let selected: Set<number>;
  let partial: { index: number; text: string; messages: number; lastTs: number | null } | null = null;

  if (fullTokens <= budget) {
    selected = new Set(days.map((_, i) => i));
  } else {
    const MARKER_COST = 24;
    const avail = budget - headerTokens;
    selected = new Set();
    let used = 0;
    const cost = (i: number) => days[i].tokens + MARKER_COST;
    const tryAdd = (i: number, cap: number) => {
      if (selected.has(i)) return true;
      if (used + cost(i) > cap) return false;
      selected.add(i);
      used += cost(i);
      return true;
    };

    // 1. How it started: first days (≈15% of the budget, at least the first day).
    for (let i = 0; i < days.length; i++) {
      const cap = selected.size === 0 ? avail : avail * 0.15;
      if (!tryAdd(i, cap)) break;
    }
    // 2. The most recent stretch (up to ≈40% cumulative, at least the last day).
    for (let i = days.length - 1; i >= 0; i--) {
      if (selected.has(i)) break;
      const cap = i === days.length - 1 ? avail : avail * 0.4;
      if (!tryAdd(i, cap)) break;
    }
    // 3. Whole high-activity days (up to ≈65% cumulative).
    const byActivity = days
      .map((d, i) => ({ i, n: d.messages }))
      .filter((x) => !selected.has(x.i))
      .sort((a, b) => b.n - a.n || a.i - b.i);
    for (const { i } of byActivity) {
      if (used >= avail * 0.65) break;
      tryAdd(i, avail * 0.65);
    }
    // 4. An even spread across the whole span with what is left.
    const rest = days.map((_, i) => i).filter((i) => !selected.has(i));
    for (const k of spreadOrder(rest.length)) tryAdd(rest[k], avail);

    // A single day bigger than the whole budget: keep its beginning.
    if (selected.size === 0 && days.length > 0) {
      const d = days[0];
      let acc = 0;
      let msgs = 0;
      const keep: string[] = [];
      for (let li = 0; li < d.lines.length; li++) {
        const t = estimateTokens(d.lines[li]) + 1;
        if (acc + t > avail - MARKER_COST * 2) break;
        keep.push(d.lines[li]);
        acc += t;
        msgs += d.lineMessages[li];
      }
      const rest = d.messages - msgs;
      if (rest > 0) keep.push(`[… ${rest.toLocaleString("en-US")} more messages that day skipped …]`);
      const lastIncluded = msgs > 0 ? chat.messages.filter((m) => dateKey(m.ts) === d.key)[msgs - 1]?.ts ?? null : null;
      partial = { index: 0, text: keep.join("\n"), messages: msgs, lastTs: lastIncluded };
    }
  }

  // Assemble in chronological order with skip markers.
  const parts: string[] = [];
  let included = 0;
  let fromTs: number | null = null;
  let toTs: number | null = null;
  let gap: DayBlock[] = [];
  const flushGap = () => {
    if (gap.length) parts.push(skippedMarker(gap));
    gap = [];
  };
  days.forEach((d, i) => {
    if (partial && partial.index === i) {
      flushGap();
      parts.push(partial.text);
      included += partial.messages;
      if (partial.messages > 0) {
        fromTs ??= d.firstMsgTs;
        toTs = partial.lastTs ?? toTs;
      }
      return;
    }
    if (selected.has(i)) {
      flushGap();
      parts.push(d.text);
      included += d.messages;
      if (d.firstMsgTs !== null) {
        fromTs ??= d.firstMsgTs;
        toTs = d.lastMsgTs;
      }
    } else gap.push(d);
  });
  flushGap();

  const transcript = `${legend}\n${headerFor(included)}\n\n${parts.join("\n")}`;
  const meta: TranscriptMeta = {
    totalMessages,
    includedMessages: included,
    fromTs: fromTs ?? chat.messages[0]?.ts ?? 0,
    toTs: toTs ?? chat.messages[chat.messages.length - 1]?.ts ?? 0,
    truncated: included < totalMessages,
    approxTokens: estimateTokens(transcript),
  };
  return { transcript, meta };
}

/* ------------------------------------------------------------------ */
/* Stats digest                                                        */
/* ------------------------------------------------------------------ */

function fmtDuration(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || !isFinite(ms)) return "n/a";
  const s = ms / 1000;
  if (s < 90) return `${Math.round(s)}s`;
  const m = s / 60;
  if (m < 90) return `${Math.round(m)}m`;
  const h = m / 60;
  if (h < 36) return `${h.toFixed(1).replace(/\.0$/, "")}h`;
  return `${(h / 24).toFixed(1).replace(/\.0$/, "")} days`;
}

const pct = (x: number) => `${Math.round(x * 100)}%`;
const num = (n: number) => n.toLocaleString("en-US");
const counted = (list: [string, number][] | undefined, n: number, quote = false) =>
  (list ?? [])
    .slice(0, n)
    .map(([k, c]) => `${quote ? `"${redact(k)}"` : redact(k)}×${c}`)
    .join(" ");

function awardValue(a: StatAward): string {
  if (a.key === "speedy" || a.key === "slowpoke") return fmtDuration(a.value);
  if (a.value > 0 && a.value < 1) return pct(a.value);
  return Number.isInteger(a.value) ? num(a.value) : a.value.toFixed(1);
}

function shortDate(ts: number): string {
  return dateKey(ts);
}

/**
 * Compact, model-friendly text of the most roastable numbers (≈ < 2.5k tokens).
 * Computed on the FULL chat, so the model can quote totals even when the
 * transcript is sampled.
 */
export function buildStatsDigest(stats: ChatStats, chat: ParsedChat): string {
  const names = participantNames(chat);
  const who = (id: string) => `${id}`;
  const L: string[] = [];
  L.push(`STATS (computed on all ${num(stats.totalMessages)} messages; ids as in the transcript legend)`);
  L.push(
    `Span ${shortDate(stats.firstTs)} → ${shortDate(stats.lastTs)}: ${num(stats.daysSpan)} days, ${num(stats.activeDays)} active, avg ${stats.avgMessagesPerActiveDay.toFixed(1)} msgs/active day. ${num(stats.totalMessages)} messages, ${num(stats.totalWords)} words, ${stats.participantsCount} people.`,
  );
  const rec: string[] = [];
  if (stats.recordDay) rec.push(`record day ${stats.recordDay.date} (${num(stats.recordDay.count)} msgs)`);
  if (stats.longestStreak) rec.push(`longest daily streak ${stats.longestStreak.days} days (${stats.longestStreak.start} → ${stats.longestStreak.end})`);
  if (stats.longestSilence)
    rec.push(`longest silence ${fmtDuration(stats.longestSilence.ms)} (${shortDate(stats.longestSilence.fromTs)} → ${shortDate(stats.longestSilence.toTs)})`);
  if (rec.length) L.push(`Records: ${rec.join("; ")}.`);
  const peakHour = stats.hourly.indexOf(Math.max(...stats.hourly));
  const night = stats.hourly.slice(0, 5).reduce((a, b) => a + b, 0);
  const wd = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const busiestDay = stats.weekday.indexOf(Math.max(...stats.weekday));
  L.push(
    `Rhythm: ${num(stats.conversations)} conversations (new one after ≥4h silence); median reply ${fmtDuration(stats.medianReplyMs)}; ${pct(stats.quickReplyRate)} of replies within 60s; peak hour ${peakHour}:00; busiest weekday ${wd[busiestDay]}; ${num(night)} messages between 00:00–04:59 (${pct(stats.totalMessages ? night / stats.totalMessages : 0)}).`,
  );
  L.push(
    `Shabbat (Fri 18:00–Sat 19:00): ${stats.shabbat.silentWeeks} of ${stats.shabbat.weeks} weeks fully silent; ${num(stats.shabbat.messages)} messages sent on Shabbat.`,
  );
  const laughRec = stats.laugh.record
    ? `; longest laugh ${stats.laugh.record.length} chars by ${who(stats.laugh.record.authorId)} on ${shortDate(stats.laugh.record.ts)}`
    : "";
  L.push(`Laughs: ${num(stats.laugh.total)} total, avg length ${stats.laugh.avgLength.toFixed(1)} chars${laughRec}.`);
  const gm = stats.goodMorning;
  const gn = stats.goodNight;
  L.push(
    `Good morning said on ${gm.days} days (first to say it: ${counted(gm.firstSayers, 3) || "—"}); good night on ${gn.days} days (first: ${counted(gn.firstSayers, 3) || "—"}).`,
  );
  const mt = stats.mediaTotals;
  L.push(
    `Media: ${mt.image} images, ${mt.audio} voice notes/audio, ${mt.video} videos, ${mt.sticker} stickers, ${mt.gif} GIFs, ${mt.document} documents, ${mt.other} other; ${num(stats.deleted)} deleted messages; ${num(stats.links)} links.`,
  );
  if (stats.topWords.length) L.push(`Top words: ${counted(stats.topWords, 15)}`);
  if (stats.topEmojis.length) L.push(`Top emojis: ${counted(stats.topEmojis, 10)}`);
  if (stats.catchphrases.length)
    L.push(
      `Repeated phrases (likely catchphrases/inside jokes): ${stats.catchphrases
        .slice(0, 10)
        .map((c) => `"${redact(c.phrase)}"×${c.count} (mostly ${who(c.topAuthorId)})`)
        .join("; ")}`,
    );
  if (stats.longestMessage)
    L.push(
      `Longest message: ${who(stats.longestMessage.authorId)}, ${stats.longestMessage.words} words on ${shortDate(stats.longestMessage.ts)}: "${clip(redact(stats.longestMessage.text.replace(/\s+/g, " ")), 140)}"`,
    );

  const perPersonLines = (topWordsN: number, fullN: number) => {
    const out: string[] = ["", "PER PERSON (share = % of all messages)"];
    stats.perPerson.forEach((p, idx) => {
      const name = names.get(p.id) ?? p.name;
      if (idx >= fullN) return;
      const media = p.media;
      const bits = [
        `${num(p.messages)} msgs (${pct(p.share)})`,
        `${p.avgWordsPerMessage.toFixed(1)} words/msg`,
        `opened ${p.conversationStarts} conversations, last word before silence ${p.conversationEnds}×`,
        `median reply ${fmtDuration(p.medianReplyMs)}`,
        `night msgs ${p.nightMessages}`,
        `peak hour ${p.peakHour}:00`,
        `laughs ${p.laugh.count}${p.laugh.favorite ? ` (favorite "${p.laugh.favorite}", max ${p.laugh.maxLength} chars)` : ""}`,
        `voice notes ${p.voiceNotes}`,
        `images ${media.image}, stickers ${media.sticker}, GIFs ${media.gif}, videos ${media.video}`,
        `deleted ${p.deleted}, edited ${p.edited}`,
        `questions ${p.questions}`,
        `emoji-only msgs ${p.emojiOnly}`,
        `named by others ${p.mentionedByOthers}×`,
        `longest monologue ${p.longestMonologue} msgs in a row`,
        `good-morning ${p.goodMorning}, good-night ${p.goodNight}`,
        `links ${p.links}`,
      ];
      if (p.topEmojis.length) bits.push(`top emojis ${counted(p.topEmojis, 4)}`);
      if (topWordsN > 0 && p.topWords.length) bits.push(`top words ${counted(p.topWords, topWordsN)}`);
      out.push(`- ${p.id} ${name}: ${bits.join("; ")}`);
    });
    const others = stats.perPerson.slice(fullN);
    if (others.length) {
      const shown = others.slice(0, 25).map((p) => `${p.id} ${names.get(p.id) ?? p.name} ${p.messages}`);
      const more = others.length - shown.length;
      out.push(`- Others (msgs): ${shown.join(", ")}${more > 0 ? `, +${more} more` : ""}`);
    }
    return out;
  };

  const awards = stats.awards.length
    ? ["", `STAT AWARDS (computed, shown separately in the app): ${stats.awards.map((a) => `${a.key}→${who(a.winnerId)} (${awardValue(a)})`).join("; ")}`]
    : [];

  const LIMIT = 2_450;
  const attempts: [number, number][] = [
    [6, 15],
    [4, 15],
    [3, 12],
    [0, 12],
    [0, 8],
    [0, 5],
  ];
  let text = "";
  for (const [tw, full] of attempts) {
    text = [...L, ...perPersonLines(tw, full), ...awards].join("\n");
    if (estimateTokens(text) <= LIMIT) break;
  }
  return text;
}

/* ------------------------------------------------------------------ */
/* Request                                                             */
/* ------------------------------------------------------------------ */

export function buildReportRequest(args: {
  chat: ParsedChat;
  stats: ChatStats;
  chatType: ChatType;
  language: string;
  personaId: PersonaId;
  intensity: Intensity;
  groupName?: string;
  selfId?: string | null;
  extraContext?: string;
  maxTokens?: number;
}): ReportRequest {
  const { chat, stats } = args;
  const names = participantNames(chat);
  const { transcript, meta } = buildTranscript(chat, { maxTokens: args.maxTokens });
  const req: ReportRequest = {
    chatType: args.chatType,
    language: args.language,
    personaId: args.personaId,
    intensity: args.intensity,
    participants: chat.participants.map((p) => ({ id: p.id, name: names.get(p.id) ?? p.id, messages: p.messageCount })),
    transcript,
    transcriptMeta: meta,
    statsDigest: buildStatsDigest(stats, chat),
  };
  const groupName = redact(stripMarks(args.groupName ?? chat.title ?? "")).trim();
  if (groupName) req.groupName = clip(groupName, 80);
  const selfId = args.selfId ?? chat.participants.find((p) => p.isSelf)?.id ?? null;
  if (selfId && names.has(selfId)) req.selfId = selfId;
  const extra = redact(stripMarks(args.extraContext ?? "")).trim();
  if (extra) req.extraContext = clip(extra, 500);
  return req;
}
