import type { Metadata } from "next";
import { cookies } from "next/headers";
import { SiteFooter } from "@/components/ui/SiteFooter";
import { SiteHeader } from "@/components/ui/SiteHeader";
import { LOCALE_COOKIE } from "@/lib/i18n/config";

export async function generateMetadata(): Promise<Metadata> {
  const en = (await cookies()).get(LOCALE_COOKIE)?.value === "en";
  return { title: en ? "Terms of use" : "תנאי שימוש", alternates: { canonical: "/terms" } };
}

const CONTACT = process.env.NEXT_PUBLIC_CONTACT_EMAIL;

const HE: [string, string][] = [
  ["בשביל הצחוק", "ChatRoast הוא כלי בידור. הדוחות נכתבים על ידי בינה מלאכותית, ועלולים להיות לא מדויקים, מוגזמים או לא מצחיקים. אל תקבלו על סמכם החלטות אמיתיות על אנשים או על קשרים."],
  ["על מה מותר להעלות", "העלו רק צ'אטים שאתם חלק מהם, וכבדו את הפרטיות של שאר המשתתפים. אל תשתמשו בדוחות כדי להשפיל, להציק או לפגוע במישהו. השימוש מיועד לגילאי 16 ומעלה."],
  ["מה קורה למידע", "הקובץ נקרא בדפדפן שלכם. כדי לכתוב את הדוח, קטע מקוצר מהשיחה, שבו מספרי טלפון, אימיילים וקישורים מוסתרים, נשלח לספק ה-AI (Anthropic). אנחנו לא שומרים את הצ'אט או את הדוח בשרתים שלנו. הדוחות נשמרים רק בדפדפן שלכם, ואפשר למחוק אותם בכל רגע. הפרטים המלאים נמצאים במדיניות הפרטיות."],
  ["בלי התחייבויות", "השירות ניתן כמו שהוא (AS IS), בלי אחריות לזמינות, לדיוק או להתאמה למטרה מסוימת. במידה המרבית שהחוק מתיר, אנחנו לא אחראים לנזק שנגרם משימוש בשירות או בתוכן שהוא מייצר."],
  ["שימוש הוגן", "אסור לנסות לעקוף את מגבלות השימוש, לתקוף את השירות או להשתמש בו באופן אוטומטי בהיקף גדול. אנחנו רשאים להגביל או לחסום שימוש לרעה."],
  ["שינויים", "התנאים עשויים להתעדכן. המשך שימוש אחרי עדכון מהווה הסכמה לתנאים המעודכנים."],
];

const EN: [string, string][] = [
  ["Just for laughs", "ChatRoast is an entertainment tool. Reports are written by AI and may be inaccurate, exaggerated or simply not funny. Don't make real decisions about people or relationships based on them."],
  ["What you may upload", "Only upload chats you are part of, and respect the other members' privacy. Don't use reports to humiliate, harass or hurt anyone. The service is intended for people aged 16 and over."],
  ["What happens to your data", "Your file is read in your browser. To write the report, a condensed excerpt with phone numbers, emails and links masked is sent to our AI provider (Anthropic). We don't store your chat or report on our servers; reports are saved only in your browser and you can delete them any time. See the privacy policy for details."],
  ["No warranties", "The service is provided as is, without warranties of availability, accuracy or fitness for a purpose. To the fullest extent permitted by law, we are not liable for damages arising from using the service or the content it generates."],
  ["Fair use", "Don't try to bypass usage limits, attack the service or use it automatically at scale. We may limit or block abuse."],
  ["Changes", "These terms may be updated. Continuing to use the service after an update means you accept the updated terms."],
];

export default async function TermsPage() {
  const en = (await cookies()).get(LOCALE_COOKIE)?.value === "en";
  const items = en ? EN : HE;
  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:py-16">
        <h1 className="text-4xl font-black sm:text-5xl">{en ? "Terms of use" : "תנאי שימוש"}</h1>
        <p className="mt-3 text-ink-2">{en ? "Short, human, and in plain language." : "קצר, אנושי ובשפה פשוטה."}</p>
        <div className="mt-8 space-y-4">
          {items.map(([h, body], i) => (
            <section key={i} className="card-flat p-5 sm:p-6">
              <h2 className="text-xl font-black">{h}</h2>
              <p className="mt-2 leading-relaxed text-ink-2">{body}</p>
            </section>
          ))}
        </div>
        {CONTACT && (
          <p className="mt-8 text-ink-2">
            {en ? "Questions? " : "שאלות? "}
            <a className="font-bold underline" href={`mailto:${CONTACT}`}>{CONTACT}</a>
          </p>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
