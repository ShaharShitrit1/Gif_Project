import { describe, expect, it } from "vitest";
import { parseChatText } from "../../lib/parser";
import { ChatParseError, MIN_MESSAGES, type ParsedChat } from "../../lib/types";
import {
  LRM,
  NNBSP,
  RLM,
  androidEnglish,
  androidHebrew,
  iosHebrewGroup,
  iosNarrowSpace,
  iosZipChat,
  isoChat,
} from "./fixtures";

const utc = (y: number, mo: number, d: number, h = 0, mi = 0, s = 0) => Date.UTC(y, mo - 1, d, h, mi, s);

function catchErr(fn: () => unknown): ChatParseError {
  try {
    fn();
  } catch (e) {
    if (e instanceof ChatParseError) return e;
    throw e;
  }
  throw new Error("expected ChatParseError");
}

/** Two senders, n messages, Android DMY 24h — tiny building block for edge-case tests. */
function androidLines(n: number, day = "15/03/2026"): string[] {
  return Array.from({ length: n }, (_, i) => `${day}, ${String(10 + Math.floor(i / 60)).padStart(2, "0")}:${String(i % 60).padStart(2, "0")} - ${i % 2 ? "Bo" : "Al"}: m${i}`);
}

const byName = (chat: ParsedChat, name: string) => {
  const p = chat.participants.find((x) => x.displayName === name);
  if (!p) throw new Error(`no participant ${name}`);
  return p;
};

describe("iOS Hebrew group (24h, seconds, bidi marks)", () => {
  const chat = parseChatText(iosHebrewGroup());
  const head = chat.messages.slice(0, 19);

  it("detects format, date order and title from the group-name author", () => {
    expect(chat.format).toBe("ios");
    expect(chat.dateOrder).toBe("DMY");
    expect(chat.title).toBe("החבר'ה 🌴");
    expect(chat.warnings).toEqual([]);
  });

  it("never turns the group name into a participant; strips ~ and invisible marks", () => {
    expect(chat.participants.map((p) => p.displayName)).toEqual(["דנה כהן", "יואב", "+972 50-123-4567"]);
    expect(chat.participants.map((p) => p.id)).toEqual(["p0", "p1", "p2"]);
    expect(chat.participants.some((p) => p.displayName.includes("החבר"))).toBe(false);
    const total = chat.participants.reduce((n, p) => n + p.messageCount, 0);
    expect(total).toBe(chat.messages.length);
  });

  it("parses timestamps as wall-clock-as-UTC with seconds", () => {
    expect(head[0].ts).toBe(utc(2026, 6, 1, 9, 1, 0));
    expect(head[1].ts).toBe(utc(2026, 6, 1, 9, 1, 30));
    expect(head[0]).toMatchObject({ id: 0, author: "p0", kind: "text", text: "בוקר טוב לכולם ☀️" });
  });

  it("classifies every media / deleted / special line", () => {
    expect(head.map((m) => m.kind)).toEqual([
      "text", "text", "image", "text", "text", "deleted", "text", "audio", "sticker", "gif", "video",
      "document", "contact", "poll", "location", "call", "viewonce", "deleted", "text",
    ]);
    for (const m of head) if (m.kind !== "text" && m.kind !== "poll") expect(m.text).toBe("");
  });

  it("keeps multi-line messages (including blank lines) and the edited flag", () => {
    expect(head[4].text).toBe("שורה ראשונה\nשורה שנייה\n\nשורה רביעית אחרי ריקה");
    expect(head[6]).toMatchObject({ text: "תיקנתי את זה", edited: true });
    expect(head[3].text).toBe("מי זה? חחחחח");
    expect(head[3].author).toBe("p2");
  });

  it("turns polls into question + bullet options", () => {
    expect(head[13].text).toBe("לאן יוצאים בשישי?\n• ים\n• פארק");
  });

  it("collects system events with types and no unbalanced bidi controls", () => {
    expect(chat.systemEvents.map((e) => e.type)).toEqual(["encryption", "created", "added", "subject", "icon", "added"]);
    expect(chat.systemEvents[5].text).toBe("דנה הוסיפה את +972 50-123-4567");
    expect(chat.systemEvents[0].ts).toBe(utc(2026, 6, 1, 9, 0, 0));
  });

  it("does not mistake a normal message mentioning WhatsApp for a system line", () => {
    expect(head[18]).toMatchObject({ kind: "text", text: "עברתי ל-WhatsApp חדש, זה עובד?" });
  });
});

describe("Android English 12h (M/D/YY, h:mm AM - )", () => {
  const chat = parseChatText(androidEnglish());

  it("detects MDY, android, and the latest subject as title (colon inside the subject)", () => {
    expect(chat.format).toBe("android");
    expect(chat.dateOrder).toBe("MDY");
    expect(chat.title).toBe("Weekend Crew: Reloaded");
  });

  it("converts 12h clock, including 12 AM / 12 PM and narrow no-break spaces", () => {
    const night = chat.messages.find((m) => m.text === "night shift again");
    const noon = chat.messages.find((m) => m.text === "noon");
    expect(night?.ts).toBe(utc(2026, 6, 15, 0, 30));
    expect(noon?.ts).toBe(utc(2026, 6, 15, 12, 5));
    expect(chat.messages.find((m) => m.text === "filler 1")?.ts).toBe(utc(2026, 6, 15, 13, 0));
  });

  it("classifies placeholders", () => {
    const kinds = chat.messages.slice(0, 11).map((m) => m.kind);
    expect(kinds).toEqual(["text", "media", "text", "deleted", "deleted", "text", "text", "poll", "location", "call", "viewonce"]);
    expect(chat.messages[5]).toMatchObject({ text: "see you at 5", edited: true });
    expect(chat.messages[6].text).toBe("Multi line\nsecond line");
    expect(chat.messages[7].text).toBe("Pizza or sushi?\n• Pizza\n• Sushi");
  });

  it("types English system events", () => {
    expect(chat.systemEvents.map((e) => e.type)).toEqual([
      "encryption", "created", "added", "subject", "left", "icon", "number_changed", "security_code", "disappearing",
    ]);
    expect(chat.participants.map((p) => p.displayName).sort()).toEqual(["Alex Rivera", "Jordan", "Sam Lee"]);
  });
});

describe("Android Hebrew 24h (D.M.YYYY, HH:mm - ), CRLF", () => {
  const chat = parseChatText(androidHebrew());

  it("detects DMY from a day > 12 and takes the title from the latest subject", () => {
    expect(chat.dateOrder).toBe("DMY");
    expect(chat.format).toBe("android");
    expect(chat.title).toBe("משפחה: גרסה 2");
    expect(chat.messages.find((m) => m.text === "לילה טוב 🌙")?.ts).toBe(utc(2026, 3, 13, 23, 59));
  });

  it("handles Hebrew placeholders, attachments with captions and voice notes", () => {
    const [gm, media, del1, del2, edited, img, ptt, loc, call, sticker] = chat.messages;
    expect(gm.text).toBe("בוקר טוב משפחה");
    expect(media.kind).toBe("media");
    expect(del1.kind).toBe("deleted");
    expect(del2.kind).toBe("deleted");
    expect(edited).toMatchObject({ text: "מגיע בשבע", edited: true });
    expect(img).toMatchObject({ kind: "image", attachment: "IMG-20260305-WA0001.jpg", text: "תמונה מהטיול" });
    expect(ptt).toMatchObject({ kind: "audio", attachment: "PTT-20260305-WA0002.opus", text: "" });
    expect(loc).toMatchObject({ kind: "location", text: "" });
    expect(call.kind).toBe("call");
    expect(sticker).toMatchObject({ kind: "sticker", attachment: "00000099-STICKER-2026-03-05-08-14-00.webp" });
    expect(chat.messages.every((m) => !m.text.includes("\r"))).toBe(true);
  });

  it("types Hebrew system events", () => {
    expect(chat.systemEvents.map((e) => e.type)).toEqual(["encryption", "created", "added", "subject", "left", "description"]);
  });

  it("orders participants by message count with ids by first message", () => {
    expect(chat.participants.map((p) => [p.id, p.displayName])).toEqual([
      ["p2", "נועה"],
      ["p1", "אבא"],
      ["p0", "אמא"],
    ]);
  });
});

describe("other header formats", () => {
  it("ISO-ish YYYY-MM-DD", () => {
    const chat = parseChatText(isoChat());
    expect(chat.dateOrder).toBe("YMD");
    expect(chat.messages[0].ts).toBe(utc(2026, 2, 1, 8, 0));
    expect(chat.messages[20].ts).toBe(utc(2026, 2, 2, 8, 0));
    expect(chat.warnings).toEqual([]);
  });

  it("iOS 12h with narrow no-break space before AM/PM (1:1 chat → contact name as title)", () => {
    const chat = parseChatText(iosNarrowSpace());
    expect(chat.format).toBe("ios");
    expect(chat.dateOrder).toBe("MDY");
    expect(chat.title).toBe("Chris");
    expect(chat.messages[0].ts).toBe(utc(2026, 6, 15, 0, 0)); // 12:00 AM
    expect(chat.messages[12].ts).toBe(utc(2026, 6, 15, 12, 12)); // 12:12 PM
    expect(chat.messages[13].ts).toBe(utc(2026, 6, 15, 13, 13));
    expect(chat.systemEvents).toHaveLength(1);
    expect(chat.warnings).toEqual([]);
  });

  it("zip-style <attached: …> lines get kind + attachment", () => {
    const chat = parseChatText(iosZipChat());
    expect(chat.title).toBe("Beach Club");
    expect(chat.messages.slice(0, 7).map((m) => [m.kind, m.attachment])).toEqual([
      ["image", "00000012-PHOTO-2026-07-01-10-00-05.jpg"],
      ["audio", "00000013-AUDIO-2026-07-01-10-00-06.opus"],
      ["video", "00000014-VIDEO-2026-07-01-10-00-07.mp4"],
      ["sticker", "00000015-STICKER-2026-07-01-10-00-08.webp"],
      ["gif", "00000016-GIF-2026-07-01-10-00-09.mp4"],
      ["document", "00000017-Menu.pdf"],
      ["contact", "00000018-Dana.vcf"],
    ]);
  });

  it("German-style dotted dates with 2-digit years and old iOS 'time: Name:' separator", () => {
    const lines = Array.from({ length: 60 }, (_, i) => `${13 + (i % 3)}.11.26, 09:${String(i).padStart(2, "0")}:00: ${i % 2 ? "Uli" : "Eva"}: Hallo ${i}`);
    const chat = parseChatText(lines.join("\n"));
    expect(chat.format).toBe("ios");
    expect(chat.dateOrder).toBe("DMY");
    expect(chat.messages[0]).toMatchObject({ ts: utc(2026, 11, 13, 9, 0), text: "Hallo 0" });
  });

  it("a.m./p.m. and Hebrew לפנה״צ / אחה״צ", () => {
    const lines = [
      ...Array.from({ length: 30 }, (_, i) => `20/05/2026, 9:${String(i).padStart(2, "0")} a.m. - Ana: hola ${i}`),
      ...Array.from({ length: 30 }, (_, i) => `21/05/2026, 3:${String(i).padStart(2, "0")} אחה״צ - Ben: שלום ${i}`),
      `22/05/2026, 12:10 לפנה"צ - Ana: חצות`,
      `22/05/2026, 11:59 p. m. - Ben: tarde`,
    ];
    const chat = parseChatText(lines.join("\n"));
    expect(chat.messages[0].ts).toBe(utc(2026, 5, 20, 9, 0));
    expect(chat.messages[30].ts).toBe(utc(2026, 5, 21, 15, 0));
    expect(chat.messages[60].ts).toBe(utc(2026, 5, 22, 0, 10));
    expect(chat.messages[61].ts).toBe(utc(2026, 5, 22, 23, 59));
  });

  it("BOM, leading LRM before '[' and RLM-wrapped names", () => {
    const lines = Array.from({ length: 60 }, (_, i) => `${LRM}[16/04/2026, 10:${String(i).padStart(2, "0")}:00] ${RLM}${i % 2 ? "Noa" : "Tom"}${RLM}: hi ${i}`);
    const chat = parseChatText("﻿" + lines.join("\r\n"));
    expect(chat.participants.map((p) => p.displayName)).toEqual(["Tom", "Noa"]);
    expect(chat.messages).toHaveLength(60);
  });

  it("'~ Name' and 'Name' (contact saved later) are one participant", () => {
    const lines = androidLines(60).map((l, i) => (i % 4 === 1 ? l.replace(" - Bo:", ` - ~${NNBSP}Bo:`) : l));
    const chat = parseChatText(lines.join("\n"));
    expect(chat.participants.map((p) => p.displayName)).toEqual(["Al", "Bo"]);
    expect(byName(chat, "Bo").messageCount).toBe(30);
  });
});

describe("date order detection", () => {
  it("uses the second field > 12 for MDY", () => {
    const chat = parseChatText([...androidLines(30, "03/04/2026"), ...androidLines(30, "03/14/2026")].join("\n"));
    expect(chat.dateOrder).toBe("MDY");
    expect(chat.messages[0].ts).toBe(utc(2026, 3, 4, 10, 0));
  });

  it("falls back to monotonic span when every field is ≤ 12 (DD/MM June 1–12)", () => {
    const lines: string[] = [];
    for (let d = 1; d <= 12; d++) lines.push(...androidLines(5, `${String(d).padStart(2, "0")}/06/2026`));
    const chat = parseChatText(lines.join("\n"));
    expect(chat.dateOrder).toBe("DMY");
    expect(chat.messages.at(-1)?.ts).toBe(utc(2026, 6, 12, 10, 4));
  });

  it("…and picks MM/DD for the mirror chat", () => {
    const lines: string[] = [];
    for (let d = 1; d <= 12; d++) lines.push(...androidLines(5, `06/${String(d).padStart(2, "0")}/2026`));
    expect(parseChatText(lines.join("\n")).dateOrder).toBe("MDY");
  });

  it("prefers monotonic order when one reading goes backwards", () => {
    // DMY truth: 11 Jan, 12 Jan, 1 Feb, 2 Feb → MDY reading would jump Nov→Dec→Jan(back)→Feb.
    const lines = ["11/01/2026", "12/01/2026", "01/02/2026", "02/02/2026"].flatMap((d) => androidLines(15, d));
    expect(parseChatText(lines.join("\n")).dateOrder).toBe("DMY");
  });

  it("single ambiguous day: Hebrew → DMY, English AM/PM → MDY, with a warning", () => {
    const he = Array.from({ length: 60 }, (_, i) => `05/06/2026, 10:${String(i).padStart(2, "0")} - ${i % 2 ? "רון" : "גל"}: היי`);
    const heChat = parseChatText(he.join("\n"));
    expect(heChat.dateOrder).toBe("DMY");
    expect(heChat.warnings.some((w) => w.includes("ambiguous"))).toBe(true);
    const en = Array.from({ length: 60 }, (_, i) => `05/06/26, 10:${String(i).padStart(2, "0")} AM - ${i % 2 ? "Ron" : "Gal"}: hey`);
    const enChat = parseChatText(en.join("\n"));
    expect(enChat.dateOrder).toBe("MDY");
    expect(enChat.messages[0].ts).toBe(utc(2026, 5, 6, 10, 0));
  });
});

describe("titles", () => {
  const base = androidLines(60).join("\n");
  it.each([
    ["WhatsApp Chat - Weekend Crew.zip", "Weekend Crew"],
    ["WhatsApp Chat with Weekend Crew.txt", "Weekend Crew"],
    ["WhatsApp Chat with Weekend Crew (1).txt", "Weekend Crew"],
    ["צ'אט WhatsApp עם משפחה 🏡.txt", "משפחה 🏡"],
    ["_chat.txt", undefined],
  ])("from filename %s", (filename, title) => {
    expect(parseChatText(base, { filename }).title).toBe(title);
  });

  it("from the creation event when nothing better exists", () => {
    const chat = parseChatText([`15/03/2026, 09:00 - Al created group "Book Club 📚"`, base].join("\n"));
    expect(chat.title).toBe("Book Club 📚");
  });
});

describe("warnings", () => {
  it("counts garbage before the first message and impossible dates", () => {
    const text = ["garbage line", "another", ...androidLines(60), "31/02/2026, 10:00 - Al: impossible"].join("\n");
    const chat = parseChatText(text);
    expect(chat.warnings).toContain("Skipped 2 unparseable lines before the first message.");
    expect(chat.warnings).toContain("Skipped 1 line with an impossible date.");
    expect(chat.messages).toHaveLength(60);
  });

  it("reports out-of-order messages", () => {
    const lines = androidLines(60);
    lines.push("14/03/2026, 08:00 - Al: from the past");
    expect(parseChatText(lines.join("\n")).warnings.some((w) => w.includes("out of chronological order"))).toBe(true);
  });
});

describe("errors", () => {
  it("not_chat_export for arbitrary text", () => {
    const e = catchErr(() => parseChatText("Dear diary,\ntoday nothing happened.\n"));
    expect(e.code).toBe("not_chat_export");
  });

  it("not_chat_export for an empty string", () => {
    expect(catchErr(() => parseChatText("")).code).toBe("not_chat_export");
  });

  it("empty_chat_export when there are only system lines", () => {
    const text = [
      `15/03/2026, 09:00 - Messages and calls are end-to-end encrypted. No one outside of this chat can read them.`,
      `15/03/2026, 09:00 - Al created group "Empty"`,
    ].join("\n");
    expect(catchErr(() => parseChatText(text)).code).toBe("empty_chat_export");
  });

  it("too_few_messages with details", () => {
    const e = catchErr(() => parseChatText(androidLines(10).join("\n")));
    expect(e.code).toBe("too_few_messages");
    expect(e.details).toEqual({ messageCount: 10, min: MIN_MESSAGES });
  });

  it("single_sender_chat", () => {
    const text = androidLines(80).map((l) => l.replace(" - Bo:", " - Al:")).join("\n");
    const e = catchErr(() => parseChatText(text));
    expect(e.code).toBe("single_sender_chat");
    expect(e.details).toMatchObject({ messageCount: 80, name: "Al" });
  });

  it("validate: false lets tiny chats through", () => {
    expect(parseChatText(androidLines(3).join("\n"), { validate: false }).messages).toHaveLength(3);
  });

  it("ChatParseError is a real Error with name and message", () => {
    const e = catchErr(() => parseChatText("nope"));
    expect(e).toBeInstanceOf(Error);
    expect(e.name).toBe("ChatParseError");
    expect(e.message).toBe("not_chat_export");
  });
});
