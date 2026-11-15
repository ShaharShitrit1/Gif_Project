"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { useLocalized, useT } from "@/lib/i18n";
import { privacyFlow } from "@/lib/i18n/dict/faq";
import { wizardDict } from "@/lib/i18n/dict/wizard";

/** "What happens to your chat" — the accurate, step-by-step version. */
export function PrivacySheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT(wizardDict);
  const localized = useLocalized();
  const steps = localized(privacyFlow);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t("ps_title")}
      description={t("ps_sub")}
      icon="🔒"
      footer={
        <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/privacy"
            target="_blank"
            className="text-center text-sm font-bold underline decoration-2 underline-offset-4 hover:text-ember focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ember/40 sm:text-start"
          >
            {t("ps_link")}
          </Link>
          <Button onClick={onClose}>{t("ps_ok")}</Button>
        </div>
      }
    >
      <ol className="relative space-y-4 ps-1">
        {steps.map((s, i) => (
          <li key={i} className="relative flex gap-4">
            {i < steps.length - 1 && <span aria-hidden className="absolute start-[1.2rem] top-11 h-[calc(100%-1.75rem)] w-0.5 bg-line-soft" />}
            <span aria-hidden className="relative z-10 grid size-10 shrink-0 place-items-center rounded-2xl border-2 border-line bg-surface-2 text-xl">
              {s.icon}
            </span>
            <div className="pb-1">
              <h3 className="font-extrabold">{s.title}</h3>
              <p className="mt-0.5 text-sm leading-relaxed text-ink-2">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </Sheet>
  );
}
