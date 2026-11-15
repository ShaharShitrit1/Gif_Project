/**
 * File → ParsedChat. Accepts a WhatsApp `.txt` export or the `.zip` WhatsApp creates
 * ("WhatsApp Chat - X.zip" with `_chat.txt` + attachments). Isomorphic: browser and Node 22
 * (only Blob.arrayBuffer, TextDecoder and jszip).
 */
import JSZip from "jszip";
import { ChatParseError, MAX_FILE_BYTES, type ParsedChat } from "../types";
import { titleFromFilename } from "./patterns";
import { parseChatText, type ParseOptions } from "./text";

const ENCRYPTED_RE = /\.crypt\d*$|^msgstore.*\.db$|^wa\.db$/i;

function baseName(path: string): string {
  return path.replace(/^.*[\\/]/, "");
}

function extensionOf(name: string): string {
  const base = baseName(name);
  const dot = base.lastIndexOf(".");
  return dot > 0 ? base.slice(dot + 1).toLowerCase() : "";
}

function isZip(bytes: Uint8Array): boolean {
  return bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && (bytes[2] === 0x03 || bytes[2] === 0x05) && (bytes[3] === 0x04 || bytes[3] === 0x06);
}

/** UTF-8 by default; honours UTF-16 BOMs and sniffs BOM-less UTF-16LE. */
export function decodeText(bytes: Uint8Array): string {
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) return new TextDecoder("utf-16le").decode(bytes.subarray(2));
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    try {
      return new TextDecoder("utf-16be").decode(bytes.subarray(2));
    } catch {
      // Engines without utf-16be: swap bytes and decode as LE.
      const swapped = new Uint8Array(bytes.length - 2);
      for (let i = 2; i + 1 < bytes.length; i += 2) {
        swapped[i - 2] = bytes[i + 1];
        swapped[i - 1] = bytes[i];
      }
      return new TextDecoder("utf-16le").decode(swapped);
    }
  }
  // BOM-less UTF-16LE: lots of zero bytes at odd offsets.
  const sample = Math.min(bytes.length, 2000);
  let oddZeros = 0;
  for (let i = 1; i < sample; i += 2) if (bytes[i] === 0) oddZeros++;
  if (sample > 20 && oddZeros > sample / 4) return new TextDecoder("utf-16le").decode(bytes);
  return new TextDecoder("utf-8").decode(bytes);
}

function looksBinary(text: string): boolean {
  const sample = text.slice(0, 4000);
  if (!sample) return false;
  let bad = 0;
  for (let i = 0; i < sample.length; i++) {
    const c = sample.charCodeAt(i);
    if (c === 0xfffd || (c < 32 && c !== 9 && c !== 10 && c !== 13)) bad++;
  }
  return bad / sample.length > 0.05;
}

function parseDecoded(text: string, opts: ParseOptions): ParsedChat {
  if (looksBinary(text)) throw new ChatParseError("not_chat_export", { binary: 1 });
  return parseChatText(text, opts);
}

async function parseZip(bytes: Uint8Array, zipName: string): Promise<ParsedChat> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(bytes);
  } catch {
    throw new ChatParseError("zip_corrupt");
  }
  const entries = Object.values(zip.files).filter((f) => {
    if (f.dir) return false;
    const base = baseName(f.name);
    return !/(?:^|\/)__MACOSX\//.test(f.name) && !base.startsWith("._") && base !== ".DS_Store";
  });
  const txts = entries.filter((f) => /\.txt$/i.test(f.name));
  if (txts.length === 0) {
    if (entries.some((f) => ENCRYPTED_RE.test(baseName(f.name)))) {
      throw new ChatParseError("encrypted_backup", { entries: entries.length });
    }
    throw new ChatParseError("archive_without_transcript", { entries: entries.length });
  }

  // Prefer iOS "_chat.txt", then Android's "WhatsApp Chat with X.txt", then the longest .txt.
  const rank = (name: string) => {
    const base = baseName(name);
    if (base.toLowerCase() === "_chat.txt") return 0;
    if (titleFromFilename(base) || /whatsapp/i.test(base)) return 1;
    return 2;
  };
  let best: { name: string; text: string; rank: number } | null = null;
  for (const f of txts) {
    const r = rank(f.name);
    if (best && r > best.rank) continue;
    let data: Uint8Array;
    try {
      data = await f.async("uint8array");
    } catch {
      throw new ChatParseError("zip_corrupt");
    }
    const text = decodeText(data);
    if (!best || r < best.rank || text.length > best.text.length) best = { name: f.name, text, rank: r };
  }
  if (!best) throw new ChatParseError("archive_without_transcript", { entries: entries.length });

  const filename = titleFromFilename(zipName) ? zipName : titleFromFilename(best.name) ? baseName(best.name) : zipName;
  return parseDecoded(best.text, { filename });
}

export async function parseChatFile(file: Blob & { name?: string }): Promise<ParsedChat> {
  const name = file.name ?? "";
  const ext = extensionOf(name);
  if (ENCRYPTED_RE.test(baseName(name))) throw new ChatParseError("encrypted_backup", { ext });
  if (ext && ext !== "txt" && ext !== "zip" && ext !== "text") {
    throw new ChatParseError("wrong_extension", { ext });
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new ChatParseError("file_too_large", { size: file.size, max: MAX_FILE_BYTES });
  }
  if (file.size === 0) throw new ChatParseError("empty_chat_export", { size: 0 });

  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(await file.arrayBuffer());
  } catch {
    // e.g. an iCloud/Drive placeholder that was never downloaded.
    throw new ChatParseError("empty_chat_export", { size: 0 });
  }
  if (bytes.length === 0) throw new ChatParseError("empty_chat_export", { size: 0 });

  if (isZip(bytes)) return parseZip(bytes, name);
  if (ext === "zip") throw new ChatParseError("zip_corrupt");
  return parseDecoded(decodeText(bytes), { filename: name });
}
