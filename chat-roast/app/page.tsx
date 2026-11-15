import { ChatTypes } from "@/components/landing/ChatTypes";
import { FaqTeaser } from "@/components/landing/FaqTeaser";
import { FinalCta } from "@/components/landing/FinalCta";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Narrators } from "@/components/landing/Narrators";
import { PrivacyPromise } from "@/components/landing/PrivacyPromise";
import { WhatYouGet } from "@/components/landing/WhatYouGet";
import { SiteFooter } from "@/components/ui/SiteFooter";
import { SiteHeader } from "@/components/ui/SiteHeader";

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex-1 overflow-x-clip">
        <Hero />
        <ChatTypes />
        <HowItWorks />
        <Narrators />
        <WhatYouGet />
        <PrivacyPromise />
        <FaqTeaser />
        <FinalCta />
      </main>
      <SiteFooter />
    </>
  );
}
