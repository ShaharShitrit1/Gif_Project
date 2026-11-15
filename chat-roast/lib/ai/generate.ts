/**
 * Server-only: calls Claude for /api/report and /api/ask.
 *
 * - claude-opus-5-5 (override CHATROAST_MODEL), adaptive thinking, explicit effort.
 * - Streams with the SDK and reads `finalMessage()`.
 * - Report uses structured outputs (output_config.format, JSON schema) — no prefill.
 * - Server-side refusal fallbacks: `fallbacks: "default"` with beta header
 *   `server-side-fallback-2026-07-01`; a refusal on the final message means the
 *   whole chain declined.
 * - Checks stop_reason (refusal / max_tokens) before reading content.
 * - Never logs chat content; only error classes / status codes.
 */

import { currentUserKey } from "./user-key";
import Anthropic from "@anthropic-ai/sdk";
import type {
  BetaMessage,
  BetaMessageParam,
  BetaMessageStreamParams,
} from "@anthropic-ai/sdk/resources/beta/messages/messages";
import type { AIReport, AskRequest, AskStreamEvent, ReportRequest, ReportStreamEvent } from "../types";
import { aiConfig } from "./config";
import {
  ASK_SYSTEM_PROMPT,
  REPORT_SYSTEM_PROMPT,
  askContextBlock,
  askQuestionBlock,
  repairInstruction,
  reportContextBlock,
  reportTaskBlock,
} from "./prompts";
import { REPORT_JSON_SCHEMA, checkReport, requiredMemberIds } from "./schema";
import { redact } from "./transcript";

const FALLBACK_BETA = "server-side-fallback-2026-07-01";
const REPORT_MAX_TOKENS = 64_000; // thinking + JSON
const ASK_MAX_TOKENS = 16_000;
/** Don't start a repair round if the first attempt already used this much of maxDuration (300 s). */
const REPAIR_DEADLINE_MS = 150_000;

type ReportCode = Extract<ReportStreamEvent, { type: "error" }>["code"];

let cachedClient: Anthropic | null = null;
function client(): Anthropic {
  // A visitor's own key (bring-your-own-key mode) is used for this request only, never cached.
  const userKey = currentUserKey();
  if (userKey) return new Anthropic({ apiKey: userKey, maxRetries: 2, timeout: 10 * 60 * 1000 });
  // Otherwise reads ANTHROPIC_API_KEY from the environment.
  cachedClient ??= new Anthropic({ maxRetries: 2, timeout: 10 * 60 * 1000 });
  return cachedClient;
}

/* ------------------------------------------------------------------ */
/* Errors                                                              */
/* ------------------------------------------------------------------ */

export class ReportFailure extends Error {
  constructor(
    public code: ReportCode,
    message: string,
  ) {
    super(message);
    this.name = "ReportFailure";
  }
}

const MESSAGES: Record<ReportCode, string> = {
  rate_limited: "The AI is getting too many requests right now. Try again in a minute.",
  overloaded: "The AI is overloaded right now. Try again in a minute.",
  too_large: "This chat is too large to analyse in one go.",
  refused: "The AI declined to write about this chat.",
  bad_request: "The request was rejected.",
  unauthorized: "An access code is required.",
  server_error: "Something went wrong while writing the report.",
};

/** Maps SDK errors (typed classes, plus mid-stream `error` events) to our codes. */
export function mapError(err: unknown): { code: ReportCode; message: string } | null {
  if (err instanceof ReportFailure) return { code: err.code, message: err.message };
  if (err instanceof Anthropic.APIUserAbortError) return null; // client went away
  let code: ReportCode = "server_error";
  if (err instanceof Anthropic.RateLimitError) code = "rate_limited";
  else if (err instanceof Anthropic.OverloadedError || err instanceof Anthropic.ServiceUnavailableError) code = "overloaded";
  else if (err instanceof Anthropic.ContentTooLargeError) code = "too_large";
  else if (err instanceof Anthropic.BadRequestError || err instanceof Anthropic.UnprocessableEntityError) code = "bad_request";
  else if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) code = currentUserKey() ? "unauthorized" : "server_error";
  else if (err instanceof Anthropic.APIConnectionError) code = "overloaded";
  else if (err instanceof Anthropic.APIError) {
    // Errors delivered inside the SSE stream carry no status, only `type`.
    if (err.type === "overloaded_error") code = "overloaded";
    else if (err.type === "rate_limit_error") code = "rate_limited";
    else if (err.type === "invalid_request_error") code = "bad_request";
  }
  return { code, message: MESSAGES[code] };
}

function logError(where: string, err: unknown) {
  // Class, status and request id only: never the request or response content.
  if (err instanceof Anthropic.APIError) {
    console.error(`[chatroast:${where}] ${err.constructor.name} status=${err.status ?? "-"} type=${err.type ?? "-"} request_id=${err.requestID ?? "-"}`);
  } else if (err instanceof ReportFailure) {
    console.error(`[chatroast:${where}] ${err.code}`);
  } else {
    console.error(`[chatroast:${where}] ${err instanceof Error ? err.name : "unknown error"}`);
  }
}

/* ------------------------------------------------------------------ */
/* Progress                                                            */
/* ------------------------------------------------------------------ */

type Phase = "reading" | "thinking" | "writing" | "polishing";

class Progress {
  private phase: Phase = "reading";
  private value = 0;
  private lastSent = 0;
  private phaseStart = Date.now();
  private chars = 0;
  private timer: ReturnType<typeof setInterval>;

  constructor(
    private send: (e: ReportStreamEvent) => void,
    private expectedChars: number,
  ) {
    this.emit(0.02, true);
    // Thinking produces no visible text: creep forward so the UI keeps moving.
    this.timer = setInterval(() => this.tick(), 1500);
  }

  private emit(v: number, force = false) {
    const value = Math.min(0.99, Math.max(this.value, v));
    const now = Date.now();
    if (!force && value - this.value < 0.01 && now - this.lastSent < 4000) return;
    if (!force && now - this.lastSent < 400) return;
    this.value = value;
    this.lastSent = now;
    this.send({ type: "status", phase: this.phase, progress: Math.round(value * 1000) / 1000 });
  }

  private tick() {
    const t = (Date.now() - this.phaseStart) / 1000;
    if (this.phase === "reading") this.emit(0.02 + 0.06 * (1 - Math.exp(-t / 20)));
    else if (this.phase === "thinking") this.emit(0.08 + 0.24 * (1 - Math.exp(-t / 50)));
  }

  setPhase(p: Phase) {
    const order: Phase[] = ["reading", "thinking", "writing", "polishing"];
    if (order.indexOf(p) <= order.indexOf(this.phase)) return;
    this.phase = p;
    this.phaseStart = Date.now();
    this.emit(p === "thinking" ? 0.08 : p === "writing" ? 0.32 : 0.96, true);
  }

  addText(n: number) {
    this.chars += n;
    if (this.phase !== "writing") this.setPhase("writing");
    this.emit(0.32 + 0.62 * Math.min(1, this.chars / this.expectedChars));
  }

  /** A repair round restarts the writing bar from where it is. */
  restartWriting() {
    this.chars = 0;
    this.expectedChars = Math.round(this.expectedChars * 0.8);
    this.phase = "writing";
  }

  stop() {
    clearInterval(this.timer);
  }
}

/* ------------------------------------------------------------------ */
/* Report                                                              */
/* ------------------------------------------------------------------ */

interface Attempt {
  text: string;
  stopReason: string | null;
  usage: { inputTokens: number; outputTokens: number };
}

function totalInput(m: BetaMessage): number {
  const u = m.usage;
  return (u.input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0);
}

async function streamAttempt(params: BetaMessageStreamParams, progress: Progress, signal: AbortSignal): Promise<Attempt> {
  const stream = client().beta.messages.stream(params, { signal });
  for await (const ev of stream) {
    if (ev.type === "message_start") progress.setPhase("thinking");
    else if (ev.type === "content_block_start") {
      const t = ev.content_block.type;
      if (t === "thinking" || t === "redacted_thinking") progress.setPhase("thinking");
      else if (t === "fallback") console.info("[chatroast:report] served by a fallback model after a refusal");
    } else if (ev.type === "content_block_delta" && ev.delta.type === "text_delta") {
      progress.addText(ev.delta.text.length);
    }
  }
  const message = await stream.finalMessage();
  // Check the stop reason before reading content.
  if (message.stop_reason === "refusal") {
    throw new ReportFailure("refused", MESSAGES.refused);
  }
  // After a mid-stream fallback the text continues in a new block: join all text blocks.
  const text = message.content.map((b) => (b.type === "text" ? b.text : "")).join("");
  return {
    text,
    stopReason: message.stop_reason,
    usage: { inputTokens: totalInput(message), outputTokens: message.usage.output_tokens ?? 0 },
  };
}

function expectedOutputChars(req: ReportRequest): number {
  const members = Math.min(15, req.participants.length);
  const scale = /hebrew|arabic|english|spanish|french|portuguese|italian|german|dutch|russian|ukrainian|polish|turkish|indonesian/i.test(req.language) ? 1 : 0.6;
  return Math.round((6000 + 1150 * members) * scale);
}

function sanitizeRequest(req: ReportRequest): ReportRequest {
  // Defence in depth: the browser already redacted, redact again (idempotent).
  return {
    ...req,
    transcript: redact(req.transcript),
    statsDigest: redact(req.statsDigest),
    extraContext: req.extraContext ? redact(req.extraContext).slice(0, 500) : undefined,
    groupName: req.groupName ? redact(req.groupName).slice(0, 100) : undefined,
  };
}

export function buildReportParams(req: ReportRequest, messages?: BetaMessageParam[]): BetaMessageStreamParams {
  const cfg = aiConfig();
  return {
    model: cfg.model,
    max_tokens: REPORT_MAX_TOKENS,
    betas: [FALLBACK_BETA],
    fallbacks: "default",
    thinking: { type: "adaptive" },
    output_config: {
      effort: cfg.reportEffort,
      format: { type: "json_schema", schema: REPORT_JSON_SCHEMA as unknown as Record<string, unknown> },
    },
    // Byte-stable across all reports, so it is cacheable across users.
    system: [{ type: "text", text: REPORT_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
    messages: messages ?? [
      {
        role: "user",
        content: [
          { type: "text", text: reportContextBlock(req) },
          { type: "text", text: reportTaskBlock(req) },
        ],
      },
    ],
  };
}

/**
 * Generates a report and emits ReportStreamEvents: status phases with progress,
 * then `done` or `error`. Never throws.
 */
export async function generateReport(rawReq: ReportRequest, send: (e: ReportStreamEvent) => void, signal: AbortSignal): Promise<void> {
  const req = sanitizeRequest(rawReq);
  const started = Date.now();
  const progress = new Progress(send, expectedOutputChars(req));
  const usage = { inputTokens: 0, outputTokens: 0 };
  try {
    const base = buildReportParams(req);
    const first = await streamAttempt(base, progress, signal);
    usage.inputTokens += first.usage.inputTokens;
    usage.outputTokens += first.usage.outputTokens;

    const truncated = first.stopReason === "max_tokens";
    let best = truncated ? null : evaluate(first.text, req);
    if (best?.report && best.problems.length === 0) return finish(best.report);

    const canRepair = Date.now() - started < REPAIR_DEADLINE_MS && !signal.aborted;
    if (canRepair) {
      const problems = best?.problems ?? ["The output was not valid JSON for the schema."];
      const messages: BetaMessageParam[] = [...(base.messages as BetaMessageParam[])];
      if (first.text.trim()) {
        messages.push({ role: "assistant", content: [{ type: "text", text: first.text.slice(0, 120_000).trimEnd() }] });
        messages.push({ role: "user", content: [{ type: "text", text: repairInstruction(problems, truncated) }] });
      }
      progress.restartWriting();
      const second = await streamAttempt(buildReportParams(req, messages), progress, signal);
      usage.inputTokens += second.usage.inputTokens;
      usage.outputTokens += second.usage.outputTokens;
      if (second.stopReason !== "max_tokens") {
        const again = evaluate(second.text, req);
        if (again.report && (again.problems.length === 0 || !best?.report || again.problems.length <= best.problems.length)) best = again;
      }
    }
    if (best?.report) return finish(best.report);
    throw new ReportFailure("server_error", "The narrator's report came out garbled. Please try again.");
  } catch (err) {
    const mapped = mapError(err);
    if (!mapped) return; // aborted by the client
    logError("report", err);
    send({ type: "error", code: mapped.code, message: mapped.message });
  } finally {
    progress.stop();
  }

  function finish(report: AIReport) {
    progress.setPhase("polishing");
    send({ type: "done", report, usage });
  }
}

function evaluate(text: string, req: ReportRequest): ReturnType<typeof checkReport> {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { report: null, problems: ["The output was not valid JSON."] };
  }
  return checkReport(json, req.participants);
}

/* ------------------------------------------------------------------ */
/* Ask                                                                 */
/* ------------------------------------------------------------------ */

export function buildAskParams(req: AskRequest): BetaMessageStreamParams {
  const cfg = aiConfig();
  const context = askContextBlock(req);
  const turns = req.history.slice(-40);
  // Conversation must start with the user; drop a leading assistant turn.
  while (turns.length && turns[0].role !== "user") turns.shift();
  const messages: BetaMessageParam[] = [];
  const firstUserText = turns.length ? turns[0].content : askQuestionBlock(req);
  messages.push({
    role: "user",
    content: [
      // Stable for the whole Q&A session: explicit breakpoint at the end of the documents.
      { type: "text", text: context, cache_control: { type: "ephemeral" } },
      { type: "text", text: firstUserText },
    ],
  });
  if (turns.length) {
    for (const t of turns.slice(1)) messages.push({ role: t.role, content: t.content });
    // Keep strict alternation: if history ends on a user turn, merge the question into it.
    const last = messages[messages.length - 1];
    if (last.role === "user") {
      const content = typeof last.content === "string" ? [{ type: "text" as const, text: last.content }] : last.content;
      last.content = [...content, { type: "text", text: askQuestionBlock(req) }];
    } else messages.push({ role: "user", content: askQuestionBlock(req) });
  }
  return {
    model: cfg.model,
    max_tokens: ASK_MAX_TOKENS,
    betas: [FALLBACK_BETA],
    fallbacks: "default",
    thinking: { type: "adaptive" },
    output_config: { effort: cfg.askEffort },
    // Automatic breakpoint on the last block caches the growing conversation tail.
    cache_control: { type: "ephemeral" },
    system: [{ type: "text", text: ASK_SYSTEM_PROMPT }],
    messages,
  };
}

/** Streams an answer as `delta` events, then `done` (or `error`). Never throws. */
export async function generateAnswer(rawReq: AskRequest, send: (e: AskStreamEvent) => void, signal: AbortSignal): Promise<void> {
  const req: AskRequest = { ...rawReq, transcript: redact(rawReq.transcript), statsDigest: redact(rawReq.statsDigest) };
  let sentAny = false;
  try {
    const stream = client().beta.messages.stream(buildAskParams(req), { signal });
    for await (const ev of stream) {
      if (ev.type === "content_block_delta" && ev.delta.type === "text_delta" && ev.delta.text) {
        sentAny = true;
        send({ type: "delta", text: ev.delta.text });
      }
    }
    const message = await stream.finalMessage();
    if (message.stop_reason === "refusal") {
      send({ type: "error", code: "refused", message: MESSAGES.refused });
      return;
    }
    if (!sentAny) {
      send({ type: "error", code: "server_error", message: "The narrator had nothing to say. Try asking differently." });
      return;
    }
    // max_tokens on a text answer just ends it; the UI shows what arrived.
    send({ type: "done" });
  } catch (err) {
    const mapped = mapError(err);
    if (!mapped) return;
    logError("ask", err);
    send({ type: "error", code: mapped.code, message: mapped.message });
  }
}

/** Exposed for tests. */
export const __internal = { requiredMemberIds, expectedOutputChars };
