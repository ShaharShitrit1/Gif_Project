import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReportRequest, ReportStreamEvent } from "../../lib/types";
import { ChatRoastApiError, createSSEParser, streamAsk, streamReport } from "../../lib/ai/client";
import { DEMO_REPORT } from "../../lib/ai/demo-report";

const enc = new TextEncoder();

/** A fetch Response whose body arrives in the given byte chunks. */
function sseResponse(chunks: Uint8Array[], init: ResponseInit = {}) {
  const body = new ReadableStream<Uint8Array>({
    start(c) {
      for (const ch of chunks) c.enqueue(ch);
      c.close();
    },
  });
  return new Response(body, { status: 200, headers: { "content-type": "text/event-stream" }, ...init });
}

function splitEvery(bytes: Uint8Array, size: number): Uint8Array[] {
  const out: Uint8Array[] = [];
  for (let i = 0; i < bytes.length; i += size) out.push(bytes.slice(i, i + size));
  return out;
}

const req = {} as ReportRequest;

afterEach(() => vi.unstubAllGlobals());

describe("createSSEParser", () => {
  it("parses events across arbitrary chunk boundaries and line endings", () => {
    const raw = ": connected\r\n\r\ndata: {\"a\":1}\r\n\r\nevent: x\ndata: line1\ndata: line2\n\n: ping\n\ndata:no-space\r\rdata: tail";
    for (let size = 1; size <= raw.length; size++) {
      const got: { event: string; data: string }[] = [];
      const p = createSSEParser((m) => got.push({ event: m.event, data: m.data }));
      for (let i = 0; i < raw.length; i += size) p.feed(raw.slice(i, i + size));
      p.flush();
      expect(got, `chunk size ${size}`).toEqual([
        { event: "message", data: '{"a":1}' },
        { event: "x", data: "line1\nline2" },
        { event: "message", data: "no-space" },
        { event: "message", data: "tail" },
      ]);
    }
  });
});

describe("streamReport", () => {
  const events: ReportStreamEvent[] = [
    { type: "status", phase: "reading", progress: 0.03 },
    { type: "status", phase: "writing", progress: 0.5 },
    { type: "done", report: DEMO_REPORT, mock: true },
  ];
  const bytes = enc.encode(": connected\n\n" + events.map((e) => `data: ${JSON.stringify(e)}\n\n`).join("") + ": ping\n\n");

  it.each([1, 2, 3, 7, 64, 4096])("handles %i-byte chunks (incl. split Hebrew UTF-8)", async (size) => {
    vi.stubGlobal("fetch", vi.fn(async () => sseResponse(splitEvery(bytes, size))));
    const seen: ReportStreamEvent[] = [];
    const result = await streamReport(req, (e) => seen.push(e));
    expect(seen.map((e) => e.type)).toEqual(["status", "status", "done"]);
    expect(result.mock).toBe(true);
    expect(result.report).toEqual(DEMO_REPORT);
  });

  it("throws a typed error on an error event", async () => {
    const body = enc.encode(`data: ${JSON.stringify({ type: "error", code: "overloaded", message: "busy" })}\n\n`);
    vi.stubGlobal("fetch", vi.fn(async () => sseResponse([body])));
    await expect(streamReport(req, () => {})).rejects.toMatchObject({ name: "ChatRoastApiError", code: "overloaded", message: "busy" });
  });

  it("throws a typed error on HTTP errors, using the JSON body and Retry-After", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ type: "error", code: "rate_limited", message: "slow down" }), { status: 429, headers: { "retry-after": "42" } })),
    );
    const err = (await streamReport(req, () => {}).catch((e) => e)) as ChatRoastApiError;
    expect(err).toBeInstanceOf(ChatRoastApiError);
    expect(err).toMatchObject({ code: "rate_limited", status: 429, retryAfter: 42 });
  });

  it("maps a bare HTTP status when the body isn't JSON", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("nope", { status: 413 })));
    await expect(streamReport(req, () => {})).rejects.toMatchObject({ code: "too_large", status: 413 });
  });

  it("fails clearly when the stream ends without done", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => sseResponse([enc.encode('data: {"type":"status","phase":"thinking"}\n\n')])));
    await expect(streamReport(req, () => {})).rejects.toMatchObject({ code: "server_error" });
  });

  it("reports aborts as code 'aborted'", async () => {
    const ac = new AbortController();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (): Promise<Response> => {
        ac.abort();
        throw new DOMException("aborted", "AbortError");
      }),
    );
    await expect(streamReport(req, () => {}, ac.signal)).rejects.toMatchObject({ code: "aborted" });
  });
});

describe("streamAsk", () => {
  it("accumulates deltas", async () => {
    const parts = ["שלום ", "חמודים ", "שלי 💙"];
    const raw = parts.map((t) => `data: ${JSON.stringify({ type: "delta", text: t })}\n\n`).join("") + `data: {"type":"done","mock":true}\n\n`;
    vi.stubGlobal("fetch", vi.fn(async () => sseResponse(splitEvery(enc.encode(raw), 5))));
    const deltas: string[] = [];
    const r = await streamAsk({} as never, (d) => deltas.push(d));
    expect(deltas).toEqual(parts);
    expect(r).toEqual({ text: parts.join(""), mock: true });
  });
});
