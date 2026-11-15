import { describe, expect, it } from "vitest";
import type { Message, ParsedChat, Participant } from "../../lib/types";
import { buildTranscript, estimateTokens } from "../../lib/ai/transcript";

const DAY = 86_400_000;
const START = Date.UTC(2026, 0, 1);

/** Synthetic chat: `days` days, with busy days on every 10th day. */
function makeChat(days: number, perDay: (d: number) => number = (d) => (d % 10 === 5 ? 60 : 8)): ParsedChat {
  const messages: Message[] = [];
  const authors = ["p0", "p1", "p2"];
  for (let d = 0; d < days; d++) {
    const n = perDay(d);
    for (let i = 0; i < n; i++) {
      const ts = START + d * DAY + 9 * 3_600_000 + i * 60_000;
      messages.push({
        id: messages.length,
        ts,
        author: authors[(d + i) % 3],
        text: i % 7 === 3 ? "" : `הודעה מספר ${i} ביום ${d} עם קצת טקסט כדי שיהיה מה לספור 😂`,
        kind: i % 7 === 3 ? "audio" : "text",
      });
    }
  }
  const participants: Participant[] = authors.map((id, i) => ({
    id,
    originalNames: [["נועה", "Itay 🌴", "+972 50-123-4567"][i]],
    displayName: ["נועה", "איתי", "+972 50-123-4567"][i],
    messageCount: messages.filter((m) => m.author === id).length,
    firstTs: messages.find((m) => m.author === id)?.ts ?? START,
    lastTs: [...messages].reverse().find((m) => m.author === id)?.ts ?? START,
  }));
  return { format: "ios", dateOrder: "DMY", messages, systemEvents: [], participants, warnings: [] };
}

function dayCounts(chat: ParsedChat): Map<string, number> {
  const m = new Map<string, number>();
  for (const msg of chat.messages) {
    const k = new Date(msg.ts).toISOString().slice(0, 10);
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
}

/** Messages per included day, counting "×N" collapses. */
function includedPerDay(transcript: string): Map<string, number> {
  const out = new Map<string, number>();
  let day = "";
  for (const line of transcript.split("\n")) {
    if (line.startsWith("## ")) {
      day = line.slice(3, 13);
      out.set(day, 0);
      continue;
    }
    const m = /^\d\d:\d\d p\d+: .*?(?: ×(\d+))?$/.exec(line);
    if (m && day) out.set(day, out.get(day)! + Number(m[1] ?? 1));
    if (line.startsWith("[…")) day = "";
  }
  return out;
}

describe("buildTranscript", () => {
  it("renders the compact format with legend, day headers and media tags", () => {
    const chat = makeChat(3);
    const { transcript, meta } = buildTranscript(chat);
    const lines = transcript.split("\n");
    expect(lines[0]).toBe("PARTICIPANTS: p0=נועה, p1=איתי, p2=Member 3");
    expect(transcript).toContain("## 2026-01-01 (Thu)");
    expect(transcript).toMatch(/\n09:03 p\d: \[voice note\]\n/);
    expect(transcript).not.toContain("050-123");
    expect(meta).toMatchObject({ totalMessages: 24, includedMessages: 24, truncated: false });
    expect(meta.fromTs).toBe(chat.messages[0].ts);
    expect(meta.toTs).toBe(chat.messages[chat.messages.length - 1].ts);
    expect(meta.approxTokens).toBe(estimateTokens(transcript));
  });

  it("collapses runs of identical messages and clips long ones", () => {
    const chat = makeChat(1, () => 1);
    const base = chat.messages[0];
    const long = "א".repeat(2000);
    chat.messages = [
      ...[0, 1, 2, 3, 4].map((i) => ({ ...base, id: i, ts: base.ts + i * 1000, author: "p0", text: "חחחח", kind: "text" as const })),
      { ...base, id: 5, ts: base.ts + 9000, author: "p1", text: long, kind: "text" as const },
      { ...base, id: 6, ts: base.ts + 9500, author: "p1", text: "שורה\nשנייה", kind: "text" as const, edited: true },
      { ...base, id: 7, ts: base.ts + 9900, author: "p2", text: "", kind: "deleted" as const },
    ];
    const { transcript, meta } = buildTranscript(chat);
    expect(transcript).toContain("p0: חחחח ×5");
    expect(transcript).toMatch(/p1: א{400}… \[\+1600 chars\]/);
    expect(transcript).toContain("p1: שורה ↵ שנייה (edited)");
    expect(transcript).toContain("p2: [deleted]");
    expect(meta.includedMessages).toBe(8);
  });

  it("samples whole days within budget, keeping the start and the end", () => {
    const chat = makeChat(200);
    const full = buildTranscript(chat);
    const budget = 30_000;
    expect(full.meta.approxTokens).toBeGreaterThan(budget * 2.5);

    const { transcript, meta } = buildTranscript(chat, { maxTokens: budget });
    expect(meta.truncated).toBe(true);
    expect(meta.approxTokens).toBeLessThanOrEqual(budget);
    expect(meta.totalMessages).toBe(chat.messages.length);
    expect(transcript).toMatch(/^TRANSCRIPT \(sampled: [\d,]+ of [\d,]+ messages/m);

    // No half days: every included day has all of its messages.
    const counts = dayCounts(chat);
    const included = includedPerDay(transcript);
    for (const [day, n] of included) expect(n, day).toBe(counts.get(day));
    // Meta matches what is actually in the text.
    const sum = [...included.values()].reduce((a, b) => a + b, 0);
    expect(meta.includedMessages).toBe(sum);
    // How it started + where it is now.
    expect(included.has("2026-01-01")).toBe(true);
    const lastDay = new Date(chat.messages[chat.messages.length - 1].ts).toISOString().slice(0, 10);
    expect(included.has(lastDay)).toBe(true);
    expect(meta.fromTs).toBe(chat.messages[0].ts);
    expect(meta.toTs).toBe(chat.messages[chat.messages.length - 1].ts);
    // Busy days are favoured, and the middle of the span is represented.
    const busyIncluded = [...included.keys()].filter((d) => counts.get(d) === 60).length;
    expect(busyIncluded).toBeGreaterThan(3);
    const middle = [...included.keys()].filter((d) => d >= "2026-03-01" && d <= "2026-05-31").length;
    expect(middle).toBeGreaterThan(2);
    // Skip markers report exact message counts.
    const skipped = [...transcript.matchAll(/\[… ([\d,]+) messages skipped/g)].reduce((s, m) => s + Number(m[1].replace(/,/g, "")), 0);
    expect(skipped + meta.includedMessages).toBe(meta.totalMessages);
    // Chronological order.
    const days = [...transcript.matchAll(/^## (\d{4}-\d\d-\d\d)/gm)].map((m) => m[1]);
    expect([...days].sort()).toEqual(days);
  });

  it("handles a single day bigger than the whole budget", () => {
    const chat = makeChat(1, () => 3000);
    const { transcript, meta } = buildTranscript(chat, { maxTokens: 5_000 });
    expect(meta.truncated).toBe(true);
    expect(meta.includedMessages).toBeGreaterThan(50);
    expect(meta.includedMessages).toBeLessThan(3000);
    expect(meta.approxTokens).toBeLessThanOrEqual(5_000);
    expect(transcript).toContain("more messages that day skipped");
  });

  it("is fast on a large chat", () => {
    const chat = makeChat(1500, () => 70); // 105k messages
    const t = performance.now();
    const { meta } = buildTranscript(chat);
    expect(performance.now() - t).toBeLessThan(4000);
    expect(meta.approxTokens).toBeLessThanOrEqual(150_000);
    expect(meta.truncated).toBe(true);
  });
});
