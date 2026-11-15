"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { PersonaAvatar } from "@/components/ui/PersonaAvatar";
import { Spinner } from "@/components/ui/Spinner";
import { useLocalized, useT } from "@/lib/i18n";
import { reportDict } from "@/lib/i18n/dict/report";
import { PERSONAS } from "@/lib/personas";
import { streamAsk } from "@/lib/ai/client";
import { saveReport } from "@/lib/storage/reports";
import type { AskRequest, SavedReport } from "@/lib/types";
import { Markdown } from "./Markdown";
import { useReport, useReportText } from "./context";
import { SectionHeading } from "./ui";

type Turn = SavedReport["qa"][number];
const MAX_Q = 300;
const HISTORY_TURNS = 12;

interface Pending {
  question: string;
  focusId?: string;
  answer: string;
  error: boolean;
}

export function AskPanel({ index = "10" }: { index?: string }) {
  const t = useT(reportDict);
  const loc = useLocalized();
  const text = useReportText();
  const { saved, personaName, personaFem, members } = useReport();
  const persona = PERSONAS[saved.personaId] ?? PERSONAS.max;
  const [qa, setQa] = useState<Turn[]>(() => saved.qa ?? []);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState<Pending | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const savedRef = useRef(saved);
  useEffect(() => {
    savedRef.current = saved;
  }, [saved]);
  useEffect(() => () => abortRef.current?.abort(), []);

  const streaming = !!pending && !pending.error;
  const asked = new Set(qa.filter((q) => q.role === "user").map((q) => q.content.trim()));
  const followUps = (saved.report.followUps ?? []).filter((f) => f && !asked.has(f.trim())).slice(0, 4);
  const deepDive = members.filter((m) => m.index >= 0).slice(0, 12);

  // Keep the newest message in view inside the chat box (not the page).
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [qa.length, pending?.answer, pending?.error]);

  const ask = async (question: string, focusId?: string, base: Turn[] = qa) => {
    const q = question.trim().slice(0, MAX_Q);
    if (!q || streaming) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setPending({ question: q, focusId, answer: "", error: false });
    setInput("");
    const s = savedRef.current;
    const req: AskRequest = {
      personaId: s.personaId,
      language: s.language,
      intensity: s.intensity,
      report: s.report,
      participants: s.participants.map((p) => ({ id: p.id, name: p.displayName, messages: p.messageCount })),
      transcript: s.transcript,
      statsDigest: s.statsDigest,
      history: base.slice(-HISTORY_TURNS),
      question: q,
      ...(focusId ? { focusParticipantId: focusId } : {}),
    };
    try {
      const { text: answer } = await streamAsk(req, (delta) => setPending((p) => (p ? { ...p, answer: p.answer + delta } : p)), ctrl.signal);
      const next: Turn[] = [...base, { role: "user", content: q }, { role: "assistant", content: answer.trim() }];
      setQa(next);
      setPending(null);
      if (!s.demo) {
        const updated = { ...s, qa: next };
        savedRef.current = updated;
        saveReport(updated).catch(() => {});
      }
    } catch (err) {
      if ((err as { code?: string })?.code === "aborted") {
        setPending(null);
        return;
      }
      setPending((p) => (p ? { ...p, error: true } : p));
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    ask(input);
  };

  return (
    <section aria-labelledby="sec-ask">
      <SectionHeading index={index} kicker={t("sAskKicker")} title={t("sAsk", { name: personaName })} id="sec-ask" accent="var(--grape)" />
      <div className="card max-w-3xl overflow-hidden">
        {/* chat header */}
        <div className="flex items-center gap-3 border-b-2 border-line bg-surface px-4 py-3">
          <span className="relative">
            <PersonaAvatar id={persona.id} size={44} />
            <span aria-hidden className="absolute -bottom-0.5 -end-0.5 h-3.5 w-3.5 rounded-full border-2 border-surface bg-mint" />
          </span>
          <div className="min-w-0 leading-tight">
            <div className="font-black">{personaName}</div>
            <div className="truncate text-sm text-ink-2">{streaming ? t("askThinking", { name: personaName, fem: personaFem }) : loc(persona.role)}</div>
          </div>
        </div>

        {/* messages */}
        <div ref={scrollRef} className="max-h-[32rem] min-h-[8rem] space-y-2.5 overflow-y-auto overscroll-contain bg-chat-bg p-3 sm:p-4" aria-live="polite" aria-busy={streaming}>
          <Bubble from="bot">
            <p>{t("askIntro", { name: personaName, fem: personaFem })}</p>
          </Bubble>
          {qa.map((turn, i) =>
            turn.role === "user" ? (
              <Bubble key={i} from="user">
                <p dir="auto">{turn.content}</p>
              </Bubble>
            ) : (
              <Bubble key={i} from="bot">
                <div {...text}>
                  <Markdown text={turn.content} />
                </div>
              </Bubble>
            ),
          )}
          {pending && (
            <>
              <Bubble from="user">
                <p dir="auto">{pending.question}</p>
              </Bubble>
              {pending.error ? (
                <div role="alert" className="flex flex-wrap items-center gap-3 rounded-2xl border-2 border-dashed border-ember bg-surface px-4 py-3 text-sm font-semibold">
                  <span>⚠️ {t("askError")}</span>
                  <button
                    type="button"
                    onClick={() => ask(pending.question, pending.focusId)}
                    className="rounded-full border-2 border-line bg-surface-2 px-3 py-1 font-bold hover:bg-surface focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ember/40"
                  >
                    {t("askRetry")}
                  </button>
                </div>
              ) : (
                <Bubble from="bot">
                  {pending.answer ? (
                    <div {...text}>
                      <Markdown text={pending.answer} />
                    </div>
                  ) : (
                    <TypingDots label={t("askThinking", { name: personaName, fem: personaFem })} />
                  )}
                </Bubble>
              )}
            </>
          )}
        </div>

        {/* suggestions */}
        {(followUps.length > 0 || deepDive.length > 0) && (
          <div className="space-y-3 border-t-2 border-line bg-surface px-3 py-3 sm:px-4">
            {followUps.length > 0 && (
              <div>
                <div className="mb-1.5 text-xs font-bold uppercase tracking-[0.12em] text-ink-3">{t("askSuggestions")}</div>
                <div className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
                  {followUps.map((f) => (
                    <button
                      key={f}
                      type="button"
                      disabled={streaming}
                      onClick={() => ask(f)}
                      dir="auto"
                      className="shrink-0 rounded-full border-2 border-line bg-surface-2 px-3.5 py-1.5 text-sm font-semibold transition-all hover:-translate-y-px hover:bg-sun/40 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ember/40"
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {deepDive.length > 0 && (
              <div>
                <div className="mb-1.5 text-xs font-bold uppercase tracking-[0.12em] text-ink-3">🔎 {t("askDeepDive")}</div>
                <div className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
                  {deepDive.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      disabled={streaming}
                      onClick={() => ask(t("askDeepDiveQuestion", { name: m.name }), m.id)}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-full border-2 border-line-soft bg-surface py-1 ps-1 pe-3 text-sm font-semibold transition-all hover:-translate-y-px hover:border-line disabled:opacity-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ember/40"
                    >
                      <span aria-hidden className="grid h-6 w-6 place-items-center rounded-full text-xs" style={{ background: m.color }}>
                        {m.profile?.emoji ?? ""}
                      </span>
                      <bdi>{m.name}</bdi>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* composer */}
        <form onSubmit={onSubmit} className="flex items-end gap-2 border-t-2 border-line bg-surface p-3">
          <label htmlFor="ask-input" className="sr-only">
            {t("askPlaceholder")}
          </label>
          <textarea
            id="ask-input"
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value.slice(0, MAX_Q))}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                ask(input);
              }
            }}
            rows={1}
            maxLength={MAX_Q}
            dir="auto"
            placeholder={t("askPlaceholder")}
            aria-describedby="ask-limit"
            className="max-h-32 min-h-12 flex-1 resize-none rounded-2xl border-2 border-line bg-paper px-4 py-2.5 text-base leading-snug placeholder:text-ink-3 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ember/40 [field-sizing:content]"
          />
          <span id="ask-limit" className="sr-only">
            {t("askLimit")}
          </span>
          {streaming ? (
            <button
              type="button"
              onClick={() => abortRef.current?.abort()}
              aria-label={t("askStop")}
              className="grid h-12 w-12 shrink-0 place-items-center rounded-full border-2 border-line bg-surface-2 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ember/40"
            >
              <Spinner size={20} />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              aria-label={t("askSend")}
              className="grid h-12 w-12 shrink-0 place-items-center rounded-full border-2 border-line bg-ember text-xl font-black text-ember-ink shadow-pop-sm transition-transform hover:-translate-y-0.5 disabled:opacity-40 rtl:shadow-[-2px_2px_0_0_var(--shadow)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ember/40"
            >
              <span aria-hidden className="rtl:-scale-x-100">
                ➤
              </span>
            </button>
          )}
        </form>
      </div>
    </section>
  );
}

function Bubble({ from, children }: { from: "bot" | "user"; children: React.ReactNode }) {
  const user = from === "user";
  return (
    <div className={`flex ${user ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[88%] rounded-2xl border-2 border-line px-3.5 py-2 text-[0.98rem] leading-relaxed shadow-pop-sm rtl:shadow-[-2px_2px_0_0_var(--shadow)] ${
          user ? "rounded-se-[4px] bg-bubble-out font-semibold" : "rounded-ss-[4px] bg-bubble-in"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

function TypingDots({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 py-1.5" role="status" aria-label={label}>
      {[0, 1, 2].map((i) => (
        <span key={i} className="h-2 w-2 rounded-full bg-ink-3 motion-safe:animate-bounce" style={{ animationDelay: `${i * 140}ms` }} />
      ))}
    </span>
  );
}
