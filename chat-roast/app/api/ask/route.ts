import type { AskRequest, AskStreamEvent } from "../../../lib/types";
import { aiConfig } from "../../../lib/ai/config";
import { generateAnswer } from "../../../lib/ai/generate";
import { sseResponse } from "../../../lib/ai/http";
import { runMockAsk } from "../../../lib/ai/mock";
import { guardRequest } from "../../../lib/ai/route-helpers";
import { parseAskRequest } from "../../../lib/ai/validate";

export const runtime = "nodejs";
export const maxDuration = 300;

/** POST /api/ask — streams AskStreamEvent (text deltas) as Server-Sent Events. Stores nothing. */
export async function POST(request: Request): Promise<Response> {
  const guard = await guardRequest<AskRequest>(request, "ask", parseAskRequest);
  if (!guard.ok) return guard.response;
  const req = guard.value;
  return sseResponse<AskStreamEvent>(
    (send, signal) => (guard.mock ? runMockAsk(req, send, signal, aiConfig().mockDelayMs) : generateAnswer(req, send, signal)),
    request.signal,
    () => ({ type: "error", code: "server_error", message: "Something went wrong while answering." }),
  );
}
