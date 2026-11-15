import type { Locale, PersonaId } from "./types";

/**
 * The narrators. UI uses name/tagline/colors/avatar; lib/ai/prompts.ts owns each
 * persona's writing voice (keyed by the same id).
 */
export interface Persona {
  id: PersonaId;
  name: Record<Locale, string>;
  /** Short role line under the name. */
  role: Record<Locale, string>;
  /** One sentence describing how they read your chat. */
  tagline: Record<Locale, string>;
  emoji: string;
  /** Accent color pair used for the persona's avatar ring / chips (CSS colors). */
  color: { bg: string; fg: string };
}

export const PERSONAS: Record<PersonaId, Persona> = {
  max: {
    id: "max",
    name: { he: "מקס", en: "Max" },
    role: { he: "הרוסטר הרשמי", en: "The official roaster" },
    tagline: {
      he: "קרא יותר צ'אטים קבוצתיים ממה שבריא לבן אדם. אין לו פילטר ואין לו רחמים.",
      en: "Has read more group chats than is healthy. No filter, no mercy.",
    },
    emoji: "🔥",
    color: { bg: "#FF5A36", fg: "#FFFFFF" },
  },
  savta: {
    id: "savta",
    name: { he: "סבתא פנינה", en: "Grandma Pnina" },
    role: { he: "יודעת הכול, אומרת הכול", en: "Knows everything, says everything" },
    tagline: {
      he: "אוהבת אתכם מאוד. בדיוק בגלל זה היא תגיד לכם את האמת, עם עוגה ועם רגשות אשם.",
      en: "Loves you dearly — which is exactly why she'll tell you the truth, with cake and guilt.",
    },
    emoji: "👵",
    color: { bg: "#8B5CF6", fg: "#FFFFFF" },
  },
  doc: {
    id: "doc",
    name: { he: "ד״ר נועם", en: "Dr. Noam" },
    role: { he: "הפסיכולוג של הקבוצה", en: "The group's shrink" },
    tagline: {
      he: "קורא בין השורות: מי מחזיק את כולם, מי נעלב בשקט, ומה באמת קורה פה.",
      en: "Reads between the lines: who holds everyone together, who's quietly hurt, what's really going on.",
    },
    emoji: "🧠",
    color: { bg: "#0EA5A4", fg: "#FFFFFF" },
  },
};

export const PERSONA_IDS = Object.keys(PERSONAS) as PersonaId[];
export const DEFAULT_PERSONA: PersonaId = "max";

/** Report languages offered in the wizard. `model` is what we pass to the AI. */
export const REPORT_LANGUAGES: { code: string; model: string; label: Record<Locale, string>; native: string }[] = [
  { code: "he", model: "Hebrew", label: { he: "עברית", en: "Hebrew" }, native: "עברית" },
  { code: "en", model: "English", label: { he: "אנגלית", en: "English" }, native: "English" },
  { code: "ar", model: "Arabic", label: { he: "ערבית", en: "Arabic" }, native: "العربية" },
  { code: "ru", model: "Russian", label: { he: "רוסית", en: "Russian" }, native: "Русский" },
  { code: "fr", model: "French", label: { he: "צרפתית", en: "French" }, native: "Français" },
  { code: "es", model: "Spanish", label: { he: "ספרדית", en: "Spanish" }, native: "Español" },
  { code: "pt", model: "Brazilian Portuguese", label: { he: "פורטוגזית", en: "Portuguese" }, native: "Português" },
  { code: "de", model: "German", label: { he: "גרמנית", en: "German" }, native: "Deutsch" },
  { code: "it", model: "Italian", label: { he: "איטלקית", en: "Italian" }, native: "Italiano" },
  { code: "nl", model: "Dutch", label: { he: "הולנדית", en: "Dutch" }, native: "Nederlands" },
  { code: "tr", model: "Turkish", label: { he: "טורקית", en: "Turkish" }, native: "Türkçe" },
  { code: "pl", model: "Polish", label: { he: "פולנית", en: "Polish" }, native: "Polski" },
  { code: "uk", model: "Ukrainian", label: { he: "אוקראינית", en: "Ukrainian" }, native: "Українська" },
  { code: "hi", model: "Hindi", label: { he: "הינדי", en: "Hindi" }, native: "हिन्दी" },
  { code: "id", model: "Indonesian", label: { he: "אינדונזית", en: "Indonesian" }, native: "Bahasa Indonesia" },
  { code: "ja", model: "Japanese", label: { he: "יפנית", en: "Japanese" }, native: "日本語" },
  { code: "ko", model: "Korean", label: { he: "קוריאנית", en: "Korean" }, native: "한국어" },
  { code: "zh", model: "Traditional Chinese", label: { he: "סינית", en: "Chinese" }, native: "中文" },
  { code: "th", model: "Thai", label: { he: "תאית", en: "Thai" }, native: "ไทย" },
];

/** Languages written right-to-left (for report rendering direction). */
export const RTL_LANGUAGES = new Set(["Hebrew", "Arabic"]);
