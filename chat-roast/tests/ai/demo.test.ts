import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseChatText } from "../../lib/parser";
import { computeStats } from "../../lib/stats";
import { DEMO_REPORT, DEMO_SETTINGS } from "../../lib/ai/demo-report";
import { checkReport, isCompleteReport } from "../../lib/ai/schema";
import { buildReportRequest } from "../../lib/ai/transcript";

const text = readFileSync(new URL("../../public/samples/demo-chat.txt", import.meta.url), "utf8");
const chat = parseChatText(text, { filename: "demo-chat.txt" });
const stats = computeStats(chat);
const participants = chat.participants.map((p) => ({ id: p.id, messages: p.messageCount }));
const nameOf = (id: string) => chat.participants.find((p) => p.id === id)!.displayName;
const strip = (s: string) => s.replace(/[‎‏]/g, "");

describe("demo chat", () => {
  it("parses as an iOS Hebrew group with 6 friends in first-message order", () => {
    expect(chat.format).toBe("ios");
    expect(chat.title).toBe(DEMO_SETTINGS.groupName);
    const order = ["נועה", "עומר", "איתי", "שירה", "דניאל", "מאיה"];
    order.forEach((name, i) => expect(nameOf(`p${i}`)).toBe(name));
    expect(chat.messages.length).toBeGreaterThanOrEqual(700);
    expect(chat.messages.length).toBeLessThanOrEqual(1000);
    expect(chat.systemEvents.filter((e) => e.type === "subject")).toHaveLength(5);
    expect(chat.messages.some((m) => m.kind === "deleted")).toBe(true);
    expect(chat.messages.some((m) => m.edited)).toBe(true);
    expect(chat.messages.some((m) => m.kind === "audio")).toBe(true);
  });

  it("spans about five months", () => {
    expect(stats.daysSpan).toBeGreaterThanOrEqual(140);
    expect(stats.daysSpan).toBeLessThanOrEqual(170);
  });
});

describe("DEMO_REPORT", () => {
  it("is a complete, valid report for the demo participants", () => {
    const { report, problems } = checkReport(DEMO_REPORT, participants);
    expect(problems).toEqual([]);
    expect(report).not.toBeNull();
    expect(isCompleteReport(DEMO_REPORT, participants)).toBe(true);
    expect(DEMO_REPORT.members.map((m) => m.id)).toEqual(["p3", "p0", "p2", "p1", "p5", "p4"]);
    expect(DEMO_REPORT.scores).toHaveLength(4);
    expect(DEMO_REPORT.followUps).toHaveLength(4);
    expect(DEMO_REPORT.awards.length).toBeGreaterThanOrEqual(5);
    expect(DEMO_REPORT.title.length).toBeLessThanOrEqual(80);
  });

  it("uses only real, verbatim signature quotes by the right person", () => {
    for (const m of DEMO_REPORT.members) {
      const mine = chat.messages.filter((x) => x.author === m.id).map((x) => strip(x.text));
      expect(mine.some((t) => t.includes(m.signatureQuote)), `${m.id}: ${m.signatureQuote}`).toBe(true);
    }
  });

  it("only quotes phrases that exist in the chat", () => {
    const all = strip(text);
    const jokes = DEMO_REPORT.insideJokes.map((j) => j.phrase);
    for (const phrase of jokes) expect(all.includes(phrase), phrase).toBe(true);
    const turning = DEMO_REPORT.turningPoint!;
    expect(turning.when).toContain("15 בספטמבר");
    const sep15 = chat.messages.find((m) => m.author === "p5" && m.text.includes("סגרתי צימר בגליל"))!;
    expect(new Date(sep15.ts).toISOString().slice(0, 16)).toBe("2026-09-15T23:12");
  });

  it("cites numbers that match computeStats on the demo chat", () => {
    const pp = (id: string) => stats.perPerson.find((p) => p.id === id)!;
    expect(stats.totalMessages).toBe(916);
    expect(stats.daysSpan).toBe(163);
    expect(stats.conversations).toBe(128);
    expect(stats.recordDay).toEqual({ date: "2026-08-14", count: 116 });
    expect(stats.mediaTotals.audio).toBe(61);
    expect(pp("p1").voiceNotes).toBe(61);
    expect(pp("p0").conversationStarts).toBe(55);
    expect(pp("p0").goodMorning).toBe(22);
    expect(stats.goodMorning.days).toBe(22);
    expect(pp("p3").messages).toBe(248);
    expect(pp("p3").nightMessages).toBe(97);
    expect(pp("p3").peakHour).toBe(2);
    expect(pp("p4").messages).toBe(65);
    expect(Math.round((pp("p4").medianReplyMs ?? 0) / 60000)).toBe(16);
    expect(pp("p5").messages).toBe(105);
    expect(pp("p5").laugh.count).toBe(81);
    expect(pp("p5").questions).toBe(0);
    expect(pp("p5").conversationEnds).toBe(40);
    expect(stats.longestMessage?.authorId).toBe("p5");
    expect(stats.longestMessage?.words).toBe(88);
    // Counted directly from the chat.
    const daniel = chat.messages.filter((m) => m.author === "p4");
    expect(daniel.filter((m) => m.text.includes("אולי"))).toHaveLength(17);
    expect(chat.messages.filter((m) => m.author === "p2" && /בפנים/.test(m.text))).toHaveLength(12);
    expect(chat.messages.filter((m) => m.author === "p1" && /בקיצור/.test(m.text))).toHaveLength(9);
  });

  it("builds a compact report request for the demo chat", () => {
    const req = buildReportRequest({ chat, stats, ...DEMO_SETTINGS });
    expect(req.transcriptMeta.truncated).toBe(false);
    expect(req.transcriptMeta.includedMessages).toBe(916);
    expect(req.transcript).not.toContain("052-3344556");
    expect(req.transcript).toContain("[phone]");
    expect(req.transcript).toContain("[link:tiktok.com]");
    expect(req.transcript).toContain("[link:google.com]");
  });
});
