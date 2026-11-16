"""Survival analysis on ALL SEC XBRL filers (incl. companies that later vanished).
'Dead' = stops appearing in XBRL balance-sheet frames within 3-4 years (bankrupt, went dark,
deregistered, or acquired). No price data needed -> free of survivorship bias."""
import numpy as np, pandas as pd
from panel import load_fundamentals
from common import OUT

w = load_fundamentals()
present = w[w.Assets.notna()].groupby("cik").year.apply(set).to_dict()
rows = []
for Y in range(2011, 2022):
    d = w[(w.year == Y) & w.Assets.notna()].copy()
    d["alive"] = d.cik.map(lambda c: bool({Y + 3, Y + 4} & present.get(c, set())))
    rows.append(d)
d = pd.concat(rows)
d["micro"] = d.Assets < 50e6
d["shell"] = (d.Revenue.fillna(0) < 100e3) & (d.Assets < 1e6)
d["neg_eq"] = d.StockholdersEquity < 0
d["profitable"] = (d.NetIncomeLoss > 0) & (d.NetCashProvidedByUsedInOperatingActivities > 0)
d["diluter"] = d.shares_growth > 0.5
d["toxic"] = (d.DerivativeLiabilitiesCurrent.fillna(0) > 0) | (d.ConvertibleNotesPayableCurrent.fillna(0) > 0)
d["pos_RE"] = d.RetainedEarningsAccumulatedDeficit > 0
groups = {
    "All filers": d.index == d.index,
    "Micro (assets<$50M)": d.micro,
    "Micro & profitable (NI>0, OCF>0)": d.micro & d.profitable,
    "Micro & profitable & retained earnings>0": d.micro & d.profitable & d.pos_RE,
    "Micro & profitable & no dilution(<5%)": d.micro & d.profitable & (d.shares_growth < 0.05),
    "Micro & losing money": d.micro & (d.NetIncomeLoss < 0),
    "Negative equity": d.neg_eq,
    "Shell-like (rev<$100k, assets<$1M)": d.shell,
    "Share count +50%/yr": d.diluter,
    "Toxic converts / derivative liab.": d.toxic,
    "Shell + negative equity + dilution": d.shell & d.neg_eq & d.diluter,
}
res = pd.DataFrame({k: {"n": int(m.sum()), "dead_within_3-4y_%": round(100 * (1 - d.loc[m, "alive"].mean()), 1)}
                    for k, m in groups.items()}).T
print(res.to_string())
res.to_csv(f"{OUT}/survival.csv")
# by year for two contrasting groups
by = d.groupby("year").apply(lambda x: pd.Series({
    "all_dead%": 100 * (1 - x.alive.mean()),
    "quality_micro_dead%": 100 * (1 - x[x.micro & x.profitable & x.pos_RE].alive.mean()),
    "junk_dead%": 100 * (1 - x[x.shell | (x.neg_eq & x.diluter)].alive.mean())}), include_groups=False).round(1)
print(by.to_string())
by.to_csv(f"{OUT}/survival_by_year.csv")
