"use client";

import { CHAT_TYPES } from "@/components/ui/chatTypes";
import { IconCheck, IconChevronForward } from "@/components/ui/icons";
import { useT } from "@/lib/i18n";
import { commonDict } from "@/lib/i18n/dict/common";
import { wizardDict } from "@/lib/i18n/dict/wizard";
import type { ChatType } from "@/lib/types";
import { WizardFrame } from "./WizardFrame";

export function StepChatType({ value, onPick, onBack }: { value: ChatType | null; onPick: (t: ChatType) => void; onBack: () => void }) {
  const t = useT(wizardDict);
  const c = useT(commonDict);

  return (
    <WizardFrame step={1} title={t("s1_title")} sub={t("s1_sub")} onBack={onBack}>
      <ul className="grid gap-3 sm:grid-cols-2">
        {CHAT_TYPES.map((type, i) => {
          const selected = value === type.id;
          return (
            <li key={type.id} className="cr-slide-up" style={{ animationDelay: `${i * 40}ms` }}>
              <button
                type="button"
                onClick={() => onPick(type.id)}
                aria-current={selected || undefined}
                className={`group flex w-full items-center gap-4 rounded-3xl border-2 border-line bg-surface p-4 text-start transition-all duration-150 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ember/40 active:translate-y-0 ${
                  selected
                    ? "shadow-pop ring-4 ring-ember/30 rtl:shadow-[-4px_4px_0_0_var(--shadow)]"
                    : "shadow-pop-sm hover:shadow-pop rtl:shadow-[-2px_2px_0_0_var(--shadow)] rtl:hover:shadow-[-4px_4px_0_0_var(--shadow)]"
                }`}
              >
                <span
                  aria-hidden
                  className={`grid size-14 shrink-0 place-items-center rounded-2xl border-2 border-line text-3xl transition-transform duration-200 group-hover:-rotate-6 ${type.tone}`}
                >
                  {type.emoji}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-lg font-extrabold leading-tight">{c(`chat_type_${type.id}`)}</span>
                  <span className="mt-0.5 block text-sm leading-snug text-ink-2">{c(`chat_type_${type.id}_desc`)}</span>
                </span>
                {selected ? (
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-ember text-ember-ink" aria-label={t("s1_selected")}>
                    <IconCheck size={16} strokeWidth={3} />
                  </span>
                ) : (
                  <IconChevronForward size={20} className="shrink-0 text-ink-3 transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" />
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </WizardFrame>
  );
}
