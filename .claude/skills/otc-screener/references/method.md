# The OTC method: rules, evidence and how to read the numbers

Contents: 1. Method rules · 2. Red-Flag Score · 3. Catalysts · 4. Backtest results · 5. Event studies ·
6. What does NOT work · 7. Limitations · 8. Literature · 9. Trading with stops ("small losses, big winners")

All numbers come from the November 2026 research run (July 2012 to June 2026, 4,997 OTC company-years,
721 SEC-reporting companies). After a `pipeline.sh full` run, prefer the fresh numbers in
`otc_research/output/results.json` over the ones written here.

## 1. Method rules

| Step | Rule | Why |
|---|---|---|
| Universe | Trades OTC today; SEC filer with a 10-K/10-Q filed on time | Disclosure tier is the strongest base-rate predictor (White 2016: OTCQX non-promoted median +3%, Grey Market -45%) |
| Tradable | Avg daily $ volume >= $5k, trades on >= 50% of days, market cap >= $2M | Below this, spreads of 9-14% eat everything |
| Avoid | Red-Flag Score <= 2 | See section 2; the single biggest effect in the data |
| Quality | Net income > 0, operating cash flow > 0, equity > 0 | Median +8% vs -19% for loss makers; 7.8% halved vs 31.9% |
| Value | Rank by mean percentile of E/P and B/P; hold the 30 best | Expensive tradable OTC (top P/B quintile) median -31% |
| Exclusions | Preferred / warrant / unit symbols (5th letter P,O,N,W,U,R); GSEs in conservatorship (FNMA/FMCC, SIC 6111) | Their earnings or prices are not comparable |
| Holding | Equal weight, rebalance every July 1, keep a holding while it ranks in the top 60 | Turnover ~38%/yr; trading OTC often burns the return on spreads |

## 2. Red-Flag Score (avoid at >= 3)

Weights were fixed in advance from the literature. Measured 12-month medians (flag on vs off):

| Rule | Points | Median with | Median without | Wiped out (-80%) with / without |
|---|---|---|---|---|
| Pump signature: +100% in 20 days on > 5x normal volume, last 12m | 3 | -38% | -9% | 21% / 9% |
| Dilution: shares +50% (2) or +100% (3) in a year | 2-3 | -40% | -9% | 20% / 9% |
| Convertible notes / derivative liabilities | 3 | -33% | -5% | 18% / 8% |
| Negative equity and revenue < $1M | 2 | -25% | -6% | 15% / 8% |
| Shell: revenue < $100k and assets < $1M | 2 | -21% | -9% | 15% / 9% |
| Name change in last 2 years | 2 | -37% | -8% | 19% / 9% |
| Reverse split in last 2 years | 2 | -44% | -9% | 24% / 9% |
| Late filing (NT 10-K/Q) or Form 15 in 12m | 2 | -22% | -4% | 16% / 6% |
| Authorized shares doubled or PRE/DEF 14C | 1 | -40% | -8% | 24% / 8% |
| Resale registration (S-1 / 424B3) in 12m | 1 | -40% | -7% | 18% / 9% |

By total score: 0 -> median +7%, 8% halved · 1-2 -> +1%, 17% · 3-5 -> -15%, 27% · 6+ -> -31%, 41%.

Not computable from free data, so check manually: SEC trading suspension history, OTC Markets
"Promotion" / "Caveat Emptor" / "Shell Risk" flags, auditor changes (8-K item 4.01) or a barred
auditor (e.g. BF Borgers, barred May 2024), going-concern language.

## 3. Catalysts (among clean stocks, red <= 2)

Weaker than expected. Only capital return helped clearly:
- Dividend or buyback with a falling share count: median +8% vs -2%.
- Clean capital (dilution < 5%, no converts): +3% vs -2%.
- 13D activist, cash flow turning positive: roughly neutral.
- Revenue jump >= 50%: -11% vs +3% (often acquisitions paid for with new shares).
Insider open-market buys (Form 4 code P) are supported by the literature (Lakonishok & Lee 2001)
but were not tested here. Check them by hand on EDGAR.

## 4. Backtest results (net of costs, July 2012 to June 2026)

| Strategy | CAGR net | Max drawdown | Worst year |
|---|---|---|---|
| Method (final) | 9.2% | -24% | -13.5% |
| Russell 2000 (IWM) | 11.4% | -32% | -20% |
| S&P 500 (SPY) | 14.9% | -24% | -18% |
| All tradable OTC | -0.3% | -61% | -29% |
| Junk (losses + dilution/converts) | -3.7% | -72% | -44% |
| Red flags >= 6 | -6.4% | -73% | -50% |
| Momentum top 30 | -3.5% | -71% | -43% |
| ML ranker (walk-forward, 2016-26) | -0.7% | -70% | n/a |

Sensitivity of the method: no costs 11.6% · estimated spreads 10.4% · full round trip every year 5.6% ·
banks only 9.6% · without banks 6.8% · requiring $25k+ ADV and $10M+ cap 3.0% · 2012-19 12.1% ·
2019-26 6.3% · if 2% / 5% of holdings silently die per year: 7.0% / 3.7%.
Monthly correlation with IWM 0.32 (partly stale prices). About 54% of picks are community banks.

How to say it: the method roughly matched a small-cap index with smaller drawdowns, and did not beat a
cheap index fund after costs. The large, reliable effect is the gap between the method and junk
(about 13 points per year).

## 5. Event studies

- "Rockets" (+100% in 20 trading days on > 5x volume, 922 events): next-year median -57%, only 25%
  positive, median max drawdown -74%. Since 2021: median -65%, 19% positive. Same for <10c and $1+ stocks.
- Uplisting OTC -> exchange (197 events, first 8-A12B): year before median +34% (+21% vs IWM); year after
  median -23% (-29% vs IWM), 35% positive. Rule: sell into an uplisting, don't buy it. Hard to predict:
  only ~7% of OTC firms with price > $1 and equity > $5M uplist within a year.
- Delisting exchange -> OTC (217 events, survivors only): year before -41%; year after +6% median but
  -11% vs IWM. Survivorship makes this look better than it is (Shumway: missing delisting returns -30% to -55%).

## 6. What does NOT work (tested)

Momentum; net-nets (too few in this universe); "fallen angels"; cheap banks with strict P/B < 0.8
(too few names); revenue-inflection chasing; ML ranking (it learns to chase lottery tails);
buying stocks on high volume or after promotions.

## 7. Limitations

- Survivorship: Yahoo only has prices for tickers alive today. Of junk companies that vanished,
  43% were revoked by the SEC, 26% abandoned, 26% went dark, 3% acquired. Even for profitable
  micro-caps that vanished, only 26% were acquired.
- Universe: SEC XBRL filers with a ticker today (~720 companies). Dark / non-SEC OTC companies,
  where many professional OTC investors find their edge, are not covered.
- Only 17-39 stocks passed the filters each year: small samples, wide error bars.
- OTC closing prices are noisy; sporadic trading understates volatility and correlation.
- Current OTC Markets tier (QX/QB/ID/PK) is shown in the screen but never used in the backtest
  (today's tier is influenced by the future).
- Known data gaps: some companies tag revenue with XBRL elements the pipeline did not fetch before
  Nov 2026 (e.g. NLST), which can trigger the "negative equity and revenue < $1M" flag wrongly.
  Verify any fired flag in the actual filing.

## 8. Literature (details in otc_research/notes/)

Eraker & Ready (JFE 2015): OTC returns extremely negative and right-skewed; formerly listed beat
native OTC. Ang, Shtauber & Tetlock (RFS 2013): illiquidity premium several times larger in OTC,
mostly on the short side; momentum about 3x weaker. White (SEC DERA 2016): retail median -13.4%.
Desai & Jain (1997): reverse splits -33.9% over 3 years. Hillion & Vermaelen (2004): 85% of
death-spiral convertible issuers negative in the following year. Leuz et al. (Mgmt Sci 2025): pump
participants lose about 30% on average. Practitioners: Alluvial Fund (Dave Waters) roughly 12-16%/yr
long-run, with -9% to -15% years; Walter Schloss 15.7%/yr over 45 years.

## 9. Trading with stops: "many small losses, a few huge winners"

Tested in `src/trend.py` + `src/trend_portfolio.py` (results in `output/trend_results.json`): 108,541
simulated trades on OTC stocks 2010-2026. Entry at next day's open; stops checked against the daily
low, with gap fills at the open; half-spread + 0.5% per side, +1% on stop exits; random-entry control.

Per trade (52-week-high breakout on 3x volume, -15% stop, 25% trailing): 27% winners, avg win +44%,
avg loss -18% (17% of exits gapped through the stop), payoff 2.5, top 5% of trades = 65% of gains,
only 2% of trades doubled. Before costs +4.3% per trade, after costs -1.1% (not different from zero, p=0.51).
Beats random entries by about 5 points per trade (t=3.0, 16 of 18 years), so the signal is real but weak.

As a 20-slot portfolio: -11.8%/yr net (+6.9% with zero costs), max drawdown -89%, 64 trades/yr.
Wide stops -8.6% (+9.4% gross). No stop, 60-day exit -10.7%. Breakout + quality (red <= 2, profitable):
-1.4%/yr, drawdown -43%. Buying "rockets" (+30% day on 5x volume): -10.4% per trade, -45%/yr (ruin).
Random entries -19%/yr. IWM over the same window +10.5%/yr.

Why it fails on OTC: round-trip costs (~4-5%) versus a +4% gross edge; gaps make "small" losses
large; real big winners are rare; momentum is weak in OTC; stops get whipsawed (no-stop exits did
slightly better); trading halts and revocations are missing from the data and would make it worse
(1-2% of trades halted at -90% -> -2% to -3% per trade). The asymmetric-payoff idea needs low costs
and persistent trends (diversified futures, liquid large caps), the opposite of OTC.

The literature version also fails on OTC. Wilcox & Crittenden / Zarattini et al. (all-time-high entry,
10xATR trailing stop, ~10-month holds, liquid listed stocks): +15% per trade, ~15%/yr gross 1991-2024.
On OTC: per trade -0.3% gross, -5.6% net; portfolio -11.6%/yr (-1.8% with zero costs), drawdown -92%.
Best of 52 variants tested (all-time high + quality + wide % stops): +1.2%/yr, drawdown -47%, mean trade
not different from zero (p=0.38) — expected by chance after 52 tries. Literature notes: notes/trend_literature.md.
