# OTC Research: does a systematic OTC method make money?

Research code behind the "OTC Field Manual" report. Everything here is reproducible from free
public data: SEC EDGAR (financial statements, filing histories) and Yahoo Finance daily prices.

## Pipeline

| Step | Script | What it does |
|---|---|---|
| 1 | `src/fetch_frames.py` | SEC XBRL "frames": every filer's annual financials 2009-2025 (incl. companies that later died) |
| 2 | `src/fetch_subs.py` | EDGAR filing history for every company with a ticker today (8-A12B listings, 25-NSE delistings, 13D, NT 10-K, S-1 ...) |
| 3 | `src/fetch_prices.py data/otc_tickers.txt` | Yahoo daily OHLCV + splits for current OTC tickers (polite rate, ~2 req/s) |
| 4 | `src/extra_tickers.py` then `fetch_prices.py data/extra_tickers.txt` | Prices for companies that uplisted from OTC to an exchange + IWM/SPY benchmarks |
| 5 | `src/survival.py` | Who stops filing within 3-4 years (free of survivorship bias) |
| 6 | `src/build_universe.py` | Point-in-time panel: one row per company per July 1 (2012-2025) while it traded OTC |
| 7 | `src/run_all.py` | Factor tests, Red-Flag/Catalyst scores, strategy backtests, sensitivity, "rockets" |
| 8 | `src/events.py` | Event studies: uplisting, delisting to OTC, pump-like spikes |
| 9 | `src/ml.py` | Walk-forward gradient-boosting ranker (out-of-sample only) |
| 10 | `src/build_universe.py --live` + `src/screen_now.py` | Applies the method to today's data |

## Point-in-time rules
- A fiscal year is used at formation date F only if EDGAR shows a 10-K/10-Q for that period-end filed before F.
- Venue (OTC vs exchange) at F is reconstructed from 8-A12B (listing) and 25/25-NSE (delisting) filings.
- Market cap = reported shares x as-traded price at period end x price change to F (split-safe).
- Forward returns use Yahoo's split/dividend-adjusted closes; one-day spikes that fully reverse are treated as bad ticks.
- Transaction costs: round-trip 1% / 2% / 4% / 6% / 10% by average daily dollar volume (>$1M / >$100k / >$25k / >$10k / below).

## Known biases (read before trusting any number)
- **Survivorship:** Yahoo only has prices for tickers that still exist. Companies that died are missing, which makes
  junk look much better than it was. `survival.py` measures death rates on the full SEC population and the report
  stress-tests the method for it.
- Only SEC-reporting companies with XBRL financials are covered; "dark" non-SEC OTC companies are not.
- OTC closing prices are noisy; single-stock 12-month returns are capped at +500% in portfolio math (sensitivity shown).
