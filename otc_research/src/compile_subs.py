"""Compile cached submissions JSONs (data/subs/*.json) into parquet tables."""
import os, json, glob
import pandas as pd
from common import RAW, SUBS

comps, fil = [], []
for p in glob.glob(os.path.join(SUBS, "*.json")):
    d = json.load(open(p))
    comps.append({k: v for k, v in d.items() if k != "filings"})
    fil.extend((d["cik"], *f) for f in d["filings"])
cdf = pd.DataFrame(comps)
for c in ("tickers", "exchanges", "formerNames"):
    cdf[c] = cdf[c].apply(json.dumps)
cdf.to_parquet(os.path.join(RAW, "companies.parquet"))
fdf = pd.DataFrame(fil, columns=["cik", "form", "filingDate", "accn", "reportDate"])
fdf.to_parquet(os.path.join(RAW, "filings.parquet"))
print(len(cdf), len(fdf))
