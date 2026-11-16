"""Apply the method to today's data (output/live.parquet from `build_universe.py --live`).

Produces output/screen_now.csv: every OTC company that passes the method's filters, ranked by
earnings yield, with its red-flag and catalyst scores. This is a research starting list,
not a buy list: each name still needs the manual checks in the report.
"""
import os
import numpy as np
import pandas as pd
from common import OUT
from run_all import red_flags, catalysts


def derive(p):
    p = p[p.mcap.notna() & (p.mcap > 0)].copy()
    p["ep"] = p.ni / p.mcap
    p["bm"] = p.equity / p.mcap
    p["ncav"] = (p.ca - p.liab) / p.mcap
    p["roa"] = p.ni / p.assets
    p["profitable"] = (p.ni > 0) & (p.ocf > 0)
    p["toxic"] = (p.deriv.fillna(0) > 0) | (p.conv.fillna(0) > 0) | (p.conv_proceeds.fillna(0) > 0)
    p["tradable"] = (p.dvol >= 5000) & (p.zero_days < 0.5) & (p.mcap >= 2e6)
    p["red"] = red_flags(p).sum(axis=1)
    p["cat"] = catalysts(p).sum(axis=1)
    p["quality"] = p.profitable & (p.equity > 0)
    p["special"] = p.sic.astype(str).eq("6111")
    p["is_bank"] = p.sic.isin(["6021", "6022", "6035", "6036"])
    return p


def main():
    p = derive(pd.read_parquet(os.path.join(OUT, "live.parquet")))
    passed = p[p.tradable & (p.red <= 2) & p.quality & ~p.special].copy()
    passed["comp"] = (passed.ep.rank(pct=True) + passed.bm.rank(pct=True)) / 2
    passed = passed.sort_values("comp", ascending=False)
    cols = ["ticker", "name", "tier", "fy", "price", "mcap", "dvol", "spread_ar", "ep", "bm", "roa", "shares_growth",
            "red", "cat", "is_bank"]
    passed[cols].to_csv(os.path.join(OUT, "screen_now.csv"), index=False)
    nets = p[p.tradable & (p.ncav >= 1.0) & (p.ni > 0) & (p.red <= 2)].sort_values("ncav", ascending=False)
    nets[["ticker", "name", "price", "mcap", "ncav", "ep", "red"]].to_csv(os.path.join(OUT, "screen_netnets.csv"), index=False)
    print("live universe", len(p), "tradable", int(p.tradable.sum()), "pass", len(passed))
    pd.set_option("display.width", 220)
    print(passed[cols].round(3).head(40).to_string())
    print(nets.head(15)[["ticker", "name", "price", "mcap", "ncav", "ep", "red"]].to_string())


if __name__ == "__main__":
    main()
