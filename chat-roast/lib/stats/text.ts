/**
 * Text helpers for stats: tokens, laughs, emojis, greetings, mentions.
 * Note: tsconfig targets ES2017 — no named groups / `s` flag in regexes.
 */

/** URLs (also bare "www.x.y"). */
export const URL_RE = /(?:https?:\/\/|www\.)[^\s<>"']+/gi;

/**
 * Word tokens: Hebrew + Latin + any script letters/digits, keeping inner apostrophes and
 * gershayim ("צ'יפס", "צה"ל", "don't"). Global + sticky-free; reset lastIndex before use.
 */
export const WORD_RE = /[\p{L}\p{N}][\p{L}\p{M}\p{N}]*(?:['’׳״"][\p{L}\p{M}\p{N}]+)*/gu;

const DIGITS_RE = /^\p{N}+$/u;
/** Pure numbers ("2026", "٣") — only tokens that start with a digit are checked. */
export function isNumberToken(t: string): boolean {
  const c = t.charCodeAt(0);
  const digitStart =
    (c >= 0x30 && c <= 0x39) || (c >= 0x660 && c <= 0x669) || (c >= 0x6f0 && c <= 0x6f9) || (c >= 0xff10 && c <= 0xff19);
  return digitStart && DIGITS_RE.test(t);
}

/* ------------------------------------------------------------------ */
/* Laughs                                                              */
/* ------------------------------------------------------------------ */

const HEB_LAUGH_RE = /^[חה]+$/;
const LATIN_LAUGH_RE =
  /^(?:(?:a?ha){2,}h?|(?:ah){2,}a?|(?:he){2,}h?|(?:hi){2,}h?|lo+l+|lmf?a+o+|rofl+|(?:ja){2,}j?|(?:je){2,}j?|(?:ji){2,}|k{3,}|w{3,}|5{3,}|x+d+|(?:ха){2,}х?|(?:ах){2,}а?|(?:хе){2,}|ه{3,})$/;

/** Is this (lower-cased) word token a laugh? "חח", "חחחחח", "ההה", "lol", "hahaha", "kkkk"… */
export function isLaughToken(t: string): boolean {
  const c = t.charCodeAt(0);
  if (c === 0x5d7 /* ח */ || c === 0x5d4 /* ה */) {
    if (t.length < 2 || !HEB_LAUGH_RE.test(t)) return false;
    let het = 0;
    for (let i = 0; i < t.length; i++) if (t.charCodeAt(i) === 0x5d7) het++;
    return het >= 2 || (het === 0 && t.length >= 3);
  }
  if (t.length < 3) return t === "xd";
  return LATIN_LAUGH_RE.test(t);
}

export const LAUGH_EMOJIS: ReadonlySet<string> = new Set(["😂", "🤣", "😹"]);

/* ------------------------------------------------------------------ */
/* Emojis                                                              */
/* ------------------------------------------------------------------ */

/** Quick pre-filter: could this text contain an emoji? */
export const MAYBE_EMOJI_RE = /[\p{Extended_Pictographic}\p{Regional_Indicator}⃣]/u;
const PICTO_RE = /\p{Extended_Pictographic}/u;
const FLAG_RE = /^\p{Regional_Indicator}{2}$/u;
const KEYCAP_RE = /^[0-9#*]️?⃣$/;
const VS_RE = /[︎️]/g;
const WS_RE = /^[\s​-‏⁠﻿]*$/;

/** Text-default symbols that are Extended_Pictographic but read as punctuation (©, ®, ™, ‼, ↔…). */
function isTextSymbol(cp: number): boolean {
  return cp < 0x2000 || cp === 0x203c || cp === 0x2049 || cp === 0x2122 || cp === 0x2139 || (cp >= 0x2194 && cp <= 0x21aa);
}

export interface EmojiScan {
  /** Emoji graphemes in order (raw, ZWJ/skin-tone sequences whole). */
  emojis: string[];
  /** Text has ≥1 emoji and nothing but emojis/whitespace. */
  onlyEmoji: boolean;
}

type Segmenter = { segment(input: string): Iterable<{ segment: string }> };
let segmenter: Segmenter | null | undefined;

function getSegmenter(): Segmenter | null {
  if (segmenter !== undefined) return segmenter;
  const Ctor = (Intl as unknown as { Segmenter?: new (l?: string, o?: { granularity: string }) => Segmenter }).Segmenter;
  segmenter = Ctor ? new Ctor("en", { granularity: "grapheme" }) : null;
  return segmenter;
}

/** Fallback grapheme splitter for emoji runs on engines without Intl.Segmenter. */
const EMOJI_SEQ_RE =
  /\p{Regional_Indicator}{2}|[0-9#*]\uFE0F?\u20E3|\p{Extended_Pictographic}[\uFE0E\uFE0F]?\p{Emoji_Modifier}?(?:\u200D\p{Extended_Pictographic}[\uFE0E\uFE0F]?\p{Emoji_Modifier}?)*[\u{E0020}-\u{E007F}]*|[\s\S]/gu;

/**
 * Maximal runs of emoji-ish code points (pictographs, skin tones, ZWJ, variation selectors,
 * flags, keycaps, tag sequences). Only these runs are split into graphemes, so long plain
 * texts never go through the (comparatively slow) segmenter.
 */
const EMOJI_RUN_RE =
  /(?:[\p{Extended_Pictographic}\p{Regional_Indicator}\p{Emoji_Modifier}\u200D\uFE0E\uFE0F\u20E3\u{E0020}-\u{E007F}]|[0-9#*](?=\uFE0F?\u20E3))+/gu;

export function isEmojiGrapheme(g: string): boolean {
  if (KEYCAP_RE.test(g)) return true;
  if (FLAG_RE.test(g)) return true;
  if (!PICTO_RE.test(g)) return false;
  const cp = g.codePointAt(0) ?? 0;
  if (isTextSymbol(cp) && g.indexOf("\uFE0F") === -1) return false;
  return true;
}

/**
 * Fast path: a run with no ZWJ, skin tone, flag, keycap or tag code points is one grapheme per
 * code point (plus an optional variation selector). Returns false when the run needs the segmenter.
 */
function simpleRun(run: string, out: string[]): boolean {
  for (let i = 0; i < run.length; i++) {
    const c = run.charCodeAt(i);
    if (c === 0x200d || c === 0x20e3) return false;
    if (c === 0xd83c) {
      const lo = run.charCodeAt(i + 1);
      // U+1F1E6–1F1FF regional indicators, U+1F3FB–1F3FF skin tones.
      if ((lo >= 0xdde6 && lo <= 0xddff) || (lo >= 0xdffb && lo <= 0xdfff)) return false;
    }
    if (c === 0xdb40) return false; // tag characters (subdivision flags)
    if (c >= 0x30 && c <= 0x39) return false; // keycap base
    if (c === 0x23 || c === 0x2a) return false;
  }
  const start = out.length;
  for (let i = 0; i < run.length; ) {
    const cp = run.codePointAt(i) ?? 0;
    const len = cp > 0xffff ? 2 : 1;
    if (cp === 0xfe0f || cp === 0xfe0e) {
      if (out.length > start) out[out.length - 1] += run.slice(i, i + len);
    } else {
      out.push(run.slice(i, i + len));
    }
    i += len;
  }
  // Drop text-style symbols (©, ™ …) the same way isEmojiGrapheme would.
  for (let j = out.length - 1; j >= start; j--) if (!isEmojiGrapheme(out[j])) out.splice(j, 1);
  return true;
}

export function scanEmojis(text: string): EmojiScan {
  if (!MAYBE_EMOJI_RE.test(text)) return { emojis: [], onlyEmoji: false };
  const emojis: string[] = [];
  const seg = getSegmenter();
  let covered = 0;
  EMOJI_RUN_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = EMOJI_RUN_RE.exec(text)) !== null) {
    const run = m[0];
    covered += run.length;
    if (simpleRun(run, emojis)) continue;
    if (seg) {
      for (const part of seg.segment(run)) if (isEmojiGrapheme(part.segment)) emojis.push(part.segment);
    } else {
      for (const g of run.match(EMOJI_SEQ_RE) ?? []) if (isEmojiGrapheme(g)) emojis.push(g);
    }
  }
  let onlyEmoji = false;
  if (emojis.length > 0) {
    // Only emoji if everything outside the runs is whitespace / invisible marks.
    onlyEmoji = covered === text.length || WS_RE.test(text.replace(EMOJI_RUN_RE, ""));
  }
  return { emojis, onlyEmoji };
}

/** Counting key: variation selectors dropped ("❤️" and "❤" are the same emoji). */
export function emojiKey(g: string): string {
  return g.indexOf("️") === -1 && g.indexOf("︎") === -1 ? g : g.replace(VS_RE, "");
}

/* ------------------------------------------------------------------ */
/* Greetings                                                           */
/* ------------------------------------------------------------------ */

const LEAD = "^[^\\p{L}\\p{N}]*";
const END = "(?=$|[^\\p{L}])";

const GM_STRONG_RE = new RegExp(
  `${LEAD}(?:בוקר\\s*(?:טו+ב+|או+ר+|מקסים|נפלא|נעים|מתוק|שמח|קסום|לכולם|לכולן)|צפרא טבא|good\\s*mo+rning+|g'?m+|buenos\\s+d[ií]as|bom\\s+dia|bonjour|guten\\s+morgen|доброе\\s+утро|صباح\\s+الخير)${END}`,
  "iu",
);
const GM_BARE_RE = new RegExp(`${LEAD}(?:בו+קר+|mo+rning+|mornin'?)${END}`, "iu");
const GM_ANY_RE = /בוקר\s*(?:טו+ב+|או+ר+)|good\s*mo+rning/iu;

const GN_STRONG_RE = new RegExp(
  `${LEAD}(?:לילה\\s*(?:טו+ב+|מתוק|שקט|נעים|לכולם|לכולן)|ליל(?:ה)?\\s*מנוחה|לילה\\s+לילה|לילות|good\\s*ni+ght+|g'?n+|nighty?\\s*night|buenas\\s+noches|boa\\s+noite|bonne\\s+nuit|gute\\s+nacht|спокойной\\s+ночи|تصبح\\s+على\\s+خير)${END}`,
  "iu",
);
const GN_BARE_RE = new RegExp(`${LEAD}(?:לי+לה+|ni+ght+|nite|nn)${END}`, "iu");
const GN_ANY_RE = /לילה\s*טו+ב+|ליל\s*מנוחה|good\s*ni+ght/iu;

/** 1 = good morning, 2 = good night, 0 = neither. `words` = word-token count of the message. */
export function greetingOf(text: string, words: number): 0 | 1 | 2 {
  if (words === 0 || words > 40) return 0;
  if (GM_STRONG_RE.test(text) || (words <= 3 && GM_BARE_RE.test(text))) return 1;
  if (GN_STRONG_RE.test(text) || (words <= 3 && GN_BARE_RE.test(text))) return 2;
  if (words <= 8) {
    if (GM_ANY_RE.test(text)) return 1;
    if (GN_ANY_RE.test(text)) return 2;
  }
  return 0;
}

/* ------------------------------------------------------------------ */
/* Names                                                               */
/* ------------------------------------------------------------------ */

const NAME_TOKEN_RE = /[\p{L}\p{M}'’׳]+/u;
const HEBREW_START_RE = /^[א-ת]/;

/** Lower-cased first name token (≥ 2 letters) of a display name, or null ("+972 50…" → null). */
export function firstNameToken(displayName: string): string | null {
  const m = NAME_TOKEN_RE.exec(displayName.toLowerCase());
  if (!m) return null;
  const t = m[0].replace(/['’׳]+$/, "");
  return t.length >= 2 ? t : null;
}

export function isHebrewToken(t: string): boolean {
  return HEBREW_START_RE.test(t);
}

/** One-letter Hebrew prefixes that may stick to a name ("לדנה", "ושדנה", "מדנה"). */
export const HEBREW_PREFIX_LETTERS: ReadonlySet<string> = new Set(["ו", "ל", "ש", "ה", "ב", "מ", "כ"]);
