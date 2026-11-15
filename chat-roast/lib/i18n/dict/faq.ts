import { defineDict } from "../index";
import type { Locale } from "../../types";

/** Copy for /faq and /privacy (and the landing FAQ teaser). */
export const faqDict = defineDict({
  he: {
    faq_kicker: "שאלות נפוצות",
    faq_title: "כל מה שרציתם לדעת (ופחדתם לשאול את הקבוצה)",
    faq_sub: "לא מצאתם תשובה? כנראה שהיא בדף הפרטיות. ואם לא, זה כנראה בסדר.",
    faq_toc: "קפיצה לשאלה",
    faq_cta_title: "מוכנים?",
    faq_cta_body: "שתי דקות, אפס הרשמה, הרבה אמת.",
    faq_cta: "יאללה, על האש",
    faq_privacy_link: "לדף הפרטיות המלא",

    privacy_kicker: "פרטיות",
    privacy_title: "מה קורה לצ'אט שלכם, צעד אחר צעד",
    privacy_tldr_title: "בקצרה",
    privacy_tldr:
      "הקובץ נקרא ומנותח בדפדפן שלכם. כדי לכתוב את הדוח, קטע מתומצת מהשיחה, אחרי הסתרה של מספרי טלפון, מיילים, קישורים ומספרי כרטיסים, נשלח למודל AI. אנחנו לא שומרים כלום בשרת. הדוח נשמר רק בדפדפן שלכם, ואתם מוחקים אותו מתי שבא לכם.",
    privacy_flow_title: "המסלול של הצ'אט שלכם",
    privacy_dont_title: "מה אנחנו לא עושים",
    privacy_delete_title: "איך מוחקים",
    privacy_delete_body: "בעמוד 'הדוחות שלי' אפשר למחוק דוח אחד או את כולם. גם ניקוי נתוני האתר בדפדפן מוחק הכול. אין עותק אצלנו, אז אין מה לבקש מאיתנו למחוק.",
    privacy_delete_cta: "להדוחות שלי",
    privacy_others_title: "רגע לפני שמעלים",
    privacy_others_body:
      "בצ'אט יש גם הודעות של אנשים אחרים. תשתמשו בזה עם קבוצות שיצחקו מזה, תשנו שמות אם צריך, ותחשבו פעמיים לפני ששולחים כרטיס של מישהו לקבוצה. רוסט טוב מצחיק את כולם, כולל את מי שצולים.",
    privacy_updated: "עודכן לאחרונה: נובמבר 2026",
  },
  en: {
    faq_kicker: "FAQ",
    faq_title: "Everything you wanted to know (and were afraid to ask the group)",
    faq_sub: "Didn't find it? It's probably on the privacy page. If not, it's probably fine.",
    faq_toc: "Jump to a question",
    faq_cta_title: "Ready?",
    faq_cta_body: "Two minutes, zero sign-up, a lot of truth.",
    faq_cta: "Roast my chat",
    faq_privacy_link: "Read the full privacy page",

    privacy_kicker: "Privacy",
    privacy_title: "What happens to your chat, step by step",
    privacy_tldr_title: "The short version",
    privacy_tldr:
      "Your file is read and analyzed in your browser. To write the report, a condensed excerpt of the chat, with phone numbers, emails, links and card numbers masked, is sent to an AI model. We store nothing on our server. Your report is saved only in your browser, and you can delete it whenever you like.",
    privacy_flow_title: "Your chat's journey",
    privacy_dont_title: "What we don't do",
    privacy_delete_title: "How to delete",
    privacy_delete_body:
      "On the 'My reports' page you can delete one report or all of them. Clearing this site's data in your browser removes everything too. There's no copy on our side, so there's nothing to ask us to delete.",
    privacy_delete_cta: "Go to My reports",
    privacy_others_title: "One thing before you upload",
    privacy_others_body:
      "Your chat includes other people's messages. Use it with groups that will laugh along, rename people if needed, and think twice before posting someone's card in the group. A good roast makes everyone laugh, including the person being roasted.",
    privacy_updated: "Last updated: November 2026",
  },
});

export interface FaqItem {
  id: string;
  q: string;
  /** Paragraphs. */
  a: string[];
  /** Optional numbered steps shown after the paragraphs. */
  steps?: { title: string; items: string[] }[];
}

export const faqItems: Record<Locale, FaqItem[]> = {
  he: [
    {
      id: "apps",
      q: "אילו צ'אטים אפשר להעלות?",
      a: [
        "כרגע וואטסאפ: קבוצות וגם שיחות אחד על אחד, מאייפון ומאנדרואיד. מעלים את קובץ ה-txt שוואטסאפ יוצרת, או את ה-zip כמו שהוא. הצ'אט עצמו יכול להיות בכל שפה, גם מעורבב.",
        "טלגרם, אינסטגרם ושאר החברים בדרך. בינתיים, וואטסאפ זה המקום שבו כל הדרמה קורית ממילא.",
      ],
    },
    {
      id: "export",
      q: "איך מייצאים צ'אט מוואטסאפ?",
      a: ["לוקח חצי דקה. בשלב ההעלאה יש גם מדריך מצויר, צעד אחר צעד."],
      steps: [
        {
          title: "באייפון",
          items: ["פותחים את הצ'אט", "לוחצים על שם הקבוצה או איש הקשר למעלה", "גוללים עד הסוף למטה", "'ייצוא צ'אט'", "'ללא מדיה'", "'שמירה בקבצים', ואז חוזרים לכאן ובוחרים את הקובץ"],
        },
        {
          title: "באנדרואיד",
          items: ["פותחים את הצ'אט", "לוחצים על ⋮ בפינה", "'עוד'", "'ייצוא צ'אט'", "'ללא מדיה'", "שומרים לקבצים או לדרייב, או שולחים במייל לעצמכם, ובוחרים את הקובץ כאן"],
        },
      ],
    },
    {
      id: "desktop",
      q: "אפשר לייצא מוואטסאפ ווב או מהמחשב?",
      a: ["לא. וואטסאפ מאפשרת לייצא צ'אט רק מהטלפון. אם נוח לכם לעבוד מהמחשב, תייצאו מהטלפון, תשלחו את הקובץ במייל לעצמכם ותורידו אותו במחשב."],
    },
    {
      id: "media",
      q: "צריך לצרף מדיה?",
      a: ["לא, ועדיף שלא. אנחנו קוראים רק טקסט, ו'ללא מדיה' יוצר קובץ קטן ומהיר. כבר ייצאתם עם מדיה? אין בעיה, מעלים את ה-zip ואנחנו נמצא בו את הצ'אט."],
    },
    {
      id: "time",
      q: "כמה זמן זה לוקח?",
      a: ["קריאת הקובץ לוקחת כמה שניות. כתיבת הדוח לוקחת בדרך כלל דקה עד שלוש, תלוי בגודל הצ'אט. בזמן הזה נראה לכם כמה נתונים מעניינים מהצ'אט, רק אל תסגרו את הלשונית."],
    },
    {
      id: "cost",
      q: "כמה זה עולה?",
      a: ["כלום. הדוח המלא חינם: בלי הרשמה, בלי מייל ובלי 'לפתוח את שאר הדוח ב-29.90'."],
    },
    {
      id: "languages",
      q: "באילו שפות זה עובד?",
      a: [
        "האתר בעברית ובאנגלית. את הדוח עצמו אפשר לקבל ב-19 שפות, מערבית ורוסית ועד יפנית, ובוחרים את זה בשלב ההתאמה האישית.",
        "הצ'אט יכול להיות בכל שפה. גם 'חחחח', 'lol' ו-'kkkk' נספרים כצחוק.",
      ],
    },
    {
      id: "personas",
      q: "מי זה מקס, סבתא פנינה וד״ר נועם?",
      a: [
        "שלוש דמויות שכותבות את הדוח, כל אחת בסגנון שלה. מקס הוא הרוסטר: חד, מהיר ובלי פילטר. סבתא פנינה אוהבת אתכם מאוד, ובגלל זה אומרת לכם הכול, עם עוגה ורגשות אשם. ד״ר נועם קורא בין השורות ומסביר מה באמת קורה ביניכם.",
        "יש גם שלוש עוצמות: עקיצה עדינה, רוסט קלאסי, ובלי רחמים. גם בעוצמה הכי חזקה הדוח מצחיק, לא פוגעני: אין צחוק על מראה, מוצא, דת, מגדר או נטייה.",
      ],
    },
    {
      id: "privacy",
      q: "מה קורה לצ'אט שלי?",
      a: [
        "הקובץ נקרא ומנותח בדפדפן שלכם. כדי לכתוב את הדוח, אנחנו שולחים למודל ה-AI קטע מתומצת מהשיחה, אחרי שמספרי טלפון, מיילים, קישורים ומספרי כרטיסים הוסתרו. השרת שלנו לא שומר כלום.",
        "הדוח נשמר רק בדפדפן שלכם. כל הפרטים בדף הפרטיות.",
      ],
    },
    {
      id: "accuracy",
      q: "כמה זה מדויק?",
      a: [
        "המספרים מדויקים: הם מחושבים מכל הודעה בקובץ. הרוסט נכתב על ידי AI, שקורא את הראיות אבל לפעמים מגזים, מפספס אירוניה או בדיחה פנימית.",
        "במילים אחרות: זה בידור. אל תחליטו על פרידה, על פיטורים או על מי מקבל את הדירה של סבתא לפי הדוח.",
      ],
    },
    {
      id: "big",
      q: "הצ'אט שלנו ענק. זו בעיה?",
      a: ["ממש לא. מקבלים קבצים עד 200MB. בצ'אטים ענקיים ה-AI קורא מדגם מייצג (הרבה מהתקופה האחרונה ורגעי שיא מכל התקופות), והמספרים תמיד מחושבים מכל ההודעות."],
    },
    {
      id: "names",
      q: "למה צריך לסדר שמות?",
      a: ["בייצוא, כל אחד מופיע בשם ששמרתם אצלכם בטלפון: 'בסטי 💅', 'אמא ❤️' או סתם מספר. עם שמות פרטיים הרוסט יוצא חד ואישי יותר. ואם מישהו החליף מספר באמצע, אפשר לאחד את שני השמות לאדם אחד."],
    },
    {
      id: "share",
      q: "איך משתפים את הדוח?",
      a: [
        "לכל אחד בקבוצה יש כרטיס משלו, ויש גם כרטיס לפסק הדין של הקבוצה. אפשר לשלוח ישר לוואטסאפ, להוריד כתמונה או להעתיק כטקסט.",
        "הדוח עצמו לא נמצא בקישור ציבורי, הוא שמור רק אצלכם. משתפים את הכרטיסים, לא את הצ'אט.",
      ],
    },
    {
      id: "delete",
      q: "איך מוחקים דוח?",
      a: ["בעמוד 'הדוחות שלי': מחיקה של דוח אחד או של כולם בבת אחת. גם ניקוי נתוני האתר בדפדפן מוחק הכול. אין עותק אצלנו."],
    },
    {
      id: "devices",
      q: "אפשר לפתוח את הדוח בטלפון אחר?",
      a: ["לא, וזה בכוונה: הדוח נשמר רק בדפדפן שבו יצרתם אותו. רוצים להראות למישהו? שלחו לו את הכרטיסים."],
    },
    {
      id: "errors",
      q: "הקובץ שלי לא עובר. מה עושים?",
      a: [
        "בודקים שמדובר בקובץ שנוצר ב'ייצוא צ'אט' (ולא גיבוי של וואטסאפ, שמוצפן ואי אפשר לקרוא אותו). צריך לפחות 50 הודעות ושני אנשים שכותבים.",
        "אם הקובץ שמור ב-iCloud או בדרייב, ודאו שהוא הורד עד הסוף לפני שבוחרים אותו. בכל שגיאה נגיד לכם בדיוק מה לא עבד ואיך מתקנים.",
      ],
    },
  ],
  en: [
    {
      id: "apps",
      q: "Which chats can I upload?",
      a: [
        "WhatsApp for now: groups and one-on-one chats, exported from iPhone or Android. Upload the .txt file WhatsApp creates, or the .zip as is. The chat itself can be in any language, even mixed.",
        "Telegram, Instagram and friends are on the way. Meanwhile, WhatsApp is where all the drama happens anyway.",
      ],
    },
    {
      id: "export",
      q: "How do I export a WhatsApp chat?",
      a: ["It takes 30 seconds. The upload step also has an illustrated, step-by-step guide."],
      steps: [
        {
          title: "On iPhone",
          items: ["Open the chat", "Tap the group or contact name at the top", "Scroll all the way down", "'Export Chat'", "'Without Media'", "'Save to Files', then come back here and pick the file"],
        },
        {
          title: "On Android",
          items: ["Open the chat", "Tap ⋮ in the corner", "'More'", "'Export chat'", "'Without media'", "Save it to Files or Drive, or email it to yourself, then pick it here"],
        },
      ],
    },
    {
      id: "desktop",
      q: "Can I export from WhatsApp Web or Desktop?",
      a: ["No. WhatsApp only lets you export a chat from the phone. If you'd rather use a computer, export on your phone, email the file to yourself and download it there."],
    },
    {
      id: "media",
      q: "Should I include media?",
      a: ["No, and better not to. We only read text, and 'Without media' makes a small, fast file. Already exported with media? No problem: upload the .zip and we'll find the chat inside."],
    },
    {
      id: "time",
      q: "How long does it take?",
      a: ["Reading the file takes a few seconds. Writing the report usually takes one to three minutes, depending on the chat's size. We'll show you a few fun numbers from your chat while you wait; just keep the tab open."],
    },
    {
      id: "cost",
      q: "How much does it cost?",
      a: ["Nothing. The full report is free: no sign-up, no email, no 'unlock the rest for $9.99'."],
    },
    {
      id: "languages",
      q: "Which languages does it support?",
      a: [
        "The site is in Hebrew and English. The report itself comes in 19 languages, from Arabic and Russian to Japanese; you choose in the personalize step.",
        "The chat can be in any language. 'haha', 'חחחח' and 'kkkk' all count as laughs.",
      ],
    },
    {
      id: "personas",
      q: "Who are Max, Grandma Pnina and Dr. Noam?",
      a: [
        "Three narrators who write your report, each in their own style. Max is the roaster: sharp, fast, no filter. Grandma Pnina loves you dearly, which is exactly why she tells you everything, with cake and guilt. Dr. Noam reads between the lines and explains what's really going on between you.",
        "There are three heat levels too: gentle tease, classic roast, and no mercy. Even at full heat it's funny, not hurtful: no jokes about looks, origin, religion, gender or orientation.",
      ],
    },
    {
      id: "privacy",
      q: "What happens to my chat?",
      a: [
        "Your file is read and analyzed in your browser. To write the report, we send the AI model a condensed excerpt of the chat, after phone numbers, emails, links and card numbers are masked. Our server stores nothing.",
        "The report is saved in your browser only. Full details are on the privacy page.",
      ],
    },
    {
      id: "accuracy",
      q: "How accurate is it?",
      a: [
        "The numbers are exact: they're computed from every message in the file. The roast is written by AI, which reads the evidence but sometimes exaggerates, misses irony or an inside joke.",
        "In other words: it's entertainment. Please don't decide on a breakup, a firing or who inherits grandma's apartment based on it.",
      ],
    },
    {
      id: "big",
      q: "Our chat is huge. Is that a problem?",
      a: ["Not at all. Files up to 200MB are fine. For huge chats the AI reads a representative sample (plenty from the recent period plus highlights from every era), and the numbers are always computed from every message."],
    },
    {
      id: "names",
      q: "Why tidy up names?",
      a: ["In the export, everyone appears under the name saved in your phone: 'Bestie 💅', 'Mom ❤️' or just a number. With first names the roast gets sharper and more personal. And if someone switched numbers along the way, you can merge both into one person."],
    },
    {
      id: "share",
      q: "How do I share the report?",
      a: [
        "Every member gets their own card, plus a card for the group's verdict. Send them straight to WhatsApp, download them as images, or copy them as text.",
        "The report itself isn't on a public link; it lives only on your device. You share the cards, not the chat.",
      ],
    },
    {
      id: "delete",
      q: "How do I delete a report?",
      a: ["On the 'My reports' page: delete one report, or all of them at once. Clearing this site's data in your browser deletes everything too. There's no copy on our side."],
    },
    {
      id: "devices",
      q: "Can I open my report on another phone?",
      a: ["No, and that's on purpose: the report is saved only in the browser where you made it. Want to show someone? Send them the cards."],
    },
    {
      id: "errors",
      q: "My file won't go through. What now?",
      a: [
        "Make sure it's the file from 'Export chat' (not a WhatsApp backup, which is encrypted and unreadable). You need at least 50 messages and two people writing.",
        "If the file sits in iCloud or Drive, make sure it's fully downloaded before you pick it. For every error we'll tell you exactly what went wrong and how to fix it.",
      ],
    },
  ],
};

/** Which FAQ ids the landing teaser shows. */
export const FAQ_TEASER_IDS = ["export", "privacy", "cost", "accuracy"];

export interface PrivacyStep {
  icon: string;
  title: string;
  body: string;
}

export const privacyFlow: Record<Locale, PrivacyStep[]> = {
  he: [
    { icon: "📂", title: "בוחרים קובץ", body: "הקובץ נפתח בדפדפן שלכם, בקוד שרץ אצלכם במכשיר. הקובץ עצמו לא מועלה לשום מקום." },
    { icon: "🧮", title: "הניתוח קורה אצלכם", body: "פענוח ההודעות וכל המספרים (מי כותב, מתי, כמה 'חחח') מחושבים במכשיר שלכם." },
    { icon: "🕶️", title: "הסתרה", body: "לפני שמשהו יוצא מהמכשיר, אנחנו בונים קטע מתומצת מהשיחה ומסתירים בו מספרי טלפון, כתובות מייל, קישורים ומספרים שנראים כמו כרטיסי אשראי. השמות נשארים, אז אם צריך, תשנו אותם בשלב סידור השמות." },
    { icon: "✍️", title: "ה-AI כותב", body: "הקטע, סיכום המספרים וההגדרות שבחרתם נשלחים לשרת שלנו, שמעביר אותם לספק ה-AI של האתר (Google Gemini או Anthropic Claude) כדי לכתוב את הדוח. השרת לא שומר אותם ולא כותב אותם ללוג. שימו לב: בשכבה החינמית של Gemini, Google רשאית להשתמש בתוכן שנשלח אליה כדי לשפר את המוצרים שלה, וייתכן שבני אדם יקראו אותו." },
    { icon: "💾", title: "הדוח נשמר אצלכם", body: "הדוח, המספרים והקטע נשמרים באחסון של הדפדפן שלכם (IndexedDB), כדי שתוכלו לחזור לדוח ולשאול שאלות המשך. כל שאלת המשך נשלחת לאותו מסלול בדיוק." },
  ],
  en: [
    { icon: "📂", title: "You pick a file", body: "The file is opened in your browser, by code running on your device. The file itself is never uploaded anywhere." },
    { icon: "🧮", title: "Analysis happens on your device", body: "Parsing the messages and every number (who writes, when, how many 'haha's) is computed on your device." },
    { icon: "🕶️", title: "Redaction", body: "Before anything leaves your device, we build a condensed excerpt of the chat and mask phone numbers, email addresses, links and anything that looks like a card number. Names stay, so rename people in the tidy-up step if you like." },
    { icon: "✍️", title: "The AI writes", body: "The excerpt, the stats summary and your settings go to our server, which forwards them to the site's AI provider (Google Gemini or Anthropic Claude) to write the report. Our server doesn't store or log them. Note: on Gemini's free tier, Google may use what it receives to improve its products, and humans may review it." },
    { icon: "💾", title: "Your report stays with you", body: "The report, the stats and the excerpt are saved in your browser's storage (IndexedDB), so you can come back to it and ask follow-up questions. Each follow-up travels the exact same route." },
  ],
};

export const privacyDont: Record<Locale, string[]> = {
  he: [
    "אין חשבונות, אין הרשמה, ולא מבקשים מכם מייל או טלפון.",
    "אין לנו מסד נתונים: לא של צ'אטים, לא של דוחות ולא של משתמשים.",
    "לא מוכרים מידע, לא משתמשים בו לפרסום ולא מאמנים עליו מודלים.",
    "עוגייה אחת בלבד: זו שזוכרת אם בחרתם עברית או אנגלית.",
  ],
  en: [
    "No accounts, no sign-up, and we never ask for your email or phone.",
    "We have no database: not of chats, not of reports, not of users.",
    "We don't sell data, use it for ads, or train models on it.",
    "Exactly one cookie: the one that remembers whether you chose Hebrew or English.",
  ],
};
