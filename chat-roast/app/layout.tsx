import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import { LocaleProvider } from "@/lib/i18n";
import { DEFAULT_LOCALE, LOCALE_COOKIE, dirOf } from "@/lib/i18n/config";
import type { Locale } from "@/lib/types";

export const metadata: Metadata = {
  title: "ChatRoast · מה הצ'אט שלכם אומר עליכם",
  description:
    "מעלים ייצוא של צ'אט מוואטסאפ ומקבלים רוסט מצחיק, ניתוח של הדינמיקה ופרופיל אישי לכל אחד בקבוצה. הקובץ מעובד בדפדפן ולא נשמר אצלנו.",
  applicationName: "ChatRoast",
  icons: { icon: "/icon.svg" },
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
