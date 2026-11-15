/**
 * Server-only HTTP plumbing for the AI routes: body size limit, access code,
 * per-IP rate limiting and Server-Sent Events with a heartbeat.
 * Never logs request bodies (they contain chat content).
 */

export const MAX_BODY_BYTES = 3 * 1024 * 1024;
const HEARTBEAT_MS = 10_000;

export type ErrorCode = "rate_limited" | "overloaded" | "too_large" | "refused" | "bad_request" | "server_error" | "unauthorized";

export function jsonError(status: number, code: ErrorCode, message: string, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify({ type: "error", code, message }), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers },
  });
}

/* ------------------------------------------------------------------ */
/* Body                                                                */
/* ------------------------------------------------------------------ */

export class BodyTooLargeError extends Error {}

/** Reads the body as text, refusing more than `limit` bytes even without content-length. */
export async function readBodyText(request: Request, limit = MAX_BODY_BYTES): Promise<string> {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > limit) throw new BodyTooLargeError();
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      reader.cancel().catch(() => {});
      throw new BodyTooLargeError();
    }
    chunks.push(value);
  }
  const all = new Uint8Array(size);
  let off = 0;
  for (const c of chunks) {
    all.set(c, off);
    off += c.byteLength;
  }
  return new TextDecoder().decode(all);
}

/* ------------------------------------------------------------------ */
/* Access code                                                         */
/* ------------------------------------------------------------------ */

function safeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const x = enc.encode(a);
  const y = enc.encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

export function checkAccessCode(request: Request, required: string | null): boolean {
  if (!required) return true;
  const given = request.headers.get("x-access-code") ?? "";
  return safeEqual(given.trim(), required);
}

/* ------------------------------------------------------------------ */
/* Rate limiting (in-memory, per instance)                             */
/* ------------------------------------------------------------------ */

const buckets = new Map<string, number[]>();
let lastSweep = 0;

export function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim() || "unknown";
  return request.headers.get("x-real-ip")?.trim() || "local";
}

/**
 * Sliding-window limiter. Returns 0 when allowed (and records the hit), or the
 * number of seconds until the next slot frees up.
 */
export function rateLimit(key: string, limit: number, windowMs = 60 * 60 * 1000, now = Date.now()): number {
  if (limit <= 0) return 0;
  if (now - lastSweep > windowMs) {
    for (const [k, hits] of buckets) if (!hits.length || now - hits[hits.length - 1] > windowMs) buckets.delete(k);
    lastSweep = now;
  }
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    buckets.set(key, hits);
    return Math.max(1, Math.ceil((hits[0] + windowMs - now) / 1000));
  }
  hits.push(now);
  buckets.set(key, hits);
  return 0;
}

export function resetRateLimits() {
  buckets.clear();
}

/* ------------------------------------------------------------------ */
/* Server-Sent Events                                                  */
/* ------------------------------------------------------------------ */

export type Send<E> = (event: E) => void;

/**
 * Runs `handler` and streams what it sends as `data: <json>\n\n` frames, with a
 * ": ping" comment every 10 s so proxies keep the connection open. The signal
 * passed to the handler aborts when the client disconnects.
 */
export function sseResponse<E>(
  handler: (send: Send<E>, signal: AbortSignal) => Promise<void>,
  requestSignal?: AbortSignal,
  onCrash?: (err: unknown) => E,
): Response {
  const encoder = new TextEncoder();
  const abort = new AbortController();
  const onRequestAbort = () => abort.abort();
  requestSignal?.addEventListener("abort", onRequestAbort, { once: true });

  let heartbeat: ReturnType<typeof setInterval> | undefined;
  let closed = false;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const write = (s: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(s));
        } catch {
          closed = true;
        }
      };
      const send: Send<E> = (event) => write(`data: ${JSON.stringify(event)}\n\n`);
      write(": connected\n\n");
      heartbeat = setInterval(() => write(": ping\n\n"), HEARTBEAT_MS);

      handler(send, abort.signal)
        .catch((err) => {
          if (!abort.signal.aborted && onCrash) send(onCrash(err));
        })
        .finally(() => {
          clearInterval(heartbeat);
          requestSignal?.removeEventListener("abort", onRequestAbort);
          if (!closed) {
            closed = true;
            try {
              controller.close();
            } catch {
              /* already closed */
            }
          }
        });
    },
    cancel() {
      closed = true;
      clearInterval(heartbeat);
      abort.abort();
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    },
  });
}
