"use client";

import { useMemo, useState } from "react";
import { useT } from "@/lib/i18n";
import { reportDict } from "@/lib/i18n/dict/report";
import type { MemberProfile } from "@/lib/types";
import { fmtDuration, fmtHour, fmtNum, fmtPct } from "@/components/stats/format";
import { useShare } from "@/components/share/ShareProvider";
import { memberColorVar, useReport, useReportText, type MemberInfo } from "./context";
import { Sheet } from "@/components/ui/Sheet";
import { MemberBadge, SectionHeading } from "./ui";

const COMPACT_FROM = 8;
const COMPACT_INITIAL = 8;

interface Entry {
  profile: MemberProfile;
  info: MemberInfo | undefined;
  color: string;
  name: string;
}

export function Members() {
  const t = useT(reportDict);
  const { saved, member, members } = useReport();
  const [showAll, setShowAll] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const entries = useMemo<Entry[]>(() => {
    const list = (saved.report.members ?? []).map((profile) => {
      const info = member(profile.id);
      return { profile, info, color: info?.color ?? memberColorVar(-1), name: info?.name ?? "" };
    });
    // Participant order (= message count, = color order); unknown ids go last.
    return list.sort((a, b) => (a.info?.index ?? 1e6) - (b.info?.index ?? 1e6));
  }, [saved.report.members, member]);

  const withoutProfile = members.filter((m) => m.index >= 0 && !m.profile);
  if (!entries.length) return null;
  const compact = entries.length >= COMPACT_FROM;
  const visible = compact && !showAll ? entries.slice(0, COMPACT_INITIAL) : entries;
  const open = entries.find((e) => e.profile.id === openId) ?? null;

  return (
    <section aria-labelledby="sec-members">
      <SectionHeading index="03" kicker={t("sMembersKicker")} title={t("sMembers")} id="sec-members" accent="var(--bubblegum)" sub={compact ? t("sMembersSub") : undefined} />

      {compact ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {visible.map((e) => (
            <li key={e.profile.id}>
              <CompactTile entry={e} onOpen={() => setOpenId(e.profile.id)} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="grid items-start gap-5 sm:grid-cols-2">
          {entries.map((e) => (
            <MemberCard key={e.profile.id} entry={e} />
          ))}
        </div>
      )}

      {compact && entries.length > COMPACT_INITIAL && (
        <div className="mt-5 flex justify-center">
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="rounded-full border-2 border-line bg-surface px-5 py-2 text-sm font-bold shadow-pop-sm hover:-translate-y-0.5 transition-transform rtl:shadow-[-2px_2px_0_0_var(--shadow)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ember/40"
          >
            {showAll ? t("showFewer") : t("showAll", { n: entries.length })}
          </button>
        </div>
      )}

      {withoutProfile.length > 0 && (
        <p className="mt-4 text-sm text-ink-3">{t("alsoInChat", { names: withoutProfile.map((m) => m.name).join(", ") })}</p>
      )}

      <Sheet open={!!open} onClose={() => setOpenId(null)} title={open?.name || open?.profile.nickname || ""} size="md" bodyClassName="!px-3 sm:!px-4">
        {open && <MemberCard entry={open} expandedByDefault flat />}
      </Sheet>
    </section>
  );
}

function CompactTile({ entry, onOpen }: { entry: Entry; onOpen: () => void }) {
  const text = useReportText();
  const { intl } = useReport();
  const { profile, info, color, name } = entry;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="card-flat flex h-full w-full flex-col items-start gap-2 p-3 text-start transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ember/40"
    >
      <div className="flex w-full items-center gap-2">
        <MemberBadge color={color} emoji={profile.emoji} name={name || profile.nickname} size={38} />
        <div className="min-w-0 flex-1">
          <div className="truncate font-bold leading-tight">{name || "—"}</div>
          {info?.stats && <div className="text-xs text-ink-3 tabular-nums">{fmtPct(info.stats.share, intl, info.stats.share < 0.1 ? 1 : 0)}</div>}
        </div>
      </div>
      <div {...text} className="line-clamp-2 w-full text-sm font-black leading-snug">
        {profile.nickname}
      </div>
    </button>
  );
}

export function MemberCard({ entry, expandedByDefault = false, flat = false }: { entry: Entry; expandedByDefault?: boolean; flat?: boolean }) {
  const t = useT(reportDict);
  const text = useReportText();
  const share = useShare();
  const { member } = useReport();
  const [expanded, setExpanded] = useState(expandedByDefault);
  const { profile, info, color, name } = entry;
  const closest = profile.closestTo && profile.closestTo !== profile.id ? member(profile.closestTo) : undefined;
  const rank = info && info.index >= 0 ? info.index + 1 : null;
  const panelId = `member-more-${profile.id}`;

  return (
    <article className={`${flat ? "card-flat" : "card"} overflow-hidden`} aria-label={name || profile.nickname}>
      <header className="relative border-b-2 border-line px-4 pt-4 pb-4" style={{ background: `color-mix(in oklab, ${color} 20%, var(--surface))` }}>
        <div className="flex items-start gap-3">
          <MemberBadge color={color} emoji={profile.emoji} name={name || profile.nickname} size={58} className="shadow-pop-sm rtl:shadow-[-2px_2px_0_0_var(--shadow)]" />
          <div className="min-w-0 flex-1 pt-0.5">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-bold text-ink-2">
              <bdi>{name || t("unknownMember")}</bdi>
              {info?.isSelf && <span className="rounded-full border-2 border-line bg-sun px-2 text-[0.68rem] leading-5 text-[#17120e]">{t("selfBadge")}</span>}
            </div>
            <h3 {...text} className="mt-0.5 text-[1.45rem] leading-[1.12] font-black tracking-tight text-balance">
              {profile.nickname}
            </h3>
          </div>
          {rank && <span className="shrink-0 text-sm font-black text-ink-3 tabular-nums">{t("rank", { n: rank })}</span>}
        </div>
        {profile.archetype && (
          <div {...text} className="mt-3 inline-flex rounded-full border-2 border-line bg-surface px-3 py-0.5 text-sm font-bold">
            {profile.archetype}
          </div>
        )}
      </header>

      <div className="space-y-4 p-4">
        {profile.roast && (
          <p {...text} className="text-[1.02rem] leading-[1.65] text-pretty">
            {profile.roast}
          </p>
        )}

        {profile.signatureQuote && <QuoteBubble quote={profile.signatureQuote} name={name} color={color} />}

        <div className="grid grid-cols-2 gap-2.5">
          {profile.superpower && <Trait icon="💪" label={t("superpower")} value={profile.superpower} tint="var(--mint)" />}
          {profile.redFlag && <Trait icon="🚩" label={t("redFlag")} value={profile.redFlag} tint="var(--ember)" />}
        </div>

        {info?.stats && <MiniStats info={info} color={color} expanded={expanded} />}

        {expanded && (
          <div id={panelId} className="space-y-3">
            {profile.advice && (
              <div className="rounded-2xl border-2 border-dashed border-line p-3.5" style={{ background: "color-mix(in oklab, var(--sun) 16%, var(--surface))" }}>
                <div className="text-xs font-bold uppercase tracking-[0.14em] text-ink-2">🤫 {t("advice")}</div>
                <p {...text} className="mt-1 font-semibold leading-snug text-pretty">
                  {profile.advice}
                </p>
              </div>
            )}
            {closest && (
              <div className="flex items-center gap-2.5 rounded-2xl bg-surface-2 p-3">
                <MemberBadge color={closest.color} emoji={closest.profile?.emoji} name={closest.name} size={32} />
                <div className="text-sm leading-tight">
                  <div className="text-ink-3">🫂 {t("closestTo")}</div>
                  <div className="font-bold">
                    <bdi>{closest.name}</bdi>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between gap-2 pt-1">
          {!expandedByDefault ? (
            <button
              type="button"
              aria-expanded={expanded}
              aria-controls={panelId}
              onClick={() => setExpanded((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-full px-2 py-1.5 text-sm font-bold text-ink-2 hover:text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ember/40"
            >
              <span aria-hidden className={`inline-block transition-transform ${expanded ? "rotate-180" : ""}`}>
                ▾
              </span>
              {expanded ? t("showLess") : t("showMore")}
            </button>
          ) : (
            <span />
          )}
          {info && (
            <button
              type="button"
              onClick={() => share({ kind: "member", id: profile.id })}
              className="inline-flex items-center gap-1.5 rounded-full border-2 border-line bg-surface px-3.5 py-1.5 text-sm font-bold shadow-pop-sm transition-transform hover:-translate-y-0.5 rtl:shadow-[-2px_2px_0_0_var(--shadow)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ember/40"
            >
              <span aria-hidden>📤</span>
              {t("shareCard")}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

export function QuoteBubble({ quote, name, color }: { quote: string; name: string; color: string }) {
  const t = useT(reportDict);
  return (
    <figure className="rounded-2xl bg-chat-bg p-3" aria-label={t("quoteLabel")}>
      <div className="relative max-w-[92%] rounded-2xl rounded-ss-[4px] border-2 border-line bg-bubble-in px-3.5 pt-1.5 pb-2 shadow-pop-sm rtl:shadow-[-2px_2px_0_0_var(--shadow)]">
        {name && (
          <figcaption className="flex items-center gap-1.5 text-xs font-bold text-ink-2">
            <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: color }} />
            <bdi>{name}</bdi>
          </figcaption>
        )}
        {/* verbatim chat text: its own direction, whatever the report language */}
        <blockquote dir="auto" className="mt-0.5 text-[1.02rem] font-semibold leading-snug">
          {quote}
        </blockquote>
      </div>
    </figure>
  );
}

function Trait({ icon, label, value, tint }: { icon: string; label: string; value: string; tint: string }) {
  const text = useReportText();
  return (
    <div className="rounded-2xl border-2 border-line p-3" style={{ background: `color-mix(in oklab, ${tint} 14%, var(--surface))` }}>
      <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.12em] text-ink-2">
        <span aria-hidden className="text-base">
          {icon}
        </span>
        {label}
      </div>
      <p {...text} className="mt-1 text-[0.95rem] font-bold leading-snug text-pretty">
        {value}
      </p>
    </div>
  );
}

function MiniStats({ info, color, expanded }: { info: MemberInfo; color: string; expanded: boolean }) {
  const t = useT(reportDict);
  const { intl } = useReport();
  const s = info.stats!;
  const pct = Math.max(0, Math.min(1, s.share));
  const tiles: { icon: string; label: string; value: string }[] = [
    { icon: "🕐", label: t("statPeak"), value: fmtHour(s.peakHour) },
    { icon: "😂", label: t("statLaughs"), value: fmtNum(s.laugh?.count ?? 0, intl) },
    { icon: "🌙", label: t("statNight"), value: fmtNum(s.nightMessages, intl) },
    { icon: "⏱️", label: t("statReply"), value: s.medianReplyMs != null ? fmtDuration(s.medianReplyMs, intl) : "—" },
  ];
  if (expanded) {
    tiles.push({ icon: "🎙️", label: t("statVoice"), value: fmtNum(s.voiceNotes, intl) });
    if (s.topEmojis?.[0]) tiles.push({ icon: s.topEmojis[0][0], label: t("statTopEmoji"), value: `×${fmtNum(s.topEmojis[0][1], intl)}` });
  }
  return (
    <div className="rounded-2xl border-2 border-line-soft p-3">
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <span className="text-2xl font-black">{fmtNum(s.messages, intl)}</span> <span className="text-sm font-semibold text-ink-2">{t("statMessages")}</span>
        </div>
        <div className="text-sm font-bold text-ink-2">
          {fmtPct(pct, intl, pct < 0.1 ? 1 : 0)} <span className="font-normal text-ink-3">{t("statShare")}</span>
        </div>
      </div>
      <div aria-hidden className="mt-2 h-2.5 overflow-hidden rounded-full" style={{ background: `color-mix(in oklab, ${color} 18%, var(--surface-2))` }}>
        <div className="h-full rounded-full" style={{ width: `${Math.max(2, pct * 100)}%`, background: color }} />
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-2">
        {tiles.map((tile) => (
          <div key={tile.label} className="flex items-center gap-2 rounded-xl bg-surface-2 px-2.5 py-2">
            <span aria-hidden className="text-lg">
              {tile.icon}
            </span>
            <div className="min-w-0 leading-tight">
              <dt className="truncate text-[0.7rem] font-semibold text-ink-3">{tile.label}</dt>
              <dd className="font-black tabular-nums">{tile.value}</dd>
            </div>
          </div>
        ))}
      </dl>
    </div>
  );
}
