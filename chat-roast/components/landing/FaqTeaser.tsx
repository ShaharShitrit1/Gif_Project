"use client";

import { ButtonLink } from "@/components/ui/Button";
import { IconArrowForward } from "@/components/ui/icons";
import { useLocalized, useT } from "@/lib/i18n";
import { FAQ_TEASER_IDS, faqItems } from "@/lib/i18n/dict/faq";
import { landingDict } from "@/lib/i18n/dict/landing";
import { FaqAccordion } from "./FaqAccordion";
import { SectionHeading } from "./SectionHeading";

export function FaqTeaser() {
  const t = useT(landingDict);
  const localized = useLocalized();
  const items = localized(faqItems).filter((i) => FAQ_TEASER_IDS.includes(i.id));

  return (
    <section aria-labelledby="faq-title" className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[0.8fr_1.2fr]">
      <div>
        <SectionHeading id="faq-title" kicker={t("faq_kicker")} title={t("faq_title")} />
        <ButtonLink href="/faq" variant="secondary" className="mt-8">
          {t("faq_all")}
          <IconArrowForward size={18} />
        </ButtonLink>
      </div>
      <FaqAccordion items={items} />
    </section>
  );
}
