"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { IconCheck, IconUser } from "@/components/ui/icons";
import { intlLocale, useLocale, useT } from "@/lib/i18n";
import { wizardDict } from "@/lib/i18n/dict/wizard";
import { formatDate, formatTime } from "@/lib/time";
import type { Message, ParsedChat, Participant } from "@/lib/types";
import { cleanDisplay, initialOf } from "./names";

/** Up to `n` readable text messages spread evenly across the person's history. */
function sampleMessages(chat: ParsedChat, id: string, n = 5): Message[] {
  const pool = chat.messages.filter((m) => m.author === id && m.kind === "text" && m.text.trim().length >= 4 && m.text.length <= 220);
  const preferred = pool.filter((m) => m.text.trim().split(/\s+/).length >= 3);
  const list = preferred.length >= n ? preferred : pool;
  if (list.length <= n) return list;
  return Array.from({ length: n }, (_, i) => list[Math.floor(((i + 0.5) * list.length) / n)]);
}

export function WhoIsThisSheet({
  person,
  chat,
  tone,
  nameValue,
  onName,
  onCommitName,
  isSelf,
  onToggleSelf,
  onClose,
}: {
  person: Participant | null;
  chat: ParsedChat;
  tone: string;
  nameValue: string;
  onName: (v: string) => void;
  onCommitName: () => void;
  isSelf: boolean;
  onToggleSelf: () => void;
  onClose: () => void;
}) {
  const t = useT(wizardDict);
  const { locale } = useLocale();
  const il = intlLocale(locale);
  const nf = new Intl.NumberFormat(il);
  // Keep showing the last person while the sheet animates closed.
  const [last, setLast] = useState(person);
  if (person && person !== last) setLast(person);
  const shown = person ?? last;
  const samples = shown ? sampleMessages(chat, shown.id) : [];
  const display = shown ? (person ? nameValue.trim() : "") || cleanDisplay(shown.displayName) : "";

  return (
    <Sheet
      open={Boolean(person)}
      onClose={() => {
        onCommitName();
        onClose();
      }}
      title={
        <span className="flex items-center gap-3">
          <span aria-hidden className={`grid size-11 shrink-0 place-items-center rounded-full border-2 border-line text-lg font-black text-[#17120e] ${tone}`}>
            {initialOf(display)}
          </span>
          <span dir="auto" className="min-w-0 truncate">
            {display}
          </span>
        </span>
      }
      description={t("s3_who_sub")}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button variant={isSelf ? "dark" : "secondary"} size="sm" onClick={onToggleSelf} aria-pressed={isSelf}>
            {isSelf ? <IconCheck size={16} strokeWidth={3} /> : <IconUser size={16} />}
            {isSelf ? t("s3_who_me_on") : t("s3_who_me")}
          </Button>
          <Button
            size="sm"
            onClick={() => {
              onCommitName();
              onClose();
            }}
          >
            {t("s3_who_done")}
          </Button>
        </div>
      }
    >
      {shown && (
        <div className="space-y-5">
          <div>
            <label htmlFor="who-name" className="text-sm font-extrabold">
              {t("s3_who_name")}
            </label>
            <input
              id="who-name"
              type="text"
              value={nameValue}
              maxLength={40}
              dir="auto"
              onChange={(e) => onName(e.target.value)}
              onBlur={onCommitName}
              className="mt-1.5 h-12 w-full rounded-2xl border-2 border-line bg-surface px-4 text-base font-bold text-ink focus:border-ember focus:outline-none focus-visible:ring-4 focus-visible:ring-ember/30"
            />
            <p className="mt-2 text-xs text-ink-3">
              {t("s3_who_aka")}:{" "}
              {shown.originalNames.map((n, i) => (
                <span key={i} dir="auto" className="me-1 inline-block rounded-full bg-surface-2 px-2 py-0.5 font-semibold text-ink-2">
                  {cleanDisplay(n)}
                </span>
              ))}
            </p>
            <p className="mt-1 text-xs text-ink-3">
              {t("s3_messages", { n: nf.format(shown.messageCount) })} ·{" "}
              {t("s3_who_span", {
                first: formatDate(shown.firstTs, il, { month: "short", year: "numeric" }),
                last: formatDate(shown.lastTs, il, { month: "short", year: "numeric" }),
              })}
            </p>
          </div>

          <div className="rounded-3xl bg-chat-bg p-3">
            {samples.length === 0 ? (
              <p className="p-4 text-center text-sm text-ink-2">{t("s3_who_empty")}</p>
            ) : (
              <ul className="space-y-2">
                {samples.map((m) => (
                  <li key={m.id} className="max-w-[92%] rounded-2xl rounded-ss-md border-[1.5px] border-line bg-bubble-in px-3 py-2">
                    <p dir="auto" className="whitespace-pre-line break-words text-[0.95rem] leading-snug">
                      {m.text}
                    </p>
                    <p className="mt-1 text-end text-[0.65rem] text-ink-3 tabular-nums">
                      {formatDate(m.ts, il, { day: "numeric", month: "short", year: "2-digit" })} · {formatTime(m.ts, il)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </Sheet>
  );
}
