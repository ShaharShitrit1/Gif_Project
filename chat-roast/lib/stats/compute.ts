/**
 * computeStats(chat) — every ChatStats / PersonStats field in a few linear passes.
 * Deterministic (stable tie-breaks everywhere) and O(n log n) at worst (medians, top-k).
 */
import {
  CONVERSATION_GAP_MS,
  type ChatStats,
  type Counted,
  type DayCount,
  type Message,
  type MessageKind,
  type ParsedChat,
  type PersonStats,
} from "../types";
import { computeAwards, type AwardInput } from "./awards";
import { findCatchphrases, type TokenSegments } from "./catchphrases";
import { NOISE_WORDS, STOP_WORDS } from "./stopwords";
import {
  HEBREW_PREFIX_LETTERS,
  LAUGH_EMOJIS,
  URL_RE,
  WORD_RE,
  emojiKey,
  firstNameToken,
  greetingOf,
  isHebrewToken,
  isLaughToken,
  isNumberToken,
  scanEmojis,
} from "./text";

const MINUTE = 60_000;
const HOUR = 3_600_000;
const DAY = 86_400_000;
const QUICK_REPLY_MS = MINUTE;
const TOP_WORDS = 30;
const TOP_WORDS_PERSON = 12;
const TOP_EMOJIS = 20;
const TOP_EMOJIS_PERSON = 10;
const LONG_TEXT_CAP = 1200;
const LAUGH_TEXT_CAP = 120;

type MediaKey = keyof PersonStats["media"];

function mediaKeyOf(kind: MessageKind): MediaKey | null {
  switch (kind) {
    case "image":
    case "video":
    case "audio":
    case "sticker":
    case "gif":
    case "document":
      return kind;
    case "media":
    case "viewonce":
    case "contact":
      return "other";
    default:
      return null;
  }
}

function emptyMedia(): PersonStats["media"] {
  return { image: 0, video: 0, audio: 0, sticker: 0, gif: 0, document: 0, other: 0 };
}

function isVoiceNote(m: Message): boolean {
  if (m.kind !== "audio") return false;
  if (!m.attachment) return true; // iOS "audio omitted" is a voice note in practice
  return /(?:^|[-_])PTT[-_]|\.opus$/i.test(m.attachment);
}

function median(values: number[]): number | null {
  const n = values.length;
  if (n === 0) return null;
  const a = Float64Array.from(values).sort();
  return n % 2 ? a[(n - 1) >> 1] : (a[n / 2 - 1] + a[n / 2]) / 2;
}

function capText(text: string, cap: number): string {
  if (text.length <= cap) return text;
  return text.slice(0, cap - 1).trimEnd() + "…";
}

/** Top-k of a count map, count desc then first-seen order (insertion order of the Map). */
function topK<K>(map: Map<K, number>, k: number, label: (key: K) => string): Counted[] {
  const arr: [K, number, number][] = [];
  let i = 0;
  for (const [key, count] of map) arr.push([key, count, i++]);
  arr.sort((a, b) => b[1] - a[1] || a[2] - b[2]);
  return arr.slice(0, k).map(([key, count]) => [label(key), count]);
}

function dayKey(dayAbs: number): string {
  return new Date(dayAbs * DAY).toISOString().slice(0, 10);
}

interface PersonAcc {
  id: string;
  name: string;
  messages: number;
  words: number;
  wordMessages: number;
  media: PersonStats["media"];
  voiceNotes: number;
  deleted: number;
  edited: number;
  links: number;
  questions: number;
  emojis: Map<string, number>;
  emojiTotal: number;
  wordCounts: Map<number, number>;
  longest: { text: string; ts: number; words: number } | null;
  starts: number;
  ends: number;
  replies: number[];
  night: number;
  early: number;
  hourly: number[];
  laughCount: number;
  laughLenSum: number;
  laughMax: number;
  laughForms: Map<string, number>;
  goodMorning: number;
  goodNight: number;
  emojiOnly: number;
  mentioned: number;
  monologue: number;
}

function newAcc(id: string, name: string): PersonAcc {
  return {
    id,
    name,
    messages: 0,
    words: 0,
    wordMessages: 0,
    media: emptyMedia(),
    voiceNotes: 0,
    deleted: 0,
    edited: 0,
    links: 0,
    questions: 0,
    emojis: new Map(),
    emojiTotal: 0,
    wordCounts: new Map(),
    longest: null,
    starts: 0,
    ends: 0,
    replies: [],
    night: 0,
    early: 0,
    hourly: new Array(24).fill(0),
    laughCount: 0,
    laughLenSum: 0,
    laughMax: 0,
    laughForms: new Map(),
    goodMorning: 0,
    goodNight: 0,
    emojiOnly: 0,
    mentioned: 0,
    monologue: 0,
  };
}

function emptyStats(chat: ParsedChat): ChatStats {
  return {
    totalMessages: 0,
    totalWords: 0,
    participantsCount: chat.participants.length,
    firstTs: 0,
    lastTs: 0,
    daysSpan: 0,
    activeDays: 0,
    avgMessagesPerActiveDay: 0,
    perPerson: chat.participants.map((p) => finalizePerson(newAcc(p.id, p.displayName), 0, () => "", (k) => k)),
    daily: [],
    monthly: [],
    hourly: new Array(24).fill(0),
    weekday: new Array(7).fill(0),
    recordDay: null,
    longestStreak: null,
    longestSilence: null,
    conversations: 0,
    medianReplyMs: null,
    quickReplyRate: 0,
    topWords: [],
    topEmojis: [],
    catchphrases: [],
    laugh: { total: 0, avgLength: 0, record: null },
    goodMorning: { days: 0, firstSayers: [] },
    goodNight: { days: 0, firstSayers: [] },
    shabbat: { weeks: 0, silentWeeks: 0, messages: 0 },
    firstMessages: [],
    lastMessages: [],
    longestMessage: null,
    mediaTotals: emptyMedia(),
    deleted: 0,
    links: 0,
    awards: [],
  };
}

function finalizePerson(p: PersonAcc, total: number, word: (id: number) => string, emoji: (key: string) => string): PersonStats {
  let peakHour = 0;
  for (let h = 1; h < 24; h++) if (p.hourly[h] > p.hourly[peakHour]) peakHour = h;
  let favorite: string | null = null;
  let favCount = 0;
  for (const [form, c] of p.laughForms) {
    if (c > favCount) {
      favorite = form;
      favCount = c;
    }
  }
  return {
    id: p.id,
    name: p.name,
    messages: p.messages,
    share: total > 0 ? p.messages / total : 0,
    words: p.words,
    avgWordsPerMessage: p.wordMessages > 0 ? p.words / p.wordMessages : 0,
    media: p.media,
    voiceNotes: p.voiceNotes,
    deleted: p.deleted,
    edited: p.edited,
    links: p.links,
    questions: p.questions,
    topEmojis: topK(p.emojis, TOP_EMOJIS_PERSON, emoji),
    topWords: topK(p.wordCounts, TOP_WORDS_PERSON, word),
    longestMessage: p.longest,
    conversationStarts: p.starts,
    medianReplyMs: median(p.replies),
    nightMessages: p.night,
    peakHour,
    hourly: p.hourly,
    laugh: {
      count: p.laughCount,
      avgLength: p.laughCount > 0 ? p.laughLenSum / p.laughCount : 0,
      maxLength: p.laughMax,
      favorite,
    },
    goodMorning: p.goodMorning,
    goodNight: p.goodNight,
    emojiOnly: p.emojiOnly,
    mentionedByOthers: p.mentioned,
    longestMonologue: p.monologue,
    conversationEnds: p.ends,
  };
}

export function computeStats(chat: ParsedChat): ChatStats {
  const msgs = chat.messages;
  if (msgs.length === 0) return emptyStats(chat);

  /* ---------- people ---------- */
  const people: PersonAcc[] = [];
  const indexOf = new Map<string, number>();
  for (const p of chat.participants) {
    indexOf.set(p.id, people.length);
    people.push(newAcc(p.id, p.displayName));
  }
  const personIdx = (author: string) => {
    let i = indexOf.get(author);
    if (i === undefined) {
      i = people.length;
      indexOf.set(author, i);
      people.push(newAcc(author, author));
    }
    return i;
  };

  // First-name tokens → people (for mentions).
  const nameMap = new Map<string, number[]>();
  for (let i = 0; i < people.length; i++) {
    const t = firstNameToken(people[i].name);
    if (!t || STOP_WORDS.has(t)) continue;
    const list = nameMap.get(t);
    if (list) list.push(i);
    else nameMap.set(t, [i]);
  }

  /* ---------- span ---------- */
  let firstTs = Infinity;
  let lastTs = -Infinity;
  for (const m of msgs) {
    if (m.ts < firstTs) firstTs = m.ts;
    if (m.ts > lastTs) lastTs = m.ts;
  }
  const firstDay = Math.floor(firstTs / DAY);
  const lastDay = Math.floor(lastTs / DAY);
  const spanDays = lastDay - firstDay + 1;
  const daily = new Int32Array(spanDays);

  // Month index per day of span.
  const firstDate = new Date(firstDay * DAY);
  const firstMonthAbs = firstDate.getUTCFullYear() * 12 + firstDate.getUTCMonth();
  const lastDate = new Date(lastDay * DAY);
  const monthsSpan = lastDate.getUTCFullYear() * 12 + lastDate.getUTCMonth() - firstMonthAbs + 1;
  const dayMonth = new Int32Array(spanDays);
  {
    let y = firstDate.getUTCFullYear();
    let mo = firstDate.getUTCMonth();
    let d = firstDate.getUTCDate();
    let dim = new Date(Date.UTC(y, mo + 1, 0)).getUTCDate();
    for (let i = 0; i < spanDays; i++) {
      dayMonth[i] = y * 12 + mo - firstMonthAbs;
      if (++d > dim) {
        d = 1;
        if (++mo > 11) {
          mo = 0;
          y++;
        }
        dim = new Date(Date.UTC(y, mo + 1, 0)).getUTCDate();
      }
    }
  }
  const P = people.length;
  const monthly = new Int32Array(monthsSpan);
  const monthlyBy = new Int32Array(monthsSpan * Math.max(P, 1));

  /* ---------- accumulators ---------- */
  const hourly = new Array<number>(24).fill(0);
  const weekday = new Array<number>(7).fill(0);
  const mediaTotals = emptyMedia();
  let totalWords = 0;
  let deletedTotal = 0;
  let linksTotal = 0;

  const dict = new Map<string, number>();
  const dictWords: string[] = [];
  const wordTotals: number[] = [];
  const tokenId = (w: string) => {
    let id = dict.get(w);
    if (id === undefined) {
      id = dictWords.length;
      dict.set(w, id);
      dictWords.push(w);
      wordTotals.push(0);
    }
    return id;
  };

  const emojiTotals = new Map<string, number>();
  const emojiDisplay = new Map<string, string>();

  let laughTotal = 0;
  let laughLenSum = 0;
  let laughRecord: ChatStats["laugh"]["record"] = null;

  const gmDays = new Map<number, number>(); // day → first sayer
  const gnDays = new Map<number, number>();
  const gmSeen = new Set<number>();
  const gnSeen = new Set<number>();

  const shabbatCounts = new Map<number, number>(); // friday day → messages

  let conversations = 0;
  const allReplies: number[] = [];
  let quickReplies = 0;

  let longestSilence: ChatStats["longestSilence"] = null;
  let longestMessage: ChatStats["longestMessage"] = null;

  // Catchphrase material: runs of ≥ 2 tokens with no punctuation between them.
  const segTokens: number[] = [];
  const segStart: number[] = [];
  const segEnd: number[] = [];
  const segAuthor: number[] = [];
  const segMsg: number[] = [];

  let runAuthor = -1;
  let runLen = 0;
  let prevTs = -Infinity;
  let maxTsSoFar = -Infinity;
  let prevAuthor = -1;

  const mentionHits = new Set<number>();

  const recordLaugh = (p: PersonAcc, ts: number, form: string, length: number, text: string) => {
    p.laughCount++;
    p.laughLenSum += length;
    if (length > p.laughMax) p.laughMax = length;
    const f = form.length > 16 ? form.slice(0, 16) : form;
    p.laughForms.set(f, (p.laughForms.get(f) ?? 0) + 1);
    laughTotal++;
    laughLenSum += length;
    if (!laughRecord || length > laughRecord.length) {
      laughRecord = { length, authorId: p.id, ts, text: capText(text, LAUGH_TEXT_CAP) };
    }
  };

  for (let mi = 0; mi < msgs.length; mi++) {
    const m = msgs[mi];
    const ai = personIdx(m.author);
    const p = people[ai];
    const ts = m.ts;
    p.messages++;

    /* time buckets */
    const dayAbs = Math.floor(ts / DAY);
    const dayIdx = dayAbs - firstDay;
    const hour = Math.floor((ts - dayAbs * DAY) / HOUR);
    const wd = (((dayAbs + 4) % 7) + 7) % 7; // 1970-01-01 was a Thursday
    daily[dayIdx]++;
    const mIdx = dayMonth[dayIdx];
    monthly[mIdx]++;
    monthlyBy[mIdx * P + ai]++;
    hourly[hour]++;
    weekday[wd]++;
    p.hourly[hour]++;
    if (hour < 5) p.night++;
    else if (hour < 9) p.early++;

    /* shabbat: Friday 18:00 → Saturday 19:00 */
    if ((wd === 5 && hour >= 18) || (wd === 6 && hour < 19)) {
      const friday = wd === 5 ? dayAbs : dayAbs - 1;
      shabbatCounts.set(friday, (shabbatCounts.get(friday) ?? 0) + 1);
    }

    /* conversations, replies, silence, monologues */
    const gap = mi === 0 ? Infinity : Math.max(0, ts - prevTs);
    if (mi === 0 || gap >= CONVERSATION_GAP_MS) {
      conversations++;
      p.starts++;
      if (mi > 0) people[prevAuthor].ends++;
    } else if (ai !== prevAuthor) {
      p.replies.push(gap);
      allReplies.push(gap);
      if (gap < QUICK_REPLY_MS) quickReplies++;
    }
    if (mi > 0 && ts > maxTsSoFar) {
      const silence = ts - maxTsSoFar;
      if (!longestSilence || silence > longestSilence.ms) longestSilence = { fromTs: maxTsSoFar, toTs: ts, ms: silence };
    }
    if (ts > maxTsSoFar) maxTsSoFar = ts;
    prevTs = ts;
    prevAuthor = ai;
    if (ai === runAuthor) runLen++;
    else {
      runAuthor = ai;
      runLen = 1;
    }
    if (runLen > p.monologue) p.monologue = runLen;

    /* kinds */
    const mk = mediaKeyOf(m.kind);
    if (mk) {
      p.media[mk]++;
      mediaTotals[mk]++;
    }
    if (isVoiceNote(m)) p.voiceNotes++;
    if (m.kind === "deleted") {
      p.deleted++;
      deletedTotal++;
    }
    if (m.edited) p.edited++;

    /* text */
    const raw = m.text;
    if (!raw) continue;
    let lower = raw.toLowerCase();
    if (lower.indexOf("http") !== -1 || lower.indexOf("www.") !== -1) {
      URL_RE.lastIndex = 0;
      let links = 0;
      lower = lower.replace(URL_RE, () => {
        links++;
        return " \u0001 ";
      });
      p.links += links;
      linksTotal += links;
    }
    if (lower.indexOf("?") !== -1 || lower.indexOf("؟") !== -1) p.questions++;

    // Tokens.
    let words = 0;
    let segOpen = -1; // index into segTokens where the current run started
    let prevEnd = -1;
    mentionHits.clear();
    let prevToken = "";
    const closeSeg = () => {
      if (segOpen !== -1 && segTokens.length - segOpen >= 2) {
        segStart.push(segOpen);
        segEnd.push(segTokens.length);
        segAuthor.push(ai);
        segMsg.push(mi);
      } else if (segOpen !== -1) {
        segTokens.length = segOpen;
      }
      segOpen = -1;
    };
    WORD_RE.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = WORD_RE.exec(lower)) !== null) {
      const tok = match[0];
      const start = match.index;
      words++;
      // Punctuation / emoji / URL between two tokens ends a phrase run.
      if (prevEnd !== -1 && !(start - prevEnd === 1 && lower.charCodeAt(prevEnd) === 32)) {
        const between = lower.slice(prevEnd, start);
        if (!/^[\s"'״׳\-–]*$/.test(between)) closeSeg();
      }
      prevEnd = start + tok.length;

      if (isLaughToken(tok)) {
        recordLaugh(p, ts, tok, tok.length, tok);
        closeSeg();
        prevToken = tok;
        continue;
      }

      // Mentions of other members' first names (Hebrew prefixes allowed: "לדנה", "ושדנה").
      if (nameMap.size > 0) {
        let hit = nameMap.get(tok);
        if (!hit && tok.length >= 3 && isHebrewToken(tok) && HEBREW_PREFIX_LETTERS.has(tok[0])) {
          hit = nameMap.get(tok.slice(1));
          if (!hit && tok.length >= 4 && HEBREW_PREFIX_LETTERS.has(tok[1])) hit = nameMap.get(tok.slice(2));
        }
        if (hit && !(prevToken === "בוקר" && tok === "אור")) {
          for (const pi of hit) if (pi !== ai) mentionHits.add(pi);
        }
      }
      prevToken = tok;

      if (isNumberToken(tok)) {
        closeSeg();
        continue;
      }
      const id = tokenId(tok);
      if (segOpen === -1) segOpen = segTokens.length;
      segTokens.push(id);
      if (tok.length < 2 || STOP_WORDS.has(tok) || NOISE_WORDS.has(tok)) continue;
      wordTotals[id]++;
      p.wordCounts.set(id, (p.wordCounts.get(id) ?? 0) + 1);
    }
    closeSeg();
    for (const pi of mentionHits) people[pi].mentioned++;

    p.words += words;
    p.wordMessages++;
    totalWords += words;

    // Emojis (+ emoji laughs: a run of 😂🤣😹 is one laugh, length = emoji count).
    const scan = scanEmojis(raw);
    if (scan.emojis.length > 0) {
      let laughRun = 0;
      let laughRunText = "";
      let laughForm = "";
      for (const g of scan.emojis) {
        const key = emojiKey(g);
        p.emojis.set(key, (p.emojis.get(key) ?? 0) + 1);
        emojiTotals.set(key, (emojiTotals.get(key) ?? 0) + 1);
        const shown = emojiDisplay.get(key);
        if (shown === undefined || (shown.indexOf("\uFE0F") === -1 && g.indexOf("\uFE0F") !== -1)) emojiDisplay.set(key, g);
        if (LAUGH_EMOJIS.has(key)) {
          if (laughRun === 0) laughForm = key;
          laughRun++;
          laughRunText += g;
        } else if (laughRun > 0) {
          recordLaugh(p, ts, laughForm, laughRun, laughRunText);
          laughRun = 0;
          laughRunText = "";
        }
      }
      if (laughRun > 0) recordLaugh(p, ts, laughForm, laughRun, laughRunText);
      p.emojiTotal += scan.emojis.length;
      if (scan.onlyEmoji && m.kind === "text") p.emojiOnly++;
    }

    // Greetings: once per person per day; who said it first that day.
    const g = greetingOf(lower, words);
    if (g !== 0) {
      const seen = g === 1 ? gmSeen : gnSeen;
      const days = g === 1 ? gmDays : gnDays;
      const key = dayAbs * (P + 1) + ai;
      if (!seen.has(key)) {
        seen.add(key);
        if (g === 1) p.goodMorning++;
        else p.goodNight++;
      }
      if (!days.has(dayAbs)) days.set(dayAbs, ai);
    }

    // Longest message (by words, then length).
    if (words > 0) {
      if (!p.longest || words > p.longest.words || (words === p.longest.words && raw.length > p.longest.text.length)) {
        p.longest = { text: capText(raw, LONG_TEXT_CAP), ts, words };
      }
      if (!longestMessage || words > longestMessage.words || (words === longestMessage.words && raw.length > longestMessage.text.length)) {
        longestMessage = { authorId: p.id, text: capText(raw, LONG_TEXT_CAP), ts, words };
      }
    }
  }

  /* ---------- daily / monthly / streaks ---------- */
  const dailyOut: DayCount[] = new Array(spanDays);
  let activeDays = 0;
  let recordDay: DayCount | null = null;
  let bestStreak: ChatStats["longestStreak"] = null;
  let streakStart = -1;
  for (let i = 0; i < spanDays; i++) {
    const count = daily[i];
    const date = dayKey(firstDay + i);
    dailyOut[i] = { date, count };
    if (count > 0) {
      activeDays++;
      if (!recordDay || count > recordDay.count) recordDay = { date, count };
      if (streakStart === -1) streakStart = i;
      const len = i - streakStart + 1;
      if (!bestStreak || len > bestStreak.days) bestStreak = { start: dayKey(firstDay + streakStart), end: date, days: len };
    } else {
      streakStart = -1;
    }
  }

  const monthlyOut: ChatStats["monthly"] = [];
  for (let i = 0; i < monthsSpan; i++) {
    const abs = firstMonthAbs + i;
    const y = Math.floor(abs / 12);
    const mo = (abs % 12) + 1;
    const byPerson: Record<string, number> = {};
    for (let j = 0; j < P; j++) {
      const c = monthlyBy[i * P + j];
      if (c > 0) byPerson[people[j].id] = c;
    }
    monthlyOut.push({ month: `${y}-${mo < 10 ? "0" : ""}${mo}`, count: monthly[i], byPerson });
  }

  /* ---------- shabbat windows fully inside the span ---------- */
  let shabbatWeeks = 0;
  let shabbatSilent = 0;
  let shabbatMessages = 0;
  for (let d = firstDay; d <= lastDay; d++) {
    if ((((d + 4) % 7) + 7) % 7 !== 5) continue;
    const start = d * DAY + 18 * HOUR;
    const end = (d + 1) * DAY + 19 * HOUR;
    if (start < firstTs || end > lastTs) continue;
    shabbatWeeks++;
    const c = shabbatCounts.get(d) ?? 0;
    shabbatMessages += c;
    if (c === 0) shabbatSilent++;
  }

  /* ---------- greetings ---------- */
  const firstSayers = (days: Map<number, number>): Counted[] => {
    const counts = new Map<number, number>();
    for (const ai of days.values()) counts.set(ai, (counts.get(ai) ?? 0) + 1);
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0] - b[0])
      .map(([ai, c]) => [people[ai].id, c] as Counted);
  };

  /* ---------- words, emojis, catchphrases ---------- */
  const wordMap = new Map<number, number>();
  for (let id = 0; id < wordTotals.length; id++) if (wordTotals[id] > 0) wordMap.set(id, wordTotals[id]);
  const word = (id: number) => dictWords[id];

  const segments: TokenSegments = { tokens: segTokens, start: segStart, end: segEnd, author: segAuthor, msg: segMsg };
  const catchphrases = findCatchphrases(segments, dictWords, (ai) => people[ai].id);

  /* ---------- per person ---------- */
  const total = msgs.length;
  const emojiShown = (k: string) => emojiDisplay.get(k) ?? k;
  const perPerson = people.map((p) => finalizePerson(p, total, word, emojiShown));
  perPerson.sort((a, b) => b.messages - a.messages || (indexOf.get(a.id) ?? 0) - (indexOf.get(b.id) ?? 0));

  const awardInputs: AwardInput[] = people.map((p) => ({
    id: p.id,
    messages: p.messages,
    early: p.early,
    emojiTotal: p.emojiTotal,
    replies: p.replies.length,
  }));

  const stats: ChatStats = {
    totalMessages: total,
    totalWords,
    participantsCount: chat.participants.length,
    firstTs,
    lastTs,
    daysSpan: spanDays,
    activeDays,
    avgMessagesPerActiveDay: activeDays > 0 ? total / activeDays : 0,
    perPerson,
    daily: dailyOut,
    monthly: monthlyOut,
    hourly,
    weekday,
    recordDay,
    longestStreak: bestStreak,
    longestSilence,
    conversations,
    medianReplyMs: median(allReplies),
    quickReplyRate: allReplies.length > 0 ? quickReplies / allReplies.length : 0,
    topWords: topK(wordMap, TOP_WORDS, word),
    topEmojis: topK(emojiTotals, TOP_EMOJIS, emojiShown),
    catchphrases,
    laugh: { total: laughTotal, avgLength: laughTotal > 0 ? laughLenSum / laughTotal : 0, record: laughRecord },
    goodMorning: { days: gmDays.size, firstSayers: firstSayers(gmDays) },
    goodNight: { days: gnDays.size, firstSayers: firstSayers(gnDays) },
    shabbat: { weeks: shabbatWeeks, silentWeeks: shabbatSilent, messages: shabbatMessages },
    firstMessages: msgs.slice(0, 6).map((m) => ({ ...m })),
    lastMessages: msgs.slice(-6).map((m) => ({ ...m })),
    longestMessage,
    mediaTotals,
    deleted: deletedTotal,
    links: linksTotal,
    awards: [],
  };
  stats.awards = computeAwards(stats, awardInputs);
  return stats;
}
