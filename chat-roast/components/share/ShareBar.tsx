"use client";

import { useEffect, useState } from "react";
import { toast } from "@/components/ui/Toast";
import { useT } from "@/lib/i18n";
import { reportDict } from "@/lib/i18n/dict/report";
import { SectionHeading } from "@/components/report/ui";
import { useReport } from "@/components/report/context";
import { PersonaAvatar } from "@/components/ui/PersonaAvatar";
import { useShare } from "./ShareProvider";
import { useCardStrings } from "./ShareCards";
import { buildShareText } from "./shareText";
import { copyText } from "./exportCard";

/** The share section near the end of the report. */
export function ShareBar({ index = "11" }: { index?: string }) {
  const t = useT(reportDict);
  const share = useShare();
  const { saved, members } = useReport();
  const { cardLocale } = useCardStrings();
  const [canNative, setCanNative] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setCanNative(typeof navigator !== "undefined" && typeof navigator.share === "function"));
    return () => cancelAnimationFrame(id);
  }, []);

  const onCopy = async () => {
    const ok = await copyText(buildShareText(saved, cardLocale));
    toast(ok ? t("shareCopied") : t("shareFailed"), { tone: ok ? "success" : "error" });
  };
  const onNativeText = async () => {
    try {
      await navigator.share({ text: buildShareText(saved, cardLocale), title: saved.report.title });
    } catch {}
  };
  const profiled = members.filter((m) => m.profile && m.index >= 0);

  return (
    <section aria-labelledby="sec-share">
      <SectionHeading index={index} kicker={t("sShareKicker")} title={t("sShare")} sub={t("sShareSub")} id="sec-share" accent="var(--mint)" />
      <div className="card max-w-3xl overflow-hidden">
        <button
          type="button"
          onClick={() => share({ kind: "group" })}
          className="group flex w-full items-center gap-4 p-4 text-start transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-ember/40 sm:p-5"
        >
          <span aria-hidden className="relative grid h-[5.5rem] w-[4.4rem] shrink-0 place-items-center overflow-hidden rounded-xl border-2 border-line bg-paper">
            <span className="absolute -top-3 -end-3 h-10 w-10 rounded-full opacity-40" style={{ backgroundImage: "radial-gradient(var(--ember) 1.5px, transparent 2px)", backgroundSize: "5px 5px" }} />
            <PersonaAvatar id={saved.personaId} size={34} />
            <span className="absolute inset-x-2 bottom-2 h-1.5 rounded-full bg-ink" />
            <span className="absolute inset-x-2 bottom-5 h-1.5 w-2/3 rounded-full bg-ink-3" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-lg font-black">{t("shareGroupCard")}</span>
            <span dir="auto" className="mt-0.5 line-clamp-2 block text-sm text-ink-2">
              {saved.report.title}
            </span>
          </span>
          <span aria-hidden className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-line bg-ember text-lg text-ember-ink transition-transform group-hover:scale-110">
            ↗
          </span>
        </button>
        <div className="grid grid-cols-2 border-t-2 border-line">
          <button
            type="button"
            onClick={onCopy}
            className="flex items-center justify-center gap-2 px-3 py-3.5 font-bold transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-ember/40"
          >
            <span aria-hidden>📋</span>
            {t("shareCopyText")}
          </button>
          <button
            type="button"
            onClick={canNative ? onNativeText : () => share({ kind: "group" })}
            className="flex items-center justify-center gap-2 border-s-2 border-line px-3 py-3.5 font-bold transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-ember/40"
          >
            <span aria-hidden>📲</span>
            {t("shareNative")}
          </button>
        </div>
      </div>
      {profiled.length > 0 && (
        <ul className="mt-4 flex max-w-3xl flex-wrap gap-2">
          {profiled.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => share({ kind: "member", id: m.id })}
                className="inline-flex items-center gap-2 rounded-full border-2 border-line-soft bg-surface py-1 ps-1 pe-3.5 text-sm font-bold transition-all hover:-translate-y-px hover:border-line focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ember/40"
              >
                <span aria-hidden className="grid h-7 w-7 place-items-center rounded-full text-sm" style={{ background: m.color }}>
                  {m.profile?.emoji}
                </span>
                <bdi>{m.name}</bdi>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** A small floating share button that appears once the reader is past the hero. */
export function FloatingShare() {
  const t = useT(reportDict);
  const share = useShare();
  const [show, setShow] = useState(false);
  useEffect(() => {
    // Hidden on the hero, near the end, and while the Ask panel (it has its own controls) is on screen.
    const onScroll = () => {
      const y = window.scrollY;
      const nearEnd = window.innerHeight + y > document.documentElement.scrollHeight - 900;
      const ask = document.querySelector('section[aria-labelledby="sec-ask"]')?.getBoundingClientRect();
      const askVisible = !!ask && ask.top < window.innerHeight && ask.bottom > 0;
      setShow(y > 700 && !nearEnd && !askVisible);
    };
    const raf = requestAnimationFrame(onScroll);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);
  return (
    <div className={`pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-end px-4 pb-[max(1rem,env(safe-area-inset-bottom))] transition-all duration-300 ${show ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"}`}>
      <button
        type="button"
        tabIndex={show ? 0 : -1}
        aria-hidden={!show}
        onClick={() => share({ kind: "group" })}
        className="pointer-events-auto inline-flex h-12 items-center gap-2 rounded-full border-2 border-line bg-ember px-5 font-bold text-ember-ink shadow-pop transition-transform hover:-translate-y-0.5 rtl:shadow-[-4px_4px_0_0_var(--shadow)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ember/40"
        style={{ pointerEvents: show ? "auto" : "none" }}
      >
        <span aria-hidden>📤</span>
        {t("shareFloating")}
      </button>
    </div>
  );
}
