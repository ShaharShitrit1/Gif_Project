import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { parseChatFile } from "../../lib/parser";
import { ChatParseError, MAX_FILE_BYTES } from "../../lib/types";
import { androidEnglish, iosZipChat } from "./fixtures";

async function catchErr(p: Promise<unknown>): Promise<ChatParseError> {
  try {
    await p;
  } catch (e) {
    if (e instanceof ChatParseError) return e;
    throw e;
  }
  throw new Error("expected ChatParseError");
}

async function zipFile(name: string, entries: Record<string, string | Uint8Array>): Promise<File> {
  const zip = new JSZip();
  for (const [path, data] of Object.entries(entries)) zip.file(path, data);
  const bytes = await zip.generateAsync({ type: "arraybuffer" });
  return new File([bytes], name, { type: "application/zip" });
}

const plainAndroid = Array.from({ length: 60 }, (_, i) => `15/03/2026, 10:${String(i).padStart(2, "0")} - ${i % 2 ? "Bo" : "Al"}: m${i}`).join("\n");

describe("parseChatFile — .txt", () => {
  it("parses a File", async () => {
    const chat = await parseChatFile(new File([androidEnglish()], "WhatsApp Chat with Weekend Crew.txt", { type: "text/plain" }));
    expect(chat.messages.length).toBeGreaterThan(50);
    expect(chat.title).toBe("Weekend Crew: Reloaded"); // latest subject beats the file name
  });

  it("takes the title from the file name when the chat has none", async () => {
    const chat = await parseChatFile(new File([plainAndroid], "WhatsApp Chat with Al & Bo.txt"));
    expect(chat.title).toBe("Al & Bo");
  });

  it("parses a nameless Blob by sniffing", async () => {
    const chat = await parseChatFile(new Blob([plainAndroid]));
    expect(chat.messages).toHaveLength(60);
  });

  it("decodes UTF-16LE with BOM", async () => {
    const text = "﻿" + plainAndroid.replace("m0", "שלום");
    const bytes = new Uint8Array(text.length * 2);
    for (let i = 0; i < text.length; i++) {
      bytes[i * 2] = text.charCodeAt(i) & 0xff;
      bytes[i * 2 + 1] = text.charCodeAt(i) >> 8;
    }
    const chat = await parseChatFile(new File([bytes], "chat.txt"));
    expect(chat.messages[0].text).toBe("שלום");
  });

  it("wrong_extension with details.ext", async () => {
    const e = await catchErr(parseChatFile(new File(["x"], "report.pdf")));
    expect(e.code).toBe("wrong_extension");
    expect(e.details).toEqual({ ext: "pdf" });
  });

  it("encrypted_backup for .crypt14 files", async () => {
    const e = await catchErr(parseChatFile(new File([new Uint8Array([1, 2, 3])], "msgstore-2026-06-01.1.db.crypt14")));
    expect(e.code).toBe("encrypted_backup");
  });

  it("file_too_large", async () => {
    const big = new File(["x"], "chat.txt");
    Object.defineProperty(big, "size", { value: MAX_FILE_BYTES + 1 });
    const e = await catchErr(parseChatFile(big));
    expect(e.code).toBe("file_too_large");
    expect(e.details).toEqual({ size: MAX_FILE_BYTES + 1, max: MAX_FILE_BYTES });
  });

  it("empty_chat_export for a 0-byte file (e.g. a cloud placeholder)", async () => {
    expect((await catchErr(parseChatFile(new File([], "chat.txt")))).code).toBe("empty_chat_export");
  });

  it("not_chat_export for binary junk named .txt", async () => {
    const junk = new Uint8Array(4000).map((_, i) => (i * 7919) % 256);
    expect((await catchErr(parseChatFile(new File([junk], "chat.txt")))).code).toBe("not_chat_export");
  });
});

describe("parseChatFile — .zip", () => {
  it("iOS zip: picks _chat.txt among attachments, ignores __MACOSX, keeps attachments", async () => {
    const file = await zipFile("WhatsApp Chat - Beach Club.zip", {
      "_chat.txt": iosZipChat(),
      "00000012-PHOTO-2026-07-01-10-00-05.jpg": new Uint8Array([0xff, 0xd8, 0xff]),
      "00000013-AUDIO-2026-07-01-10-00-06.opus": new Uint8Array([1, 2, 3]),
      "__MACOSX/._chat.txt": "junk",
      "notes.txt": "not the chat",
    });
    const chat = await parseChatFile(file);
    expect(chat.title).toBe("Beach Club");
    expect(chat.messages[0]).toMatchObject({ kind: "image", attachment: "00000012-PHOTO-2026-07-01-10-00-05.jpg" });
    expect(chat.messages[1]).toMatchObject({ kind: "audio", attachment: "00000013-AUDIO-2026-07-01-10-00-06.opus" });
  });

  it("Android zip: inner 'WhatsApp Chat with X.txt' gives the title when the zip name is generic", async () => {
    const file = await zipFile("export (3).zip", { "WhatsApp Chat with Al & Bo.txt": plainAndroid, "IMG-20260315-WA0001.jpg": "x" });
    const chat = await parseChatFile(file);
    expect(chat.title).toBe("Al & Bo");
    expect(chat.messages).toHaveLength(60);
  });

  it("archive_without_transcript with entry count", async () => {
    const file = await zipFile("photos.zip", { "a.jpg": "1", "b.jpg": "2", "__MACOSX/._a.jpg": "3" });
    const e = await catchErr(parseChatFile(file));
    expect(e.code).toBe("archive_without_transcript");
    expect(e.details).toEqual({ entries: 2 });
  });

  it("encrypted_backup when the zip holds a crypt14 backup", async () => {
    const file = await zipFile("backup.zip", { "Databases/msgstore.db.crypt14": new Uint8Array([9, 9, 9]) });
    expect((await catchErr(parseChatFile(file))).code).toBe("encrypted_backup");
  });

  it("zip_corrupt for a broken archive", async () => {
    const bytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 1, 2, 3, 4, 5, 6, 7, 8]);
    expect((await catchErr(parseChatFile(new File([bytes], "chat.zip")))).code).toBe("zip_corrupt");
  });

  it("zip_corrupt for a .zip that is not a zip at all", async () => {
    expect((await catchErr(parseChatFile(new File(["hello"], "chat.zip")))).code).toBe("zip_corrupt");
  });

  it("a zip renamed to .txt is still opened as a zip", async () => {
    const file = await zipFile("chat.txt", { "_chat.txt": iosZipChat() });
    expect((await parseChatFile(file)).title).toBe("Beach Club");
  });
});
