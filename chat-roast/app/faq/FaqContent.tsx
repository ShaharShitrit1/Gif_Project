"use client";

import Link from "next/link";
import { FaqAccordion } from "@/components/landing/FaqAccordion";
import { SectionHeading } from "@/components/landing/SectionHeading";
import { ButtonLink } from "@/components/ui/Button";
import { PersonaAvatar } from "@/components/ui/PersonaAvatar";
import { IconArrowForward } from "@/components/ui/icons";
import { useLocalized, useT } from "@/lib/i18n";
import { faqDict, faqItems } from "@/lib/i18n/dict/faq";

export function FaqContent() {
  const t = useT(faqDict);
  const localized = useLocalized();
  const items = localized(faqItems);

  return (
    <div className="mx-auto max-w-3xl px-4 pb-20 pt-10 sm:px-6 sm:pt-16">
      <SectionHeading kicker={t("faq_kicker")} title={<span className="sm:text-[3.25rem]">{t("faq_title")}</span>} sub={t("faq_sub")} />

      <nav aria-label={t("faq_toc")} className="mt-8 hidden sm:block">
        <p className="sr-only">{t("faq_toc")}</p>
        <ul className="flex flex-wrap gap-2">
          {items.map((item) => (
            <li key={item.id}>
              <a
                href={`#q-${item.id}`}
                onClick={() => {
                  const el = document.getElementById(`q-${item.id}`) as HTMLDetailsElement | null;
                  if (el) el.open = true;
                }}
                className="inline-flex min-h-9 items-center rounded-full border-2 border-line-soft bg-surface px-3.5 py-1 text-sm font-semibold text-ink-2 transition-colors hover:border-line hover:text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ember/40"
              >
                {item.q}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <FaqAccordion items={items} defaultOpenId={items[0]?.id} className="mt-10" />

      <div className="mt-14 flex flex-col items-center gap-5 rounded-[2rem] border-2 border-line bg-surface-2 p-8 text-center sm:flex-row sm:text-start">
        <div aria-hidden className="flex -space-x-3 rtl:space-x-reverse">
          <PersonaAvatar id="savta" size={52} />
          <PersonaAvatar id="max" size={60} className="relative z-10" />
          <PersonaAvatar id="doc" size={52} />
        </div>
        <div className="flex-1">
          <p className="text-2xl font-black">{t("faq_cta_title")}</p>
          <p className="text-ink-2">{t("faq_cta_body")}</p>
        </div>
        <ButtonLink href="/analyze" size="lg">
          {t("faq_cta")} <span aria-hidden>🔥</span>
        </ButtonLink>
      </div>

      <p className="mt-8 text-center">
        <Link
          href="/privacy"
          className="group inline-flex items-center gap-1.5 rounded-full font-bold underline decoration-sea decoration-2 underline-offset-4 hover:decoration-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ember/40"
        >
          {t("faq_privacy_link")}
          <IconArrowForward size={16} />
        </Link>
      </p>
    </div>
  );
}
