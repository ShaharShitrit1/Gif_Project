"use client";

import type { ReactNode } from "react";
import type { Message, MessageKind } from "@/lib/types";
import { useT } from "@/lib/i18n";
import { statsDict, type StatsDictKey } from "@/lib/i18n/dict/stats";

/** WhatsApp-like bubble (our own look): incoming = start side, outgoing (= the uploader) = end side. */
export function ChatBubble({
  name,
  color,
  time,
  outgoing = false,
  children,
  tail = true,
  flat = false,
  className = "",
}: {
  name?: string;
  color?: string;
  time?: string;
  outgoing?: boolean;
  children: ReactNode;
  tail?: boolean;
  flat?: boolean;
  className?: string;
}) {
  return (
    <div className={`flex ${outgoing ? "justify-end" : "justify-start"} ${className}`}>
      <div
        className={`relative max-w-[86%] rounded-2xl border-2 px-3 pt-1.5 pb-1.5 ${flat ? "border-line-soft" : "border-line shadow-pop-sm rtl:shadow-[-2px_2px_0_0_var(--shadow)]"} ${
          outgoing ? `bg-bubble-out ${tail ? "rounded-se-[4px]" : ""}` : `bg-bubble-in ${tail ? "rounded-ss-[4px]" : ""}`
        }`}
      >
        {name && !outgoing && (
          <div className="flex items-center gap-1.5 text-[0.72rem] font-bold text-ink-2">
            {color && <span aria-hidden className="h-2 w-2 shrink-0 rounded-full" style={{ background: color }} />}
            <bdi>{name}</bdi>
          </div>
        )}
        <div dir="auto" className="text-[0.95rem] leading-snug break-words whitespace-pre-line">
          {children}
        </div>
        {time && <div className="mt-0.5 text-end text-[0.65rem] font-semibold text-ink-3 tabular-nums">{time}</div>}
      </div>
    </div>
  );
}

/** Text for a message: its text, or a localized label for media / deleted / etc. */
export function useMessageText() {
  const t = useT(statsDict);
  return (m: Pick<Message, "text" | "kind">): { text: string; media: boolean } => {
    if (m.kind === "text") return { text: m.text, media: false };
    const key = `media_${m.kind as MessageKind}` as StatsDictKey;
    const label = t(key);
    if (m.text && m.kind !== "deleted") return { text: `${label} · ${m.text}`, media: true };
    return { text: label, media: true };
  };
}
