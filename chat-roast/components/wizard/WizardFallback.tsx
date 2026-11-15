"use client";

import { SiteHeader } from "@/components/ui/SiteHeader";
import { Spinner } from "@/components/ui/Spinner";
import { useT } from "@/lib/i18n";
import { commonDict } from "@/lib/i18n/dict/common";

export function WizardFallback() {
  const c = useT(commonDict);
  return (
    <>
      <SiteHeader cta={false} />
      <main id="main" className="grid flex-1 place-items-center py-24">
        <Spinner size={36} className="text-ember" label={c("loading")} />
      </main>
    </>
  );
}
