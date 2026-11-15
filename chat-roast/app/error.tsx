"use client";

import { useEffect } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { PersonaAvatar } from "@/components/ui/PersonaAvatar";
import { useLocale } from "@/lib/i18n";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { locale } = useLocale();
  const en = locale === "en";
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main id="main" className="flex flex-1 flex-col items-center justify-center gap-5 px-4 py-20 text-center">
      <PersonaAvatar id="doc" size={104} />
      <h1 className="text-2xl font-black sm:text-3xl">{en ? "Something broke on our side." : "משהו נשבר אצלנו."}</h1>
      <p className="max-w-md text-ink-2">{en ? "Your saved reports are safe in this browser. Try again." : "הדוחות ששמרתם בטוחים בדפדפן הזה. נסו שוב."}</p>
      <div className="flex flex-wrap justify-center gap-3">
        <Button onClick={reset}>{en ? "Try again" : "לנסות שוב"}</Button>
        <ButtonLink href="/" variant="secondary">{en ? "Home" : "לדף הבית"}</ButtonLink>
      </div>
    </main>
  );
}
