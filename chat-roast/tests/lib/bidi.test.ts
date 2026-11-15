import { describe, expect, it } from "vitest";
import { isolateDeep, isolateForeignRuns, stripIsolates } from "../../lib/bidi";

const FSI = "⁨";
const PDI = "⁩";

describe("isolateForeignRuns", () => {
  it("isolates Hebrew runs inside English text (keeps punctuation/emoji outside)", () => {
    expect(isolateForeignRuns("החבר'ה 🍕: 6 people", "ltr")).toBe(`${FSI}החבר'ה${PDI} 🍕: 6 people`);
    expect(isolateForeignRuns("שירה wrote 27%, דניאל 7%", "ltr")).toBe(`${FSI}שירה${PDI} wrote 27%, ${FSI}דניאל${PDI} 7%`);
  });
  it("isolates Latin runs inside Hebrew text", () => {
    expect(isolateForeignRuns("שלחו 12 TikTok videos ביום", "rtl")).toBe(`שלחו 12 ${FSI}TikTok videos${PDI} ביום`);
  });
  it("leaves same-direction text untouched", () => {
    expect(isolateForeignRuns("קראתי 916 הודעות", "rtl")).toBe("קראתי 916 הודעות");
    expect(isolateForeignRuns("I read 916 messages", "ltr")).toBe("I read 916 messages");
  });
  it("is idempotent", () => {
    const once = isolateForeignRuns("החבר'ה 🍕: 6 people", "ltr");
    expect(isolateForeignRuns(once, "ltr")).toBe(once);
    expect(stripIsolates(once)).toBe("החבר'ה 🍕: 6 people");
  });
  it("deep-maps strings but never ids", () => {
    const out = isolateDeep({ id: "p0", title: "שירה rules", members: [{ id: "p1", winnerId: "p2", roast: "נועה lol" }] }, "ltr");
    expect(out.id).toBe("p0");
    expect(out.members[0].id).toBe("p1");
    expect(out.members[0].winnerId).toBe("p2");
    expect(out.title).toBe(`${FSI}שירה${PDI} rules`);
  });
});
