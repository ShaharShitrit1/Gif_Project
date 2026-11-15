"use client";

import { Button } from "@/components/ui/Button";
import { PersonaAvatar } from "@/components/ui/PersonaAvatar";
import { Segmented } from "@/components/ui/Segmented";
import { IconCheck, IconChevronDown, IconLock } from "@/components/ui/icons";
import { useLocale, useLocalized, useT } from "@/lib/i18n";
import { intensityExamples, wizardDict } from "@/lib/i18n/dict/wizard";
import { PERSONA_IDS, PERSONAS, REPORT_LANGUAGES } from "@/lib/personas";
import type { Intensity, PersonaId } from "@/lib/types";
import { WizardFrame } from "./WizardFrame";
import { ApiKeyBox } from "./ApiKeyBox";

export const MAX_CONTEXT = 500;
const HEAT_EMOJI: Record<Intensity, string> = { 1: "😇", 2: "🔥", 3: "💀" };

export function StepPersonalize({
  personaId,
  onPersona,
  intensity,
  onIntensity,
  languageCode,
  onLanguage,
  extraContext,
  onExtraContext,
  onStart,
  onBack,
}: {
  personaId: PersonaId;
  onPersona: (p: PersonaId) => void;
  intensity: Intensity;
  onIntensity: (i: Intensity) => void;
  languageCode: string;
  onLanguage: (code: string) => void;
  extraContext: string;
  onExtraContext: (v: string) => void;
  onStart: () => void;
  onBack: () => void;
}) {
  const t = useT(wizardDict);
  const { locale } = useLocale();
  const localized = useLocalized();
  const persona = PERSONAS[personaId];
  const example = localized(intensityExamples)[personaId][intensity - 1];

  return (
    <WizardFrame
      step={4}
      title={t("s4_title")}
      sub={t("s4_sub")}
      onBack={onBack}
      wide
      footer={
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
          <p className="flex flex-1 items-start gap-2 text-xs leading-relaxed text-ink-2 sm:text-sm">
            <IconLock size={16} className="mt-0.5 text-sea" />
            <span>{t("s4_privacy")}</span>
          </p>
          <Button size="lg" className="w-full shrink-0 sm:w-auto" onClick={onStart}>
            {t("s4_cta")} <span aria-hidden>🔥</span>
          </Button>
        </div>
      }
    >
      {/* narrator */}
      <fieldset>
        <legend className="text-xl font-extrabold">{t("s4_persona_label")}</legend>
        <div className="mt-4 grid gap-3 md:grid-cols-3 md:gap-4">
          {PERSONA_IDS.map((id) => {
            const p = PERSONAS[id];
            const on = id === personaId;
            return (
              <label
                key={id}
                className={`relative flex cursor-pointer items-center gap-4 rounded-3xl border-2 bg-surface p-4 transition-all duration-150 has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-ember/40 md:flex-col md:items-start md:p-5 ${
                  on
                    ? "-translate-y-0.5 border-line shadow-pop rtl:shadow-[-4px_4px_0_0_var(--shadow)]"
                    : "border-line-soft hover:-translate-y-0.5 hover:border-line"
                }`}
              >
                <input type="radio" name="persona" value={id} checked={on} onChange={() => onPersona(id)} className="sr-only" />
                <span aria-hidden className="absolute inset-x-0 top-0 hidden h-16 rounded-t-[1.4rem] md:block" style={{ background: on ? p.color.bg : "transparent", opacity: 0.18 }} />
                <PersonaAvatar id={id} size={68} className="relative md:size-[88px]!" />
                <span className="relative min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-lg font-black leading-tight">
                    {localized(p.name)} <span aria-hidden>{p.emoji}</span>
                  </span>
                  <span className="block text-sm font-bold text-ink-2">{localized(p.role)}</span>
                  <span className="mt-1.5 hidden text-sm leading-snug text-ink-2 sm:block">{localized(p.tagline)}</span>
                </span>
                <span
                  aria-hidden
                  className={`absolute end-3 top-3 grid size-7 place-items-center rounded-full border-2 transition-all ${
                    on ? "scale-100 border-line bg-ember text-ember-ink" : "scale-90 border-line-soft bg-surface text-transparent"
                  }`}
                >
                  <IconCheck size={15} strokeWidth={3.2} />
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {/* intensity */}
      <section aria-labelledby="heat-label" className="mt-10">
        <h2 id="heat-label" className="text-xl font-extrabold">
          {t("s4_intensity_label")}
        </h2>
        <Segmented<Intensity>
          className="mt-4"
          size="lg"
          ariaLabel={t("s4_intensity_label")}
          value={intensity}
          onChange={onIntensity}
          options={([1, 2, 3] as Intensity[]).map((i) => ({
            value: i,
            label: (
              <>
                <span aria-hidden>{HEAT_EMOJI[i]}</span> {t(`s4_intensity_${i}`)}
              </>
            ),
          }))}
        />
        <p className="mt-2 text-center text-sm font-semibold text-ink-2" aria-live="polite">
          {t(`s4_intensity_desc_${intensity}`)}
        </p>

        <div className="mt-5 rounded-3xl bg-chat-bg p-4 sm:p-5">
          <p className="mb-3 text-xs font-black uppercase tracking-wide text-ink-3 rtl:tracking-normal">{t("s4_example")}</p>
          <div className="flex items-end gap-2.5">
            <PersonaAvatar id={personaId} size={40} className="mb-0.5" />
            <div
              key={`${personaId}-${intensity}`}
              className="cr-pop-in min-w-0 max-w-xl rounded-2xl rounded-es-md border-2 border-line bg-surface px-4 py-3 shadow-pop-sm rtl:shadow-[-2px_2px_0_0_var(--shadow)]"
            >
              <p className="mb-1 flex items-center gap-1.5 text-xs font-black">
                <span className="size-2 rounded-full" style={{ background: persona.color.bg }} />
                {localized(persona.name)}
              </p>
              <p className="font-medium leading-snug">{example}</p>
            </div>
          </div>
        </div>
      </section>

      {/* language */}
      <section className="mt-10">
        <label htmlFor="report-lang" className="text-xl font-extrabold">
          {t("s4_lang_label")}
        </label>
        <div className="relative mt-4">
          <select
            id="report-lang"
            value={languageCode}
            onChange={(e) => onLanguage(e.target.value)}
            aria-describedby="report-lang-hint"
            className="h-13 w-full appearance-none rounded-2xl border-2 border-line bg-surface pe-11 ps-4 text-base font-bold text-ink focus:border-ember focus:outline-none focus-visible:ring-4 focus-visible:ring-ember/30"
          >
            {REPORT_LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label[locale] === l.native ? l.native : `${l.label[locale]} · ${l.native}`}
              </option>
            ))}
          </select>
          <IconChevronDown size={20} className="pointer-events-none absolute end-4 top-1/2 -translate-y-1/2 text-ink-2" />
        </div>
        <p id="report-lang-hint" className="mt-1.5 text-sm text-ink-3">
          {t("s4_lang_hint")}
        </p>
      </section>

      {/* context */}
      <section className="mt-10">
        <div className="flex items-baseline justify-between gap-3">
          <label htmlFor="extra-context" className="text-xl font-extrabold">
            {t("s4_context_label")}
          </label>
          <span className="shrink-0 text-sm font-semibold text-ink-3">{t("s4_context_optional")}</span>
        </div>
        <textarea
          id="extra-context"
          value={extraContext}
          onChange={(e) => onExtraContext(e.target.value.slice(0, MAX_CONTEXT))}
          maxLength={MAX_CONTEXT}
          rows={3}
          dir="auto"
          placeholder={t("s4_context_placeholder")}
          aria-describedby="extra-context-count"
          className="mt-4 block w-full resize-y rounded-2xl border-2 border-line bg-surface px-4 py-3 text-base leading-relaxed text-ink placeholder:text-ink-3 focus:border-ember focus:outline-none focus-visible:ring-4 focus-visible:ring-ember/30"
        />
        <p
          id="extra-context-count"
          className={`mt-1.5 text-end text-xs font-bold tabular-nums ${extraContext.length >= MAX_CONTEXT ? "text-ember" : "text-ink-3"}`}
        >
          {t("s4_context_count", { n: extraContext.length, max: MAX_CONTEXT })}
        </p>
      </section>
      <ApiKeyBox />
    </WizardFrame>
  );
}
