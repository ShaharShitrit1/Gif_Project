import type { ChatStats, PersonStats } from "@/lib/types";
import { formatDate, DAY } from "@/lib/time";
import type { wizardDict } from "@/lib/i18n/dict/wizard";
import type { useT } from "@/lib/i18n";

type T = ReturnType<typeof useT<typeof wizardDict.he>>;

export interface Teaser {
  key: string;
  emoji: string;
  text: string;
}

function top(list: PersonStats[], pick: (p: PersonStats) => number): PersonStats | null {
  let best: PersonStats | null = null;
  for (const p of list) if (!best || pick(p) > pick(best)) best = p;
  return best && pick(best) > 0 ? best : null;
}

/**
 * Real, chat-specific teasers for the loading screen, juiciest first.
 * Only includes facts that clear a minimum so nothing reads as a dud.
 */
export function buildTeasers(stats: ChatStats, t: T, locale: string): Teaser[] {
  const nf = new Intl.NumberFormat(locale);
  const n = (v: number) => nf.format(v);
  // Names are bidi-isolated so a Hebrew name inside an English sentence (or vice versa) stays put.
  const iso = (s: string) => `\u2068${s}\u2069`;
  const nameOf = (id: string) => iso(stats.perPerson.find((p) => p.id === id)?.name ?? "");
  const people = stats.perPerson.map((p) => ({ ...p, name: iso(p.name) }));
  const out: Teaser[] = [];
  const add = (key: string, emoji: string, text: string) => out.push({ key, emoji, text });

  const laugher = top(people, (p) => p.laugh.count);
  if (laugher && laugher.laugh.count >= 5) add("laughs", "😂", t("t_laughs", { name: laugher.name, n: n(laugher.laugh.count) }));

  if (stats.recordDay && stats.recordDay.count >= 10) {
    const [y, m, d] = stats.recordDay.date.split("-").map(Number);
    const date = formatDate(Date.UTC(y, m - 1, d), locale, { day: "numeric", month: "long", year: "numeric" });
    add("record", "📈", t("t_record_day", { date, n: n(stats.recordDay.count) }));
  }

  const owl = top(people, (p) => p.nightMessages);
  if (owl && owl.nightMessages >= 3) add("night", "🦉", t("t_night", { name: owl.name, n: n(owl.nightMessages) }));

  const starter = top(people, (p) => p.conversationStarts);
  if (starter && starter.conversationStarts >= 3) add("starter", "🎬", t("t_starter", { name: starter.name, n: n(starter.conversationStarts) }));

  if (people.length >= 3 && people[0] && people[0].share >= 0.3) {
    add("share", "🗣️", t("t_share", { name: people[0].name, pct: n(Math.round(people[0].share * 100)) }));
  }

  const emoji = stats.topEmojis[0];
  if (emoji && emoji[1] >= 5) add("emoji", emoji[0], t("t_emoji", { emoji: emoji[0], n: n(emoji[1]) }));

  const podcaster = top(people, (p) => p.voiceNotes);
  if (podcaster && podcaster.voiceNotes >= 5) add("voice", "🎙️", t("t_voice", { name: podcaster.name, n: n(podcaster.voiceNotes) }));

  const gm = stats.goodMorning.firstSayers[0];
  if (gm && gm[1] >= 3) add("morning", "☀️", t("t_morning", { name: nameOf(gm[0]), n: n(gm[1]) }));

  const mono = top(people, (p) => p.longestMonologue);
  if (mono && mono.longestMonologue >= 8) add("monologue", "🎤", t("t_monologue", { name: mono.name, n: n(mono.longestMonologue) }));

  if (stats.longestSilence && stats.longestSilence.ms >= 3 * DAY) {
    add("silence", "🤐", t("t_silence", { n: n(Math.floor(stats.longestSilence.ms / DAY)) }));
  }

  if (stats.quickReplyRate >= 0.2) add("quick", "⚡", t("t_quick", { pct: n(Math.round(stats.quickReplyRate * 100)) }));

  const deleter = top(people, (p) => p.deleted);
  if (deleter && deleter.deleted >= 3) add("deleted", "🫣", t("t_deleted", { name: deleter.name, n: n(deleter.deleted) }));

  if (stats.shabbat.weeks >= 4 && stats.shabbat.silentWeeks >= 2) {
    add("shabbat", "🕯️", t("t_shabbat", { n: n(stats.shabbat.silentWeeks), total: n(stats.shabbat.weeks) }));
  }

  if (stats.longestStreak && stats.longestStreak.days >= 5) add("streak", "🔥", t("t_streak", { n: n(stats.longestStreak.days) }));

  if (stats.laugh.record && stats.laugh.record.length >= 8) {
    add("laughRecord", "🤣", t("t_laugh_record", { name: nameOf(stats.laugh.record.authorId), n: n(stats.laugh.record.length) }));
  }

  add("total", "💬", t("t_total", { n: n(stats.totalMessages), days: n(Math.max(1, stats.daysSpan)) }));
  return out;
}
