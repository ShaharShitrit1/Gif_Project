import type { Metadata } from "next";
import { cookies } from "next/headers";
import { SiteFooter } from "@/components/ui/SiteFooter";
import { SiteHeader } from "@/components/ui/SiteHeader";
import { LOCALE_COOKIE } from "@/lib/i18n/config";
import { FaqContent } from "./FaqContent";

export async function generateMetadata(): Promise<Metadata> {
  const en = (await cookies()).get(LOCALE_COOKIE)?.value === "en";
  return {
    title: en ? "FAQ · ChatRoast" : "שאלות נפוצות · ChatRoast",
    description: en
      ? "How to export a WhatsApp chat, what happens to your data, languages, narrators and more."
      : "איך מייצאים צ'אט מוואטסאפ, מה קורה למידע שלכם, שפות, דמויות ועוד.",
  };
}

export default function FaqPage() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex-1">
        <FaqContent />
      </main>
      <SiteFooter />
    </>
  );
}
