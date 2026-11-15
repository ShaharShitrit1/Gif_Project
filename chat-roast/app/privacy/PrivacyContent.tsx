"use client";

import { SectionHeading } from "@/components/landing/SectionHeading";
import { ButtonLink } from "@/components/ui/Button";
import { IconCheck, IconStack } from "@/components/ui/icons";
import { useLocalized, useT } from "@/lib/i18n";
import { faqDict, privacyDont, privacyFlow } from "@/lib/i18n/dict/faq";

export function PrivacyContent() {
  const t = useT(faqDict);
  const localized = useLocalized();
  const flow = localized(privacyFlow);
  const dont = localized(privacyDont);

  return (
    <div className="mx-auto max-w-3xl px-4 pb-20 pt-10 sm:px-6 sm:pt-16">
      <SectionHeading kicker={t("privacy_kicker")} title={t("privacy_title")} />

      <section aria-labelledby="tldr" className="mt-8 rounded-[1.75rem] border-2 border-line bg-sun/25 p-6 shadow-pop rtl:shadow-[-4px_4px_0_0_var(--shadow)]">
        <h2 id="tldr" className="flex items-center gap-2 text-lg font-black">
          <span aria-hidden>🔒</span>
          {t("privacy_tldr_title")}
        </h2>
        <p className="mt-2 text-lg leading-relaxed text-pretty">{t("privacy_tldr")}</p>
      </section>

      <section aria-labelledby="flow" className="mt-14">
        <h2 id="flow" className="text-2xl font-black sm:text-3xl">
          {t("privacy_flow_title")}
        </h2>
        <ol className="mt-6 space-y-0">
          {flow.map((s, i) => (
            <li key={i} className="relative flex gap-4 pb-8 last:pb-0">
              {i < flow.length - 1 && <span aria-hidden className="absolute start-[1.45rem] top-14 bottom-1 w-0.5 bg-line-soft" />}
              <span aria-hidden className="relative z-10 grid size-12 shrink-0 place-items-center rounded-2xl border-2 border-line bg-surface text-2xl shadow-pop-sm rtl:shadow-[-2px_2px_0_0_var(--shadow)]">
                {s.icon}
              </span>
              <div className="pt-1">
                <h3 className="text-lg font-extrabold">
                  <span className="text-ink-3 tabular-nums">{i + 1}. </span>
                  {s.title}
                </h3>
                <p className="mt-1 leading-relaxed text-ink-2">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="dont" className="mt-14 rounded-[1.75rem] border-2 border-line bg-surface p-6">
        <h2 id="dont" className="text-2xl font-black">
          {t("privacy_dont_title")}
        </h2>
        <ul className="mt-4 space-y-3">
          {dont.map((d, i) => (
            <li key={i} className="flex gap-3 leading-relaxed">
              <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-mint text-[#0b3b24]">
                <IconCheck size={14} strokeWidth={3.2} />
              </span>
              <span>{d}</span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="delete" className="mt-10 grid gap-6 sm:grid-cols-2">
        <div className="rounded-[1.75rem] border-2 border-line-soft bg-surface-2 p-6">
          <h2 id="delete" className="text-xl font-black">
            {t("privacy_delete_title")}
          </h2>
          <p className="mt-2 leading-relaxed text-ink-2">{t("privacy_delete_body")}</p>
          <ButtonLink href="/reports" variant="secondary" size="sm" className="mt-4">
            <IconStack size={16} />
            {t("privacy_delete_cta")}
          </ButtonLink>
        </div>
        <div className="rounded-[1.75rem] border-2 border-line-soft bg-surface-2 p-6">
          <h2 className="text-xl font-black">{t("privacy_others_title")}</h2>
          <p className="mt-2 leading-relaxed text-ink-2">{t("privacy_others_body")}</p>
        </div>
      </section>

      <p className="mt-10 text-sm text-ink-3">{t("privacy_updated")}</p>
    </div>
  );
}
