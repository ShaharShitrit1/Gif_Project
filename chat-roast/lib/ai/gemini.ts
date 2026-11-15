/**
 * Google Gemini provider (server-only) — the free option.
 *
 * Same prompts, JSON schema, validation and repair loop as the Claude path in generate.ts;
 * only the transport differs. Selected with AI_PROVIDER=gemini (or automatically when only
 * GEMINI_API_KEY is set). Note: on Gemini's free tier Google may use the content it receives
 * to improve its products — the privacy page says so.
 */
import { ApiError, GoogleGenAI, type Content } from "@google/genai";
import type { AIReport, AskRequest, AskStreamEvent, ReportRequest, ReportStreamEvent } from "../types";
import { aiConfig } from "./config";
import { ReportFailure, MESSAGES, Progress, evaluate, expectedOutputChars, logError, sanitizeRequest } from "./generate";
import { ASK_SYSTEM_PROMPT, REPORT_SYSTEM_PROMPT, askContextBlock, askQuestionBlock, repairInstruction, reportContextBlock, reportTaskBlock } from "./prompts";
import { REPORT_JSON_SCHEMA } from "./schema";
import { redact } from "./transcript";

const REPORT_MAX_OUTPUT = 65_536;
const ASK_MAX_OUTPUT = 8_192;
const REPAIR_DEADLINE_MS = 150_000;

type Code = Extract<ReportStreamEvent, { type: "error" }>["code"];

let cached: GoogleGenAI | null = null;
function client(): GoogleGenAI {
  cached ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return cached;
}

function mapGeminiError(err: unknown, signal: AbortSignal): { code: Code; message: string } | null {
  if (signal.aborted) return null;
  if (err instanceof ReportFailure) return { code: err.code, message: err.message };
  let code: Code = "server_error";
  if (err instanceof ApiError) {
    if (err.status === 429) code = "rate_limited";
    else if (err.status === 503 || err.status === 500 || err.status === 504) code = "overloaded";
    else if (err.status === 413) code = "too_large";
    else if (err.status === 400) code = "bad_request";
  }
  return { code, message: MESSAGES[code] };
}

function logGemini(where: string, err: unknown) {
  // Status and class only — never request/response content.
  if (err instanceof ApiError) console.error(`[chatroast:gemini:${where}] ApiError status=${err.status}`);
  else logError(`gemini:${where}`, err);
}

interface Attempt {
  text: string;
  finish: string | undefined;
  usage: { inputTokens: number; outputTokens: number };
}

async function streamJson(contents: Content[], progress: Progress, signal: AbortSignal, withSchema: boolean): Promise<Attempt> {
  const stream = await client().models.generateContentStream({
    model: aiConfig().geminiModel,
    contents,
    config: {
      systemInstruction: REPORT_SYSTEM_PROMPT,
      responseMimeType: "application/json",
      ...(withSchema ? { responseJsonSchema: REPORT_JSON_SCHEMA } : {}),
      maxOutputTokens: REPORT_MAX_OUTPUT,
      abortSignal: signal,
    },
  });
  progress.setPhase("thinking");
  let text = "";
  let finish: string | undefined;
  const usage = { inputTokens: 0, outputTokens: 0 };
  for await (const chunk of stream) {
    const t = chunk.text ?? "";
    if (t) {
      progress.setPhase("writing");
      progress.addText(t.length);
      text += t;
    }
    finish = chunk.candidates?.[0]?.finishReason ?? finish;
    if (chunk.usageMetadata) {
      usage.inputTokens = chunk.usageMetadata.promptTokenCount ?? usage.inputTokens;
      usage.outputTokens = chunk.usageMetadata.candidatesTokenCount ?? usage.outputTokens;
    }
  }
  if (finish === "SAFETY" || finish === "PROHIBITED_CONTENT" || finish === "BLOCKLIST") throw new ReportFailure("refused", MESSAGES.refused);
  return { text, finish, usage };
}

export async function generateReportGemini(rawReq: ReportRequest, send: (e: ReportStreamEvent) => void, signal: AbortSignal): Promise<void> {
  const req = sanitizeRequest(rawReq);
  const started = Date.now();
  const progress = new Progress(send, expectedOutputChars(req));
  const usage = { inputTokens: 0, outputTokens: 0 };
  const finish = (report: AIReport) => {
    progress.setPhase("polishing");
    send({ type: "done", report, usage });
  };
  const base: Content[] = [{ role: "user", parts: [{ text: reportContextBlock(req) }, { text: reportTaskBlock(req) }] }];
  try {
    let first: Attempt;
    let withSchema = true;
    try {
      first = await streamJson(base, progress, signal, true);
    } catch (err) {
      // Some models reject parts of a JSON schema: fall back to plain JSON mode + our validator.
      if (!(err instanceof ApiError && err.status === 400)) throw err;
      withSchema = false;
      first = await streamJson(base, progress, signal, false);
    }
    usage.inputTokens += first.usage.inputTokens;
    usage.outputTokens += first.usage.outputTokens;
    const truncated = first.finish === "MAX_TOKENS";
    let best = truncated ? null : evaluate(first.text, req);
    if (best?.report && best.problems.length === 0) return finish(best.report);

    if (Date.now() - started < REPAIR_DEADLINE_MS && !signal.aborted) {
      const problems = best?.problems ?? ["The output was not valid JSON for the schema."];
      const contents: Content[] = [...base];
      if (first.text.trim()) {
        contents.push({ role: "model", parts: [{ text: first.text.slice(0, 120_000).trimEnd() }] });
        contents.push({ role: "user", parts: [{ text: repairInstruction(problems, truncated) }] });
      }
      progress.restartWriting();
      const second = await streamJson(contents, progress, signal, withSchema);
      usage.inputTokens += second.usage.inputTokens;
      usage.outputTokens += second.usage.outputTokens;
      if (second.finish !== "MAX_TOKENS") {
        const again = evaluate(second.text, req);
        if (again.report && (again.problems.length === 0 || !best?.report || again.problems.length <= best.problems.length)) best = again;
      }
    }
    if (best?.report) return finish(best.report);
    throw new ReportFailure("server_error", "The narrator's report came out garbled. Please try again.");
  } catch (err) {
    const mapped = mapGeminiError(err, signal);
    if (!mapped) return;
    logGemini("report", err);
    send({ type: "error", code: mapped.code, message: mapped.message });
  } finally {
    progress.stop();
  }
}

export async function generateAnswerGemini(rawReq: AskRequest, send: (e: AskStreamEvent) => void, signal: AbortSignal): Promise<void> {
  const req: AskRequest = { ...rawReq, transcript: redact(rawReq.transcript), statsDigest: redact(rawReq.statsDigest) };
  const turns = req.history.slice(-40);
  while (turns.length && turns[0].role !== "user") turns.shift();
  const contents: Content[] = [
    ...turns.map((t) => ({ role: t.role === "assistant" ? "model" : "user", parts: [{ text: t.content }] })),
    { role: "user", parts: [{ text: askQuestionBlock(req) }] },
  ];
  let sentAny = false;
  try {
    const stream = await client().models.generateContentStream({
      model: aiConfig().geminiModel,
      contents,
      config: {
        systemInstruction: `${ASK_SYSTEM_PROMPT}\n\n${askContextBlock(req)}`,
        maxOutputTokens: ASK_MAX_OUTPUT,
        abortSignal: signal,
      },
    });
    for await (const chunk of stream) {
      const t = chunk.text ?? "";
      if (t) {
        sentAny = true;
        send({ type: "delta", text: t });
      }
    }
    if (!sentAny) {
      send({ type: "error", code: "server_error", message: "The narrator had nothing to say. Try asking differently." });
      return;
    }
    send({ type: "done" });
  } catch (err) {
    const mapped = mapGeminiError(err, signal);
    if (!mapped) return;
    logGemini("ask", err);
    send({ type: "error", code: mapped.code, message: mapped.message });
  }
}
