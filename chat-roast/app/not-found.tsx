import { cookies } from "next/headers";
import { SiteFooter } from "@/components/ui/SiteFooter";
import { SiteHeader } from "@/components/ui/SiteHeader";
import { ButtonLink } from "@/components/ui/Button";
import { PersonaAvatar } from "@/components/ui/PersonaAvatar";
import { LOCALE_COOKIE } from "@/lib/i18n/config";

export const metadata = { title: "404", robots: { index: false } };

export default async function NotFound() {
  const en = (await cookies()).get(LOCALE_COOKIE)?.value === "en";
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex flex-1 flex-col items-center justify-center gap-5 px-4 py-20 text-center">
        <PersonaAvatar id="max" size={112} />
        <p className="text-6xl font-black text-ember">404</p>
        <h1 className="text-2xl font-black sm:text-3xl">{en ? "This page left the group." : "הדף הזה יצא מהקבוצה."}</h1>
        <p className="max-w-md text-ink-2">
          {en ? "Like that one friend who never answers. Let's get you back somewhere useful." : "כמו החבר ההוא שאף פעם לא עונה. בואו נחזיר אתכם למקום שווה."}
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <ButtonLink href="/">{en ? "Home" : "לדף הבית"}</ButtonLink>
          <ButtonLink href="/analyze" variant="secondary">{en ? "Roast a chat" : "לעשות רוסט"}</ButtonLink>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
