import { describe, expect, it } from "vitest";
import { applyIdentity, parseChatText } from "../../lib/parser";
import type { ParsedChat } from "../../lib/types";

// p0 = Dana (40 msgs), p1 = Yoav (25), p2 = "Dana work" (10), p3 = +972 (5)
function chat(): ParsedChat {
  const lines: string[] = [];
  const who = (i: number) => (i < 40 ? "Dana" : i < 65 ? "Yoav" : i < 75 ? "Dana work" : "+972 50-000-0000");
  const order = Array.from({ length: 80 }, (_, i) => i);
  // Interleave so first-message order is Dana, Yoav, Dana work, +972.
  order.sort((a, b) => (a % 20) - (b % 20) || a - b);
  order.forEach((src, k) => {
    const mm = String(k % 60).padStart(2, "0");
    lines.push(`0${1 + Math.floor(k / 60)}/05/2026, 10:${mm} - ${who(src)}: msg ${src}`);
  });
  return parseChatText(lines.join("\n"));
}

function deepFreeze<T>(o: T): T {
  if (o && typeof o === "object") {
    Object.freeze(o);
    for (const v of Object.values(o)) deepFreeze(v);
  }
  return o;
}

describe("applyIdentity", () => {
  const original = deepFreeze(chat());
  const snapshot = JSON.stringify(original);

  it("fixture sanity", () => {
    expect(original.participants.map((p) => [p.id, p.displayName, p.messageCount])).toEqual([
      ["p0", "Dana", 40],
      ["p1", "Yoav", 25],
      ["p2", "Dana work", 10],
      ["p3", "+972 50-000-0000", 5],
    ]);
  });

  it("merges a source into a target and recomputes counts / first / last", () => {
    const out = applyIdentity(original, { merges: { p2: "p0" }, names: {} });
    expect(out.participants.map((p) => p.id)).toEqual(["p0", "p1", "p3"]);
    const dana = out.participants[0];
    expect(dana.messageCount).toBe(50);
    expect(dana.originalNames).toEqual(["Dana", "Dana work"]);
    const danaMsgs = out.messages.filter((m) => m.author === "p0");
    expect(danaMsgs).toHaveLength(50);
    expect(dana.firstTs).toBe(Math.min(...danaMsgs.map((m) => m.ts)));
    expect(dana.lastTs).toBe(Math.max(...danaMsgs.map((m) => m.ts)));
    expect(out.messages.some((m) => m.author === "p2")).toBe(false);
    expect(out.messages.map((m) => m.id)).toEqual(original.messages.map((m) => m.id));
  });

  it("renames, trims, ignores blank names and names of merged-away ids", () => {
    const out = applyIdentity(original, { merges: { p2: "p0" }, names: { p1: "  יואב  ", p3: "   ", p2: "ignored" } });
    expect(out.participants.find((p) => p.id === "p1")?.displayName).toBe("יואב");
    expect(out.participants.find((p) => p.id === "p3")?.displayName).toBe("+972 50-000-0000");
    expect(out.participants.some((p) => p.displayName === "ignored")).toBe(false);
  });

  it("marks exactly one self, resolving through merges", () => {
    const out = applyIdentity(original, { merges: { p2: "p0" }, names: {}, selfId: "p2" });
    expect(out.participants.filter((p) => p.isSelf).map((p) => p.id)).toEqual(["p0"]);
    const none = applyIdentity(original, { merges: {}, names: {}, selfId: null });
    expect(none.participants.some((p) => p.isSelf)).toBe(false);
  });

  it("follows merge chains and survives cycles", () => {
    const chain = applyIdentity(original, { merges: { p3: "p2", p2: "p1" }, names: {} });
    // 40 vs 40: tie broken by first message (Dana wrote first).
    expect(chain.participants.map((p) => [p.id, p.messageCount])).toEqual([
      ["p0", 40],
      ["p1", 40],
    ]);
    expect(chain.participants[1].originalNames).toEqual(["Yoav", "Dana work", "+972 50-000-0000"]);
    const cycle = applyIdentity(original, { merges: { p2: "p3", p3: "p2" }, names: {} });
    expect(cycle.participants.map((p) => [p.id, p.messageCount])).toEqual([
      ["p0", 40],
      ["p1", 25],
      ["p2", 15],
    ]);
    const ids = new Set(cycle.participants.map((p) => p.id));
    expect(cycle.messages.every((m) => ids.has(m.author))).toBe(true);
  });

  it("ignores unknown targets and self-merges", () => {
    const out = applyIdentity(original, { merges: { p1: "p9", p0: "p0" }, names: {} });
    expect(out.participants.map((p) => p.id)).toEqual(["p0", "p1", "p2", "p3"]);
  });

  it("re-sorts participants by message count after merges (ids stay stable)", () => {
    const out = applyIdentity(original, { merges: { p0: "p3" }, names: {} });
    expect(out.participants.map((p) => [p.id, p.displayName, p.messageCount])).toEqual([
      ["p3", "+972 50-000-0000", 45],
      ["p1", "Yoav", 25],
      ["p2", "Dana work", 10],
    ]);
  });

  it("is pure: never mutates its input and is repeatable from the original", () => {
    const a = applyIdentity(original, { merges: { p2: "p0" }, names: { p0: "Dana K" }, selfId: "p0" });
    const b = applyIdentity(a, { merges: {}, names: {} });
    expect(JSON.stringify(original)).toBe(snapshot);
    expect(a.messages[0]).not.toBe(original.messages[0]);
    expect(b.participants.find((p) => p.id === "p0")?.isSelf).toBeUndefined();
    const again = applyIdentity(original, { merges: { p2: "p0" }, names: { p0: "Dana K" }, selfId: "p0" });
    expect(again).toEqual(a);
  });
});
