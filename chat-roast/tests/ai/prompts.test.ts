import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";
import { parseChatText } from "../../lib/parser";
import { computeStats } from "../../lib/stats";
import { buildAskParams, buildReportParams, mapError } from "../../lib/ai/generate";
import { ASK_SYSTEM_PROMPT, REPORT_SYSTEM_PROMPT, reportTaskBlock } from "../../lib/ai/prompts";
import { DEMO_REPORT } from "../../lib/ai/demo-report";
import { buildReportRequest, buildStatsDigest, estimateTokens } from "../../lib/ai/transcript";
import Anthropic from "@anthropic-ai/sdk";

const chat = parseChatText(readFileSync(new URL("../../public/samples/demo-chat.txt", import.meta.url), "utf8"));
const stats = computeStats(chat);
const req = buildReportRequest({ chat, stats, chatType: "friends", language: "Hebrew", personaId: "savta", intensity: 3, selfId: "p5", extraContext: "Call Noa at 050-1234567" });

afterEach(() => {
  delete process.env.CHATROAST_MODEL;
  delete process.env.CHATROAST_EFFORT;
});

describe("report request params", () => {
  it("follows the Opus 5.5 rules: adaptive thinking, explicit effort, structured output, refusal fallback, no sampling params", () => {
    const p = buildReportParams(req);
    expect(p.model).toBe("claude-opus-5-5");
    expect(p.thinking).toEqual({ type: "adaptive" });
    expect(p.output_config?.effort).toBe("high");
    expect(p.output_config?.format?.type).toBe("json_schema");
    expect(p.fallbacks).toBe("default");
    expect(p.betas).toEqual(["server-side-fallback-2026-07-01"]);
    expect(p).not.toHaveProperty("temperature");
    expect(p).not.toHaveProperty("top_p");
    expect(p.messages.at(-1)!.role).toBe("user"); // no prefill
    expect(p.max_tokens).toBeGreaterThanOrEqual(32_000);
  });

  it("honours CHATROAST_MODEL / CHATROAST_EFFORT", () => {
    process.env.CHATROAST_MODEL = "claude-opus-5";
    process.env.CHATROAST_EFFORT = "medium";
    const p = buildReportParams(req);
    expect(p.model).toBe("claude-opus-5");
    expect(p.output_config?.effort).toBe("medium");
  });

  it("keeps the system prompt byte-stable across requests (cacheable)", () => {
    const a = buildReportParams(req);
    const b = buildReportParams(buildReportRequest({ chat, stats, chatType: "work", language: "English", personaId: "doc", intensity: 1 }));
    expect(a.system).toEqual(b.system);
    expect(REPORT_SYSTEM_PROMPT).not.toMatch(/\d{4}-\d\d-\d\d|Date\.now/);
  });

  it("puts the documents first and the settings last", () => {
    const content = buildReportParams(req).messages[0].content as { type: string; text: string }[];
    expect(content[0].text.startsWith("<chat_transcript>")).toBe(true);
    const task = content[content.length - 1].text;
    expect(task).toContain("Narrator: savta");
    expect(task).toContain("Intensity: 3");
    expect(task).toContain("Report language: Hebrew");
    expect(task).toContain("Uploader: מאיה");
    expect(task).toContain("[phone]");
    expect(task).not.toContain("050-1234567");
    expect(task).toMatch(/- p3: שירה \(248 messages\)/);
  });

  it("lists only the 15 most active members for profiling in big groups", () => {
    const big = { ...req, participants: Array.from({ length: 20 }, (_, i) => ({ id: `p${i}`, name: `Person ${i}`, messages: 100 - i })) };
    const task = reportTaskBlock(big);
    expect(task).toContain("- p14: Person 14");
    expect(task).not.toContain("- p15: Person 15");
    expect(task).toContain("p19: Person 19 (81)");
  });
});

describe("ask request params", () => {
  const ask = {
    personaId: "max" as const,
    language: "Hebrew",
    intensity: 2 as const,
    report: DEMO_REPORT,
    participants: req.participants,
    transcript: req.transcript,
    statsDigest: req.statsDigest,
    history: [
      { role: "user" as const, content: "מי הכי מצחיק?" },
      { role: "assistant" as const, content: "שירה." },
    ],
    question: "ומה עם מאיה?",
    focusParticipantId: "p5",
  };

  it("caches the stable prefix and appends the question last", () => {
    const p = buildAskParams(ask);
    expect(p.output_config?.effort).toBe("medium");
    expect(p.cache_control).toEqual({ type: "ephemeral" });
    expect(p.system).toEqual([{ type: "text", text: ASK_SYSTEM_PROMPT }]);
    const first = p.messages[0].content as { text: string; cache_control?: unknown }[];
    expect(first[0].cache_control).toEqual({ type: "ephemeral" });
    expect(first[0].text).toContain("<report_you_wrote>");
    expect(first[1].text).toBe("מי הכי מצחיק?");
    expect(p.messages.map((m) => m.role)).toEqual(["user", "assistant", "user"]);
    const last = p.messages[2].content as string;
    expect(last).toContain('<deep_dive person="מאיה" id="p5">');
    expect(last.endsWith("ומה עם מאיה?")).toBe(true);
  });

  it("produces the same prefix on the next turn (cache hits)", () => {
    const a = buildAskParams({ ...ask, focusParticipantId: undefined });
    const b = buildAskParams({ ...ask, focusParticipantId: undefined, history: [...ask.history, { role: "user", content: "ומה עם מאיה?" }, { role: "assistant", content: "חחחח" }], question: "ודניאל?" });
    expect(JSON.stringify(b.messages).startsWith(JSON.stringify(a.messages).slice(0, -2))).toBe(true);
  });
});

describe("stats digest", () => {
  it("stays compact and model-friendly", () => {
    const digest = buildStatsDigest(stats, chat);
    expect(estimateTokens(digest)).toBeLessThan(2_500);
    expect(digest).toContain("record day 2026-08-14 (116 msgs)");
    expect(digest).toContain("- p1 עומר: 161 msgs");
    expect(digest).toContain("voice notes 61");
    expect(digest).toContain("STAT AWARDS");
  });
});

describe("error mapping", () => {
  const headers = new Headers();
  it("maps typed SDK errors to stream codes", () => {
    expect(mapError(new Anthropic.RateLimitError(429, {}, "x", headers))?.code).toBe("rate_limited");
    expect(mapError(new Anthropic.OverloadedError(529, {}, "x", headers))?.code).toBe("overloaded");
    expect(mapError(new Anthropic.BadRequestError(400, {}, "x", headers))?.code).toBe("bad_request");
    expect(mapError(new Anthropic.ContentTooLargeError(413, {}, "x", headers))?.code).toBe("too_large");
    expect(mapError(new Anthropic.InternalServerError(500, {}, "x", headers))?.code).toBe("server_error");
    expect(mapError(new Anthropic.APIError(undefined, { error: { type: "overloaded_error" } }, undefined, headers))?.code).toBe("overloaded");
    expect(mapError(new Anthropic.APIUserAbortError())).toBeNull();
  });
});
