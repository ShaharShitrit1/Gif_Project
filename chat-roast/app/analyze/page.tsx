import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Suspense } from "react";
import { Wizard } from "@/components/wizard/Wizard";
import { WizardFallback } from "@/components/wizard/WizardFallback";
import { LOCALE_COOKIE } from "@/lib/i18n/config";

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await cookies()).get(LOCALE_COOKIE)?.value === "en" ? "en" : "he";
  return {
    title: locale === "en" ? "New roast · ChatRoast" : "רוסט חדש · ChatRoast",
    robots: { index: false },
  };
}

export default function AnalyzePage() {
  // The wizard reads ?type= / ?step= with useSearchParams, so it lives inside Suspense.
  return (
    <Suspense fallback={<WizardFallback />}>
      <Wizard />
    </Suspense>
  );
}
