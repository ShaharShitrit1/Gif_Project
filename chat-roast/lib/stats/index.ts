/**
 * Chat statistics (engine).
 *
 *   computeStats(chat) → ChatStats   (deterministic; 100k messages well under 1.5 s in Node)
 *
 * Also exported for the UI:
 *   STAT_AWARD_META[key] → { emoji, unit, metric }  — how to read/format StatAward.value
 *   isLaughToken / scanEmojis — the same detectors the stats use (for teasers, highlighting)
 */
export { computeStats } from "./compute";
export { STAT_AWARD_META, type AwardUnit } from "./awards";
export { isLaughToken, scanEmojis, greetingOf } from "./text";
export { STOP_WORDS } from "./stopwords";
