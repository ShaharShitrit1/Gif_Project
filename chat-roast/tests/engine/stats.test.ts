import { describe, expect, it } from "vitest";
import { parseChatText } from "../../lib/parser";
import { STAT_AWARD_META, computeStats, greetingOf, isLaughToken, scanEmojis } from "../../lib/stats";
import type { ChatStats, ParsedChat, StatAwardKey } from "../../lib/types";
import { RLM } from "./fixtures";
import { generateChat } from "./generate";

/**
 * Hand-computed chat (Android Hebrew 24h). 2026-06-05 is a Friday.
 *  p0 דנה (7 msgs) · p1 יואב (6) · p2 מאיה (6)
 */
const HAND = [
  `3.6.2026, 08:00 - דנה: בוקר טוב! ☀️`, //                     m0  conv1 start (דנה) · gm
  `3.6.2026, 08:01 - יואב: בוקר אור חחחח`, //                    m1  reply 60s · gm · laugh 4
  `3.6.2026, 08:01 - מאיה: בוקר טוב 😂😂`, //                    m2  reply 0s · gm · laugh 😂×2
  `3.6.2026, 08:05 - דנה: יואב מה התוכניות להיום?`, //           m3  reply 240s · mention יואב · ?
  `3.6.2026, 08:06 - דנה: אני מחכה ליואב`, //                    m4  monologue 2 · mention ל+יואב
  `3.6.2026, 08:16 - יואב: חחחחחחחחחח לא יודע`, //               m5  reply 600s · laugh 10 (record)
  `3.6.2026, 08:46 - מאיה: lol https://example.com/x?y=1`, //    m6  reply 1800s · laugh 3 · link · "?" in URL ≠ question
  `3.6.2026, 23:30 - יואב: לילה טוב`, //                         m7  conv2 (יואב) · מאיה ended conv1 · gn
  `3.6.2026, 23:31 - דנה: לילה`, //                              m8  reply 60s · gn (bare)
  `4.6.2026, 04:00 - מאיה: ${RLM}<המדיה לא נכללה>`, //            m9  conv3 (מאיה, gap 4h29) · דנה ended · night
  `4.6.2026, 04:00 - מאיה: PTT-20260604-WA0001.opus (הקובץ מצורף)`, // m10 voice note · night
  `4.6.2026, 04:00 - מאיה: ההודעה הזו נמחקה`, //                  m11 deleted · night · monologue 3
  `4.6.2026, 04:02 - דנה: מאיה למה את ערה?? 😅`, //               m12 reply 120s · mention מאיה · ? · night
  `5.6.2026, 17:59 - יואב: שבת שלום`, //                          m13 conv4 (יואב) · דנה ended
  `5.6.2026, 18:00 - דנה: שבת שלום ❤️`, //                       m14 reply 60s · inside Shabbat
  `6.6.2026, 19:00 - מאיה: שבוע טוב`, //                          m15 conv5 (מאיה) · דנה ended · Shabbat over at 19:00
  `6.6.2026, 19:01 - יואב: שבוע טוב 😂`, //                       m16 reply 60s · laugh 😂×1
  `8.6.2026, 09:00 - דנה: יואב יואב יואב`, //                     m17 conv6 (דנה) · יואב ended · one mention
  `15.6.2026, 10:00 - יואב: חזרתי ${RLM}<ההודעה נערכה>`, //       m18 conv7 (יואב) · דנה ended · edited
].join("\n");

const DAY = 86_400_000;
const utc = (y: number, mo: number, d: number, h = 0, mi = 0) => Date.UTC(y, mo - 1, d, h, mi);

describe("computeStats — hand-computed chat", () => {
  const chat = parseChatText(HAND, { validate: false });
  const s = computeStats(chat);
  const P = (name: string) => {
    const p = s.perPerson.find((x) => x.name === name);
    if (!p) throw new Error(name);
    return p;
  };
  const dana = P("דנה");
  const yoav = P("יואב");
  const maya = P("מאיה");

  it("parsed as expected", () => {
    expect(chat.participants.map((p) => [p.id, p.displayName, p.messageCount])).toEqual([
      ["p0", "דנה", 7],
      ["p1", "יואב", 6],
      ["p2", "מאיה", 6],
    ]);
    expect(chat.messages.map((m) => m.kind).slice(9, 12)).toEqual(["media", "audio", "deleted"]);
  });

  it("totals, span, words", () => {
    expect(s.totalMessages).toBe(19);
    expect(s.participantsCount).toBe(3);
    expect(s.firstTs).toBe(utc(2026, 6, 3, 8, 0));
    expect(s.lastTs).toBe(utc(2026, 6, 15, 10, 0));
    expect(s.daysSpan).toBe(13);
    expect(s.activeDays).toBe(6);
    expect(s.avgMessagesPerActiveDay).toBeCloseTo(19 / 6, 10);
    expect(s.totalWords).toBe(37);
    expect([dana.words, yoav.words, maya.words]).toEqual([19, 13, 5]);
    expect(dana.avgWordsPerMessage).toBeCloseTo(19 / 7, 10);
    expect(maya.avgWordsPerMessage).toBeCloseTo(5 / 3, 10); // media-only messages don't dilute the average
    expect(s.perPerson.map((p) => p.id)).toEqual(["p0", "p1", "p2"]);
    expect(dana.share).toBeCloseTo(7 / 19, 10);
  });

  it("conversations: who opens, who leaves it hanging", () => {
    expect(s.conversations).toBe(7);
    expect([dana.conversationStarts, yoav.conversationStarts, maya.conversationStarts]).toEqual([2, 3, 2]);
    expect([dana.conversationEnds, yoav.conversationEnds, maya.conversationEnds]).toEqual([4, 1, 1]);
  });

  it("reply times (median per person and overall) and quick replies", () => {
    expect(yoav.medianReplyMs).toBe(60_000); // [60, 600, 60]
    expect(maya.medianReplyMs).toBe(900_000); // [0, 1800]
    expect(dana.medianReplyMs).toBe(90_000); // [240, 60, 120, 60]
    expect(s.medianReplyMs).toBe(60_000);
    expect(s.quickReplyRate).toBeCloseTo(1 / 9, 10);
  });

  it("laugh fingerprint", () => {
    expect(s.laugh.total).toBe(5);
    expect(s.laugh.avgLength).toBe(4); // (4 + 2 + 10 + 3 + 1) / 5
    expect(s.laugh.record).toEqual({ length: 10, authorId: "p1", ts: utc(2026, 6, 3, 8, 16), text: "חחחחחחחחחח" });
    expect(yoav.laugh).toEqual({ count: 3, avgLength: 5, maxLength: 10, favorite: "חחחח" });
    expect(maya.laugh).toEqual({ count: 2, avgLength: 2.5, maxLength: 3, favorite: "😂" });
    // long laughs share one style bucket for `favorite`
    const long = computeStats(
      parseChatText(["חחחחחחחחח", "חחחחחחחחחחחחח", "חחח", "חחחחחחחחחחח"].map((t, i) => `01/01/2026, 10:0${i} - ${i % 2 ? "B" : "A"}: ${t}`).join("\n"), {
        validate: false,
      }),
    );
    expect(long.perPerson.find((p) => p.name === "B")?.laugh.favorite).toBe("חחחחחח…");
    expect(dana.laugh).toEqual({ count: 0, avgLength: 0, maxLength: 0, favorite: null });
  });

  it("good morning / good night: once per day, first sayer", () => {
    expect(s.goodMorning).toEqual({ days: 1, firstSayers: [["p0", 1]] });
    expect(s.goodNight).toEqual({ days: 1, firstSayers: [["p1", 1]] });
    expect([dana.goodMorning, yoav.goodMorning, maya.goodMorning]).toEqual([1, 1, 1]);
    expect([dana.goodNight, yoav.goodNight, maya.goodNight]).toEqual([1, 1, 0]);
  });

  it("Shabbat windows (Fri 18:00 → Sat 19:00) fully inside the span", () => {
    expect(s.shabbat).toEqual({ weeks: 2, silentWeeks: 1, messages: 1 });
  });

  it("mentions (with Hebrew prefixes, once per message), monologues, night, questions, links", () => {
    expect([dana.mentionedByOthers, yoav.mentionedByOthers, maya.mentionedByOthers]).toEqual([0, 3, 1]);
    expect([dana.longestMonologue, yoav.longestMonologue, maya.longestMonologue]).toEqual([2, 1, 3]);
    expect([dana.nightMessages, maya.nightMessages]).toEqual([1, 3]);
    expect([dana.questions, maya.questions]).toEqual([2, 0]);
    expect(maya.links).toBe(1);
    expect(s.links).toBe(1);
  });

  it("media, voice notes, deleted, edited", () => {
    expect(maya.media).toEqual({ image: 0, video: 0, audio: 1, sticker: 0, gif: 0, document: 0, other: 1 });
    expect(maya.voiceNotes).toBe(1);
    expect(maya.deleted).toBe(1);
    expect(s.deleted).toBe(1);
    expect(yoav.edited).toBe(1);
    expect(s.mediaTotals).toEqual({ image: 0, video: 0, audio: 1, sticker: 0, gif: 0, document: 0, other: 1 });
  });

  it("calendar: daily zero-filled, monthly by person, weekday, hourly, record, streak, silence", () => {
    expect(s.daily).toHaveLength(13);
    expect(s.daily.slice(0, 6)).toEqual([
      { date: "2026-06-03", count: 9 },
      { date: "2026-06-04", count: 4 },
      { date: "2026-06-05", count: 2 },
      { date: "2026-06-06", count: 2 },
      { date: "2026-06-07", count: 0 },
      { date: "2026-06-08", count: 1 },
    ]);
    expect(s.daily.at(-1)).toEqual({ date: "2026-06-15", count: 1 });
    expect(s.monthly).toEqual([{ month: "2026-06", count: 19, byPerson: { p0: 7, p1: 6, p2: 6 } }]);
    expect(s.weekday).toEqual([0, 2, 0, 9, 4, 2, 2]);
    expect(s.hourly[8]).toBe(7);
    expect(s.hourly[4]).toBe(4);
    expect(s.hourly[23]).toBe(2);
    expect(s.hourly.reduce((a, b) => a + b, 0)).toBe(19);
    expect(maya.peakHour).toBe(4);
    expect(s.recordDay).toEqual({ date: "2026-06-03", count: 9 });
    expect(s.longestStreak).toEqual({ start: "2026-06-03", end: "2026-06-06", days: 4 });
    expect(s.longestSilence).toEqual({ fromTs: utc(2026, 6, 8, 9, 0), toTs: utc(2026, 6, 15, 10, 0), ms: 7 * DAY + 3_600_000 });
  });

  it("words and emojis", () => {
    expect(s.topWords.slice(0, 5)).toEqual([
      ["בוקר", 3],
      ["לילה", 2],
      ["שבת", 2],
      ["שלום", 2],
      ["שבוע", 2],
    ]);
    const all = s.topWords.map(([w]) => w);
    // stop-words, laughs, URL parts and member names (tracked as mentions) never show up
    for (const bad of ["טוב", "אני", "מה", "את", "לא", "למה", "lol", "חחחח", "https", "example", "יואב", "מאיה"]) expect(all).not.toContain(bad);
    expect(s.topEmojis).toEqual([
      ["😂", 3],
      ["☀️", 1],
      ["😅", 1],
      ["❤️", 1],
    ]);
    expect(dana.topEmojis).toEqual([
      ["☀️", 1],
      ["😅", 1],
      ["❤️", 1],
    ]);
  });

  it("longest message, first/last messages, no catchphrases or silly awards in a tiny chat", () => {
    expect(s.longestMessage).toEqual({ authorId: "p0", text: "יואב מה התוכניות להיום?", ts: utc(2026, 6, 3, 8, 5), words: 4 });
    expect(dana.longestMessage?.words).toBe(4);
    expect(s.firstMessages.map((m) => m.id)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(s.lastMessages.map((m) => m.id)).toEqual([13, 14, 15, 16, 17, 18]);
    expect(s.catchphrases).toEqual([]);
    expect(s.awards).toEqual([]);
  });
});

describe("detectors", () => {
  it.each(["חח", "חחח", "חחחחחחחח", "ההה", "חחחהחח", "lol", "loool", "lmao", "lmfao", "haha", "hahaha", "ahahah", "hehe", "jajaja", "kkkk", "www", "555", "xd"])(
    "laugh: %s",
    (t) => expect(isLaughToken(t)).toBe(true),
  );
  it.each(["חה", "ה", "הה", "חג", "חחם", "aha", "ha", "hello", "look", "kk", "500", "www2"])("not a laugh: %s", (t) =>
    expect(isLaughToken(t)).toBe(false),
  );

  it("emojis keep ZWJ / skin-tone / flag / keycap sequences whole", () => {
    expect(scanEmojis("hi 👍🏽 👨‍👩‍👧‍👦 🇮🇱 1️⃣ ❤️ ©").emojis).toEqual(["👍🏽", "👨‍👩‍👧‍👦", "🇮🇱", "1️⃣", "❤️"]);
    expect(scanEmojis("😂😂🤣").emojis).toEqual(["😂", "😂", "🤣"]);
    expect(scanEmojis("🔥 🔥 ").onlyEmoji).toBe(true);
    expect(scanEmojis("🔥 yes").onlyEmoji).toBe(false);
    expect(scanEmojis("no emoji here 123").emojis).toEqual([]);
  });

  it.each([
    ["בוקר טוב", 2, 1],
    ["בוקר טובבבב לכולם", 3, 1],
    ["☀️ בוקר אור", 2, 1],
    ["בוקר!", 1, 1],
    ["good morning guys", 3, 1],
    ["gm", 1, 1],
    ["לילה טוב", 2, 2],
    ["לילה", 1, 2],
    ["gn all", 2, 2],
    ["Good night ❤️", 2, 2],
    ["בוקר מחר נדבר על זה ונראה מה קורה עם כולם", 10, 0],
    ["לילה שלם לא ישנתי בגלל השכנים", 6, 0],
    ["gmail is down", 3, 0],
  ] as const)("greeting %s", (text, words, expected) => {
    expect(greetingOf(text.toLowerCase(), words)).toBe(expected);
  });
});

describe("catchphrases", () => {
  it("finds repeated phrases, skips greetings/filler, merges fragments, names the top author", () => {
    const lines: string[] = [];
    let k = 0;
    const say = (who: string, text: string) => {
      const mm = String(k % 60).padStart(2, "0");
      const hh = String(8 + Math.floor(k / 60)).padStart(2, "0");
      lines.push(`10/07/2026, ${hh}:${mm} - ${who}: ${text}`);
      k++;
    };
    for (let i = 0; i < 5; i++) say(i < 4 ? "רון" : "גל", "אין מצב שזה קורה באמת");
    for (let i = 0; i < 4; i++) say("גל", "טוב יאללה תביאו את הבירות מהמקרר");
    for (let i = 0; i < 6; i++) say(i % 2 ? "רון" : "גל", "בוקר טוב");
    for (let i = 0; i < 6; i++) say("רון", "יאללה יאללה");
    for (let i = 0; i < 6; i++) say("גל", "אני לא");
    for (let i = 0; i < 3; i++) say("רון", "בא לי");
    for (let i = 0; i < 2; i++) say("גל", "פעמיים זה לא מספיק");
    const s = computeStats(parseChatText(lines.join("\n"), { validate: false }));
    const phrases = s.catchphrases.map((c) => c.phrase);
    expect(phrases).toContain("אין מצב שזה קורה באמת");
    // The whole repeated line is rebuilt from overlapping 4-grams; the leading filler "טוב" is trimmed.
    expect(phrases).toContain("יאללה תביאו את הבירות מהמקרר");
    expect(phrases.some((p) => p.startsWith("טוב "))).toBe(false);
    expect(s.catchphrases.find((c) => c.phrase === "אין מצב שזה קורה באמת")).toEqual({ phrase: "אין מצב שזה קורה באמת", count: 5, topAuthorId: "p0" });
    for (const bad of ["בוקר טוב", "יאללה יאללה", "אני לא", "בא לי", "פעמיים זה לא מספיק", "מצב שזה קורה"]) expect(phrases).not.toContain(bad);
    // no phrase is a fragment of another one with the same count
    for (const a of s.catchphrases)
      for (const b of s.catchphrases) if (a !== b) expect(b.phrase.includes(a.phrase) && b.count >= 0.6 * a.count).toBe(false);
    expect(s.catchphrases.length).toBeLessThanOrEqual(12);
  });
});

describe("awards", () => {
  const chat = parseChatText(generateChat(6000, 11, 200));
  const s = computeStats(chat);

  it("are valid, unique, capped at 10, and match the per-person numbers", () => {
    expect(s.awards.length).toBeGreaterThan(0);
    expect(s.awards.length).toBeLessThanOrEqual(10);
    const keys = s.awards.map((a) => a.key);
    expect(new Set(keys).size).toBe(keys.length);
    const ids = new Set(s.perPerson.map((p) => p.id));
    for (const a of s.awards) {
      expect(ids.has(a.winnerId)).toBe(true);
      expect(a.emoji).toBe(STAT_AWARD_META[a.key].emoji);
      const p = s.perPerson.find((x) => x.id === a.winnerId)!;
      const metric: Partial<Record<StatAwardKey, number>> = {
        chatterbox: p.messages,
        laugh_track: p.laugh.count,
        conversation_starter: p.conversationStarts,
        conversation_killer: p.conversationEnds,
        voice_note_podcaster: p.voiceNotes,
        sticker_lord: p.media.sticker,
        deleter: p.deleted,
        editor: p.edited,
        monologue: p.longestMonologue,
        most_mentioned: p.mentionedByOthers,
        good_morning: p.goodMorning,
        good_night: p.goodNight,
        speedy: p.medianReplyMs ?? NaN,
        slowpoke: p.medianReplyMs ?? NaN,
      };
      if (metric[a.key] !== undefined) expect(a.value).toBe(metric[a.key]);
    }
  });

  it("spread across people (nobody hoards more than the cap)", () => {
    const per = new Map<string, number>();
    for (const a of s.awards) per.set(a.winnerId, (per.get(a.winnerId) ?? 0) + 1);
    const cap = Math.max(3, Math.ceil(10 / s.perPerson.length) + 1);
    for (const n of per.values()) expect(n).toBeLessThanOrEqual(cap);
    expect(per.size).toBeGreaterThan(1);
  });

  it("no ghost award in a two-person chat", () => {
    const two = parseChatText(
      Array.from({ length: 300 }, (_, i) => `01/0${1 + Math.floor(i / 100)}/2026, 10:${String(i % 60).padStart(2, "0")} - ${i % 7 ? "A" : "B"}: hi`).join("\n"),
    );
    expect(computeStats(two).awards.some((a) => a.key === "ghost")).toBe(false);
  });

  it("every key has display metadata", () => {
    for (const meta of Object.values(STAT_AWARD_META)) expect(meta.emoji.length).toBeGreaterThan(0);
  });
});

describe("robustness", () => {
  it("is deterministic", () => {
    const chat = parseChatText(generateChat(2000, 3, 60));
    expect(JSON.stringify(computeStats(chat))).toBe(JSON.stringify(computeStats(chat)));
  });

  it("does not mutate the chat", () => {
    const chat = parseChatText(generateChat(500, 5, 30));
    const before = JSON.stringify(chat);
    computeStats(chat);
    expect(JSON.stringify(chat)).toBe(before);
  });

  it("handles an empty chat and a single message", () => {
    const empty: ParsedChat = { format: "unknown", dateOrder: "DMY", messages: [], systemEvents: [], participants: [], warnings: [] };
    const e: ChatStats = computeStats(empty);
    expect(e.totalMessages).toBe(0);
    expect(e.hourly).toHaveLength(24);
    expect(e.awards).toEqual([]);
    const one = computeStats(parseChatText("01/01/2026, 10:00 - A: hi", { validate: false }));
    expect(one.daysSpan).toBe(1);
    expect(one.daily).toEqual([{ date: "2026-01-01", count: 1 }]);
    expect(one.longestSilence).toBeNull();
    expect(one.medianReplyMs).toBeNull();
    expect(one.perPerson[0].peakHour).toBe(10);
  });
});
