"""After filing histories are in: list tickers that are exchange-listed today but traded OTC
before (first 8-A12B after being an SEC reporter), plus benchmark ETFs, for a second price pass."""
import os, json
import pandas as pd
from common import RAW, DATA, PRICES

fil = pd.read_parquet(os.path.join(RAW, "filings.parquet"))
fil["filingDate"] = pd.to_datetime(fil.filingDate, errors="coerce")
tk = json.load(open(os.path.join(RAW, "company_tickers_exchange.json")))
prim = {}
for cik, name, t, ex in tk["data"]:
    prim.setdefault(cik, (t, ex))
per = fil[fil.form.isin(["10-K", "10-Q", "10-KSB", "10-QSB"])].groupby("cik").filingDate.min()
ev = fil[fil.form.isin(["8-A12B", "25-NSE", "25"])].sort_values("filingDate").groupby("cik").first()
out = ["IWM", "SPY"]
for cik, r in ev.iterrows():
    if r.form == "8-A12B" and r.filingDate >= pd.Timestamp("2010-01-01") and cik in per.index \
            and per[cik] <= r.filingDate - pd.Timedelta(days=180) and cik in prim and prim[cik][1] != "OTC":
        out.append(prim[cik][0])
out = [t for t in dict.fromkeys(out) if not os.path.exists(os.path.join(PRICES, f"{t}.parquet"))]
open(os.path.join(DATA, "extra_tickers.txt"), "w").write("\n".join(out))
print(len(out), out[:20])
