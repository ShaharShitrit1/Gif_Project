import { afterEach, describe, expect, it } from "vitest";
import { aiConfig } from "../../lib/ai/config";
import { generateReportGemini } from "../../lib/ai/gemini";
import type { ReportStreamEvent } from "../../lib/types";

const KEYS = ["AI_PROVIDER", "GEMINI_API_KEY", "ANTHROPIC_API_KEY", "MOCK_AI", "GEMINI_MODEL"] as const;
const saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));
afterEach(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});
const set = (env: Partial<Record<(typeof KEYS)[number], string>>) => {
  for (const k of KEYS) delete process.env[k];
  Object.assign(process.env, env);
};

describe("provider selection", () => {
  it("uses Gemini automatically when only GEMINI_API_KEY is set", () => {
    set({ GEMINI_API_KEY: "g" });
    const c = aiConfig();
    expect(c.provider).toBe("gemini");
    expect(c.hasServerKey).toBe(true);
    expect(c.mock).toBe(false);
    expect(c.geminiModel).toBe("gemini-flash-latest");
  });
  it("prefers Claude when both keys exist, unless AI_PROVIDER=gemini", () => {
    set({ GEMINI_API_KEY: "g", ANTHROPIC_API_KEY: "a" });
    expect(aiConfig().provider).toBe("anthropic");
    set({ GEMINI_API_KEY: "g", ANTHROPIC_API_KEY: "a", AI_PROVIDER: "gemini" });
    expect(aiConfig().provider).toBe("gemini");
  });
  it("falls back to mock mode with no keys", () => {
    set({});
    expect(aiConfig().mock).toBe(true);
    set({ AI_PROVIDER: "gemini" });
    expect(aiConfig().mock).toBe(true);
  });
});

describe("generateReportGemini", () => {
  it("reports a clean error event (never throws) when the API is unreachable", async () => {
    set({ GEMINI_API_KEY: "not-a-real-key", AI_PROVIDER: "gemini" });
    const events: ReportStreamEvent[] = [];
    const req = {
      chatType: "friends", language: "Hebrew", personaId: "max", intensity: 2,
      participants: [{ id: "p0", name: "נועה", messages: 3 }, { id: "p1", name: "איתי", messages: 2 }],
      transcript: "p0=נועה, p1=איתי\n## 2026-06-01 (Mon)\n10:00 p0: היי", statsDigest: "x",
      transcriptMeta: { totalMessages: 5, includedMessages: 5, fromTs: 0, toTs: 1, truncated: false, approxTokens: 50 },
    } as const;
    await generateReportGemini(structuredClone(req) as never, (e) => events.push(e), new AbortController().signal);
    const last = events.at(-1);
    expect(last?.type).toBe("error");
  }, 60_000);
});
