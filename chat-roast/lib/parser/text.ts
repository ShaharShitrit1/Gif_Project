/**
 * WhatsApp `.txt` export → ParsedChat.
 *
 * Pipeline: split lines → match headers (continuations glue onto the previous entry) →
 * detect date order over ALL headers → build timestamps → split author/body →
 * system events vs messages (kind/attachment/edited) → participants → title → validate.
 */
import {
  ChatParseError,
  MIN_MESSAGES,
  type ExportFormat,
  type Message,
  type MessageKind,
  type ParsedChat,
  type Participant,
  type SystemEvent,
} from "../types";
import {
  ALL_MARKS_RE,
  AMPM_HEBREW_RE,
  AMPM_PM_RE,
  ANDROID_ATTACHED_RE,
  CALL_RE,
  DELETED_RE,
  EDITED_RE,
  ENCRYPTION_RE,
  GENERIC_PLACEHOLDER_RE,
  HEADER_RE,
  IOS_ATTACHED_RE,
  LEADING_MARKS_RE,
  LIVE_LOCATION_RE,
  LOCATION_RE,
  MEDIA_OMITTED_RE,
  OMITTED_TABLE,
  POLL_HEAD_RE,
  POLL_OPTION_RE,
  VIEW_ONCE_RE,
  WAITING_RE,
  kindFromFilename,
  quotedNameAtEnd,
  cleanText,
  startsWithMark,
  stripEdgeMarks,
  systemTypeOf,
  titleFromFilename,
} from "./patterns";

export interface ParseOptions {
  /** Original file name — used to detect the chat title ("WhatsApp Chat - X.zip"). */
  filename?: string;
  /**
   * Enforce MIN_MESSAGES / two-sender validation (default true). Tests and tooling may
   * pass false to parse tiny chats; the UI should always validate.
   */
  validate?: boolean;
}

type HeaderStyle = "bracket" | "dash" | "colon";

interface RawEntry {
  a: number;
  b: number;
  c: number;
  aDigits: number;
  h: number;
  mi: number;
  s: number;
  ampm: string | null;
  style: HeaderStyle;
  /** Text after the header on the first line. */
  rest: string;
  /** Continuation lines. */
  more: string[] | null;
}

const DAY_MS = 86_400_000;

/* ------------------------------------------------------------------ */
/* Header matching                                                     */
/* ------------------------------------------------------------------ */

function matchHeader(line: string): RawEntry | null {
  let l = line;
  const c0 = l.charCodeAt(0);
  // Fast path: a header starts with "[" or a digit (after optional bidi marks).
  if (!(c0 === 91 || (c0 >= 48 && c0 <= 57))) {
    l = l.replace(LEADING_MARKS_RE, "");
    const c1 = l.charCodeAt(0);
    if (!(c1 === 91 || (c1 >= 48 && c1 <= 57))) return null;
  }
  const m = HEADER_RE.exec(l);
  if (!m) return null;
  const bracketOpen = m[1] === "[";
  const bracketClose = m[10] === "]";
  if (bracketOpen !== bracketClose) return null;
  const style: HeaderStyle = bracketOpen ? "bracket" : m[11] || m[12] ? "dash" : "colon";
  return {
    a: +m[2],
    aDigits: m[2].length,
    b: +m[4],
    c: +m[5],
    h: +m[6],
    mi: +m[7],
    s: m[8] ? +m[8] : 0,
    ampm: m[9] ?? null,
    style,
    rest: l.slice(m[0].length),
    more: null,
  };
}

/* ------------------------------------------------------------------ */
/* Dates                                                               */
/* ------------------------------------------------------------------ */

type DateOrder = ParsedChat["dateOrder"];

function fullYear(y: number): number {
  return y < 100 ? 2000 + y : y;
}

function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** [year, month(1-12), day] for an entry under a given order, or null when impossible. */
function ymd(e: RawEntry, order: DateOrder): [number, number, number] | null {
  let y: number, mo: number, d: number;
  if (order === "YMD") {
    y = e.a;
    mo = e.b;
    d = e.c;
  } else if (order === "DMY") {
    d = e.a;
    mo = e.b;
    y = e.c;
  } else {
    mo = e.a;
    d = e.b;
    y = e.c;
  }
  y = fullYear(y);
  if (mo < 1 || mo > 12 || d < 1 || y < 2000 || y > 2100) return null;
  if (d > 28 && d > daysInMonth(y, mo)) return null;
  return [y, mo, d];
}

function dayNumber(e: RawEntry, order: DateOrder): number | null {
  const r = ymd(e, order);
  return r ? Date.UTC(r[0], r[1] - 1, r[2]) / DAY_MS : null;
}

interface OrderDecision {
  order: DateOrder;
  ambiguous: boolean;
}

function detectDateOrder(entries: RawEntry[], hebrewHint: boolean, englishAmPm: boolean): OrderDecision {
  let ymdVotes = 0;
  let aOver12 = 0;
  let bOver12 = 0;
  for (const e of entries) {
    if (e.aDigits === 4) ymdVotes++;
    else {
      if (e.a > 12) aOver12++;
      if (e.b > 12) bOver12++;
    }
  }
  if (ymdVotes > entries.length / 2) return { order: "YMD", ambiguous: false };
  if (aOver12 > 0 && bOver12 === 0) return { order: "DMY", ambiguous: false };
  if (bOver12 > 0 && aOver12 === 0) return { order: "MDY", ambiguous: false };

  // Ambiguous (or contradictory): the right order keeps dates valid and monotonic; failing
  // that, it packs the same messages into the shorter span (1/6…12/6 is 12 days, not 12 months).
  const score = (order: DateOrder) => {
    let invalid = 0;
    let backwards = 0;
    let prev: number | null = null;
    let min = Infinity;
    let max = -Infinity;
    for (const e of entries) {
      if (e.aDigits === 4) continue;
      const dn = dayNumber(e, order);
      if (dn === null) {
        invalid++;
        continue;
      }
      if (prev !== null && dn < prev) backwards++;
      prev = dn;
      if (dn < min) min = dn;
      if (dn > max) max = dn;
    }
    return { bad: invalid * 1000 + backwards, span: max >= min ? max - min : 0 };
  };
  const dmy = score("DMY");
  const mdy = score("MDY");
  if (dmy.bad !== mdy.bad) return { order: dmy.bad < mdy.bad ? "DMY" : "MDY", ambiguous: false };
  if (dmy.span !== mdy.span) return { order: dmy.span < mdy.span ? "DMY" : "MDY", ambiguous: false };
  // Truly ambiguous (e.g. a single day ≤ 12): use locale hints.
  const order: DateOrder = hebrewHint ? "DMY" : englishAmPm ? "MDY" : "DMY";
  return { order, ambiguous: entries.length > 1 };
}

function timestampOf(e: RawEntry, order: DateOrder): number | null {
  const date = ymd(e, e.aDigits === 4 ? "YMD" : order);
  if (!date) return null;
  let h = e.h;
  if (e.ampm) {
    const pm = AMPM_PM_RE.test(e.ampm);
    if (h > 12) {
      // "13:05 PM" — trust the 24h value.
    } else {
      h = (h % 12) + (pm ? 12 : 0);
    }
  }
  if (h > 23 || e.mi > 59 || e.s > 59) return null;
  return Date.UTC(date[0], date[1] - 1, date[2], h, e.mi, e.s);
}

/* ------------------------------------------------------------------ */
/* Names                                                               */
/* ------------------------------------------------------------------ */

const TILDE_RE = /^~[\s  ]*/;

/** "‪~ Dana 🌴‬" → "Dana 🌴" ; "‪+972 50‑123‑4567‬" → "+972 50‑123‑4567". */
export function cleanName(raw: string): string {
  return raw
    .replace(ALL_MARKS_RE, "")
    .replace(/[\s  ]+/g, " ")
    .trim()
    .replace(TILDE_RE, "")
    .trim();
}

/* ------------------------------------------------------------------ */
/* Message bodies                                                      */
/* ------------------------------------------------------------------ */

interface Classified {
  kind: MessageKind;
  text: string;
  edited: boolean;
  attachment?: string;
}

function joinCaption(sameLine: string, restLines: string): string {
  return stripEdgeMarks([sameLine, restLines].filter((s) => s && stripEdgeMarks(s)).join("\n"));
}

function classifyBody(body: string): Classified {
  let edited = false;
  let text = body;
  if (text.indexOf("<") !== -1 && EDITED_RE.test(text)) {
    edited = true;
    text = text.replace(EDITED_RE, "");
  }
  text = cleanText(text);
  const nl = text.indexOf("\n");
  const firstLine = stripEdgeMarks(nl === -1 ? text : text.slice(0, nl));
  const restLines = nl === -1 ? "" : stripEdgeMarks(text.slice(nl + 1));
  // Placeholders never carry bidi marks in the middle that matter; drop them for matching.
  const probe = firstLine.indexOf("‎") !== -1 || firstLine.indexOf("‏") !== -1
    ? firstLine.replace(ALL_MARKS_RE, "")
    : firstLine;

  // Zip exports: attachments.
  if (probe.charCodeAt(0) === 60 /* < */) {
    const ios = IOS_ATTACHED_RE.exec(probe);
    if (ios) {
      const file = ios[1].trim();
      return { kind: kindFromFilename(file), text: joinCaption(ios[2], restLines), edited, attachment: file };
    }
  }
  if (probe.indexOf("(") !== -1) {
    const android = ANDROID_ATTACHED_RE.exec(probe);
    if (android) {
      const file = android[1].trim();
      return { kind: kindFromFilename(file), text: joinCaption(android[2], restLines), edited, attachment: file };
    }
  }

  // Polls (multi-line).
  const poll = POLL_HEAD_RE.exec(probe);
  if (poll) {
    const lines = [poll[1], ...restLines.split("\n")].map((l) => stripEdgeMarks(l)).filter(Boolean);
    const out: string[] = [];
    for (const l of lines) {
      const opt = POLL_OPTION_RE.exec(l);
      out.push(opt ? `• ${opt[1].trim()}` : l);
    }
    return { kind: "poll", text: out.join("\n"), edited };
  }

  if (restLines === "") {
    if (MEDIA_OMITTED_RE.test(probe)) return { kind: "media", text: "", edited };
    if (DELETED_RE.test(probe)) return { kind: "deleted", text: "", edited: false };
    for (const [re, kind] of OMITTED_TABLE) {
      if (re.test(probe)) return { kind, text: "", edited };
    }
    if (CALL_RE.test(probe)) return { kind: "call", text: "", edited: false };
    if (VIEW_ONCE_RE.test(probe)) return { kind: "viewonce", text: "", edited: false };
    if (LIVE_LOCATION_RE.test(probe)) return { kind: "location", text: "", edited };
    if (WAITING_RE.test(probe)) return { kind: "media", text: "", edited: false };
    if (GENERIC_PLACEHOLDER_RE.test(probe)) return { kind: "media", text: "", edited };
  }
  if (LOCATION_RE.test(probe) && /https?:\/\/|geo:|maps\./i.test(probe)) {
    // The URL carries exact coordinates — keep it out of the text (privacy).
    return { kind: "location", text: restLines, edited };
  }
  return { kind: "text", text, edited };
}

/* ------------------------------------------------------------------ */
/* Main                                                                */
/* ------------------------------------------------------------------ */

const STRONG_SYSTEM = new Set(["encryption", "created", "subject", "icon", "description", "number_changed", "security_code", "disappearing"]);
const ENCRYPTION_START_RE = /^(?:Messages and calls are|Messages to this group|Messages you send|ההודעות והשיחות|ההודעות בקבוצה|ההודעות שנשלחות)/i;

export function parseChatText(input: string, opts: ParseOptions = {}): ParsedChat {
  const validate = opts.validate !== false;
  let text = input;
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  if (text.indexOf("\r") !== -1) text = text.replace(/\r\n?/g, "\n");
  const lines = text.split("\n");

  const entries: RawEntry[] = [];
  let preamble = 0;
  let cur: RawEntry | null = null;
  for (const line of lines) {
    const e = matchHeader(line);
    if (e) {
      entries.push(e);
      cur = e;
    } else if (cur) {
      (cur.more ??= []).push(line);
    } else if (line.trim()) {
      preamble++;
    }
  }

  if (entries.length === 0) {
    throw new ChatParseError("not_chat_export", { lines: lines.filter((l) => l.trim()).length });
  }

  // Locale hints for ambiguous dates.
  let hebrewHint = false;
  let englishAmPm = false;
  for (let i = 0; i < entries.length && i < 5000; i++) {
    const e = entries[i];
    if (e.ampm) {
      if (AMPM_HEBREW_RE.test(e.ampm)) hebrewHint = true;
      else englishAmPm = true;
    }
    if (!hebrewHint && i < 400 && /[֐-׿]/.test(e.rest)) hebrewHint = true;
  }
  const { order: detectedOrder, ambiguous } = detectDateOrder(entries, hebrewHint, englishAmPm);
  const ymdCount = entries.reduce((n, e) => n + (e.aDigits === 4 ? 1 : 0), 0);
  const dateOrder: DateOrder = ymdCount > entries.length / 2 ? "YMD" : detectedOrder;

  let bracket = 0;
  let dash = 0;
  let colon = 0;
  for (const e of entries) {
    if (e.style === "bracket") bracket++;
    else if (e.style === "dash") dash++;
    else colon++;
  }
  const format: ExportFormat =
    bracket + colon > dash ? "ios" : dash > 0 ? "android" : "unknown";

  const messages: Message[] = [];
  const systemEvents: SystemEvent[] = [];
  const nameToIndex = new Map<string, number>();
  const people: { names: string[]; count: number; first: number; last: number; firstOrder: number }[] = [];
  const chatNameAuthors = new Set<string>();
  const authorSystemCache = new Map<string, ReturnType<typeof systemTypeOf>>();
  let chatNameAuthor: string | null = null;
  let latestSubject: string | null = null;
  let createdName: string | null = null;
  let badDates = 0;
  let emptyMessages = 0;
  let backwards = 0;
  let maxTs = -Infinity;

  const pushSystem = (ts: number, body: string, typeHint?: ReturnType<typeof systemTypeOf>) => {
    const t = cleanText(body);
    const type = typeHint ?? systemTypeOf(t) ?? "other";
    systemEvents.push({ ts, type, text: t });
    if (type === "subject") {
      const name = quotedNameAtEnd(t);
      if (name) latestSubject = name;
    } else if (type === "created") {
      const name = quotedNameAtEnd(t);
      if (name) createdName = name;
    }
  };

  for (const e of entries) {
    const ts = timestampOf(e, dateOrder);
    if (ts === null) {
      badDates++;
      continue;
    }
    let body = e.rest;
    if (e.more) {
      let end = e.more.length;
      while (end > 0 && !e.more[end - 1].trim()) end--;
      if (end > 0) body = body + "\n" + e.more.slice(0, end).join("\n");
    }

    // Author split: "Name: body". No ": " → system line.
    let colonAt = body.indexOf(": ");
    if (colonAt === -1 && body.endsWith(":") && body.indexOf("\n") === -1) colonAt = body.length - 1;
    const firstNl = body.indexOf("\n");
    if (colonAt === -1 || (firstNl !== -1 && colonAt > firstNl)) {
      pushSystem(ts, body);
      continue;
    }
    const rawAuthor = body.slice(0, colonAt);
    const author = cleanName(rawAuthor);
    const rest = body.slice(colonAt + 2);
    if (!author || author.length > 60) {
      pushSystem(ts, body);
      continue;
    }
    // "Dana changed the subject to "Trip: Eilat"" — the colon lives inside the system text.
    let authorAsSystem = authorSystemCache.get(author);
    if (authorAsSystem === undefined) {
      authorAsSystem = systemTypeOf(author);
      authorSystemCache.set(author, authorAsSystem);
    }
    if (authorAsSystem && authorAsSystem !== "other") {
      pushSystem(ts, body, authorAsSystem);
      continue;
    }
    // iOS: system lines are "authored" by the chat name, body starts with a bidi mark.
    if ((e.style !== "dash" && startsWithMark(rest)) || ENCRYPTION_RE.test(rest)) {
      const bodyClean = stripEdgeMarks(rest);
      const type = systemTypeOf(bodyClean);
      const isEncryption = type === "encryption" && (startsWithMark(rest) || ENCRYPTION_START_RE.test(bodyClean));
      const isStrong = type !== null && STRONG_SYSTEM.has(type) && startsWithMark(rest);
      const isKnown = type !== null && chatNameAuthors.has(author) && startsWithMark(rest);
      if (isEncryption || isStrong || isKnown) {
        chatNameAuthors.add(author);
        if (chatNameAuthor === null) chatNameAuthor = author;
        pushSystem(ts, bodyClean, type);
        continue;
      }
    }

    const cls = classifyBody(rest);
    if (cls.kind === "text" && !cls.text) {
      emptyMessages++;
      continue;
    }
    let idx = nameToIndex.get(author);
    if (idx === undefined) {
      idx = people.length;
      nameToIndex.set(author, idx);
      people.push({ names: [author], count: 0, first: ts, last: ts, firstOrder: idx });
    }
    const p = people[idx];
    p.count++;
    if (ts < p.first) p.first = ts;
    if (ts > p.last) p.last = ts;
    if (ts < maxTs - 60_000) backwards++;
    if (ts > maxTs) maxTs = ts;

    const msg: Message = { id: messages.length, ts, author: `p${idx}`, text: cls.text, kind: cls.kind };
    if (cls.edited) msg.edited = true;
    if (cls.attachment) msg.attachment = cls.attachment;
    messages.push(msg);
  }

  const participants: Participant[] = people.map((p, i) => ({
    id: `p${i}`,
    originalNames: p.names,
    displayName: p.names[0],
    messageCount: p.count,
    firstTs: p.first,
    lastTs: p.last,
  }));
  sortParticipants(participants);

  const warnings: string[] = [];
  if (preamble > 0) warnings.push(`Skipped ${preamble} unparseable line${preamble === 1 ? "" : "s"} before the first message.`);
  if (badDates > 0) warnings.push(`Skipped ${badDates} line${badDates === 1 ? "" : "s"} with an impossible date.`);
  if (emptyMessages > 0) warnings.push(`Ignored ${emptyMessages} empty message${emptyMessages === 1 ? "" : "s"}.`);
  if (backwards > 0) warnings.push(`${backwards} message${backwards === 1 ? " is" : "s are"} out of chronological order.`);
  if (ambiguous) warnings.push(`Day/month order was ambiguous; assumed ${dateOrder === "MDY" ? "MM/DD" : "DD/MM"}.`);

  // iOS chat-name author = name at export time; then the latest rename seen in the history
  // (full fidelity), then the file name (may be sanitized/truncated), then the creation name.
  const title =
    chatNameAuthor ?? latestSubject ?? titleFromFilename(opts.filename) ?? createdName ?? undefined;

  const chat: ParsedChat = {
    format,
    dateOrder,
    messages,
    systemEvents,
    participants,
    warnings,
  };
  if (title) chat.title = title;

  if (messages.length === 0) {
    if (systemEvents.length > 0) throw new ChatParseError("empty_chat_export", { systemEvents: systemEvents.length });
    throw new ChatParseError("not_chat_export", { lines: lines.length });
  }
  if (validate) {
    if (participants.length < 2) {
      throw new ChatParseError("single_sender_chat", {
        messageCount: messages.length,
        name: participants[0]?.displayName ?? "",
      });
    }
    if (messages.length < MIN_MESSAGES) {
      throw new ChatParseError("too_few_messages", { messageCount: messages.length, min: MIN_MESSAGES });
    }
  }
  return chat;
}

/** messageCount desc, then first message asc, then id. Mutates the array (callers pass fresh arrays). */
export function sortParticipants(list: Participant[]): void {
  list.sort(
    (x, y) =>
      y.messageCount - x.messageCount ||
      x.firstTs - y.firstTs ||
      Number(x.id.slice(1)) - Number(y.id.slice(1)),
  );
}
