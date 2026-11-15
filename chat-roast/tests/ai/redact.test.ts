import { describe, expect, it } from "vitest";
import { estimateTokens, redact } from "../../lib/ai/transcript";

describe("redact", () => {
  it.each([
    ["תתקשרו ל 050-1234567 בבקשה", "תתקשרו ל [phone] בבקשה"],
    ["0501234567", "[phone]"],
    ["054 123 4567", "[phone]"],
    ["+972 50-123-4567", "[phone]"],
    ["+972501234567", "[phone]"],
    ["@972501234567 בוא", "@[phone] בוא"],
    ["landline 03-1234567", "landline [phone]"],
    ["call +1 (415) 555-0132 now", "call [phone] now"],
    ["+44 20 7946 0958", "[phone]"],
    ["mail me: noa.levi+trip@gmail.com!", "mail me: [email]!"],
    ["כרטיס 4580 1234 5678 9012", "כרטיס [card]"],
    ["4580123456789012", "[card]"],
    ["ת.ז. 123456782", "ת.ז. [id]"],
    ["IBAN IL62 0108 0000 0009 9999 999", "IBAN [iban]"],
  ])("masks %s", (input, expected) => {
    expect(redact(input)).toBe(expected);
  });

  it("keeps only the registrable domain of links", () => {
    expect(redact("https://vm.tiktok.com/ZMhq8kR2xY/")).toBe("[link:tiktok.com]");
    expect(redact("ראיתם? https://www.ynet.co.il/news/article/abc123")).toBe("ראיתם? [link:ynet.co.il]");
    expect(redact("www.instagram.com/p/xyz.")).toBe("[link:instagram.com].");
    expect(redact("(https://docs.google.com/spreadsheets/d/1aB3/edit#gid=0)")).toBe("([link:google.com])");
    expect(redact("youtu.be/dQw4w9WgXcQ")).toBe("[link:youtu.be]");
    expect(redact("bit.ly/3xYz")).toBe("[link:bit.ly]");
    expect(redact("https://chat.whatsapp.com/AbCdEf123")).toBe("[link:whatsapp.com]");
    expect(redact("https://x.com/somebody/status/1234567890123456789")).toBe("[link:x.com]");
  });

  it("stops a URL at glued Hebrew text", () => {
    expect(redact("https://ynet.co.il/a/1234567מטורף")).toBe("[link:ynet.co.il]מטורף");
  });

  it("leaves times, dates, prices and small numbers alone", () => {
    const s = "נפגשים ב-21:30 ב12/06/2026, 2026-06-12, 12.06.2026, עולה ₪450, 3 חדרים, 15-17 באוקטובר, 100-200";
    expect(redact(s)).toBe(s);
    expect(redact("I'm on 9% and it's 1,234,567 steps")).toBe("I'm on 9% and it's 1,234,567 steps");
  });

  it("is idempotent", () => {
    const once = redact("050-1234567 https://vm.tiktok.com/x a@b.co 4580 1234 5678 9012 123456782 www.ynet.co.il");
    expect(redact(once)).toBe(once);
    expect(once).toBe("[phone] [link:tiktok.com] [email] [card] [id] [link:ynet.co.il]");
  });
});

describe("estimateTokens", () => {
  it("is conservative for Hebrew/CJK and cheap for English", () => {
    const en = estimateTokens("the quick brown fox jumps over the lazy dog ".repeat(20));
    const he = estimateTokens("השועל החום המהיר קופץ מעל הכלב העצלן ".repeat(20));
    const zh = estimateTokens("敏捷的棕色狐狸跳过了懒狗".repeat(20));
    expect(en).toBeGreaterThan(180); // ~9 tokens per sentence
    expect(en).toBeLessThan(400);
    expect(he).toBeGreaterThan(en * 1.6);
    expect(zh / 240).toBeGreaterThan(1); // > 1 token per CJK char
    expect(estimateTokens("😂😂😂")).toBeGreaterThanOrEqual(6);
  });
});
