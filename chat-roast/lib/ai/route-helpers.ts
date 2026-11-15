/**
 * Shared request guard for the AI routes: access code, body size, JSON parse,
 * zod validation, and per-IP rate limiting (only for real AI calls; mock mode
 * costs nothing). Returns the parsed body or a ready error Response.
 */

import { readUserKey } from "./user-key";
import { aiConfig } from "./config";
import { BodyTooLargeError, checkAccessCode, clientIp, jsonError, rateLimit, readBodyText } from "./http";
import type { ParseResult } from "./validate";

export async function guardRequest<T>(
  request: Request,
  kind: "report" | "ask",
  parse: (json: unknown) => ParseResult<T>,
): Promise<{ ok: true; value: T; mock: boolean; userKey: string | null } | { ok: false; response: Response }> {
  const cfg = aiConfig();
  // Server key wins; otherwise a visitor's own key; otherwise mock mode.
  const userKey = !cfg.forceMock && !cfg.hasServerKey ? readUserKey(request) : null;
  const mock = cfg.forceMock || (!cfg.hasServerKey && !userKey);
  if (cfg.hasServerKey && !cfg.forceMock && !checkAccessCode(request, cfg.accessCode)) {
    return { ok: false, response: jsonError(401, "unauthorized", "An access code is required.") };
  }
  let text: string;
  try {
    text = await readBodyText(request);
  } catch (err) {
    if (err instanceof BodyTooLargeError) return { ok: false, response: jsonError(413, "too_large", "The request is too large (max 3 MB).") };
    return { ok: false, response: jsonError(400, "bad_request", "Could not read the request body.") };
  }
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, response: jsonError(400, "bad_request", "The request body must be JSON.") };
  }
  const parsed = parse(json);
  if (!parsed.ok) return { ok: false, response: jsonError(400, "bad_request", `Invalid request: ${parsed.message}`) };

  if (!mock && !userKey) {
    const limit = kind === "report" ? cfg.reportsPerHour : cfg.asksPerHour;
    const wait = rateLimit(`${kind}:${clientIp(request)}`, limit);
    if (wait > 0) {
      return {
        ok: false,
        response: jsonError(429, "rate_limited", "Too many requests. Please wait a bit and try again.", { "retry-after": String(wait) }),
      };
    }
  }
  return { ok: true, value: parsed.value, mock, userKey };
}
