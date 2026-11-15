import { test } from "vitest";
import { parseChatText } from "../../lib/parser";
import * as F from "./fixtures";
test("smoke", () => {
  for (const [name, txt] of [["iosHe", F.iosHebrewGroup()], ["andEn", F.androidEnglish()], ["andHe", F.androidHebrew()], ["iso", F.isoChat()], ["nn", F.iosNarrowSpace()], ["zip", F.iosZipChat()]] as const) {
    const c = parseChatText(txt, { validate: false });
    console.log("=====", name, c.format, c.dateOrder, JSON.stringify(c.title), c.messages.length, c.warnings);
    console.log(c.participants.map((p) => `${p.id}:${p.displayName}:${p.messageCount}`).join(" | "));
    for (const m of c.messages.slice(0, 26)) console.log(new Date(m.ts).toISOString(), m.author, m.kind, m.edited ? "E" : "", m.attachment ?? "", JSON.stringify(m.text));
    for (const e of c.systemEvents) console.log("  SYS", new Date(e.ts).toISOString(), e.type, JSON.stringify(e.text));
  }
});
