/**
 * Mock mode (MOCK_AI=1 or no ANTHROPIC_API_KEY): builds a complete, plausible
 * report from the request itself — real participants, numbers counted from the
 * transcript and digest, real quotes — and streams realistic status events.
 * Hebrew and English templates; other languages fall back to English.
 */

import type { AIReport, AskRequest, AskStreamEvent, MemberProfile, PersonaId, ReportAward, ReportRequest, ReportStreamEvent } from "../types";
import { requiredMemberIds } from "./schema";

/* ------------------------------------------------------------------ */
/* Reading the transcript back                                         */
/* ------------------------------------------------------------------ */

interface PersonFacts {
  id: string;
  name: string;
  messages: number;
  share: number;
  laughs: number;
  voice: number;
  media: number;
  stickers: number;
  night: number;
  questions: number;
  deleted: number;
  links: number;
  avgLen: number;
  quotes: string[];
  replyPartners: Map<string, number>;
}

interface ChatFacts {
  total: number;
  people: PersonFacts[];
  busiestDay: { date: string; count: number } | null;
  phrases: { phrase: string; count: number }[];
  firstAuthor: string | null;
  days: number;
}

const LINE_RE = /^(\d{2}):(\d{2}) (\S+): (.*)$/;
const LAUGH_RE = /(ח{3,}|ה{4,}|j[aj]{3,}|(?:ha){2,}|lo+l|lmao|😂|🤣|k{4,})/i;

function readFacts(req: ReportRequest | AskRequest): ChatFacts {
  const people = new Map<string, PersonFacts>();
  for (const p of req.participants)
    people.set(p.id, {
      id: p.id,
      name: p.name,
      messages: 0,
      share: 0,
      laughs: 0,
      voice: 0,
      media: 0,
      stickers: 0,
      night: 0,
      questions: 0,
      deleted: 0,
      links: 0,
      avgLen: 0,
      quotes: [],
      replyPartners: new Map(),
    });
  const perDay = new Map<string, number>();
  let day = "";
  let prevAuthor: string | null = null;
  let firstAuthor: string | null = null;
  const lenSum = new Map<string, number>();
  for (const line of req.transcript.split("\n")) {
    if (line.startsWith("## ")) {
      day = line.slice(3, 13);
      continue;
    }
    const m = LINE_RE.exec(line);
    if (!m) continue;
    const p = people.get(m[3]);
    if (!p) continue;
    let body = m[4];
    let n = 1;
    const rep = / ×(\d+)$/.exec(body);
    if (rep) {
      n = Number(rep[1]);
      body = body.slice(0, rep.index);
    }
    firstAuthor ??= p.id;
    p.messages += n;
    perDay.set(day, (perDay.get(day) ?? 0) + n);
    if (Number(m[1]) < 5) p.night += n;
    if (body.startsWith("[voice note]")) p.voice += n;
    else if (body.startsWith("[sticker]")) p.stickers += n;
    else if (/^\[(image|video|GIF|media)\]/.test(body)) p.media += n;
    else if (body.startsWith("[deleted]")) p.deleted += n;
    if (body.includes("[link:")) p.links += n;
    if (LAUGH_RE.test(body)) p.laughs += n;
    if (body.includes("?")) p.questions += n;
    if (prevAuthor && prevAuthor !== p.id) p.replyPartners.set(prevAuthor, (p.replyPartners.get(prevAuthor) ?? 0) + 1);
    prevAuthor = p.id;
    const clean = body.replace(/ \(edited\)$/, "");
    if (!clean.startsWith("[") && !clean.includes("↵")) {
      lenSum.set(p.id, (lenSum.get(p.id) ?? 0) + clean.length);
      if (clean.length >= 12 && clean.length <= 110 && !LAUGH_RE.test(clean.slice(0, 6))) p.quotes.push(clean);
    }
  }
  const total = req.participants.reduce((s, p) => s + p.messages, 0) || 1;
  for (const p of people.values()) {
    const fromReq = req.participants.find((x) => x.id === p.id)?.messages ?? p.messages;
    p.avgLen = p.messages ? (lenSum.get(p.id) ?? 0) / p.messages : 0;
    p.messages = Math.max(p.messages, fromReq);
    p.share = fromReq / total;
  }
  let busiestDay: ChatFacts["busiestDay"] = null;
  for (const [date, count] of perDay) if (!busiestDay || count > busiestDay.count) busiestDay = { date, count };
  const phrases: ChatFacts["phrases"] = [];
  const pm = /Repeated phrases[^:]*: (.*)$/m.exec(req.statsDigest);
  if (pm) for (const x of pm[1].matchAll(/"([^"]+)"×(\d+)/g)) phrases.push({ phrase: x[1], count: Number(x[2]) });
  const totalMessages = "transcriptMeta" in req ? req.transcriptMeta.totalMessages : total;
  return {
    total: totalMessages,
    people: [...people.values()].sort((a, b) => b.messages - a.messages),
    busiestDay,
    phrases,
    firstAuthor,
    days: perDay.size,
  };
}

function bestQuote(p: PersonFacts, used: Set<string>): string {
  const scored = p.quotes
    .filter((q) => !used.has(q))
    .map((q) => ({ q, s: (/[!?]/.test(q) ? 2 : 0) + (/\p{Extended_Pictographic}/u.test(q) ? 1 : 0) - Math.abs(q.length - 45) / 30 }))
    .sort((a, b) => b.s - a.s);
  const q = scored[0]?.q ?? p.quotes[0] ?? "…";
  used.add(q);
  return q;
}

/* ------------------------------------------------------------------ */
/* Templates                                                           */
/* ------------------------------------------------------------------ */

type Lang = "he" | "en";
type Trait = "chatterbox" | "podcaster" | "nightOwl" | "laughTrack" | "ghost" | "mediaDumper" | "interrogator" | "deleter" | "steady";

interface TraitText {
  nickname: string;
  archetype: string;
  emoji: string;
  roast: string;
  superpower: string;
  redFlag: string;
  advice: string;
  award: string;
}

// Placeholders: {name} {n} {share} {laughs} {voice} {media} {night} {q} {deleted} {quote}
const T: Record<Lang, Record<Trait, TraitText>> = {
  he: {
    chatterbox: {
      nickname: "מכונת ההודעות",
      archetype: "הרדיו של הקבוצה",
      emoji: "📢",
      roast: "{n} הודעות, {share} מכל מה שנכתב פה. אצל {name} אין מחשבה שלא הפכה להודעה, ואין הודעה שלא הפכה לשלוש. הציטוט שמסכם את התקופה: \"{quote}\". שאר הקבוצה בעיקר מנסה להדביק פערים, ונכשלת.",
      superpower: "להחיות קבוצה מתה בהודעה אחת. או בשתים־עשרה.",
      redFlag: "המושג \"הודעה אחת מסכמת\" עוד לא הגיע לכאן.",
      advice: "לפעמים שתיקה היא גם תגובה. תנסו את זה פעם אחת, רק בשביל המדע.",
      award: "פרס שידור רציף",
    },
    podcaster: {
      nickname: "הפודקאסט",
      archetype: "שדרן הבית",
      emoji: "🎙️",
      roast: "{voice} הודעות קוליות. זה לא צ'אט, זה פיד של פודקאסט שאף אחד לא נרשם אליו. כשכבר מגיע טקסט, הוא נראה ככה: \"{quote}\". נשמע כמו תקציר של הפרק הבא.",
      superpower: "להפוך \"כן\" להקלטה של שלוש דקות.",
      redFlag: "\"רגע, אני אקליט\".",
      advice: "יש כפתור מקלדת. הוא לא נושך.",
      award: "פרס האוזניות השחוקות",
    },
    nightOwl: {
      nickname: "משמרת לילה",
      archetype: "השומר של 3 בלילה",
      emoji: "🦉",
      roast: "{night} הודעות בין חצות לחמש בבוקר. כשכולם ישנים, הקבוצה נשארת בידיים של {name}, כמו שומר לילה במוזיאון ריק. מהשעות הקטנות: \"{quote}\". אף אחד לא ענה. כולם ישנו.",
      superpower: "ערנות מלאה כשצריך. ובעיקר כשלא צריך.",
      redFlag: "ההודעה הראשונה של היום נשלחת לפני השקיעה של אתמול.",
      advice: "שינה זה לא מיתוס. תבדקו.",
      award: "פרס ינשוף הזהב",
    },
    laughTrack: {
      nickname: "פס הקול של הצחוקים",
      archetype: "הקהל באולפן",
      emoji: "😂",
      roast: "{laughs} צחוקים מתועדים. בכל פעם שמישהו כאן כותב משהו, אצל {name} כבר מחכה \"חחחח\", לפעמים עוד לפני שהבדיחה נגמרה. כשבכל זאת יש משפט מלא: \"{quote}\". נדיר כמו ליקוי חמה.",
      superpower: "לגרום לכל אחד להרגיש סטנדאפיסט.",
      redFlag: "הצחוק מגיע גם לבדיחות שלא היו.",
      advice: "מותר גם לכתוב את הבדיחה בעצמך. אנחנו מאמינים בך.",
      award: "פרס הצוחק המקצועי",
    },
    ghost: {
      nickname: "רוח הרפאים",
      archetype: "חבר כבוד",
      emoji: "👻",
      roast: "{n} הודעות בסך הכול. ארכיאולוגים מצאו פחות עקבות מתרבויות שלמות. כשכבר מגיעה הופעה, היא נראית ככה: \"{quote}\". ואז עוד שבועיים של שקט מסתורי.",
      superpower: "נוכחות מסתורית. כולם יודעים שיש מישהו שקורא.",
      redFlag: "ה\"וי\" הכחול הכי שקט בצפון.",
      advice: "הקבוצה לא תנשך. כמעט אף פעם.",
      award: "פרס הנינג'ה",
    },
    mediaDumper: {
      nickname: "הגלריה",
      archetype: "ספק התוכן",
      emoji: "📸",
      roast: "{media} תמונות, סרטונים ו־GIF־ים. אצל {name} כל רגש מגיע עם קובץ מצורף. במקרים נדירים יש גם מילים: \"{quote}\". הגלריה בטלפון של כולם מבקשת חופש.",
      superpower: "תיעוד מלא. אם זה לא צולם, זה לא קרה.",
      redFlag: "הזיכרון בטלפון של כולם מלא, ויש אשמה אחת.",
      advice: "לא כל ארוחה צריכה תיעוד. רוב הארוחות דווקא כן.",
      award: "פרס האוצר הדיגיטלי",
    },
    interrogator: {
      nickname: "החוקר הראשי",
      archetype: "מחלקת שאלות",
      emoji: "❓",
      roast: "{q} שאלות. לא הודעות, שאלות. אצל {name} הקבוצה מתנהלת כמו מסיבת עיתונאים שאף אחד לא הגיע אליה. דוגמה מייצגת: \"{quote}\". התשובות, כרגיל, בדרך.",
      superpower: "לשאול את מה שכולם חושבים ואף אחד לא כותב.",
      redFlag: "\"??\" אחרי שלוש דקות בלי תשובה.",
      advice: "לפעמים התשובה היא שקט. וזה בסדר. בערך.",
      award: "פרס סימן השאלה",
    },
    deleter: {
      nickname: "מחלקת הגריסה",
      archetype: "העורך הסודי",
      emoji: "🗑️",
      roast: "{deleted} הודעות שנמחקו. מה היה כתוב שם? אף אחד לא יודע, וזה מה שמפחיד. מה ששרד את הצנזורה: \"{quote}\". ככה זה נשמע כשהעורך מאשר.",
      superpower: "יכולת לחזור בו בזמן אמת.",
      redFlag: "\"ההודעה נמחקה\" זה כבר סגנון חיים.",
      advice: "תכתבו פעם אחת, תשלחו פעם אחת. החיים קצרים.",
      award: "פרס הגומי",
    },
    steady: {
      nickname: "עמוד התווך",
      archetype: "השפוי התורן",
      emoji: "🧱",
      roast: "{n} הודעות ({share}), בלי דרמה ובלי הקלטות של ארבע דקות. בקבוצה הזאת זה כמעט חשוד. הציטוט שמוכיח שיש כאן מבוגר אחראי: \"{quote}\". מישהו צריך להחזיק את המקום, ואף אחד לא אמר תודה.",
      superpower: "יציבות. בקבוצה הזאת זה כוח־על אמיתי.",
      redFlag: "שפיות ברמה שכבר מעוררת שאלות.",
      advice: "מותר גם להשתגע קצת. הקבוצה תעמוד בזה.",
      award: "פרס המבוגר האחראי",
    },
  },
  en: {
    chatterbox: {
      nickname: "The Message Machine",
      archetype: "The group's radio station",
      emoji: "📢",
      roast: "{n} messages, {share} of everything ever said here. {name} has never had a thought that didn't become a message, or a message that didn't become three. The quote that sums it up: \"{quote}\". Everyone else is just trying to catch up.",
      superpower: "Can revive a dead chat with one message. Or twelve.",
      redFlag: "Has never heard of \"one message that says it all\".",
      advice: "Silence is also a reply. Try it once, for science.",
      award: "Non-Stop Broadcast Award",
    },
    podcaster: {
      nickname: "The Podcast",
      archetype: "Resident broadcaster",
      emoji: "🎙️",
      roast: "{voice} voice notes. This isn't a chat, it's a podcast feed nobody subscribed to. When text does show up, it looks like this: \"{quote}\". Sounds like the trailer for the next episode.",
      superpower: "Turns \"yes\" into a three-minute recording.",
      redFlag: "\"Hang on, let me record it.\"",
      advice: "There's a keyboard button. It doesn't bite.",
      award: "Worn-Out Headphones Award",
    },
    nightOwl: {
      nickname: "The Night Shift",
      archetype: "3 a.m. security guard",
      emoji: "🦉",
      roast: "{night} messages between midnight and 5 a.m. While everyone sleeps, {name} keeps the chat running like a night guard in an empty museum. From the small hours: \"{quote}\". Nobody answered. Everybody was asleep.",
      superpower: "Always awake when needed. Mostly when not.",
      redFlag: "First message of the day is sent before yesterday ends.",
      advice: "Sleep is not a myth. Look it up.",
      award: "Golden Owl Award",
    },
    laughTrack: {
      nickname: "The Laugh Track",
      archetype: "Live studio audience",
      emoji: "😂",
      roast: "{laughs} documented laughs. Whenever anyone types anything, {name} is ready with a \"hahaha\", sometimes before the joke ends. When a full sentence does appear: \"{quote}\". Rare as an eclipse.",
      superpower: "Makes everyone feel like a stand-up comedian.",
      redFlag: "Laughs at jokes that weren't made yet.",
      advice: "You're allowed to write the joke yourself. We believe in you.",
      award: "Professional Laugher Award",
    },
    ghost: {
      nickname: "The Ghost",
      archetype: "Honorary member",
      emoji: "👻",
      roast: "{n} messages in total. Archaeologists have found more traces of entire civilisations. When an appearance does happen, it looks like this: \"{quote}\". Then two more weeks of mysterious silence.",
      superpower: "Mysterious presence. Everyone knows someone is reading.",
      redFlag: "The quietest blue tick in the group.",
      advice: "The group won't bite. Almost never.",
      award: "Ninja Award",
    },
    mediaDumper: {
      nickname: "The Gallery",
      archetype: "Content supplier",
      emoji: "📸",
      roast: "{media} photos, videos and GIFs. With {name}, every feeling comes with an attachment. In rare cases there are also words: \"{quote}\". Everyone's camera roll is asking for a holiday.",
      superpower: "Full documentation. If it wasn't filmed, it didn't happen.",
      redFlag: "Everyone's storage is full, and there's one suspect.",
      advice: "Not every meal needs a photo shoot. Most do, though.",
      award: "Digital Curator Award",
    },
    interrogator: {
      nickname: "The Chief Investigator",
      archetype: "Department of questions",
      emoji: "❓",
      roast: "{q} questions. Not messages, questions. {name} runs this chat like a press conference nobody showed up to. A representative sample: \"{quote}\". The answers, as usual, are on their way.",
      superpower: "Asks what everyone is thinking and nobody types.",
      redFlag: "\"??\" after three minutes without a reply.",
      advice: "Sometimes the answer is silence. And that's fine. Sort of.",
      award: "Question Mark Award",
    },
    deleter: {
      nickname: "The Shredder",
      archetype: "Secret editor",
      emoji: "🗑️",
      roast: "{deleted} deleted messages. What did they say? Nobody knows, and that's the scary part. What survived the censor: \"{quote}\". That's what it sounds like when the editor approves.",
      superpower: "Can take it back in real time.",
      redFlag: "\"This message was deleted\" is a lifestyle now.",
      advice: "Write once, send once. Life is short.",
      award: "Eraser Award",
    },
    steady: {
      nickname: "The Load-Bearing Wall",
      archetype: "Designated sane one",
      emoji: "🧱",
      roast: "{n} messages ({share}), no drama and no four-minute recordings. In this group that's almost suspicious. The quote proving there's an adult in the room: \"{quote}\". Someone has to hold the place up, and nobody ever said thanks.",
      superpower: "Stability. In this group that's a real superpower.",
      redFlag: "So sane it raises questions.",
      advice: "You're allowed to lose it a little. The group can take it.",
      award: "Responsible Adult Award",
    },
  },
};

interface PersonaText {
  title: (f: ChatFacts, group: string) => string;
  subtitle: (total: string) => string;
  vibe: { emoji: string; label: string };
  verdictOpen: (f: ChatFacts, top: PersonFacts, quiet: PersonFacts) => string;
  verdictClose: string;
  closing: string;
  advice: string;
}

const P: Record<Lang, Record<PersonaId, PersonaText>> = {
  he: {
    max: {
      title: (f, g) => `${g}: ${f.people.length} אנשים, ${fmt(f.total, "he")} הודעות ואפס החלטות`,
      subtitle: (t) => `קראתי את כל ${t} ההודעות שלכם. חלק מהן פעמיים, לצערי.`,
      vibe: { emoji: "🔥", label: "כאוס עם וי כחול" },
      verdictOpen: (f, top, quiet) =>
        `${fmt(f.total, "he")} הודעות. ${pctTxt(top.share)} מהן שייכות ל־${top.name}, ול־${quiet.name} יש ${quiet.messages} בסך הכול. זאת לא קבוצה, זאת תוכנית אירוח: אחד מדבר, וכל השאר מהנהנים ב״חחח״.`,
      verdictClose: "ובכל זאת אתם פה, כל יום, עונים אחד לשני באחת בלילה. זה לא צ'אט. זה סוג של משפחה, עם פחות ארוחות שישי ויותר סטיקרים.",
      closing: "סגרתי את הצ'אט. אתם לא תצליחו.",
      advice: "במקומכם הייתי קובע תאריך אחד, בלי סקר, בלי \"נראה\", ומי שלא מגיע מביא קינוח לפעם הבאה. ככה עושים את זה.",
    },
    savta: {
      title: (f, g) => `${g}: ${fmt(f.total, "he")} הודעות ואף אחד לא התקשר לסבתא`,
      subtitle: (t) => `קראתי את כל ${t} ההודעות, עם המשקפיים, חמודים שלי. אני לא אומרת כלום, רק אומרת.`,
      vibe: { emoji: "🍲", label: "חמים, רועש ולא אכלתם" },
      verdictOpen: (f, top, quiet) =>
        `${fmt(f.total, "he")} הודעות, חמודים שלי. ${pctTxt(top.share)} מהן של ${top.name}, שיהיה בריא, ושל ${quiet.name} רק ${quiet.messages}. אני לא אומרת כלום, אבל גם לי אף אחד לא עונה ככה.`,
      verdictClose: "אבל אני רואה איך אתם עונים אחד לשני גם בשעות הקטנות של הלילה, ואני רגועה. נו, כמעט רגועה. תאכלו משהו.",
      closing: "ועכשיו כולם לישון. ואל תשכחו להתקשר לאמא.",
      advice: "במקומכם הייתי עושה ארוחה אחת בחודש, אצל מי שיש לו סלון הכי גדול, בלי טלפונים על השולחן. ואני מביאה עוגה.",
    },
    doc: {
      title: (f, g) => `${g}: תיק מטופל עם ${fmt(f.total, "he")} פגישות`,
      subtitle: (t) => `עברתי על ${t} ההודעות שלכם. האבחנה מוכנה, וההמלצות לא יבוצעו.`,
      vibe: { emoji: "🛋️", label: "תלות הדדית בריאה, בערך" },
      verdictOpen: (f, top, quiet) =>
        `תצפית ראשונית: ${fmt(f.total, "he")} הודעות, בהתפלגות לא שוויונית בעליל. ${top.name}: ${pctTxt(top.share)} מהשיח. ${quiet.name}: ${quiet.messages} הודעות בלבד. אבחנה: תסמונת \"אני רק קורא\" בשילוב הפרעת שידור כפייתית.`,
      verdictClose: "ועם זאת, הנתונים מצביעים על מערכת יחסים יציבה: אתם חוזרים לכאן כל יום. בשפה מקצועית קוראים לזה עוגן. בשפה פשוטה, חברים.",
      closing: "הפגישה הסתיימה. החשבונית בדרך.",
      advice: "המלצה טיפולית: פעם בשבוע הודעה אחת בלי בדיחה, רק \"מה שלומך באמת?\". מינון נמוך, השפעה גבוהה.",
    },
  },
  en: {
    max: {
      title: (f, g) => `${g}: ${f.people.length} people, ${fmt(f.total, "en")} messages, zero decisions`,
      subtitle: (t) => `I read all ${t} of your messages. Some of them twice, unfortunately.`,
      vibe: { emoji: "🔥", label: "Chaos with blue ticks" },
      verdictOpen: (f, top, quiet) =>
        `${fmt(f.total, "en")} messages. ${top.name} wrote ${pctTxt(top.share)} of them single-handedly, while ${quiet.name} settled for ${quiet.messages}. This isn't a group chat, it's a talk show where one person talks and everyone else nods along with "haha".`,
      verdictClose: "And yet here you are, every day, answering each other at 1 a.m. It's not a chat. It's a family, with fewer Friday dinners and more stickers.",
      closing: "I closed the chat. You won't manage to.",
      advice: "If I were you, I'd pick one date. No poll, no \"we'll see\", and whoever doesn't show brings dessert next time. That's how it's done.",
    },
    savta: {
      title: (f, g) => `${g}: ${fmt(f.total, "en")} messages and nobody called Grandma`,
      subtitle: (t) => `I read all ${t} messages, with my glasses on, my darlings. I'm not saying anything, I'm just saying.`,
      vibe: { emoji: "🍲", label: "Warm, loud, hasn't eaten" },
      verdictOpen: (f, top, quiet) =>
        `${fmt(f.total, "en")} messages, my darlings. ${top.name} wrote ${pctTxt(top.share)} of them, bless, and ${quiet.name} only ${quiet.messages}. I'm not saying anything, but nobody answers me like that either.`,
      verdictClose: "But I see how you answer each other even in the small hours, and I'm calm. Well, almost calm. Eat something.",
      closing: "Now everyone to bed. And don't forget to call your mother.",
      advice: "If I were you I'd have one dinner a month, at whoever has the biggest living room, no phones on the table. I'll bring cake.",
    },
    doc: {
      title: (f, g) => `${g}: a case file with ${fmt(f.total, "en")} sessions`,
      subtitle: (t) => `I went through ${t} of your messages. The diagnosis is ready; the recommendations will be ignored.`,
      vibe: { emoji: "🛋️", label: "Healthy codependency, roughly" },
      verdictOpen: (f, top, quiet) =>
        `Initial observation: ${fmt(f.total, "en")} messages, distributed with striking inequality. ${top.name} accounts for ${pctTxt(top.share)} of the discourse, ${quiet.name} for just ${quiet.messages} messages. Diagnosis: "just reading" syndrome with compulsive broadcasting disorder.`,
      verdictClose: "That said, the data points to a stable attachment: you come back here every day. Clinically, that's an anchor. In plain words, friends.",
      closing: "Session's over. The invoice is on its way.",
      advice: "Treatment plan: once a week, one message with no joke in it, just \"how are you, really?\". Low dose, high impact.",
    },
  },
};

const MONTHS: Record<Lang, string[]> = {
  he: ["בינואר", "בפברואר", "במרץ", "באפריל", "במאי", "ביוני", "ביולי", "באוגוסט", "בספטמבר", "באוקטובר", "בנובמבר", "בדצמבר"],
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
};

function fmt(n: number, lang: Lang): string {
  return n.toLocaleString(lang === "he" ? "he-IL" : "en-US");
}
function pctTxt(x: number): string {
  return `${Math.round(x * 100)}%`;
}
function fill(s: string, vars: Record<string, string | number>): string {
  return s.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ""));
}
function langOf(language: string): Lang {
  return /hebrew|עברית|^he$/i.test(language) ? "he" : "en";
}
function dayText(date: string, lang: Lang): string {
  const [, m, d] = date.split("-").map(Number);
  return lang === "he" ? `${d} ${MONTHS.he[m - 1]}`.replace(/ ב/, " ב") : `${MONTHS.en[m - 1]} ${d}`;
}

/* ------------------------------------------------------------------ */
/* Report                                                              */
/* ------------------------------------------------------------------ */

function assignTraits(people: PersonFacts[]): Map<string, Trait> {
  const out = new Map<string, Trait>();
  const metric: [Trait, (p: PersonFacts) => number][] = [
    ["chatterbox", (p) => p.share],
    ["podcaster", (p) => (p.voice >= 3 ? p.voice / Math.max(1, p.messages) : 0)],
    ["nightOwl", (p) => (p.night >= 3 ? p.night / Math.max(1, p.messages) : 0)],
    ["laughTrack", (p) => (p.laughs >= 5 ? p.laughs / Math.max(1, p.messages) : 0)],
    ["mediaDumper", (p) => (p.media >= 5 ? p.media / Math.max(1, p.messages) : 0)],
    ["deleter", (p) => (p.deleted >= 3 ? p.deleted : 0)],
    ["interrogator", (p) => (p.questions >= 5 ? p.questions / Math.max(1, p.messages) : 0)],
    ["ghost", (p) => (people.length > 2 ? 1 / Math.max(1, p.messages) : 0)],
  ];
  const taken = new Set<Trait>();
  for (const [trait, f] of metric) {
    const ranked = people.filter((p) => !out.has(p.id)).sort((a, b) => f(b) - f(a));
    if (ranked.length && f(ranked[0]) > 0) {
      out.set(ranked[0].id, trait);
      taken.add(trait);
    }
  }
  for (const p of people) if (!out.has(p.id)) out.set(p.id, "steady");
  return out;
}

export function buildMockReport(req: ReportRequest): AIReport {
  const lang = langOf(req.language);
  const facts = readFacts(req);
  const required = new Set(requiredMemberIds(req.participants));
  const people = facts.people.filter((p) => required.has(p.id));
  const traits = assignTraits(people);
  const used = new Set<string>();
  const top = facts.people[0];
  const quiet = facts.people[facts.people.length - 1];
  const persona = P[lang][req.personaId];
  const group = req.groupName || (lang === "he" ? "הקבוצה" : "The group");

  const members: MemberProfile[] = people.map((p) => {
    const t = T[lang][traits.get(p.id) ?? "steady"];
    const quote = bestQuote(p, used);
    const vars = {
      name: p.name,
      n: fmt(p.messages, lang),
      share: pctTxt(p.share),
      laughs: p.laughs,
      voice: p.voice,
      media: p.media + p.stickers,
      night: p.night,
      q: p.questions,
      deleted: p.deleted,
      quote,
    };
    const partner = [...p.replyPartners.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    return {
      id: p.id,
      nickname: t.nickname,
      archetype: t.archetype,
      emoji: t.emoji,
      roast: fill(t.roast, vars),
      superpower: t.superpower,
      redFlag: t.redFlag,
      signatureQuote: quote,
      advice: t.advice,
      closestTo: partner && partner !== p.id ? partner : null,
    };
  });

  const awards: ReportAward[] = people.slice(0, 8).map((p) => {
    const t = T[lang][traits.get(p.id) ?? "steady"];
    const reason =
      lang === "he"
        ? `${p.name}: ${fmt(p.messages, lang)} הודעות, ${p.laughs} צחוקים, ${p.voice} הודעות קוליות. המספרים לא משקרים.`
        : `${p.name}: ${fmt(p.messages, lang)} messages, ${p.laughs} laughs, ${p.voice} voice notes. Numbers don't lie.`;
    return { emoji: t.emoji, title: t.award, winnerId: p.id, reason };
  });
  while (awards.length < 5 && people.length) {
    const p = people[awards.length % people.length];
    awards.push({
      emoji: "🏅",
      title: lang === "he" ? "פרס ההשתתפות" : "Participation Award",
      winnerId: p.id,
      reason: lang === "he" ? `על ${fmt(p.messages, lang)} הודעות של נוכחות.` : `For ${fmt(p.messages, lang)} messages of showing up.`,
    });
  }

  const laughsTotal = facts.people.reduce((s, p) => s + p.laughs, 0);
  const voiceTotal = facts.people.reduce((s, p) => s + p.voice, 0);
  const nightTotal = facts.people.reduce((s, p) => s + p.night, 0);
  const opener = facts.people.find((p) => p.id === facts.firstAuthor) ?? top;
  const scoreBase = Math.min(97, 40 + Math.round((laughsTotal / Math.max(1, facts.total)) * 200));
  const scores =
    lang === "he"
      ? [
          { key: "chaos", label: "מדד הכאוס", emoji: "🌪️", value: scoreBase, comment: `${laughsTotal} צחוקים ו־${voiceTotal} הודעות קוליות. אף אחד לא מבין מה קורה, וכולם נהנים.` },
          { key: "night_shift", label: "פעילות אחרי חצות", emoji: "🌙", value: Math.min(95, 10 + nightTotal * 3), comment: `${nightTotal} הודעות בשעות שבהן אנשים נורמליים ישנים.` },
          { key: "balance", label: "שוויון בדיבור", emoji: "⚖️", value: Math.max(5, Math.round((1 - (top.share - quiet.share)) * 70)), comment: `${top.name} עם ${pctTxt(top.share)}, ${quiet.name} עם ${pctTxt(quiet.share)}. דמוקרטיה, אבל לא ממש.` },
          { key: "loyalty", label: "נאמנות לקבוצה", emoji: "🤝", value: Math.min(98, 55 + facts.days), comment: `${facts.days} ימים פעילים בתמליל. אתם לא הולכים לשום מקום.` },
        ]
      : [
          { key: "chaos", label: "Chaos index", emoji: "🌪️", value: scoreBase, comment: `${laughsTotal} laughs and ${voiceTotal} voice notes. Nobody knows what's going on, everyone's having fun.` },
          { key: "night_shift", label: "After-midnight activity", emoji: "🌙", value: Math.min(95, 10 + nightTotal * 3), comment: `${nightTotal} messages at hours when normal people sleep.` },
          { key: "balance", label: "Airtime equality", emoji: "⚖️", value: Math.max(5, Math.round((1 - (top.share - quiet.share)) * 70)), comment: `${top.name} at ${pctTxt(top.share)}, ${quiet.name} at ${pctTxt(quiet.share)}. A democracy, technically.` },
          { key: "loyalty", label: "Group loyalty", emoji: "🤝", value: Math.min(98, 55 + facts.days), comment: `${facts.days} active days in the transcript. You're not going anywhere.` },
        ];

  const bd = facts.busiestDay;
  const turningPoint = bd
    ? lang === "he"
      ? { when: dayText(bd.date, lang), title: "היום שבו כולם נזכרו שיש קבוצה", description: `${bd.count} הודעות ביום אחד. משהו קרה שם, וכולם היו חייבים להגיד עליו משהו, בדרך כלל ״חחחח״. מאז הקבוצה לא אותה קבוצה.` }
      : { when: dayText(bd.date, lang), title: "The day everyone remembered the group exists", description: `${bd.count} messages in one day. Something happened, and everyone had to say something about it, usually "hahaha". The group hasn't been the same since.` }
    : null;

  const insideJokes = facts.phrases.slice(0, 3).map((x) => ({
    phrase: x.phrase,
    explanation:
      lang === "he"
        ? `נאמר ${x.count} פעמים. בשלב הזה זה כבר לא משפט, זה המנון.`
        : `Said ${x.count} times. At this point it's not a phrase, it's an anthem.`,
  }));

  const dynamics =
    lang === "he"
      ? `הקבוצה נשענת על ${top.name}, עם ${pctTxt(top.share)} מההודעות, ובדרך כלל השיחה נפתחת אצל ${opener.name}. השאר מגיבים, צוחקים, ונעלמים עד הפעם הבאה.\n\nזה לא שאין פה אכפתיות, יש. היא פשוט מגיעה בצורת ״חחחח״ ותמונה של אוכל.`
      : `${top.name} carries the group with ${pctTxt(top.share)} of the messages, and ${opener.name} is usually the one who starts the conversation. Everyone else reacts, laughs, and disappears until next time.\n\nIt's not that nobody cares. They do. It just arrives in the form of "hahaha" and a photo of food.`;
  const whoCares =
    lang === "he"
      ? `מי כותב ראשון? ${opener.name}. מי מעמיד פנים שלא אכפת לו? ${quiet.name}, עם ${quiet.messages} הודעות בלבד, והווי הכחול תמיד דולק. מי מחזיק את הקבוצה? ${top.name}, כי בלי ${pctTxt(top.share)} מההודעות פשוט לא היה פה כלום.`
      : `Who writes first? ${opener.name}. Who pretends not to care? ${quiet.name}, with just ${quiet.messages} messages, and still reads everything. Who holds it together? ${top.name}, because without that ${pctTxt(top.share)} there'd be nothing here.`;
  const followUps =
    lang === "he"
      ? ["מי באמת מחזיק את הקבוצה?", "מה קרה ביום הכי עמוס?", `פרופיל עומק על ${quiet.name}`, "מי הכי מתאים לארגן את המפגש הבא?"]
      : ["Who really holds this group together?", "What happened on the busiest day?", `Give me a deep dive on ${quiet.name}`, "Who should organise the next meetup?"];

  return {
    title: persona.title(facts, group).slice(0, 100),
    subtitle: persona.subtitle(fmt(facts.total, lang)),
    vibe: persona.vibe,
    verdict: `${persona.verdictOpen(facts, top, quiet)}\n\n${persona.verdictClose}`,
    dynamics,
    whoCares,
    scores,
    members,
    awards,
    turningPoint,
    insideJokes,
    advice: persona.advice,
    closingLine: persona.closing,
    followUps,
  };
}

/* ------------------------------------------------------------------ */
/* Streaming                                                           */
/* ------------------------------------------------------------------ */

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => {
    const t = setTimeout(resolve, ms);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(t);
        resolve();
      },
      { once: true },
    );
  });
}

/** Streams realistic status events over ~durationMs, then the mock report. */
export async function runMockReport(
  req: ReportRequest,
  send: (e: ReportStreamEvent) => void,
  signal: AbortSignal,
  durationMs = 5000,
): Promise<void> {
  const steps: [ReportStreamEvent & { type: "status" }, number][] = [
    [{ type: "status", phase: "reading", progress: 0.03 }, 0.0],
    [{ type: "status", phase: "reading", progress: 0.07 }, 0.1],
    [{ type: "status", phase: "thinking", progress: 0.12 }, 0.15],
    [{ type: "status", phase: "thinking", progress: 0.2 }, 0.15],
    [{ type: "status", phase: "thinking", progress: 0.29 }, 0.12],
    [{ type: "status", phase: "writing", progress: 0.38 }, 0.1],
    [{ type: "status", phase: "writing", progress: 0.52 }, 0.1],
    [{ type: "status", phase: "writing", progress: 0.67 }, 0.1],
    [{ type: "status", phase: "writing", progress: 0.81 }, 0.08],
    [{ type: "status", phase: "writing", progress: 0.92 }, 0.05],
    [{ type: "status", phase: "polishing", progress: 0.97 }, 0.05],
  ];
  const report = buildMockReport(req);
  for (const [event, share] of steps) {
    if (signal.aborted) return;
    await sleep(Math.round(durationMs * share), signal);
    if (signal.aborted) return;
    send(event);
  }
  if (signal.aborted) return;
  send({ type: "done", report, usage: { inputTokens: 0, outputTokens: 0 }, mock: true });
}

/* ------------------------------------------------------------------ */
/* Ask                                                                 */
/* ------------------------------------------------------------------ */

export function buildMockAnswer(req: AskRequest): string {
  const lang = langOf(req.language);
  const facts = readFacts(req);
  const focus = req.focusParticipantId ? facts.people.find((p) => p.id === req.focusParticipantId) : undefined;
  const profile = focus ? req.report.members.find((m) => m.id === focus.id) : undefined;
  const voice = {
    he: { max: "תשמעו,", savta: "נשמה שלי,", doc: "מבחינה קלינית," },
    en: { max: "Look,", savta: "Sweetheart,", doc: "Clinically speaking," },
  }[lang][req.personaId];

  if (focus) {
    const quote = bestQuote(focus, new Set());
    const partner = [...focus.replyPartners.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    const partnerName = facts.people.find((p) => p.id === partner)?.name;
    return lang === "he"
      ? `**${focus.name}: ${profile?.nickname ?? "תיק פתוח"}.**\n\n${voice} ${fmt(focus.messages, lang)} הודעות, ${pctTxt(focus.share)} מכל הקבוצה. זה לא מעט, וזה גם לא במקרה.\n\n- **התפקיד:** ${profile?.archetype ?? "חלק בלתי נפרד מהכאוס"}.\n- **ההרגלים:** ${focus.laughs} צחוקים, ${focus.voice} הודעות קוליות, ${focus.night} הודעות אחרי חצות.\n- **הציטוט:** "${quote}"\n${partnerName ? `- **הכי קרוב ל:** ${partnerName}. עונים אחד לשני יותר מלכל אחד אחר.\n` : ""}\n**השורה התחתונה:** ${profile?.advice ?? "תמשיכו בדיוק ככה, רק קצת פחות."}`
      : `**${focus.name}: ${profile?.nickname ?? "Open case file"}.**\n\n${voice} ${fmt(focus.messages, lang)} messages, ${pctTxt(focus.share)} of the whole group. That's a lot, and it's no accident.\n\n- **Role:** ${profile?.archetype ?? "an essential part of the chaos"}.\n- **Habits:** ${focus.laughs} laughs, ${focus.voice} voice notes, ${focus.night} messages after midnight.\n- **The quote:** "${quote}"\n${partnerName ? `- **Closest to:** ${partnerName}. They answer each other more than anyone else.\n` : ""}\n**Bottom line:** ${profile?.advice ?? "Keep doing exactly this, just a little less."}`;
  }
  const top = facts.people[0];
  const quiet = facts.people[facts.people.length - 1];
  return lang === "he"
    ? `${voice} שאלה טובה. מה שרואים בצ'אט: בראש ${top?.name ?? "מישהו"} עם ${fmt(top?.messages ?? 0, lang)} הודעות, ובתחתית ${quiet?.name ?? "מישהו"} עם ${fmt(quiet?.messages ?? 0, lang)}. התשובה מסתתרת בדיוק בפער הזה.\n\nזאת תשובה של מצב הדגמה. עם מפתח API אמיתי התשובה הייתה מגיעה עם ציטוטים ותאריכים.`
    : `${voice} good question. What I see in the chat: ${top?.name ?? "someone"} leads with ${fmt(top?.messages ?? 0, lang)} messages, and ${quiet?.name ?? "someone"} settles for ${fmt(quiet?.messages ?? 0, lang)}. Your answer hides right in that gap.\n\nThis is a demo-mode answer. With a real API key I'd get into the details, with quotes and dates.`;
}

/** Streams the mock answer word by word. */
export async function runMockAsk(req: AskRequest, send: (e: AskStreamEvent) => void, signal: AbortSignal, durationMs = 5000): Promise<void> {
  const text = buildMockAnswer(req);
  const parts = text.match(/\S+\s*/g) ?? [text];
  const per = durationMs > 0 ? Math.max(8, Math.min(40, Math.round((durationMs * 0.5) / parts.length))) : 0;
  for (const part of parts) {
    if (signal.aborted) return;
    send({ type: "delta", text: part });
    await sleep(per, signal);
  }
  if (!signal.aborted) send({ type: "done", mock: true });
}
