import { readFileSync } from "node:fs";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import type { AskStreamEvent, ReportStreamEvent } from "../../lib/types";
import { POST as reportPOST } from "../../app/api/report/route";
import { POST as askPOST } from "../../app/api/ask/route";
import { parseChatText } from "../../lib/parser";
import { computeStats } from "../../lib/stats";
import { DEMO_REPORT } from "../../lib/ai/demo-report";
import { isCompleteReport } from "../../lib/ai/schema";
import { buildReportRequest } from "../../lib/ai/transcript";
import { rateLimit, resetRateLimits } from "../../lib/ai/http";
import { createSSEParser } from "../../lib/ai/client";

const chat = parseChatText(readFileSync(new URL("../../public/samples/demo-chat.txt", import.meta.url), "utf8"));
const reportReq = buildReportRequest({ chat, stats: computeStats(chat), chatType: "friends", language: "English", personaId: "max", intensity: 2 });
const askReq = {
  personaId: "savta",
  language: "Hebrew",
  intensity: 1,
  report: DEMO_REPORT,
  participants: reportReq.participants,
  transcript: reportReq.transcript,
  statsDigest: reportReq.statsDigest,
  history: [],
  question: "מי הכי אכפתית?",
  focusParticipantId: "p0",
};

beforeAll(() => {
  process.env.MOCK_AI = "1";
  process.env.CHATROAST_MOCK_DELAY_MS = "0";
});
afterEach(() => {
  delete process.env.CHATROAST_ACCESS_CODE;
});

const post = (body: unknown, headers: Record<string, string> = {}) =>
  new Request("http://localhost/api/x", { method: "POST", headers: { "content-type": "application/json", ...headers }, body: typeof body === "string" ? body : JSON.stringify(body) });

async function readEvents<T>(res: Response): Promise<{ events: T[]; raw: string }> {
  const raw = await res.text();
  const events: T[] = [];
  const p = createSSEParser((m) => events.push(JSON.parse(m.data)));
  p.feed(raw);
  p.flush();
  return { events, raw };
}

describe("POST /api/report (mock mode)", () => {
  it("streams status events then a complete mock report", async () => {
    const res = await reportPOST(post(reportReq));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/event-stream");
    const { events, raw } = await readEvents<ReportStreamEvent>(res);
    expect(raw.startsWith(": connected\n\n")).toBe(true);
    const phases = events.filter((e) => e.type === "status").map((e) => (e as { phase: string }).phase);
    expect(phases[0]).toBe("reading");
    expect(phases).toContain("thinking");
    expect(phases).toContain("writing");
    expect(phases.at(-1)).toBe("polishing");
    const done = events.at(-1)!;
    expect(done.type).toBe("done");
    if (done.type !== "done") return;
    expect(done.mock).toBe(true);
    expect(isCompleteReport(done.report, reportReq.participants)).toBe(true);
  });

  it("rejects invalid bodies with 400", async () => {
    const res = await reportPOST(post({ ...reportReq, intensity: 7 }));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ type: "error", code: "bad_request" });
    expect((await reportPOST(post("{not json"))).status).toBe(400);
    expect((await reportPOST(post({ ...reportReq, selfId: "p42" }))).status).toBe(400);
  });

  it("rejects bodies over 3 MB with 413", async () => {
    const res = await reportPOST(post({ ...reportReq, transcript: "x".repeat(3 * 1024 * 1024 + 10) }));
    expect(res.status).toBe(413);
    expect(await res.json()).toMatchObject({ code: "too_large" });
  });

  it("requires x-access-code when CHATROAST_ACCESS_CODE is set", async () => {
    process.env.CHATROAST_ACCESS_CODE = "sesame";
    expect((await reportPOST(post(reportReq))).status).toBe(401);
    expect((await reportPOST(post(reportReq, { "x-access-code": "wrong" }))).status).toBe(401);
    const ok = await reportPOST(post(reportReq, { "x-access-code": "sesame" }));
    expect(ok.status).toBe(200);
    await ok.text();
  });
});

describe("POST /api/ask (mock mode)", () => {
  it("streams text deltas then done", async () => {
    const res = await askPOST(post(askReq));
    expect(res.status).toBe(200);
    const { events } = await readEvents<AskStreamEvent>(res);
    const text = events.filter((e) => e.type === "delta").map((e) => (e as { text: string }).text).join("");
    expect(text).toContain("נועה");
    expect(events.at(-1)).toEqual({ type: "done", mock: true });
  });

  it("validates focusParticipantId and the embedded report", async () => {
    expect((await askPOST(post({ ...askReq, focusParticipantId: "p77" }))).status).toBe(400);
    expect((await askPOST(post({ ...askReq, report: { title: "x" } }))).status).toBe(400);
  });
});

describe("rateLimit", () => {
  it("allows N hits per window per key, then returns seconds to wait", () => {
    resetRateLimits();
    const t0 = 1_000_000;
    for (let i = 0; i < 3; i++) expect(rateLimit("ip", 3, 60_000, t0 + i)).toBe(0);
    expect(rateLimit("ip", 3, 60_000, t0 + 10)).toBe(60);
    expect(rateLimit("other", 3, 60_000, t0 + 10)).toBe(0);
    expect(rateLimit("ip", 3, 60_000, t0 + 60_001)).toBe(0);
    expect(rateLimit("ip", 0, 60_000, t0)).toBe(0);
  });
});
