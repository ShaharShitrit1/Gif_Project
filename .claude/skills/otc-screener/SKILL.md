---
name: otc-screener
description: Run, refresh and explain the evidence-based OTC stock method (pink sheets, OTCQX, OTCQB, penny stocks) built in this repo's otc_research/ folder — check whether a specific OTC ticker passes the method and which red flags it trips, rerun the live screen to find current candidates, refresh the data and the 14-year backtest, regenerate and republish the Hebrew report, and interpret the results honestly. Use this skill whenever the user asks about an OTC / pink-sheet / penny stock (e.g. "is SDST a buy?", "check ENBP", "תבדוק לי את המניה X", "מה עם מניית ה-OTC הזאת"), asks for rising or undervalued OTC companies, wants the OTC screen, report or backtest updated ("תריץ שוב את הסורק", "refresh the OTC screen"), or asks about red flags, pump-and-dumps, dilution, reverse splits or uplisting of small stocks — even if they don't name the skill.
---

# OTC screener

This repo holds a full research pipeline on US OTC stocks (`otc_research/`, see its README). It
answers "how do you actually make money on OTC" with data: avoid red flags, buy profitable
non-diluting reporting companies cheaply, hold patiently, and don't expect to beat an index fund.
This skill tells you how to run it and how to talk about what it finds.

## Find the project

The code lives in `otc_research/` at the root of the Gif_Project repo, on branch
`claude/quirky-lamport-ri19aa` (or wherever it has been merged). If you can't find
`otc_research/pipeline.sh`, check that branch out; without it, answer from
`references/method.md` and say the numbers come from the November 2026 run.

Raw data (`otc_research/data/`) is gitignored and large. A fresh checkout has none of it, so
`offline` mode and `check_ticker.py` need one `live` run first. Results in `output/*.json`
are committed, so the report can always be rebuilt.

## Pick the job

**1. Check specific tickers** (most common). Run from `otc_research/src`:

```bash
python3 check_ticker.py ENBP SDST            # human-readable
python3 check_ticker.py ENBP --json          # for further processing
```

It prints the market data, every red-flag rule that fired, each method filter (pass/fail), the
catalysts and the verdict, or why the ticker is not in the universe (not an SEC filer, foreign,
delinquent...). Look at the "data as of" date: if it is more than about a week old, tell the user
and offer a `live` refresh before relying on it. Then explain the verdict in plain words using the
base rates in `references/method.md`, for example "stocks with a reverse split in the last two years
had a median 12-month return of -44%". A ticker missing from the universe is not automatically bad,
but missing SEC disclosure is itself one of the strongest negative signals in the research.

**2. Refresh the screen of current candidates**: `./pipeline.sh live` from `otc_research/` (30-45 min:
SEC ticker list, financial frames, OTC filing histories, ~2,500 OTC price files). Run it in the
background and do something useful meanwhile. Without network access, use `./pipeline.sh offline`
(about 1 minute, cached data). Output: `output/screen_now.csv` and a regenerated `output/report.html`.

**3. Full rerun** (new year of data, changed rules): `./pipeline.sh full` (60-90 min). It reruns
survival analysis, event studies, the historical panel, every backtest and the ML test. After a full
run, read `output/results.json` and say what changed versus the numbers in `references/method.md`
before republishing.

**4. Explain the method or a result**: read `references/method.md` and answer from it. It has
the rules, the red-flag table with measured effects, the backtest table and the limitations.

## After a run: republish the report

The report is an Artifact built from `otc_research/output/report.html`. Republish that same file
path with the Artifact tool. If this conversation has not published it yet, pass the existing URL
so the link stays the same: https://claude.ai/artifact/VzNT1XzRn353PDZ3KAaRza. Check that the
artifact title and live date look right, and tell the user the date of the data.

## How to talk about results

The user wants to make money, and the honest answer from this research is not the exciting one.
Keep these points in front, because they are what the data actually supports:

- A screen pass is a starting point for reading filings, not a buy signal. Point to the manual
  checks in `references/method.md` section 2 (promotion flags, auditor, going concern, insider buys).
- Quote medians and "share halved", not means. OTC means are pulled up by a few 50x lottery
  tickets and by bad price ticks.
- Every absolute return is optimistic because dead companies are missing from the price data.
  Comparisons between groups hold up better than absolute levels.
- The method's ~9%/yr after costs did not beat IWM (11.4%) or SPY (14.9%) in 2012-2026. Its real
  value is avoiding the -4% to -6%/yr junk and the -57% post-"rocket" collapses.
- When a stock just "rocketed", say plainly what happened next historically (median -57% in a year).
- Uplisting is a reason to consider selling, not buying (median -23% in the year after listing).
- If the user wants to trade OTC with tight stops and "let winners run", answer from
  `references/method.md` section 9: the profile is real (27% winners, +44% vs -18%) but costs and gaps
  turn it into -12%/yr as a portfolio, and even with zero costs it didn't beat IWM.
- Reply in the user's language (the user writes Hebrew). Keep tickers and numbers left-to-right.
- This is research, not personal investment advice. Say so once, briefly. Don't lecture.

## Network and data etiquette

The pipeline needs data.sec.gov, www.sec.gov and query1.finance.yahoo.com. It is deliberately
slow: SEC at 8 requests/s or less with a generic contact User-Agent, Yahoo at about 2 requests/s with
exponential backoff on HTTP 429. If Yahoo rate-limits, wait and retry. Never rotate user agents
or raise the rate to get around a limit. Never put the user's name or email in request headers.

## Known gotchas

- 5-letter symbols ending in P/O/N/W/U/R are preferreds, warrants, units or rights and are excluded,
  since their price doesn't match the common share count.
- Fannie Mae and Freddie Mac (FNMA, FMCC) look absurdly cheap because their earnings go to the US
  Treasury. They are excluded as special situations.
- Some companies tag revenue with XBRL elements older runs didn't fetch. If a profitable-looking
  company shows "revenue < $1M", check the 10-K before trusting that flag.
- The Abdi-Ranaldo spread estimate floors at 0 for liquid stocks (shown as "<0.5%"). It is an
  estimate from daily bars, not a live quote.
- OTC Markets tier in the screen is today's tier. Never use it to explain past returns.
