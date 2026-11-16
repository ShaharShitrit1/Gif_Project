"""Why do companies disappear? Classify the last filings of a sample of companies that stopped
filing (from the survival analysis), separately for 'quality micro' and 'junk' groups.

acquired  : merger proxy / tender offer / going-private docs (DEFM14A, PREM14A, DEFM14C, SC TO-T, SC 14D9, SC 13E3)
bankrupt  : 8-K item 1.03 (bankruptcy or receivership)
revoked   : SEC 12(j) registration revocation (REVOKED)
went dark : Form 15 deregistration without a merger
abandoned : simply stopped filing
"""
import os
import json
import random
import numpy as np
import pandas as pd
from concurrent.futures import ThreadPoolExecutor
from common import sec_get, OUT
from panel import load_fundamentals

MERGER = {"DEFM14A", "PREM14A", "DEFM14C", "PREM14C", "SC TO-T", "SC 14D9", "SC 13E3", "SC TO-T/A", "SC 14D9/A", "SC 13E3/A"}


def classify(cik):
    r = sec_get(f"https://data.sec.gov/submissions/CIK{cik:010d}.json")
    if r is None:
        return "unknown"
    rec = r.json().get("filings", {}).get("recent", {})
    forms = rec.get("form", [])
    items = rec.get("items", [""] * len(forms))
    dates = rec.get("filingDate", [])
    if not forms:
        return "unknown"
    last = pd.Timestamp(dates[0])
    recent = [(f, it) for f, it, d in zip(forms, items, dates) if pd.Timestamp(d) >= last - pd.Timedelta(days=730)]
    fs = {f for f, _ in recent}
    if "REVOKED" in fs:
        return "revoked"
    if fs & MERGER:
        return "acquired"
    if any(f == "8-K" and "1.03" in (it or "") for f, it in recent):
        return "bankrupt"
    if fs & {"15-12G", "15-12B", "15-15D", "15F-12G"}:
        return "went dark"
    return "abandoned"


def main():
    w = load_fundamentals()
    present = w[w.Assets.notna()].groupby("cik").year.apply(set).to_dict()
    rows = []
    for Y in range(2013, 2020):
        d = w[(w.year == Y) & w.Assets.notna()].copy()
        d["alive"] = d.cik.map(lambda c: bool({Y + 3, Y + 4} & present.get(c, set())))
        rows.append(d)
    d = pd.concat(rows)
    d = d[~d.alive]
    micro = d.Assets < 50e6
    prof = (d.NetIncomeLoss > 0) & (d.NetCashProvidedByUsedInOperatingActivities > 0) & (d.RetainedEarningsAccumulatedDeficit > 0)
    shell = (d.Revenue.fillna(0) < 100e3) & (d.Assets < 1e6)
    junk = shell | ((d.StockholdersEquity < 0) & (d.shares_growth > 0.5))
    random.seed(0)
    out = {}
    for name, m in {"quality micro (profitable, RE>0)": micro & prof, "junk (shell or neg-equity diluter)": junk}.items():
        ciks = sorted(set(d.loc[m, "cik"]))
        sample = random.sample(ciks, min(250, len(ciks)))
        with ThreadPoolExecutor(6) as ex:
            res = list(ex.map(classify, sample))
        vc = pd.Series(res).value_counts(normalize=True).round(3).to_dict()
        out[name] = {"n_dead": len(ciks), "sampled": len(sample), "shares": vc}
        print(name, out[name], flush=True)
    json.dump(out, open(os.path.join(OUT, "dead_reasons.json"), "w"), indent=1)


if __name__ == "__main__":
    main()
