"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { ChipButton } from "@/components/ui/Chip";
import { toast } from "@/components/ui/Toast";
import { IconArrowForward, IconCheck, IconEye, IconMerge, IconPencil, IconSplit } from "@/components/ui/icons";
import { intlLocale, useLocale, useT } from "@/lib/i18n";
import { commonDict } from "@/lib/i18n/dict/common";
import { wizardDict } from "@/lib/i18n/dict/wizard";
import { applyIdentity, type Identity } from "@/lib/parser";
import { formatDate } from "@/lib/time";
import type { ChatType, Participant } from "@/lib/types";
import { cleanDisplay, initialOf, isEmojiOnlyName, isPhoneName, resolveMerge } from "./names";
import type { ChatSource } from "./Wizard";
import { WhoIsThisSheet } from "./WhoIsThisSheet";
import { WizardFrame } from "./WizardFrame";

const TONES = ["bg-sun", "bg-bubblegum", "bg-sky", "bg-mint", "bg-grape", "bg-ember", "bg-sea"];
const COLLAPSED = 10;
const MAX_NAME = 40;

export function StepReview({
  source,
  chatType,
  identity,
  onIdentity,
  groupName,
  onGroupName,
  onContinue,
  onBack,
}: {
  source: ChatSource;
  chatType: ChatType;
  identity: Identity;
  onIdentity: (i: Identity) => void;
  groupName: string;
  onGroupName: (v: string) => void;
  onContinue: () => void;
  onBack: () => void;
}) {
  const t = useT(wizardDict);
  const c = useT(commonDict);
  const { locale } = useLocale();
  const nf = new Intl.NumberFormat(intlLocale(locale));
  const il = intlLocale(locale);

  // Merges only — names are overlaid at render time so typing stays instant on huge chats.
  const merged = useMemo(() => applyIdentity(source.chat, { merges: identity.merges, names: {} }), [source.chat, identity.merges]);
  const people = merged.participants;
  const toneOf = useMemo(() => {
    const m = new Map<string, string>();
    source.chat.participants.forEach((p, i) => m.set(p.id, TONES[i % TONES.length]));
    return m;
  }, [source.chat.participants]);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState(false);
  const [whoId, setWhoId] = useState<string | null>(null);

  const nameOf = (p: Participant) => (identity.names[p.id] ?? "").trim() || cleanDisplay(p.displayName);
  const total = merged.messages.length;
  const span =
    merged.messages.length > 0
      ? `${formatDate(merged.messages[0].ts, il, { month: "short", year: "numeric" })} – ${formatDate(merged.messages[merged.messages.length - 1].ts, il, { month: "short", year: "numeric" })}`
      : "";

  const visible = expanded ? people : people.slice(0, COLLAPSED);
  const selectedIds = [...selected].filter((id) => people.some((p) => p.id === id));
  const remainingAfterMerge = people.length - Math.max(0, selectedIds.length - 1);
  const canMerge = selectedIds.length >= 2 && remainingAfterMerge >= 2;

  /* ---------------- identity edits ---------------- */
  const setName = (id: string, value: string) => onIdentity({ ...identity, names: { ...identity.names, [id]: value.slice(0, MAX_NAME) } });

  const commitName = (id: string) => {
    const v = (identity.names[id] ?? "").replace(/\s+/g, " ").trim();
    const names = { ...identity.names };
    const original = people.find((p) => p.id === id)?.displayName ?? "";
    if (!v || v === cleanDisplay(original)) delete names[id];
    else names[id] = v;
    onIdentity({ ...identity, names });
  };

  const setSelf = (selfId: string | null | undefined) => onIdentity({ ...identity, selfId });

  const merge = () => {
    if (!canMerge) return;
    const prev = identity;
    // The busiest selected person survives; everyone else folds into them.
    const target = people.find((p) => selectedIds.includes(p.id))!.id;
    const merges = { ...identity.merges };
    const names = { ...identity.names };
    for (const id of selectedIds) {
      if (id === target) continue;
      merges[id] = target;
      for (const [s, tgt] of Object.entries(merges)) if (tgt === id) merges[s] = target;
      delete names[id];
    }
    const selfId = identity.selfId && selectedIds.includes(identity.selfId) ? target : identity.selfId;
    onIdentity({ merges, names, selfId });
    setSelected(new Set());
    const targetP = people.find((p) => p.id === target)!;
    toast(t("s3_merged_toast", { name: nameOf(targetP) }), { tone: "success", action: { label: c("undo"), onClick: () => onIdentity(prev) } });
  };

  const split = (target: string) => {
    const merges: Record<string, string> = {};
    for (const [s, tgt] of Object.entries(identity.merges)) if (resolveMerge(identity.merges, s) !== target) merges[s] = tgt;
    onIdentity({ ...identity, merges });
    toast(t("s3_split_toast"));
  };

  const toggle = (id: string) =>
    setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const mergedSourcesOf = (id: string) =>
    source.chat.participants.filter((p) => p.id !== id && resolveMerge(identity.merges, p.id) === id).map((p) => cleanDisplay(p.displayName));

  const isCouple = chatType === "couple" || chatType === "friend";
  const whoPerson = whoId ? people.find((p) => p.id === whoId) ?? null : null;

  return (
    <WizardFrame
      step={3}
      title={t("s3_title")}
      sub={
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-base font-semibold sm:text-lg">
          <span>{t("s3_summary_people", { n: nf.format(people.length) })}</span>
          <span aria-hidden className="text-ink-3">·</span>
          <span>{t("s3_summary_messages", { n: nf.format(total) })}</span>
          {span && (
            <>
              <span aria-hidden className="text-ink-3">·</span>
              <span className="text-ink-2">{span}</span>
            </>
          )}
        </p>
      }
      onBack={onBack}
      footer={
        selectedIds.length > 0 ? (
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-extrabold">{t("s3_merge_selected", { n: selectedIds.length })}</p>
              {selectedIds.length >= 2 && !canMerge && <p className="text-xs font-semibold text-ember">{t("s3_merge_min")}</p>}
            </div>
            <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
              {t("s3_merge_clear")}
            </Button>
            <Button size="sm" className="h-11" disabled={!canMerge} onClick={merge}>
              <IconMerge size={18} />
              {t("s3_merge_btn", { n: selectedIds.length })}
            </Button>
          </div>
        ) : (
          <Button size="lg" className="w-full" onClick={onContinue} disabled={people.length < 2}>
            {t("continue")}
            <IconArrowForward size={20} />
          </Button>
        )
      }
    >
      {/* group name */}
      <div>
        <label htmlFor="group-name" className="block font-extrabold">
          {isCouple ? t("s3_chat_label") : t("s3_group_label")}
        </label>
        <input
          id="group-name"
          type="text"
          value={groupName}
          maxLength={80}
          onChange={(e) => onGroupName(e.target.value)}
          placeholder={t("s3_group_placeholder")}
          className="mt-2 h-13 w-full rounded-2xl border-2 border-line bg-surface px-4 text-lg font-semibold text-ink placeholder:font-normal placeholder:text-ink-3 focus:border-ember focus:outline-none focus-visible:ring-4 focus-visible:ring-ember/30"
          aria-describedby="group-name-hint"
        />
        <p id="group-name-hint" className="mt-1.5 text-sm text-ink-3">
          {t("s3_group_hint")}
        </p>
      </div>

      {/* rename tip */}
      <div className="mt-8 flex flex-col gap-4 rounded-3xl border-2 border-dashed border-line/60 bg-surface-2/70 p-4 sm:flex-row sm:items-center">
        <div aria-hidden className="flex shrink-0 items-center gap-2 self-center">
          <span className="rounded-full border-2 border-line bg-surface px-3 py-1 text-sm font-bold text-ink-2 line-through decoration-ember decoration-2">
            {t("s3_tip_from")}
          </span>
          <IconArrowForward size={18} className="cr-nudge text-ember" />
          <span className="rounded-full border-2 border-line bg-sun px-3 py-1 text-sm font-black text-[#17120e]">{t("s3_tip_to")}</span>
        </div>
        <div className="text-center sm:text-start">
          <p className="font-extrabold">{t("s3_tip_title")}</p>
          <p className="text-sm text-ink-2">{t("s3_tip_body")}</p>
        </div>
      </div>

      {/* people */}
      <section aria-labelledby="people-title" className="mt-8">
        <h2 id="people-title" className="text-xl font-extrabold">
          {t("s3_people_title")}
        </h2>
        <p className="mt-1 text-sm text-ink-2">{t("s3_people_hint")}</p>

        <ul className="mt-4 space-y-2.5">
          {visible.map((p) => {
            const display = cleanDisplay(p.displayName);
            const renamed = Boolean((identity.names[p.id] ?? "").trim());
            const phone = !renamed && isPhoneName(display);
            const emoji = !renamed && !phone && isEmojiOnlyName(display);
            const sources = mergedSourcesOf(p.id);
            const isSelected = selected.has(p.id);
            const share = total ? p.messageCount / total : 0;
            const value = identity.names[p.id] ?? display;
            return (
              <li
                key={p.id}
                className={`rounded-3xl border-2 bg-surface p-3 transition-all duration-150 sm:p-4 ${
                  isSelected ? "border-ember shadow-pop-sm ring-4 ring-ember/20 rtl:shadow-[-2px_2px_0_0_var(--shadow)]" : "border-line"
                }`}
              >
                <div className="flex items-center gap-3">
                  <label className="relative grid size-11 shrink-0 cursor-pointer place-items-center" title={t("s3_select", { name: nameOf(p) })}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggle(p.id)}
                      aria-label={t("s3_select", { name: nameOf(p) })}
                      className="peer sr-only"
                    />
                    <span
                      aria-hidden
                      className={`grid size-11 place-items-center rounded-full border-2 border-line text-base font-black text-[#17120e] transition-all peer-focus-visible:ring-4 peer-focus-visible:ring-ember/40 ${
                        isSelected ? "bg-ember text-white" : toneOf.get(p.id)
                      }`}
                    >
                      {isSelected ? <IconCheck size={20} strokeWidth={3} /> : initialOf(nameOf(p))}
                    </span>
                  </label>

                  <div className="min-w-0 flex-1">
                    <div className="relative max-w-[20rem]">
                      <input
                        type="text"
                        value={value}
                        maxLength={MAX_NAME}
                        onChange={(e) => setName(p.id, e.target.value)}
                        onBlur={() => commitName(p.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                        }}
                        aria-label={t("s3_rename_label", { name: display })}
                        className={`peer h-10 w-full rounded-xl border-2 bg-transparent pe-8 ps-2 text-base font-bold text-ink transition-colors hover:border-line-soft focus:border-ember focus:bg-surface focus:outline-none ${
                          phone || emoji ? "border-sun bg-sun/10" : "border-transparent"
                        }`}
                      />
                      <IconPencil size={15} className="pointer-events-none absolute end-2.5 top-1/2 -translate-y-1/2 text-ink-3 peer-focus:text-ember" />
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 ps-2 text-xs text-ink-2">
                      <span className="font-semibold tabular-nums">{t("s3_messages", { n: nf.format(p.messageCount) })}</span>
                      <span aria-hidden className="h-1.5 w-12 overflow-hidden rounded-full bg-surface-2">
                        <span className="block h-full rounded-full bg-ink-2" style={{ width: `${Math.max(4, Math.round(share * 100))}%` }} />
                      </span>
                      {renamed && (
                        <span className="text-ink-3" dir="auto">
                          {t("s3_was", { name: display })}
                        </span>
                      )}
                      {phone && <span className="font-bold text-ink">📞 {t("s3_nudge_phone")}</span>}
                      {emoji && <span className="font-bold text-ink">✨ {t("s3_nudge_emoji")}</span>}
                      {identity.selfId && resolveMerge(identity.merges, identity.selfId) === p.id && (
                        <span className="rounded-full bg-ink px-2 py-0.5 font-bold text-paper">{t("s3_you")}</span>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setWhoId(p.id)}
                    aria-label={t("s3_who_aria", { name: nameOf(p) })}
                    className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border-2 border-line-soft px-3 text-sm font-bold text-ink-2 transition-colors hover:border-line hover:text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ember/40"
                  >
                    <IconEye size={16} />
                    <span className="hidden sm:inline">{t("s3_who")}</span>
                  </button>
                </div>

                {sources.length > 0 && (
                  <div className="mt-2 flex items-center gap-2 rounded-2xl bg-surface-2 px-3 py-2 text-xs">
                    <IconMerge size={14} className="shrink-0 text-ink-2" />
                    <span className="min-w-0 flex-1 truncate text-ink-2" dir="auto">
                      {t("s3_merged_from", { names: sources.join(" · ") })}
                    </span>
                    <button
                      type="button"
                      onClick={() => split(p.id)}
                      className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 font-bold text-ink underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ember/40"
                    >
                      <IconSplit size={14} />
                      {t("s3_split")}
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        {people.length > COLLAPSED && (
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="mt-3 w-full rounded-2xl border-2 border-dashed border-line-soft py-3 text-sm font-bold text-ink-2 transition-colors hover:border-line hover:text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ember/40"
          >
            {expanded ? t("s3_show_less") : t("s3_show_more", { n: people.length - COLLAPSED })}
          </button>
        )}
      </section>

      {/* which one is you */}
      <section aria-labelledby="self-title" className="mt-10 rounded-3xl border-2 border-line-soft bg-surface-2/70 p-4 sm:p-5">
        <h2 id="self-title" className="text-xl font-extrabold">
          {t("s3_self_title")}
        </h2>
        <p className="mt-1 text-sm text-ink-2">{t("s3_self_sub")}</p>
        {people.length <= 8 ? (
          <div className="mt-4 flex flex-wrap gap-2" role="group" aria-labelledby="self-title">
            {people.map((p) => {
              const on = Boolean(identity.selfId) && resolveMerge(identity.merges, identity.selfId!) === p.id;
              return (
                <ChipButton key={p.id} selected={on} onClick={() => setSelf(on ? undefined : p.id)}>
                  {on && <IconCheck size={14} strokeWidth={3} />}
                  <span dir="auto">{nameOf(p)}</span>
                </ChipButton>
              );
            })}
            <ChipButton selected={identity.selfId === null} onClick={() => setSelf(identity.selfId === null ? undefined : null)}>
              {identity.selfId === null && <IconCheck size={14} strokeWidth={3} />}
              {t("s3_self_none")}
            </ChipButton>
          </div>
        ) : (
          <select
            value={identity.selfId === null ? "__none" : identity.selfId ? resolveMerge(identity.merges, identity.selfId) : ""}
            onChange={(e) => setSelf(e.target.value === "__none" ? null : e.target.value || undefined)}
            aria-labelledby="self-title"
            className="mt-4 h-12 w-full rounded-2xl border-2 border-line bg-surface px-3 font-semibold text-ink focus:border-ember focus:outline-none focus-visible:ring-4 focus-visible:ring-ember/30"
          >
            <option value="">{t("s3_self_skip")}</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {nameOf(p)}
              </option>
            ))}
            <option value="__none">{t("s3_self_none")}</option>
          </select>
        )}
      </section>

      <WhoIsThisSheet
        person={whoPerson}
        chat={merged}
        tone={whoPerson ? toneOf.get(whoPerson.id) ?? "bg-sun" : "bg-sun"}
        nameValue={whoPerson ? identity.names[whoPerson.id] ?? cleanDisplay(whoPerson.displayName) : ""}
        onName={(v) => whoPerson && setName(whoPerson.id, v)}
        onCommitName={() => whoPerson && commitName(whoPerson.id)}
        isSelf={Boolean(whoPerson && identity.selfId && resolveMerge(identity.merges, identity.selfId) === whoPerson.id)}
        onToggleSelf={() => {
          if (!whoPerson) return;
          const on = identity.selfId && resolveMerge(identity.merges, identity.selfId) === whoPerson.id;
          setSelf(on ? undefined : whoPerson.id);
        }}
        onClose={() => setWhoId(null)}
      />
    </WizardFrame>
  );
}
