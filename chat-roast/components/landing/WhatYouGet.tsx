"use client";

import type { ReactNode } from "react";
import { PersonaAvatar } from "@/components/ui/PersonaAvatar";
import { useT } from "@/lib/i18n";
import { landingDict } from "@/lib/i18n/dict/landing";
import { SectionHeading } from "./SectionHeading";

/** Deterministic pseudo-random heat values for the mini heatmap. */
const HEAT = Array.from({ length: 7 * 14 }, (_, i) => {
  const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  const r = x - Math.floor(x);
  const weekend = i % 7 >= 5;
  return Math.min(1, r * (weekend ? 1.25 : 0.95));
});

function Tile({ title, body, children, className = "" }: { title: string; body: string; children: ReactNode; className?: string }) {
  return (
    <li className={`card flex flex-col overflow-hidden ${className}`}>
      <div aria-hidden className="relative flex min-h-36 flex-1 items-center justify-center overflow-hidden border-b-2 border-line bg-surface-2 p-5">
        {children}
      </div>
      <div className="p-5">
        <h3 className="text-xl font-extrabold">{title}</h3>
        <p className="mt-1.5 leading-relaxed text-ink-2">{body}</p>
      </div>
    </li>
  );
}

export function WhatYouGet() {
  const t = useT(landingDict);

  return (
    <section aria-labelledby="get-title" className="border-y-2 border-line-soft bg-surface-2/60">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <SectionHeading id="get-title" kicker={t("get_kicker")} title={t("get_title")} sub={t("get_sub")} />
        <ul className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {/* verdict */}
          <Tile title={t("get_verdict_title")} body={t("get_verdict_body")} className="lg:col-span-2">
            <div className="flex w-full max-w-lg items-start gap-4">
              <PersonaAvatar id="max" size={64} className="shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.12em] text-ember rtl:text-sm rtl:tracking-normal">🔥 {t("get_verdict_kicker")}</p>
                <p className="mt-1 text-2xl font-black leading-tight text-balance sm:text-3xl">{t("get_verdict_sample")}</p>
                <div className="mt-3 space-y-1.5">
                  <span className="block h-2 w-full rounded-full bg-line-soft" />
                  <span className="block h-2 w-11/12 rounded-full bg-line-soft" />
                  <span className="block h-2 w-3/5 rounded-full bg-line-soft" />
                </div>
              </div>
            </div>
          </Tile>

          {/* profile */}
          <Tile title={t("get_profiles_title")} body={t("get_profiles_body")} className="lg:row-span-2">
            <div className="w-full max-w-[16rem] rotate-[-2deg] rounded-3xl border-2 border-line bg-surface p-4 shadow-pop rtl:rotate-[2deg] rtl:shadow-[-4px_4px_0_0_var(--shadow)]">
              <div className="flex items-center gap-3">
                <span className="grid size-12 place-items-center rounded-full border-2 border-line bg-bubblegum text-xl font-black text-[#17120e]">
                  {t("get_profiles_name").slice(0, 1)}
                </span>
                <div className="min-w-0">
                  <p className="font-black">{t("get_profiles_name")} 📋</p>
                  <p className="text-sm font-semibold leading-tight text-ink-2">{t("get_profiles_nick")}</p>
                </div>
              </div>
              <div className="mt-4 space-y-2 text-sm font-semibold">
                <p className="rounded-xl border-2 border-mint/70 bg-mint/15 px-2.5 py-1.5">💪 {t("get_profiles_super")}</p>
                <p className="rounded-xl border-2 border-ember/60 bg-ember/10 px-2.5 py-1.5">🚩 {t("get_profiles_flag")}</p>
              </div>
              <div className="mt-4 space-y-1.5">
                <span className="block h-2 w-full rounded-full bg-line-soft" />
                <span className="block h-2 w-4/5 rounded-full bg-line-soft" />
                <span className="block h-2 w-2/3 rounded-full bg-line-soft" />
              </div>
            </div>
          </Tile>

          {/* awards */}
          <Tile title={t("get_awards_title")} body={t("get_awards_body")}>
            <ul className="w-full max-w-[16rem] space-y-2">
              {[
                ["🎙️", t("get_award_1"), "bg-sun"],
                ["🔪", t("get_award_2"), "bg-bubblegum"],
                ["🦉", t("get_award_3"), "bg-sky"],
              ].map(([emoji, label, tone], i) => (
                <li
                  key={label}
                  className="flex items-center gap-2.5 rounded-2xl border-2 border-line bg-surface px-2.5 py-2 text-sm font-bold"
                  style={{ transform: `rotate(${(i - 1) * 1.5}deg)` }}
                >
                  <span className={`grid size-8 shrink-0 place-items-center rounded-full border-2 border-line ${tone}`}>{emoji}</span>
                  <span className="leading-tight">{label}</span>
                </li>
              ))}
            </ul>
          </Tile>

          {/* numbers */}
          <Tile title={t("get_numbers_title")} body={t("get_numbers_body")}>
            <div className="w-full max-w-[16rem]">
              <div className="grid grid-flow-col grid-rows-7 gap-[3px]" dir="ltr">
                {HEAT.map((v, i) => (
                  <span
                    key={i}
                    className="aspect-square rounded-[3px] bg-ember"
                    style={{ opacity: v < 0.18 ? 0.08 : Math.round((0.2 + v * 0.8) * 100) / 100 }}
                  />
                ))}
              </div>
              <div className="mt-3 flex items-baseline justify-between gap-2 rounded-xl border-2 border-line bg-surface px-3 py-1.5">
                <span className="text-xs font-semibold text-ink-2">{t("get_numbers_stat")}</span>
                <span className="text-lg font-black tabular-nums">{t("get_numbers_value")}</span>
              </div>
            </div>
          </Tile>

          {/* share card */}
          <Tile title={t("get_share_title")} body={t("get_share_body")}>
            <div className="relative h-36 w-full max-w-[16rem]">
              <div className="absolute inset-x-6 top-2 h-32 rotate-[7deg] rounded-2xl border-2 border-line bg-grape" />
              <div className="absolute inset-x-6 top-2 flex h-32 rotate-[-4deg] flex-col justify-between rounded-2xl border-2 border-line bg-ink p-3 text-paper shadow-pop rtl:shadow-[-4px_4px_0_0_var(--shadow)]">
                <span className="text-[0.6rem] font-black tracking-wide text-sun" dir="ltr">
                  ChatRoast
                </span>
                <span className="text-lg font-black leading-tight">🎭 {t("get_share_card")}</span>
                <span className="flex gap-1">
                  <span className="h-1.5 w-10 rounded-full bg-paper/40" />
                  <span className="h-1.5 w-6 rounded-full bg-paper/25" />
                </span>
              </div>
            </div>
          </Tile>

          {/* ask */}
          <Tile title={t("get_ask_title")} body={t("get_ask_body")} className="lg:col-span-2">
            <div className="flex w-full max-w-[16rem] flex-col items-start gap-2">
              {[t("get_ask_q1"), t("get_ask_q2"), t("get_ask_q3")].map((q, i) => (
                <span
                  key={q}
                  className={`rounded-full border-2 border-line px-3 py-1 text-sm font-bold ${i === 2 ? "bg-sea text-white" : "bg-surface"}`}
                >
                  {q}
                </span>
              ))}
              <span className="mt-1 flex items-center gap-2 self-end">
                <span className="inline-flex gap-1 rounded-full border-2 border-line bg-surface px-3 py-2">
                  <span className="cr-typing-dot size-1.5 rounded-full bg-ink-2" />
                  <span className="cr-typing-dot size-1.5 rounded-full bg-ink-2" />
                  <span className="cr-typing-dot size-1.5 rounded-full bg-ink-2" />
                </span>
                <PersonaAvatar id="doc" size={32} />
              </span>
            </div>
          </Tile>
        </ul>
      </div>
    </section>
  );
}
