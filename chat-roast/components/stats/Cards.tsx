"use client";

import { useState } from "react";
import { useT } from "@/lib/i18n";
import { statsDict } from "@/lib/i18n/dict/stats";
import type { ChatStats, Counted, Message } from "@/lib/types";
import { useReport } from "@/components/report/context";
import { ChartCard, StatTile } from "./ChartCard";
import { ChatBubble, useMessageText } from "./ChatBubble";
import { RankedBars, type RankedItem } from "./Bars";
import { fmtCompact, fmtDate, fmtDateKey, fmtDayRange, fmtDuration, fmtNum, fmtPct, fmtTime } from "./format";

/* ------------------------------------------------------------------ */
/* Rhythm tiles                                                         */
/* ------------------------------------------------------------------ */

export function RhythmTiles({ stats }: { stats: ChatStats }) {
  const t = useT(statsDict);
  const { intl } = useReport();
  const short = (key: string) => fmtDateKey(key, intl, { day: "numeric", month: "short", year: "numeric" });
  const shortTs = (ts: number) => fmtDate(ts, intl, { day: "numeric", month: "short", year: "2-digit" });
  return (
    <div>
      <h3 className="mb-3 text-lg font-black">⏱️ {t("rhythmTitle")}</h3>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile icon="💬" accent="var(--sky)" label={t("medianReply")} value={stats.medianReplyMs != null ? fmtDuration(stats.medianReplyMs, intl) : t("na")} hint={t("medianReplyHint")} />
        <StatTile icon="⚡" accent="var(--sun)" label={t("quickReplies")} value={fmtPct(stats.quickReplyRate ?? 0, intl)} />
        {stats.recordDay && (
          <StatTile
            icon="🏔️"
            accent="var(--ember)"
            label={t("recordDay")}
            value={fmtNum(stats.recordDay.count, intl)}
            hint={short(stats.recordDay.date)}
          />
        )}
        {stats.longestStreak && (
          <StatTile
            icon="🔥"
            accent="var(--ember)"
            label={t("streak")}
            value={t("streakValue", { n: stats.longestStreak.days, f: fmtNum(stats.longestStreak.days, intl) })}
            hint={fmtDayRange(stats.longestStreak.start, stats.longestStreak.end, intl)}
          />
        )}
        {stats.longestSilence && (
          <StatTile
            icon="🤐"
            accent="var(--grape)"
            label={t("silence")}
            value={fmtDuration(stats.longestSilence.ms, intl)}
            hint={t("silenceHint", { from: shortTs(stats.longestSilence.fromTs), to: shortTs(stats.longestSilence.toTs) })}
          />
        )}
        <StatTile icon="🧵" accent="var(--mint)" label={t("conversations")} value={fmtNum(stats.conversations, intl)} hint={t("conversationsHint")} />
        {stats.shabbat && stats.shabbat.weeks > 0 && (
          <StatTile
            icon="🕯️"
            accent="var(--sun)"
            label={t("shabbat")}
            value={t("shabbatValue", { silent: fmtNum(stats.shabbat.silentWeeks, intl), weeks: fmtNum(stats.shabbat.weeks, intl) })}
            hint={t("shabbatHint", { n: stats.shabbat.messages, f: fmtNum(stats.shabbat.messages, intl) })}
          />
        )}
        <StatTile icon="🔗" accent="var(--sky)" label={t("mediaLinks")} value={fmtNum(stats.links ?? 0, intl)} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Good morning / good night                                            */
/* ------------------------------------------------------------------ */

export function GreetingsCard({ stats }: { stats: ChatStats }) {
  const t = useT(statsDict);
  const { intl, nameOf, colorOf } = useReport();
  const block = (icon: string, title: string, g: { days: number; firstSayers: Counted[] } | undefined, none: string, tint: string) => {
    const sayers = (g?.firstSayers ?? []).filter(([, c]) => c > 0).slice(0, 4);
    const items: RankedItem[] = sayers.map(([id, c]) => ({ key: id, label: nameOf(id, t("unknownPerson")), value: c, color: colorOf(id), display: fmtNum(c, intl) }));
    return (
      <div className="rounded-2xl p-3.5" style={{ background: `color-mix(in oklab, ${tint} 13%, var(--surface))` }}>
        <div className="flex items-baseline justify-between gap-2">
          <h4 className="font-black">
            <span aria-hidden className="me-1.5">
              {icon}
            </span>
            {title}
          </h4>
          {g && g.days > 0 && <span className="text-sm font-bold text-ink-2">{t("greetDays", { n: g.days, f: fmtNum(g.days, intl) })}</span>}
        </div>
        {items.length ? (
          <>
            <div className="mt-2 mb-2 text-xs font-semibold text-ink-3">{t("greetFirst")}</div>
            <RankedBars items={items} size="sm" />
          </>
        ) : (
          <p className="mt-2 text-sm text-ink-2">{none}</p>
        )}
      </div>
    );
  };
  return (
    <ChartCard icon="☀️" title={t("greetTitle")}>
      <div className="grid gap-3">
        {block("☀️", t("greetMorning"), stats.goodMorning, t("greetNone"), "var(--sun)")}
        {block("🌙", t("greetNight"), stats.goodNight, t("greetNoneNight"), "var(--grape)")}
      </div>
    </ChartCard>
  );
}

/* ------------------------------------------------------------------ */
/* Words, emojis, catchphrases                                          */
/* ------------------------------------------------------------------ */

export function WordsCard({ stats }: { stats: ChatStats }) {
  const t = useT(statsDict);
  const { intl, nameOf, colorOf } = useReport();
  const words = (stats.topWords ?? []).slice(0, 18);
  const emojis = (stats.topEmojis ?? []).slice(0, 8);
  const phrases = (stats.catchphrases ?? []).slice(0, 6);
  if (!words.length && !emojis.length && !phrases.length) return null;
  const wMax = Math.max(1, ...words.map(([, c]) => c));
  const wMin = Math.min(...words.map(([, c]) => c));
  const scale = (c: number) => (wMax === wMin ? 1 : (c - wMin) / (wMax - wMin));
  const tints = ["var(--ember)", "var(--sky)", "var(--sun)", "var(--mint)", "var(--grape)", "var(--bubblegum)"];
  return (
    <ChartCard
      icon="💬"
      title={t("wordsTitle")}
      table={{ caption: t("topWords"), head: [t("topWords"), t("colCount")], rows: words.map(([w, c]) => [w, fmtNum(c, intl)]) }}
    >
      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        {words.length > 0 && (
          <div>
            <h4 className="mb-2.5 text-sm font-bold text-ink-2">{t("topWords")}</h4>
            <ul className="flex flex-wrap items-center gap-2" aria-hidden>
              {words.map(([w, c], i) => {
                const k = scale(c);
                return (
                  <li
                    key={w}
                    dir="auto"
                    title={fmtNum(c, intl)}
                    className="inline-flex items-baseline gap-1 rounded-full border-2 border-line px-3 py-1 font-black leading-none"
                    style={{
                      fontSize: `${0.85 + k * 0.85}rem`,
                      background: i < 3 ? `color-mix(in oklab, ${tints[i]} 30%, var(--surface))` : "var(--surface-2)",
                      borderColor: i < 3 ? "var(--line)" : "var(--line-soft)",
                    }}
                  >
                    {w}
                    <span className="text-[0.62rem] font-bold text-ink-3 tabular-nums">{fmtCompact(c, intl)}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        {emojis.length > 0 && (
          <div>
            <h4 className="mb-2.5 text-sm font-bold text-ink-2">{t("topEmojis")}</h4>
            <ol className="grid grid-cols-4 gap-2">
              {emojis.map(([e, c], i) => (
                <li key={e} className={`flex flex-col items-center rounded-2xl border-2 py-2 ${i === 0 ? "border-line bg-sun/30" : "border-line-soft bg-surface-2"}`}>
                  <span className={i === 0 ? "text-[2rem] leading-tight" : "text-2xl leading-tight"}>{e}</span>
                  <span className="text-xs font-bold text-ink-2 tabular-nums">{fmtCompact(c, intl)}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
      {phrases.length > 0 && (
        <div className="mt-6">
          <h4 className="mb-2.5 text-sm font-bold text-ink-2">{t("catchphrases")}</h4>
          <ul className="grid gap-2.5 sm:grid-cols-2">
            {phrases.map((p) => (
              <li key={p.phrase} className="flex items-center gap-3 rounded-2xl bg-chat-bg p-2.5">
                <span dir="auto" className="min-w-0 flex-1 rounded-xl rounded-ss-[4px] border-2 border-line bg-bubble-in px-3 py-1.5 font-bold leading-snug break-words">
                  {p.phrase}
                </span>
                <span className="shrink-0 text-end text-xs leading-tight text-ink-2">
                  <span className="block text-base font-black text-ink tabular-nums">×{fmtNum(p.count, intl)}</span>
                  <span className="inline-flex items-center gap-1">
                    <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: colorOf(p.topAuthorId) }} />
                    <bdi>{nameOf(p.topAuthorId, t("unknownPerson"))}</bdi>
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </ChartCard>
  );
}

/* ------------------------------------------------------------------ */
/* Laugh fingerprint                                                    */
/* ------------------------------------------------------------------ */

function laughGlyph(stats: ChatStats, fallback: string): string {
  const rec = stats.laugh?.record?.text?.trim();
  if (rec) {
    const first = Array.from(rec)[0];
    if (first && /[\p{L}\p{Extended_Pictographic}]/u.test(first)) {
      // Latin laughs alternate letters ("hahaha", "jaja") — keep the 2-letter unit.
      if (/[a-z]/i.test(first)) return rec.slice(0, 2).toLowerCase();
      return first;
    }
  }
  return fallback;
}

export function LaughCard({ stats }: { stats: ChatStats }) {
  const t = useT(statsDict);
  const { intl, nameOf, colorOf, members } = useReport();
  const laugh = stats.laugh;
  if (!laugh || !laugh.total) {
    return (
      <ChartCard icon="😂" title={t("laughTitle")}>
        <p className="text-ink-2">{t("laughNone")}</p>
      </ChartCard>
    );
  }
  const glyph = laughGlyph(stats, t("laughLetter"));
  const avgLen = Math.max(1, Math.round(laugh.avgLength || 0));
  const units = glyph.length > 1 ? Math.max(1, Math.round(avgLen / glyph.length)) : avgLen;
  const avgText = glyph.repeat(Math.min(units, 24));
  const laughers: RankedItem[] = members
    .filter((m) => m.stats && (m.stats.laugh?.count ?? 0) > 0)
    .sort((a, b) => (b.stats!.laugh.count ?? 0) - (a.stats!.laugh.count ?? 0))
    .slice(0, 4)
    .map((m) => ({ key: m.id, label: m.name, value: m.stats!.laugh.count, color: m.color, display: fmtNum(m.stats!.laugh.count, intl) }));
  return (
    <ChartCard icon="😂" title={t("laughTitle")}>
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="text-5xl leading-none font-black tracking-tight">{fmtNum(laugh.total, intl)}</div>
          <div className="mt-1 text-sm font-semibold text-ink-2">{t("laughTotal")}</div>
        </div>
      </div>
      <div className="mt-5 rounded-2xl border-2 border-line p-3.5" style={{ background: "color-mix(in oklab, var(--sun) 20%, var(--surface))" }}>
        <div className="flex items-baseline justify-between gap-2 text-sm">
          <span className="font-bold text-ink-2">{t("laughAvg")}</span>
          <span className="font-bold text-ink-3">{t("laughAvgHint", { len: fmtNum(laugh.avgLength || 0, intl, 1) })}</span>
        </div>
        <div dir="auto" className="mt-1 text-[2rem] leading-tight font-black tracking-wide break-all">
          {avgText}
        </div>
      </div>
      {laugh.record && laugh.record.length > 0 && (
        <div className="mt-3 rounded-2xl bg-surface-2 p-3.5">
          <div className="flex items-baseline justify-between gap-2 text-sm">
            <span className="font-bold text-ink-2">🏆 {t("laughRecord")}</span>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-ink-2">
              <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: colorOf(laugh.record.authorId) }} />
              {t("laughRecordHint", { name: nameOf(laugh.record.authorId, t("unknownPerson")), len: fmtNum(laugh.record.length, intl) })}
            </span>
          </div>
          <div dir="auto" className="mt-1.5 line-clamp-3 text-lg leading-tight font-black tracking-wider break-all text-ink-2">
            {laugh.record.text}
          </div>
        </div>
      )}
      {laughers.length > 1 && (
        <div className="mt-4">
          <RankedBars items={laughers} size="sm" />
        </div>
      )}
    </ChartCard>
  );
}

/* ------------------------------------------------------------------ */
/* Media totals                                                         */
/* ------------------------------------------------------------------ */

export function MediaCard({ stats }: { stats: ChatStats }) {
  const t = useT(statsDict);
  const { intl } = useReport();
  const m = stats.mediaTotals ?? { image: 0, video: 0, audio: 0, sticker: 0, gif: 0, document: 0, other: 0 };
  const voice = stats.perPerson?.reduce((a, p) => a + (p.voiceNotes ?? 0), 0) || m.audio;
  const tiles = [
    { icon: "🎙️", label: t("mediaVoice"), value: voice, tint: "var(--grape)" },
    { icon: "🦄", label: t("mediaStickers"), value: m.sticker, tint: "var(--bubblegum)" },
    { icon: "📷", label: t("mediaImages"), value: m.image, tint: "var(--sky)" },
    { icon: "🎬", label: t("mediaVideos"), value: m.video, tint: "var(--ember)" },
    { icon: "👾", label: t("mediaGifs"), value: m.gif, tint: "var(--mint)" },
    { icon: "🗑️", label: t("mediaDeleted"), value: stats.deleted ?? 0, tint: "var(--sun)" },
  ];
  return (
    <ChartCard icon="📎" title={t("mediaTitle")}>
      <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {tiles.map((tile) => (
          <li key={tile.label} className="rounded-2xl p-3" style={{ background: `color-mix(in oklab, ${tile.tint} 14%, var(--surface))` }}>
            <span aria-hidden className="text-2xl">
              {tile.icon}
            </span>
            <div className="mt-1 text-2xl leading-none font-black">{fmtCompact(tile.value, intl)}</div>
            <div className="mt-1 text-xs font-semibold text-ink-2">{tile.label}</div>
          </li>
        ))}
      </ul>
    </ChartCard>
  );
}

/* ------------------------------------------------------------------ */
/* Longest message                                                      */
/* ------------------------------------------------------------------ */

export function LongestMessageCard({ stats }: { stats: ChatStats }) {
  const t = useT(statsDict);
  const { intl, nameOf, colorOf, member } = useReport();
  const [open, setOpen] = useState(false);
  const lm = stats.longestMessage;
  if (!lm || !lm.text) return null;
  const long = lm.text.length > 280;
  const text = !open && long ? lm.text.slice(0, 260).trimEnd() + "…" : lm.text;
  return (
    <ChartCard icon="📜" title={t("longestTitle")} sub={t("longestMeta", { name: nameOf(lm.authorId, t("unknownPerson")), n: lm.words, f: fmtNum(lm.words, intl) })}>
      <div className="rounded-2xl bg-chat-bg p-3">
        <ChatBubble
          name={nameOf(lm.authorId, t("unknownPerson"))}
          color={colorOf(lm.authorId)}
          outgoing={!!member(lm.authorId)?.isSelf}
          time={`${fmtDate(lm.ts, intl, { day: "numeric", month: "short", year: "numeric" })} · ${fmtTime(lm.ts, intl)}`}
        >
          {text}
        </ChatBubble>
      </div>
      {long && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="mt-2 rounded-full px-2 py-1 text-sm font-bold text-ink-2 hover:text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ember/40"
        >
          {open ? t("collapse") : t("expand")}
        </button>
      )}
    </ChartCard>
  );
}

/* ------------------------------------------------------------------ */
/* How it started / where it is now                                     */
/* ------------------------------------------------------------------ */

export function FirstLastCard({ stats }: { stats: ChatStats }) {
  const t = useT(statsDict);
  const first = (stats.firstMessages ?? []).slice(0, 6);
  const last = (stats.lastMessages ?? []).slice(-6);
  if (!first.length && !last.length) return null;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {first.length > 0 && <ChatScreen title={t("startedTitle")} icon="🐣" messages={first} />}
      {last.length > 0 && <ChatScreen title={t("nowTitle")} icon="📍" messages={last} />}
    </div>
  );
}

function ChatScreen({ title, icon, messages }: { title: string; icon: string; messages: Message[] }) {
  const { intl, nameOf, colorOf, member } = useReport();
  const t = useT(statsDict);
  const msgText = useMessageText();
  const day = messages[0] ? fmtDate(messages[0].ts, intl, { day: "numeric", month: "long", year: "numeric" }) : "";
  return (
    <ChartCard icon={icon} title={title} sub={day} bodyClassName="-mx-1">
      <div className="space-y-1.5 rounded-2xl bg-chat-bg p-3">
        {messages.map((m, i) => {
          const prev = messages[i - 1];
          const sameAuthor = prev && prev.author === m.author;
          const mt = msgText(m);
          return (
            <ChatBubble
              key={m.id + "-" + i}
              name={sameAuthor ? undefined : nameOf(m.author, t("unknownPerson"))}
              color={colorOf(m.author)}
              outgoing={!!member(m.author)?.isSelf}
              tail={!sameAuthor}
              flat
              time={fmtTime(m.ts, intl)}
              className={sameAuthor ? "" : "pt-1"}
            >
              {mt.media ? <span className="italic text-ink-2">{mt.text}</span> : mt.text}
            </ChatBubble>
          );
        })}
      </div>
    </ChartCard>
  );
}
