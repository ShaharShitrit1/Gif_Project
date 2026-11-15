/**
 * Browser client for /api/report and /api/ask (Server-Sent Events over fetch).
 * Robust against arbitrary chunk boundaries (incl. split UTF-8 sequences).
 */

import type { AIReport, AskRequest, AskStreamEvent, ReportRequest, ReportStreamEvent } from "../types";

export type ApiErrorCode =
  | "rate_limited"
  | "overloaded"
  | "too_large"
  | "refused"
  | "bad_request"
  | "server_error"
  | "unauthorized"
  | "network"
  | "aborted";

/** Thrown by streamReport / streamAsk. `code` is safe to switch on in the UI. */
export class ChatRoastApiError extends Error {
  constructor(
    public code: ApiErrorCode | (string & {}),
    message: string,
    public status?: number,
    /** Seconds to wait before retrying (from Retry-After), when known. */
    public retryAfter?: number,
  ) {
    super(message);
    this.name = "ChatRoastApiError";
  }
}

/* ------------------------------------------------------------------ */
/* SSE parsing                                                         */
/* ------------------------------------------------------------------ */

export interface SSEMessage {
  event: string;
  data: string;
  id?: string;
}

/**
 * Incremental SSE parser (WHATWG event-stream rules): handles \n, \r\n and \r
 * line endings split across chunks, comment lines (": ping"), multi-line data
 * fields, and an optional single space after the colon.
 */
export function createSSEParser(onMessage: (msg: SSEMessage) => void) {
  let buffer = "";
  let data: string[] = [];
  let event = "";
  let id: string | undefined;
  let sawCR = false;

  const dispatch = () => {
    if (data.length) onMessage({ event: event || "message", data: data.join("\n"), id });
    data = [];
    event = "";
  };

  const processLine = (line: string) => {
    if (line === "") return dispatch();
    if (line.startsWith(":")) return;
    const colon = line.indexOf(":");
    const field = colon === -1 ? line : line.slice(0, colon);
    let value = colon === -1 ? "" : line.slice(colon + 1);
    if (value.startsWith(" ")) value = value.slice(1);
    if (field === "data") data.push(value);
    else if (field === "event") event = value;
    else if (field === "id") id = value;
  };

  return {
    feed(chunk: string) {
      let text = chunk;
      // A "\r\n" split across chunks: drop the "\n" that completes it.
      if (sawCR && text.startsWith("\n")) text = text.slice(1);
      sawCR = false;
      buffer += text;
      let start = 0;
      for (let i = 0; i < buffer.length; i++) {
        const c = buffer[i];
        if (c === "\n" || c === "\r") {
          processLine(buffer.slice(start, i));
          if (c === "\r") {
            if (i + 1 < buffer.length) {
              if (buffer[i + 1] === "\n") i++;
            } else sawCR = true;
          }
          start = i + 1;
        }
      }
      buffer = buffer.slice(start);
    },
    /** Call at end of stream: dispatches a final event without a trailing blank line. */
    flush() {
      if (buffer) processLine(buffer);
      buffer = "";
      dispatch();
    },
  };
}

/* ------------------------------------------------------------------ */
/* Transport                                                           */
/* ------------------------------------------------------------------ */

function accessCodeHeader(): Record<string, string> {
  try {
    const code = typeof localStorage !== "undefined" ? localStorage.getItem("cr_access_code") : null;
    return code ? { "x-access-code": code } : {};
  } catch {
    return {};
  }
}

function codeForStatus(status: number): ApiErrorCode {
  if (status === 429) return "rate_limited";
  if (status === 413) return "too_large";
  if (status === 401 || status === 403) return "unauthorized";
  if (status === 503 || status === 529) return "overloaded";
  if (status >= 400 && status < 500) return "bad_request";
  return "server_error";
}

function isAbort(err: unknown, signal?: AbortSignal): boolean {
  return Boolean(signal?.aborted) || (err instanceof DOMException && err.name === "AbortError");
}

async function postSSE(
  url: string,
  body: unknown,
  onData: (json: unknown) => boolean | void,
  signal?: AbortSignal,
): Promise<void> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "text/event-stream", ...accessCodeHeader() },
      body: JSON.stringify(body),
      signal,
    });
  } catch (err) {
    if (isAbort(err, signal)) throw new ChatRoastApiError("aborted", "Request aborted");
    throw new ChatRoastApiError("network", "Network error — check your connection and try again");
  }

  if (!res.ok || !res.body) {
    let code: string = codeForStatus(res.status);
    let message = `HTTP ${res.status}`;
    try {
      const j = (await res.json()) as { code?: string; message?: string };
      if (j?.code) code = j.code;
      if (j?.message) message = j.message;
    } catch {
      /* not JSON */
    }
    const ra = Number(res.headers.get("retry-after"));
    throw new ChatRoastApiError(code, message, res.status, Number.isFinite(ra) && ra > 0 ? ra : undefined);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let stop = false;
  let parseError: unknown = null;
  const parser = createSSEParser((msg) => {
    if (stop) return;
    let json: unknown;
    try {
      json = JSON.parse(msg.data);
    } catch {
      return; // ignore malformed frames
    }
    try {
      if (onData(json) === true) stop = true;
    } catch (err) {
      parseError = err;
      stop = true;
    }
  });

  try {
    while (!stop) {
      const { value, done } = await reader.read();
      if (done) break;
      parser.feed(decoder.decode(value, { stream: true }));
    }
    if (!stop) {
      parser.feed(decoder.decode());
      parser.flush();
    }
  } catch (err) {
    if (isAbort(err, signal)) throw new ChatRoastApiError("aborted", "Request aborted");
    throw new ChatRoastApiError("network", "The connection dropped while the narrator was writing");
  } finally {
    if (stop) reader.cancel().catch(() => {});
  }
  if (parseError) throw parseError;
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

/**
 * Streams /api/report. `onEvent` receives every event (status, done, error).
 * Resolves with the report on `done`; rejects with ChatRoastApiError on `error`
 * events, HTTP errors, network failures or abort (code "aborted").
 */
export async function streamReport(
  req: ReportRequest,
  onEvent: (e: ReportStreamEvent) => void,
  signal?: AbortSignal,
): Promise<{ report: AIReport; mock: boolean }> {
  let result: { report: AIReport; mock: boolean } | null = null;
  await postSSE(
    "/api/report",
    req,
    (json) => {
      const e = json as ReportStreamEvent;
      if (!e || typeof e !== "object" || !("type" in e)) return;
      onEvent(e);
      if (e.type === "done") {
        result = { report: e.report, mock: Boolean(e.mock) };
        return true;
      }
      if (e.type === "error") throw new ChatRoastApiError(e.code, e.message);
    },
    signal,
  );
  if (!result) throw new ChatRoastApiError("server_error", "The stream ended before the report was finished");
  return result;
}

/**
 * Streams /api/ask. `onDelta` receives text chunks as they arrive.
 * Resolves with the full answer text on `done`.
 */
export async function streamAsk(
  req: AskRequest,
  onDelta: (text: string) => void,
  signal?: AbortSignal,
): Promise<{ text: string; mock: boolean }> {
  let text = "";
  let done: { mock: boolean } | null = null;
  await postSSE(
    "/api/ask",
    req,
    (json) => {
      const e = json as AskStreamEvent;
      if (!e || typeof e !== "object" || !("type" in e)) return;
      if (e.type === "delta") {
        text += e.text;
        onDelta(e.text);
      } else if (e.type === "done") {
        done = { mock: Boolean(e.mock) };
        return true;
      } else if (e.type === "error") throw new ChatRoastApiError(e.code, e.message);
    },
    signal,
  );
  if (!done) throw new ChatRoastApiError("server_error", "The stream ended before the answer was finished");
  return { text, mock: (done as { mock: boolean }).mock };
}
