"use client";

import Link from "next/link";
import { CHAT_TYPES } from "@/components/ui/chatTypes";
import { IconArrowForward } from "@/components/ui/icons";
import { useT } from "@/lib/i18n";
import { commonDict } from "@/lib/i18n/dict/common";
import { landingDict } from "@/lib/i18n/dict/landing";
import { SectionHeading } from "./SectionHeading";

export function ChatTypes() {
  const t = useT(landingDict);
  const c = useT(commonDict);

  return (
    <section aria-labelledby="types-title" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
      <SectionHeading id="types-title" kicker={t("types_kicker")} title={t("types_title")} sub={t("types_sub")} />
      <ul className="mt-10 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
        {CHAT_TYPES.map((type) => (
          <li key={type.id}>
            <Link
              href={`/analyze?type=${type.id}`}
              className="group card flex h-full flex-col gap-3 p-4 transition-all duration-200 hover:-translate-y-1 hover:shadow-pop-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ember/40 sm:flex-row sm:items-center sm:gap-4 sm:p-5 rtl:hover:shadow-[-6px_6px_0_0_var(--shadow)]"
            >
              <span
                aria-hidden
                className={`grid size-12 shrink-0 place-items-center rounded-2xl border-2 border-line text-2xl transition-transform duration-200 group-hover:-rotate-6 sm:size-14 sm:text-3xl ${type.tone}`}
              >
                {type.emoji}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-lg font-extrabold leading-tight">{c(`chat_type_${type.id}`)}</span>
                <span className="mt-1 block text-sm leading-snug text-ink-2">{c(`chat_type_${type.id}_desc`)}</span>
              </span>
              <IconArrowForward
                size={20}
                className="hidden shrink-0 text-ink-3 transition-transform group-hover:translate-x-1 group-hover:text-ink sm:block rtl:group-hover:-translate-x-1"
              />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
