"""Check one or more OTC tickers against the method, rule by rule.

Usage: python check_ticker.py SDST ENBP [--json]
Needs output/live.parquet (pipeline.sh live|offline). Prints, per ticker: the market data, each
red-flag rule that fired, each method filter (pass/fail), the catalyst signals and the verdict.
If a ticker is not in the live universe it says why (not OTC, no SEC XBRL financials, no prices...).
"""
import os
import sys
import json
import pandas as pd
from common import OUT, RAW, PRICES
from run_all import red_flags, catalysts
from screen_now import derive

RULES_HE = {
    "R2_pump": "\"rocket\" in last 12m (+100%/20d on 5x volume)",
    "R3_dilution": "share count +50% (2 pts) / +100% (3 pts) in a year",
    "R4_toxic": "convertible notes / derivative liabilities",
    "R5_distress": "negative equity and revenue < $1M",
    "R6_shell": "shell: revenue < $100k and assets < $1M",
    "R7_name_change": "name change in last 2 years",
    "R8_reverse_split": "reverse split in last 2 years",
    "R9_late_filer": "late-filing notice (NT 10-K/Q) or Form 15 in last 12m",
    "R10_authorized": "authorized shares doubled or PRE/DEF 14C",
    "R12_resale_reg": "resale registration (S-1 / 424B3) in last 12m",
}


def diagnose(t):
    tk = json.load(open(os.path.join(RAW, "company_tickers_exchange.json")))
    rows = [r for r in tk["data"] if r[2] == t]
    if not rows:
        return "not in SEC's ticker list: not an SEC-registered issuer (dark / non-reporting or foreign). The method only covers SEC filers; research it manually and treat missing disclosure as a red flag."
    cik, name, _, ex = rows[0]
    if ex != "OTC":
        return f"{name} trades on {ex}, not OTC."
    if not os.path.exists(os.path.join(PRICES, f"{t}.parquet")):
        return f"{name}: no price history downloaded (Yahoo has no data or the download skipped it)."
    return (f"{name}: OTC SEC registrant, but no usable recent 10-K with XBRL financials (e.g. foreign 20-F filer, "
            f"delinquent filer, or under 1 year of trading). Delinquent filing is itself a red flag.")


def check(p, t):
    row = p[p.ticker == t]
    if row.empty:
        return {"ticker": t, "in_universe": False, "reason": diagnose(t)}
    r = row.iloc[0]
    rf = red_flags(row).iloc[0]
    cf = catalysts(row).iloc[0]
    filters = {
        "tradable: avg daily $ volume >= $5k": bool(r.dvol >= 5000),
        "tradable: trades on >= 50% of days": bool(r.zero_days < 0.5),
        "tradable: market cap >= $2M": bool(r.mcap >= 2e6),
        "red-flag score <= 2": bool(r.red <= 2),
        "net income > 0": bool(r.ni > 0),
        "operating cash flow > 0": bool(r.ocf > 0),
        "equity > 0": bool(r.equity > 0),
        "not a GSE in conservatorship": not bool(r.special),
    }
    passes = all(filters.values())
    rank = None
    if passes:
        m = p[p.tradable & (p.red <= 2) & p.quality & ~p.special].copy()
        m["comp"] = (m.ep.rank(pct=True) + m.bm.rank(pct=True)) / 2
        m = m.sort_values("comp", ascending=False).reset_index(drop=True)
        rank = int(m.index[m.ticker == t][0]) + 1
    return {
        "ticker": t, "in_universe": True, "name": r["name"], "tier": r.tier, "fiscal_year": int(r.fy),
        "price": float(r.price), "market_cap": float(r.mcap), "avg_daily_dollar_volume": float(r.dvol),
        "est_spread": None if pd.isna(r.spread_ar) else float(r.spread_ar),
        "pe": None if r.ep <= 0 else float(1 / r.ep), "pb": None if r.bm <= 0 else float(1 / r.bm),
        "shares_growth": None if pd.isna(r.shares_growth) else float(r.shares_growth),
        "red_flag_score": int(r.red),
        "red_flags_fired": {RULES_HE[k]: int(v) for k, v in rf.items() if v > 0},
        "catalysts": {k: int(v) for k, v in cf.items() if v > 0},
        "filters": filters, "passes_method": passes,
        "rank_among_passers": rank, "n_passers": int((p.tradable & (p.red <= 2) & p.quality & ~p.special).sum()),
        "is_bank": bool(r.is_bank),
    }


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    path = os.path.join(OUT, "live.parquet")
    if not os.path.exists(path):
        sys.exit("output/live.parquet missing: run `pipeline.sh offline` (cached data) or `pipeline.sh live` first.")
    p = derive(pd.read_parquet(path))
    live = json.load(open(os.path.join(OUT, "live_meta.json")))["live_date"] if os.path.exists(os.path.join(OUT, "live_meta.json")) else "?"
    res = [check(p, t.upper()) for t in args]
    if "--json" in sys.argv:
        print(json.dumps({"live_date": live, "results": res}, indent=1, default=float))
        return
    print(f"data as of {live}")
    for x in res:
        print("\n==", x["ticker"])
        if not x["in_universe"]:
            print("  NOT IN UNIVERSE:", x["reason"])
            continue
        print(f"  {x['name']} | {x['tier']} | FY{x['fiscal_year']} | price ${x['price']:.4g} | cap ${x['market_cap']/1e6:.1f}M | ADV ${x['avg_daily_dollar_volume']:,.0f}"
              + ("" if x["est_spread"] is None else (" | est. spread <0.5%" if x["est_spread"] < 0.005 else f" | est. spread {x['est_spread']*100:.1f}%")))
        print(f"  red-flag score: {x['red_flag_score']}  " + ("(avoid: >=3)" if x["red_flag_score"] >= 3 else "(clean)"))
        for k, v in x["red_flags_fired"].items():
            print(f"    +{v}  {k}")
        for k, ok in x["filters"].items():
            print(f"  [{'x' if ok else ' '}] {k}")
        if x["catalysts"]:
            print("  catalysts:", ", ".join(x["catalysts"]))
        verdict = (f"PASSES the method (rank {x['rank_among_passers']} of {x['n_passers']}; the method holds the top 30)"
                   if x["passes_method"] else "FAILS the method")
        print("  verdict:", verdict)


if __name__ == "__main__":
    main()
