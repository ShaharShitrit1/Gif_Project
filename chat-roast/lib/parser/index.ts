/**
 * WhatsApp chat export parser (engine).
 *
 *   parseChatText(text, opts?)  → ParsedChat        (throws ChatParseError)
 *   parseChatFile(file)         → Promise<ParsedChat> (.txt / .zip; throws ChatParseError)
 *   applyIdentity(chat, identity) → ParsedChat      (pure: merges, renames, self flag)
 *
 * Timestamps are wall-clock-as-UTC (see lib/types.ts). Participant ids are "p0", "p1", …
 * in order of each sender's first message; `participants` is sorted by messageCount desc.
 */
export { parseChatText, cleanName, type ParseOptions } from "./text";
export { parseChatFile, decodeText } from "./file";
export { applyIdentity, type Identity } from "./identity";
export { titleFromFilename } from "./patterns";
