import type { ChatType } from "@/lib/types";

/**
 * Display metadata for chat types (labels live in lib/i18n/dict/common.ts as
 * `chat_type_<id>` and `chat_type_<id>_desc`).
 */
export const CHAT_TYPES: { id: ChatType; emoji: string; tone: string }[] = [
  { id: "friends", emoji: "👯", tone: "bg-sun" },
  { id: "couple", emoji: "💞", tone: "bg-bubblegum" },
  { id: "friend", emoji: "🤝", tone: "bg-sky" },
  { id: "family", emoji: "🏡", tone: "bg-mint" },
  { id: "work", emoji: "💼", tone: "bg-grape" },
  { id: "other", emoji: "✨", tone: "bg-surface-2" },
];

export const CHAT_TYPE_IDS = CHAT_TYPES.map((c) => c.id);

export function isChatType(v: unknown): v is ChatType {
  return typeof v === "string" && (CHAT_TYPE_IDS as string[]).includes(v);
}
