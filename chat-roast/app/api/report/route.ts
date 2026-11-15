import type { ReportRequest, ReportStreamEvent } from "../../../lib/types";
import { aiConfig } from "../../../lib/ai/config";
import { generateReport } from "../../../lib/ai/generate";
import { sseResponse } from "../../../lib/ai/http";
import { runMockReport } from "../../../lib/ai/mock";
import { withUserKey } from "../../../lib/ai/user-key";
import { guardRequest } from "../../../lib/ai/route-helpers";
import { parseReportRequest } from "../../../lib/ai/validate";

export const runtime = "nodejs";
export const maxDuration = 300;

/** POST /api/report — streams ReportStreamEvent as Server-Sent Events. Stores nothing. */
export async function POST(request: Request): Promise<Response> {
  const guard = await guardRequest<ReportRequest>(request, "report", parseReportRequest);
  if (!guard.ok) return guard.response;
  const req = guard.value;
  return sseResponse<ReportStreamEvent>(
    (send, signal) =>
      guard.mock ? runMockReport(req, send, signal, aiConfig().mockDelayMs) : withUserKey(guard.userKey, () => generateReport(req, send, signal)),
    request.signal,
    () => ({ type: "error", code: "server_error", message: "Something went wrong while writing the report." }),
  );
}
