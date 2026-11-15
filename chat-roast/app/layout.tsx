import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import { LocaleProvider } from "@/lib/i18n";
import { DEFAULT_LOCALE, LOCALE_COOKIE, dirOf } from "@/lib/i18n/config";
import type { Locale } from "@/lib/types";
import { SITE_NAME, SITE_URL } from "@/lib/site";

const TITLE = "ChatRoast · מה הצ'אט שלכם אומר עליכם";
const DESCRIPTION =
  "מעלים ייצוא של צ'אט מוואטסאפ ומקבלים רוסט מצחיק, ניתוח של הדינמיקה ופרופיל אישי לכל אחד בקבוצה. הקובץ מעובד בדפדפן ולא נשמר אצלנו.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: TITLE, template: "%s · ChatRoast" },
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: ["רוסט", "צ'אט וואטסאפ", "ניתוח צ'אט", "קבוצת וואטסאפ", "AI", "WhatsApp chat analyzer", "group chat roast"],
  icons: { icon: "/icon.svg", apple: "/apple-icon.png" },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: TITLE,
    description: DESCRIPTION,
    locale: "he_IL",
    alternateLocale: ["en_US"],
    url: "/",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "ChatRoast" }],
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, images: ["/og.png"] },
  alternates: { canonical: "/" },
  formatDetection: { telephone: false, email: false, address: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fff8f0" },
    { media: "(prefers-color-scheme: dark)", color: "#120f0d" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const jar = await cookies();
  const raw = jar.get(LOCALE_COOKIE)?.value;
  const locale: Locale = raw === "en" || raw === "he" ? raw : DEFAULT_LOCALE;

  return (
    <html lang={locale} dir={dirOf(locale)} className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        <LocaleProvider initial={locale}>{children}</LocaleProvider>
      </body>
    </html>
  );
}
