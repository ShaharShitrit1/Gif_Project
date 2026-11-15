"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { SiteHeader } from "@/components/ui/SiteHeader";
import { isChatType } from "@/components/ui/chatTypes";
import { ChatRoastApiError, streamReport } from "@/lib/ai/client";
import { buildReportRequest } from "@/lib/ai/transcript";
import { useLocale } from "@/lib/i18n";
import type { GenPhase } from "@/lib/i18n/dict/wizard";
import { applyIdentity, type Identity } from "@/lib/parser";
import { DEFAULT_PERSONA, PERSONAS, REPORT_LANGUAGES } from "@/lib/personas";
import { computeStats } from "@/lib/stats";
import { newReportId, saveReport } from "@/lib/storage/reports";
import type { ChatStats, ChatType, Intensity, ParsedChat, PersonaId, SavedReport } from "@/lib/types";
import { StepChatType } from "./StepChatType";
import { StepGenerating } from "./StepGenerating";
import { StepPersonalize } from "./StepPersonalize";
import { StepReview } from "./StepReview";
import { StepUpload } from "./StepUpload";

export type Step = 1 | 2 | 3 | 4 | 5;
export const TOTAL_STEPS = 5;

export interface ChatSource {
  chat: ParsedChat;
  fileName: string;
  demo: boolean;
}

export interface GenState {
  status: "idle" | "running" | "error" | "done";
  phase: GenPhase;
  progress: number;
  stats: ChatStats | null;
  totalMessages: number;
  error: { code: string; retryAfter?: number } | null;
  startedAt: number;
}

const IDLE: GenState = { status: "idle", phase: "reading", progress: 0, stats: null, totalMessages: 0, error: null, startedAt: 0 };
const EMPTY_IDENTITY: Identity = { merges: {}, names: {}, selfId: undefined };
/** Keep the loading scene on screen at least this long, so it never just flashes. */
const MIN_SCENE_MS = 2600;
/** Smaller transcript budget used when the API said the request was too large. */
const SMALL_TRANSCRIPT_TOKENS = 60_000;

const sleep = (ms: number) => new Promise((r) => window.setTimeout(r, ms));

function urlFor(step: Step, chatType: ChatType | null) {
  const q = new URLSearchParams();
  if (chatType) q.set("type", chatType);
  q.set("step", String(step));
  return `/analyze?${q.toString()}`;
}

/** Count of people after merges (each merged-away id disappears). */
function peopleAfterMerges(chat: ParsedChat, merges: Record<string, string>): number {
  const ids = new Set(chat.participants.map((p) => p.id));
  const gone = Object.entries(merges).filter(([s, t]) => ids.has(s) && ids.has(t) && s !== t).length;
  return chat.participants.length - gone;
}

export function Wizard() {
  const params = useSearchParams();
  const router = useRouter();
  const { locale } = useLocale();

  /* ---------------- wizard state (survives step navigation) ---------------- */
  const [chatType, setChatType] = useState<ChatType | null>(() => {
    const v = params.get("type");
    return isChatType(v) ? v : null;
  });
  const [personaId, setPersonaId] = useState<PersonaId>(() => {
    const v = params.get("persona");
    return v && v in PERSONAS ? (v as PersonaId) : DEFAULT_PERSONA;
  });
  const [intensity, setIntensity] = useState<Intensity>(2);
  const [langCode, setLangCode] = useState<string | null>(null);
  const [extraContext, setExtraContext] = useState("");
  const [source, setSource] = useState<ChatSource | null>(null);
  const [identity, setIdentity] = useState<Identity>(EMPTY_IDENTITY);
  const [groupName, setGroupName] = useState("");
  const [gen, setGen] = useState<GenState>(IDLE);
  const [confirmLeave, setConfirmLeave] = useState(false);

  const ctrlRef = useRef<AbortController | null>(null);
  const smallTranscriptRef = useRef(false);

  const language = REPORT_LANGUAGES.find((l) => l.code === (langCode ?? locale)) ?? REPORT_LANGUAGES[0];

  /* ---------------- step derived from the URL, clamped to what's reachable ---------------- */
  const rawStep = Number(params.get("step"));
  const urlStep = (rawStep >= 1 && rawStep <= TOTAL_STEPS ? rawStep : chatType ? 2 : 1) as Step;
  const people = source ? peopleAfterMerges(source.chat, identity.merges) : 0;
  let maxStep: Step = 1;
  if (chatType) maxStep = 2;
  if (maxStep === 2 && source) maxStep = 3;
  if (maxStep === 3 && people >= 2) maxStep = 4;
  if (maxStep === 4 && gen.status !== "idle") maxStep = 5;
  let step = Math.min(urlStep, maxStep) as Step;
  if (gen.status === "running" || gen.status === "done") step = 5;

  // Deep links to a step we can't show yet (e.g. a reload on step 4) fall back quietly.
  useEffect(() => {
    if (gen.status === "running" || gen.status === "done") return;
    if (params.get("step") && urlStep !== step) window.history.replaceState(null, "", urlFor(step, chatType));
  }, [params, urlStep, step, chatType, gen.status]);

  const goTo = useCallback(
    (next: Step) => {
      window.history.pushState({ crwFrom: step }, "", urlFor(next, chatType));
    },
    [step, chatType],
  );

  const goBack = useCallback(() => {
    if (step <= 1) {
      router.push("/");
      return;
    }
    const target = (step - 1) as Step;
    const st = window.history.state as { crwFrom?: number } | null;
    if (st?.crwFrom === target) window.history.back();
    else window.history.replaceState(null, "", urlFor(target, chatType));
  }, [step, chatType, router]);

  /* ---------------- generation ---------------- */
  const startGeneration = useCallback(async () => {
    if (!source || !chatType) return;
    ctrlRef.current?.abort();
    const ctrl = new AbortController();
    ctrlRef.current = ctrl;
    const startedAt = Date.now();
    setGen({ ...IDLE, status: "running", phase: "reading", progress: 0.02, startedAt });

    // Let the loading scene paint before the (synchronous) number crunching.
    await sleep(80);
    if (ctrl.signal.aborted) return;

    let chat: ParsedChat;
    let stats: ChatStats;
    let req: ReturnType<typeof buildReportRequest>;
    try {
      chat = applyIdentity(source.chat, identity);
      stats = computeStats(chat);
      setGen((g) => ({ ...g, stats, totalMessages: stats.totalMessages }));
      req = buildReportRequest({
        chat,
        stats,
        chatType,
        language: language.model,
        personaId,
        intensity,
        groupName: groupName.trim() || undefined,
        selfId: identity.selfId ?? null,
        extraContext: extraContext.trim() || undefined,
        maxTokens: smallTranscriptRef.current ? SMALL_TRANSCRIPT_TOKENS : undefined,
      });
    } catch (err) {
      console.error(err);
      setGen((g) => ({ ...g, status: "error", error: { code: "client" } }));
      return;
    }

    try {
      const res = await streamReport(
        req,
        (e) => {
          if (e.type !== "status") return;
          setGen((g) =>
            g.status === "running" ? { ...g, phase: e.phase, progress: Math.max(g.progress, Math.min(0.99, e.progress ?? g.progress)) } : g,
          );
        },
        ctrl.signal,
      );
      const wait = MIN_SCENE_MS - (Date.now() - startedAt);
      if (wait > 0) await sleep(wait);
      if (ctrl.signal.aborted) return;

      const id = newReportId();
      const saved: SavedReport = {
        id,
        createdAt: Date.now(),
        chatType,
        groupName:
          groupName.trim() ||
          chat.title?.trim() ||
          chat.participants
            .slice(0, 3)
            .map((p) => p.displayName)
            .join(", "),
        personaId,
        intensity,
        language: language.model,
        participants: chat.participants,
        stats,
        report: res.report,
        transcript: req.transcript,
        statsDigest: req.statsDigest,
        transcriptMeta: req.transcriptMeta,
        qa: [],
        mock: res.mock,
      };
      await saveReport(saved);
      setGen((g) => ({ ...g, status: "done", progress: 1 }));
      router.push(`/report/${id}`);
    } catch (err) {
      if (ctrl.signal.aborted) return;
      const code = err instanceof ChatRoastApiError ? err.code : "client";
      if (code === "aborted") return;
      if (code === "too_large") smallTranscriptRef.current = true;
      if (!(err instanceof ChatRoastApiError)) console.error(err);
      setGen((g) => ({
        ...g,
        status: "error",
        error: { code, retryAfter: err instanceof ChatRoastApiError ? err.retryAfter : undefined },
      }));
    }
  }, [source, chatType, identity, language.model, personaId, intensity, groupName, extraContext, router]);

  // Abort on unmount.
  useEffect(() => () => ctrlRef.current?.abort(), []);

  // While the narrator writes: confirm before leaving (browser back / reload / close).
  const running = gen.status === "running";
  useEffect(() => {
    if (!running) return;
    const onPop = () => {
      const s = Number(new URLSearchParams(window.location.search).get("step"));
      if (window.location.pathname === "/analyze" && s !== 5) {
        window.history.pushState({ crwFrom: 4 }, "", urlFor(5, chatType));
        setConfirmLeave(true);
      }
    };
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("popstate", onPop);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [running, chatType]);

  const stopAndLeave = () => {
    ctrlRef.current?.abort();
    setConfirmLeave(false);
    setGen(IDLE);
    goBack();
  };

  /* ---------------- handlers passed to steps ---------------- */
  const onChatType = (type: ChatType) => {
    setChatType(type);
    window.history.pushState({ crwFrom: 1 }, "", urlFor(2, type));
  };

  const onLoaded = (next: ChatSource) => {
    setSource(next);
    setIdentity(EMPTY_IDENTITY);
    setGroupName(next.chat.title?.trim() ?? "");
    setGen(IDLE);
    smallTranscriptRef.current = false;
    goTo(3);
  };

  const onStart = () => {
    goTo(5);
    void startGeneration();
  };

  if (step === 5) {
    return (
      <StepGenerating
        personaId={personaId}
        gen={gen}
        onRetry={() => void startGeneration()}
        onBack={() => {
          setGen(IDLE);
          goBack();
        }}
        onCancel={() => setConfirmLeave(true)}
        confirmLeave={confirmLeave}
        onStay={() => setConfirmLeave(false)}
        onLeave={stopAndLeave}
      />
    );
  }

  return (
    <>
      <SiteHeader cta={false} />
      <main id="main" className="flex-1">
        {step === 1 && <StepChatType value={chatType} onPick={onChatType} onBack={goBack} />}
        {step === 2 && (
          <StepUpload source={source} onLoaded={onLoaded} onContinue={() => goTo(3)} onBack={goBack} />
        )}
        {step === 3 && source && chatType && (
          <StepReview
            source={source}
            chatType={chatType}
            identity={identity}
            onIdentity={setIdentity}
            groupName={groupName}
            onGroupName={setGroupName}
            onContinue={() => goTo(4)}
            onBack={goBack}
          />
        )}
        {step === 4 && (
          <StepPersonalize
            personaId={personaId}
            onPersona={setPersonaId}
            intensity={intensity}
            onIntensity={setIntensity}
            languageCode={language.code}
            onLanguage={setLangCode}
            extraContext={extraContext}
            onExtraContext={setExtraContext}
            onStart={onStart}
            onBack={goBack}
          />
        )}
      </main>
    </>
  );
}
