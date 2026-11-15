import { defineDict } from "../index";
import type { Locale, PersonaId } from "../../types";

export const landingDict = defineDict({
  he: {
    hero_eyebrow: "AI קורא את הקבוצה שלכם",
    hero_title_a: "שמים את הקבוצה",
    hero_title_b: "שלכם על האש",
    hero_sub:
      "מעלים ייצוא של צ'אט מוואטסאפ ומקבלים רוסט חכם ומצחיק: פסק דין על הקבוצה, פרופיל לכל אחד ואחת, טקס פרסים, ומספרים שאף אחד לא ביקש לדעת. הכול מבוסס על מה שבאמת כתבתם.",
    hero_cta: "יאללה, על האש",
    hero_cta_secondary: "לראות דוח לדוגמה",
    hero_trust_free: "חינם לגמרי",
    hero_trust_signup: "בלי הרשמה",
    hero_trust_local: "הקובץ נקרא אצלכם בדפדפן",
    hero_sticker_laughs: "312 × חחח",
    hero_sticker_night: "02:47 הודעה אחרונה",
    hero_chat_aria: "הדגמה מונפשת של צ'אט קבוצתי שמסתיים ברוסט",
    hero_chat_typing: "מקליד/ה…",
    hero_chat_members: (p: { n: number }) => `${p.n} משתתפים`,
    hero_chat_pause: "עצירת ההדגמה",
    hero_chat_play: "הפעלת ההדגמה",

    types_kicker: "שלב ראשון",
    types_title: "על איזה צ'אט עושים רוסט?",
    types_sub: "כל צ'אט מקבל זווית אחרת. בחרו אחד ונתחיל.",

    how_kicker: "איך זה עובד",
    how_title: "שלושה צעדים ודוח ביד",
    how_1_title: "מייצאים את הצ'אט",
    how_1_body: "בוואטסאפ: ייצוא צ'אט ואז 'ללא מדיה'. לוקח חצי דקה, ויש לנו מדריך מצויר לאייפון ולאנדרואיד.",
    how_2_title: "מעלים אותו לכאן",
    how_2_body: "הקובץ נקרא בדפדפן שלכם. מסדרים שמות, מאחדים כפילויות ומסמנים מי מכם זה אתם.",
    how_3_title: "בוחרים מי יעשה לכם רוסט",
    how_3_body: "מקס, סבתא פנינה או ד״ר נועם. בוחרים כמה חזק לצלות ובאיזו שפה, ותוך דקה-שתיים יש דוח.",

    narrators_kicker: "הצוות",
    narrators_title: "מי יעשה לכם את הרוסט?",
    narrators_sub: "שלוש דמויות, שלושה סגנונות. כולן קראו הכול.",
    narrators_pick: (p: { name: string }) => `רוסט עם ${p.name}`,
    narrators_says: "אומר/ת למשל:",

    get_kicker: "מה בדוח",
    get_title: "דוח שלם. בחינם. בלי כוכביות.",
    get_sub: "לא עוד 'מי שלח הכי הרבה הודעות'. ככה נראה רוסט שמבוסס על ראיות.",
    get_verdict_title: "פסק הדין",
    get_verdict_body: "מה הקבוצה הזאת באמת, בשתי פסקאות ובלי הנחות.",
    get_verdict_kicker: "מקס על הקבוצה",
    get_verdict_sample: "שישה אנשים, שלוש שנים, טיול אחד שלא קרה.",
    get_profiles_title: "פרופיל לכל אחד ואחת",
    get_profiles_body: "כינוי, תפקיד בקבוצה, כוח-על, דגל אדום וציטוט שלא יישכח לעולם.",
    get_profiles_name: "נועה",
    get_profiles_nick: "שרת התכנונים שלא קורים",
    get_profiles_super: "כוח-על: סקר תוך 4 שניות",
    get_profiles_flag: "דגל אדום: 'נדבר על זה'",
    get_awards_title: "טקס פרסים",
    get_awards_body: "פרסים מה-AI ופרסים מהמספרים. מגיע לכולם משהו (לא תמיד טוב).",
    get_award_1: "פודקאסטר ההודעות הקוליות",
    get_award_2: "רוצח השיחות",
    get_award_3: "ינשוף הלילה",
    get_numbers_title: "המספרים",
    get_numbers_body: "מפת חום של כל יום, מי פותח שיחות, כמה מהר עונים, וכמה 'חחח' באמת נכתבו.",
    get_numbers_stat: "זמן תגובה חציוני",
    get_numbers_value: "4 דק׳",
    get_share_title: "כרטיסים לשיתוף",
    get_share_body: "כרטיס לכל אחד, מוכן לשליחה לקבוצה. בהצלחה עם התגובות.",
    get_share_card: "הדרמה קווין של הקבוצה",
    get_ask_title: "שאלות המשך",
    get_ask_body: "שואלים את הדמות כל דבר על הצ'אט, ומקבלים תשובה עם ראיות.",
    get_ask_q1: "מי הכי מתגעגע?",
    get_ask_q2: "מה קרה במרץ?",
    get_ask_q3: "דוח אישי על איתי",

    privacy_kicker: "פרטיות",
    privacy_title: "הצ'אט שלכם נשאר שלכם",
    privacy_sub: "בנינו את ChatRoast כך שנדע עליכם כמה שפחות. ככה זה עובד בפועל:",
    privacy_1_title: "נקרא בדפדפן",
    privacy_1_body: "הקובץ נפתח ומנותח אצלכם במכשיר. הקובץ עצמו לא מועלה לשום שרת.",
    privacy_2_title: "מוסתר לפני ה-AI",
    privacy_2_body: "כדי לכתוב את הדוח, קטע מתומצת מהשיחה נשלח למודל ה-AI, אחרי שמספרי טלפון, מיילים, קישורים ומספרי כרטיסים הוסתרו.",
    privacy_3_title: "אצלנו לא נשמר כלום",
    privacy_3_body: "אין לנו מסד נתונים. השרת מעביר את הקטע ל-AI, מחזיר לכם את הדוח, ושוכח.",
    privacy_4_title: "הדוחות רק אצלכם",
    privacy_4_body: "הדוח נשמר רק בדפדפן הזה, ולחיצה אחת ב'הדוחות שלי' מוחקת אותו.",
    privacy_link: "לכל הפרטים על פרטיות",

    faq_kicker: "שאלות",
    faq_title: "רגע, יש לי שאלה",
    faq_all: "לכל השאלות",

    final_title: "הקבוצה שלכם חיכתה לזה שנים.",
    final_sub: "היא פשוט עוד לא יודעת.",
    final_cta: "יאללה, על האש",
    final_note: "חינם · 2 דקות · בלי הרשמה",
  },
  en: {
    hero_eyebrow: "AI reads your group chat",
    hero_title_a: "Your group chat,",
    hero_title_b: "roasted to perfection",
    hero_sub:
      "Upload a WhatsApp chat export and get a sharp, funny roast: a verdict on the group, a profile for every member, an awards night, and numbers nobody asked for. All based on what you actually wrote.",
    hero_cta: "Roast my chat",
    hero_cta_secondary: "See a sample report",
    hero_trust_free: "Totally free",
    hero_trust_signup: "No sign-up",
    hero_trust_local: "Your file is read in your browser",
    hero_sticker_laughs: "312 × haha",
    hero_sticker_night: "Last message 02:47",
    hero_chat_aria: "Animated demo of a group chat that ends with a roast",
    hero_chat_typing: "typing…",
    hero_chat_members: (p: { n: number }) => `${p.n} members`,
    hero_chat_pause: "Pause the demo",
    hero_chat_play: "Play the demo",

    types_kicker: "Step one",
    types_title: "Which chat are we roasting?",
    types_sub: "Every kind of chat gets its own angle. Pick one to start.",

    how_kicker: "How it works",
    how_title: "Three steps to your report",
    how_1_title: "Export the chat",
    how_1_body: "In WhatsApp: Export chat, then 'Without media'. Takes 30 seconds, and we have an illustrated guide for iPhone and Android.",
    how_2_title: "Drop it here",
    how_2_body: "The file is read in your browser. Tidy up names, merge duplicates, and tell us which one is you.",
    how_3_title: "Pick your roaster",
    how_3_body: "Max, Grandma Pnina or Dr. Noam. Choose the heat and the language, and your report is ready in a minute or two.",

    narrators_kicker: "The cast",
    narrators_title: "Who's roasting you today?",
    narrators_sub: "Three narrators, three styles. All of them read everything.",
    narrators_pick: (p: { name: string }) => `Roast with ${p.name}`,
    narrators_says: "Sounds like:",

    get_kicker: "In the report",
    get_title: "The full report. Free. No asterisks.",
    get_sub: "Not just 'who sent the most messages'. This is what an evidence-based roast looks like.",
    get_verdict_title: "The verdict",
    get_verdict_body: "What this group really is, in two paragraphs, no discounts.",
    get_verdict_kicker: "Max on the group",
    get_verdict_sample: "Six people, three years, one trip that never happened.",
    get_profiles_title: "A profile for everyone",
    get_profiles_body: "A nickname, their role, a superpower, a red flag and the quote they'll never live down.",
    get_profiles_name: "Noa",
    get_profiles_nick: "Minister of Plans That Never Happen",
    get_profiles_super: "Superpower: a poll in 4 seconds",
    get_profiles_flag: "Red flag: 'let's discuss'",
    get_awards_title: "The awards",
    get_awards_body: "Awards from the AI and awards from the numbers. Everyone wins something (not always good).",
    get_award_1: "Voice-Note Podcaster",
    get_award_2: "Conversation Killer",
    get_award_3: "Night Owl",
    get_numbers_title: "The numbers",
    get_numbers_body: "A heatmap of every day, who starts conversations, reply speed, and how many 'haha's were truly typed.",
    get_numbers_stat: "Median reply time",
    get_numbers_value: "4 min",
    get_share_title: "Share cards",
    get_share_body: "A card for each person, ready to drop in the group. Good luck with the replies.",
    get_share_card: "The group's drama queen",
    get_ask_title: "Ask follow-ups",
    get_ask_body: "Ask the narrator anything about the chat and get answers backed by evidence.",
    get_ask_q1: "Who misses who most?",
    get_ask_q2: "What happened in March?",
    get_ask_q3: "Deep-dive on Ethan",

    privacy_kicker: "Privacy",
    privacy_title: "Your chat stays yours",
    privacy_sub: "We built ChatRoast to know as little about you as possible. Here's how it actually works:",
    privacy_1_title: "Read in your browser",
    privacy_1_body: "The file is opened and analyzed on your device. The file itself is never uploaded to a server.",
    privacy_2_title: "Redacted before the AI",
    privacy_2_body: "To write the report, a condensed excerpt of the chat goes to the AI model, after phone numbers, emails, links and card numbers are masked.",
    privacy_3_title: "Nothing kept on our side",
    privacy_3_body: "We have no database. Our server passes the excerpt to the AI, hands you the report, and forgets.",
    privacy_4_title: "Reports live on your device",
    privacy_4_body: "Your report is saved in this browser only, and one tap in 'My reports' deletes it.",
    privacy_link: "Read the full privacy details",

    faq_kicker: "Questions",
    faq_title: "Wait, I have a question",
    faq_all: "All questions",

    final_title: "Your group chat has been waiting for this.",
    final_sub: "It just doesn't know it yet.",
    final_cta: "Roast my chat",
    final_note: "Free · 2 minutes · No sign-up",
  },
});

/* ------------------------------------------------------------------ */
/* Hero demo chats (original sample conversations, one per narrator)   */
/* ------------------------------------------------------------------ */

export interface HeroChatLine {
  /** Index into `people`, or -1 for "you" (outgoing bubble). */
  from: number;
  text: string;
}

export interface HeroChat {
  title: string;
  emoji: string;
  people: string[];
  members: number;
  lines: HeroChatLine[];
  persona: PersonaId;
  /** System line when the narrator "joins". */
  joined: string;
  roast: string;
}

export const heroChats: Record<Locale, HeroChat[]> = {
  he: [
    {
      title: "אילת 2027 🌴",
      emoji: "🌴",
      people: ["נועה", "איתי", "דניאל"],
      members: 6,
      lines: [
        { from: 0, text: "מי בא סופ״ש הבא? 🙋‍♀️" },
        { from: 1, text: "אני בפנים!!" },
        { from: 1, text: "רגע יש לי חתונה" },
        { from: 2, text: "חחחחחחחחח שוב?" },
        { from: -1, text: "טוב אז 2027 ✈️" },
      ],
      persona: "max",
      joined: "מקס הצטרף לשיחה",
      roast: "פתחתם את הקבוצה לפני שלוש שנים בשביל טיול אחד. 412 הצבעות, אפס טיסות. איתי ביטל 9 פעמים, ובפעם העשירית הוא יגיד שיש לו חתונה של עצמו.",
    },
    {
      title: "משפחה 💛",
      emoji: "💛",
      people: ["אמא", "אורי", "מיכל"],
      members: 5,
      lines: [
        { from: 0, text: "מי מגיע לארוחת שישי?" },
        { from: 0, text: "הכנתי קובה 🥟" },
        { from: 1, text: "👍" },
        { from: 2, text: "אני אולי" },
        { from: 0, text: "'אולי' זה לא תשובה מיכל" },
      ],
      persona: "savta",
      joined: "סבתא פנינה הצטרפה לשיחה",
      roast: "אמא שלכם שאלה 46 פעמים מי מגיע לשישי וקיבלה 31 אגודלים. מאמי, אגודל זה לא 'אני אוהב אותך, אמא'. תתקשרו אליה. עכשיו. אני מחכה.",
    },
    {
      title: "רון 🌙",
      emoji: "🌙",
      people: ["רון"],
      members: 2,
      lines: [
        { from: 0, text: "את ערה?" },
        { from: -1, text: "כן למה" },
        { from: 0, text: "סתם" },
        { from: -1, text: "חח מה סתם" },
        { from: 0, text: "לא יודע. סתם" },
      ],
      persona: "doc",
      joined: "ד״ר נועם הצטרף לשיחה",
      roast: "רון כתב 'סתם' 38 פעמים אחרי 23:00. בשפה מקצועית קוראים לזה 'מתגעגע ומפחד להגיד'. אפשר לשבת עם זה רגע.",
    },
  ],
  en: [
    {
      title: "Eilat 2027 🌴",
      emoji: "🌴",
      people: ["Noa", "Ethan", "Dan"],
      members: 6,
      lines: [
        { from: 0, text: "who's in for next weekend? 🙋‍♀️" },
        { from: 1, text: "I'm in!!" },
        { from: 1, text: "wait I have a wedding" },
        { from: 2, text: "hahahahahaha again?" },
        { from: -1, text: "ok fine, 2027 ✈️" },
      ],
      persona: "max",
      joined: "Max joined the chat",
      roast: "You started this group three years ago for one trip. 412 polls, zero flights. Ethan has cancelled 9 times, and the tenth time he'll say it's his own wedding.",
    },
    {
      title: "Family 💛",
      emoji: "💛",
      people: ["Mom", "Uri", "Michelle"],
      members: 5,
      lines: [
        { from: 0, text: "who's coming for Friday dinner?" },
        { from: 0, text: "I made dumplings 🥟" },
        { from: 1, text: "👍" },
        { from: 2, text: "maybe me" },
        { from: 0, text: "'maybe' is not an answer Michelle" },
      ],
      persona: "savta",
      joined: "Grandma Pnina joined the chat",
      roast: "Your mother asked who's coming on Friday 46 times and got 31 thumbs-ups. Sweetheart, a thumbs-up is not 'I love you, Mom'. Call her. Now. I'll wait.",
    },
    {
      title: "Ron 🌙",
      emoji: "🌙",
      people: ["Ron"],
      members: 2,
      lines: [
        { from: 0, text: "you up?" },
        { from: -1, text: "yeah why" },
        { from: 0, text: "no reason" },
        { from: -1, text: "lol what no reason" },
        { from: 0, text: "idk. no reason" },
      ],
      persona: "doc",
      joined: "Dr. Noam joined the chat",
      roast: "Ron has typed 'no reason' 38 times after 11pm. Professionally, we call that 'misses you and is scared to say it'. Let's sit with that for a moment.",
    },
  ],
};
