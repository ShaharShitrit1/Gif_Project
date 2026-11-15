import Anthropic from "@anthropic-ai/sdk";
import { aiConfig } from "../../../lib/ai/config";
import { readUserKey } from "../../../lib/ai/user-key";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET  /api/status → { mode: "server" | "byok" | "mock" }
 *   server: the site has its own key · byok: visitors may bring their own · mock: demo only
 * POST /api/status with header x-user-api-key → { valid: boolean } (free check, nothing stored)
 */
export function GET(): Response {
  const cfg = aiConfig();
  const mode = cfg.forceMock ? "mock" : cfg.hasServerKey ? "server" : "byok";
  return Response.json({ mode, provider: cfg.provider, accessCode: mode === "server" && !!cfg.accessCode }, { headers: { "cache-control": "no-store" } });
}

export async function POST(request: Request): Promise<Response> {
  const key = readUserKey(request);
  if (!key) return Response.json({ valid: false }, { status: 400 });
  try {
    await new Anthropic({ apiKey: key, maxRetries: 0, timeout: 15_000 }).models.retrieve(aiConfig().model);
    return Response.json({ valid: true });
  } catch (err) {
    const status = err instanceof Anthropic.APIError ? err.status : undefined;
    return Response.json({ valid: false, reason: status === 401 || status === 403 ? "rejected" : "unreachable" });
  }
}
