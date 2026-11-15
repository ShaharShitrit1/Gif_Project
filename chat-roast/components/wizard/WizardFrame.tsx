"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { ProgressSteps } from "@/components/ui/ProgressSteps";
import { IconArrowBack } from "@/components/ui/icons";
import { useT } from "@/lib/i18n";
import { wizardDict } from "@/lib/i18n/dict/wizard";
import "@/components/ui/motion.css";

/**
 * Chrome shared by wizard steps 1–4: back button, "step N of 5", title,
 * content, and an optional sticky action bar at the bottom.
 */
export function WizardFrame({
  step,
  title,
  sub,
  onBack,
  children,
  footer,
  wide = false,
}: {
  step: number;
  title: ReactNode;
  sub?: ReactNode;
  onBack: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  const t = useT(wizardDict);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Move focus + scroll to the top whenever a step mounts (keyboard / screen-reader friendly).
  useEffect(() => {
    window.scrollTo({ top: 0 });
    headingRef.current?.focus({ preventScroll: true });
  }, [step]);

  const width = wide ? "max-w-4xl" : "max-w-2xl";

  return (
    <div className="flex min-h-[calc(100dvh-4rem)] flex-col">
      <div className={`mx-auto w-full ${width} flex-1 px-4 pb-10 pt-5 sm:px-6 sm:pt-8`}>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="-ms-2 inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm font-bold text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ember/40"
          >
            <IconArrowBack size={18} />
            {t("back")}
          </button>
          <ProgressSteps current={step} total={5} label={t("step_label", { n: step, total: 5 })} className="flex-1" />
        </div>

        <div key={step} className="cr-slide-up">
          <h1
            ref={headingRef}
            tabIndex={-1}
            className="mt-7 text-[2rem] font-black leading-[1.08] tracking-tight text-balance outline-none sm:mt-10 sm:text-5xl"
          >
            {title}
          </h1>
          {sub && <div className="mt-3 text-lg text-ink-2 text-pretty">{sub}</div>}
          <div className="mt-7 sm:mt-9">{children}</div>
        </div>
      </div>

      {footer && (
        <div className="sticky bottom-0 z-30 border-t-2 border-line-soft bg-paper/90 backdrop-blur-md supports-[backdrop-filter]:bg-paper/75">
          <div className={`mx-auto w-full ${width} px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:px-6`}>{footer}</div>
        </div>
      )}
    </div>
  );
}
