/**
 * Deterministic stat awards ("superlatives"). Each award has a threshold so silly
 * awards never appear (a "deleter" with one deleted message, a "ghost" in a 2-person chat).
 * Candidates are ranked by how clearly the winner beats the runner-up, weighted by how
 * fun the award is, then picked greedily while spreading awards across people.
 */
import type { ChatStats, PersonStats, StatAward, StatAwardKey } from "../types";

/**
 * How to read `StatAward.value` for each key:
 *   count  — a plain count (messages, laughs, days…)
 *   ratio  — 0..1 share (format as %)
 *   avg    — an average (words or emojis per message)
 *   ms     — a duration in milliseconds
 */
export type AwardUnit = "count" | "ratio" | "avg" | "ms";

export const STAT_AWARD_META: Record<StatAwardKey, { emoji: string; unit: AwardUnit; metric: string }> = {
  chatterbox: { emoji: "🗣️", unit: "count", metric: "messages sent" },
  ghost: { emoji: "👻", unit: "count", metric: "messages sent (fewest)" },
  night_owl: { emoji: "🦉", unit: "ratio", metric: "share of own messages sent 00:00–04:59" },
  early_bird: { emoji: "🐓", unit: "count", metric: "messages sent 05:00–08:59" },
  novelist: { emoji: "📜", unit: "avg", metric: "words per message (highest)" },
  one_word: { emoji: "🤏", unit: "avg", metric: "words per message (lowest)" },
  emoji_addict: { emoji: "🤩", unit: "avg", metric: "emojis per message" },
  laugh_track: { emoji: "😂", unit: "count", metric: "laughs (חחח / lol / 😂 …)" },
  conversation_starter: { emoji: "🔔", unit: "count", metric: "conversations opened" },
  conversation_killer: { emoji: "🧊", unit: "count", metric: "times the last to write before a 4h+ silence" },
  speedy: { emoji: "⚡", unit: "ms", metric: "median reply time (fastest)" },
  slowpoke: { emoji: "🐢", unit: "ms", metric: "median reply time (slowest)" },
  voice_note_podcaster: { emoji: "🎙️", unit: "count", metric: "voice notes" },
  media_dumper: { emoji: "📸", unit: "count", metric: "photos, videos, GIFs and files" },
  sticker_lord: { emoji: "🧸", unit: "count", metric: "stickers" },
  deleter: { emoji: "🗑️", unit: "count", metric: "deleted messages" },
  editor: { emoji: "✏️", unit: "count", metric: "edited messages" },
  question_master: { emoji: "❓", unit: "ratio", metric: "share of own messages that ask a question" },
  monologue: { emoji: "🎤", unit: "count", metric: "messages in a row with no reply" },
  most_mentioned: { emoji: "📣", unit: "count", metric: "messages by others that mention them" },
  good_morning: { emoji: "☀️", unit: "count", metric: "days they said good morning" },
  good_night: { emoji: "🌙", unit: "count", metric: "days they said good night" },
};

/** Extra per-person numbers that PersonStats doesn't carry. */
export interface AwardInput {
  id: string;
  messages: number;
  early: number;
  emojiTotal: number;
  replies: number;
}

const MAX_AWARDS = 10;
const MAX_DOMINANCE = 4;

/**
 * Value at which an award feels "substantial" — below it the score is damped (3 deleted
 * messages is a fact, 25 is a personality). Rates/durations use their own scale.
 */
const SUBSTANTIAL: Partial<Record<StatAwardKey, number>> = {
  chatterbox: 100,
  early_bird: 40,
  laugh_track: 60,
  conversation_starter: 20,
  conversation_killer: 20,
  voice_note_podcaster: 25,
  media_dumper: 40,
  sticker_lord: 25,
  deleter: 12,
  editor: 12,
  monologue: 15,
  most_mentioned: 25,
  good_morning: 12,
  good_night: 12,
  night_owl: 0.15,
  question_master: 0.25,
  emoji_addict: 0.6,
};

/** How much fun each award is, all else equal. */
const WEIGHT: Record<StatAwardKey, number> = {
  chatterbox: 1.4, // the headline superlative — keep it when it is clear-cut
  laugh_track: 1.3,
  night_owl: 1.25,
  ghost: 1.2,
  conversation_killer: 1.15,
  voice_note_podcaster: 1.15,
  monologue: 1.1,
  deleter: 1.1,
  slowpoke: 1.1,
  speedy: 1.05,
  novelist: 1,
  one_word: 1,
  emoji_addict: 1,
  good_morning: 1,
  good_night: 1,
  conversation_starter: 1,
  sticker_lord: 1,
  most_mentioned: 0.95,
  early_bird: 0.95,
  media_dumper: 0.9,
  editor: 0.9,
  question_master: 0.85,
};

interface Candidate {
  key: StatAwardKey;
  winnerId: string;
  value: number;
  score: number;
}

interface Entry {
  id: string;
  value: number;
}

/**
 * Pick the strict winner (highest, or lowest with `lowest`) of `entries`.
 * Returns null on a tie at the top or when fewer than two people compete.
 */
function pick(key: StatAwardKey, entries: Entry[], opts: { lowest?: boolean; min?: number; max?: number } = {}): Candidate | null {
  if (entries.length < 2) return null;
  const sorted = [...entries].sort((a, b) => (opts.lowest ? a.value - b.value : b.value - a.value));
  const [w, r] = sorted;
  if (w.value === r.value) return null;
  if (opts.min !== undefined && w.value < opts.min) return null;
  if (opts.max !== undefined && w.value > opts.max) return null;
  const eps = 1e-9;
  const dominance = opts.lowest ? r.value / Math.max(w.value, eps) : w.value / Math.max(r.value, eps);
  const d = Math.min(dominance, MAX_DOMINANCE);
  if (d < 1.1) return null; // a photo finish is not a superlative
  const scale = SUBSTANTIAL[key];
  const magnitude = scale ? 0.45 + 0.55 * Math.min(1, w.value / scale) : 1;
  return { key, winnerId: w.id, value: w.value, score: WEIGHT[key] * (1 + Math.log2(d)) * magnitude };
}

export function computeAwards(stats: ChatStats, inputs: AwardInput[]): StatAward[] {
  const people = stats.perPerson.filter((p) => p.messages > 0);
  const n = people.length;
  if (n < 2) return [];
  const total = stats.totalMessages;
  const extra = new Map(inputs.map((x) => [x.id, x]));
  const ex = (p: PersonStats) => extra.get(p.id) ?? { id: p.id, messages: p.messages, early: 0, emojiTotal: 0, replies: 0 };

  // People with enough messages for per-message rates to mean something.
  const minForRates = Math.max(15, Math.round(total * 0.02));
  const regulars = people.filter((p) => p.messages >= minForRates);
  const all = (f: (p: PersonStats) => number): Entry[] => people.map((p) => ({ id: p.id, value: f(p) }));
  const reg = (f: (p: PersonStats) => number): Entry[] => regulars.map((p) => ({ id: p.id, value: f(p) }));

  const cands: (Candidate | null)[] = [];

  cands.push(pick("chatterbox", all((p) => p.messages), { min: 10 }));
  if (n >= 3) {
    const ghost = pick("ghost", all((p) => p.messages), { lowest: true });
    if (ghost) {
      const share = ghost.value / Math.max(total, 1);
      if (share < 0.6 / n && ghost.score > 0) cands.push(ghost);
    }
  }

  const night = pick("night_owl", reg((p) => (p.messages > 0 ? p.nightMessages / p.messages : 0)), { min: 0.04 });
  if (night && (people.find((p) => p.id === night.winnerId)?.nightMessages ?? 0) >= 10) cands.push(night);

  cands.push(pick("early_bird", all((p) => ex(p).early), { min: 10 }));
  cands.push(pick("novelist", reg((p) => p.avgWordsPerMessage), { min: 5 }));
  cands.push(pick("one_word", reg((p) => p.avgWordsPerMessage), { lowest: true, max: 4 }));

  const emojiRegs = regulars.filter((p) => ex(p).emojiTotal >= 15);
  if (emojiRegs.length >= 1 && regulars.length >= 2) {
    cands.push(pick("emoji_addict", reg((p) => ex(p).emojiTotal / p.messages), { min: 0.1 }));
  }

  cands.push(pick("laugh_track", all((p) => p.laugh.count), { min: 10 }));
  if (stats.conversations >= 10) {
    cands.push(pick("conversation_starter", all((p) => p.conversationStarts), { min: 5 }));
    cands.push(pick("conversation_killer", all((p) => p.conversationEnds), { min: 5 }));
  }

  const repliers = people.filter((p) => ex(p).replies >= 20 && p.medianReplyMs !== null);
  if (repliers.length >= 2) {
    const entries = repliers.map((p) => ({ id: p.id, value: p.medianReplyMs as number }));
    cands.push(pick("speedy", entries, { lowest: true }));
    cands.push(pick("slowpoke", entries, { min: 3 * 60_000 }));
  }

  cands.push(pick("voice_note_podcaster", all((p) => p.voiceNotes), { min: 5 }));
  cands.push(
    pick("media_dumper", all((p) => p.media.image + p.media.video + p.media.gif + p.media.document + p.media.other), { min: 10 }),
  );
  cands.push(pick("sticker_lord", all((p) => p.media.sticker), { min: 5 }));
  cands.push(pick("deleter", all((p) => p.deleted), { min: 3 }));
  cands.push(pick("editor", all((p) => p.edited), { min: 3 }));
  const askers = regulars.filter((p) => p.questions >= 10);
  if (askers.length >= 1 && regulars.length >= 2) {
    cands.push(pick("question_master", reg((p) => p.questions / p.messages), { min: 0.08 }));
  }
  cands.push(pick("monologue", all((p) => p.longestMonologue), { min: 8 }));
  cands.push(pick("most_mentioned", all((p) => p.mentionedByOthers), { min: 5 }));
  cands.push(pick("good_morning", all((p) => p.goodMorning), { min: 3 }));
  cands.push(pick("good_night", all((p) => p.goodNight), { min: 3 }));

  // Greedy pick: most interesting first; each extra award for the same person costs 45%,
  // and nobody hoards the shelf (cap grows when there are few people to share it with).
  const pool = cands.filter((c): c is Candidate => c !== null);
  const won = new Map<string, number>();
  const out: StatAward[] = [];
  const order = Object.keys(WEIGHT) as StatAwardKey[];
  const cap = Math.max(3, Math.ceil(MAX_AWARDS / n) + 1);
  for (let i = pool.length - 1; i >= 0; i--) if (pool[i].score <= 0) pool.splice(i, 1);
  while (out.length < MAX_AWARDS && pool.length > 0) {
    let best = -1;
    let bestScore = -Infinity;
    for (let i = 0; i < pool.length; i++) {
      const c = pool[i];
      const already = won.get(c.winnerId) ?? 0;
      if (already >= cap) continue;
      const s = c.score * Math.pow(0.55, already);
      if (best === -1 || s > bestScore + 1e-12 || (Math.abs(s - bestScore) <= 1e-12 && order.indexOf(c.key) < order.indexOf(pool[best].key))) {
        best = i;
        bestScore = s;
      }
    }
    if (best === -1) break;
    const c = pool.splice(best, 1)[0];
    won.set(c.winnerId, (won.get(c.winnerId) ?? 0) + 1);
    out.push({ key: c.key, emoji: STAT_AWARD_META[c.key].emoji, winnerId: c.winnerId, value: c.value });
  }
  return out;
}
