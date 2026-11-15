import type { Metadata } from "next";
import { cookies } from "next/headers";
import { SiteFooter } from "@/components/ui/SiteFooter";
import { SiteHeader } from "@/components/ui/SiteHeader";
import { LOCALE_COOKIE } from "@/lib/i18n/config";
import { PrivacyContent } from "./PrivacyContent";

export async function generateMetadata(): Promise<Metadata> {
  const en = (await cookies()).get(LOCALE_COOKIE)?.value === "en";
  return {
    title: en ? "Privacy" : "פרטיות",
    description: en
      ? "Your chat is parsed in your browser, redacted before the AI sees an excerpt, and never stored on our servers."
      : "הצ'אט נקרא בדפדפן שלכם, מוסתר לפני שה-AI רואה קטע ממנו, ולא נשמר אצלנו.",
  };
}

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex-1">
        <PrivacyContent />
      </main>
      <SiteFooter />
    </>
  );
}
