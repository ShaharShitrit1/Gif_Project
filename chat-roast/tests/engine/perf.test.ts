import { describe, expect, it } from "vitest";
import { parseChatText } from "../../lib/parser";
import { computeStats } from "../../lib/stats";
import { generateChat } from "./generate";

describe("performance", () => {
  it("parses and computes stats for 100k messages fast (stats < 1.5 s)", () => {
    const text = generateChat(100_000, 99, 1500);
    let t = performance.now();
    const chat = parseChatText(text);
    const parseMs = performance.now() - t;
    expect(chat.messages).toHaveLength(100_000);

    computeStats(chat); // warm-up (JIT)
    t = performance.now();
    const stats = computeStats(chat);
    const statsMs = performance.now() - t;

    console.info(`[perf] 100k messages: parse ${parseMs.toFixed(0)} ms, stats ${statsMs.toFixed(0)} ms`);
    expect(stats.totalMessages).toBe(100_000);
    expect(statsMs).toBeLessThan(1500);
    expect(parseMs).toBeLessThan(3000);
  }, 60_000);
});
