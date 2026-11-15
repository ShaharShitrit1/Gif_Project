import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { ReportRequest } from "../../lib/types";
import { parseChatText } from "../../lib/parser";
import { computeStats } from "../../lib/stats";
import { buildMockAnswer, buildMockReport } from "../../lib/ai/mock";
import { AIReportSchema, REPORT_JSON_SCHEMA, checkReport, isCompleteReport, requiredMemberIds } from "../../lib/ai/schema";
import { DEMO_REPORT } from "../../lib/ai/demo-report";
import { buildReportRequest } from "../../lib/ai/transcript";

const chat = parseChatText(readFileSync(new URL("../../public/samples/demo-chat.txt", import.meta.url), "utf8"));
const stats = computeStats(chat);
const request = (over: Partial<Parameters<typeof buildReportRequest>[0]> = {}): ReportRequest =>
  buildReportRequest({ chat, stats, chatType: "friends", language: "Hebrew", personaId: "max", intensity: 2, groupName: "החבר'ה 🍕", ...over });
const participants = chat.participants.map((p) => ({ id: p.id, messages: p.messageCount }));

type Node = Record<string, unknown>;
function walk(node: unknown, visit: (n: Node, path: string) => void, path = "$") {
  if (!node || typeof node !== "object") return;
  visit(node as Node, path);
  for (const [k, v] of Object.entries(node as Node)) {
    if (Array.isArray(v)) v.forEach((x, i) => walk(x, visit, `${path}.${k}[${i}]`));
    else if (v && typeof v === "object") walk(v, visit, `${path}.${k}`);
  }
}

describe("REPORT_JSON_SCHEMA", () => {
  it("respects the structured-outputs JSON Schema limits", () => {
    const banned = ["minimum", "maximum", "multipleOf", "minLength", "maxLength", "pattern", "maxItems", "$ref"];
    walk(REPORT_JSON_SCHEMA, (n, path) => {
      for (const b of banned) expect(n[b], `${path}.${b}`).toBeUndefined();
      if (n.minItems !== undefined) expect([0, 1]).toContain(n.minItems);
      if (n.type === "object") {
        expect(n.additionalProperties, path).toBe(false);
        expect(new Set(n.required as string[]), path).toEqual(new Set(Object.keys(n.properties as object)));
      }
    });
  });

  it("has exactly the AIReport keys (zod and JSON schema agree)", () => {
    expect(Object.keys(REPORT_JSON_SCHEMA.properties).sort()).toEqual(Object.keys(AIReportSchema.shape).sort());
    expect(Object.keys(REPORT_JSON_SCHEMA.properties.members.items.properties).sort()).toEqual(
      Object.keys(DEMO_REPORT.members[0]).sort(),
    );
  });
});

describe("checkReport", () => {
  it("accepts the demo report untouched", () => {
    const { report, problems } = checkReport(DEMO_REPORT, participants);
    expect(problems).toEqual([]);
    expect(report).toEqual(DEMO_REPORT);
  });

  it("repairs what it can and lists what it can't", () => {
    const broken = structuredClone(DEMO_REPORT);
    broken.members = broken.members.filter((m) => m.id !== "p4");
    broken.members.push({ ...broken.members[0], id: "p99" }, { ...broken.members[0] });
    broken.members[1].closestTo = "nobody";
    broken.scores[0].value = 140;
    broken.awards.push({ emoji: "🏆", title: "x", winnerId: "ghost", reason: "y" });
    const { report, problems } = checkReport(broken, participants);
    expect(report!.members.map((m) => m.id)).toEqual(["p3", "p0", "p2", "p1", "p5"].filter((id) => report!.members.some((m) => m.id === id)));
    expect(report!.members.some((m) => m.id === "p99")).toBe(false);
    expect(report!.scores[0].value).toBe(100);
    expect(report!.awards.every((a) => participants.some((p) => p.id === a.winnerId))).toBe(true);
    expect(problems.join(" ")).toContain("p4");
  });

  it("rejects malformed output", () => {
    expect(checkReport({ title: "x" }, participants).report).toBeNull();
    expect(checkReport({ ...DEMO_REPORT, members: [] }, participants).report).toBeNull();
  });

  it("requires at most 15 profiles, the most active ones", () => {
    const many = Array.from({ length: 30 }, (_, i) => ({ id: `p${i}`, messages: i }));
    const req = requiredMemberIds(many);
    expect(req).toHaveLength(15);
    expect(req[0]).toBe("p29");
    expect(req).not.toContain("p0");
  });
});

describe("mock report", () => {
  it.each(["max", "savta", "doc"] as const)("is a complete report in Hebrew (%s)", (personaId) => {
    const req = request({ personaId });
    const report = buildMockReport(req);
    expect(AIReportSchema.safeParse(report).success).toBe(true);
    expect(isCompleteReport(report, req.participants)).toBe(true);
    expect(report.subtitle).toContain("916");
    expect(/[֐-׿]/.test(report.verdict)).toBe(true);
    // Real quotes from the transcript, by the right person.
    for (const m of report.members) {
      const lines = req.transcript.split("\n").filter((l) => l.includes(` ${m.id}: `));
      expect(lines.some((l) => l.includes(m.signatureQuote)), `${m.id}: ${m.signatureQuote}`).toBe(true);
    }
  });

  it("falls back to English for other languages and stays complete", () => {
    const req = request({ language: "French", personaId: "doc" });
    const report = buildMockReport(req);
    expect(isCompleteReport(report, req.participants)).toBe(true);
    expect(report.followUps[0]).toMatch(/[A-Za-z]/);
  });

  it("answers follow-ups, including a personal deep-dive", () => {
    const req = request();
    const base = { personaId: "max" as const, language: "Hebrew", intensity: 2 as const, report: DEMO_REPORT, participants: req.participants, transcript: req.transcript, statsDigest: req.statsDigest, history: [] };
    expect(buildMockAnswer({ ...base, question: "מי הכי מצחיק?" })).toMatch(/[֐-׿]/);
    const deep = buildMockAnswer({ ...base, question: "deep dive", focusParticipantId: "p5" });
    expect(deep).toContain("מאיה");
    expect(deep).toContain("**");
  });
});
