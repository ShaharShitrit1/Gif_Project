/**
 * Synthetic WhatsApp exports (all names and content invented).
 * Invisible characters are written as escapes so every byte is reviewable:
 *   LRM = ‎ · RLM = ‏ · NNBSP =   · LRE/PDF = ‪/‬
 */

export const LRM = "‎";
export const RLM = "‏";
export const NNBSP = " ";

const pad = (n: number) => String(n).padStart(2, "0");

/** n filler lines alternating between senders, one minute apart, starting at a given hour. */
export function fillerIOS(day: string, names: string[], n: number, startHour = 12): string[] {
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const h = startHour + Math.floor(i / 60);
    const m = i % 60;
    out.push(`[${day}, ${pad(h)}:${pad(m)}:00] ${names[i % names.length]}: הודעה מספר ${i + 1}`);
  }
  return out;
}

export function fillerAndroid(datePart: string, names: string[], n: number, time: (i: number) => string): string[] {
  const out: string[] = [];
  for (let i = 0; i < n; i++) out.push(`${datePart}, ${time(i)} - ${names[i % names.length]}: filler ${i + 1}`);
  return out;
}

/* ------------------------------------------------------------------ */
/* iOS, Hebrew group, 24h with seconds                                 */
/* ------------------------------------------------------------------ */

export const IOS_HE_HEAD = [
  `${LRM}[01/06/2026, 09:00:00] החבר'ה 🌴: ${LRM}ההודעות והשיחות מוצפנות מקצה לקצה. אף אחד מחוץ לצ'אט הזה, אפילו לא WhatsApp, יכול לקרוא אותן או להאזין להן.`,
  `[01/06/2026, 09:00:00] החבר'ה 🌴: ${LRM}דנה יצרה את הקבוצה "החבר'ה"`,
  `[01/06/2026, 09:00:01] החבר'ה 🌴: ${LRM}דנה הוסיפה את יואב`,
  `[01/06/2026, 09:01:00] דנה כהן: בוקר טוב לכולם ☀️`,
  `[01/06/2026, 09:01:30] ~${NNBSP}יואב: בוקר אור`,
  `${LRM}[01/06/2026, 09:02:00] דנה כהן: ${LRM}image omitted`,
  `[01/06/2026, 09:03:00] ${"‪"}+972 50-123-4567${"‬"}: מי זה? חחחחח`,
  `[01/06/2026, 09:04:00] דנה כהן: שורה ראשונה`,
  `שורה שנייה`,
  ``,
  `שורה רביעית אחרי ריקה`,
  `[01/06/2026, 09:05:00] ~ יואב: ${LRM}This message was deleted.`,
  `[01/06/2026, 09:06:00] דנה כהן: תיקנתי את זה ${LRM}<ההודעה נערכה>`,
  `[01/06/2026, 09:07:00] ~ יואב: ${LRM}audio omitted`,
  `[01/06/2026, 09:08:00] ~ יואב: ${LRM}sticker omitted`,
  `[01/06/2026, 09:09:00] ~ יואב: ${LRM}GIF omitted`,
  `[01/06/2026, 09:10:00] ~ יואב: ${LRM}video omitted`,
  `[01/06/2026, 09:11:00] דנה כהן: ${LRM}סיכום.pdf • ${LRM}3 עמודים ${LRM}document omitted`,
  `[01/06/2026, 09:12:00] דנה כהן: ${LRM}Contact card omitted`,
  `[01/06/2026, 09:13:00] דנה כהן: ${LRM}POLL:`,
  `לאן יוצאים בשישי?`,
  `${LRM}OPTION: ים (2 votes)`,
  `${LRM}OPTION: פארק (0 votes)`,
  `[01/06/2026, 09:14:00] ~ יואב: ${LRM}Location: https://maps.google.com/?q=32.0853,34.7818`,
  `[01/06/2026, 09:15:00] ~ יואב: ${LRM}Missed voice call`,
  `[01/06/2026, 09:16:00] דנה כהן: ${LRM}view once photo omitted`,
  `[01/06/2026, 09:17:00] החבר'ה 🌴: ${LRM}דנה שינתה את נושא הקבוצה ל"החבר'ה 🌴"`,
  `[01/06/2026, 09:18:00] החבר'ה 🌴: ${LRM}יואב שינה את סמל הקבוצה`,
  `[01/06/2026, 09:19:00] החבר'ה 🌴: ${LRM}דנה הוסיפה את ${"‪"}+972 50-123-4567${"‬"}`,
  `[01/06/2026, 09:20:00] דנה כהן: ${LRM}You deleted this message.`,
  `[01/06/2026, 09:21:00] ~ יואב: עברתי ל-WhatsApp חדש, זה עובד?`,
];

export function iosHebrewGroup(fillerCount = 60): string {
  return [...IOS_HE_HEAD, ...fillerIOS("02/06/2026", ["דנה כהן", "~ יואב", "+972 50-123-4567"], fillerCount)].join("\n") + "\n";
}

/* ------------------------------------------------------------------ */
/* Android, English, 12h "M/D/YY, h:mm AM - "                          */
/* ------------------------------------------------------------------ */

export const ANDROID_EN_HEAD = [
  `6/14/26, 9:00 AM - Messages and calls are end-to-end encrypted. No one outside of this chat, not even WhatsApp, can read or listen to them. Tap to learn more.`,
  `6/14/26, 9:00 AM - Alex Rivera created group "Weekend Crew"`,
  `6/14/26, 9:00 AM - Alex Rivera added Sam Lee`,
  `6/14/26, 9:01 AM - Alex Rivera: Good morning!!`,
  `6/14/26, 9:02 AM - Sam Lee: <Media omitted>`,
  `6/14/26, 12:00 PM - Sam Lee: lunch? lol`,
    `6/14/26, 1:15 PM - Alex Rivera: This message was deleted`,
  `6/14/26, 1:16 PM - Alex Rivera: You deleted this message`,
  `6/14/26, 1:17 PM - Sam Lee: see you at 5 <This message was edited>`,
  `6/14/26, 1:18 PM - Jordan: Multi line`,
  `second line`,
  `6/14/26, 1:19 PM - Alex Rivera changed the subject from "Weekend Crew" to "Weekend Crew: Reloaded"`,
  `6/14/26, 1:20 PM - Jordan left`,
  `6/14/26, 1:21 PM - Alex Rivera changed this group's icon`,
  `6/14/26, 1:22 PM - Sam Lee changed their phone number to a new number. Tap to message or add the new number.`,
  `6/14/26, 1:23 PM - Alex Rivera: POLL:`,
  `Pizza or sushi?`,
  `OPTION: Pizza (2 votes)`,
  `OPTION: Sushi (1 vote)`,
  ``,
  `6/14/26, 1:24 PM - Sam Lee: location: https://maps.google.com/?q=40.7,-74.0`,
  `6/14/26, 1:25 PM - Alex Rivera: Missed video call`,
  `6/14/26, 1:26 PM - Sam Lee: null`,
  `6/14/26, 1:27 PM - Your security code with Sam Lee changed. Tap to learn more.`,
  `6/14/26, 1:28 PM - Alex Rivera turned on disappearing messages. New messages will disappear from this chat 7 days after they're sent.`,
];

export function androidEnglish(fillerCount = 60): string {
  return [
    ...ANDROID_EN_HEAD,
    `6/15/26, 12:30 AM - Jordan: night shift again`,
    `6/15/26, 12:05 PM - Jordan: noon`,
    ...fillerAndroid("6/15/26", ["Alex Rivera", "Sam Lee", "Jordan"], fillerCount, (i) => `${1 + Math.floor(i / 60)}:${pad(i % 60)}${"\u202F"}PM`),
  ].join("\n");
}

/* ------------------------------------------------------------------ */
/* Android, Hebrew, 24h "D.M.YYYY, HH:mm - "                           */
/* ------------------------------------------------------------------ */

export const ANDROID_HE_HEAD = [
  `5.3.2026, 08:00 - ${RLM}ההודעות והשיחות מוצפנות מקצה לקצה. לאף אחד מחוץ לצ'אט הזה, גם לא ל-WhatsApp, אין אפשרות לקרוא או להאזין להן. למידע נוסף יש להקיש.`,
  `5.3.2026, 08:00 - ${RLM}אמא יצרה את הקבוצה "משפחה 🏡"`,
  `5.3.2026, 08:01 - ${RLM}אמא הוסיפה את אבא`,
  `5.3.2026, 08:02 - אמא: בוקר טוב משפחה`,
  `5.3.2026, 08:03 - אבא: ${RLM}<המדיה לא נכללה>`,
  `5.3.2026, 08:04 - נועה: ההודעה הזו נמחקה`,
  `5.3.2026, 08:05 - נועה: מחקת את ההודעה הזו`,
  `5.3.2026, 08:06 - אבא: מגיע בשבע ${RLM}<ההודעה נערכה>`,
  `5.3.2026, 08:07 - ${RLM}נועה שינתה את נושא הקבוצה ל"משפחה: גרסה 2"`,
  `5.3.2026, 08:08 - ${RLM}אבא יצא`,
  `5.3.2026, 08:09 - ${RLM}אמא שינתה את תיאור הקבוצה`,
  `5.3.2026, 08:10 - נועה: IMG-20260305-WA0001.jpg (הקובץ מצורף)`,
  `תמונה מהטיול`,
  `5.3.2026, 08:11 - אבא: PTT-20260305-WA0002.opus (הקובץ מצורף)`,
  `5.3.2026, 08:12 - אמא: מיקום: https://maps.google.com/?q=31.77,35.21`,
  `5.3.2026, 08:13 - נועה: ${RLM}שיחה קולית שלא נענתה`,
  `5.3.2026, 08:14 - אבא: ${RLM}<מצורף: 00000099-STICKER-2026-03-05-08-14-00.webp>`,
  `13.3.2026, 23:59 - נועה: לילה טוב 🌙`,
];

export function androidHebrew(fillerCount = 60): string {
  return [
    ...ANDROID_HE_HEAD,
    ...fillerAndroid("14.3.2026", ["אמא", "אבא", "נועה"], fillerCount, (i) => `${pad(10 + Math.floor(i / 60))}:${pad(i % 60)}`),
  ].join("\r\n");
}

/* ------------------------------------------------------------------ */
/* ISO-ish "YYYY-MM-DD, HH:mm - "                                      */
/* ------------------------------------------------------------------ */

export function isoChat(n = 60): string {
  const lines: string[] = [];
  for (let i = 0; i < n; i++) {
    const day = 1 + Math.floor(i / 20);
    const k = i % 20;
    lines.push(`2026-02-${pad(day)}, ${pad(8 + Math.floor(k / 10))}:${pad((k % 10) * 5)} - ${i % 2 ? "Mia" : "Leo"}: message ${i}`);
  }
  return lines.join("\n");
}

/* ------------------------------------------------------------------ */
/* iOS English 12h with narrow no-break spaces                         */
/* ------------------------------------------------------------------ */

export function iosNarrowSpace(n = 60): string {
  const lines = [`[6/14/26, 9:05:12${NNBSP}PM] Chris: ${LRM}Messages and calls are end-to-end encrypted. Only people in this chat can read, listen to, or share them.`];
  for (let i = 0; i < n; i++) {
    const h24 = i % 24;
    const h = h24 % 12 || 12;
    const ap = h24 < 12 ? "AM" : "PM";
    lines.push(`[6/${15 + Math.floor(i / 24)}/26, ${h}:${pad(i % 60)}:00${NNBSP}${ap}] ${i % 2 ? "Chris" : "Pat"}: hello ${i}`);
  }
  return lines.join("\n");
}

/** Zip-export (iOS) chat text referencing attachments. */
export function iosZipChat(n = 60): string {
  const lines = [
    `[01/07/2026, 10:00:00] Beach Club: ${LRM}Messages and calls are end-to-end encrypted. No one outside of this chat, not even WhatsApp, can read or listen to them.`,
    `[01/07/2026, 10:00:05] Ron: ${LRM}<attached: 00000012-PHOTO-2026-07-01-10-00-05.jpg>`,
    `[01/07/2026, 10:00:06] Gal: ${LRM}<attached: 00000013-AUDIO-2026-07-01-10-00-06.opus>`,
    `[01/07/2026, 10:00:07] Ron: ${LRM}<attached: 00000014-VIDEO-2026-07-01-10-00-07.mp4>`,
    `[01/07/2026, 10:00:08] Gal: ${LRM}<attached: 00000015-STICKER-2026-07-01-10-00-08.webp>`,
    `[01/07/2026, 10:00:09] Ron: ${LRM}<attached: 00000016-GIF-2026-07-01-10-00-09.mp4>`,
    `[01/07/2026, 10:00:10] Gal: ${LRM}<attached: 00000017-Menu.pdf>`,
    `[01/07/2026, 10:00:11] Ron: ${LRM}<attached: 00000018-Dana.vcf>`,
  ];
  for (let i = 0; i < n; i++) lines.push(`[02/07/2026, 11:${pad(i % 60)}:00] ${i % 2 ? "Ron" : "Gal"}: msg ${i}`);
  return lines.join("\n");
}
