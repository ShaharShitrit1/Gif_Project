"use client";

import type { FaqItem } from "@/lib/i18n/dict/faq";
import { IconPlus } from "@/components/ui/icons";

/** FAQ list built on <details>, so it works without JS and with find-in-page. */
export function FaqAccordion({ items, defaultOpenId, className = "" }: { items: FaqItem[]; defaultOpenId?: string; className?: string }) {
  return (
    <div className={`space-y-3 ${className}`}>
      {items.map((item) => (
        <details
          key={item.id}
          id={`q-${item.id}`}
          open={item.id === defaultOpenId}
          className="group card-flat scroll-mt-24 overflow-hidden transition-shadow open:shadow-pop-sm rtl:open:shadow-[-2px_2px_0_0_var(--shadow)]"
        >
          <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-4 text-start text-lg font-extrabold leading-snug focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-ember/40 [&::-webkit-details-marker]:hidden">
            <span className="flex-1">{item.q}</span>
            <span
              aria-hidden
              className="grid size-8 shrink-0 place-items-center rounded-full border-2 border-line bg-surface-2 transition-transform duration-200 group-open:rotate-45 group-open:bg-sun group-open:text-[#17120e]"
            >
              <IconPlus size={16} strokeWidth={3} />
            </span>
          </summary>
          <div className="space-y-3 px-5 pb-5 leading-relaxed text-ink-2">
            {item.a.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
            {item.steps && (
              <div className="grid gap-3 pt-1 sm:grid-cols-2">
                {item.steps.map((group) => (
                  <div key={group.title} className="rounded-2xl border-2 border-line-soft bg-surface-2 p-4">
                    <p className="mb-2 font-extrabold text-ink">{group.title}</p>
                    <ol className="space-y-1.5 text-sm">
                      {group.items.map((s, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="grid size-5 shrink-0 place-items-center rounded-full bg-ink text-[0.65rem] font-black text-paper">
                            {i + 1}
                          </span>
                          <span>{s}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                ))}
              </div>
            )}
          </div>
        </details>
      ))}
    </div>
  );
}
