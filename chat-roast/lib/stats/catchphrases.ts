/**
 * Catchphrases: 2–4-word phrases repeated across messages (counted once per message).
 * Apriori-style: trigrams are only built from frequent bigrams, 4-grams from frequent
 * trigrams, so 100k messages stay well inside the time budget.
 */
import { GENERIC_PHRASES, NOISE_WORDS, STOP_WORDS } from "./stopwords";

export interface TokenSegments {
  /** Token ids of all phrase runs, back to back. */
  tokens: number[];
  /** Per run: [start, end) into `tokens`, author index, message index. Runs of one message are contiguous. */
  start: number[];
  end: number[];
  author: number[];
  msg: number[];
}

export interface Catchphrase {
  phrase: string;
  count: number;
  topAuthorId: string;
}

const MIN_COUNT = 3;
const MAX_RESULTS = 12;
const B = 2_097_152; // 2^21 — bigram key = a * B + b

export function findCatchphrases(seg: TokenSegments, words: string[], authorId: (ai: number) => string): Catchphrase[] {
  const T = seg.tokens;
  const runs = seg.start.length;
  if (runs === 0) return [];

  /* bigrams */
  const bi = new Map<number, number>();
  const seen = new Set<number | string>();
  let lastMsg = -1;
  for (let r = 0; r < runs; r++) {
    if (seg.msg[r] !== lastMsg) {
      seen.clear();
      lastMsg = seg.msg[r];
    }
    for (let i = seg.start[r]; i + 1 < seg.end[r]; i++) {
      const a = T[i];
      const b = T[i + 1];
      if (a >= B || b >= B) continue;
      const k = a * B + b;
      if (seen.has(k)) continue;
      seen.add(k);
      bi.set(k, (bi.get(k) ?? 0) + 1);
    }
  }
  const frequentBi = (a: number, b: number) => a < B && b < B && (bi.get(a * B + b) ?? 0) >= MIN_COUNT;

  /* trigrams from frequent bigrams */
  const tri = new Map<string, number>();
  lastMsg = -1;
  for (let r = 0; r < runs; r++) {
    if (seg.msg[r] !== lastMsg) {
      seen.clear();
      lastMsg = seg.msg[r];
    }
    for (let i = seg.start[r]; i + 2 < seg.end[r]; i++) {
      if (!frequentBi(T[i], T[i + 1]) || !frequentBi(T[i + 1], T[i + 2])) continue;
      const k = `${T[i]} ${T[i + 1]} ${T[i + 2]}`;
      if (seen.has(k)) continue;
      seen.add(k);
      tri.set(k, (tri.get(k) ?? 0) + 1);
    }
  }

  /* 4-grams from frequent trigrams */
  const quad = new Map<string, number>();
  if (tri.size > 0) {
    lastMsg = -1;
    for (let r = 0; r < runs; r++) {
      if (seg.msg[r] !== lastMsg) {
        seen.clear();
        lastMsg = seg.msg[r];
      }
      for (let i = seg.start[r]; i + 3 < seg.end[r]; i++) {
        const k1 = `${T[i]} ${T[i + 1]} ${T[i + 2]}`;
        if ((tri.get(k1) ?? 0) < MIN_COUNT) continue;
        const k2 = `${T[i + 1]} ${T[i + 2]} ${T[i + 3]}`;
        if ((tri.get(k2) ?? 0) < MIN_COUNT) continue;
        const k = `${k1} ${T[i + 3]}`;
        if (seen.has(k)) continue;
        seen.add(k);
        quad.set(k, (quad.get(k) ?? 0) + 1);
      }
    }
  }

  /* candidates */
  interface Cand {
    ids: number[];
    words: string[];
    phrase: string;
    count: number;
  }
  const cands: Cand[] = [];
  const consider = (ids: number[], count: number) => {
    if (count < MIN_COUNT) return;
    const ws = ids.map((id) => words[id]);
    if (!acceptable(ws)) return;
    cands.push({ ids, words: ws, phrase: ws.join(" "), count });
  };
  for (const [k, c] of bi) if (c >= MIN_COUNT) consider([Math.floor(k / B), k % B], c);
  for (const [k, c] of tri) if (c >= MIN_COUNT) consider(k.split(" ").map(Number), c);
  for (const [k, c] of quad) if (c >= MIN_COUNT) consider(k.split(" ").map(Number), c);

  /* drop sub-phrases of a longer phrase used about as often ("לא נורמלי" inside "לא נורמלי אחי") */
  cands.sort((x, y) => y.ids.length - x.ids.length || y.count - x.count || (x.phrase < y.phrase ? -1 : x.phrase > y.phrase ? 1 : 0));
  const kept: Cand[] = [];
  for (const c of cands) {
    const padded = ` ${c.phrase} `;
    const covered = kept.some((k) => k.ids.length > c.ids.length && k.count >= 0.6 * c.count && ` ${k.phrase} `.includes(padded));
    if (!covered) kept.push(c);
  }
  // …and longer phrases that are just a rare extension of a much more common shorter one.
  const final = kept.filter(
    (c) => !kept.some((k) => k.ids.length < c.ids.length && k.count >= 2.5 * c.count && ` ${c.phrase} `.includes(` ${k.phrase} `)),
  );

  const merged = mergeOverlaps(final, words);
  const rank = <T extends Cand>(list: T[]) =>
    list.sort(
      (x, y) =>
        score(y) - score(x) || y.count - x.count || y.ids.length - x.ids.length || (x.phrase < y.phrase ? -1 : x.phrase > y.phrase ? 1 : 0),
    );
  rank(merged);
  const top = merged.slice(0, MAX_RESULTS + 4);
  if (top.length === 0) return [];

  /* top author per phrase (once per message) */
  const byFirst = new Map<number, number[]>();
  top.forEach((c, i) => {
    const list = byFirst.get(c.ids[0]);
    if (list) list.push(i);
    else byFirst.set(c.ids[0], [i]);
  });
  const perAuthor: Map<number, number>[] = top.map(() => new Map());
  const seenPhrase = new Set<number>();
  lastMsg = -1;
  for (let r = 0; r < runs; r++) {
    if (seg.msg[r] !== lastMsg) {
      seenPhrase.clear();
      lastMsg = seg.msg[r];
    }
    const end = seg.end[r];
    for (let i = seg.start[r]; i < end; i++) {
      const list = byFirst.get(T[i]);
      if (!list) continue;
      for (const pi of list) {
        if (seenPhrase.has(pi)) continue;
        const ids = top[pi].ids;
        if (i + ids.length > end) continue;
        let ok = true;
        for (let j = 1; j < ids.length; j++) {
          if (T[i + j] !== ids[j]) {
            ok = false;
            break;
          }
        }
        if (!ok) continue;
        seenPhrase.add(pi);
        const a = seg.author[r];
        perAuthor[pi].set(a, (perAuthor[pi].get(a) ?? 0) + 1);
      }
    }
  }

  // Exact per-message counts (merged phrases were estimated), then the final cut.
  const results = top.map((c, i) => {
    let best = -1;
    let bestCount = -1;
    let exact = 0;
    for (const [a, n] of perAuthor[i]) {
      exact += n;
      if (n > bestCount || (n === bestCount && a < best)) {
        best = a;
        bestCount = n;
      }
    }
    return { ...c, count: exact, topAuthor: best };
  });
  return rank(results.filter((c) => c.count >= MIN_COUNT))
    .slice(0, MAX_RESULTS)
    .map((c) => ({ phrase: c.phrase, count: c.count, topAuthorId: c.topAuthor >= 0 ? authorId(c.topAuthor) : "" }));
}

const MAX_MERGED_WORDS = 7;

/**
 * Two 4-grams that overlap by three words with about the same count are one longer phrase
 * cut in two ("אני מת על הקבוצה" + "מת על הקבוצה הזאת"). Chain them back together.
 */
function mergeOverlaps<C extends { ids: number[]; words: string[]; phrase: string; count: number }>(list: C[], words: string[]): C[] {
  const out = [...list];
  let changed = true;
  while (changed) {
    changed = false;
    outer: for (let i = 0; i < out.length; i++) {
      const a = out[i];
      if (a.ids.length < 4 || a.ids.length >= MAX_MERGED_WORDS) continue;
      for (let j = 0; j < out.length; j++) {
        const b = out[j];
        if (i === j || b.ids.length !== 4) continue;
        if (Math.min(a.count, b.count) < 0.8 * Math.max(a.count, b.count)) continue;
        const tail = a.ids.slice(-3);
        if (tail[0] !== b.ids[0] || tail[1] !== b.ids[1] || tail[2] !== b.ids[2]) continue;
        const ids = [...a.ids, b.ids[3]];
        const ws = ids.map((id) => words[id]);
        out[i] = { ...a, ids, words: ws, phrase: ws.join(" "), count: Math.min(a.count, b.count) };
        out.splice(j, 1);
        changed = true;
        break outer;
      }
    }
  }
  return out;
}

function score(c: { ids: number[]; count: number }): number {
  // Longer phrases are rarer by nature — give them a little lift.
  return c.count * (1 + 0.25 * (c.ids.length - 2));
}

function acceptable(ws: string[]): boolean {
  let content = 0;
  for (const w of ws) {
    if (w.length < 2 || NOISE_WORDS.has(w)) return false;
    if (!STOP_WORDS.has(w)) content++;
  }
  if (content === 0) return false;
  // "בא לי", "see you" — a two-word phrase ending in a function word is filler.
  if (ws.length === 2 && STOP_WORDS.has(ws[1])) return false;
  // "יאללה יאללה", "no no no" — repetition, not a phrase.
  if (ws.every((w) => w === ws[0])) return false;
  const joined = ` ${ws.join(" ")} `;
  for (const g of GENERIC_PHRASES) if (joined.includes(` ${g} `)) return false;
  return true;
}
