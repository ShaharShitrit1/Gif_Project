# Research: the reference product (whatbrandonthinks.com/he), Nov 2026

Studied from the public site: the landing page, the setup flow (steps 1–3), FAQ, About,
Privacy, Ultimate, Membership, and the public i18n bundle, which lists every screen string.
Uploading stopped at step 3: the chat upload goes to a third-party storage host this environment
blocks, so I didn't upload a chat.
This is reference material only. ChatRoast's name, characters, copy, and design are original.

## Product in one line
"AI with a personality" reads an exported chat and gives a blunt verdict on every person in it.
Built for screenshots and sharing in the group.

## Flow (7 steps)
1. **Which chat?** friends group / couple (relationship, situationship, ex) / a friend / family / work / other.
2. **Which app?** WhatsApp, iMessage, Instagram, Messenger, KakaoTalk, LINE.
3. **Upload** a `.txt`/`.zip` export, plus an animated 10-step "how to export" guide (1:1 vs group, iPhone vs Android),
   a privacy sheet, and "send by email instead".
   Errors handled include: wrong extension or file kind, file too large, file not fully downloaded from cloud storage, encrypted
   WhatsApp backup, corrupt zip, zip without a transcript, empty export, too few messages, a chat with only yourself, rate limit.
4. **Tidy names** ("ChatTeaser"): N people · M messages; name the group; merge duplicate participants
   ("same person under several names/numbers"); replace nicknames/emoji with first names (tutorial "בסטי 💅 → לאה");
   "which one is you?"; a sheet with a person's message sample ("who is this?").
5. **Report language** (≈19 + "other").
6. **Email + 6-digit OTP** (report delivered by email).
7. **Pending**: "Brandon is thinking…" rotating phases, ETA, "reading N messages", then a free **preview** → paywall checkout.

## Report contents (from FAQ/About/strings)
Verdict; the real dynamic between people; "the week everything changed"; who writes first and who
pretends not to care; private language and inside jokes; "what Brandon would do in your place"; in group
reports, an opinion on **every** member (who holds the group together, who goes quiet, who runs things).
Each report ends with a follow-up question → deeper report ("depth score": building/good/strong/excellent).
Shared as a link whose WhatsApp preview carries a punchy title like
"שישה אידיוטים, ליגת פנטזי אחת ועשור של חברות" and the line "קראתי 104,000 הודעות שלכם…".

## Stats page ("המספרים")
Calendar heatmap (one square per day); who talks/opens the conversation; how you call each other;
"the day formality ended"; count of "love you"; median reply time; record day; streak; longest silence;
messages by hour (after 22:00, peak hour); instant replies (%< 1 min); good morning / good night and who says it first;
**Shabbat** (weeks with zero messages); longest message; where it started; where it ended; top words;
top emojis; catchphrases; "laugh fingerprint" (average length of a laugh, record run); stickers; voice notes.

## Business
Free preview, then pay per report; "Ultimate" report across 2–5 chats ($99.99); membership $29.99/mo
(chat with the persona on WhatsApp, 5 reports/mo). Data deleted automatically within 48 h if no report was ordered, or 7 days after the last report; not used for training.
Stack hints: Next.js (Turbopack), Supabase storage, Vercel, Stripe, Sentry.

## What ChatRoast does differently
See "What makes us better" in `../SPEC.md`. In short: parsing and stats run in the browser, the transcript is redacted before it goes to the AI, the full report is free, you pick the narrator and roast intensity,
it shows a richer stats dashboard, makes share cards for each person, and lets you ask follow-up questions.
