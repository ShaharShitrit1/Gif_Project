/**
 * Shared contracts for ChatRoast.
 *
 * Every module (parser, stats, ai, ui) builds against these types.
 * Change them only in coordination — they are the seams between agents.
 *
 * TIME CONVENTION: WhatsApp exports carry local wall-clock times with no zone.
 * We store every timestamp as `Date.UTC(y, m, d, h, mi, s)` of that wall clock
 * ("wall-clock-as-UTC"). Always read them back with getUTC*() methods or the
 * helpers in lib/time.ts — never with local-time getters.
 */

/* ------------------------------------------------------------------ */
/* Chat setup                                                          */
/* ------------------------------------------------------------------ */

export type ChatType = "friends" | "couple" | "friend" | "family" | "work" | "other";

export type Locale = "he" | "en";

/** 1 = gentle tease, 2 = classic roast, 3 = no mercy (still never hateful). */
export type Intensity = 1 | 2 | 3;

export type PersonaId = "max" | "savta" | "doc";

/* ------------------------------------------------------------------ */
/* Parsing                                                             */
/* ------------------------------------------------------------------ */

export type MessageKind =
  | "text"
  | "image"
  | "video"
  | "audio" // voice notes ("PTT") and audio files
  | "sticker"
  | "gif"
  | "document"
  | "media" // "<Media omitted>" — type unknown
  | "deleted" // "This message was deleted" / "You deleted this message"
  | "poll"
  | "location"
  | "contact"
  | "call" // missed voice/video call lines
  | "viewonce";

export interface Message {
  /** Index in ParsedChat.messages (0-based, chronological). */
  id: number;
  /** Wall-clock-as-UTC epoch ms (see TIME CONVENTION). */
  ts: number;
  /** Participant.id of the sender (after merges this is the canonical id). */
  author: string;
  /** Message text. Empty string for pure media. Multi-line messages keep "\n". */
  text: string;
  kind: MessageKind;
  /** "<This message was edited>" suffix was present. */
  edited?: boolean;
  /** Attachment filename if the export included one (zip exports). */
  attachment?: string;
}

export type SystemEventType =
  | "encryption"
  | "created"
  | "added"
  | "removed"
  | "joined"
  | "left"
  | "subject" // group name changed
  | "icon"
  | "description"
  | "number_changed"
  | "security_code"
  | "disappearing"
  | "other";

export interface SystemEvent {
  ts: number;
  type: SystemEventType;
  text: string;
}

export interface Participant {
  /** Stable id, e.g. "p0", "p1"… assigned by the parser in order of first appearance. */
  id: string;
  /** Raw sender names as they appeared in the export ("Itay 🌴", "+972 50-123-4567"). */
  originalNames: string[];
  /** Name shown everywhere (user may edit it in the review step). */
  displayName: string;
  /** True when the user marked themselves ("this is me"). */
  isSelf?: boolean;
  messageCount: number;
  firstTs: number;
  lastTs: number;
}

export type ExportFormat = "ios" | "android" | "unknown";

export interface ParsedChat {
  /** Group / chat name if detectable (zip filename "WhatsApp Chat - X.zip", subject events). */
  title?: string;
  format: ExportFormat;
  /** How day/month were ordered in the source, detected heuristically. */
  dateOrder: "DMY" | "MDY" | "YMD";
  messages: Message[];
  systemEvents: SystemEvent[];
  /** Senders only (people who wrote ≥1 message), sorted by messageCount desc. */
  participants: Participant[];
  /** Non-fatal parse notes (e.g. "skipped 3 unparseable lines"). */
  warnings: string[];
}

export type ParseErrorCode =
  | "wrong_extension"
  | "file_too_large"
  | "zip_corrupt"
  | "archive_without_transcript"
  | "encrypted_backup"
  | "not_chat_export"
  | "empty_chat_export"
  | "too_few_messages"
  | "single_sender_chat";

export class ChatParseError extends Error {
  constructor(
    public code: ParseErrorCode,
    public details: Record<string, string | number> = {},
  ) {
    super(code);
    this.name = "ChatParseError";
  }
}

/** Minimum messages required to build a worthwhile report. */
export const MIN_MESSAGES = 50;
/** Hard cap on the raw file size we accept in the browser. */
export const MAX_FILE_BYTES = 200 * 1024 * 1024;

/* ------------------------------------------------------------------ */
/* Stats                                                               */
/* ------------------------------------------------------------------ */

export type Counted<T extends string = string> = [T, number];

export interface PersonStats {
  id: string;
  name: string;
  messages: number;
  /** Share of all messages, 0..1. */
  share: number;
  words: number;
  avgWordsPerMessage: number;
  media: { image: number; video: number; audio: number; sticker: number; gif: number; document: number; other: number };
  voiceNotes: number;
  deleted: number;
  edited: number;
  links: number;
  questions: number;
  topEmojis: Counted[];
  topWords: Counted[];
  longestMessage: { text: string; ts: number; words: number } | null;
  /** How many conversations (after a ≥ CONVERSATION_GAP_MS silence) this person opened. */
  conversationStarts: number;
  /** Median ms until this person replied to someone else (null if never). */
  medianReplyMs: number | null;
  /** Messages sent 00:00–04:59. */
  nightMessages: number;
  /** 0–23. */
  peakHour: number;
  hourly: number[]; // length 24
  laugh: { count: number; avgLength: number; maxLength: number; favorite: string | null };
  goodMorning: number;
  goodNight: number;
  /** Messages that are only emoji. */
  emojiOnly: number;
  /** Times other members wrote this person's name. */
  mentionedByOthers: number;
  /** Longest run of consecutive messages by this person with no one answering. */
  longestMonologue: number;
  /** Times this person was the last to write before a ≥ CONVERSATION_GAP_MS silence (left on read). */
  conversationEnds: number;
}

export interface DayCount {
  /** "YYYY-MM-DD" (wall clock). */
  date: string;
  count: number;
}

export type StatAwardKey =
  | "chatterbox" // most messages
  | "ghost" // fewest messages
  | "night_owl" // most night messages (share)
  | "early_bird" // most messages 05–08
  | "novelist" // highest avg words per message
  | "one_word" // lowest avg words per message
  | "emoji_addict"
  | "laugh_track" // most laughs
  | "conversation_starter"
  | "conversation_killer" // most conversationEnds
  | "speedy" // fastest median reply
  | "slowpoke" // slowest median reply
  | "voice_note_podcaster"
  | "media_dumper"
  | "sticker_lord"
  | "deleter" // most deleted messages
  | "editor"
  | "question_master"
  | "monologue" // longest monologue
  | "most_mentioned"
  | "good_morning"
  | "good_night";

export interface StatAward {
  key: StatAwardKey;
  emoji: string;
  winnerId: string;
  /** The raw metric value (count, ms, ratio…) — UI formats it per key. */
  value: number;
}

export interface ChatStats {
  totalMessages: number;
  totalWords: number;
  participantsCount: number;
  firstTs: number;
  lastTs: number;
  /** Calendar days from first to last message, inclusive. */
  daysSpan: number;
  activeDays: number;
  avgMessagesPerActiveDay: number;
  perPerson: PersonStats[]; // sorted by messages desc
  daily: DayCount[]; // every day in span, zero-filled
  monthly: { month: string; count: number; byPerson: Record<string, number> }[]; // "YYYY-MM"
  hourly: number[]; // length 24
  weekday: number[]; // length 7, 0 = Sunday
  recordDay: DayCount | null;
  longestStreak: { start: string; end: string; days: number } | null;
  longestSilence: { fromTs: number; toTs: number; ms: number } | null;
  conversations: number;
  medianReplyMs: number | null;
  /** Share (0..1) of replies sent within 60s. */
  quickReplyRate: number;
  topWords: Counted[];
  topEmojis: Counted[];
  /** Repeated multi-word phrases (2–4-word n-grams, overlapping fragments re-joined, so up to ~7 words) — likely inside jokes / catchphrases. */
  catchphrases: { phrase: string; count: number; topAuthorId: string }[];
  laugh: { total: number; avgLength: number; record: { length: number; authorId: string; ts: number; text: string } | null };
  goodMorning: { days: number; firstSayers: Counted[] };
  goodNight: { days: number; firstSayers: Counted[] };
  /** Friday 18:00 → Saturday 19:00 wall clock. */
  shabbat: { weeks: number; silentWeeks: number; messages: number };
  firstMessages: Message[]; // first 6
  lastMessages: Message[]; // last 6
  longestMessage: { authorId: string; text: string; ts: number; words: number } | null;
  mediaTotals: { image: number; video: number; audio: number; sticker: number; gif: number; document: number; other: number };
  deleted: number;
  links: number;
  awards: StatAward[];
}

/** A silence of this length starts a new "conversation". */
export const CONVERSATION_GAP_MS = 4 * 60 * 60 * 1000;

/* ------------------------------------------------------------------ */
/* AI report                                                           */
/* ------------------------------------------------------------------ */

export interface ReportScore {
  /** Short machine key, e.g. "drama", "loyalty", "chaos". */
  key: string;
  label: string;
  emoji: string;
  /** 0..100 */
  value: number;
  comment: string;
}

export interface MemberProfile {
  /** Participant.id this profile is about. */
  id: string;
  /** Funny title, e.g. "Minister of Plans That Never Happen". */
  nickname: string;
  /** Their role in the group, 2–4 words. */
  archetype: string;
  emoji: string;
  /** The personal roast, 3–6 sentences, grounded in real chat evidence. */
  roast: string;
  superpower: string;
  redFlag: string;
  /** A real (verbatim or near-verbatim) quote of theirs from the chat. */
  signatureQuote: string;
  /** What the narrator would tell them privately, 1–2 sentences. */
  advice: string;
  /** Who they are closest to in the chat (Participant.id) or null. */
  closestTo: string | null;
}

export interface ReportAward {
  emoji: string;
  title: string;
  winnerId: string;
  reason: string;
}

export interface InsideJoke {
  phrase: string;
  explanation: string;
}

export interface AIReport {
  /** Punchy headline, ≤ 80 chars — the share-card title. */
  title: string;
  /** One line under the title ("I read 52,000 of your messages and…"). */
  subtitle: string;
  vibe: { emoji: string; label: string };
  /** The main verdict / roast: 2–4 short paragraphs separated by "\n\n". */
  verdict: string;
  /** What is really going on between these people: 1–3 paragraphs. */
  dynamics: string;
  /** Who writes first, who pretends not to care, who holds it together. */
  whoCares: string;
  scores: ReportScore[]; // 4
  members: MemberProfile[]; // one per participant (top N for huge groups)
  awards: ReportAward[]; // 5–8
  turningPoint: { when: string; title: string; description: string } | null;
  insideJokes: InsideJoke[]; // 0–6
  /** What the narrator would do in their place. */
  advice: string;
  /** Mic-drop final line. */
  closingLine: string;
  /** 4 suggested follow-up questions the user can ask next. */
  followUps: string[];
}

/** Everything needed to call /api/report. Built client-side by lib/ai/transcript.ts. */
export interface ReportRequest {
  chatType: ChatType;
  /** Report language as an English name the model understands ("Hebrew", "English", "French"…). */
  language: string;
  personaId: PersonaId;
  intensity: Intensity;
  groupName?: string;
  /** Participant.id of the uploader, if they marked themselves. */
  selfId?: string;
  /** Free-text context the user wants the narrator to know (≤ 500 chars). */
  extraContext?: string;
  participants: { id: string; name: string; messages: number }[];
  /** Compact, redacted transcript produced by buildTranscript(). */
  transcript: string;
  transcriptMeta: TranscriptMeta;
  /** Compact text digest of ChatStats for grounding (buildStatsDigest()). */
  statsDigest: string;
}

export interface TranscriptMeta {
  totalMessages: number;
  includedMessages: number;
  fromTs: number;
  toTs: number;
  /** True when older/sampled-out messages were left out. */
  truncated: boolean;
  approxTokens: number;
}

/** Server → client events on the /api/report SSE stream. */
export type ReportStreamEvent =
  | { type: "status"; phase: "reading" | "thinking" | "writing" | "polishing"; progress?: number }
  | { type: "done"; report: AIReport; usage?: { inputTokens: number; outputTokens: number }; mock?: boolean }
  | { type: "error"; code: "rate_limited" | "overloaded" | "too_large" | "refused" | "bad_request" | "unauthorized" | "server_error"; message: string };

/** Request body for /api/ask (follow-up questions about the chat). */
export interface AskRequest {
  personaId: PersonaId;
  language: string;
  intensity: Intensity;
  /** The original report, so answers stay consistent with it. */
  report: AIReport;
  participants: { id: string; name: string; messages: number }[];
  transcript: string;
  statsDigest: string;
  /** Previous Q&A turns, oldest first. */
  history: { role: "user" | "assistant"; content: string }[];
  question: string;
  /** Optional: focus the answer on one participant ("personal report"). */
  focusParticipantId?: string;
}

/** Server → client events on the /api/ask SSE stream. */
export type AskStreamEvent =
  | { type: "delta"; text: string }
  | { type: "done"; mock?: boolean }
  | { type: "error"; code: string; message: string };

/* ------------------------------------------------------------------ */
/* Local persistence (browser only — nothing is stored server-side)    */
/* ------------------------------------------------------------------ */

export interface SavedReport {
  id: string;
  createdAt: number;
  chatType: ChatType;
  groupName: string;
  personaId: PersonaId;
  intensity: Intensity;
  language: string;
  participants: Participant[];
  stats: ChatStats;
  report: AIReport;
  /** Kept so the user can ask follow-ups later. Never leaves the device except in /api/ask calls. */
  transcript: string;
  statsDigest: string;
  transcriptMeta: TranscriptMeta;
  qa: { role: "user" | "assistant"; content: string }[];
  /** True for the bundled demo. */
  demo?: boolean;
  mock?: boolean;
}
