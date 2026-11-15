"use client";

/**
 * The bundled demo report (/report/demo): runs the real pipeline on the sample chat
 * (parse → stats → transcript + digest) and pairs it with the hand-written DEMO_REPORT.
 * Memoized per page load.
 */

import { parseChatText } from "./parser";
import { computeStats } from "./stats";
import { buildStatsDigest, buildTranscript } from "./ai/transcript";
import { DEMO_REPORT, DEMO_SETTINGS } from "./ai/demo-report";
import type { SavedReport } from "./types";

export const DEMO_CHAT_URL = "/samples/demo-chat.txt";
export const DEMO_ID = "demo";

let cached: Promise<SavedReport> | null = null;

export function loadDemo(): Promise<SavedReport> {
  if (!cached) {
    cached = build().catch((err) => {
      cached = null; // allow a retry after a failure
      throw err;
    });
  }
  return cached;
}

async function build(): Promise<SavedReport> {
  const res = await fetch(DEMO_CHAT_URL);
  if (!res.ok) throw new Error(`demo chat: HTTP ${res.status}`);
  const text = await res.text();
  const chat = parseChatText(text, { filename: "demo-chat.txt" });
  const stats = computeStats(chat);
  const { transcript, meta } = buildTranscript(chat);
  const statsDigest = buildStatsDigest(stats, chat);
  return {
    id: DEMO_ID,
    createdAt: stats.lastTs || Date.now(),
    chatType: DEMO_SETTINGS.chatType,
    groupName: DEMO_SETTINGS.groupName || chat.title || "",
    personaId: DEMO_SETTINGS.personaId,
    intensity: DEMO_SETTINGS.intensity,
    language: DEMO_SETTINGS.language,
    participants: chat.participants,
    stats,
    report: DEMO_REPORT,
    transcript,
    statsDigest,
    transcriptMeta: meta,
    qa: [],
    demo: true,
  };
}
