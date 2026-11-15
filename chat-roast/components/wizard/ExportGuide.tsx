"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/Segmented";
import { Sheet } from "@/components/ui/Sheet";
import { usePrefersReducedMotion } from "@/components/ui/hooks";
import { IconChevronBack, IconChevronForward, IconInfo, IconPause, IconPlay } from "@/components/ui/icons";
import { useT } from "@/lib/i18n";
import { wizardDict } from "@/lib/i18n/dict/wizard";
import { PhoneMock, type GuideKind, type GuidePlatform, type ScreenId } from "./PhoneMock";

export type { GuidePlatform } from "./PhoneMock";

const STEP_MS = 3800;

type K = Parameters<ReturnType<typeof useT<typeof wizardDict.he>>>[0];
interface GuideStep {
  title: K;
  note?: K;
  screen: ScreenId;
}

function stepsFor(platform: GuidePlatform, kind: GuideKind): GuideStep[] {
  const g = kind === "group";
  if (platform === "ios") {
    return [
      { title: g ? "eg_ios_1_g" : "eg_ios_1_d", screen: "list" },
      { title: g ? "eg_ios_2_g" : "eg_ios_2_d", screen: "chat" },
      { title: "eg_ios_3", screen: "info-scroll" },
      { title: "eg_ios_4", screen: "info-bottom" },
      { title: "eg_ios_5", note: "eg_ios_5_note", screen: "ios-media" },
      { title: "eg_ios_6", note: "eg_ios_6_note", screen: "ios-share" },
      { title: "eg_7", note: "eg_7_note", screen: "pick" },
    ];
  }
  return [
    { title: g ? "eg_and_1_g" : "eg_and_1_d", screen: "list" },
    { title: "eg_and_2", screen: "chat" },
    { title: "eg_and_3", screen: "and-menu" },
    { title: "eg_and_4", screen: "and-more" },
    { title: "eg_and_5", note: "eg_ios_5_note", screen: "and-media" },
    { title: "eg_and_6", screen: "and-share" },
    { title: "eg_7", note: "eg_7_note", screen: "pick" },
  ];
}

/**
 * Illustrated, auto-advancing "how to export from WhatsApp" guide:
 * iPhone / Android × group / 1:1, with a phone mock highlighting what to tap.
 */
export function ExportGuide({
  open,
  platform: initialPlatform,
  onClose,
  onDone,
}: {
  open: boolean;
  platform: GuidePlatform;
  onClose: () => void;
  onDone: () => void;
}) {
  const t = useT(wizardDict);
  const reduced = usePrefersReducedMotion();
  const [platform, setPlatform] = useState<GuidePlatform>(initialPlatform);
  const [kind, setKind] = useState<GuideKind>("group");
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [hovering, setHovering] = useState(false);

  // Reset whenever the sheet (re)opens.
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setPlatform(initialPlatform);
      setIdx(0);
      setPlaying(!reduced);
    }
  }

  const steps = stepsFor(platform, kind);
  const step = steps[Math.min(idx, steps.length - 1)];
  const autoplay = open && playing && !hovering;

  useEffect(() => {
    if (!autoplay) return;
    const timer = window.setTimeout(() => setIdx((i) => (i + 1) % steps.length), idx === steps.length - 1 ? STEP_MS * 1.6 : STEP_MS);
    return () => window.clearTimeout(timer);
  }, [autoplay, idx, steps.length]);

  const go = (n: number) => {
    setIdx((n + steps.length) % steps.length);
    setPlaying(false);
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t("eg_title")}
      description={t("eg_sub")}
      icon="📲"
      size="xl"
      footer={
        <Button size="lg" className="w-full sm:ms-auto sm:flex sm:w-auto" onClick={onDone}>
          {t("eg_done")}
        </Button>
      }
    >
      <div className="grid gap-2 sm:grid-cols-2">
        <Segmented
          ariaLabel={t("eg_platform")}
          value={platform}
          onChange={(v) => {
            setPlatform(v);
            setIdx(0);
          }}
          options={[
            { value: "ios", label: <>📱 {t("eg_iphone")}</> },
            { value: "android", label: <>🤖 {t("eg_android")}</> },
          ]}
        />
        <Segmented
          ariaLabel={t("eg_kind")}
          value={kind}
          onChange={(v) => {
            setKind(v);
            setIdx(0);
          }}
          options={[
            { value: "group", label: <>👥 {t("eg_group")}</> },
            { value: "direct", label: <>💬 {t("eg_direct")}</> },
          ]}
        />
      </div>

      <div
        className="mt-6 grid items-start gap-6 md:grid-cols-[auto_1fr] md:gap-10"
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      >
        <div className="flex flex-col items-center gap-4">
          {/* Mobile: the current step, above the phone */}
          <div className="min-h-[5.5rem] w-full text-center md:hidden" aria-live="polite">
            <p className="text-xs font-bold text-ink-3">{t("eg_step", { n: idx + 1, total: steps.length })}</p>
            <p className="mt-1 text-lg font-extrabold leading-snug">{t(step.title)}</p>
            {step.note && <p className="mt-1 text-sm text-ink-2">{t(step.note)}</p>}
          </div>
          <div className="relative rounded-[2.75rem] bg-chat-bg p-3 sm:p-4">
            <PhoneMock platform={platform} kind={kind} screen={step.screen} />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => go(idx - 1)}
              aria-label={t("eg_prev")}
              className="grid size-10 place-items-center rounded-full border-2 border-line bg-surface transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ember/40"
            >
              <IconChevronBack size={18} />
            </button>
            <button
              type="button"
              onClick={() => setPlaying((p) => !p)}
              aria-label={playing ? t("eg_pause") : t("eg_play")}
              aria-pressed={playing}
              className="grid size-10 place-items-center rounded-full border-2 border-line bg-ink text-paper transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ember/40"
            >
              {playing ? <IconPause size={16} /> : <IconPlay size={16} />}
            </button>
            <button
              type="button"
              onClick={() => go(idx + 1)}
              aria-label={t("eg_next")}
              className="grid size-10 place-items-center rounded-full border-2 border-line bg-surface transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ember/40"
            >
              <IconChevronForward size={18} />
            </button>
          </div>
          <div className="flex justify-center gap-1.5 md:hidden">
            {steps.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => go(i)}
                aria-label={t("eg_goto", { n: i + 1 })}
                aria-current={i === idx ? "step" : undefined}
                className={`h-2 rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ember/40 ${i === idx ? "w-6 bg-ember" : "w-2 bg-line-soft hover:bg-ink-3"}`}
              />
            ))}
          </div>
        </div>

        <div>
          {/* Desktop: the whole list, current step highlighted */}
          <ol className="hidden space-y-1.5 md:block">
            {steps.map((s, i) => {
              const active = i === idx;
              return (
                <li key={`${platform}-${kind}-${i}`}>
                  <button
                    type="button"
                    onClick={() => go(i)}
                    aria-current={active ? "step" : undefined}
                    className={`flex w-full items-start gap-3 rounded-2xl border-2 p-3 text-start transition-all duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ember/40 ${
                      active
                        ? "border-line bg-surface shadow-pop-sm rtl:shadow-[-2px_2px_0_0_var(--shadow)]"
                        : "border-transparent hover:bg-surface-2"
                    }`}
                  >
                    <span
                      className={`grid size-7 shrink-0 place-items-center rounded-full border-2 text-sm font-black transition-colors ${
                        active
                          ? "border-line bg-ember text-ember-ink"
                          : i < idx
                            ? "border-line bg-ink text-paper"
                            : "border-line-soft bg-surface text-ink-2"
                      }`}
                    >
                      {i + 1}
                    </span>
                    <span className="min-w-0 pt-0.5">
                      <span className={`block font-bold leading-snug ${active ? "text-ink" : "text-ink-2"}`}>{t(s.title)}</span>
                      {s.note && active && <span className="mt-0.5 block text-sm text-ink-2">{t(s.note)}</span>}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
          <div className="mt-2 flex gap-3 md:mt-6 rounded-2xl border-2 border-line-soft bg-surface-2 p-4">
            <IconInfo size={20} className="mt-0.5 text-sky" />
            <div>
              <p className="font-extrabold">{t("eg_desktop_title")}</p>
              <p className="mt-0.5 text-sm leading-relaxed text-ink-2">{t("eg_desktop_body")}</p>
            </div>
          </div>
        </div>
      </div>
    </Sheet>
  );
}
