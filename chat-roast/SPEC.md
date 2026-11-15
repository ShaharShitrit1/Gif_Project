# ChatRoast — build spec (read fully before writing code)

ChatRoast reads a WhatsApp chat export and writes a funny, sharp, *evidence-based* roast of the
whole group plus a profile of every member, with a full "by the numbers" stats section. It is an
**original product** in the "AI reads your group chat" genre. Never copy another product's name,
mascot, copy text, or assets. Our narrator cast: **Max** (unfiltered roaster, default),
**Grandma Pnina** (loving, guilt-tripping Israeli savta), **Dr. Noam** (the group's shrink).
See `lib/personas.ts`. Research notes on the genre and what users expect: `docs/research.md`.

Hebrew is the primary UI language (RTL); English is the second UI language. Reports can be
written in ~19 languages (`REPORT_LANGUAGES`).

## What makes us better than the reference product

1. **Private by design**: the file is parsed and analysed **in the browser**. Only a compact,
   redacted transcript (phone numbers / emails / URLs / card-like numbers masked) is sent to the
   AI route, which stores nothing. Reports live only in the user's browser (IndexedDB).
2. **Free full report** (no paywall, no email/OTP step).
3. **Choose your narrator** and **roast intensity** (1 gentle · 2 classic · 3 no mercy).
4. Rich **stats dashboard** computed locally (calendar heatmap, who opens conversations, reply
   speed, laugh fingerprint "חחחח", Shabbat silence, good-morning/night, catchphrases, …) plus
   deterministic **stat awards**, next to the AI awards.
5. **Share cards**: PNG card for the group verdict and for every member, Web Share API (send to
   WhatsApp) + download + copy-text.
6. **Ask the narrator**: follow-up Q&A about the chat, incl. a "personal deep-dive" per member.
7. **Live loading screen** that shows real teasers from the stats while the AI writes.
8. Works without an API key in **mock mode** (and a bundled **demo** report at `/report/demo`).

## Stack & conventions

- Next.js **16.4** App Router, React 19, TypeScript strict, Tailwind v4 (tokens in `app/globals.css`).
  This Next version has breaking changes vs. your training data — check
  `node_modules/next/dist/docs/` when unsure (e.g. dynamic route `params` is a Promise,
  `cookies()` is async). No `src/` dir; alias `@/*` → project root.
- Font: Rubik Variable (self-hosted via `@fontsource-variable/rubik`, has Hebrew). No network fonts.
- Colors: only the token classes (`bg-paper bg-surface bg-surface-2 text-ink text-ink-2 text-ink-3
  border-line border-line-soft bg-ember text-ember-ink bg-sun bg-grape bg-sea bg-bubblegum bg-mint
  bg-sky bg-bubble-in bg-bubble-out bg-chat-bg`), `shadow-pop / shadow-pop-sm / shadow-pop-lg`,
  `.card` / `.card-flat`. Offset shadows must mirror in RTL (`rtl:shadow-[-4px_4px_0_0_var(--shadow)]`).
  Dark mode works automatically through the tokens — never hard-code light colors.
- Use logical properties for direction-sensitive spacing (`ms-*`, `me-*`, `ps-*`, `pe-*`,
  `start-*`, `end-*`, `text-start`), never `ml/mr/pl/pr/left/right` for layout.
- i18n: `lib/i18n/index.tsx` (client: `defineDict`, `useT`, `useLocale`, `useLocalized`, `intlLocale`); server components import constants/helpers from `lib/i18n/config.ts`.
  Each feature owns its dictionary file in `lib/i18n/dict/<ns>.ts`. All UI copy goes through it —
  Hebrew first, English second, same keys. Write natural, witty, native Hebrew (not translated-sounding),
  gender-inclusive plural forms ("העלו", "תבחרו") as Israeli apps do.
- Timestamps: wall-clock-as-UTC (see top of `lib/types.ts`); use `lib/time.ts`.
- Report text direction follows the **report language** (`RTL_LANGUAGES`), UI chrome follows the UI locale.
- Mobile-first: everything must look great at 390px wide (no horizontal scroll) and scale to desktop.
- Accessibility: semantic HTML, labels, focus states, `prefers-reduced-motion` respected, contrast AA.
- No new dependencies without a strong reason (already installed: `@anthropic-ai/sdk`, `jszip`, `zod`,
  `modern-screenshot`, `vitest`). Charts are hand-made SVG.

## Module APIs (the seams between agents — implement exactly these signatures)

### `lib/parser` (owner: engine agent)
```ts
parseChatText(text: string, opts?: { filename?: string }): ParsedChat          // throws ChatParseError
parseChatFile(file: Blob & { name?: string }): Promise<ParsedChat>             // .txt or .zip; throws ChatParseError
applyIdentity(original: ParsedChat, identity: Identity): ParsedChat            // pure; merges + renames + self
interface Identity { merges: Record<string, string>; names: Record<string, string>; selfId?: string | null }
//   merges: sourceId -> targetId (source's messages become target's; source disappears)
//   names:  participantId -> new displayName
```
Participant ids are `"p0"`, `"p1"`, … in order of each sender's **first message** (system lines excluded).
Must handle: iOS (`[14/11/2026, 14:06:12] Name: msg`) and Android (`14/11/2026, 14:06 - Name: msg`)
formats, `DD/MM` vs `MM/DD` vs `YYYY-MM-DD`, 2- or 4-digit years, `.`/`/`/`-` separators, 12h with
AM/PM (incl. ` ` narrow spaces, `a.m.`, Hebrew `לפנה״צ/אחה״צ`), 24h, optional seconds, RTL/LTR marks
(`‎ ‏ ‪-‮ ⁦-⁩`), BOM, CRLF, multi-line messages, media placeholders in
English and Hebrew and other common languages (`<Media omitted>`, `‏<המדיה לא נכללה>`, `image omitted`,
`תמונה הושמטה`, `audio omitted`, `sticker omitted`, `GIF omitted`, `video omitted`, `document omitted`,
`<attached: 0000-PHOTO.jpg>`), deleted messages (`This message was deleted`, `ההודעה הזו נמחקה`, `You deleted
this message`, `מחקת את ההודעה הזו`), `<This message was edited>` / `‏<ההודעה נערכה>`, polls, locations,
contact cards, view-once, missed calls, and system events (encryption notice, created group, added,
left, changed subject/icon/description, number changed) in English and Hebrew. Zip: pick `_chat.txt`
or the `.txt` inside; detect WhatsApp encrypted backups (`.crypt14` etc.) → `encrypted_backup`.
Validate: < `MIN_MESSAGES` → `too_few_messages`, one sender → `single_sender_chat`.

### `lib/stats` (owner: engine agent)
```ts
computeStats(chat: ParsedChat): ChatStats
```
All fields of `ChatStats` / `PersonStats`, deterministic, fast (100k messages < 1.5s in Node).
Laugh detection must understand Hebrew `חחח`/`חח`/`ההה`, `😂🤣`, `lol/lmao/haha/hahaha/jaja/kkkk/www`.
Word stats must drop stop-words (Hebrew + English lists), media placeholders, URLs.

### `lib/ai` (owner: ai agent)
```ts
// isomorphic (used in the browser by the wizard)
buildTranscript(chat: ParsedChat, opts?: { maxTokens?: number }): { transcript: string; meta: TranscriptMeta }
buildStatsDigest(stats: ChatStats, chat: ParsedChat): string
buildReportRequest(args: { chat: ParsedChat; stats: ChatStats; chatType: ChatType; language: string;
  personaId: PersonaId; intensity: Intensity; groupName?: string; selfId?: string | null; extraContext?: string }): ReportRequest
redact(text: string): string
// browser client for the API routes (SSE)
streamReport(req: ReportRequest, onEvent: (e: ReportStreamEvent) => void, signal?: AbortSignal): Promise<{ report: AIReport; mock: boolean }>
streamAsk(req: AskRequest, onDelta: (text: string) => void, signal?: AbortSignal): Promise<{ text: string; mock: boolean }>
// demo content
DEMO_REPORT: AIReport            // lib/ai/demo-report.ts, written for public/samples/demo-chat.txt
DEMO_SETTINGS: { chatType: ChatType; groupName: string; personaId: PersonaId; intensity: Intensity; language: string }
```
Routes: `POST /api/report` (SSE of `ReportStreamEvent`), `POST /api/ask` (SSE of `AskStreamEvent`).
Mock mode when `ANTHROPIC_API_KEY` is unset or `MOCK_AI=1`.

### `lib/storage/reports.ts` (done) — `saveReport getReport listReports deleteReport deleteAllReports newReportId`

## Routes & file ownership

| Area | Owner | Files |
|---|---|---|
| Parser, stats, their tests & fixtures | **engine** | `lib/parser/**`, `lib/stats/**`, `tests/engine/**` |
| AI layer, API routes, demo chat + demo report, prompts | **ai** | `lib/ai/**`, `app/api/**`, `public/samples/**`, `tests/ai/**` |
| Brand, landing, wizard, FAQ, privacy, header/footer | **flow** | `app/page.tsx`, `app/analyze/**`, `app/faq/**`, `app/privacy/**`, `components/landing/**`, `components/wizard/**`, `components/brand/**`, `components/ui/**` (may extend; keep existing exports' API), `lib/i18n/dict/{common,landing,wizard,faq}.ts`, `public/*.svg` |
| Report page, stats dashboard, share cards, ask panel, my-reports, demo loader | **report** | `app/report/**`, `app/reports/**`, `components/report/**`, `components/stats/**`, `components/share/**`, `lib/demo.ts`, `lib/i18n/dict/{report,stats}.ts` |
| Shared contracts | lead | `lib/types.ts`, `lib/personas.ts`, `lib/time.ts`, `lib/i18n/index.tsx`, `app/layout.tsx`, `app/globals.css`, `SPEC.md` |

Never edit files you don't own. If you need a change in a shared contract, describe it in your final
report instead (small, additive helper files inside your own area are fine).

Page map: `/` landing · `/analyze` wizard · `/report/[id]` report (id `demo` = bundled demo) ·
`/reports` my saved reports (+ delete all) · `/faq` · `/privacy`.

Wizard steps (show "step N of 5" progress, back button, can't lose state on back):
1. **Chat type** (friends group / couple / friend / family / work / other).
2. **Upload** — drag & drop or picker for `.txt`/`.zip` (or "try the demo chat"); collapsible illustrated
   export guide for iPhone and Android, 1:1 and group; privacy note sheet; friendly error per `ParseErrorCode`.
3. **Review** — "N people · M messages · date range"; group name; merge duplicates ("same person,
   two numbers"); rename nicknames/emoji names to first names (with a mini tutorial "בסטי 💅 → לאה");
   "which one is you?" (optional, can skip). Uses `applyIdentity`.
4. **Personalize** — narrator (3 persona cards), intensity (3-step control with example line), report
   language (defaults to UI locale), optional "anything the narrator should know?" (≤ 500 chars).
5. **Generating** — persona-voiced loading phases, live progress, and rotating real teasers from the
   stats ("נועה כתבה 'חחח' 312 פעמים…"); on done → `saveReport()` then `router.push('/report/' + id)`.
   On error → friendly retry screen (keep everything).

Report page section order: hero (persona, title, subtitle, vibe, meta) → verdict → scores →
members (one card each; expandable; "share card" per member) → awards (AI) + stat awards →
dynamics & who-cares → turning point → inside jokes → **The Numbers** dashboard → advice + closing
line → Ask the narrator (followUps chips + "personal deep-dive on X") → share bar (group card PNG,
copy text, Web Share) → footer actions (new report, delete this report).

## Dev server & checks (shared machine — follow exactly)

- A single dev server already runs at **http://localhost:3100** with `MOCK_AI=1` (hot reload). Do not
  start another `next dev` and never run `next build` (it would clash). Use Playwright
  (`require('playwright')`, `chromium.launch()`) against :3100 for visual checks; screenshots at
  390×844 and 1280×900, both `he` and `en` (cookie `cr_locale`), light and dark (`colorScheme`).
- Type-check: `npx tsc --noEmit -p . 2>&1 | grep -E '<your paths>'` (other agents' files may be mid-edit).
- Lint your files: `npx eslint <your paths>`. Unit tests: `npx vitest run tests/<area>`.
- Put scratch files (screenshots, scripts) in your scratchpad, not in the repo.
- Do not commit; the lead commits.
