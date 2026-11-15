/**
 * Server-side AI configuration, read from the environment on every call (so
 * tests and hot reload can change it).
 *
 *   ANTHROPIC_API_KEY             real mode when set (and MOCK_AI is not 1)
 *   MOCK_AI=1                     force mock mode
 *   AI_PROVIDER                   anthropic | gemini (default: gemini when only GEMINI_API_KEY is set)
 *   GEMINI_API_KEY / GEMINI_MODEL  Google Gemini (free tier in Google AI Studio); model default gemini-flash-latest
 *   CHATROAST_MODEL               default "claude-opus-5-5"
 *   CHATROAST_EFFORT              report effort: low|medium|high|xhigh|max (default high)
 *   CHATROAST_ASK_EFFORT          ask effort (default medium)
 *   CHATROAST_ACCESS_CODE         when set, requests need header x-access-code
 *   CHATROAST_REPORTS_PER_HOUR    per-IP report limit for real AI calls (default 6, 0 = off)
 *   CHATROAST_ASKS_PER_HOUR       per-IP ask limit for real AI calls (default 60, 0 = off)
 *   CHATROAST_MOCK_DELAY_MS       mock report duration (default 5000)
 */

export type Effort = "low" | "medium" | "high" | "xhigh" | "max";
const EFFORTS: readonly Effort[] = ["low", "medium", "high", "xhigh", "max"];

function effortFrom(v: string | undefined, fallback: Effort): Effort {
  const e = (v ?? "").trim().toLowerCase();
  return (EFFORTS as readonly string[]).includes(e) ? (e as Effort) : fallback;
}

function intFrom(v: string | undefined, fallback: number): number {
  const n = Number.parseInt((v ?? "").trim(), 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export const DEFAULT_MODEL = "claude-opus-5-5";
/** Google's alias for the current Flash model (free tier). Override with GEMINI_MODEL. */
export const DEFAULT_GEMINI_MODEL = "gemini-flash-latest";

export function aiConfig() {
  const env = process.env;
  const mockFlag = (env.MOCK_AI ?? "").trim().toLowerCase();
  // AI_PROVIDER=gemini|anthropic; unset → Gemini when only GEMINI_API_KEY is configured.
  const wanted = (env.AI_PROVIDER ?? "").trim().toLowerCase();
  const provider: "anthropic" | "gemini" =
    wanted === "gemini" || (wanted !== "anthropic" && !env.ANTHROPIC_API_KEY && !!env.GEMINI_API_KEY) ? "gemini" : "anthropic";
  const serverKey = provider === "gemini" ? !!env.GEMINI_API_KEY : !!env.ANTHROPIC_API_KEY;
  return {
    provider,
    geminiModel: env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL,
    forceMock: mockFlag === "1" || mockFlag === "true",
    hasServerKey: serverKey,
    mock: mockFlag === "1" || mockFlag === "true" || !serverKey,
    model: env.CHATROAST_MODEL?.trim() || DEFAULT_MODEL,
    reportEffort: effortFrom(env.CHATROAST_EFFORT, "high"),
    askEffort: effortFrom(env.CHATROAST_ASK_EFFORT, "medium"),
    accessCode: env.CHATROAST_ACCESS_CODE?.trim() || null,
    reportsPerHour: intFrom(env.CHATROAST_REPORTS_PER_HOUR, 6),
    asksPerHour: intFrom(env.CHATROAST_ASKS_PER_HOUR, 60),
    mockDelayMs: intFrom(env.CHATROAST_MOCK_DELAY_MS, 5000),
  };
}
