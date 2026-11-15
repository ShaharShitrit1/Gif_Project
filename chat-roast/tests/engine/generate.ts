/**
 * Deterministic synthetic chat generator (seeded PRNG) — realistic enough to exercise every
 * stats path: Hebrew + English text, laughs, emojis, media, greetings, links, catchphrases,
 * mentions, night messages, long silences. All content is invented.
 */

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const NAMES = ["דנה", "יואב", "מאיה", "~ עומר", "+972 52-555-0101", "Lior B"];

const LINES = [
  "מה קורה אנשים?",
  "מי בא הערב לים?",
  "אני בדרך, עוד עשר דקות",
  "חחחחחח מת",
  "חחח לא נורמלי",
  "זה לא נורמלי אחי",
  "סבבה נדבר אחר כך",
  "יאללה ביי",
  "תביאו בירות 🍺",
  "מישהו ראה את הפרק החדש?",
  "אין מצב שזה קרה",
  "שולחת את הרשימה עכשיו",
  "lol same",
  "hahaha no way",
  "פיצה או סושי?",
  "אני מת על הקבוצה הזאת ❤️",
  "מתי נפגשים בשבוע הבא?",
  "דנה איפה את?",
  "יואב תענה כבר",
  "לגמרי מסכימה",
  "https://example.com/some/article?id=42 תקראו",
  "😂😂😂",
  "👍🏽",
  "🇮🇱🇮🇱",
  "אוקיי אני בפנים",
  "איזה כיף לכם",
];

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** iOS-format export text with `n` messages over ~`days` days. */
export function generateChat(n: number, seed = 42, days = 400): string {
  const rnd = mulberry32(seed);
  const out: string[] = [
    `[01/01/2025, 08:00:00] חבורה: ‎ההודעות והשיחות מוצפנות מקצה לקצה. אף אחד מחוץ לצ'אט הזה לא יכול לקרוא אותן.`,
  ];
  let ts = Date.UTC(2025, 0, 1, 8, 1, 0);
  const avgGap = (days * 86_400_000) / n;
  for (let i = 0; i < n; i++) {
    // Mostly short gaps, sometimes long silences.
    const r = rnd();
    ts += r < 0.02 ? avgGap * 40 * rnd() : Math.max(1000, avgGap * rnd() * 1.4);
    const d = new Date(ts);
    const head = `[${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}, ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}]`;
    const who = NAMES[Math.floor(Math.pow(rnd(), 1.6) * NAMES.length)];
    const k = rnd();
    let body: string;
    if (k < 0.05) body = "‎image omitted";
    else if (k < 0.07) body = "‎audio omitted";
    else if (k < 0.08) body = "‎sticker omitted";
    else if (k < 0.085) body = "‎This message was deleted.";
    else if (k < 0.09) body = d.getUTCHours() < 11 ? "בוקר טוב ☀️" : "לילה טוב";
    else if (k < 0.1) body = `${LINES[Math.floor(rnd() * LINES.length)]}\nועוד שורה`;
    else body = LINES[Math.floor(rnd() * LINES.length)];
    if (rnd() < 0.01) body += " ‎<This message was edited>";
    out.push(`${head} ${who}: ${body}`);
  }
  return out.join("\n");
}
