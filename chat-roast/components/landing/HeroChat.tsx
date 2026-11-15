"use client";

import { useEffect, useRef, useState } from "react";
import { PersonaAvatar } from "@/components/ui/PersonaAvatar";
import { usePrefersReducedMotion } from "@/components/ui/hooks";
import { IconPause, IconPlay } from "@/components/ui/icons";
import { useLocale, useLocalized, useT } from "@/lib/i18n";
import { heroChats, landingDict, type HeroChat } from "@/lib/i18n/dict/landing";
import { PERSONAS } from "@/lib/personas";
import "@/components/ui/motion.css";

/** Accent dot color per sender slot. */
const SENDER_TONES = ["bg-ember", "bg-grape", "bg-sea", "bg-sky"];
const TIMES = ["21:40", "21:41", "21:41", "21:43", "21:44", "21:46"];

type Frame = { visible: number; typing: number | "narrator" | null; ms: number };

function framesFor(chat: HeroChat, reduced: boolean): Frame[] {
  const n = chat.lines.length;
  if (reduced) return [{ visible: n + 2, typing: null, ms: 9000 }];
  const frames: Frame[] = [{ visible: 0, typing: null, ms: 500 }];
  chat.lines.forEach((line, i) => {
    const sameAsPrev = i > 0 && chat.lines[i - 1].from === line.from;
    if (line.from >= 0) frames.push({ visible: i, typing: line.from, ms: sameAsPrev ? 650 : 950 });
    frames.push({ visible: i + 1, typing: null, ms: line.from < 0 ? 700 : 380 });
  });
  frames.push({ visible: n + 1, typing: null, ms: 800 });
  frames.push({ visible: n + 1, typing: "narrator", ms: 1700 });
  frames.push({ visible: n + 2, typing: null, ms: 6500 });
  return frames;
}

export function HeroChat({ className = "" }: { className?: string }) {
  const t = useT(landingDict);
  const { locale } = useLocale();
  const localized = useLocalized();
  const chats = localized(heroChats);
  const reduced = usePrefersReducedMotion();

  const [chatIdx, setChatIdx] = useState(0);
  const [frameIdx, setFrameIdx] = useState(0);
  const [fading, setFading] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const [visibleOnScreen, setVisibleOnScreen] = useState(true);
  const rootRef = useRef<HTMLDivElement>(null);

  const chat = chats[chatIdx % chats.length];
  const frames = framesFor(chat, reduced);
  const frame = frames[Math.min(frameIdx, frames.length - 1)];
  const playing = !userPaused && visibleOnScreen;

  // Restart the script when the language flips.
  const [prevLocale, setPrevLocale] = useState(locale);
  if (prevLocale !== locale) {
    setPrevLocale(locale);
    setFrameIdx(0);
    setFading(false);
  }

  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => setVisibleOnScreen(entry.isIntersecting && !document.hidden), { threshold: 0.15 });
    io.observe(el);
    const onVis = () => setVisibleOnScreen(!document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  useEffect(() => {
    if (!playing) return;
    const last = frameIdx >= frames.length - 1;
    const timer = window.setTimeout(() => {
      if (!last) {
        setFrameIdx((i) => i + 1);
        return;
      }
      setFading(true);
      window.setTimeout(
        () => {
          setChatIdx((c) => (c + 1) % chats.length);
          setFrameIdx(0);
          setFading(false);
        },
        reduced ? 0 : 320,
      );
    }, frame.ms);
    return () => window.clearTimeout(timer);
  }, [playing, frameIdx, frames.length, frame.ms, chats.length, reduced]);

  const persona = PERSONAS[chat.persona];
  const n = chat.lines.length;
  const typingName =
    frame.typing === "narrator" ? localized(persona.name) : typeof frame.typing === "number" ? chat.people[frame.typing] : null;

  return (
    <div ref={rootRef} className={`card relative w-full overflow-hidden ${className}`} role="group" aria-label={t("hero_chat_aria")}>
      {/* header */}
      <div className="flex items-center gap-3 border-b-2 border-line bg-surface px-4 py-3">
        <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full border-2 border-line bg-sun text-lg">
          {chat.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold leading-tight">{chat.title}</p>
          <p className="truncate text-xs text-ink-2" aria-hidden>
            {typingName ? (
              <span className="font-semibold text-sea">
                {typingName} {t("hero_chat_typing")}
              </span>
            ) : (
              t("hero_chat_members", { n: chat.members })
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setUserPaused((p) => !p)}
          aria-label={userPaused ? t("hero_chat_play") : t("hero_chat_pause")}
          className="grid size-9 shrink-0 place-items-center rounded-full text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ember/40"
        >
          {userPaused ? <IconPlay size={16} /> : <IconPause size={16} />}
        </button>
      </div>

      {/* messages */}
      <div
        className="relative h-[25rem] bg-chat-bg sm:h-[27rem]"
        style={{
          backgroundImage: "radial-gradient(color-mix(in srgb, var(--ink) 9%, transparent) 1px, transparent 1.4px)",
          backgroundSize: "18px 18px",
        }}
      >
        <div
          aria-hidden
          className={`flex h-full flex-col justify-end gap-1.5 overflow-hidden px-3 pb-6 pt-3 transition-opacity duration-300 ${fading ? "opacity-0" : "opacity-100"}`}
          style={{ maskImage: "linear-gradient(to bottom, transparent 0, black 3.5rem)", WebkitMaskImage: "linear-gradient(to bottom, transparent 0, black 3.5rem)" }}
        >
          {chat.lines.slice(0, Math.min(frame.visible, n)).map((line, i) => {
            const out = line.from < 0;
            const showName = !out && chat.people.length > 1 && (i === 0 || chat.lines[i - 1].from !== line.from);
            return (
              <div key={`${chatIdx}-${i}`} className={`cr-pop-in flex ${out ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-2xl border-[1.5px] border-line px-3 py-1.5 text-[0.95rem] leading-snug text-ink ${
                    out ? "rounded-se-md bg-bubble-out" : "rounded-ss-md bg-bubble-in"
                  }`}
                >
                  {showName && (
                    <span className="mb-0.5 flex items-center gap-1.5 text-xs font-bold">
                      <span className={`size-2 rounded-full ${SENDER_TONES[line.from % SENDER_TONES.length]}`} />
                      {chat.people[line.from]}
                    </span>
                  )}
                  <span>{line.text}</span>
                  <span className="ms-2 inline-block translate-y-0.5 text-[0.65rem] text-ink-3 tabular-nums" dir="ltr">
                    {TIMES[i % TIMES.length]}
                  </span>
                </div>
              </div>
            );
          })}

          {typeof frame.typing === "number" && (
            <div className="cr-fade-in flex justify-start">
              <TypingBubble />
            </div>
          )}

          {frame.visible > n && (
            <div className="cr-pop-in my-1 flex justify-center">
              <span className="rounded-full border-[1.5px] border-line-soft bg-surface/90 px-3 py-1 text-xs font-semibold text-ink-2">
                {persona.emoji} {chat.joined}
              </span>
            </div>
          )}

          {frame.typing === "narrator" && (
            <div className="cr-fade-in flex items-end gap-2">
              <PersonaAvatar id={chat.persona} size={30} />
              <TypingBubble />
            </div>
          )}

          {frame.visible > n + 1 && (
            <div className="cr-pop-in flex items-end gap-2">
              <PersonaAvatar id={chat.persona} size={30} className="mb-1" />
              <div className="min-w-0 max-w-[88%] rounded-2xl rounded-es-md border-2 border-line bg-surface px-3.5 py-2.5 shadow-pop-sm rtl:shadow-[-2px_2px_0_0_var(--shadow)]">
                <p className="mb-1 flex items-center gap-1.5 text-xs font-black">
                  <span className="size-2 rounded-full" style={{ background: persona.color.bg }} />
                  {localized(persona.name)} <span aria-hidden>{persona.emoji}</span>
                </p>
                <p className="text-[0.95rem] font-medium leading-snug">{chat.roast}</p>
              </div>
            </div>
          )}
        </div>

        {/* Screen readers get the whole conversation at once. */}
        <div className="sr-only">
          <p>{chat.title}</p>
          <ul>
            {chat.lines.map((l, i) => (
              <li key={i}>
                {l.from >= 0 ? chat.people[l.from] : "→"}: {l.text}
              </li>
            ))}
            <li>
              {localized(persona.name)}: {chat.roast}
            </li>
          </ul>
        </div>
      </div>

      {/* progress dots for the 3 scripts */}
      <div aria-hidden className="absolute bottom-2 start-1/2 flex -translate-x-1/2 gap-1.5 rtl:translate-x-1/2">
        {chats.map((_, i) => (
          <span key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === chatIdx % chats.length ? "w-5 bg-ink" : "w-1.5 bg-ink/25"}`} />
        ))}
      </div>
    </div>
  );
}

function TypingBubble() {
  return (
    <span className="inline-flex items-center gap-1 rounded-2xl rounded-ss-md border-[1.5px] border-line bg-bubble-in px-3 py-2.5">
      <span className="cr-typing-dot size-1.5 rounded-full bg-ink-2" />
      <span className="cr-typing-dot size-1.5 rounded-full bg-ink-2" />
      <span className="cr-typing-dot size-1.5 rounded-full bg-ink-2" />
    </span>
  );
}
